-- QSPICY · Recette — le mode choisi détermine réellement le degré d'explicite.
-- Vérifie les deux causes réelles corrigées par 21_explicit_content_floor.sql :
--   1. le Personnalisé ne déclare plus un palier fixe (2) mais celui du paquet ;
--   2. le plancher d'explicite d'une salle ne recule jamais, et le palier servi
--      ne peut pas être rabaissé sous ce plancher.

DO $explicit$
DECLARE
  room_couple uuid;
  room_custom uuid;
  token_a text := repeat('e',64);
  token_b text := repeat('f',64);
  ok boolean;
  lv integer;
  floor_lv integer;
  deck text[];
  bad integer;
  v_rank integer;
BEGIN
  -- ===== 1. Le catalogue porte un axe d'explicite cohérent =====
  SELECT count(*) INTO bad FROM public.catalog WHERE explicit_rank IS NULL;
  IF bad > 0 THEN RAISE EXCEPTION '% cartes sans explicit_rank', bad; END IF;

  -- Une carte audacieuse de palier 4 est plus explicite qu'une carte de
  -- profondeur de palier 4 : l'axe ne se confond pas avec le palier.
  SELECT explicit_rank INTO v_rank FROM public.catalog WHERE id = 'g01';
  IF v_rank <> 4 THEN RAISE EXCEPTION 'g01 (audacieux, palier 4) attendu rang 4, obtenu %', v_rank; END IF;
  SELECT explicit_rank INTO v_rank FROM public.catalog WHERE id = 'a01';
  IF v_rank <> 4 THEN RAISE EXCEPTION 'a01 (audacieux, palier 3) attendu rang 4, obtenu %', v_rank; END IF;
  SELECT explicit_rank INTO v_rank FROM public.catalog WHERE id = 'p04';
  IF v_rank <> 3 THEN RAISE EXCEPTION 'p04 (profondeur, palier 3) attendu rang 3, obtenu %', v_rank; END IF;

  -- ===== 2. Couple : le plancher monte et ne redescend pas =====
  INSERT INTO public.rooms(mode,status,selected_level) VALUES ('couple','waiting',2) RETURNING id INTO room_couple;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (room_couple,1,'Exp A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,
     ARRAY['profondeur','seduction','audacieux']),
    (room_couple,2,'Exp B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),true,
     ARRAY['profondeur','seduction','audacieux']);

  SELECT public.start_game_by_level(room_couple,token_a,4) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Lancement palier 4 refusé'; END IF;

  SELECT explicit_floor INTO floor_lv FROM public.rooms WHERE id=room_couple;
  IF floor_lv < 4 THEN RAISE EXCEPTION 'Plancher attendu >= 4 après un palier 4, obtenu %', floor_lv; END IF;

  -- Le contenu servi est bien du palier 4, pas un contenu rabaissé.
  SELECT count(*) INTO bad
    FROM public.rooms r, unnest(r.interaction_ids) AS cid
    JOIN public.catalog c ON c.id = cid
   WHERE r.id = room_couple AND c.level <> 4;
  IF bad > 0 THEN RAISE EXCEPTION '% cartes servies hors du palier 4 demandé', bad; END IF;

  -- On termine la partie puis on relance plus bas : le plancher doit tenir.
  UPDATE public.rooms SET status='finished' WHERE id=room_couple;
  SELECT public.restart_game(room_couple,token_a) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Redémarrage refusé'; END IF;

  SELECT public.start_game_by_level(room_couple,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Relance au palier 1 refusée'; END IF;

  SELECT explicit_floor, selected_level INTO floor_lv, lv FROM public.rooms WHERE id=room_couple;
  IF floor_lv < 4 THEN
    RAISE EXCEPTION 'RÉGRESSION : plancher retombé à % après une relance au palier 1', floor_lv;
  END IF;
  IF lv < 4 THEN
    RAISE EXCEPTION 'RÉGRESSION : palier servi retombé à % alors que le plancher est %', lv, floor_lv;
  END IF;

  -- ===== 3. Personnalisé : le palier déclaré est celui du paquet réel =====
  INSERT INTO public.rooms(mode,status,selected_level) VALUES ('couple','waiting',2) RETURNING id INTO room_custom;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (room_custom,1,'Cus A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,
     ARRAY['profondeur','seduction','audacieux']),
    (room_custom,2,'Cus B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),true,
     ARRAY['profondeur','seduction','audacieux']);

  -- Paquet composé uniquement de cartes de palier 4.
  SELECT array_agg(id) INTO deck FROM (
    SELECT id FROM public.catalog WHERE level = 4 ORDER BY id LIMIT 8
  ) picked;
  IF coalesce(cardinality(deck),0) < 5 THEN RAISE EXCEPTION 'Pas assez de cartes palier 4 pour la recette'; END IF;

  SELECT public.start_custom_game(room_custom,token_a,deck) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Lancement Personnalisé refusé'; END IF;

  SELECT selected_level, explicit_floor INTO lv, floor_lv FROM public.rooms WHERE id=room_custom;
  IF lv <> 4 THEN
    RAISE EXCEPTION 'Personnalisé : palier déclaré attendu 4 (paquet réel), obtenu %', lv;
  END IF;
  IF floor_lv < 4 THEN
    RAISE EXCEPTION 'Personnalisé : plancher attendu >= 4, obtenu %', floor_lv;
  END IF;

  -- Le paquet servi est exactement celui demandé : rien n'a été remplacé par
  -- du contenu plus doux.
  SELECT count(*) INTO bad
    FROM public.rooms r
   WHERE r.id = room_custom
     AND NOT (r.interaction_ids @> deck AND deck @> r.interaction_ids);
  IF bad > 0 THEN RAISE EXCEPTION 'Personnalisé : le paquet servi diffère du paquet demandé'; END IF;

  -- ===== 4. Un paquet doux ne relève pas le plancher =====
  -- Le plancher ne monte que sur ce qui est réellement servi : un paquet de
  -- palier 1 dans une salle neuve reste au plancher 1.
  DECLARE
    room_soft uuid;
    soft_deck text[];
  BEGIN
    INSERT INTO public.rooms(mode,status,selected_level) VALUES ('couple','waiting',1) RETURNING id INTO room_soft;
    INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
    VALUES
      (room_soft,1,'Soft A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),false,
       ARRAY['decouverte','complicite']),
      (room_soft,2,'Soft B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),false,
       ARRAY['decouverte','complicite']);

    SELECT array_agg(id) INTO soft_deck FROM (
      SELECT id FROM public.catalog WHERE level = 1 ORDER BY id LIMIT 6
    ) picked;

    SELECT public.start_custom_game(room_soft,token_a,soft_deck) INTO ok;
    IF NOT ok THEN RAISE EXCEPTION 'Lancement Personnalisé doux refusé'; END IF;

    SELECT explicit_floor INTO floor_lv FROM public.rooms WHERE id=room_soft;
    IF floor_lv <> 1 THEN
      RAISE EXCEPTION 'Un paquet de palier 1 ne doit pas relever le plancher (obtenu %)', floor_lv;
    END IF;
  END;

  RAISE NOTICE 'EXPLICIT CONTENT FLOOR OK';
END
$explicit$;
