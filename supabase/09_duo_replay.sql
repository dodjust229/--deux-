-- QSPICY — 09 : redémarrage DUOS à quatre accords
-- À appliquer après 08. Remplace restart_duo_game (boolean, redémarrage immédiat) par un vote :
-- chacun valide « Rejouer », la partie repart quand les quatre joueurs actifs ont validé.
--
-- Additif : une colonne players.replay_vote, aucun historique supprimé avant le redémarrage effectif.

alter table public.players add column if not exists replay_vote boolean not null default false;

comment on column public.players.replay_vote is
  'Vote « rejouer » d''une partie DUOS terminée ; remis à false au lancement et au redémarrage.';

-- Le type de retour change : create or replace ne suffit pas.
drop function if exists public.restart_duo_game(uuid,text);

create or replace function public.restart_duo_game(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_votes int;
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.mode <> 'duos' then raise exception 'E_MODE: Ce salon n’est pas un salon DUOS.'; end if;
  if r.status <> 'finished' then raise exception 'E_STATE: La partie n’est pas terminée.'; end if;
  if (select count(*) from public.players where room_id=p_room_id and status='active') <> 4 then
    raise exception 'E_STATE: Les quatre joueurs doivent être présents pour rejouer.';
  end if;
  update public.players set replay_vote=true where id=me.id;
  select count(*) into v_votes from public.players
   where room_id=p_room_id and status='active' and replay_vote;
  if v_votes < 4 then
    return jsonb_build_object('restarted',false,'votes',v_votes,'needed',4);
  end if;
  delete from public.duo_answers where room_id=p_room_id;
  delete from public.duo_messages where room_id=p_room_id;
  update public.players set ack_index=-1, adult_consent=false, replay_vote=false where room_id=p_room_id;
  update public.rooms set status='waiting', current_index=0, interaction_ids='{}',
    adult_enabled=false, updated_at=now(), last_activity=now() where id=p_room_id;
  return jsonb_build_object('restarted',true,'votes',4,'needed',4);
end $$;

revoke execute on function public.restart_duo_game(uuid,text) from public, authenticated;
grant execute on function public.restart_duo_game(uuid,text) to anon;

-- start_duo_game remet les votes à zéro au lancement.
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
  update public.players set ack_index=-1, replay_vote=false where room_id=p_room_id;
  update public.rooms set status='playing',current_index=0,interaction_ids=v_ids,
    adult_enabled=v_adult,updated_at=now(),last_activity=now() where id=p_room_id;
  return true;
end $$;

-- get_duo_snapshot expose l'état du vote de redémarrage (reprend 07 avec le champ replay).
create or replace function public.get_duo_snapshot(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_players jsonb; v_messages jsonb; v_permissions jsonb;
  v_int text; v_my_answer text; v_revealed boolean := false; v_answers jsonb; v_all_cross boolean; v_votes int;
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
    'receive_media',coalesce(dp.receive_media,false),
    'replay_vote',p.replay_vote
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
      and (m.message_type='text' or coalesce((select receive_media from public.duo_permissions where player_id=me.id),false))
    order by m.created_at desc limit 100
  ) m;
  select jsonb_build_object(
    'cross_participation',coalesce(dp.cross_participation,false),
    'receive_media',coalesce(dp.receive_media,false),
    'share_answers',coalesce(dp.share_answers,false)
  ) into v_permissions from public.duo_permissions dp where dp.player_id=me.id;
  select answer into v_my_answer from public.duo_answers
   where room_id=p_room_id and interaction_id=v_int and player_id=me.id;
  if v_int is not null then
    select count(*) = 4 and count(*) filter (where exists (
             select 1 from public.duo_answers a where a.room_id=p_room_id
               and a.interaction_id=v_int and a.player_id=p.id)) = 4
      into v_revealed
      from public.players p where p.room_id=p_room_id and p.status='active';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'player_id',a.player_id,'answer',a.answer,'passed',a.passed,'visibility',a.visibility
  ) order by p.seat),'[]'::jsonb) into v_answers
  from public.duo_answers a join public.players p on p.id=a.player_id
  where a.room_id=p_room_id and a.interaction_id=v_int
    and (
      a.player_id=me.id
      or (coalesce(v_revealed,false) and (
           a.passed
        or (a.visibility='duo' and p.duo_no=me.duo_no)
        or (a.visibility='group' and coalesce(v_all_cross,false))
      ))
    );
  select count(*) into v_votes from public.players where room_id=p_room_id and status='active' and replay_vote;
  return jsonb_build_object(
    'room',jsonb_build_object('id',r.id,'mode',r.mode,'status',r.status,'current_index',r.current_index,
      'total',cardinality(r.interaction_ids),'adult_enabled',r.adult_enabled),
    'players',v_players,'my_player_id',me.id,'my_seat',me.seat,'my_duo_no',me.duo_no,
    'my_consent',me.adult_consent,'my_categories',me.selected_categories,
    'interaction_id',v_int,'my_answer',v_my_answer,'revealed',coalesce(v_revealed,false),
    'answers',v_answers,'i_acked',me.ack_index>=r.current_index,
    'other_acked',(select count(*)=4 from public.players p where p.room_id=p_room_id and p.status='active' and p.ack_index>=r.current_index),
    'permissions',coalesce(v_permissions,'{}'::jsonb),'messages',v_messages,
    'replay',jsonb_build_object('votes',v_votes,'needed',4,'mine',me.replay_vote)
  );
end $$;
