-- QSPICY — 19 : finalisation du parcours d'invitation.
--
-- Pourquoi ce fichier :
--   1. `join_room_any` est le SEUL point d'entrée utilisé par le client pour rejoindre une
--      salle (src/api.ts), mais il n'était défini dans AUCUNE migration. Il n'existait que sur
--      le serveur déployé, et les tests locaux le recréaient par un adaptateur jetable
--      (supabase/tests/bootstrap_custom_room.sql). Une base neuve construite à partir du dépôt
--      refusait donc toute invitation. Il est désormais versionné ici, à l'identique du
--      dispatcher de production.
--   2. `get_custom_deck` renvoyait `[]` pour les salons Personnalisés créés par le moteur
--      catalogue (migration 16) : `rooms.custom_deck` n'est plus rempli, la séquence vit dans
--      `interaction_ids`. La séquence devient lisible par l'API.
--   3. Le type d'un salon (Couple / Personnalisé / DUOS) n'était connu que par le paramètre
--      `&mode=` du lien d'invitation. Un lien tronqué ou un favori enregistré faisait arriver
--      l'invité dans le lobby Couple. Le type est désormais porté par la salle.
--   4. Les privilèges RPC sont resserrés : l'API de jeu est anonyme, `authenticated` n'a
--      aucun accès (intention de 05_duo_rpc_anon_only.sql, jamais appliquée par les recettes).
--
-- Additif et idempotent : aucune donnée n'est supprimée, aucune salle en cours n'est modifiée.

-- ===== 1. Type de salon porté par la salle =====
alter table public.rooms add column if not exists room_kind text;
-- Une salle préexistante sans type explicite reste identifiable comme legacy : le client
-- conserve alors le mode du lien d'invitation au lieu de forcer Couple.
alter table public.rooms alter column room_kind drop default;
alter table public.rooms alter column room_kind drop not null;
alter table public.rooms drop constraint if exists rooms_room_kind_check;
alter table public.rooms add constraint rooms_room_kind_check
  check (room_kind in ('couple','custom','duos'));

-- Les salles DUOS existantes se reconnaissent à leur mode.
update public.rooms set room_kind = 'duos' where mode = 'duos' and room_kind is distinct from 'duos';
-- Les anciennes salles du moteur historique stockaient leur deck libre dans custom_deck.
update public.rooms set room_kind = 'custom'
 where mode = 'couple' and custom_deck is not null and room_kind is null;

-- Un salon DUOS créé après cette migration doit naître avec le bon type : le défaut de colonne
-- est 'couple', on le corrige à la création.
create or replace function public.create_duo_room(p_nickname text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_room uuid; v_player uuid; v_token text;
begin
  if char_length(trim(coalesce(p_nickname,''))) not between 2 and 20 then
    raise exception 'Pseudo : 2 à 20 caractères.';
  end if;
  if p_avatar not in ('masculin','feminin') then raise exception 'Avatar invalide.'; end if;
  perform public._rate_check('create-duo:'||public._client_key(), 5, interval '1 hour');
  perform public._rate_check('create-duo:global', 100, interval '1 hour');
  perform public._purge();
  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.rooms(mode, room_kind) values ('duos', 'duos') returning id into v_room;
  insert into public.players(room_id,seat,duo_no,nickname,avatar,token_hash)
  values (v_room,1,1,trim(p_nickname),p_avatar,encode(digest(v_token,'sha256'),'hex'))
  returning id into v_player;
  insert into public.duo_permissions(player_id) values (v_player);
  return jsonb_build_object('room_id',v_room,'player_id',v_player,'player_token',v_token,'mode','duos','room_kind','duos');
end $$;

-- L'hôte déclare le type de sa salle au moment de la création. Un invité ne peut pas le faire :
-- seul le siège 1 (créateur) est autorisé, et seulement tant que la salle attend.
create or replace function public.set_room_kind(
  p_room_id uuid,
  p_player_token text,
  p_room_kind text
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
  if p_room_kind not in ('couple','custom','duos') then
    raise exception 'E_KIND: Type de salon invalide.';
  end if;
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id = p_room_id for update;
  if r.id is null then
    raise exception 'E_ROOM_UNKNOWN: Cette salle n''existe pas ou a été supprimée.';
  end if;
  if me.seat <> 1 then
    raise exception 'E_HOST: Seul l''hôte peut définir le type du salon.';
  end if;
  if r.status <> 'waiting' then
    raise exception 'E_STATE: Le type du salon ne peut plus être modifié après le lancement.';
  end if;
  -- Un salon DUOS est un vrai mode serveur : on ne le déguise pas en salon à deux.
  if (r.mode = 'duos') <> (p_room_kind = 'duos') then
    raise exception 'E_KIND: Ce type ne correspond pas au mode du salon.';
  end if;
  update public.rooms
     set room_kind = p_room_kind, updated_at = now(), last_activity = now()
   where id = p_room_id;
  return true;
end
$$;

-- ===== 2. join_room_any : dispatcher versionné =====
-- Miroir exact du dispatcher de production : DUOS → join_duo_room, sinon → join_room.
-- Chaque branche conserve ses propres contrôles (pseudo, avatar, limitation de débit,
-- expiration, salle pleine, état de la partie).
create or replace function public.join_room_any(
  p_room_id uuid,
  p_nickname text,
  p_avatar text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_mode text;
  v_kind text;
  v_result jsonb;
begin
  select mode, room_kind into v_mode, v_kind from public.rooms where id = p_room_id;
  if v_mode is null then
    raise exception 'E_ROOM_UNKNOWN: Cette salle n''existe pas ou a été supprimée.';
  end if;
  if v_mode = 'duos' then
    v_result := public.join_duo_room(p_room_id, p_nickname, p_avatar);
  else
    v_result := public.join_room(p_room_id, p_nickname, p_avatar);
  end if;
  -- Le type du salon accompagne la réponse : un lien tronqué (sans &mode=) ne fait plus
  -- arriver l'invité dans le mauvais format.
  return v_result || jsonb_build_object('room_kind', v_kind);
end
$$;

-- ===== 3. get_custom_deck : séquence lisible pour les deux moteurs =====
-- Moteur historique (perso-N) : la séquence est dans rooms.custom_deck (textes libres).
-- Moteur catalogue (migration 16) : la séquence est dans rooms.interaction_ids. Les énoncés
-- ne sont pas en base (public.catalog ne porte que id/category/kind/options/level ; le texte
-- vit dans src/content.ts). On renvoie donc la séquence d'identifiants, dans l'ordre joué :
-- c'est la seule vérité que le serveur possède, et elle rend la séquence lisible par l'API.
create or replace function public.get_custom_deck(p_room_id uuid, p_player_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  me public.players;
  r public.rooms;
begin
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id = p_room_id;
  if r.id is null then
    raise exception 'E_ROOM_UNKNOWN: Cette salle n''existe pas ou a été supprimée.';
  end if;
  if r.custom_deck is not null then
    return r.custom_deck;
  end if;
  return to_jsonb(coalesce(r.interaction_ids, '{}'::text[]));
end
$$;

-- ===== 4. Le type de salon remonte dans les instantanés =====
-- get_room_snapshot (Couple / Personnalisé) : ajout de room_kind, sans rien retirer.
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
    'room', jsonb_build_object('id',r.id,'mode',r.mode,'room_kind',r.room_kind,'status',r.status,'current_index',r.current_index,'total',cardinality(r.interaction_ids),'adult_enabled',r.adult_enabled),
    'players', v_players, 'my_player_id', me.id, 'my_seat', me.seat, 'my_consent', me.adult_consent,
    'my_categories', me.selected_categories,
    'other_categories', (select selected_categories from public.players where room_id=p_room_id and status='active' and id<>me.id limit 1),
    'interaction_id', v_int, 'my_answer', v_my, 'other_submitted', v_other_sub,
    'revealed', v_rev, 'answers', v_answers, 'first_answer', v_first, 'first_player_present', coalesce(v_first_present,false),
    'i_acked', me.ack_index >= r.current_index, 'other_acked', v_other_ack, 'summary', v_sum);
end $$;

-- get_duo_snapshot : ajout de room_kind au bloc room.
create or replace function public.get_duo_snapshot(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms; v_players jsonb; v_messages jsonb; v_permissions jsonb;
  v_int text; v_my_answer text; v_revealed boolean; v_answers jsonb; v_all_cross boolean;
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
    'receive_media',coalesce(dp.receive_media,true)
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
      and (m.message_type='text' or coalesce((select receive_media from public.duo_permissions where player_id=me.id),true))
    order by m.created_at desc limit 100
  ) m;
  select jsonb_build_object(
    'cross_participation',coalesce(dp.cross_participation,false),
    'receive_media',coalesce(dp.receive_media,true),
    'share_answers',coalesce(dp.share_answers,false)
  ) into v_permissions from public.duo_permissions dp where dp.player_id=me.id;
  select answer into v_my_answer from public.duo_answers
   where room_id=p_room_id and interaction_id=v_int and player_id=me.id;
  select count(*)=4 and (select count(*)=4 from public.duo_answers where room_id=p_room_id and interaction_id=v_int)
    into v_revealed from public.players where room_id=p_room_id and status='active';
  select coalesce(jsonb_agg(jsonb_build_object(
    'player_id',a.player_id,'answer',a.answer,'passed',a.passed,'visibility',a.visibility
  ) order by p.seat),'[]'::jsonb) into v_answers
  from public.duo_answers a join public.players p on p.id=a.player_id
  where a.room_id=p_room_id and a.interaction_id=v_int
    and (a.player_id=me.id or a.passed or (a.visibility='duo' and p.duo_no=me.duo_no) or (a.visibility='group' and v_all_cross));
  return jsonb_build_object(
    'room',jsonb_build_object('id',r.id,'mode',r.mode,'room_kind',r.room_kind,'status',r.status,'current_index',r.current_index,
      'total',cardinality(r.interaction_ids),'adult_enabled',r.adult_enabled),
    'players',v_players,'my_player_id',me.id,'my_seat',me.seat,'my_duo_no',me.duo_no,
    'my_consent',me.adult_consent,'my_categories',me.selected_categories,
    'interaction_id',v_int,'my_answer',v_my_answer,'revealed',coalesce(v_revealed,false),
    'answers',v_answers,'i_acked',me.ack_index>=r.current_index,
    'other_acked',(select count(*)=4 from public.players p where p.room_id=p_room_id and p.status='active' and p.ack_index>=r.current_index),
    'permissions',coalesce(v_permissions,'{}'::jsonb),'messages',v_messages
  );
end $$;

-- ===== 5. Privilèges : API anonyme uniquement =====
-- L'API de jeu ne sert aucun compte : `authenticated` n'a aucun droit d'exécution.
revoke execute on function public.join_room_any(uuid,text,text) from public, authenticated;
grant execute on function public.join_room_any(uuid,text,text) to anon;

revoke execute on function public.create_duo_room(text,text) from public, authenticated;
grant execute on function public.create_duo_room(text,text) to anon;

revoke execute on function public.set_room_kind(uuid,text,text) from public, authenticated;
grant execute on function public.set_room_kind(uuid,text,text) to anon;

revoke execute on function public.get_custom_deck(uuid,text) from public, authenticated;
grant execute on function public.get_custom_deck(uuid,text) to anon;

revoke execute on function public.get_room_snapshot(uuid,text) from public, authenticated;
grant execute on function public.get_room_snapshot(uuid,text) to anon;

revoke execute on function public.get_duo_snapshot(uuid,text) from public, authenticated;
grant execute on function public.get_duo_snapshot(uuid,text) to anon;

-- Les tables restent totalement fermées aux rôles clients.
revoke all on all tables in schema public from public, anon, authenticated;
