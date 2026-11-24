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
     or to_regprocedure('public.qspicy_media_delete(uuid,text,uuid)') is null
     or to_regprocedure('public.qspicy_media_delete_path(uuid,text,uuid)') is null then
    raise exception 'Palier 5 photo RPCs are missing';
  end if;
  if not exists (
    select 1 from storage.buckets
    where id='qspicy-private-media' and public=false
      and file_size_limit=5242880
      and allowed_mime_types @> array['image/jpeg'] and cardinality(allowed_mime_types)=1
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
  state := public.qspicy_media_list(room,guest_token);
  if jsonb_array_length(state->'items') <> 0 then
    raise exception 'Previously revoked photo access returned after consent was re-enabled';
  end if;

  begin
    perform public.qspicy_media_delete_path(room,guest_token,media_id);
    raise exception 'Recipient unexpectedly obtained deletion access to another player photo';
  exception when others then
    if sqlerrm not like 'E_MEDIA_DELETE:%' then raise; end if;
  end;

  deleted_path := public.qspicy_media_delete_path(room,owner_token,media_id);
  if deleted_path is distinct from object_path then
    raise exception 'Owner could not obtain the authorized object path';
  end if;
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


-- Recette DUOS : l'espace commun exige les quatre accords et le retrait est permanent.
do $duo_photo_test$
declare
  host_data jsonb;
  p2 jsonb;
  p3 jsonb;
  p4 jsonb;
  room uuid;
  host_token text;
  token3 text;
  token4 text;
  photo jsonb;
  path text;
  media_id uuid;
  duo_media_id uuid;
  state jsonb;
begin
  host_data := public.create_duo_room('DuoHost','masculin');
  room := (host_data->>'room_id')::uuid;
  host_token := host_data->>'player_token';
  p2 := public.join_duo_room(room,'DuoSecond','feminin');
  p3 := public.join_duo_room(room,'DuoThird','masculin');
  p4 := public.join_duo_room(room,'DuoFourth','feminin');
  token3 := p3->>'player_token';
  token4 := p4->>'player_token';

  perform public.set_duo_permissions(room,host_token,true,true,false);
  perform public.set_duo_permissions(room,p2->>'player_token',true,true,false);
  perform public.set_duo_permissions(room,token3,true,true,false);
  perform public.set_duo_permissions(room,token4,true,true,false);

  path := room::text || '/' || gen_random_uuid()::text || '.jpg';
  photo := public.qspicy_media_register(room,host_token,'group',path,'image/jpeg',1024);
  media_id := (photo->>'id')::uuid;
  path := room::text || '/' || gen_random_uuid()::text || '.jpg';
  photo := public.qspicy_media_register(room,host_token,'duo',path,'image/jpeg',1024);
  duo_media_id := (photo->>'id')::uuid;

  state := public.qspicy_media_list(room,token3);
  if jsonb_array_length(state->'items') <> 1 then
    raise exception 'DUOS group photo is not visible to a consenting player';
  end if;

  perform public.set_duo_permissions(room,token3,true,false,false);
  perform public.set_duo_permissions(room,token3,true,true,false);
  state := public.qspicy_media_list(room,token3);
  if jsonb_array_length(state->'items') <> 0 then
    raise exception 'DUOS photo access returned after receive_media was re-enabled';
  end if;

  perform public.set_duo_permissions(room,token3,false,true,false);
  state := public.qspicy_media_list(room,token4);
  if jsonb_array_length(state->'items') <> 0 then
    raise exception 'Group photo remained visible while cross participation was withdrawn';
  end if;
  state := public.qspicy_media_list(room,p2->>'player_token');
  if jsonb_array_length(state->'items') <> 1 then
    raise exception 'Own-duo photo was hidden when another player withdrew cross participation';
  end if;
  perform public.set_duo_permissions(room,token3,true,true,false);
  state := public.qspicy_media_list(room,token4);
  if jsonb_array_length(state->'items') <> 1 then
    raise exception 'Other consenting group recipients lost their access permanently';
  end if;
  state := public.qspicy_media_list(room,p2->>'player_token');
  if jsonb_array_length(state->'items') <> 2 then
    raise exception 'Revoking cross participation incorrectly removed the own-duo photo';
  end if;

  perform public.qspicy_media_delete(room,host_token,media_id);
  perform public.qspicy_media_delete(room,host_token,duo_media_id);
end
$duo_photo_test$;
