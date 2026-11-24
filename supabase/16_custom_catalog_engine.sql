-- QSPICY Palier 3: custom sessions now use canonical catalog interaction IDs.
-- Additive and backward-compatible for custom rooms already in progress (perso-N + custom_deck).

create or replace function public._advance(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  r public.rooms;
  v_category text;
  v_level integer;
begin
  select * into r from public.rooms where id=p_room_id;
  loop
    if r.current_index+1 >= cardinality(r.interaction_ids) then
      update public.rooms set status='finished', updated_at=now(), last_activity=now() where id=p_room_id;
      return;
    end if;
    r.current_index := r.current_index+1;
    select category, level into v_category, v_level
      from public.catalog where id=r.interaction_ids[r.current_index+1];
    -- Every level 3–4 card and every Audacieux card is adult-gated, regardless of category.
    exit when ((coalesce(v_level,1) < 3 and v_category is distinct from 'audacieux') or r.adult_enabled);
  end loop;
  update public.rooms set current_index=r.current_index, updated_at=now(), last_activity=now() where id=p_room_id;
end
$$;

create or replace function public._sync_adult(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_ok boolean;
  v_required integer;
  r public.rooms;
  v_category text;
  v_level integer;
  v_int text;
begin
  select * into r from public.rooms where id=p_room_id for update;
  if r.id is null then return; end if;
  v_required := case when r.mode='duos' then 4 else 2 end;
  select count(*)=v_required and coalesce(bool_and(adult_consent),false) into v_ok
    from public.players where room_id=p_room_id and status='active';
  update public.rooms set adult_enabled=coalesce(v_ok,false), updated_at=now()
    where id=p_room_id returning * into r;
  if r.status in ('playing','paused') and not coalesce(v_ok,false) then
    v_int := r.interaction_ids[r.current_index+1];
    select category, level into v_category, v_level from public.catalog where id=v_int;
    if r.selected_level >= 3 then
      delete from public.answers where room_id=p_room_id and interaction_id=v_int;
      delete from public.duo_answers where room_id=p_room_id and interaction_id=v_int;
      update public.players set ack_index=-1 where room_id=p_room_id;
      update public.rooms set status='finished', adult_enabled=false, updated_at=now(), last_activity=now() where id=p_room_id;
    elsif v_category='audacieux' or coalesce(v_level,1)>=3 then
      delete from public.answers where room_id=p_room_id and interaction_id=v_int;
      delete from public.duo_answers where room_id=p_room_id and interaction_id=v_int;
      update public.players set ack_index=-1 where room_id=p_room_id;
      perform public._advance(p_room_id);
    end if;
  end if;
end
$$;

-- The old arbitrary-text entry point is no longer available to clients.
revoke execute on function public.start_custom_game(uuid,text,jsonb) from public, anon, authenticated;

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

  select count(*) into v_count
    from public.catalog c
   where c.id=any(p_interaction_ids) and c.category=any(v_categories);
  if v_count<>cardinality(p_interaction_ids) then
    raise exception 'E_CUSTOM: Une ou plusieurs cartes ne font pas partie du catalogue ou des catégories communes.';
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

  -- Do not repeat already played cards while enough unseen cards remain in this category pool.
  select count(*) into v_unplayed
    from public.catalog c
   where c.category=any(v_categories)
     and not (c.id=any(coalesce(r.played_interaction_ids,'{}'::text[])));
  if v_unplayed>=cardinality(p_interaction_ids) and exists (
    select 1 from unnest(p_interaction_ids) selected_id
     where selected_id=any(coalesce(r.played_interaction_ids,'{}'::text[]))
  ) then
    raise exception 'E_CUSTOM_REPEAT: Cette sélection contient des questions déjà jouées.';
  end if;

  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms
     set status='playing',
         current_index=0,
         interaction_ids=p_interaction_ids,
         custom_deck=null,
         played_interaction_ids=
           case when v_unplayed<cardinality(p_interaction_ids) then
             array(
               select h.card_id
                 from unnest(coalesce(played_interaction_ids,'{}'::text[])) h(card_id)
                where not exists (
                  select 1 from public.catalog c
                   where c.id=h.card_id and c.category=any(v_categories)
                )
             ) || p_interaction_ids
           else coalesce(played_interaction_ids,'{}'::text[]) || p_interaction_ids end,
         adult_enabled=v_adult,
         selected_level=2,
         updated_at=now(),
         last_activity=now()
   where id=p_room_id;
  return true;
end
$$;

revoke execute on function public.start_custom_game(uuid,text,text[]) from public, authenticated;
grant execute on function public.start_custom_game(uuid,text,text[]) to anon;
