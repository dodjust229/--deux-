-- QSPICY — recette locale de la base (PostgreSQL ≥ 15)
--
-- But : rejouer la chaîne complète sur une base vierge et vérifier les parcours DUOS et deux joueurs,
-- y compris les permissions, le consentement, le masquage des réponses, la révocation en cours de partie,
-- le redémarrage à quatre accords et le cloisonnement des modes.
--
-- Usage :
--   createdb qspicy_test
--   psql -d qspicy_test -f supabase/01_schema.sql
--   psql -d qspicy_test -f supabase/02_catalog.sql
--   psql -d qspicy_test -f supabase/03_reconnexion_securisee.sql
--   psql -d qspicy_test -f supabase/06_duo_schema.sql
--   psql -d qspicy_test -f supabase/07_security_fixes.sql
--   psql -d qspicy_test -f supabase/08_duo_lifecycle.sql
--   psql -d qspicy_test -f supabase/09_duo_replay.sql
--   psql -d qspicy_test -f supabase/tests/recette_locale.sql
--
-- Chaque échec lève une exception ; la sortie doit finir sur « RECETTE OK ».
-- Ne jamais exécuter sur la base de production.

-- =========================================================================
-- 1. DUOS : salon, permissions, masquage, révélation, avancée, cloisonnement
-- =========================================================================
do $$
declare r jsonb; r_id uuid; t1 text; t2 text; t3 text; t4 text; s jsonb; n int; v boolean;
begin
  r := public.create_duo_room('Hote','masculin'); r_id := (r->>'room_id')::uuid; t1 := r->>'player_token';
  if r->>'mode' <> 'duos' then raise exception 'FAIL mode create'; end if;
  r := public.join_duo_room(r_id,'Deux','feminin'); t2 := r->>'player_token';
  r := public.join_duo_room(r_id,'Trois','masculin'); t3 := r->>'player_token';
  r := public.join_duo_room(r_id,'Quatre','feminin'); t4 := r->>'player_token';

  select column_default like '%false%' into v from information_schema.columns
   where table_schema='public' and table_name='duo_permissions' and column_name='receive_media';
  if not v then raise exception 'FAIL receive_media default'; end if;

  perform public.set_duo_permissions(r_id,t1,true,false,true);
  perform public.set_duo_permissions(r_id,t2,true,false,true);
  perform public.set_duo_permissions(r_id,t3,true,false,true);
  perform public.set_duo_permissions(r_id,t4,true,false,true);
  perform public.set_adult_consent(r_id,t1,true);
  perform public.set_adult_consent(r_id,t2,true);
  perform public.set_adult_consent(r_id,t3,true);
  perform public.set_adult_consent(r_id,t4,true);
  perform public.start_duo_game(r_id,t1);

  select public.get_duo_snapshot(r_id,t1) into s;
  if s->>'revealed' <> 'false' then raise exception 'FAIL reveal initial'; end if;
  if jsonb_array_length(s->'answers') <> 0 then raise exception 'FAIL answers initial'; end if;

  perform public.submit_duo_answer(r_id,t1,(s->>'interaction_id'),'A-prive',false,'private');
  select public.get_duo_snapshot(r_id,t2) into s;
  if s->>'revealed' <> 'false' then raise exception 'FAIL reveal prematuree'; end if;
  if jsonb_array_length(s->'answers') <> 0 then raise exception 'FAIL fuite reponse privee avant revelation'; end if;

  perform public.submit_duo_answer(r_id,t2,(s->>'interaction_id'),'B-duo',false,'duo');
  select public.get_duo_snapshot(r_id,t1) into s;
  if jsonb_array_length(s->'answers') <> 1 then raise exception 'FAIL masquage duo avant revelation'; end if;
  if s->'answers'->0->>'answer' <> 'A-prive' then raise exception 'FAIL propre reponse invisible'; end if;

  perform public.submit_duo_answer(r_id,t3,(s->>'interaction_id'),'C-groupe',false,'group');
  perform public.submit_duo_answer(r_id,t4,(s->>'interaction_id'),'',true,'private');

  select public.get_duo_snapshot(r_id,t1) into s;
  if s->>'revealed' <> 'true' then raise exception 'FAIL revelation attendue'; end if;
  select jsonb_array_length(s->'answers') into n;
  if n <> 4 then raise exception 'FAIL revelation incomplete %', n; end if;

  select public.next_duo_interaction(r_id,t1) into s;
  if (s->>'advanced')::boolean then raise exception 'FAIL avance a un seul'; end if;
  perform public.next_duo_interaction(r_id,t2);
  perform public.next_duo_interaction(r_id,t3);
  select public.next_duo_interaction(r_id,t4) into s;
  if not (s->>'advanced')::boolean then raise exception 'FAIL avance a quatre'; end if;

  begin
    perform public.restart_game(r_id,t1); raise exception 'FAIL restart duo autorise';
  exception when others then
    if sqlerrm not like 'E_MODE%' then raise; end if;
  end;
  begin
    perform public.join_room(r_id,'Intrus','masculin'); raise exception 'FAIL join_room sur duos';
  exception when others then
    if sqlerrm not like 'E_MODE%' then raise; end if;
  end;
  begin
    perform public.get_room_snapshot(r_id,t1); raise exception 'FAIL get_room_snapshot sur duos';
  exception when others then
    if sqlerrm not like 'E_MODE%' then raise; end if;
  end;

  begin
    perform public.send_duo_message(r_id,t1,'duo_a','sticker','hello');
  exception when others then
    if sqlerrm not like 'E_MEDIA%' then raise; end if;
  end;

  raise notice 'DUOS OK';
end $$;

-- =========================================================================
-- 2. DUOS : révocation en cours de partie (effet immédiat) et revanche à 4
-- =========================================================================
do $$
declare r jsonb; r_id uuid; t1 text; t2 text; t3 text; t4 text; s jsonb; n int;
begin
  r := public.create_duo_room('R1','masculin'); r_id := (r->>'room_id')::uuid; t1 := r->>'player_token';
  r := public.join_duo_room(r_id,'R2','feminin'); t2 := r->>'player_token';
  r := public.join_duo_room(r_id,'R3','masculin'); t3 := r->>'player_token';
  r := public.join_duo_room(r_id,'R4','feminin'); t4 := r->>'player_token';
  perform public.set_duo_permissions(r_id,t1,true,true,true);
  perform public.set_duo_permissions(r_id,t2,true,true,true);
  perform public.set_duo_permissions(r_id,t3,true,true,true);
  perform public.set_duo_permissions(r_id,t4,true,true,true);
  perform public.start_duo_game(r_id,t1);

  select public.get_duo_snapshot(r_id,t1) into s;
  perform public.submit_duo_answer(r_id,t1,(s->>'interaction_id'),'A-groupe',false,'group');
  -- un message de groupe est possible tant que les quatre autorisent
  perform public.send_duo_message(r_id,t1,'group','text','bonjour aux quatre');

  -- R4 retire son accord croisé en cours de partie : effet immédiat
  perform public.set_duo_permissions(r_id,t4,false,true,true);

  select public.get_duo_snapshot(r_id,t1) into s;
  if (select count(*) from jsonb_array_elements(s->'messages') m where m->>'space'='group') <> 0 then
    raise exception 'FAIL message de groupe visible apres revocation';
  end if;
  begin
    perform public.submit_duo_answer(r_id,t2,(s->>'interaction_id'),'B-groupe',false,'group');
    raise exception 'FAIL reponse groupe acceptee apres revocation';
  exception when others then
    if sqlerrm not like 'E_CONSENT%' then raise; end if;
  end;
  begin
    perform public.send_duo_message(r_id,t1,'group','text','encore');
    raise exception 'FAIL message groupe accepte apres revocation';
  exception when others then
    if sqlerrm not like 'E_CONSENT%' then raise; end if;
  end;

  -- Les réponses déjà écrites en visibilité groupe restent masquées à présent
  select public.get_duo_snapshot(r_id,t2) into s;
  select count(*) into n from jsonb_array_elements(s->'answers') a where a->>'player_id' <> s->>'my_player_id';
  if n <> 0 then raise exception 'FAIL reponse groupe encore visible apres revocation'; end if;

  -- R2 (partenaire de duo de R1) retire la réception des médias : plus de sticker possible vers lui
  perform public.set_duo_permissions(r_id,t2,true,false,true);
  begin
    perform public.send_duo_message(r_id,t1,'duo_a','sticker','coucou');
    raise exception 'FAIL sticker accepte apres revocation media';
  exception when others then
    if sqlerrm not like 'E_MEDIA%' then raise; end if;
  end;

  -- Revanche : quatre accords nécessaires
  update public.rooms set status='finished' where id=r_id;
  select public.restart_duo_game(r_id,t1) into s;
  if (s->>'restarted')::boolean or (s->>'votes')::int <> 1 then raise exception 'FAIL vote 1/4'; end if;
  select public.restart_duo_game(r_id,t2) into s;
  select public.restart_duo_game(r_id,t3) into s;
  if (s->>'restarted')::boolean then raise exception 'FAIL revanche a trois'; end if;
  select public.restart_duo_game(r_id,t4) into s;
  if not (s->>'restarted')::boolean then raise exception 'FAIL revanche a quatre'; end if;
  select public.get_duo_snapshot(r_id,t1) into s;
  if s->'room'->>'status' <> 'waiting' then raise exception 'FAIL statut apres revanche'; end if;
  if jsonb_array_length(s->'answers') <> 0 then raise exception 'FAIL reponses restantes'; end if;
  if (select count(*) from public.duo_messages where room_id=r_id) <> 0 then raise exception 'FAIL messages restants'; end if;
  if (select bool_or(replay_vote) from public.players where room_id=r_id) then raise exception 'FAIL votes non remis a zero'; end if;
  if (select bool_or(adult_consent) from public.players where room_id=r_id) then raise exception 'FAIL consentement non reinitialise'; end if;
  if not (select cross_participation from public.duo_permissions dp join public.players p on p.id=dp.player_id where p.room_id=r_id and p.seat=1) then
    raise exception 'FAIL permissions perdues';
  end if;

  raise notice 'DUOS REVOCATION ET REVANCHE OK';
end $$;

-- =========================================================================
-- 3. Deux joueurs : révélation, avancée
-- =========================================================================
do $$
declare r jsonb; r_id uuid; t1 text; t2 text; s jsonb; cats text[];
begin
  r := public.create_room('Alice','feminin'); r_id := (r->>'room_id')::uuid; t1 := r->>'player_token';
  r := public.join_room(r_id,'Bob','masculin'); t2 := r->>'player_token';
  select selected_categories into cats from public.players where room_id=r_id and seat=1;
  perform public.set_adult_consent(r_id,t1,true);
  perform public.set_adult_consent(r_id,t2,true);
  perform public.start_game(r_id,t1,cats);
  select public.get_room_snapshot(r_id,t1) into s;
  perform public.submit_answer(r_id,t1,'ma reponse',false);
  select public.get_room_snapshot(r_id,t2) into s;
  if (s->>'revealed')::boolean then raise exception 'FAIL revelation prematuree a deux'; end if;
  if s->'answers' <> '[]'::jsonb then raise exception 'FAIL fuite a deux'; end if;
  perform public.submit_answer(r_id,t2,'sa reponse',false);
  select public.get_room_snapshot(r_id,t1) into s;
  if not (s->>'revealed')::boolean then raise exception 'FAIL revelation a deux'; end if;
  if jsonb_array_length(s->'answers') <> 2 then raise exception 'FAIL reponses a deux'; end if;
  perform public.next_interaction(r_id,t1);
  select public.next_interaction(r_id,t2) into s;
  if not (s->>'advanced')::boolean then raise exception 'FAIL avance a deux'; end if;
  raise notice 'DEUX JOUEURS OK';
end $$;

select 'RECETTE OK' as resultat;
