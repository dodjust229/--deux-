-- QSPICY — l'API de jeu est anonyme : aucun endpoint DUOS n'a besoin du rôle authenticated.
-- On conserve l'accès anon requis par les joueurs sans compte, et on retire le privilège inutile.

revoke execute on function
  public.create_duo_room(text,text),
  public.get_duo_snapshot(uuid,text),
  public.join_duo_room(uuid,text,text),
  public.join_room_any(uuid,text,text),
  public.next_duo_interaction(uuid,text),
  public.send_duo_message(uuid,text,text,text,text),
  public.set_duo_permissions(uuid,text,boolean,boolean,boolean),
  public.start_duo_game(uuid,text),
  public.submit_duo_answer(uuid,text,text,text,boolean,text)
from authenticated;
