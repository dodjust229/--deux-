-- Régression : commentaires et réactions privées du mode Personnalisé.
DO $custom_chat_test$
DECLARE
  v_room_id uuid;
  v_normal_room_id uuid;
  v_token_a text := repeat('a',64);
  v_token_b text := repeat('b',64);
  v_message_id uuid;
  v_snapshot_a jsonb;
  v_snapshot_b jsonb;
  v_body text := 'Ta réponse me fait sourire ❤️';
BEGIN
  INSERT INTO public.rooms(mode,room_kind,status,current_index,interaction_ids,selected_level)
  VALUES ('couple','custom','playing',0,ARRAY['p03'],3)
  RETURNING id INTO v_room_id;

  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (v_room_id,1,'Partenaire A','masculin',encode(extensions.digest(v_token_a,'sha256'),'hex'),true,ARRAY['profondeur']),
    (v_room_id,2,'Partenaire B','feminin',encode(extensions.digest(v_token_b,'sha256'),'hex'),true,ARRAY['profondeur']);

  BEGIN
    PERFORM public.send_custom_partner_message(v_room_id,v_token_a,v_body);
    RAISE EXCEPTION 'Un message avant révélation aurait dû être refusé';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'E_STATE:%' THEN RAISE; END IF;
  END;

  PERFORM public.submit_answer(v_room_id,v_token_a,(SELECT options->>0 FROM public.catalog WHERE id='p03'),false);
  PERFORM public.submit_answer(v_room_id,v_token_b,(SELECT options->>1 FROM public.catalog WHERE id='p03'),false);

  v_message_id := public.send_custom_partner_message(v_room_id,v_token_a,v_body);
  IF v_message_id IS NULL THEN
    RAISE EXCEPTION 'Le message privé n''a pas été créé';
  END IF;

  v_snapshot_a := public.get_room_snapshot(v_room_id,v_token_a);
  v_snapshot_b := public.get_room_snapshot(v_room_id,v_token_b);

  IF jsonb_array_length(v_snapshot_a->'partner_messages') <> 1
     OR jsonb_array_length(v_snapshot_b->'partner_messages') <> 1 THEN
    RAISE EXCEPTION 'Le message doit être visible aux deux partenaires';
  END IF;
  IF v_snapshot_a->'partner_messages'->0->>'body' <> v_body
     OR v_snapshot_b->'partner_messages'->0->>'sender_player_id' IS NULL THEN
    RAISE EXCEPTION 'Le contenu ou l''auteur du message n''est pas correctement renvoyé';
  END IF;
  IF v_snapshot_a->'interaction_options' IS DISTINCT FROM
     (SELECT options FROM public.catalog WHERE id='p03') THEN
    RAISE EXCEPTION 'La migration de chat a écrasé les options QCM canoniques';
  END IF;

  BEGIN
    PERFORM public.send_custom_partner_message(v_room_id,v_token_a,'   ');
    RAISE EXCEPTION 'Un commentaire vide aurait dû être refusé';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'E_MESSAGE:%' THEN RAISE; END IF;
  END;

  INSERT INTO public.rooms(mode,room_kind,status,current_index,interaction_ids,selected_level)
  VALUES ('couple','couple','playing',0,ARRAY['p03'],3)
  RETURNING id INTO v_normal_room_id;

  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (v_normal_room_id,1,'Couple A','masculin',encode(extensions.digest(repeat('c',64),'sha256'),'hex'),true,ARRAY['profondeur']),
    (v_normal_room_id,2,'Couple B','feminin',encode(extensions.digest(repeat('d',64),'sha256'),'hex'),true,ARRAY['profondeur']);

  IF jsonb_array_length(public.get_room_snapshot(v_normal_room_id,repeat('c',64))->'partner_messages') <> 0 THEN
    RAISE EXCEPTION 'Les messages Personnalisé ne doivent pas apparaître dans À Deux standard';
  END IF;

  BEGIN
    PERFORM public.send_custom_partner_message(v_normal_room_id,repeat('c',64),'Message interdit');
    RAISE EXCEPTION 'La messagerie aurait dû être refusée dans À Deux standard';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE 'E_MODE:%' THEN RAISE; END IF;
  END;

  DELETE FROM public.rooms WHERE id IN (v_room_id,v_normal_room_id);
  RAISE NOTICE 'CUSTOM PARTNER EXCHANGE OK';
END
$custom_chat_test$;

SELECT 'CUSTOM PARTNER EXCHANGE OK' AS resultat;
