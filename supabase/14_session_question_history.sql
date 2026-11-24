-- QSPICY · Palier 2 — historique des cartes déjà jouées dans une salle.
-- Additif : ne supprime aucune réponse, salle, carte ou session en cours.
-- La reprise d'une session active continue d'utiliser rooms.interaction_ids.
-- Un nouveau lancement après la fin choisit uniquement des cartes non jouées,
-- puis renouvelle le cycle lorsque tout le pool éligible a été consommé.

alter table public.rooms
  add column if not exists played_interaction_ids text[] not null default '{}'::text[];

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
begin
  if p_level is null or p_level not between 1 and 4 then
    raise exception 'E_LEVEL: Choisis un palier valide (1 à 4).';
  end if;

  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.mode <> 'couple' then
    raise exception 'E_MODE: Ce salon n’est pas un salon Couple.';
  end if;
  if r.status <> 'waiting' then
    raise exception 'E_STATE: La partie a déjà commencé.';
  end if;
  if (select count(*) from public.players where room_id=p_room_id and status='active') <> 2 then
    raise exception 'E_STATE: Deux joueurs doivent être présents.';
  end if;

  select array_agg(c order by c) into v_categories
    from unnest(me.selected_categories) c
   where exists (
     select 1 from public.players other
      where other.room_id=p_room_id and other.status='active'
        and other.id<>me.id and c=any(other.selected_categories)
   );
  if coalesce(cardinality(v_categories),0)=0 then
    raise exception 'E_CATEGORIES: Choisissez au moins une catégorie en commun.';
  end if;

  v_adult := ('audacieux'=any(v_categories)) or p_level>=3;
  if v_adult and not (
    select count(*)=2 and bool_and(adult_consent)
      from public.players where room_id=p_room_id and status='active'
  ) then
    raise exception 'E_CONSENT: La catégorie 18+ exige l’accord explicite des deux joueurs.';
  end if;

  -- Première tentative : exclure toutes les cartes déjà jouées dans cette salle.
  select array_agg(id order by random()) into v_ids
    from (
      select id from public.catalog
       where category=any(v_categories) and level=p_level
         and not (id=any(coalesce(r.played_interaction_ids,'{}'::text[])))
       order by random()
       limit 24
    ) cards;

  -- Si le pool éligible est épuisé, on démarre un nouveau cycle.
  if coalesce(cardinality(v_ids),0)=0 then
    update public.rooms
       set played_interaction_ids = array(
         select h.card_id
           from unnest(coalesce(played_interaction_ids,'{}'::text[])) as h(card_id)
          where not exists (
            select 1 from public.catalog c
             where c.id=h.card_id and c.category=any(v_categories) and c.level=p_level
          )
       )
     where id=p_room_id;
    select array_agg(id order by random()) into v_ids
      from (
        select id from public.catalog
         where category=any(v_categories) and level=p_level
         order by random()
         limit 24
      ) cards;
  end if;

  if coalesce(cardinality(v_ids),0)=0 then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces catégories.';
  end if;

  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms
     set status='playing',
         current_index=0,
         interaction_ids=v_ids,
         played_interaction_ids=coalesce(played_interaction_ids,'{}'::text[]) || v_ids,
         adult_enabled=v_adult,
         selected_level=p_level,
         updated_at=now(),
         last_activity=now()
   where id=p_room_id;
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
begin
  if p_level is null or p_level not between 1 and 4 then
    raise exception 'E_LEVEL: Choisis un palier valide (1 à 4).';
  end if;

  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.mode <> 'duos' then
    raise exception 'E_MODE: Salon non DUOS.';
  end if;
  if r.status <> 'waiting' then
    raise exception 'E_STATE: La partie a déjà commencé.';
  end if;
  if (select count(*) from public.players where room_id=p_room_id and status='active') <> 4 then
    raise exception 'E_STATE: Les quatre joueurs doivent être présents.';
  end if;

  select array_agg(c order by c) into v_categories
    from unnest(me.selected_categories) c
   where (
     select count(*) from public.players p
      where p.room_id=p_room_id and p.status='active' and c=any(p.selected_categories)
   )=4;
  if coalesce(cardinality(v_categories),0)=0 then
    raise exception 'E_CATEGORIES: Choisissez au moins une catégorie commune aux quatre joueurs.';
  end if;

  v_adult := ('audacieux'=any(v_categories)) or p_level>=3;
  if v_adult and not (
    select count(*)=4 and bool_and(adult_consent)
      from public.players where room_id=p_room_id and status='active'
  ) then
    raise exception 'E_CONSENT: Les paliers 3–4 et la catégorie Audacieux exigent l’accord des quatre joueurs.';
  end if;

  select array_agg(id order by random()) into v_ids
    from (
      select id from public.catalog
       where category=any(v_categories) and level=p_level
         and not (id=any(coalesce(r.played_interaction_ids,'{}'::text[])))
       order by random()
       limit 24
    ) cards;

  if coalesce(cardinality(v_ids),0)=0 then
    update public.rooms
       set played_interaction_ids = array(
         select h.card_id
           from unnest(coalesce(played_interaction_ids,'{}'::text[])) as h(card_id)
          where not exists (
            select 1 from public.catalog c
             where c.id=h.card_id and c.category=any(v_categories) and c.level=p_level
          )
       )
     where id=p_room_id;
    select array_agg(id order by random()) into v_ids
      from (
        select id from public.catalog
         where category=any(v_categories) and level=p_level
         order by random()
         limit 24
      ) cards;
  end if;

  if coalesce(cardinality(v_ids),0)=0 then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces catégories communes.';
  end if;

  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms
     set status='playing',
         current_index=0,
         interaction_ids=v_ids,
         played_interaction_ids=coalesce(played_interaction_ids,'{}'::text[]) || v_ids,
         adult_enabled=v_adult,
         selected_level=p_level,
         updated_at=now(),
         last_activity=now()
   where id=p_room_id;
  return true;
end
$$;

revoke execute on function public.start_game_by_level(uuid,text,integer) from public, authenticated;
revoke execute on function public.start_duo_game_by_level(uuid,text,integer) from public, authenticated;
grant execute on function public.start_game_by_level(uuid,text,integer) to anon;
grant execute on function public.start_duo_game_by_level(uuid,text,integer) to anon;
