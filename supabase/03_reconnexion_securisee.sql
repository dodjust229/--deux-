-- QSPICY — reconnexion sécurisée (à exécuter APRÈS 01_schema.sql, sur une base existante).
-- Supprime la reprise automatique d'une place après 120 s d'absence : une salle pleine reste pleine,
-- et un joueur ne retrouve sa place qu'avec le jeton de session qu'il a conservé.
-- Migration additive et réversible : aucune donnée supprimée. Le corps est identique à 01_schema.sql.

create or replace function public.join_room(p_room_id uuid, p_nickname text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare r public.rooms; v_token text; v_player uuid; v_seat int;
begin
  if char_length(trim(coalesce(p_nickname,''))) not between 2 and 20 then raise exception 'Pseudo : 2 à 20 caractères.'; end if;
  if p_avatar not in ('masculin','feminin') then raise exception 'Avatar invalide.'; end if;
  perform public._rate_check('join:'||public._client_key(), 30, interval '10 minutes');
  select * into r from public.rooms where id=p_room_id for update;
  if r.id is null then raise exception 'E_ROOM_UNKNOWN: Cette salle n’existe pas ou a été supprimée.'; end if;
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
