-- Palier 7 — régressions de sécurité, jetons et confidentialité DUOS.
-- Exécuté uniquement sur la base PostgreSQL jetable de la CI.
DO $palier7$
DECLARE
  couple jsonb;
  guest jsonb;
  unrelated jsonb;
  duo_host jsonb;
  duo_two jsonb;
  duo_three jsonb;
  duo_four jsonb;
  couple_room uuid;
  duo_room uuid;
  interaction_id text;
  state jsonb;
  token_a text;
  token_b text;
  token_c text;
  token_d text;
BEGIN
  -- Les tables et RPC internes ne sont jamais accessibles directement au client.
  IF has_table_privilege('anon','public.players','SELECT')
     OR has_table_privilege('anon','public.answers','SELECT')
     OR has_table_privilege('anon','public.room_media','SELECT')
     OR has_table_privilege('anon','public.room_media','INSERT')
     OR has_table_privilege('authenticated','public.room_media','SELECT') THEN
    RAISE EXCEPTION 'Palier 7: accès direct inattendu aux tables privées';
  END IF;
  IF has_function_privilege('anon','public._player_for(uuid,text)','EXECUTE')
     OR has_function_privilege('anon','public.qspicy_media_list(uuid,text)','EXECUTE')
     OR has_function_privilege('anon','public.qspicy_media_register(uuid,text,text,text,text,integer)','EXECUTE')
     OR has_function_privilege('anon','public.qspicy_media_delete(uuid,text,uuid)','EXECUTE')
     OR has_function_privilege('authenticated','public.start_game_by_level(uuid,text,integer)','EXECUTE')
     OR has_function_privilege('authenticated','public.start_duo_game_by_level(uuid,text,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'Palier 7: privilège RPC trop large';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.room_media'::regclass) THEN
    RAISE EXCEPTION 'Palier 7: RLS désactivée sur room_media';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='room_media') THEN
    RAISE EXCEPTION 'Palier 7: room_media ne doit avoir aucune policy client directe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='qspicy-private-media' AND public=false) THEN
    RAISE EXCEPTION 'Palier 7: bucket photo non privé';
  END IF;
  IF NOT has_function_privilege('anon','public.set_room_media_permission(uuid,text,boolean)','EXECUTE')
     OR NOT has_function_privilege('anon','public.set_duo_permissions(uuid,text,boolean,boolean,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Palier 7: RPC de consentement tokenisées indisponibles';
  END IF;

  -- Un jeton ne peut jamais servir à lire une autre salle.
  couple := public.create_room('P7Host','masculin');
  couple_room := (couple->>'room_id')::uuid;
  token_a := couple->>'player_token';
  guest := public.join_room_any(couple_room,'P7Guest','feminin');
  token_b := guest->>'player_token';
  unrelated := public.create_room('P7Other','masculin');
  BEGIN
    PERFORM public.get_room_snapshot(couple_room, unrelated->>'player_token');
    RAISE EXCEPTION 'Palier 7: jeton d’une autre salle accepté';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'E_SESSION:%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.get_room_snapshot(couple_room, repeat('0',64));
    RAISE EXCEPTION 'Palier 7: faux jeton accepté';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'E_SESSION:%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.start_game_by_level(couple_room, token_b, 1);
    RAISE EXCEPTION 'Palier 7: invité autorisé à lancer Couple';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'E_HOST:%' THEN RAISE; END IF;
  END;

  -- DUOS : les réponses restent privées avant révélation et respectent leur audience après.
  duo_host := public.create_duo_room('P7Duo1','masculin');
  duo_room := (duo_host->>'room_id')::uuid;
  token_a := duo_host->>'player_token';
  duo_two := public.join_room_any(duo_room,'P7Duo2','feminin');
  duo_three := public.join_room_any(duo_room,'P7Duo3','masculin');
  duo_four := public.join_room_any(duo_room,'P7Duo4','feminin');
  token_b := duo_two->>'player_token';
  token_c := duo_three->>'player_token';
  token_d := duo_four->>'player_token';
  PERFORM public.set_duo_permissions(duo_room,token_a,true,true,true);
  PERFORM public.set_duo_permissions(duo_room,token_b,true,true,true);
  PERFORM public.set_duo_permissions(duo_room,token_c,true,true,true);
  PERFORM public.set_duo_permissions(duo_room,token_d,true,true,true);
  PERFORM public.start_duo_game_by_level(duo_room,token_a,1);
  state := public.get_duo_snapshot(duo_room,token_a);
  interaction_id := state->>'interaction_id';
  IF interaction_id IS NULL THEN RAISE EXCEPTION 'Palier 7: interaction DUOS absente'; END IF;
  PERFORM public.submit_duo_answer(duo_room,token_a,interaction_id,'réponse privée',false,'private');
  state := public.get_duo_snapshot(duo_room,token_b);
  IF jsonb_array_length(state->'answers') <> 0 OR (state->>'revealed')::boolean THEN
    RAISE EXCEPTION 'Palier 7: fuite de réponse privée avant révélation';
  END IF;
  PERFORM public.submit_duo_answer(duo_room,token_b,interaction_id,'réponse duo',false,'duo');
  PERFORM public.submit_duo_answer(duo_room,token_c,interaction_id,'réponse groupe',false,'group');
  PERFORM public.submit_duo_answer(duo_room,token_d,interaction_id,'',true,'private');
  state := public.get_duo_snapshot(duo_room,token_a);
  IF NOT (state->>'revealed')::boolean OR jsonb_array_length(state->'answers') <> 4 THEN
    RAISE EXCEPTION 'Palier 7: révélation DUOS incomplète pour le duo A';
  END IF;
  state := public.get_duo_snapshot(duo_room,token_c);
  IF jsonb_array_length(state->'answers') <> 2 THEN
    RAISE EXCEPTION 'Palier 7: le joueur du second duo voit une réponse privée ou duo étrangère';
  END IF;
  state := public.get_duo_snapshot(duo_room,token_d);
  IF jsonb_array_length(state->'answers') <> 2 THEN
    RAISE EXCEPTION 'Palier 7: le quatrième joueur voit une réponse hors de son audience';
  END IF;

  -- Le retrait du consentement croisé masque immédiatement les réponses de groupe.
  PERFORM public.set_duo_permissions(duo_room,token_d,false,true,true);
  state := public.get_duo_snapshot(duo_room,token_a);
  IF jsonb_array_length(state->'answers') <> 3 THEN
    RAISE EXCEPTION 'Palier 7: une réponse de groupe reste visible après révocation';
  END IF;
  BEGIN
    PERFORM public.submit_duo_answer(duo_room,token_a,interaction_id,'nouvelle réponse groupe',false,'group');
    RAISE EXCEPTION 'Palier 7: réponse de groupe acceptée sans les quatre accords';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'E_CONSENT:%' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.get_duo_snapshot(duo_room, repeat('f',64));
    RAISE EXCEPTION 'Palier 7: faux jeton DUOS accepté';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'E_SESSION:%' THEN RAISE; END IF;
  END;
END
$palier7$;

SELECT 'PALIER 7 SECURITY REGRESSION OK' AS resultat;