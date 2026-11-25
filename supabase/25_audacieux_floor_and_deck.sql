-- QSPICY — Audit correction V1
-- À appliquer après 21_explicit_content_floor.sql, 22_catalogue_maitre_v2.sql
-- et 24_qcm_options_from_server.sql.
--
-- Correctifs :
-- 1. Restaurer le plancher technique minimal 3 lorsque Audacieux est sélectionné,
--    sans perdre le plancher explicite de salle introduit par la migration 21.
-- 2. Réutiliser le sélecteur de migration 20 qui réserve jusqu'à 8 cartes Audacieux
--    dans les paquets combinés. La migration 21 avait remplacé cet appel par un
--    tirage aléatoire simple, ce qui supprimait cette garantie.
--
-- Les consentements et les fonctions de redémarrage ne sont volontairement pas
-- modifiés : restart_game conserve adult_consent et remet adult_enabled à false
-- pendant l'attente ; restart_duo_game réinitialise le consentement après le vote
-- unanime des quatre joueurs.

begin;

-- Le sélecteur peut être absent sur des bases dont les migrations historiques
-- ont été appliquées via les versions intermédiaires du tableau de bord.
-- On le restaure ici explicitement pour rendre cette correction autonome.
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
as $pick$
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
     where c.category = any(coalesce(p_categories, '{}'::text[]))
       and c.level = p_level
       and not (c.id = any(coalesce(p_excluded, '{}'::text[])))
       and not exists (select 1 from priority p where p.id = c.id)
     order by random()
     limit greatest(0, 24 - (select count(*) from priority))
  )
  select array_agg(deck.id order by random())
    from (select id from priority union all select id from rest) deck
$pick$;

do $preflight$
begin
  if to_regprocedure('public._pick_catalog_deck(text[],integer,text[])') is null then
    raise exception 'Migration 25 impossible : helper _pick_catalog_deck(text[],integer,text[]) absent. Appliquer les migrations 20 et 21 dans l''ordre.';
  end if;
end
$preflight$;

create or replace function public._effective_level(
  p_categories text[],
  p_level integer,
  p_floor integer default null
)
returns integer
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_level integer;
begin
  if p_level is null or p_level not between 1 and 4 then
    raise exception 'E_LEVEL: Choisis un palier valide (1 à 4).';
  end if;

  if p_floor is not null and p_floor not between 1 and 4 then
    raise exception 'E_LEVEL: Plancher explicite invalide.';
  end if;

  v_level := greatest(p_level, coalesce(p_floor, 1));

  if 'audacieux' = any(coalesce(p_categories, '{}'::text[])) then
    v_level := greatest(v_level, 3);
  end if;

  if not exists (
    select 1
      from public.catalog
     where category = any(coalesce(p_categories, '{}'::text[]))
       and level = v_level
  ) then
    select min(level)
      into v_level
      from public.catalog
     where category = any(coalesce(p_categories, '{}'::text[]))
       and level > v_level;
  end if;

  return v_level;
end
$$;

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

  if r.mode <> 'couple' then
    raise exception 'E_MODE: Ce salon n''est pas un salon Couple.';
  end if;
  if me.seat <> 1 then
    raise exception 'E_HOST: Seul l''hôte peut lancer et configurer la partie.';
  end if;
  if r.status <> 'waiting' then
    raise exception 'E_STATE: La partie a déjà commencé.';
  end if;
  if (select count(*) from public.players where room_id = p_room_id and status = 'active') <> 2 then
    raise exception 'E_STATE: Deux joueurs doivent être présents.';
  end if;

  select array_agg(distinct interest order by interest)
    into v_categories
    from public.players p
    cross join lateral unnest(p.selected_categories) as chosen(interest)
   where p.room_id = p_room_id and p.status = 'active';

  if coalesce(cardinality(v_categories), 0) = 0 then
    raise exception 'E_CATEGORIES: Chaque joueur doit choisir un centre d''intérêt.';
  end if;

  v_level := public._effective_level(v_categories, p_level, r.explicit_floor);
  if v_level is null then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d''intérêt.';
  end if;

  v_adult := ('audacieux' = any(v_categories)) or v_level >= 3;
  if v_adult and not (
    select count(*) = 2 and bool_and(adult_consent)
      from public.players
     where room_id = p_room_id and status = 'active'
  ) then
    raise exception 'E_CONSENT: La catégorie 18+ exige l''accord explicite des deux joueurs.';
  end if;

  v_ids := public._pick_catalog_deck(
    v_categories,
    v_level,
    coalesce(r.played_interaction_ids, '{}'::text[])
  );

  if coalesce(cardinality(v_ids), 0) = 0 then
    update public.rooms
       set played_interaction_ids = array(
         select h.card_id
           from unnest(coalesce(played_interaction_ids, '{}'::text[])) as h(card_id)
          where not exists (
            select 1
              from public.catalog c
             where c.id = h.card_id
               and c.category = any(v_categories)
               and c.level = v_level
          )
       )
     where id = p_room_id;

    v_ids := public._pick_catalog_deck(v_categories, v_level, '{}'::text[]);
  end if;

  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d''intérêt.';
  end if;

  update public.players
     set ack_index = -1
   where room_id = p_room_id;

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

  if r.mode <> 'duos' then
    raise exception 'E_MODE: Salon non DUOS.';
  end if;
  if me.seat <> 1 then
    raise exception 'E_HOST: Seul l''hôte peut lancer et configurer la partie DUOS.';
  end if;
  if r.status <> 'waiting' then
    raise exception 'E_STATE: La partie a déjà commencé.';
  end if;
  if (select count(*) from public.players where room_id = p_room_id and status = 'active') <> 4 then
    raise exception 'E_STATE: Les quatre joueurs doivent être présents.';
  end if;

  select array_agg(distinct interest order by interest)
    into v_categories
    from public.players p
    cross join lateral unnest(p.selected_categories) as chosen(interest)
   where p.room_id = p_room_id and p.status = 'active';

  if coalesce(cardinality(v_categories), 0) = 0 then
    raise exception 'E_CATEGORIES: Chaque joueur doit choisir un centre d''intérêt.';
  end if;

  v_level := public._effective_level(v_categories, p_level, r.explicit_floor);
  if v_level is null then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d''intérêt.';
  end if;

  v_adult := ('audacieux' = any(v_categories)) or v_level >= 3;
  if v_adult and not (
    select count(*) = 4 and bool_and(adult_consent)
      from public.players
     where room_id = p_room_id and status = 'active'
  ) then
    raise exception 'E_CONSENT: Les paliers 3–4 et la catégorie Audacieux exigent l''accord des quatre joueurs.';
  end if;

  v_ids := public._pick_catalog_deck(
    v_categories,
    v_level,
    coalesce(r.played_interaction_ids, '{}'::text[])
  );

  if coalesce(cardinality(v_ids), 0) = 0 then
    update public.rooms
       set played_interaction_ids = array(
         select h.card_id
           from unnest(coalesce(played_interaction_ids, '{}'::text[])) as h(card_id)
          where not exists (
            select 1
              from public.catalog c
             where c.id = h.card_id
               and c.category = any(v_categories)
               and c.level = v_level
          )
       )
     where id = p_room_id;

    v_ids := public._pick_catalog_deck(v_categories, v_level, '{}'::text[]);
  end if;

  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d''intérêt.';
  end if;

  update public.players
     set ack_index = -1
   where room_id = p_room_id;

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

-- Le helper interne n'est jamais exposé via le Data API.
revoke execute on function public._pick_catalog_deck(text[],integer,text[]) from public, anon, authenticated;

-- CREATE OR REPLACE conserve les privilèges existants des deux RPC publics.
-- Aucun GRANT/REVOKE n'est ajouté ici afin de ne pas modifier le contrat ACL.
commit;
