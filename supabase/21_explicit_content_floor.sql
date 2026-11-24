-- QSPICY · Correctif — le mode choisi détermine réellement le degré d'explicite.
-- Additif et idempotent : aucune salle, réponse ou carte existante n'est supprimée.
-- S'applique APRÈS 20_level_and_mode_integrity.sql et conserve toutes ses règles.
--
-- Défaut constaté en jouant : « le mode choisi doit réellement déterminer
-- l'intensité des questions, et cette intensité ne doit pas être ramenée vers le
-- bas par le système ». Deux causes réelles, distinctes du palier :
--
-- 1. `start_custom_game` (migration 16) écrivait `selected_level = 2` en dur,
--    quel que soit le paquet réellement lancé. Un salon Personnalisé composé de
--    cartes de palier 4 se déclarait donc « palier 2 » : le serveur croyait
--    servir du contenu doux, et `_sync_adult` ne protégeait plus la partie comme
--    il l'aurait dû (il ne termine que si `selected_level >= 3`).
--
-- 2. Rien ne garantissait, côté serveur, qu'un palier demandé ne soit pas
--    rabaissé. `_effective_level` savait relever un palier vide, mais aucune
--    règle ne fixait de plancher : une salle pouvait être relancée plus bas.
--
-- On introduit donc un axe « explicite » explicite (indépendant du simple
-- numéro de palier) et un plancher par salle, strictement non décroissant.

-- ===== 1. Axe d'explicite du catalogue =====
-- `explicit_rank` mesure le degré d'explicite d'une carte, de 1 à 4.
-- Il suit le palier, et les cartes `audacieux` sont un cran au-dessus : à
-- palier égal, une carte audacieuse est plus explicite qu'une carte de
-- profondeur. C'est ce qui permet de vérifier qu'un mode sert bien ce qu'il
-- annonce, sans confondre « palier » et « explicite ».
alter table public.catalog
  add column if not exists explicit_rank integer;

update public.catalog
   set explicit_rank = least(4, level + case when category = 'audacieux' then 1 else 0 end)
 where explicit_rank is null
    or explicit_rank <> least(4, level + case when category = 'audacieux' then 1 else 0 end);

alter table public.catalog
  alter column explicit_rank set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'catalog_explicit_rank_check'
  ) then
    alter table public.catalog
      add constraint catalog_explicit_rank_check check (explicit_rank between 1 and 4);
  end if;
end $$;

-- ===== 2. Plancher d'explicite par salle, non décroissant =====
alter table public.rooms
  add column if not exists explicit_floor integer not null default 1
  check (explicit_floor between 1 and 4);

-- Reprise des salles existantes : le plancher est au moins le palier demandé.
update public.rooms
   set explicit_floor = greatest(
         1,
         least(4, greatest(coalesce(selected_level, 1), coalesce(current_level, 1)))
       )
 where explicit_floor < greatest(
         1,
         least(4, greatest(coalesce(selected_level, 1), coalesce(current_level, 1)))
       );

-- Le plancher ne recule jamais, quel que soit le point d'entrée.
create or replace function public._sync_explicit_floor()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_prev integer;
  v_wanted integer;
begin
  v_prev := case when tg_op = 'UPDATE' then coalesce(old.explicit_floor, 1) else 1 end;

  -- Ce que la salle demande : son palier sélectionné, et le plus haut palier
  -- réellement présent dans le paquet servi (cas du Personnalisé).
  v_wanted := greatest(
    coalesce(new.selected_level, 1),
    coalesce(new.current_level, 1),
    coalesce((
      select max(c.explicit_rank)
        from public.catalog c
       where c.id = any(coalesce(new.interaction_ids, '{}'::text[]))
    ), 1)
  );

  new.explicit_floor := greatest(v_prev, least(4, v_wanted));
  return new;
end $$;

drop trigger if exists trg_rooms_explicit_floor on public.rooms;
create trigger trg_rooms_explicit_floor
  before insert or update on public.rooms
  for each row execute function public._sync_explicit_floor();

-- ===== 3. Le palier servi ne descend jamais sous le plancher =====
-- `_effective_level` garde son rôle (relever un palier vide) et gagne le
-- respect du plancher de la salle : il ne peut plus rabaisser un mode.
-- L'ancienne signature à deux arguments est supprimée : la garder créerait une
-- surcharge ambiguë, et une surcharge non révoquée resterait appelable.
drop function if exists public._effective_level(text[], integer);

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

  -- Le plancher de la salle est un minimum absolu : il ne se négocie pas.
  v_level := greatest(p_level, coalesce(p_floor, 1));

  if not exists (
    select 1 from public.catalog
     where category = any(p_categories) and level = v_level
  ) then
    select min(level) into v_level
      from public.catalog
     where category = any(p_categories) and level > v_level;
  end if;

  return v_level;
end $$;

-- ===== 4. Couple : le plancher de la salle est appliqué =====
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

  -- Le mode choisi relève le palier si nécessaire et ne descend jamais sous le
  -- plancher d'explicite déjà atteint par la salle.
  v_level := public._effective_level(v_categories, p_level, r.explicit_floor);
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

  select array_agg(id order by random()) into v_ids
    from (
      select id from public.catalog
       where category = any(v_categories) and level = v_level
         and not (id = any(coalesce(r.played_interaction_ids, '{}'::text[])))
       order by random()
       limit 24
    ) cards;

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
    select array_agg(id order by random()) into v_ids
      from (
        select id from public.catalog
         where category = any(v_categories) and level = v_level
         order by random()
         limit 24
      ) cards;
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

  v_level := public._effective_level(v_categories, p_level, r.explicit_floor);
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

  select array_agg(id order by random()) into v_ids
    from (
      select id from public.catalog
       where category = any(v_categories) and level = v_level
         and not (id = any(coalesce(r.played_interaction_ids, '{}'::text[])))
       order by random()
       limit 24
    ) cards;

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
    select array_agg(id order by random()) into v_ids
      from (
        select id from public.catalog
         where category = any(v_categories) and level = v_level
         order by random()
         limit 24
      ) cards;
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

-- ===== 6. Personnalisé : le palier déclaré est celui du paquet réel =====
-- C'était la cause n°1 : `selected_level = 2` en dur. Le salon déclare
-- maintenant le plus haut palier qu'il sert réellement, et son plancher
-- d'explicite suit. Toutes les règles de la migration 16 sont conservées.
create or replace function public.start_custom_game(
  p_room_id uuid,
  p_player_token text,
  p_interaction_ids text[]
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
  v_adult boolean;
  v_count integer;
  v_unplayed integer;
  v_deck_level integer;
begin
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id = p_room_id for update;
  if r.mode = 'duos' then raise exception 'E_MODE: Le mode Personnalisé est réservé au mode Couple.'; end if;
  if r.status <> 'waiting' then raise exception 'E_STATE: La partie a déjà commencé.'; end if;
  if me.seat <> 1 then raise exception 'E_HOST: Seul l''hôte peut lancer la partie personnalisée.'; end if;
  if (select count(*) from public.players where room_id = p_room_id and status = 'active') <> 2 then
    raise exception 'E_STATE: Deux joueurs doivent être présents.';
  end if;
  if p_interaction_ids is null or cardinality(p_interaction_ids) not between 5 and 24
     or array_position(p_interaction_ids, null) is not null
     or cardinality(array(select distinct unnest(p_interaction_ids))) <> cardinality(p_interaction_ids) then
    raise exception 'E_CUSTOM: Sélection invalide (5 à 24 cartes uniques attendues).';
  end if;

  -- Le paquet Personnalisé peut utiliser les intérêts choisis par l'un OU l'autre joueur.
  select array_agg(distinct chosen.category order by chosen.category) into v_categories
    from public.players participant
    cross join lateral unnest(participant.selected_categories) as chosen(category)
   where participant.room_id = p_room_id and participant.status = 'active';
  if coalesce(cardinality(v_categories), 0) = 0 then
    raise exception 'E_CATEGORIES: Chaque joueur doit choisir un centre d''intérêt.';
  end if;

  select count(*) into v_count
    from public.catalog c
   where c.id = any(p_interaction_ids) and c.category = any(v_categories);
  if v_count <> cardinality(p_interaction_ids) then
    raise exception 'E_CUSTOM: Une ou plusieurs cartes ne font pas partie du catalogue ou des centres d'intérêt choisis.';
  end if;

  select exists(
    select 1 from public.catalog c
     where c.id = any(p_interaction_ids) and (c.level >= 3 or c.category = 'audacieux')
  ) into v_adult;
  if v_adult and not (
    select count(*) = 2 and bool_and(adult_consent)
      from public.players where room_id = p_room_id and status = 'active'
  ) then
    raise exception 'E_CONSENT: Les deux joueurs doivent accepter le contenu 18+.';
  end if;

  select count(*) into v_unplayed
    from public.catalog c
   where c.category = any(v_categories)
     and not (c.id = any(coalesce(r.played_interaction_ids, '{}'::text[])));
  if v_unplayed >= cardinality(p_interaction_ids)
     and coalesce(r.played_interaction_ids, '{}'::text[]) && p_interaction_ids then
    raise exception 'E_CUSTOM_REPEAT: Cette sélection contient des questions déjà jouées.';
  end if;

  -- Le palier déclaré est celui du paquet réellement servi, jamais une valeur
  -- fixe : c'est ce qui garantit que le mode choisi détermine l'explicite.
  select max(c.level) into v_deck_level
    from public.catalog c
   where c.id = any(p_interaction_ids);

  update public.players set ack_index = -1 where room_id = p_room_id;
  update public.rooms
     set status = 'playing',
         current_index = 0,
         interaction_ids = p_interaction_ids,
         custom_deck = null,
         played_interaction_ids =
           case when v_unplayed < cardinality(p_interaction_ids) then
             array(
               select h.card_id
                 from unnest(coalesce(played_interaction_ids, '{}'::text[])) h(card_id)
                where not exists (
                  select 1 from public.catalog c
                   where c.id = h.card_id and c.category = any(v_categories)
                )
             ) || p_interaction_ids
           else coalesce(played_interaction_ids, '{}'::text[]) || p_interaction_ids end,
         adult_enabled = v_adult,
         selected_level = greatest(coalesce(v_deck_level, 1), coalesce(r.explicit_floor, 1)),
         updated_at = now(),
         last_activity = now()
   where id = p_room_id;
  return true;
end
$$;

-- ===== 7. Le plancher est exposé au client =====
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
    select a.answer into v_first from public.answers a join public.players p on p.id=a.player_id
     where a.room_id=p_room_id and a.interaction_id=v_int and p.seat=1 and p.status='active' and not a.passed;
  end if;
  if r.status='finished' then
    select jsonb_build_object('answered', count(*) filter (where not passed), 'passed', count(*) filter (where passed), 'total', cardinality(r.interaction_ids))
      into v_sum from public.answers where room_id=p_room_id and player_id in (select id from public.players where room_id=p_room_id and status='active');
  end if;
  return jsonb_build_object(
    'room', jsonb_build_object('id',r.id,'status',r.status,'current_index',r.current_index,'total',cardinality(r.interaction_ids),
                               'adult_enabled',r.adult_enabled,'level',r.current_level,'selected_level',r.selected_level,
                               'explicit_floor',r.explicit_floor),
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
revoke execute on function public.start_custom_game(uuid,text,text[]) from public, authenticated;
grant execute on function public.start_game_by_level(uuid,text,integer) to anon;
grant execute on function public.start_duo_game_by_level(uuid,text,integer) to anon;
grant execute on function public.start_custom_game(uuid,text,text[]) to anon;
revoke execute on function public._effective_level(text[],integer,integer) from public, anon, authenticated;
revoke execute on function public._sync_explicit_floor() from public, anon, authenticated;
