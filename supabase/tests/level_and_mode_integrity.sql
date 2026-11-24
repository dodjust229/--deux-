-- QSPICY · Recette des trois défauts constatés en jouant.
-- 1. Le palier de session ne recule jamais.
-- 2. Choisir « audacieux » sert réellement des cartes (plus de « pas d'option »).
-- 3. L'intensité choisie n'est pas rabaissée par le système.

DO $levels$
DECLARE
  room_couple uuid;
  token_a text := repeat('a',64);
  token_b text := repeat('b',64);
  ok boolean;
  lv integer;
  prev integer;
  bad integer;
  i integer;
  v_ids text[];
BEGIN
  -- ===== 1. Palier non décroissant, y compris en mode Personnalisé =====
  INSERT INTO public.rooms(mode,status,selected_level) VALUES ('couple','waiting',2) RETURNING id INTO room_couple;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (room_couple,1,'Lvl A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,
     ARRAY['decouverte','complicite','profondeur','seduction','audacieux']),
    (room_couple,2,'Lvl B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),true,
     ARRAY['decouverte','complicite','profondeur','seduction','audacieux']);

  SELECT public.start_game_by_level(room_couple,token_a,4) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Le lancement au palier 4 a échoué'; END IF;
  SELECT current_level INTO prev FROM public.rooms WHERE id=room_couple;
  IF prev <> 4 THEN RAISE EXCEPTION 'Palier de session attendu 4, obtenu %', prev; END IF;

  -- On parcourt toute la partie : le palier ne doit jamais redescendre.
  FOR i IN 1..30 LOOP
    SELECT current_level INTO lv FROM public.rooms WHERE id=room_couple;
    IF lv < prev THEN
      RAISE EXCEPTION 'RÉGRESSION : palier passé de % à % à l''étape %', prev, lv, i;
    END IF;
    prev := lv;
    UPDATE public.rooms SET current_index = LEAST(current_index + 1, cardinality(interaction_ids) - 1)
     WHERE id=room_couple AND status='playing';
    EXIT WHEN (SELECT status FROM public.rooms WHERE id=room_couple) <> 'playing';
  END LOOP;

  -- Le palier reste 4 même quand la partie est terminée (plus aucune carte active).
  UPDATE public.rooms SET status='finished' WHERE id=room_couple;
  SELECT current_level INTO lv FROM public.rooms WHERE id=room_couple;
  IF lv <> 4 THEN RAISE EXCEPTION 'Le palier est retombé à % après la fin de partie', lv; END IF;

  -- Et il est bien exposé au client.
  IF (public.get_room_snapshot(room_couple,token_a)->'room'->>'level')::int <> 4 THEN
    RAISE EXCEPTION 'Le snapshot n''expose pas le palier de session';
  END IF;
  DELETE FROM public.rooms WHERE id=room_couple;

  -- ===== 2. « Audacieux » n'est plus « pas d'option disponible » =====
  -- Palier 1 demandé + catégorie audacieux : le palier effectif doit monter à 3.
  INSERT INTO public.rooms(mode,status,selected_level) VALUES ('couple','waiting',1) RETURNING id INTO room_couple;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (room_couple,1,'Aud A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,ARRAY['audacieux']),
    (room_couple,2,'Aud B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),true,ARRAY['audacieux']);

  SELECT public.start_game_by_level(room_couple,token_a,1) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Audacieux au palier 1 a échoué (pas d''option disponible)'; END IF;
  SELECT current_level INTO lv FROM public.rooms WHERE id=room_couple;
  IF lv < 3 THEN RAISE EXCEPTION 'Audacieux servi au palier % au lieu de 3+', lv; END IF;
  SELECT count(*) INTO bad
    FROM unnest((SELECT interaction_ids FROM public.rooms WHERE id=room_couple)) q(id)
    JOIN public.catalog c ON c.id=q.id
   WHERE c.category <> 'audacieux';
  IF bad <> 0 THEN RAISE EXCEPTION 'La partie Audacieux contient % cartes hors catégorie', bad; END IF;
  DELETE FROM public.rooms WHERE id=room_couple;

  -- ===== 3. L'intensité n'est pas rabaissée =====
  -- L'accord 18+ doit survivre à un redémarrage, sinon _advance saute les
  -- cartes audacieux et la partie dérive vers du contenu plus doux.
  INSERT INTO public.rooms(mode,status,selected_level) VALUES ('couple','waiting',4) RETURNING id INTO room_couple;
  INSERT INTO public.players(room_id,seat,nickname,avatar,token_hash,adult_consent,selected_categories)
  VALUES
    (room_couple,1,'Int A','masculin',encode(extensions.digest(token_a,'sha256'),'hex'),true,ARRAY['audacieux']),
    (room_couple,2,'Int B','feminin',encode(extensions.digest(token_b,'sha256'),'hex'),true,ARRAY['audacieux']);

  SELECT public.start_game_by_level(room_couple,token_a,4) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Lancement intensité a échoué'; END IF;
  IF NOT (SELECT adult_enabled FROM public.rooms WHERE id=room_couple) THEN
    RAISE EXCEPTION 'adult_enabled devrait être vrai au palier 4 avec accord';
  END IF;

  UPDATE public.rooms SET status='finished' WHERE id=room_couple;
  PERFORM public.restart_game(room_couple,token_a);

  -- L'accord doit être conservé : c'est ce qui empêche la dérive vers le bas.
  SELECT count(*) INTO bad FROM public.players
   WHERE room_id=room_couple AND status='active' AND NOT adult_consent;
  IF bad <> 0 THEN
    RAISE EXCEPTION 'restart_game a effacé l''accord 18+ de % joueur(s) : l''intensité sera rabaissée', bad;
  END IF;

  SELECT public.start_game_by_level(room_couple,token_a,4) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Relance intensité a échoué'; END IF;
  IF NOT (SELECT adult_enabled FROM public.rooms WHERE id=room_couple) THEN
    RAISE EXCEPTION 'adult_enabled est retombé à faux après redémarrage';
  END IF;

  -- Aucune carte audacieux ne doit être sautée en cours de partie.
  SELECT interaction_ids INTO v_ids FROM public.rooms WHERE id=room_couple;
  SELECT count(*) INTO bad FROM unnest(v_ids) q(id)
    JOIN public.catalog c ON c.id=q.id WHERE c.category='audacieux';
  IF bad = 0 THEN RAISE EXCEPTION 'Aucune carte audacieux dans une partie audacieux'; END IF;

  -- La révocation reste possible et doit toujours arrêter la partie.
  PERFORM public.set_adult_consent(room_couple,token_a,false);
  IF (SELECT status FROM public.rooms WHERE id=room_couple) <> 'finished' THEN
    RAISE EXCEPTION 'La révocation du consentement n''arrête plus la partie';
  END IF;
  DELETE FROM public.rooms WHERE id=room_couple;

  RAISE NOTICE 'LEVEL AND MODE INTEGRITY OK';
END
$levels$;

SELECT 'LEVEL AND MODE INTEGRITY OK' AS resultat;
