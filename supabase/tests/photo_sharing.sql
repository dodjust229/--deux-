-- Recette d'intégration du partage photo privé en mode Couple.
do $photo_test$
declare
  owner_data jsonb;
  guest_data jsonb;
  room uuid;
  owner_token text;
  guest_token text;
  guest_id uuid;
  media_id uuid;
  object_path text;
  state jsonb;
  denied boolean := false;
  deleted_path text;
begin
  if to_regprocedure('public.set_room_media_permission(uuid,text,boolean)') is null
     or to_regprocedure('public.qspicy_media_targets(uuid,text,text)') is null
     or to_regprocedure('public.qspicy_media_register(uuid,text,text,text,text,integer)') is null
     or to_regprocedure('public.qspicy_media_list(uuid,text)') is null
     or to_regprocedure('public.qspicy_media_delete(uuid,text,uuid)') is null then
    raise exception 'Palier 5 photo RPCs are missing';
  end if;
  if not exists (
    select 1 from storage.buckets
    where id='qspicy-private-media' and public=false
      and file_size_limit=5242880
      and allowed_mime_types @> array['image/jpeg','image/png','image/webp']
  ) then
    raise exception 'Private photo bucket restrictions are missing';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.room_media'::regclass) then
    raise exception 'room_media RLS must be enabled';
  end if;

  owner_data := public.create_room('PhotoOwner','masculin');
  room := (owner_data->>'room_id')::uuid;
  owner_token := owner_data->>'player_token';
  guest_data := public.join_room(room,'PhotoGuest','feminin');
  guest_token := guest_data->>'player_token';
  guest_id := (guest_data->>'player_id')::uuid;

  begin
    perform public.qspicy_media_targets(room,owner_token,'partner');
    raise exception 'Expected photo consent to be required';
  exception when others then
    if sqlerrm like 'E_MEDIA_CONSENT:%' then denied := true;
    else raise;
    end if;
  end;
  if not denied then raise exception 'Photo upload was not blocked before consent'; end if;

  perform public.set_room_media_permission(room,guest_token,true);
  if not ((public.qspicy_media_targets(room,owner_token,'partner')->'recipient_ids') ? guest_id::text) then
    raise exception 'Authorized recipient was not returned';
  end if;

  object_path := room::text || '/' || gen_random_uuid()::text || '.jpg';
  state := public.qspicy_media_register(room,owner_token,'partner',object_path,'image/jpeg',2048);
  media_id := (state->>'id')::uuid;

  state := public.qspicy_media_list(room,guest_token);
  if jsonb_array_length(state->'items') <> 1 then
    raise exception 'Authorized recipient cannot list the shared photo';
  end if;
  state := public.qspicy_media_list(room,owner_token);
  if jsonb_array_length(state->'items') <> 1 then
    raise exception 'Sender cannot list their own photo';
  end if;

  perform public.set_room_media_permission(room,guest_token,false);
  state := public.qspicy_media_list(room,guest_token);
  if jsonb_array_length(state->'items') <> 0 then
    raise exception 'Photo remains visible after recipient withdraws consent';
  end if;
  perform public.set_room_media_permission(room,guest_token,true);

  begin
    perform public.qspicy_media_delete(room,guest_token,media_id);
    raise exception 'Recipient unexpectedly deleted another player photo';
  exception when others then
    if sqlerrm not like 'E_MEDIA_DELETE:%' then raise; end if;
  end;

  deleted_path := public.qspicy_media_delete(room,owner_token,media_id);
  if deleted_path is distinct from object_path then
    raise exception 'Sender deletion did not return the stored object path';
  end if;
  state := public.qspicy_media_list(room,guest_token);
  if jsonb_array_length(state->'items') <> 0 then
    raise exception 'Deleted photo remains visible to its recipient';
  end if;
end
$photo_test$;
