-- Test d’intégration du moteur de niveaux et de la révocation du consentement.
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
BEGIN
  INSERT INTO public.rooms(status,selected_level) VALUES ('waiting',4) RETURNING id INTO room_couple;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (room_couple,1,'Test A','masculin',encode(digest(token_a,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction','audacieux']),
    (room_couple,2,'Test B','feminin',encode(digest(token_b,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction','audacieux']);
  SELECT public.start_game_by_level(room_couple,token_a,4) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Couple level 4 did not start'; END IF;
  SELECT count(*) INTO bad_count
    FROM unnest((SELECT interaction_ids FROM public.rooms WHERE id=room_couple)) q(id)
    JOIN public.catalog c ON c.id=q.id WHERE c.level<>4;
  IF bad_count<>0 THEN RAISE EXCEPTION 'Couple game contains cards from another level'; END IF;
  PERFORM public.set_adult_consent(room_couple,token_a,false);
  SELECT status INTO final_status FROM public.rooms WHERE id=room_couple;
  IF final_status<>'finished' THEN RAISE EXCEPTION 'Couple game did not stop after consent revocation'; END IF;
  DELETE FROM public.rooms WHERE id=room_couple;

  INSERT INTO public.rooms(mode,status,selected_level) VALUES ('duos','waiting',4) RETURNING id INTO room_duos;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories,duo_no)
  VALUES
    (room_duos,1,'Test A','masculin',encode(digest(token_a,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction','audacieux'],1),
    (room_duos,2,'Test B','feminin',encode(digest(token_b,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction','audacieux'],1),
    (room_duos,3,'Test C','masculin',encode(digest(token_c,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction','audacieux'],2),
    (room_duos,4,'Test D','feminin',encode(digest(token_d,'sha256'),'hex'),true,ARRAY['decouverte','complicite','profondeur','seduction','audacieux'],2);
  SELECT public.start_duo_game_by_level(room_duos,token_a,4) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'DUOS level 4 did not start'; END IF;
  SELECT count(*) INTO bad_count
    FROM unnest((SELECT interaction_ids FROM public.rooms WHERE id=room_duos)) q(id)
    JOIN public.catalog c ON c.id=q.id WHERE c.level<>4;
  IF bad_count<>0 THEN RAISE EXCEPTION 'DUOS game contains cards from another level'; END IF;
  PERFORM public.set_adult_consent(room_duos,token_c,false);
  SELECT status INTO final_status FROM public.rooms WHERE id=room_duos;
  IF final_status<>'finished' THEN RAISE EXCEPTION 'DUOS game did not stop after consent revocation'; END IF;
  DELETE FROM public.rooms WHERE id=room_duos;
END
$qspicy$;
