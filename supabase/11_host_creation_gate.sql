-- Require a verified host account and an active prepaid subscription to create rooms.
-- Joining remains anonymous and free.

create or replace function public.create_room(p_nickname text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_room uuid; v_player uuid; v_token text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'E_HOST_AUTH_REQUIRED: Connecte-toi avec ton compte hôte pour créer une partie.';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and u.phone_confirmed_at is not null
  ) then
    raise exception 'E_HOST_CONTACTS_REQUIRED: Vérifie ton téléphone et ton e-mail avant de créer une partie.';
  end if;
  if not exists (
    select 1 from public.host_subscriptions s
    where s.user_id = auth.uid()
      and s.status = 'active'
      and s.expires_at > now()
  ) then
    raise exception 'E_SUBSCRIPTION_REQUIRED: Un accès hôte actif est nécessaire pour créer une partie.';
  end if;
  if char_length(trim(coalesce(p_nickname,''))) not between 2 and 20 then raise exception 'Pseudo : 2 à 20 caractères.'; end if;
  if p_avatar not in ('masculin','feminin') then raise exception 'Avatar invalide.'; end if;
  perform public._rate_check('create:'||public._client_key(), 8, interval '1 hour');
  perform public._rate_check('create:global', 400, interval '1 hour');
  perform public._purge();
  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.rooms default values returning id into v_room;
  insert into public.players(room_id,seat,nickname,avatar,token_hash)
    values (v_room,1,trim(p_nickname),p_avatar,encode(digest(v_token,'sha256'),'hex'))
    returning id into v_player;
  return jsonb_build_object('room_id',v_room,'player_id',v_player,'player_token',v_token);
end $$;

create or replace function public.create_duo_room(p_nickname text, p_avatar text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_room uuid; v_player uuid; v_token text;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'E_HOST_AUTH_REQUIRED: Connecte-toi avec ton compte hôte pour créer un salon DUOS.';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
      and u.phone_confirmed_at is not null
  ) then
    raise exception 'E_HOST_CONTACTS_REQUIRED: Vérifie ton téléphone et ton e-mail avant de créer un salon.';
  end if;
  if not exists (
    select 1 from public.host_subscriptions s
    where s.user_id = auth.uid()
      and s.status = 'active'
      and s.expires_at > now()
  ) then
    raise exception 'E_SUBSCRIPTION_REQUIRED: Un accès hôte actif est nécessaire pour créer un salon.';
  end if;
  if char_length(trim(coalesce(p_nickname,''))) not between 2 and 20 then
    raise exception 'Pseudo : 2 à 20 caractères.';
  end if;
  if p_avatar not in ('masculin','feminin') then raise exception 'Avatar invalide.'; end if;
  perform public._rate_check('create-duo:'||public._client_key(), 5, interval '1 hour');
  perform public._rate_check('create-duo:global', 100, interval '1 hour');
  perform public._purge();
  v_token := encode(gen_random_bytes(32),'hex');
  insert into public.rooms(mode) values ('duos') returning id into v_room;
  insert into public.players(room_id,seat,duo_no,nickname,avatar,token_hash)
    values (v_room,1,1,trim(p_nickname),p_avatar,encode(digest(v_token,'sha256'),'hex'))
    returning id into v_player;
  insert into public.duo_permissions(player_id) values (v_player);
  return jsonb_build_object('room_id',v_room,'player_id',v_player,'player_token',v_token,'mode','duos');
end $$;

revoke execute on function public.create_room(text,text) from public, anon;
grant execute on function public.create_room(text,text) to authenticated;
revoke execute on function public.create_duo_room(text,text) from public, anon;
grant execute on function public.create_duo_room(text,text) to authenticated;

-- Authenticated hosts use the same player-token game API after room creation.
-- Guests still use the anonymous role; internal helper functions remain private.
grant execute on function
  public.join_room(uuid,text,text),
  public.join_room_any(uuid,text,text),
  public.get_room_snapshot(uuid,text),
  public.set_adult_consent(uuid,text,boolean),
  public.set_player_categories(uuid,text,text[]),
  public.start_game(uuid,text,text[]),
  public.submit_answer(uuid,text,text,boolean),
  public.next_interaction(uuid,text),
  public.set_pause(uuid,text,boolean),
  public.restart_game(uuid,text),
  public.leave_room(uuid,text),
  public.join_duo_room(uuid,text,text),
  public.get_duo_snapshot(uuid,text),
  public.set_duo_permissions(uuid,text,boolean,boolean,boolean),
  public.send_duo_message(uuid,text,text,text,text),
  public.start_duo_game(uuid,text),
  public.submit_duo_answer(uuid,text,text,text,boolean,text),
  public.next_duo_interaction(uuid,text),
  public.restart_duo_game(uuid,text)
to authenticated;
