-- QSPICY — 07 : correctifs de sécurité et de consentement
-- À appliquer APRÈS 06_duo_schema.sql. Idempotent, aucune table supprimée, aucun historique effacé.
--
-- Contenu :
--   A. Médias DUOS : réception désactivée par défaut (le produit promet « partage désactivé par défaut »).
--   B. Réponses DUOS : masquage réel côté serveur jusqu'à la révélation (aujourd'hui le serveur les
--      renvoie dès qu'elles sont écrites, la confidentialité ne tient qu'à l'interface).
--   C. Cloisonnement des modes : join_room et get_room_snapshot refusent un salon DUOS ;
--      restart_game refuse un salon DUOS (un joueur pouvait remettre une partie à quatre en attente).
--
-- Non modifié volontairement : la fenêtre de présence de 120 s (elle permet de ne pas bloquer la partie
-- quand l'autre a disparu) et la question croisée à deux joueurs (le joueur 2 doit lire la réponse du
-- joueur 1 pour réagir, c'est le principe même du format).

-- ===== A. Médias : false par défaut =====
alter table public.duo_permissions alter column receive_media set default false;
-- Les lignes existantes n'ont jamais exprimé de choix explicite : elles portaient la valeur par défaut.
update public.duo_permissions set receive_media = false, updated_at = now() where receive_media is true;

-- ===== B et A (fonctions) : snapshot DUOS avec masquage =====
create or replace function public.get_duo_snapshot(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_players jsonb; v_messages jsonb; v_permissions jsonb;
  v_int text; v_my_answer text; v_revealed boolean := false; v_answers jsonb; v_all_cross boolean;
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
    'receive_media',coalesce(dp.receive_media,false)
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
  -- Révélation : les quatre joueurs présents ont répondu à l'interaction courante.
  if v_int is not null then
    select count(*) = 4 and count(*) filter (where exists (
             select 1 from public.duo_answers a where a.room_id=p_room_id
               and a.interaction_id=v_int and a.player_id=p.id)) = 4
      into v_revealed
      from public.players p where p.room_id=p_room_id and p.status='active';
  end if;
  -- Avant la révélation, chacun ne voit que sa propre réponse (et les passages).
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

-- ===== C1. join_room refuse un salon DUOS =====
create or replace function public.join_room(p_room_id uuid, p_nickname text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.rooms; v_token text; v_player uuid; v_seat int;
begin
  if char_length(trim(coalesce(p_nickname,''))) not between 2 and 20 then raise exception 'Pseudo : 2 à 20 caractères.'; end if;
  if p_avatar not in ('masculin','feminin') then raise exception 'Avatar invalide.'; end if;
  perform public._rate_check('join:'||public._client_key(), 30, interval '10 minutes');
  select * into r from public.rooms where id=p_room_id for update;
  if r.id is null then raise exception 'E_ROOM_UNKNOWN: Cette salle n’existe pas ou a été supprimée.'; end if;
  if r.mode <> 'couple' then raise exception 'E_MODE: Ce salon est un salon DUOS.'; end if;
  if r.last_activity < now()-interval '6 hours' then raise exception 'E_ROOM_EXPIRED: Cette salle a expiré.'; end if;
  if r.status='finished' then raise exception 'E_ROOM_FINISHED: Cette partie est terminée.'; end if;
  select s into v_seat from generate_series(1,2) s
   where not exists (select 1 from public.players where room_id=p_room_id and seat=s and status='active') order by s limit 1;
  if v_seat is null then
    raise exception 'E_ROOM_FULL: Cette salle est déjà complète.';
  end if;
  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.players(room_id,seat,nickname,avatar,token_hash) values (p_room_id,v_seat,trim(p_nickname),p_avatar,encode(digest(v_token,'sha256'),'hex')) returning id into v_player;
  update public.rooms set last_activity=now() where id=p_room_id;
  perform public._sync_adult(p_room_id);
  return jsonb_build_object('room_id',p_room_id,'player_id',v_player,'player_token',v_token);
end $$;

-- ===== C2. get_room_snapshot refuse un salon DUOS =====
create or replace function public.get_room_snapshot(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_int text; v_req int; v_sub int; v_rev boolean; v_kind text;
        v_players jsonb; v_answers jsonb := '[]'::jsonb; v_my text; v_other_sub boolean; v_first text; v_first_present boolean; v_other_ack boolean; v_sum jsonb := null;
begin
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id=p_room_id;
  if r.mode <> 'couple' then raise exception 'E_MODE: Ce salon est un salon DUOS.'; end if;
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
    'room', jsonb_build_object('id',r.id,'status',r.status,'current_index',r.current_index,'total',cardinality(r.interaction_ids),'adult_enabled',r.adult_enabled),
    'players', v_players, 'my_player_id', me.id, 'my_seat', me.seat, 'my_consent', me.adult_consent,
    'my_categories', me.selected_categories,
    'other_categories', (select selected_categories from public.players where room_id=p_room_id and status='active' and id<>me.id limit 1),
    'interaction_id', v_int, 'my_answer', v_my, 'other_submitted', v_other_sub,
    'revealed', v_rev, 'answers', v_answers, 'first_answer', v_first, 'first_player_present', coalesce(v_first_present,false),
    'i_acked', me.ack_index >= r.current_index, 'other_acked', v_other_ack, 'summary', v_sum);
end $$;

-- ===== C3. restart_game réservé aux salons à deux =====
create or replace function public.restart_game(p_room_id uuid, p_player_token text)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players;
begin
  me := public._player_for(p_room_id,p_player_token);
  if (select mode from public.rooms where id=p_room_id) <> 'couple' then
    raise exception 'E_MODE: Ce salon est un salon DUOS.';
  end if;
  perform 1 from public.rooms where id=p_room_id and status='finished' for update;
  if not found then return false; end if;
  delete from public.answers where room_id=p_room_id;
  update public.players set ack_index=-1, adult_consent=false where room_id=p_room_id;
  update public.rooms set status='waiting', current_index=0, interaction_ids='{}', adult_enabled=false, updated_at=now(), last_activity=now() where id=p_room_id;
  return true;
end $$;
