-- Régression QCM : les options affichées au joueur viennent du même catalogue
-- que submit_answer utilise pour valider la réponse.
DO $qcm$
DECLARE
  room_id uuid;
  token_a text := repeat('q',64);
  v_option text;
  v_snapshot jsonb;
  v_count integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.catalog WHERE id='p03' AND kind='secret' AND jsonb_array_length(options)=4) THEN
    RAISE EXCEPTION 'La carte QCM p03 doit exister avec quatre options';
  END IF;

  INSERT INTO public.rooms(mode,status,current_index,interaction_ids,selected_level)
  VALUES ('couple','playing',0,ARRAY['p03'],3)
  RETURNING id INTO room_id;

  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES (room_id,1,'QCM test','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,ARRAY['profondeur']);

  v_snapshot := public.get_room_snapshot(room_id,token_a);
  IF v_snapshot->'interaction_options' IS DISTINCT FROM
     (SELECT options FROM public.catalog WHERE id='p03') THEN
    RAISE EXCEPTION 'Le snapshot ne renvoie pas les options QCM canoniques de public.catalog';
  END IF;

  FOR v_option IN
    SELECT jsonb_array_elements_text(options) FROM public.catalog WHERE id='p03'
  LOOP
    PERFORM public.submit_answer(room_id,token_a,v_option,false);
    DELETE FROM public.answers WHERE room_id=room_id;
    v_count := v_count + 1;
  END LOOP;

  IF v_count <> 4 THEN
    RAISE EXCEPTION 'Quatre options QCM devaient être acceptées, seulement % testées', v_count;
  END IF;

  DELETE FROM public.rooms WHERE id=room_id;
  RAISE NOTICE 'QCM OPTIONS FROM SERVER OK';
END
$qcm$;

SELECT 'QCM OPTIONS FROM SERVER OK' AS resultat;
