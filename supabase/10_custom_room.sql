-- 10 · Mode Personnalisé : la salle joue les questions écrites par l'hôte.
--
-- Pourquoi ce fichier :
-- Le catalogue est lu par le serveur pour distribuer les cartes (`start_game`) et pour
-- valider les réponses (`submit_answer`). Aucune RPC ne permet aujourd'hui d'injecter
-- des cartes écrites par les joueurs. Le mode Personnalisé a donc besoin de deux appels :
--   - `start_custom_game` : valide la liste et l'installe comme séquence de la salle ;
--   - `get_custom_deck`   : renvoie la liste aux deux joueurs (reprise après rechargement).
--
-- Choix assumés :
--   - les identifiants de séquence sont `perso-1`…`perso-n`, absents du catalogue : `submit_answer`
--     accepte alors le texte libre et `_advance` avance normalement ;
--   - le mode Personnalisé n'ouvre JAMAIS le palier 18+ (`adult_enabled = false`) : la base ne sait
--     retirer une carte 18+ qu'en la reconnaissant dans le catalogue, une question libre ne peut donc
--     pas être retirée en cours de partie si un consentement est retiré. Le 18+ reste au catalogue.
--   - l'ordre écrit est l'ordre joué : aucune redistribution aléatoire, l'hôte garde la main.
--
-- À appliquer par le propriétaire du projet Supabase (aucune migration n'est lancée depuis l'agent).

alter table public.rooms add column if not exists custom_deck jsonb;

create or replace function public.start_custom_game(p_room_id uuid, p_player_token text, p_questions jsonb)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  me public.players; r public.rooms;
  v_texts text[]; v_ids text[] := '{}';
  q jsonb; v_raw text; v_n int := 0;
begin
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.mode = 'duos' then raise exception 'E_MODE: Le mode Personnalisé est un salon à deux.'; end if;
  if r.status <> 'waiting' then raise exception 'E_STATE: La partie a déjà commencé.'; end if;
  if (select count(*) from public.players where room_id=p_room_id and status='active') <> 2 then
    raise exception 'E_STATE: Deux joueurs doivent être présents.';
  end if;
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception 'E_CUSTOM: Liste de questions invalide.';
  end if;
  if jsonb_array_length(p_questions) not between 5 and 24 then
    raise exception 'E_CUSTOM: Il faut entre 5 et 24 questions.';
  end if;
  for q in select * from jsonb_array_elements(p_questions) loop
    if jsonb_typeof(q) <> 'string' then
      raise exception 'E_CUSTOM: Chaque question doit être un texte.';
    end if;
    v_raw := btrim(q #>> '{}');
    if char_length(v_raw) not between 5 and 280 then
      raise exception 'E_CUSTOM: Chaque question doit faire entre 5 et 280 caractères.';
    end if;
    if v_texts is not null and exists (select 1 from unnest(v_texts) x where lower(x) = lower(v_raw)) then
      raise exception 'E_CUSTOM: Deux questions identiques.';
    end if;
    v_texts := array_append(coalesce(v_texts, '{}'), v_raw);
    v_n := v_n + 1;
    v_ids := array_append(v_ids, 'perso-' || v_n);
  end loop;
  update public.players set ack_index=-1 where room_id=p_room_id;
  update public.rooms
     set status='playing', current_index=0, interaction_ids=v_ids,
         custom_deck=to_jsonb(v_texts), adult_enabled=false,
         updated_at=now(), last_activity=now()
   where id=p_room_id;
  return true;
end $$;

create or replace function public.get_custom_deck(p_room_id uuid, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms;
begin
  me := public._player_for(p_room_id, p_player_token);
  select * into r from public.rooms where id=p_room_id;
  return coalesce(r.custom_deck, '[]'::jsonb);
end $$;

revoke execute on function public.start_custom_game(uuid,text,jsonb) from public, authenticated;
revoke execute on function public.get_custom_deck(uuid,text) from public, authenticated;
grant execute on function public.start_custom_game(uuid,text,jsonb) to anon;
grant execute on function public.get_custom_deck(uuid,text) to anon;
