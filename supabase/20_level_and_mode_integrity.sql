-- QSPICY · Correctif — intégrité des paliers et respect du mode choisi.
-- Additif et idempotent : aucune salle, réponse ou carte existante n'est supprimée.
-- Cette migration s'applique APRÈS 17_invitation_permissions.sql et conserve
-- toutes ses règles (hôte seul, union des centres d'intérêt, consentement).
--
-- Trois défauts corrigés, tous constatés en jouant :
--
-- 1. Le palier affiché régressait. L'interface lisait le palier de la CARTE
--    tirée (`interaction.level`), pas celui de la session. Dès qu'aucune carte
--    n'était active (attente, fin de partie) l'affichage retombait à 1, et en
--    mode Personnalisé — dont le paquet mélange plusieurs paliers — il sautait
--    de 3 à 2 puis à 1. On introduit `rooms.current_level`, un palier de
--    session persistant et strictement non décroissant, exposé au client.
--
-- 2. « Pas d'option disponible » en choisissant Audacieux. Les cartes
--    `audacieux` n'existent qu'aux paliers 3 et 4 (13 + 28 cartes, aucune aux
--    paliers 1–2). Un joueur qui choisissait cette catégorie avec un palier 1
--    ou 2 obtenait `E_LEVEL_EMPTY`. Le palier effectif est désormais relevé au
--    minimum nécessaire pour que le mode choisi soit réellement servi.
--
-- 3. L'intensité était rabaissée par le système. `restart_game` effaçait
--    l'accord 18+ de tous les joueurs ; `_advance` sautait alors silencieusement
--    les cartes `audacieux`, ce qui faisait dériver la partie vers du contenu
--    plus doux. L'accord est conservé d'une partie à l'autre (il reste
--    révocable à tout moment) et le palier ne peut plus reculer.

-- ===== 1. Palier de session persistant =====
alter table public.rooms
  add column if not exists current_level integer not null default 1
  check (current_level between 1 and 4);

-- Reprise des salles existantes : on part du palier réellement demandé.
update public.rooms
   set current_level = greatest(1, least(4, coalesce(selected_level, 1)))
 where current_level is null or current_level < 1;

-- ===== 2. Le palier de session ne recule jamais =====
-- Un trigger couvre tous les points d'entrée (Couple, DUOS, Personnalisé,
-- ancien start_game) sans dupliquer la logique dans chaque fonction.
create or replace function public._sync_current_level()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_max integer;
  v_card integer;
  v_prev integer;
begin
  if new.status = 'playing' then
    -- OLD n'existe pas sur INSERT : on ne le lit que sur UPDATE.
    v_prev := case when tg_op = 'UPDATE' then coalesce(old.current_level, 1) else 1 end;

    if tg_op = 'INSERT' or new.interaction_ids is distinct from old.interaction_ids then
      -- Nouvelle session : le palier est au moins celui demandé, et au moins
      -- le plus haut palier présent dans le paquet (cas du Personnalisé).
      select max(c.level) into v_max
        from public.catalog c
       where c.id = any(coalesce(new.interaction_ids, '{}'::text[]));
      new.current_level := greatest(
        coalesce(new.selected_level, 1),
        coalesce(v_max, 1),
        v_prev
      );
    elsif new.current_index is distinct from old.current_index then
      -- Progression : on ne descend jamais sous le palier déjà atteint.
      select c.level into v_card
        from public.catalog c
       where c.id = new.interaction_ids[new.current_index + 1];
      new.current_level := greatest(v_prev, coalesce(v_card, 1));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_rooms_current_level on public.rooms;
create trigger trg_rooms_current_level
  before insert or update on public.rooms
  for each row execute function public._sync_current_level();

-- ===== 3. Le palier effectif sert réellement le mode choisi =====
-- Audacieux n'existe qu'aux paliers 3–4 : si l'un des joueurs le choisit,
-- le palier demandé est relevé à 3 au minimum, même si l'autre catégorie
-- possède déjà des cartes à un palier inférieur. Pour les autres choix, on
-- conserve le premier palier supérieur disponible si nécessaire.
create or replace function public._effective_level(p_categories text[], p_level integer)
returns integer
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $qspicy$
declare
  v_level integer;
begin
  if p_level is null or p_level not between 1 and 4 then
    raise exception 'E_LEVEL: Choisis un palier valide (1 à 4).';
  end if;

  v_level := p_level;

  -- Audacieux n'existe qu'aux paliers 3 et 4. Une catégorie plus douce
  -- sélectionnée par l'autre joueur ne doit jamais masquer ce choix.
  if 'audacieux' = any(coalesce(p_categories, '{}'::text[])) then
    v_level := greatest(v_level, 3);
  end if;

  if not exists (
    select 1 from public.catalog
     where category = any(p_categories) and level = v_level
  ) then
    -- Premier palier supérieur qui contient des cartes pour ces catégories.
    select min(level) into v_level
      from public.catalog
     where category = any(p_categories) and level > v_level;
  end if;

  return v_level;
end $qspicy$;

-- Un choix Audacieux doit réellement apparaître dans le paquet combiné,
-- même si l'autre joueur a choisi une catégorie disponible à un palier plus bas.
-- On réserve jusqu'à 8 cartes Audacieux, puis on complète avec les autres cartes
-- disponibles du même palier. Si Audacieux est le seul choix, on remplit autant
-- que le catalogue le permet.
create or replace function public._pick_catalog_deck(
  p_categories text[],
  p_level integer,
  p_excluded text[]
)
returns text[]
language sql
volatile
security definer
set search_path = public, extensions, pg_temp
as $qspicy$
  with priority as (
    select c.id
      from public.catalog c
     where 'audacieux' = any(coalesce(p_categories, '{}'::text[]))
       and c.category = 'audacieux'
       and c.level = p_level
       and not (c.id = any(coalesce(p_excluded, '{}'::text[])))
     order by random()
     limit 8
  ),
  rest as (
    select c.id
      from public.catalog c
     where c.category = any(p_categories)
       and c.level = p_level
       and not (c.id = any(coalesce(p_excluded, '{}'::text[])))
       and not exists (select 1 from priority p where p.id = c.id)
     order by random()
     limit greatest(0, 24 - (select count(*) from priority))
  )
  select array_agg(deck.id order by random())
    from (select id from priority union all select id from rest) deck
$qspicy$;

-- ===== 4. Couple : palier effectif, règles de la migration 17 conservées =====
create or replace function public.start_game_by_level(
  p_room_id uuid,
  p_player_token text,
  p_level integer
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  me public.players;
  r public.rooms;
  v_ids text[];
  v_adult boolean;
  v_categories text[];
  v_level integer;
begin
  if p_level is null or p_level not between 1 and 4 then
    raise exception 'E_LEVEL: Choisis un palier valide (1 à 4).';
  end if;
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id = p_room_id for update;
  if r.mode <> 'couple' then raise exception 'E_MODE: Ce salon n''est pas un salon Couple.'; end if;
  if me.seat <> 1 then raise exception 'E_HOST: Seul l''hôte peut lancer et configurer la partie.'; end if;
  if r.status <> 'waiting' then raise exception 'E_STATE: La partie a déjà commencé.'; end if;
  if (select count(*) from public.players where room_id = p_room_id and status = 'active') <> 2 then
    raise exception 'E_STATE: Deux joueurs doivent être présents.';
  end if;

  select array_agg(distinct interest order by interest) into v_categories
    from public.players p
    cross join lateral unnest(p.selected_categories) as chosen(interest)
   where p.room_id = p_room_id and p.status = 'active';
  if coalesce(cardinality(v_categories), 0) = 0 then
    raise exception 'E_CATEGORIES: Chaque joueur doit choisir un centre d''intérêt.';
  end if;

  -- Le mode choisi relève le palier si nécessaire ; il ne le rabaisse jamais.
  v_level := public._effective_level(v_categories, p_level);
  if v_level is null then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d''intérêt.';
  end if;

  v_adult := ('audacieux' = any(v_categories)) or v_level >= 3;
  if v_adult and not (
    select count(*) = 2 and bool_and(adult_consent)
      from public.players where room_id = p_room_id and status = 'active'
  ) then
    raise exception 'E_CONSENT: La catégorie 18+ exige l''accord explicite des deux joueurs.';
  end if;

  v_ids := public._pick_catalog_deck(
    v_categories, v_level, coalesce(r.played_interaction_ids, '{}'::text[])
  );

  if coalesce(cardinality(v_ids), 0) = 0 then
    update public.rooms
       set played_interaction_ids = array(
         select h.card_id
           from unnest(coalesce(played_interaction_ids, '{}'::text[])) as h(card_id)
          where not exists (
            select 1 from public.catalog c
             where c.id = h.card_id and c.category = any(v_categories) and c.level = v_level
          )
       )
     where id = p_room_id;
    v_ids := public._pick_catalog_deck(v_categories, v_level, '{}'::text[]);
  end if;

  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d''intérêt.';
  end if;

  update public.players set ack_index = -1 where room_id = p_room_id;
  update public.rooms
     set status = 'playing',
         current_index = 0,
         interaction_ids = v_ids,
         played_interaction_ids = coalesce(played_interaction_ids, '{}'::text[]) || v_ids,
         adult_enabled = v_adult,
         selected_level = v_level,
         current_level = v_level,
         updated_at = now(),
         last_activity = now()
   where id = p_room_id;
  return true;
end
$$;

-- ===== 5. DUOS : même règle =====
create or replace function public.start_duo_game_by_level(
  p_room_id uuid,
  p_player_token text,
  p_level integer
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  me public.players;
  r public.rooms;
  v_categories text[];
  v_ids text[];
  v_adult boolean;
  v_level integer;
begin
  if p_level is null or p_level not between 1 and 4 then
    raise exception 'E_LEVEL: Choisis un palier valide (1 à 4).';
  end if;
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id = p_room_id for update;
  if r.mode <> 'duos' then raise exception 'E_MODE: Salon non DUOS.'; end if;
  if me.seat <> 1 then raise exception 'E_HOST: Seul l''hôte peut lancer et configurer la partie DUOS.'; end if;
  if r.status <> 'waiting' then raise exception 'E_STATE: La partie a déjà commencé.'; end if;
  if (select count(*) from public.players where room_id = p_room_id and status = 'active') <> 4 then
    raise exception 'E_STATE: Les quatre joueurs doivent être présents.';
  end if;

  select array_agg(distinct interest order by interest) into v_categories
    from public.players p
    cross join lateral unnest(p.selected_categories) as chosen(interest)
   where p.room_id = p_room_id and p.status = 'active';
  if coalesce(cardinality(v_categories), 0) = 0 then
    raise exception 'E_CATEGORIES: Chaque joueur doit choisir un centre d''intérêt.';
  end if;

  v_level := public._effective_level(v_categories, p_level);
  if v_level is null then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d''intérêt.';
  end if;

  v_adult := ('audacieux' = any(v_categories)) or v_level >= 3;
  if v_adult and not (
    select count(*) = 4 and bool_and(adult_consent)
      from public.players where room_id = p_room_id and status = 'active'
  ) then
    raise exception 'E_CONSENT: Les paliers 3–4 et la catégorie Audacieux exigent l''accord des quatre joueurs.';
  end if;

  v_ids := public._pick_catalog_deck(
    v_categories, v_level, coalesce(r.played_interaction_ids, '{}'::text[])
  );

  if coalesce(cardinality(v_ids), 0) = 0 then
    update public.rooms
       set played_interaction_ids = array(
         select h.card_id
           from unnest(coalesce(played_interaction_ids, '{}'::text[])) as h(card_id)
          where not exists (
            select 1 from public.catalog c
             where c.id = h.card_id and c.category = any(v_categories) and c.level = v_level
          )
       )
     where id = p_room_id;
    v_ids := public._pick_catalog_deck(v_categories, v_level, '{}'::text[]);
  end if;

  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d''intérêt.';
  end if;

  update public.players set ack_index = -1 where room_id = p_room_id;
  update public.rooms
     set status = 'playing',
         current_index = 0,
         interaction_ids = v_ids,
         played_interaction_ids = coalesce(played_interaction_ids, '{}'::text[]) || v_ids,
         adult_enabled = v_adult,
         selected_level = v_level,
         current_level = v_level,
         updated_at = now(),
         last_activity = now()
   where id = p_room_id;
  return true;
end
$$;

-- ===== 6. L'accord 18+ survit à une nouvelle partie =====
-- Il reste révocable à tout moment via set_adult_consent ; l'effacer à chaque
-- redémarrage faisait silencieusement retomber la partie en contenu plus doux.
create or replace function public.restart_game(p_room_id uuid, p_player_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare me public.players;
begin
  me := public._player_for(p_room_id, p_player_token);
  perform 1 from public.rooms where id = p_room_id and status = 'finished' for update;
  if not found then return false; end if;
  delete from public.answers where room_id = p_room_id;
  update public.players set ack_index = -1 where room_id = p_room_id;
  update public.rooms
     set status = 'waiting',
         current_index = 0,
         interaction_ids = '{}',
         adult_enabled = false,
         current_level = greatest(1, least(4, coalesce(selected_level, 1))),
         updated_at = now(),
         last_activity = now()
   where id = p_room_id;
  return true;
end $$;

-- ===== 7. Le palier de session est exposé au client =====
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
    'room', jsonb_build_object('id',r.id,'status',r.status,'current_index',r.current_index,'total',cardinality(r.interaction_ids),
                               'adult_enabled',r.adult_enabled,'level',r.current_level,'selected_level',r.selected_level),
    'players', v_players, 'my_player_id', me.id, 'my_seat', me.seat, 'my_consent', me.adult_consent,
    'my_categories', me.selected_categories,
    'other_categories', (select selected_categories from public.players where room_id=p_room_id and status='active' and id<>me.id limit 1),
    'interaction_id', v_int, 'my_answer', v_my, 'other_submitted', v_other_sub,
    'revealed', v_rev, 'answers', v_answers, 'first_answer', v_first, 'first_player_present', coalesce(v_first_present,false),
    'i_acked', me.ack_index >= r.current_index, 'other_acked', v_other_ack, 'summary', v_sum);
end $$;

-- ===== Droits : mêmes règles que le reste de l'API publique =====
revoke execute on function public.start_game_by_level(uuid,text,integer) from public, authenticated;
revoke execute on function public.start_duo_game_by_level(uuid,text,integer) from public, authenticated;
grant execute on function public.start_game_by_level(uuid,text,integer) to anon;
grant execute on function public.start_duo_game_by_level(uuid,text,integer) to anon;
revoke execute on function public._effective_level(text[],integer) from public, anon, authenticated;
revoke execute on function public._pick_catalog_deck(text[],integer,text[]) from public, anon, authenticated;
revoke execute on function public._sync_current_level() from public, anon, authenticated;
