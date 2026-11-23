-- Test-only compatibility shim for the currently deployed join_room_any RPC.
-- This file is applied ONLY to a disposable local/CI database, never to production.
-- The wrapper mirrors the production dispatcher: DUOS uses join_duo_room; other rooms use join_room.
create or replace function public.join_room_any(p_room_id uuid, p_nickname text, p_avatar text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_mode text;
begin
  select mode into v_mode from public.rooms where id = p_room_id;
  if v_mode = 'duos' then
    return public.join_duo_room(p_room_id, p_nickname, p_avatar);
  end if;
  return public.join_room(p_room_id, p_nickname, p_avatar);
end
$function$;

revoke execute on function public.join_room_any(uuid, text, text) from public, authenticated;
grant execute on function public.join_room_any(uuid, text, text) to anon;
