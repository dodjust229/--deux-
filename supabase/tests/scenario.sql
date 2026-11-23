-- Tests de scénario (PostgreSQL local ou projet Supabase de TEST jamais de production).
-- Usage : psql -v ON_ERROR_STOP=1 -f supabase/01_schema.sql -f supabase/02_catalog.sql -f supabase/tests/scenario.sql
-- Chaque test échoue avec "ASSERT FAILED: <nom>". Les données de test sont supprimées à la fin.
set search_path = public, extensions;
create or replace function pg_temp.try(q text) returns text language plpgsql as $$
begin execute q; return 'OK'; exception when others then return sqlerrm; end $$;
create or replace function pg_temp.j(q text) returns jsonb language plpgsql as $$
declare v jsonb; begin execute q into v; return v; end $$;
create or replace function pg_temp.ok(c boolean, name text) returns void language plpgsql as $$
begin if not coalesce(c,false) then raise exception 'ASSERT FAILED: %', name; end if; raise notice 'ok  - %', name; end $$;

do $$
declare a jsonb; b jsonb; c jsonb; ra uuid; ta text; tb text; tc text; s jsonb; x text; i int; ids text[];
  function_names text[] := array['_player_for(uuid,text)','_purge()','_advance(uuid)','_sync_adult(uuid)','_rate_check(text,int,interval)','_client_key()'];
  f text;
begin
  delete from rate_events;
  -- 1. droits : aucune table lisible, aucune fonction interne exécutable par anon/authenticated
  perform pg_temp.ok(not has_table_privilege('anon','public.players','select') and not has_table_privilege('anon','public.answers','select')
    and not has_table_privilege('authenticated','public.rooms','insert'), 'anon : aucun accès direct aux tables');
  foreach f in array function_names loop
    perform pg_temp.ok(not has_function_privilege('anon','public.'||f,'execute') and not has_function_privilege('authenticated','public.'||f,'execute'), 'fonction interne fermée : '||f);
  end loop;
  perform pg_temp.ok(has_function_privilege('anon','public.create_room(text,text)','execute'), 'create_room exécutable par anon');

  -- 2. création, jeton haché, rejoindre, 3e joueur refusé
  a := create_room('Alice','feminin'); ra := (a->>'room_id')::uuid; ta := a->>'player_token';
  perform pg_temp.ok(length(ta)=64 and not exists(select 1 from players where token_hash=ta), 'jeton 256 bits, seule l''empreinte est stockée');
  b := join_room(ra,'Bob','masculin'); tb := b->>'player_token';
  perform pg_temp.ok(pg_temp.try(format('select join_room(%L,''Carl'',''masculin'')',ra)) like 'E_ROOM_FULL%', 'troisième joueur refusé');
  perform pg_temp.ok(pg_temp.try(format('select get_room_snapshot(%L,%L)',gen_random_uuid(),ta)) like 'E_ROOM_UNKNOWN%', 'salle inconnue : code stable');
  perform pg_temp.ok(pg_temp.try(format('select get_room_snapshot(%L,%L)',ra,repeat('0',64))) like 'E_SESSION%', 'jeton invalide refusé');
  perform pg_temp.ok(pg_temp.try(format('select start_game(%L,%L,array[''bidon''])',ra,ta)) like 'Cat%', 'catégorie invalide refusée');

  -- 3. consentement 18+ : refus sans accord des deux, accord, retrait immédiat
  perform pg_temp.ok(pg_temp.try(format('select start_game(%L,%L,array[''audacieux''])',ra,ta)) like 'E_CONSENT%', '18+ refusé sans consentement');
  perform set_adult_consent(ra,ta,true);
  perform pg_temp.ok(pg_temp.try(format('select start_game(%L,%L,array[''audacieux''])',ra,ta)) like 'E_CONSENT%', '18+ refusé avec un seul consentement');
  perform set_adult_consent(ra,tb,true);
  perform pg_temp.ok((select adult_enabled from rooms where id=ra), 'mode 18+ actif avec les deux accords');
  perform start_game(ra,ta,array['audacieux','complicite']);
  perform set_adult_consent(ra,tb,false);
  perform pg_temp.ok(not (select adult_enabled from rooms where id=ra), 'retrait de consentement : mode désactivé immédiatement');
  perform pg_temp.ok(not exists(select 1 from catalog c, rooms r where r.id=ra and c.id=r.interaction_ids[r.current_index+1] and c.category='audacieux' and r.status='playing'), 'interaction 18+ en cours sautée après retrait');

  -- 4. réponses secrètes, révélation unique, double clic, progression synchronisée
  update rooms set interaction_ids=array['d03','d01','d02'], current_index=0, status='playing', adult_enabled=false where id=ra;
  update players set ack_index=-1 where room_id=ra;
  delete from answers where room_id=ra;
  perform pg_temp.ok(pg_temp.try(format('select submit_answer(%L,%L,%L)',ra,ta,'pas une option')) like 'Option invalide%', 'choix secret : option invalide refusée');
  perform submit_answer(ra,ta,'Une soirée tranquille à la maison'); perform submit_answer(ra,ta,'Une soirée tranquille à la maison');
  s := get_room_snapshot(ra,tb);
  perform pg_temp.ok(not (s->>'revealed')::boolean and jsonb_array_length(s->'answers')=0 and (s->>'other_submitted')::boolean, 'réponse secrète invisible avant la révélation (côté B)');
  s := get_room_snapshot(ra,ta);
  perform pg_temp.ok(not (s->>'revealed')::boolean and jsonb_array_length(s->'answers')=0 and s->>'my_answer' is not null, 'réponse secrète invisible avant la révélation (côté A)');
  perform pg_temp.ok((select count(*) from answers where room_id=ra)=1, 'double clic : une seule réponse enregistrée');
  perform pg_temp.ok(not (pg_temp.j(format('select next_interaction(%L,%L)',ra,ta))->>'advanced')::boolean, 'suivant impossible avant révélation');
  perform submit_answer(ra,tb,'Une sortie improvisée');
  s := get_room_snapshot(ra,ta);
  perform pg_temp.ok((s->>'revealed')::boolean and jsonb_array_length(s->'answers')=2, 'révélation simultanée des deux réponses');
  perform next_interaction(ra,ta); perform next_interaction(ra,ta);
  perform pg_temp.ok((select current_index from rooms where id=ra)=0, 'le clic de A seul (même répété) ne fait pas avancer B');
  s := get_room_snapshot(ra,tb);
  perform pg_temp.ok((s->>'other_acked')::boolean and not (s->>'i_acked')::boolean, 'B voit que A est prêt');
  x := (pg_temp.j(format('select next_interaction(%L,%L)',ra,tb))->>'advanced');
  perform pg_temp.ok(x='true' and (select current_index from rooms where id=ra)=1, 'progression quand les deux ont confirmé');
  perform pg_temp.ok(not (pg_temp.j(format('select next_interaction(%L,%L)',ra,tb))->>'advanced')::boolean and (select current_index from rooms where id=ra)=1, 'double clic après progression : sans effet');

  -- 5. passer sans pénalité
  perform submit_answer(ra,ta,'',true); perform submit_answer(ra,tb,'ok');
  perform pg_temp.ok((get_room_snapshot(ra,ta)->'answers') @> '[{"passed":true}]', 'Passer fonctionne et se révèle');

  -- 6. question croisée : ordre imposé, réponse du 1er visible du 2e
  update rooms set interaction_ids=array['x01','d02'], current_index=0 where id=ra; delete from answers where room_id=ra; update players set ack_index=-1 where room_id=ra;
  perform pg_temp.ok(pg_temp.try(format('select submit_answer(%L,%L,%L)',ra,tb,'trop tôt')) like 'E_ORDER%', 'croisée : le 2e ne peut pas répondre avant le 1er');
  perform submit_answer(ra,ta,'Mon anecdote');
  perform pg_temp.ok(get_room_snapshot(ra,tb)->>'first_answer'='Mon anecdote' and get_room_snapshot(ra,ta)->>'first_answer' is null, 'croisée : B voit la réponse de A pour réagir');

  -- 7. pause synchronisée
  perform set_pause(ra,ta,true);
  perform pg_temp.ok(pg_temp.try(format('select submit_answer(%L,%L,%L)',ra,tb,'pendant la pause')) like 'E_PAUSED%' and get_room_snapshot(ra,tb)->'room'->>'status'='paused', 'pause : visible des deux, réponses bloquées');
  perform set_pause(ra,tb,false);
  perform pg_temp.ok(get_room_snapshot(ra,ta)->'room'->>'status'='playing', 'reprise');

  -- 8. départ / absence / reprise de place
  update players set last_seen=now()-interval '60 seconds' where room_id=ra and seat=2;
  perform pg_temp.ok(pg_temp.try(format('select join_room(%L,''Carl'',''masculin'')',ra)) like 'E_ROOM_FULL%', 'dans le délai de grâce (60 s) : place non reprenable');
  update players set last_seen=now()-interval '200 seconds' where room_id=ra and seat=2;
  perform submit_answer(ra,ta,'Je suis seul');  -- A déjà répondu : conflit ignoré
  update rooms set interaction_ids=array['d01','d02','d04'], current_index=0 where id=ra; delete from answers where room_id=ra; update players set ack_index=-1 where room_id=ra;
  perform submit_answer(ra,ta,'Réponse de A');
  perform pg_temp.ok((get_room_snapshot(ra,ta)->>'revealed')::boolean, 'partenaire absent > 120 s : A n''est pas bloqué');
  perform pg_temp.ok((pg_temp.j(format('select next_interaction(%L,%L)',ra,ta))->>'advanced')::boolean, 'partenaire absent : A peut avancer seul');
  c := join_room(ra,'Carl','masculin'); tc := c->>'player_token';
  perform pg_temp.ok(pg_temp.try(format('select get_room_snapshot(%L,%L)',ra,tb)) like 'E_REPLACED%', 'ancien joueur remplacé : refus clair, pas de double identité');
  perform pg_temp.ok((select count(*) from players where room_id=ra and status='active')=2, 'toujours exactement 2 joueurs actifs');
  perform pg_temp.ok(not (select adult_consent from players where id=(c->>'player_id')::uuid), 'le remplaçant n''hérite pas du consentement 18+');

  -- 9. départ volontaire : place libérée immédiatement
  perform leave_room(ra,tc);
  perform pg_temp.ok(pg_temp.try(format('select get_room_snapshot(%L,%L)',ra,tc)) like 'E_LEFT%', 'joueur parti : refus clair');
  perform join_room(ra,'Dana','feminin');
  perform pg_temp.ok((select count(*) from players where room_id=ra and status='active')=2, 'place libérée par un départ volontaire');

  -- 10. fin de partie + recommencer
  update rooms set interaction_ids=array['d01'], current_index=0 where id=ra; delete from answers where room_id=ra; update players set ack_index=-1, last_seen=now() where room_id=ra;
  select token_hash into x from players where room_id=ra and seat=1 and status='active';
  -- fin : on force l'état via l'API (réponses + suivant) avec un jeton connu
  update players set token_hash=encode(digest(repeat('a',64),'sha256'),'hex') where room_id=ra and seat=1 and status='active';
  update players set token_hash=encode(digest(repeat('b',64),'sha256'),'hex') where room_id=ra and seat=2 and status='active';
  perform submit_answer(ra,repeat('a',64),'un'); perform submit_answer(ra,repeat('b',64),'deux');
  perform next_interaction(ra,repeat('a',64)); perform next_interaction(ra,repeat('b',64));
  perform pg_temp.ok(get_room_snapshot(ra,repeat('a',64))->'room'->>'status'='finished' and get_room_snapshot(ra,repeat('a',64))->'summary'->>'answered'='2', 'fin de partie + récapitulatif');
  update players set adult_consent=true where room_id=ra; update rooms set adult_enabled=true where id=ra;
  perform pg_temp.ok(restart_game(ra,repeat('a',64)) and get_room_snapshot(ra,repeat('a',64))->'room'->>'status'='waiting', 'recommencer la partie');
  perform pg_temp.ok(not exists(select 1 from players where room_id=ra and adult_consent) and not (select adult_enabled from rooms where id=ra), 'rejouer : consentement 18+ redemandé pour la nouvelle partie');

  -- 11. limite de création + nettoyage
  delete from rate_events;
  ids := array[]::text[];
  for i in 1..8 loop a := create_room('Spam'||i,'masculin'); ids := array_append(ids,a->>'room_id'); end loop;
  perform pg_temp.ok(pg_temp.try('select create_room(''Spam9'',''masculin'')') like 'E_RATE%', 'limite de création de salles (8/h par client)');
  delete from rooms where id = any(ids::uuid[]);
  update rooms set last_activity=now()-interval '7 hours' where id=ra;
  perform pg_temp.ok(pg_temp.try(format('select get_room_snapshot(%L,%L)',ra,repeat('a',64))) like 'E_ROOM_EXPIRED%', 'salle expirée : code stable');
  perform _purge();
  perform pg_temp.ok(not exists(select 1 from rooms where id=ra), 'nettoyage des salles expirées');
  perform pg_temp.ok((select count(*) from catalog)=43 and not exists(select 1 from catalog where kind='secret' and options is null), 'catalogue : 43 interactions, options présentes');
end $$;
