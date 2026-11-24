-- QSPICY · Palier 1 — niveaux réellement filtrés côté serveur.
-- Migration additive : aucune salle, réponse ou carte existante n'est supprimée.

alter table public.catalog
  add column if not exists level integer not null default 1
  check (level between 1 and 4);

insert into public.catalog(id,category,kind,options,level) values
  ('d01','decouverte','free',null,1),
  ('d02','decouverte','free',null,1),
  ('d03','decouverte','secret','["Lumières basses et musique lente","Un dîner qui traîne en longueur","Une danse dans le salon","Un bain à deux"]'::jsonb,1),
  ('d04','decouverte','free',null,1),
  ('d05','decouverte','prediction',null,2),
  ('d06','decouverte','free',null,1),
  ('d07','decouverte','secret','["Une main dans mes cheveux","Un baiser dans le cou","Un regard qui s''attarde","Un murmure à l''oreille"]'::jsonb,1),
  ('d08','decouverte','free',null,2),
  ('d10','decouverte','free',null,1),
  ('d11','decouverte','secret','["Au réveil, encore à moitié endormi","En pleine journée, sans prévenir","Le soir, quand tout s''apaise","Au milieu de la nuit"]'::jsonb,1),
  ('x02','decouverte','cross',null,1),
  ('c01','complicite','secret','["Un massage lent","Une danse très proche","Un film sous la même couverture","Un dîner aux chandelles"]'::jsonb,2),
  ('c02','complicite','challenge',null,2),
  ('c03','complicite','free',null,2),
  ('c04','complicite','prediction',null,2),
  ('c05','complicite','challenge',null,2),
  ('c06','complicite','secret','["Une nuit d''hôtel improvisée","Un dîner puis une longue promenade","Un week-end sans téléphone","Une soirée à la maison, portes fermées"]'::jsonb,2),
  ('c07','complicite','free',null,2),
  ('c08','complicite','challenge',null,2),
  ('c09','complicite','prediction',null,2),
  ('c10','complicite','prediction',null,2),
  ('x01','complicite','cross',null,2),
  ('p01','profondeur','free',null,2),
  ('p02','profondeur','free',null,2),
  ('p03','profondeur','secret','["Être regardé sans jugement","Entendre ce qui plaît","Que l''on prenne son temps","Être guidé avec assurance"]'::jsonb,3),
  ('p04','profondeur','free',null,3),
  ('p05','profondeur','free',null,3),
  ('p06','profondeur','prediction',null,3),
  ('p07','profondeur','free',null,3),
  ('p08','profondeur','secret','["Lentement, en prenant son temps","Avec intensité et urgence","En alternant douceur et fougue","Selon l''humeur du moment"]'::jsonb,3),
  ('p09','profondeur','prediction',null,3),
  ('x03','profondeur','cross',null,3),
  ('s01','seduction','free',null,2),
  ('s02','seduction','challenge',null,2),
  ('s03','seduction','secret','["Lumière douce et musique lente","Un parfum et une peau encore chaude","Une promenade nocturne qui rapproche","Un dîner préparé à deux"]'::jsonb,2),
  ('s04','seduction','free',null,2),
  ('s05','seduction','prediction',null,2),
  ('s06','seduction','secret','["Une main qui attrape la mienne","Un baiser dans le cou","Un regard qui dure","Une surprise préparée pour moi"]'::jsonb,2),
  ('x04','seduction','cross',null,2),
  ('a01','audacieux','secret','["Les taquineries","Les compliments à l''oreille","Les regards appuyés","Les messages inattendus"]'::jsonb,3),
  ('a02','audacieux','free',null,4),
  ('a03','audacieux','challenge',null,4),
  ('a04','audacieux','free',null,3),
  ('a05','audacieux','free',null,4),
  ('a06','audacieux','challenge',null,4),
  ('a07','audacieux','free',null,4),
  ('a08','audacieux','free',null,4),
  ('a09','audacieux','cross',null,4),
  ('a10','audacieux','prediction',null,4)
on conflict (id) do update set
  category=excluded.category,
  kind=excluded.kind,
  options=excluded.options,
  level=excluded.level;

create or replace function public.start_game_by_level(
  p_room_id uuid,
  p_player_token text,
  p_categories text[],
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
  if r.status<>'waiting' then
    raise exception 'E_STATE: La partie a déjà commencé.';
  end if;

  select * into me from public.players where id=me.id;
  if (select count(*) from public.players where room_id=p_room_id and status='active')<>2 then
    raise exception 'E_STATE: Deux joueurs doivent être présents.';
  end if;

  select array_agg(c order by c) into v_categories
    from unnest(me.selected_categories) c
   where exists(
     select 1 from public.players other
      where other.room_id=p_room_id
        and other.status='active'
        and other.id<>me.id
        and c=any(other.selected_categories)
   );

  if coalesce(cardinality(v_categories),0)=0 then
    raise exception 'E_CATEGORIES: Choisissez au moins une catégorie en commun.';
  end if;

  v_adult := 'audacieux' = any(v_categories);
  if v_adult and not (
    select count(*)=2 and bool_and(adult_consent)
      from public.players
     where room_id=p_room_id and status='active'
  ) then
    raise exception 'E_CONSENT: La catégorie 18+ exige l’accord explicite des deux joueurs.';
  end if;

  select array_agg(id order by random()) into v_ids
    from (
      select id
        from public.catalog
       where category=any(v_categories)
         and level=p_level
       order by random()
       limit 24
    ) cards;

  if coalesce(cardinality(v_ids),0)=0 then
    raise exception 'E_LEVEL_EMPTY: Aucune carte disponible pour ce palier et ces catégories.';
  end if;

  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms
     set status='playing',
         current_index=0,
         interaction_ids=v_ids,
         adult_enabled=v_adult,
         updated_at=now(),
         last_activity=now()
   where id=p_room_id;

  return true;
end
$$;

revoke execute on function public.start_game_by_level(uuid,text,text[],integer) from public, authenticated;
grant execute on function public.start_game_by_level(uuid,text,text[],integer) to anon;
