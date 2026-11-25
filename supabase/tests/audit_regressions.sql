-- QSPICY — Régressions après les migrations 21, 22, 24 et 25.
-- À exécuter uniquement sur la base locale jetable créée par run_postgres.sh.
-- Le script échoue immédiatement si une assertion ne tient pas.

DO $audit$
DECLARE
  room_couple uuid;
  room_duos uuid;
  room_denied uuid;
  token_a text := repeat('a', 64);
  token_b text := repeat('b', 64);
  token_c text := repeat('c', 64);
  token_d text := repeat('d', 64);
  ok boolean;
  level_value integer;
  audacious_count integer;
  replay jsonb;
  denied boolean := false;
BEGIN
  IF public._effective_level(ARRAY['audacieux','seduction'], 2, 2) <> 3 THEN
    RAISE EXCEPTION 'AUDIT: Audacieux + niveau 2 doit produire le niveau effectif 3';
  END IF;
  IF public._effective_level(ARRAY['audacieux'], 2, 4) <> 4 THEN
    RAISE EXCEPTION 'AUDIT: le plancher explicite 4 doit rester prioritaire';
  END IF;

  INSERT INTO public.rooms(mode, status, selected_level)
  VALUES ('couple', 'waiting', 2)
  RETURNING id INTO room_couple;

  INSERT INTO public.players(
    room_id, seat, nickname, avatar, token_hash, adult_consent, selected_categories
  )
  VALUES
    (room_couple, 1, 'Audit Couple A', 'masculin',
     encode(extensions.digest(token_a, 'sha256'), 'hex'), true, ARRAY['audacieux']),
    (room_couple, 2, 'Audit Couple B', 'feminin',
     encode(extensions.digest(token_b, 'sha256'), 'hex'), true, ARRAY['seduction']);

  SELECT public.start_game_by_level(room_couple, token_a, 2) INTO ok;
  IF NOT ok THEN
    RAISE EXCEPTION 'AUDIT: lancement Couple Audacieux + Séduction refusé';
  END IF;

  SELECT current_level INTO level_value
    FROM public.rooms WHERE id = room_couple;
  IF level_value <> 3 THEN
    RAISE EXCEPTION 'AUDIT: niveau Couple attendu 3, reçu %', level_value;
  END IF;

  SELECT count(*) INTO audacious_count
    FROM public.rooms r
    CROSS JOIN unnest(r.interaction_ids) q(id)
    JOIN public.catalog c ON c.id = q.id
   WHERE r.id = room_couple AND c.category = 'audacieux';
  IF audacious_count < 8 THEN
    RAISE EXCEPTION 'AUDIT: le paquet Couple doit réserver au moins 8 cartes Audacieux, reçu %', audacious_count;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.rooms r
      CROSS JOIN unnest(r.interaction_ids) q(id)
      JOIN public.catalog c ON c.id = q.id
     WHERE r.id = room_couple
       AND (c.category NOT IN ('audacieux','seduction') OR c.level <> 3)
  ) THEN
    RAISE EXCEPTION 'AUDIT: le paquet Couple contient une catégorie ou un niveau non sélectionné';
  END IF;

  IF NOT (SELECT adult_enabled FROM public.rooms WHERE id = room_couple) THEN
    RAISE EXCEPTION 'AUDIT: adult_enabled doit être actif après consentement des deux joueurs';
  END IF;

  UPDATE public.rooms SET status = 'finished' WHERE id = room_couple;
  IF NOT public.restart_game(room_couple, token_a) THEN
    RAISE EXCEPTION 'AUDIT: restart_game Couple a échoué';
  END IF;
  IF (SELECT adult_enabled FROM public.rooms WHERE id = room_couple) THEN
    RAISE EXCEPTION 'AUDIT: adult_enabled doit être faux pendant l''attente';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.players
     WHERE room_id = room_couple AND status = 'active' AND NOT adult_consent
  ) THEN
    RAISE EXCEPTION 'AUDIT: restart_game ne doit pas effacer les consentements individuels';
  END IF;

  SELECT public.start_game_by_level(room_couple, token_a, 2) INTO ok;
  IF NOT ok THEN
    RAISE EXCEPTION 'AUDIT: la relance Couple devrait réutiliser les consentements conservés';
  END IF;
  IF NOT (SELECT adult_enabled FROM public.rooms WHERE id = room_couple) THEN
    RAISE EXCEPTION 'AUDIT: le consentement conservé doit réactiver adult_enabled au lancement';
  END IF;
  DELETE FROM public.rooms WHERE id = room_couple;

  INSERT INTO public.rooms(mode, status, selected_level)
  VALUES ('duos', 'waiting', 2)
  RETURNING id INTO room_duos;

  INSERT INTO public.players(
    room_id, seat, nickname, avatar, token_hash, adult_consent, selected_categories, duo_no
  )
  VALUES
    (room_duos, 1, 'Audit Duo A', 'masculin',
     encode(extensions.digest(token_a, 'sha256'), 'hex'), true, ARRAY['audacieux'], 1),
    (room_duos, 2, 'Audit Duo B', 'feminin',
     encode(extensions.digest(token_b, 'sha256'), 'hex'), true, ARRAY['seduction'], 1),
    (room_duos, 3, 'Audit Duo C', 'masculin',
     encode(extensions.digest(token_c, 'sha256'), 'hex'), true, ARRAY['seduction'], 2),
    (room_duos, 4, 'Audit Duo D', 'feminin',
     encode(extensions.digest(token_d, 'sha256'), 'hex'), true, ARRAY['audacieux'], 2);

  SELECT public.start_duo_game_by_level(room_duos, token_a, 2) INTO ok;
  IF NOT ok THEN
    RAISE EXCEPTION 'AUDIT: lancement DUOS Audacieux + Séduction refusé';
  END IF;

  SELECT current_level INTO level_value
    FROM public.rooms WHERE id = room_duos;
  IF level_value <> 3 THEN
    RAISE EXCEPTION 'AUDIT: niveau DUOS attendu 3, reçu %', level_value;
  END IF;

  SELECT count(*) INTO audacious_count
    FROM public.rooms r
    CROSS JOIN unnest(r.interaction_ids) q(id)
    JOIN public.catalog c ON c.id = q.id
   WHERE r.id = room_duos AND c.category = 'audacieux';
  IF audacious_count < 8 THEN
    RAISE EXCEPTION 'AUDIT: le paquet DUOS doit réserver au moins 8 cartes Audacieux, reçu %', audacious_count;
  END IF;

  UPDATE public.rooms SET status = 'finished' WHERE id = room_duos;

  replay := public.restart_duo_game(room_duos, token_a);
  IF (replay->>'restarted')::boolean THEN
    RAISE EXCEPTION 'AUDIT: un seul vote ne doit pas redémarrer DUOS';
  END IF;
  PERFORM public.restart_duo_game(room_duos, token_b);
  PERFORM public.restart_duo_game(room_duos, token_c);
  replay := public.restart_duo_game(room_duos, token_d);

  IF NOT (replay->>'restarted')::boolean THEN
    RAISE EXCEPTION 'AUDIT: les quatre votes doivent redémarrer DUOS';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.players
     WHERE room_id = room_duos AND status = 'active' AND adult_consent
  ) THEN
    RAISE EXCEPTION 'AUDIT: le replay DUOS doit demander un nouveau consentement aux quatre joueurs';
  END IF;
  IF (SELECT adult_enabled FROM public.rooms WHERE id = room_duos) THEN
    RAISE EXCEPTION 'AUDIT: adult_enabled doit être faux après le replay DUOS';
  END IF;
  DELETE FROM public.rooms WHERE id = room_duos;

  INSERT INTO public.rooms(mode, status, selected_level)
  VALUES ('couple', 'waiting', 2)
  RETURNING id INTO room_denied;

  INSERT INTO public.players(
    room_id, seat, nickname, avatar, token_hash, adult_consent, selected_categories
  )
  VALUES
    (room_denied, 1, 'Audit Denied A', 'masculin',
     encode(extensions.digest(token_a, 'sha256'), 'hex'), true, ARRAY['audacieux']),
    (room_denied, 2, 'Audit Denied B', 'feminin',
     encode(extensions.digest(token_b, 'sha256'), 'hex'), false, ARRAY['seduction']);

  BEGIN
    PERFORM public.start_game_by_level(room_denied, token_a, 2);
    RAISE EXCEPTION 'AUDIT: lancement 18+ accepté sans consentement des deux joueurs';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'E_CONSENT:%' THEN
        denied := true;
      ELSE
        RAISE;
      END IF;
  END;

  IF NOT denied THEN
    RAISE EXCEPTION 'AUDIT: le serveur n''a pas refusé le lancement sans double consentement';
  END IF;
  DELETE FROM public.rooms WHERE id = room_denied;

  RAISE NOTICE 'QSPICY AUDIT REGRESSIONS OK';
END
$audit$;

SELECT 'QSPICY AUDIT REGRESSIONS OK' AS resultat;
