-- QSPICY Palier 4 — rôles hôte/invité et centres d'intérêt individuels.
-- Additif : aucune salle, réponse, carte ou permission DUOS n'est supprimée.

alter table public.players
  alter column selected_categories set default array['decouverte']::text[];

-- Les salons encore en attente passent à un seul choix, en conservant le premier intérêt
-- déjà choisi. Les parties en cours ne sont jamais modifiées.
update public.players p
   set selected_categories = array[coalesce(p.selected_categories[1], 'decouverte')]
  from public.rooms r
 where r.id=p.room_id
   and r.status='waiting'
   and p.status='active'
   and cardinality(coalesce(p.selected_categories,'{}'::text[]))<>1;

create or replace function public.set_player_categories(
  p_room_id uuid,
  p_player_token text,
  p_categories text[]
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  me public.players;
  r public.rooms;
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.status<>'waiting' then
    raise exception 'E_STATE: Le centre d’intérêt ne peut plus être modifié après le lancement.';
  end if;
  if p_categories is null or cardinality(p_categories)<>1
     or p_categories[1] not in ('decouverte','complicite','profondeur','seduction','audacieux') then
    raise exception 'E_INTEREST: Choisis un seul centre d’intérêt.';
  end if;
  update public.players
     set selected_categories=array[p_categories[1]]
   where id=me.id and room_id=p_room_id and status='active';
  update public.rooms set last_activity=now() where id=p_room_id;
  return true;
end
$$;

-- Couple : le niveau et le lancement sont pilotés par l'hôte (siège 1).
-- Les intérêts sont individuels ; le catalogue utilise leur union, pas leur intersection.
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
  if r.mode<>'couple' then raise exception 'E_MODE: Ce salon n’est pas un salon Couple.'; end if;
  if me.seat<>1 then raise exception 'E_HOST: Seul l’hôte peut lancer et configurer la partie.'; end if;
  if r.status<>'waiting' then raise exception 'E_STATE: La partie a déjà commencé.'; end if;
  if (select count(*) from public.players where room_id=p_room_id and status='active')<>2 then
    raise exception 'E_STATE: Deux joueurs doivent être présents.';
  end if;

  select array_agg(distinct interest order by interest) into v_categories
    from public.players p
    cross join lateral unnest(p.selected_categories) as chosen(interest)
   where p.room_id=p_room_id and p.status='active';
  if coalesce(cardinality(v_categories),0)=0 then
    raise exception 'E_CATEGORIES: Chaque joueur doit choisir un centre d’intérêt.';
  end if;

  v_adult := ('audacieux'=any(v_categories)) or p_level>=3;
  if v_adult and not (
    select count(*)=2 and bool_and(adult_consent)
      from public.players where room_id=p_room_id and status='active'
  ) then
    raise exception 'E_CONSENT: La catégorie 18+ exige l’accord explicite des deux joueurs.';
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
       set played_interaction_ids=array(
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
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d’intérêt.';
  end if;

  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms
     set status='playing', current_index=0, interaction_ids=v_ids,
         played_interaction_ids=coalesce(played_interaction_ids,'{}'::text[]) || v_ids,
         adult_enabled=v_adult, selected_level=p_level,
         updated_at=now(), last_activity=now()
   where id=p_room_id;
  return true;
end
$$;

-- DUOS : l'hôte est le siège 1 ; chaque participant apporte un intérêt au pool commun.
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
  if r.mode<>'duos' then raise exception 'E_MODE: Salon non DUOS.'; end if;
  if me.seat<>1 then raise exception 'E_HOST: Seul l’hôte peut lancer et configurer la partie DUOS.'; end if;
  if r.status<>'waiting' then raise exception 'E_STATE: La partie a déjà commencé.'; end if;
  if (select count(*) from public.players where room_id=p_room_id and status='active')<>4 then
    raise exception 'E_STATE: Les quatre joueurs doivent être présents.';
  end if;

  select array_agg(distinct interest order by interest) into v_categories
    from public.players p
    cross join lateral unnest(p.selected_categories) as chosen(interest)
   where p.room_id=p_room_id and p.status='active';
  if coalesce(cardinality(v_categories),0)=0 then
    raise exception 'E_CATEGORIES: Chaque joueur doit choisir un centre d’intérêt.';
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
       set played_interaction_ids=array(
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
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces centres d’intérêt.';
  end if;

  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms
     set status='playing', current_index=0, interaction_ids=v_ids,
         played_interaction_ids=coalesce(played_interaction_ids,'{}'::text[]) || v_ids,
         adult_enabled=v_adult, selected_level=p_level,
         updated_at=now(), last_activity=now()
   where id=p_room_id;
  return true;
end
$$;

-- Personnalisé : le choix de cartes de l'hôte peut provenir des intérêts de l'un ou l'autre joueur.
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
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.mode='duos' then raise exception 'E_MODE: Le mode Personnalisé est réservé au mode Couple.'; end if;
  if r.status<>'waiting' then raise exception 'E_STATE: La partie a déjà commencé.'; end if;
  if me.seat<>1 then raise exception 'E_HOST: Seul l’hôte peut lancer la partie personnalisée.'; end if;
  if (select count(*) from public.players where room_id=p_room_id and status='active')<>2 then
    raise exception 'E_STATE: Deux joueurs doivent être présents.';
  end if;
  if p_interaction_ids is null or cardinality(p_interaction_ids) not between 5 and 24
     or array_position(p_interaction_ids,null) is not null
     or cardinality(array(select distinct unnest(p_interaction_ids)))<>cardinality(p_interaction_ids) then
    raise exception 'E_CUSTOM: Sélection invalide (5 à 24 cartes uniques attendues).';
  end if;

  select array_agg(distinct interest order by interest) into v_categories
    from public.players p
    cross join lateral unnest(p.selected_categories) as chosen(interest)
   where p.room_id=p_room_id and p.status='active';
  if coalesce(cardinality(v_categories),0)=0 then
    raise exception 'E_CATEGORIES: Chaque joueur doit choisir un centre d’intérêt.';
  end if;

  select count(*) into v_count
    from public.catalog c
   where c.id=any(p_interaction_ids) and c.category=any(v_categories);
  if v_count<>cardinality(p_interaction_ids) then
    raise exception 'E_CUSTOM: Une ou plusieurs cartes ne font pas partie des centres d’intérêt choisis.';
  end if;

  select exists(
    select 1 from public.catalog c
     where c.id=any(p_interaction_ids) and (c.level>=3 or c.category='audacieux')
  ) into v_adult;
  if v_adult and not (
    select count(*)=2 and bool_and(adult_consent)
      from public.players where room_id=p_room_id and status='active'
  ) then
    raise exception 'E_CONSENT: Les deux joueurs doivent accepter le contenu 18+.';
  end if;

  select count(*) into v_unplayed
    from public.catalog c
   where c.category=any(v_categories)
     and not (c.id=any(coalesce(r.played_interaction_ids,'{}'::text[])));
  if v_unplayed>=cardinality(p_interaction_ids)
     and coalesce(r.played_interaction_ids,'{}'::text[]) && p_interaction_ids then
    raise exception 'E_CUSTOM_REPEAT: Cette sélection contient des questions déjà jouées.';
  end if;

  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms
     set status='playing', current_index=0, interaction_ids=p_interaction_ids, custom_deck=null,
         played_interaction_ids=case
           when v_unplayed<cardinality(p_interaction_ids) then
             array(
               select h.card_id
                 from unnest(coalesce(played_interaction_ids,'{}'::text[])) h(card_id)
                where not exists (
                  select 1 from public.catalog c
                   where c.id=h.card_id and c.category=any(v_categories)
                )
             ) || p_interaction_ids
           else coalesce(played_interaction_ids,'{}'::text[]) || p_interaction_ids
         end,
         adult_enabled=v_adult, selected_level=2, updated_at=now(), last_activity=now()
   where id=p_room_id;
  return true;
end
$$;

-- L'ancien RPC sans niveau n'est plus utilisé par le client ; on le ferme pour éviter
-- qu'un client obsolète contourne les règles du moteur par niveau.
revoke execute on function public.start_game(uuid,text,text[]) from public, anon, authenticated;

revoke execute on function public.set_player_categories(uuid,text,text[]) from public, authenticated;
grant execute on function public.set_player_categories(uuid,text,text[]) to anon;
revoke execute on function public.start_game_by_level(uuid,text,integer) from public, authenticated;
revoke execute on function public.start_duo_game_by_level(uuid,text,integer) from public, authenticated;
revoke execute on function public.start_custom_game(uuid,text,text[]) from public, authenticated;
grant execute on function public.start_game_by_level(uuid,text,integer) to anon;
grant execute on function public.start_duo_game_by_level(uuid,text,integer) to anon;
grant execute on function public.start_custom_game(uuid,text,text[]) to anon;
