-- QSPICY — options QCM canoniques côté serveur.
-- Le navigateur ne doit plus valider une réponse avec une copie locale du catalogue
-- potentiellement différente de public.catalog. Le snapshot renvoie les options
-- exactes utilisées par submit_answer pour valider la réponse.
--
-- À appliquer après 21_explicit_content_floor.sql (et après les migrations
-- catalogue éventuelles). Aucune donnée n'est modifiée.

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
    'interaction_id', v_int, 'interaction_options', (select options from public.catalog where id = v_int), 'my_answer', v_my, 'other_submitted', v_other_sub,
    'revealed', v_rev, 'answers', v_answers, 'first_answer', v_first, 'first_player_present', coalesce(v_first_present,false),
    'i_acked', me.ack_index >= r.current_index, 'other_acked', v_other_ack, 'summary', v_sum);
end $$;
