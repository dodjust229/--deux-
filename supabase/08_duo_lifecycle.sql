-- QSPICY — 08 : cycle de vie DUOS (redémarrage)
-- À appliquer après 07. Idempotent.
-- Aujourd'hui, une partie DUOS terminée ne peut pas être rejouée : seule la version à deux a
-- restart_game. Le mode quatre joueurs rejoue donc dans un nouveau salon, ce qui perd le lien
-- d'invitation déjà partagé.
--
-- Règles :
--   - accessible à un joueur DUOS de la salle, uniquement quand la partie est terminée ;
--   - les quatre joueurs actifs doivent être présents (même règle que start_duo_game) ;
--   - les réponses et messages de la partie sont effacés, les consentements 18+ sont réinitialisés,
--     les permissions individuelles (partage, médias) sont conservées : elles appartiennent au joueur.

create or replace function public.restart_duo_game(p_room_id uuid, p_player_token text)
returns boolean language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare me public.players; r public.rooms;
begin
  me := public._player_for(p_room_id,p_player_token);
  select * into r from public.rooms where id=p_room_id for update;
  if r.mode <> 'duos' then raise exception 'E_MODE: Ce salon n’est pas un salon DUOS.'; end if;
  if r.status <> 'finished' then raise exception 'E_STATE: La partie n’est pas terminée.'; end if;
  if (select count(*) from public.players where room_id=p_room_id and status='active') <> 4 then
    raise exception 'E_STATE: Les quatre joueurs doivent être présents pour rejouer.';
  end if;
  delete from public.duo_answers where room_id=p_room_id;
  delete from public.duo_messages where room_id=p_room_id;
  update public.players set ack_index=-1, adult_consent=false where room_id=p_room_id;
  update public.rooms set status='waiting', current_index=0, interaction_ids='{}',
    adult_enabled=false, updated_at=now(), last_activity=now() where id=p_room_id;
  return true;
end $$;

revoke execute on function public.restart_duo_game(uuid,text) from public, authenticated;
grant execute on function public.restart_duo_game(uuid,text) to anon;
