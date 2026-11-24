-- À DEUX — Schéma Supabase v2 (à exécuter AVANT 02_catalog.sql, dans SQL Editor > New query).
-- Les joueurs n'accèdent jamais aux tables : uniquement aux RPC publiques listées en bas.
-- Jetons : générés côté serveur (256 bits), seule leur empreinte SHA-256 est stockée.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Réglages (modifier ici si besoin)
-- grâce de reprise de place : 120 s · présence "connecté" : 30 s · durée de vie salle : 6 h d'inactivité

create table if not exists public.catalog (
  id text primary key, category text not null, kind text not null,
  options jsonb, level integer not null default 1 check (level between 1 and 4)
);
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting' check (status in ('waiting','playing','paused','finished')),
  current_index integer not null default 0,
  interaction_ids text[] not null default '{}',
  adult_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity timestamptz not null default now()
);
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  seat integer not null check (seat in (1,2)),
  nickname text not null check (char_length(nickname) between 2 and 20),
  avatar text not null check (avatar in ('masculin','feminin')),
  token_hash text not null,
  status text not null default 'active' check (status in ('active','left','replaced')),
  adult_consent boolean not null default false,
  ack_index integer not null default -1,
  last_seen timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  selected_categories text[] not null default array['decouverte','complicite','profondeur','seduction']::text[]
);
create unique index if not exists players_one_active_seat on public.players(room_id, seat) where status='active';
create index if not exists players_token_idx on public.players(token_hash);
create table if not exists public.answers (
  room_id uuid not null references public.rooms(id) on delete cascade,
  interaction_id text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  answer text not null check (char_length(answer) <= 2000),
  passed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (room_id, interaction_id, player_id)
);
create table if not exists public.rate_events (
  id bigserial primary key, bucket text not null, at timestamptz not null default now()
);
create index if not exists rate_events_idx on public.rate_events(bucket, at);
create index if not exists answers_player_id_idx on public.answers(player_id);

alter table public.catalog enable row level security;
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.answers enable row level security;
alter table public.rate_events enable row level security;
do $$ declare t text; begin
  foreach t in array array['catalog','rooms','players','answers','rate_events'] loop
    execute format('drop policy if exists "deny direct" on public.%I', t);
    execute format('create policy "deny direct" on public.%I for all using (false) with check (false)', t);
  end loop; end $$;

-- ===== Fonctions internes (non exposées) =====
create or replace function public._rate_check(p_bucket text, p_max int, p_window interval)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  if (select count(*) from public.rate_events where bucket=p_bucket and at > now()-p_window) >= p_max then
    raise exception 'E_RATE: Trop de tentatives. Réessaie dans quelques minutes.';
  end if;
  insert into public.rate_events(bucket) values (p_bucket);
end $$;

create or replace function public._client_key() returns text
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare h text := nullif(current_setting('request.headers', true), ''); k text;
begin
  if h is not null then k := nullif(trim(split_part(coalesce((h::json)->>'x-forwarded-for',''), ',', 1)),''); end if;
  return left(coalesce(k,'unknown'),64);
end $$;

create or replace function public._purge() returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
begin
  delete from public.rooms where id in (
    select id from public.rooms
     where last_activity < now()-interval '6 hours'
        or (created_at < now()-interval '1 hour' and not exists (select 1 from public.players p where p.room_id=rooms.id and p.status='active'))
     limit 100);
  delete from public.rate_events where at < now()-interval '1 day';
end $$;

-- Authentifie un joueur par jeton. Codes d'erreur stables : E_ROOM_UNKNOWN, E_ROOM_EXPIRED, E_SESSION, E_REPLACED, E_LEFT.
create or replace function public._player_for(p_room_id uuid, p_token text)
returns public.players language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_room public.rooms; v_p public.players;
begin
  if p_token is null or length(p_token) <> 64 then raise exception 'E_SESSION: Session invalide.'; end if;
  select * into v_room from public.rooms where id=p_room_id;
  if v_room.id is null then raise exception 'E_ROOM_UNKNOWN: Cette salle n’existe pas ou a été supprimée.'; end if;
  if v_room.last_activity < now()-interval '6 hours' then raise exception 'E_ROOM_EXPIRED: Cette salle a expiré.'; end if;
  select * into v_p from public.players where room_id=p_room_id and token_hash=encode(digest(p_token,'sha256'),'hex');
  if v_p.id is null then raise exception 'E_SESSION: Session introuvable pour cette salle.'; end if;
  if v_p.status='replaced' then raise exception 'E_REPLACED: Ta place a été reprise par une autre personne.'; end if;
  if v_p.status='left' then raise exception 'E_LEFT: Tu as quitté cette salle.'; end if;
  update public.players set last_seen=now() where id=v_p.id returning * into v_p;
  return v_p;
end $$;

create or replace function public._interaction_at(p_room public.rooms) returns text
language sql stable security definer set search_path = public, extensions, pg_temp as $$
  select p_room.interaction_ids[p_room.current_index+1] $$;

-- Passe à l'interaction suivante en sautant les interactions 18+ si le mode n'est pas actif.
create or replace function public._advance(p_room_id uuid) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.rooms; cat text;
begin
  select * into r from public.rooms where id=p_room_id;
  loop
    if r.current_index+1 >= cardinality(r.interaction_ids) then
      update public.rooms set status='finished', updated_at=now(), last_activity=now() where id=p_room_id; return;
    end if;
    r.current_index := r.current_index+1;
    select category into cat from public.catalog where id=r.interaction_ids[r.current_index+1];
    exit when cat is distinct from 'audacieux' or r.adult_enabled;
  end loop;
  update public.rooms set current_index=r.current_index, updated_at=now(), last_activity=now() where id=p_room_id;
end $$;

-- Recalcule le mode 18+ : actif seulement si les DEUX joueurs actifs ont consenti. Retrait = effet immédiat.
create or replace function public._sync_adult(p_room_id uuid) returns void
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_ok boolean; r public.rooms; cat text;
begin
  select count(*)=2 and bool_and(adult_consent) into v_ok from public.players where room_id=p_room_id and status='active';
  update public.rooms set adult_enabled=coalesce(v_ok,false), updated_at=now() where id=p_room_id returning * into r;
  if r.status in ('playing','paused') and not r.adult_enabled then
    select category into cat from public.catalog where id=r.interaction_ids[r.current_index+1];
    if cat='audacieux' then
      delete from public.answers where room_id=p_room_id and interaction_id=r.interaction_ids[r.current_index+1];
      update public.players set ack_index=-1 where room_id=p_room_id;
      perform public._advance(p_room_id);
    end if;
  end if;
end $$;

-- ===== API publique =====
create or replace function public.create_room(p_nickname text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_room uuid; v_player uuid; v_token text;
begin
  if char_length(trim(coalesce(p_nickname,''))) not between 2 and 20 then raise exception 'Pseudo : 2 à 20 caractères.'; end if;
  if p_avatar not in ('masculin','feminin') then raise exception 'Avatar invalide.'; end if;
  perform public._rate_check('create:'||public._client_key(), 8, interval '1 hour');
  perform public._rate_check('create:global', 400, interval '1 hour');
  perform public._purge();
  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.rooms default values returning id into v_room;
  insert into public.players(room_id,seat,nickname,avatar,token_hash) values (v_room,1,trim(p_nickname),p_avatar,encode(digest(v_token,'sha256'),'hex')) returning id into v_player;
  return jsonb_build_object('room_id',v_room,'player_id',v_player,'player_token',v_token);
end $$;

create or replace function public.join_room(p_room_id uuid, p_nickname text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.rooms; v_token text; v_player uuid; v_seat int;
begin
  if char_length(trim(coalesce(p_nickname,''))) not between 2 and 20 then raise exception 'Pseudo : 2 à 20 caractères.'; end if;
  if p_avatar not in ('masculin','feminin') then raise exception 'Avatar invalide.'; end if;
  perform public._rate_check('join:'||public._client_key(), 30, interval '10 minutes');
  select * into r from public.rooms where id=p_room_id for update;
  if r.id is null then raise exception 'E_ROOM_UNKNOWN: Cette salle n’existe pas ou a été supprimée.'; end if;
  if r.last_activity < now()-interval '6 hours' then raise exception 'E_ROOM_EXPIRED: Cette salle a expiré.'; end if;
  if r.status='finished' then raise exception 'E_ROOM_FINISHED: Cette partie est terminée.'; end if;
  select s into v_seat from generate_series(1,2) s
   where not exists (select 1 from public.players where room_id=p_room_id and seat=s and status='active') order by s limit 1;
  if v_seat is null then
    -- Salle pleine : plus aucune prise de contrôle automatique d'une place, même après une absence.
    -- La reconnexion passe uniquement par le jeton de session conservé par le joueur (voir _player_for).
    raise exception 'E_ROOM_FULL: Cette salle est déjà complète.';
  end if;
  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.players(room_id,seat,nickname,avatar,token_hash) values (p_room_id,v_seat,trim(p_nickname),p_avatar,encode(digest(v_token,'sha256'),'hex')) returning id into v_player;
  update public.rooms set last_activity=now() where id=p_room_id;
  perform public._sync_adult(p_room_id);
  return jsonb_build_object('room_id',p_room_id,'player_id',v_player,'player_token',v_token);
end $$;

create or replace function public.get_room_snapshot(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_int text; v_req int; v_sub int; v_rev boolean; v_kind text;
        v_players jsonb; v_answers jsonb := '[]'::jsonb; v_my text; v_other_sub boolean; v_first text; v_first_present boolean; v_other_ack boolean; v_sum jsonb := null;
begin
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id=p_room_id;
  v_int := case when r.status in ('playing','paused') then r.interaction_ids[r.current_index+1] end;
  select kind into v_kind from public.catalog where id=v_int;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'seat',seat,'nickname',nickname,'avatar',avatar,
           'online', last_seen > now()-interval '30 seconds', 'adult_consent', adult_consent,
           'selected_categories', selected_categories) order by seat),'[]'::jsonb)
    into v_players from public.players where room_id=p_room_id and status='active';
  -- joueurs "requis" = actifs et vus depuis moins de 120 s (un absent prolongé ne bloque pas l'autre)
  select count(*) into v_req from public.players where room_id=p_room_id and status='active' and last_seen > now()-interval '120 seconds';
  select count(*) into v_sub from public.answers a join public.players p on p.id=a.player_id
   where a.room_id=p_room_id and a.interaction_id=v_int and p.status='active' and p.last_seen > now()-interval '120 seconds';
  v_rev := v_int is not null and v_req > 0 and v_sub >= v_req;
  select answer into v_my from public.answers where room_id=p_room_id and interaction_id=v_int and player_id=me.id;
  select exists(select 1 from public.answers a join public.players p on p.id=a.player_id where a.room_id=p_room_id and a.interaction_id=v_int and p.status='active' and p.id<>me.id) into v_other_sub;
  select exists(select 1 from public.players where room_id=p_room_id and seat=1 and status='active' and last_seen > now()-interval '120 seconds') into v_first_present;
  select exists(select 1 from public.players where room_id=p_room_id and status='active' and id<>me.id and ack_index>=r.current_index) into v_other_ack;
  if v_rev then
    select coalesce(jsonb_agg(jsonb_build_object('player_id',a.player_id,'answer',a.answer,'passed',a.passed) order by p.seat),'[]'::jsonb)
      into v_answers from public.answers a join public.players p on p.id=a.player_id
     where a.room_id=p_room_id and a.interaction_id=v_int and p.status='active';
  elsif v_kind='cross' and me.seat=2 then
    -- question croisée : la réponse du joueur 1 est visible du joueur 2 pour qu'il puisse réagir
    select a.answer into v_first from public.answers a join public.players p on p.id=a.player_id
     where a.room_id=p_room_id and a.interaction_id=v_int and p.seat=1 and p.status='active' and not a.passed;
  end if;
  if r.status='finished' then
    select jsonb_build_object('answered', count(*) filter (where not passed), 'passed', count(*) filter (where passed), 'total', cardinality(r.interaction_ids))
      into v_sum from public.answers where room_id=p_room_id and player_id in (select id from public.players where room_id=p_room_id and status='active');
  end if;
  return jsonb_build_object(
    'room', jsonb_build_object('id',r.id,'status',r.status,'current_index',r.current_index,'total',cardinality(r.interaction_ids),'adult_enabled',r.adult_enabled),
    'players', v_players, 'my_player_id', me.id, 'my_seat', me.seat, 'my_consent', me.adult_consent,
    'my_categories', me.selected_categories,
    'other_categories', (select selected_categories from public.players where room_id=p_room_id and status='active' and id<>me.id limit 1),
    'interaction_id', v_int, 'my_answer', v_my, 'other_submitted', v_other_sub,
    'revealed', v_rev, 'answers', v_answers, 'first_answer', v_first, 'first_player_present', coalesce(v_first_present,false),
    'i_acked', me.ack_index >= r.current_index, 'other_acked', v_other_ack, 'summary', v_sum);
end $$;

create or replace function public.set_adult_consent(p_room_id uuid, p_player_token text, p_value boolean)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players;
begin
  me := public._player_for(p_room_id,p_player_token);
  perform 1 from public.rooms where id=p_room_id for update;
  update public.players set adult_consent=coalesce(p_value,false) where id=me.id;
  perform public._sync_adult(p_room_id);
  return true;
end $$;

create or replace function public.set_player_categories(p_room_id uuid, p_player_token text, p_categories text[])
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_clean text[];
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.status<>'waiting' then raise exception 'E_STATE: Les catégories ne peuvent plus être modifiées après le lancement.'; end if;
  if p_categories is null or cardinality(p_categories) not between 1 and 5 then raise exception 'Choisis au moins une catégorie.'; end if;
  if exists(select 1 from unnest(p_categories) c where c not in ('decouverte','complicite','profondeur','seduction','audacieux')) then raise exception 'Catégorie invalide.'; end if;
  select array_agg(distinct c order by c) into v_clean from unnest(p_categories) c;
  update public.players set selected_categories=v_clean where id=me.id;
  return true;
end $$;

create or replace function public.start_game(p_room_id uuid, p_player_token text, p_categories text[])
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_ids text[]; v_adult boolean; v_categories text[];
begin
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.status<>'waiting' then raise exception 'E_STATE: La partie a déjà commencé.'; end if;
  -- Relire les préférences après le verrou de salle pour éviter un choix obsolète en cas de clics simultanés.
  select * into me from public.players where id=me.id;
  if (select count(*) from public.players where room_id=p_room_id and status='active')<>2 then raise exception 'E_STATE: Deux joueurs doivent être présents.'; end if;
  select array_agg(c order by c) into v_categories
    from unnest(me.selected_categories) c
   where exists(select 1 from public.players other where other.room_id=p_room_id and other.status='active' and other.id<>me.id and c=any(other.selected_categories));
  if coalesce(cardinality(v_categories),0)=0 then raise exception 'E_CATEGORIES: Choisissez au moins une catégorie en commun.'; end if;
  v_adult := 'audacieux' = any(v_categories);
  if v_adult and not (select count(*)=2 and bool_and(adult_consent) from public.players where room_id=p_room_id and status='active') then
    raise exception 'E_CONSENT: La catégorie 18+ exige l’accord explicite des deux joueurs.';
  end if;
  select array_agg(id) into v_ids from (select id from public.catalog where category = any(v_categories) order by random() limit 24) s;
  if coalesce(cardinality(v_ids),0)=0 then raise exception 'Aucune interaction disponible.'; end if;
  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms set status='playing', current_index=0, interaction_ids=v_ids, adult_enabled=v_adult, updated_at=now(), last_activity=now() where id=p_room_id;
  return true;
end $$;

create or replace function public.submit_answer(p_room_id uuid, p_player_token text, p_answer text, p_pass boolean default false)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_int text; c public.catalog; v_first_present boolean; v_first_done boolean; v_txt text;
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.status='paused' then raise exception 'E_PAUSED: La partie est en pause.'; end if;
  if r.status<>'playing' then raise exception 'E_STATE: La partie n’est pas en cours.'; end if;
  v_int := r.interaction_ids[r.current_index+1];
  select * into c from public.catalog where id=v_int;
  if coalesce(p_pass,false) then v_txt := '';
  else
    v_txt := trim(coalesce(p_answer,''));
    if char_length(v_txt) not between 1 and 2000 then raise exception 'Réponse invalide (1 à 2000 caractères).'; end if;
    if c.kind='secret' and not (c.options ? v_txt) then raise exception 'Option invalide.'; end if;
  end if;
  if c.kind='cross' and me.seat=2 then
    select exists(select 1 from public.players where room_id=p_room_id and seat=1 and status='active' and last_seen > now()-interval '120 seconds') into v_first_present;
    select exists(select 1 from public.answers a join public.players p on p.id=a.player_id where a.room_id=p_room_id and a.interaction_id=v_int and p.seat=1 and p.status='active') into v_first_done;
    if v_first_present and not v_first_done then raise exception 'E_ORDER: Le premier joueur doit répondre d’abord.'; end if;
  end if;
  insert into public.answers(room_id,interaction_id,player_id,answer,passed) values (p_room_id,v_int,me.id,v_txt,coalesce(p_pass,false))
    on conflict (room_id,interaction_id,player_id) do nothing;  -- double clic : sans effet
  update public.rooms set last_activity=now() where id=p_room_id;
  return true;
end $$;

-- "Suivant" : chaque joueur confirme ; la salle n'avance que lorsque tous les joueurs présents ont confirmé (idempotent).
create or replace function public.next_interaction(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_int text; v_req int; v_sub int; v_ack int;
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.status<>'playing' then return jsonb_build_object('advanced',false,'status',r.status); end if;
  v_int := r.interaction_ids[r.current_index+1];
  select count(*) into v_req from public.players where room_id=p_room_id and status='active' and last_seen > now()-interval '120 seconds';
  select count(*) into v_sub from public.answers a join public.players p on p.id=a.player_id where a.room_id=p_room_id and a.interaction_id=v_int and p.status='active' and p.last_seen > now()-interval '120 seconds';
  if v_sub < v_req then return jsonb_build_object('advanced',false,'status','not_revealed'); end if;
  update public.players set ack_index=r.current_index where id=me.id;
  select count(*) into v_ack from public.players where room_id=p_room_id and status='active' and last_seen > now()-interval '120 seconds' and ack_index>=r.current_index;
  if v_ack >= v_req then perform public._advance(p_room_id); return jsonb_build_object('advanced',true); end if;
  return jsonb_build_object('advanced',false,'status','waiting_other');
end $$;

create or replace function public.set_pause(p_room_id uuid, p_player_token text, p_paused boolean)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players;
begin
  me := public._player_for(p_room_id,p_player_token);
  update public.rooms set status = case when p_paused then 'paused' else 'playing' end, updated_at=now(), last_activity=now()
   where id=p_room_id and status = case when p_paused then 'playing' else 'paused' end;
  return true;
end $$;

create or replace function public.restart_game(p_room_id uuid, p_player_token text)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players;
begin
  me := public._player_for(p_room_id,p_player_token);
  perform 1 from public.rooms where id=p_room_id and status='finished' for update;
  if not found then return false; end if;
  delete from public.answers where room_id=p_room_id;
  update public.players set ack_index=-1, adult_consent=false where room_id=p_room_id;
  update public.rooms set status='waiting', current_index=0, interaction_ids='{}', adult_enabled=false, updated_at=now(), last_activity=now() where id=p_room_id;
  return true;
end $$;

create or replace function public.leave_room(p_room_id uuid, p_player_token text)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players;
begin
  me := public._player_for(p_room_id,p_player_token);
  update public.players set status='left' where id=me.id;
  perform public._sync_adult(p_room_id);
  return true;
end $$;

-- ===== Droits : tout est fermé, puis on ouvre uniquement l'API publique =====
revoke all on all tables in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.create_room(text,text), public.join_room(uuid,text,text),
  public.get_room_snapshot(uuid,text), public.set_adult_consent(uuid,text,boolean),
  public.set_player_categories(uuid,text,text[]), public.start_game(uuid,text,text[]),
  public.submit_answer(uuid,text,text,boolean), public.next_interaction(uuid,text),
  public.set_pause(uuid,text,boolean), public.restart_game(uuid,text), public.leave_room(uuid,text) to anon;
-- Nettoyage : _purge() est appelée à chaque création de salle ; pg_cron optionnel : select cron.schedule('adeux-purge','*/30 * * * *','select public._purge()');
