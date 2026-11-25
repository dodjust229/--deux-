-- Test d’intégration du moteur de niveaux et de la révocation du consentement.
-- Ce test isole les paliers 1–4 sans la catégorie Audacieux, qui force
-- désormais un minimum de palier 3 (règle couverte par level_and_mode_integrity.sql).
DO $qspicy$
DECLARE
  room_couple uuid;
  room_duos uuid;
  token_a text := repeat('a',64);
  token_b text := repeat('b',64);
  token_c text := repeat('c',64);
  token_d text := repeat('d',64);
  ok boolean;
  bad_count integer;
  final_status text;
  level_no integer;
BEGIN
  INSERT INTO public.rooms(status,selected_level) VALUES ('waiting',4) RETURNING id INTO room_couple;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (room_couple,1,'Test A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction']),
    (room_couple,2,'Test B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction']);
  FOR level_no IN 1..4 LOOP
    UPDATE public.rooms SET status='waiting' WHERE id=room_couple;
    SELECT public.start_game_by_level(room_couple,token_a,level_no) INTO ok;
    IF NOT ok THEN RAISE EXCEPTION 'Couple level % did not start', level_no; END IF;
    SELECT count(*) INTO bad_count
      FROM unnest((SELECT interaction_ids FROM public.rooms WHERE id=room_couple)) q(id)
      JOIN public.catalog c ON c.id=q.id WHERE c.level<>level_no;
    IF bad_count<>0 THEN RAISE EXCEPTION 'Couple game contains cards from another level'; END IF;
    IF level_no<4 THEN UPDATE public.rooms SET status='finished' WHERE id=room_couple; END IF;
  END LOOP;
  PERFORM public.set_adult_consent(room_couple,token_a,false);
  SELECT status INTO final_status FROM public.rooms WHERE id=room_couple;
  IF final_status<>'finished' THEN RAISE EXCEPTION 'Couple game did not stop after consent revocation'; END IF;
  DELETE FROM public.rooms WHERE id=room_couple;

  INSERT INTO public.rooms(mode,status,selected_level) VALUES ('duos','waiting',4) RETURNING id INTO room_duos;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories,duo_no)
  VALUES
    (room_duos,1,'Test A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction'],1),
    (room_duos,2,'Test B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction'],1),
    (room_duos,3,'Test C','masculin',encode(extensions.digest(token_c,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction'],2),
    (room_duos,4,'Test D','feminin',encode(extensions.digest(token_d,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction'],2);
  FOR level_no IN 1..4 LOOP
    UPDATE public.rooms SET status='waiting' WHERE id=room_duos;
    SELECT public.start_duo_game_by_level(room_duos,token_a,level_no) INTO ok;
    IF NOT ok THEN RAISE EXCEPTION 'DUOS level % did not start', level_no; END IF;
    SELECT count(*) INTO bad_count
      FROM unnest((SELECT interaction_ids FROM public.rooms WHERE id=room_duos)) q(id)
      JOIN public.catalog c ON c.id=q.id WHERE c.level<>level_no;
    IF bad_count<>0 THEN RAISE EXCEPTION 'DUOS game contains cards from another level'; END IF;
    IF level_no<4 THEN UPDATE public.rooms SET status='finished' WHERE id=room_duos; END IF;
  END LOOP;
  PERFORM public.set_adult_consent(room_duos,token_c,false);
  SELECT status INTO final_status FROM public.rooms WHERE id=room_duos;
  IF final_status<>'finished' THEN RAISE EXCEPTION 'DUOS game did not stop after consent revocation'; END IF;
  DELETE FROM public.rooms WHERE id=room_duos;
END
$qspicy$;


-- Palier 2 : les cartes déjà jouées sont exclues au lancement suivant,
-- et le cycle ne repart qu'après épuisement du pool éligible.
DO $history$
DECLARE
  room_couple uuid;
  room_duos uuid;
  token_a text := repeat('a',64);
  token_b text := repeat('b',64);
  token_c text := repeat('c',64);
  token_d text := repeat('d',64);
  first_ids text[];
  second_ids text[];
  third_ids text[];
  ok boolean;
  overlap_count integer;
  remaining_count integer;
BEGIN
  INSERT INTO public.catalog(id,category,kind,options,level)
  VALUES
    ('t98','decouverte','free',null,1),
    ('t99','decouverte','free',null,1)
  ON CONFLICT (id) DO UPDATE SET category=excluded.category,kind=excluded.kind,options=excluded.options,level=excluded.level;
  SELECT count(*) INTO remaining_count FROM public.catalog WHERE category IN ('decouverte','complicite') AND level=1;

  INSERT INTO public.rooms(status,selected_level) VALUES ('waiting',1) RETURNING id INTO room_couple;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (room_couple,1,'History A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,ARRAY['decouverte','complicite']),
    (room_couple,2,'History B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),true,ARRAY['decouverte','complicite']);

  SELECT public.start_game_by_level(room_couple,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Couple history first session did not start'; END IF;
  SELECT interaction_ids INTO first_ids FROM public.rooms WHERE id=room_couple;
  UPDATE public.rooms SET status='finished' WHERE id=room_couple;
  PERFORM public.restart_game(room_couple,token_a);
  SELECT public.start_game_by_level(room_couple,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Couple history second session did not start'; END IF;
  SELECT interaction_ids INTO second_ids FROM public.rooms WHERE id=room_couple;
  SELECT count(*) INTO overlap_count FROM unnest(second_ids) x WHERE x=ANY(first_ids);
  IF overlap_count<>0 THEN RAISE EXCEPTION 'Couple history repeated % cards before pool exhaustion', overlap_count; END IF;
  IF cardinality(second_ids)<>24 THEN RAISE EXCEPTION 'Couple history expected 24 fresh cards in session two, got %', cardinality(second_ids); END IF;
  UPDATE public.rooms SET status='finished' WHERE id=room_couple;
  PERFORM public.restart_game(room_couple,token_a);
  SELECT public.start_game_by_level(room_couple,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Couple history third session did not start'; END IF;
  SELECT interaction_ids INTO third_ids FROM public.rooms WHERE id=room_couple;
  SELECT count(*) INTO overlap_count FROM unnest(third_ids) x WHERE x=ANY(first_ids) OR x=ANY(second_ids);
  IF overlap_count<>0 THEN RAISE EXCEPTION 'Couple history repeated % cards in the final pool before reset', overlap_count; END IF;
  IF cardinality(third_ids)<>remaining_count-48 THEN RAISE EXCEPTION 'Couple history expected % final unused cards, got %', remaining_count-48, cardinality(third_ids); END IF;
  UPDATE public.rooms SET status='finished' WHERE id=room_couple;
  PERFORM public.restart_game(room_couple,token_a);
  SELECT public.start_game_by_level(room_couple,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Couple history cycle reset did not start'; END IF;
  IF (SELECT cardinality(played_interaction_ids) FROM public.rooms WHERE id=room_couple)<>24 THEN
    RAISE EXCEPTION 'Couple history did not reset cleanly after pool exhaustion';
  END IF;
  DELETE FROM public.rooms WHERE id=room_couple;

  INSERT INTO public.rooms(mode,status,selected_level) VALUES ('duos','waiting',1) RETURNING id INTO room_duos;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories,duo_no)
  VALUES
    (room_duos,1,'History A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,ARRAY['decouverte','complicite'],1),
    (room_duos,2,'History B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),true,ARRAY['decouverte','complicite'],1),
    (room_duos,3,'History C','masculin',encode(extensions.digest(token_c,'sha256'),'hex'),true,ARRAY['decouverte','complicite'],2),
    (room_duos,4,'History D','feminin',encode(extensions.digest(token_d,'sha256'),'hex'),true,ARRAY['decouverte','complicite'],2);

  SELECT public.start_duo_game_by_level(room_duos,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'DUOS history first session did not start'; END IF;
  SELECT interaction_ids INTO first_ids FROM public.rooms WHERE id=room_duos;
  UPDATE public.rooms SET status='finished' WHERE id=room_duos;
  PERFORM public.restart_duo_game(room_duos,token_a);
  PERFORM public.restart_duo_game(room_duos,token_b);
  PERFORM public.restart_duo_game(room_duos,token_c);
  PERFORM public.restart_duo_game(room_duos,token_d);
  SELECT public.start_duo_game_by_level(room_duos,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'DUOS history second session did not start'; END IF;
  SELECT interaction_ids INTO second_ids FROM public.rooms WHERE id=room_duos;
  SELECT count(*) INTO overlap_count FROM unnest(second_ids) x WHERE x=ANY(first_ids);
  IF overlap_count<>0 THEN RAISE EXCEPTION 'DUOS history repeated % cards before pool exhaustion', overlap_count; END IF;
  IF cardinality(second_ids)<>24 THEN RAISE EXCEPTION 'DUOS history expected 24 fresh cards in session two, got %', cardinality(second_ids); END IF;
  UPDATE public.rooms SET status='finished' WHERE id=room_duos;
  PERFORM public.restart_duo_game(room_duos,token_a);
  PERFORM public.restart_duo_game(room_duos,token_b);
  PERFORM public.restart_duo_game(room_duos,token_c);
  PERFORM public.restart_duo_game(room_duos,token_d);
  SELECT public.start_duo_game_by_level(room_duos,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'DUOS history third session did not start'; END IF;
  SELECT interaction_ids INTO third_ids FROM public.rooms WHERE id=room_duos;
  SELECT count(*) INTO overlap_count FROM unnest(third_ids) x WHERE x=ANY(first_ids) OR x=ANY(second_ids);
  IF overlap_count<>0 THEN RAISE EXCEPTION 'DUOS history repeated % cards in the final pool before reset', overlap_count; END IF;
  IF cardinality(third_ids)<>remaining_count-48 THEN RAISE EXCEPTION 'DUOS history expected % final unused cards, got %', remaining_count-48, cardinality(third_ids); END IF;
  UPDATE public.rooms SET status='finished' WHERE id=room_duos;
  PERFORM public.restart_duo_game(room_duos,token_a);
  PERFORM public.restart_duo_game(room_duos,token_b);
  PERFORM public.restart_duo_game(room_duos,token_c);
  PERFORM public.restart_duo_game(room_duos,token_d);
  SELECT public.start_duo_game_by_level(room_duos,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'DUOS history cycle reset did not start'; END IF;
  IF (SELECT cardinality(played_interaction_ids) FROM public.rooms WHERE id=room_duos)<>24 THEN
    RAISE EXCEPTION 'DUOS history did not reset cleanly after pool exhaustion';
  END IF;
  DELETE FROM public.rooms WHERE id=room_duos;
  DELETE FROM public.catalog WHERE id IN ('t98','t99');
END
$history$;
