-- QSPICY Palier 5 — partage volontaire de photos personnelles depuis la galerie.
-- Les fichiers restent dans un bucket privé ; seul le serveur signe les accès.
alter table public.duo_permissions
  add column if not exists receive_media boolean not null default false;

create table if not exists public.room_media (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_player_id uuid not null references public.players(id) on delete cascade,
  recipient_player_ids uuid[] not null,
  scope text not null check (scope in ('partner','duo','group')),
  object_path text not null unique,
  mime_type text not null check (mime_type = 'image/jpeg'),
  byte_size integer not null check (byte_size between 1 and 5242880),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours')
);

create index if not exists room_media_room_created_idx
  on public.room_media(room_id, created_at desc);
create index if not exists room_media_expiry_idx
  on public.room_media(expires_at);

alter table public.room_media enable row level security;
revoke all on public.room_media from public, anon, authenticated;
grant select, delete on public.room_media to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qspicy-private-media','qspicy-private-media',false,5242880,
        array['image/jpeg'])
on conflict (id) do update
set public=false, file_size_limit=5242880,
    allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create or replace function public.set_room_media_permission(
  p_room_id uuid,
  p_player_token text,
  p_receive_media boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare me public.players;
begin
  me := public._player_for(p_room_id,p_player_token);
  if (select mode from public.rooms where id=p_room_id) <> 'couple' then
    raise exception 'E_MODE: Cette autorisation est gérée par les réglages DUOS.';
  end if;
  insert into public.duo_permissions(player_id,receive_media,updated_at)
  values (me.id,coalesce(p_receive_media,false),now())
  on conflict (player_id) do update
    set receive_media=excluded.receive_media, updated_at=now();
  if not coalesce(p_receive_media,false) then
    update public.room_media
       set recipient_player_ids=array_remove(recipient_player_ids,me.id)
     where room_id=p_room_id and me.id=any(recipient_player_ids);
  end if;
  return true;
end
$$;

-- La révocation d'une permission DUOS retire aussi l'accès aux photos déjà reçues.
create or replace function public.set_duo_permissions(
  p_room_id uuid,
  p_player_token text,
  p_cross_participation boolean,
  p_receive_media boolean,
  p_share_answers boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $
declare me public.players;
begin
  me := public._player_for(p_room_id,p_player_token);
  if (select mode from public.rooms where id=p_room_id) <> 'duos' then
    raise exception 'E_MODE: Salon non DUOS.';
  end if;
  insert into public.duo_permissions(player_id,cross_participation,receive_media,share_answers,updated_at)
  values (me.id,coalesce(p_cross_participation,false),coalesce(p_receive_media,false),coalesce(p_share_answers,false),now())
  on conflict (player_id) do update set
    cross_participation=excluded.cross_participation,
    receive_media=excluded.receive_media,
    share_answers=excluded.share_answers,
    updated_at=now();
  if not coalesce(p_cross_participation,false) or not coalesce(p_receive_media,false) then
    update public.room_media
       set recipient_player_ids=array_remove(recipient_player_ids,me.id)
     where room_id=p_room_id and me.id=any(recipient_player_ids);
  end if;
  return true;
end
$;

create or replace function public.qspicy_media_targets(
  p_room_id uuid,
  p_player_token text,
  p_scope text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  me public.players;
  r public.rooms;
  v_recipients uuid[];
  v_all_cross boolean;
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id;
  if r.status='finished' then raise exception 'E_MEDIA_CLOSED: La partie est terminée.'; end if;
  if p_scope is null or p_scope not in ('partner','duo','group') then raise exception 'E_MEDIA_SCOPE: Destination invalide.'; end if;

  if r.mode='couple' then
    if p_scope<>'partner' then raise exception 'E_MEDIA_SCOPE: Destination invalide pour ce salon.'; end if;
    select array_agg(p.id order by p.seat) into v_recipients
      from public.players p
     where p.room_id=p_room_id and p.status='active' and p.id<>me.id;
  else
    if p_scope='partner' then raise exception 'E_MEDIA_SCOPE: Destination invalide pour DUOS.'; end if;
    if p_scope='duo' then
      select array_agg(p.id order by p.seat) into v_recipients
        from public.players p
       where p.room_id=p_room_id and p.status='active'
         and p.duo_no=me.duo_no and p.id<>me.id;
    else
      select count(*)=4 and bool_and(coalesce(dp.cross_participation,false))
        into v_all_cross
        from public.players p left join public.duo_permissions dp on dp.player_id=p.id
       where p.room_id=p_room_id and p.status='active';
      if not coalesce(v_all_cross,false) then
        raise exception 'E_MEDIA_CONSENT: Les quatre joueurs doivent autoriser l’espace commun.';
      end if;
      select array_agg(p.id order by p.seat) into v_recipients
        from public.players p
       where p.room_id=p_room_id and p.status='active' and p.id<>me.id;
    end if;
  end if;

  if coalesce(cardinality(v_recipients),0)=0 then
    raise exception 'E_MEDIA_RECIPIENT: Aucun destinataire disponible.';
  end if;
  if exists (
    select 1 from public.players p
    left join public.duo_permissions dp on dp.player_id=p.id
    where p.id=any(v_recipients) and not coalesce(dp.receive_media,false)
  ) then
    raise exception 'E_MEDIA_CONSENT: Au moins un destinataire n’accepte pas les photos.';
  end if;

  return jsonb_build_object('sender_id',me.id,'scope',p_scope,'recipient_ids',to_jsonb(v_recipients),'room_mode',r.mode);
end
$$;

create or replace function public.qspicy_media_register(
  p_room_id uuid,
  p_player_token text,
  p_scope text,
  p_object_path text,
  p_mime_type text,
  p_byte_size integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  targets jsonb;
  v_sender uuid;
  v_recipients uuid[];
  v_id uuid;
begin
  targets := public.qspicy_media_targets(p_room_id,p_player_token,p_scope);
  v_sender := (targets->>'sender_id')::uuid;
  select array_agg(value::uuid) into v_recipients
    from jsonb_array_elements_text(targets->'recipient_ids');
  if p_object_path is null or p_object_path not like p_room_id::text || '/%'
     or p_object_path !~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.(jpg|png|webp)$' then
    raise exception 'E_MEDIA_PATH: Chemin de fichier invalide.';
  end if;
  if p_mime_type is distinct from 'image/jpeg'
     or p_byte_size is null or p_byte_size not between 1 and 5242880 then
    raise exception 'E_MEDIA_FILE: Fichier non autorisé ou trop volumineux.';
  end if;
  if (select count(*) from public.room_media where room_id=p_room_id and expires_at>now()) >= 20 then
    raise exception 'E_MEDIA_LIMIT: Cette salle a atteint sa limite temporaire de photos.';
  end if;
  if (select count(*) from public.room_media where room_id=p_room_id and sender_player_id=v_sender and expires_at>now()) >= 8 then
    raise exception 'E_MEDIA_LIMIT: Tu as atteint ta limite temporaire de photos.';
  end if;
  perform public._rate_check('room-photo:'||v_sender::text,8,interval '1 minute');
  insert into public.room_media(room_id,sender_player_id,recipient_player_ids,scope,object_path,mime_type,byte_size)
  values(p_room_id,v_sender,v_recipients,p_scope,p_object_path,p_mime_type,p_byte_size)
  returning id into v_id;
  update public.rooms set last_activity=now() where id=p_room_id;
  return jsonb_build_object('id',v_id,'created_at',now(),'expires_at',now()+interval '6 hours');
end
$$;

create or replace function public.qspicy_media_list(
  p_room_id uuid,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  me public.players;
  r public.rooms;
  v_items jsonb;
  v_players jsonb;
  v_receive boolean;
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id;
  select coalesce(dp.receive_media,false) into v_receive
    from public.duo_permissions dp where dp.player_id=me.id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'nickname',p.nickname,'seat',p.seat,'duo_no',p.duo_no,
    'receive_media',coalesce(dp.receive_media,false),
    'cross_participation',coalesce(dp.cross_participation,false)
  ) order by p.seat),'[]'::jsonb)
  into v_players
  from public.players p left join public.duo_permissions dp on dp.player_id=p.id
  where p.room_id=p_room_id and p.status='active';

  if r.status='finished' then
    v_items := '[]'::jsonb;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',m.id,'sender_player_id',m.sender_player_id,'scope',m.scope,
      'object_path',m.object_path,'mime_type',m.mime_type,
      'byte_size',m.byte_size,'created_at',m.created_at,'expires_at',m.expires_at
    ) order by m.created_at),'[]'::jsonb)
    into v_items
    from public.room_media m
    where m.room_id=p_room_id and m.expires_at>now()
      and (m.sender_player_id=me.id or me.id=any(m.recipient_player_ids))
      and (
        m.sender_player_id=me.id
        or coalesce(v_receive,false)
      )
      and (
        m.scope<>'group'
        or (
          select count(*)=4
            and bool_and(coalesce(dp.cross_participation,false))
            and bool_and(p.id=m.sender_player_id or coalesce(dp.receive_media,false))
          from public.players p left join public.duo_permissions dp on dp.player_id=p.id
          where p.room_id=p_room_id and p.status='active'
        )
      )
      and (
        m.scope<>'duo'
        or r.mode<>'duos'
        or exists (
          select 1 from public.players sender
          where sender.id=m.sender_player_id and sender.duo_no=me.duo_no
        )
      );
  end if;

  return jsonb_build_object('my_receive_media',coalesce(v_receive,false),'players',v_players,'items',v_items,'room_status',r.status);
end
$$;

create or replace function public.qspicy_media_delete_path(
  p_room_id uuid,
  p_player_token text,
  p_media_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $
declare me public.players; v_path text;
begin
  me := public._player_for(p_room_id,p_player_token);
  select object_path into v_path
    from public.room_media
   where id=p_media_id and room_id=p_room_id and sender_player_id=me.id;
  if v_path is null then raise exception 'E_MEDIA_DELETE: Photo introuvable ou suppression non autorisée.'; end if;
  return v_path;
end
$;

create or replace function public.qspicy_media_delete(
  p_room_id uuid,
  p_player_token text,
  p_media_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare me public.players; v_path text;
begin
  me := public._player_for(p_room_id,p_player_token);
  delete from public.room_media
   where id=p_media_id and room_id=p_room_id and sender_player_id=me.id
   returning object_path into v_path;
  if v_path is null then raise exception 'E_MEDIA_DELETE: Photo introuvable ou suppression non autorisée.'; end if;
  return v_path;
end
$$;

revoke execute on function public.set_room_media_permission(uuid,text,boolean) from public, authenticated;
revoke execute on function public.set_duo_permissions(uuid,text,boolean,boolean,boolean) from public, authenticated;
revoke execute on function public.qspicy_media_targets(uuid,text,text) from public, authenticated;
revoke execute on function public.qspicy_media_register(uuid,text,text,text,text,integer) from public, authenticated;
revoke execute on function public.qspicy_media_list(uuid,text) from public, authenticated;
revoke execute on function public.qspicy_media_delete(uuid,text,uuid) from public, authenticated;
revoke execute on function public.qspicy_media_delete_path(uuid,text,uuid) from public, authenticated;
grant execute on function public.set_room_media_permission(uuid,text,boolean) to anon, service_role;
grant execute on function public.set_duo_permissions(uuid,text,boolean,boolean,boolean) to anon;
grant execute on function public.qspicy_media_targets(uuid,text,text) to service_role;
grant execute on function public.qspicy_media_register(uuid,text,text,text,text,integer) to service_role;
grant execute on function public.qspicy_media_list(uuid,text) to service_role;
grant execute on function public.qspicy_media_delete(uuid,text,uuid) to service_role;
grant execute on function public.qspicy_media_delete_path(uuid,text,uuid) to service_role;
