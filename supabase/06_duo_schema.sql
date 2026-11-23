-- QSPICY — 06 : schéma DUOS versionné
-- Reconstruit à l'identique depuis la base de production (projet xqvxorvvjmwzpcqmqnqv) le 2026-11-23.
-- Objectif : rendre le mode DUOS reproductible. Avant ce fichier, les tables duo_* et les 8 fonctions
-- DUOS n'existaient que dans la base de production, dans aucune branche du dépôt.
--
-- ORDRE D'INSTALLATION (base neuve) :
--   01_schema.sql  →  02_catalog.sql  →  03_reconnexion_securisee.sql  →  06_duo_schema.sql  →  07_security_fixes.sql
-- Les fichiers 04 et 05 sont des correctifs historiques de la base existante ; leur intention est
-- reprise ici (cross_participation à false, exécution réservée à anon) et 04 n'est plus nécessaire :
-- il réécrivait des fonctions par remplacement de texte, ce qui échoue silencieusement.
--
-- Idempotent : peut être rejoué sans erreur. Aucune donnée supprimée.

-- ===== 1. Colonnes de mode =====
alter table public.rooms add column if not exists mode text not null default 'couple';
alter table public.rooms drop constraint if exists rooms_mode_check;
alter table public.rooms add constraint rooms_mode_check check (mode in ('couple','duos'));

alter table public.players add column if not exists duo_no smallint;
alter table public.players drop constraint if exists players_duo_no_check;
alter table public.players add constraint players_duo_no_check check (duo_no is null or duo_no in (1,2));

alter table public.players drop constraint if exists players_seat_check;
alter table public.players add constraint players_seat_check check (seat between 1 and 4);

-- Un joueur DUOS n'a pas d'avatar imposé par le duo : le duo_no décide de l'espace.
create index if not exists players_room_duo_idx on public.players(room_id, duo_no);

-- ===== 2. Tables DUOS =====
create table if not exists public.duo_permissions (
  player_id uuid primary key references public.players(id) on delete cascade,
  cross_participation boolean not null default false,
  receive_media boolean not null default true,   -- corrigé à false par 07_security_fixes.sql
  share_answers boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.duo_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_player_id uuid not null references public.players(id) on delete cascade,
  space text not null check (space in ('group','duo_a','duo_b')),
  message_type text not null default 'text' check (message_type in ('text','sticker','gif')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists duo_messages_room_space_created_idx on public.duo_messages(room_id, space, created_at desc);
create index if not exists duo_messages_sender_player_id_idx on public.duo_messages(sender_player_id);

create table if not exists public.duo_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  interaction_id text not null,
  player_id uuid not null references public.players(id) on delete cascade,
  answer text not null check (char_length(answer) <= 2000),
  passed boolean not null default false,
  visibility text not null default 'private' check (visibility in ('private','duo','group')),
  created_at timestamptz not null default now(),
  unique (room_id, interaction_id, player_id)
);
create index if not exists duo_answers_room_interaction_idx on public.duo_answers(room_id, interaction_id);
create index if not exists duo_answers_player_id_idx on public.duo_answers(player_id);

-- ===== 3. Fermeture des tables =====
alter table public.duo_permissions enable row level security;
alter table public.duo_messages enable row level security;
alter table public.duo_answers enable row level security;

do $$ declare t text; begin
  foreach t in array array['duo_permissions','duo_messages','duo_answers'] loop
    execute format('drop policy if exists "deny direct" on public.%I', t);
    execute format('create policy "deny direct" on public.%I for all using (false) with check (false)', t);
  end loop; end $$;

-- ===== 4. Fonctions DUOS (identiques à la production du 2026-11-23) =====

create or replace function public.create_duo_room(p_nickname text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_room uuid; v_player uuid; v_token text;
begin
  if char_length(trim(coalesce(p_nickname,''))) not between 2 and 20 then
    raise exception 'Pseudo : 2 à 20 caractères.';
  end if;
  if p_avatar not in ('masculin','feminin') then raise exception 'Avatar invalide.'; end if;
  perform public._rate_check('create-duo:'||public._client_key(), 5, interval '1 hour');
  perform public._rate_check('create-duo:global', 100, interval '1 hour');
  perform public._purge();
  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.rooms(mode) values ('duos') returning id into v_room;
  insert into public.players(room_id,seat,duo_no,nickname,avatar,token_hash)
  values (v_room,1,1,trim(p_nickname),p_avatar,encode(digest(v_token,'sha256'),'hex'))
  returning id into v_player;
  insert into public.duo_permissions(player_id) values (v_player);
  return jsonb_build_object('room_id',v_room,'player_id',v_player,'player_token',v_token,'mode','duos');
end $$;

create or replace function public.join_duo_room(p_room_id uuid, p_nickname text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.rooms; v_token text; v_player uuid; v_seat int;
begin
  if char_length(trim(coalesce(p_nickname,''))) not between 2 and 20 then
    raise exception 'Pseudo : 2 à 20 caractères.';
  end if;
  if p_avatar not in ('masculin','feminin') then raise exception 'Avatar invalide.'; end if;
  perform public._rate_check('join-duo:'||public._client_key(), 20, interval '10 minutes');
  select * into r from public.rooms where id=p_room_id for update;
  if r.id is null or r.mode <> 'duos' then raise exception 'E_ROOM_UNKNOWN: Salon DUOS introuvable.'; end if;
  if r.last_activity < now()-interval '6 hours' then raise exception 'E_ROOM_EXPIRED: Ce salon a expiré.'; end if;
  if r.status <> 'waiting' then raise exception 'E_STATE: Ce salon a déjà commencé.'; end if;
  select s into v_seat
    from generate_series(1,4) s
   where not exists (select 1 from public.players p where p.room_id=p_room_id and p.seat=s and p.status='active')
   order by s limit 1;
  if v_seat is null then raise exception 'E_ROOM_FULL: Les quatre places sont occupées.'; end if;
  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.players(room_id,seat,duo_no,nickname,avatar,token_hash)
  values (p_room_id,v_seat,case when v_seat <= 2 then 1 else 2 end,trim(p_nickname),p_avatar,encode(digest(v_token,'sha256'),'hex'))
  returning id into v_player;
  insert into public.duo_permissions(player_id) values (v_player);
  update public.rooms set last_activity=now() where id=p_room_id;
  return jsonb_build_object('room_id',p_room_id,'player_id',v_player,'player_token',v_token,'mode','duos','seat',v_seat);
end $$;

create or replace function public.set_duo_permissions(p_room_id uuid, p_player_token text, p_cross_participation boolean, p_receive_media boolean, p_share_answers boolean)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players;
begin
  me := public._player_for(p_room_id,p_player_token);
  if (select mode from public.rooms where id=p_room_id) <> 'duos' then raise exception 'E_MODE: Salon non DUOS.'; end if;
  insert into public.duo_permissions(player_id,cross_participation,receive_media,share_answers,updated_at)
  values (me.id,coalesce(p_cross_participation,false),coalesce(p_receive_media,false),coalesce(p_share_answers,false),now())
  on conflict (player_id) do update set
    cross_participation=excluded.cross_participation,
    receive_media=excluded.receive_media,
    share_answers=excluded.share_answers,
    updated_at=now();
  return true;
end $$;

create or replace function public.send_duo_message(p_room_id uuid, p_player_token text, p_space text, p_message_type text, p_body text)
returns uuid language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; v_id uuid; v_all_cross boolean; v_all_receive boolean;
begin
  me:=public._player_for(p_room_id,p_player_token);
  if (select mode from public.rooms where id=p_room_id)<>'duos' then raise exception 'E_MODE: Salon non DUOS.'; end if;
  if p_space not in ('group','duo_a','duo_b') then raise exception 'E_SPACE: Espace invalide.'; end if;
  if p_space='duo_a' and me.duo_no<>1 then raise exception 'E_FORBIDDEN: Cet espace est réservé au duo A.'; end if;
  if p_space='duo_b' and me.duo_no<>2 then raise exception 'E_FORBIDDEN: Cet espace est réservé au duo B.'; end if;
  if p_message_type not in ('text','sticker','gif') then raise exception 'E_MESSAGE: Type invalide.'; end if;
  if char_length(trim(coalesce(p_body,''))) not between 1 and 2000 then raise exception 'Message vide ou trop long.'; end if;
  if p_space='group' then
    select count(*)=4 and bool_and(coalesce(dp.cross_participation,false))
      into v_all_cross from public.players p left join public.duo_permissions dp on dp.player_id=p.id
     where p.room_id=p_room_id and p.status='active';
    if not coalesce(v_all_cross,false) then raise exception 'E_CONSENT: Les quatre joueurs doivent autoriser l’espace commun.'; end if;
  end if;
  if p_message_type in ('sticker','gif') then
    select bool_and(coalesce(dp.receive_media,true)) into v_all_receive
      from public.players p left join public.duo_permissions dp on dp.player_id=p.id
     where p.room_id=p_room_id and p.status='active'
       and (p_space='group' or p.duo_no=me.duo_no)
       and p.id<>me.id;
    if not coalesce(v_all_receive,false) then raise exception 'E_MEDIA: Au moins un destinataire a désactivé la réception des médias.'; end if;
  end if;
  perform public._rate_check('duo-message:'||me.id::text,40,interval '1 minute');
  insert into public.duo_messages(room_id,sender_player_id,space,message_type,body)
  values(p_room_id,me.id,p_space,p_message_type,trim(p_body)) returning id into v_id;
  update public.rooms set last_activity=now() where id=p_room_id;
  return v_id;
end $$;

create or replace function public.start_duo_game(p_room_id uuid, p_player_token text)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_categories text[]; v_ids text[]; v_adult boolean;
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.mode<>'duos' then raise exception 'E_MODE: Salon non DUOS.'; end if;
  if r.status<>'waiting' then raise exception 'E_STATE: La partie a déjà commencé.'; end if;
  if (select count(*) from public.players where room_id=p_room_id and status='active')<>4 then
    raise exception 'E_STATE: Les quatre joueurs doivent être présents.';
  end if;
  select array_agg(c order by c) into v_categories
    from unnest(me.selected_categories) c
   where (select count(*) from public.players p where p.room_id=p_room_id and p.status='active' and c=any(p.selected_categories))=4;
  if coalesce(cardinality(v_categories),0)=0 then
    raise exception 'E_CATEGORIES: Choisissez au moins une catégorie commune aux quatre joueurs.';
  end if;
  v_adult := 'audacieux'=any(v_categories);
  if v_adult and not (select count(*)=4 and bool_and(adult_consent) from public.players where room_id=p_room_id and status='active') then
    raise exception 'E_CONSENT: La catégorie 18+ exige l’accord explicite des quatre joueurs.';
  end if;
  select array_agg(id) into v_ids from (
    select id from public.catalog where category=any(v_categories) order by random() limit 24
  ) s;
  if coalesce(cardinality(v_ids),0)=0 then raise exception 'Aucune interaction disponible.'; end if;
  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms set status='playing',current_index=0,interaction_ids=v_ids,
    adult_enabled=v_adult,updated_at=now(),last_activity=now() where id=p_room_id;
  return true;
end $$;

create or replace function public.submit_duo_answer(p_room_id uuid, p_player_token text, p_interaction_id text, p_answer text, p_pass boolean, p_visibility text)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_all_cross boolean;
begin
  me:=public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.mode<>'duos' or r.status<>'playing' then raise exception 'E_STATE: Partie DUOS indisponible.'; end if;
  if r.interaction_ids[r.current_index+1] is distinct from p_interaction_id then raise exception 'E_INTERACTION: Cette interaction n’est plus active.'; end if;
  if p_visibility not in ('private','duo','group') then raise exception 'E_VISIBILITY: Visibilité invalide.'; end if;
  if coalesce(p_pass,false) then
    insert into public.duo_answers(room_id,interaction_id,player_id,answer,passed,visibility)
    values (p_room_id,p_interaction_id,me.id,'',true,'private')
    on conflict (room_id,interaction_id,player_id) do nothing;
    return true;
  end if;
  if char_length(trim(coalesce(p_answer,''))) not between 1 and 2000 then raise exception 'Réponse invalide.'; end if;
  if p_visibility in ('duo','group') and not coalesce((select share_answers from public.duo_permissions where player_id=me.id),false) then
    raise exception 'E_SHARE: Active le partage de tes réponses dans tes réglages.';
  end if;
  if p_visibility='group' then
    select count(*)=4 and bool_and(coalesce(dp.cross_participation,false))
      into v_all_cross from public.players p left join public.duo_permissions dp on dp.player_id=p.id
     where p.room_id=p_room_id and p.status='active';
    if not coalesce(v_all_cross,false) then raise exception 'E_CONSENT: Les quatre joueurs doivent autoriser les interactions croisées.'; end if;
  end if;
  insert into public.duo_answers(room_id,interaction_id,player_id,answer,passed,visibility)
  values (p_room_id,p_interaction_id,me.id,trim(p_answer),false,p_visibility)
  on conflict (room_id,interaction_id,player_id) do nothing;
  update public.rooms set last_activity=now() where id=p_room_id;
  return true;
end $$;

create or replace function public.next_duo_interaction(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_int text; v_answered int; v_ack int;
begin
  me:=public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.mode<>'duos' then raise exception 'E_MODE: Salon non DUOS.'; end if;
  if r.status<>'playing' then return jsonb_build_object('advanced',false,'status',r.status); end if;
  v_int:=r.interaction_ids[r.current_index+1];
  select count(*) into v_answered from public.duo_answers a join public.players p on p.id=a.player_id
   where a.room_id=p_room_id and a.interaction_id=v_int and p.status='active';
  if v_answered<4 then return jsonb_build_object('advanced',false,'status','waiting_answers'); end if;
  update public.players set ack_index=r.current_index where id=me.id;
  select count(*) into v_ack from public.players where room_id=p_room_id and status='active' and ack_index>=r.current_index;
  if v_ack<4 then return jsonb_build_object('advanced',false,'status','waiting_players'); end if;
  perform public._advance(p_room_id);
  return jsonb_build_object('advanced',true);
end $$;

create or replace function public.get_duo_snapshot(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_players jsonb; v_messages jsonb; v_permissions jsonb;
  v_int text; v_my_answer text; v_revealed boolean; v_answers jsonb; v_all_cross boolean;
begin
  me:=public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id;
  if r.mode<>'duos' then raise exception 'E_MODE: Salon non DUOS.'; end if;
  v_int:=case when r.status in ('playing','paused') then r.interaction_ids[r.current_index+1] end;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'seat',p.seat,'duo_no',p.duo_no,'nickname',p.nickname,'avatar',p.avatar,
    'online',p.last_seen>now()-interval '30 seconds','adult_consent',p.adult_consent,
    'selected_categories',p.selected_categories,
    'cross_participation',coalesce(dp.cross_participation,false),
    'receive_media',coalesce(dp.receive_media,true)
  ) order by p.seat),'[]'::jsonb) into v_players
  from public.players p left join public.duo_permissions dp on dp.player_id=p.id
  where p.room_id=p_room_id and p.status='active';
  select count(*)=4 and bool_and(coalesce(dp.cross_participation,false))
    into v_all_cross from public.players p left join public.duo_permissions dp on dp.player_id=p.id
   where p.room_id=p_room_id and p.status='active';
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',m.id,'sender_player_id',m.sender_player_id,'space',m.space,
    'message_type',m.message_type,'body',m.body,'created_at',m.created_at
  ) order by m.created_at),'[]'::jsonb) into v_messages
  from (
    select m.* from public.duo_messages m
    where m.room_id=p_room_id
      and (
        (m.space='group' and coalesce((select cross_participation from public.duo_permissions where player_id=me.id),false) and coalesce(v_all_cross,false))
        or (me.duo_no=1 and m.space='duo_a')
        or (me.duo_no=2 and m.space='duo_b')
      )
      and (m.message_type='text' or coalesce((select receive_media from public.duo_permissions where player_id=me.id),true))
    order by m.created_at desc limit 100
  ) m;
  select jsonb_build_object(
    'cross_participation',coalesce(dp.cross_participation,false),
    'receive_media',coalesce(dp.receive_media,true),
    'share_answers',coalesce(dp.share_answers,false)
  ) into v_permissions from public.duo_permissions dp where dp.player_id=me.id;
  select answer into v_my_answer from public.duo_answers
   where room_id=p_room_id and interaction_id=v_int and player_id=me.id;
  select count(*)=4 and (select count(*)=4 from public.duo_answers where room_id=p_room_id and interaction_id=v_int)
    into v_revealed from public.players where room_id=p_room_id and status='active';
  select coalesce(jsonb_agg(jsonb_build_object(
    'player_id',a.player_id,'answer',a.answer,'passed',a.passed,'visibility',a.visibility
  ) order by p.seat),'[]'::jsonb) into v_answers
  from public.duo_answers a join public.players p on p.id=a.player_id
  where a.room_id=p_room_id and a.interaction_id=v_int
    and (a.player_id=me.id or a.passed or (a.visibility='duo' and p.duo_no=me.duo_no) or (a.visibility='group' and v_all_cross));
  return jsonb_build_object(
    'room',jsonb_build_object('id',r.id,'mode',r.mode,'status',r.status,'current_index',r.current_index,
      'total',cardinality(r.interaction_ids),'adult_enabled',r.adult_enabled),
    'players',v_players,'my_player_id',me.id,'my_seat',me.seat,'my_duo_no',me.duo_no,
    'my_consent',me.adult_consent,'my_categories',me.selected_categories,
    'interaction_id',v_int,'my_answer',v_my_answer,'revealed',coalesce(v_revealed,false),
    'answers',v_answers,'i_acked',me.ack_index>=r.current_index,
    'other_acked',(select count(*)=4 from public.players p where p.room_id=p_room_id and p.status='active' and p.ack_index>=r.current_index),
    'permissions',coalesce(v_permissions,'{}'::jsonb),'messages',v_messages
  );
end $$;

-- ===== 5. Droits =====
revoke all on public.duo_permissions, public.duo_messages, public.duo_answers from public, anon, authenticated;
revoke execute on function
  public.create_duo_room(text,text),
  public.join_duo_room(uuid,text,text),
  public.set_duo_permissions(uuid,text,boolean,boolean,boolean),
  public.send_duo_message(uuid,text,text,text,text),
  public.start_duo_game(uuid,text),
  public.submit_duo_answer(uuid,text,text,text,boolean,text),
  public.next_duo_interaction(uuid,text),
  public.get_duo_snapshot(uuid,text)
from public, anon, authenticated;

grant execute on function
  public.create_duo_room(text,text),
  public.join_duo_room(uuid,text,text),
  public.set_duo_permissions(uuid,text,boolean,boolean,boolean),
  public.send_duo_message(uuid,text,text,text,text),
  public.start_duo_game(uuid,text),
  public.submit_duo_answer(uuid,text,text,text,boolean,text),
  public.next_duo_interaction(uuid,text),
  public.get_duo_snapshot(uuid,text)
to anon;
