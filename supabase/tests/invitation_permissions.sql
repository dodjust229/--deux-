-- QSPICY — recette des permissions RPC et du dispatcher d'invitation.
-- Vérifie que l'API de jeu est bien anonyme, que `join_room_any` route correctement
-- Couple / Personnalisé / DUOS, et que le type de salon est porté par la salle.
-- À exécuter sur une base construite uniquement à partir des migrations du dépôt.
do $qspicy$
declare
  v_couple jsonb;
  v_duos jsonb;
  v_guest jsonb;
  v_kind text;
  v_deck jsonb;
  v_room uuid;
  v_token text;
  v_ok boolean;
begin
  -- ===== 1. Privilèges : anon oui, authenticated non =====
  if not has_function_privilege('anon', 'public.join_room_any(uuid,text,text)', 'execute') then
    raise exception 'join_room_any doit être exécutable par anon';
  end if;
  if has_function_privilege('authenticated', 'public.join_room_any(uuid,text,text)', 'execute') then
    raise exception 'join_room_any ne doit PAS être exécutable par authenticated';
  end if;
  if not has_function_privilege('anon', 'public.get_custom_deck(uuid,text)', 'execute') then
    raise exception 'get_custom_deck doit être exécutable par anon';
  end if;
  if has_function_privilege('authenticated', 'public.get_custom_deck(uuid,text)', 'execute') then
    raise exception 'get_custom_deck ne doit PAS être exécutable par authenticated';
  end if;
  if not has_function_privilege('anon', 'public.set_room_kind(uuid,text,text)', 'execute') then
    raise exception 'set_room_kind doit être exécutable par anon';
  end if;
  if has_function_privilege('authenticated', 'public.set_room_kind(uuid,text,text)', 'execute') then
    raise exception 'set_room_kind ne doit PAS être exécutable par authenticated';
  end if;
  -- Les tables restent fermées aux rôles clients.
  if has_table_privilege('anon', 'public.rooms', 'select') then
    raise exception 'anon ne doit pas lire public.rooms directement';
  end if;

  -- ===== 2. join_room_any route un salon Couple =====
  v_couple := public.create_room('HoteCouple', 'masculin');
  v_room := (v_couple->>'room_id')::uuid;
  v_guest := public.join_room_any(v_room, 'InviteCouple', 'feminin');
  if v_guest->>'room_id' is null then
    raise exception 'join_room_any n''a pas renvoyé de salon pour un salon Couple';
  end if;
  if coalesce(v_guest->>'room_kind', '') <> 'couple' then
    raise exception 'join_room_any doit annoncer room_kind=couple (reçu %)', v_guest->>'room_kind';
  end if;

  -- ===== 3. join_room_any route un salon DUOS =====
  v_duos := public.create_duo_room('HoteDuos', 'masculin');
  v_room := (v_duos->>'room_id')::uuid;
  v_guest := public.join_room_any(v_room, 'InviteDuos', 'feminin');
  if coalesce(v_guest->>'room_kind', '') <> 'duos' then
    raise exception 'join_room_any doit annoncer room_kind=duos (reçu %)', v_guest->>'room_kind';
  end if;
  if coalesce(v_guest->>'mode', '') <> 'duos' then
    raise exception 'join_room_any doit conserver mode=duos';
  end if;

  -- ===== 4. Le type de salon est porté par la salle =====
  v_couple := public.create_room('HoteCustom', 'masculin');
  v_room := (v_couple->>'room_id')::uuid;
  v_token := v_couple->>'player_token';
  perform public.set_room_kind(v_room, v_token, 'custom');
  select room_kind into v_kind from public.rooms where id = v_room;
  if v_kind <> 'custom' then
    raise exception 'set_room_kind n''a pas enregistré le type Personnalisé (reçu %)', v_kind;
  end if;
  -- Un invité qui rejoint reçoit le type du salon, même sans paramètre de lien.
  v_guest := public.join_room_any(v_room, 'InviteCustom', 'feminin');
  if coalesce(v_guest->>'room_kind', '') <> 'custom' then
    raise exception 'un invité doit recevoir room_kind=custom (reçu %)', v_guest->>'room_kind';
  end if;

  -- ===== 5. Une salle legacy sans type conserve le fallback du lien =====
  v_couple := public.create_room('HoteLegacy', 'masculin');
  v_room := (v_couple->>'room_id')::uuid;
  v_token := v_couple->>'player_token';
  update public.rooms set room_kind = null where id = v_room;
  v_guest := public.join_room_any(v_room, 'InviteLegacy', 'feminin');
  if v_guest ? 'room_kind' and v_guest->>'room_kind' is not null then
    raise exception 'une salle legacy sans type explicite doit conserver room_kind=NULL (reçu %)', v_guest->>'room_kind';
  end if;

  -- ===== 6. Un invité ne peut pas changer le type du salon =====
  v_ok := false;
  begin
    perform public.set_room_kind(v_room, v_guest->>'player_token', 'couple');
  exception when others then
    v_ok := true;
  end;
  if not v_ok then
    raise exception 'un invité ne doit pas pouvoir changer le type du salon';
  end if;

  -- ===== 7. get_custom_deck renvoie la séquence du moteur catalogue =====
  -- (le salon Personnalisé est encore en attente : la séquence est vide, mais l'appel doit
  --  répondre sans erreur et renvoyer un tableau JSON.)
  v_deck := public.get_custom_deck(v_room, v_token);
  if jsonb_typeof(v_deck) <> 'array' then
    raise exception 'get_custom_deck doit renvoyer un tableau JSON (reçu %)', jsonb_typeof(v_deck);
  end if;

  raise notice 'INVITATION PERMISSIONS OK';
end
$qspicy$;

select 'INVITATION PERMISSIONS OK' as resultat;
