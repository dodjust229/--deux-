#!/usr/bin/env python3
"""Recette du salon Personnalisé sur une vraie base PostgreSQL (aucune production).

Exécute supabase/10_custom_room.sql et le parcours complet des deux joueurs :
création, arrivée du deuxième, refus hôte, validations, lancement, relecture après
reconnexion, réponses, passage, fin de partie, plus les refus de sécurité.
"""
import json
import os
import subprocess
import sys

DB = os.environ.get("TEST_DB", "qspicy_test")
# Prérequis : base PostgreSQL jetable préparée par supabase/tests/run_postgres.sh.
# PGHOST/PGPORT/PGUSER/PGPASSWORD permettent aussi l'exécution dans un service CI conteneurisé.
results = []


def psql_base() -> list[str]:
    common = ["psql", "-q", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1"]
    if os.environ.get("PGHOST"):
        return common + [
            "-h", os.environ["PGHOST"],
            "-p", os.environ.get("PGPORT", "5432"),
            "-U", os.environ.get("PGUSER", "postgres"),
        ]
    return ["sudo", "-u", "postgres"] + common


def sql(statement: str) -> str:
    proc = subprocess.run(
        psql_base() + ["-d", DB, "-c", statement],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "Échec de psql").strip()
        raise RuntimeError(detail.splitlines()[0])
    return (proc.stdout or "").strip()


def rpc(name: str, args: str):
    """Appelle une fonction comme le ferait le client : rôle anon, aucun privilège direct."""
    return sql(f"set role anon; select public.{name}({args});")


def expect_error(name: str, args: str, code: str):
    try:
        rpc(name, args)
    except RuntimeError as error:
        return code in str(error)
    return False


def check(label: str, passed: bool, info: str = ""):
    results.append((label, passed))
    print(f"{'PASS' if passed else 'FAIL'} — {label}" + (f" ({info})" if info else ""))


q = ["Quel souvenir te fait encore sourire ?", "Ce qui te rassure quand tu doutes",
     "Un geste qui te touche toujours", "Ce que tu n'oses pas demander", "Ta dernière fierté"]
questions = "to_jsonb(array[" + ",".join("'" + x.replace("'", "''") + "'" for x in q) + "])"

sql("truncate public.rate_events;")

# --- 1. création + arrivée du deuxième joueur ---------------------------------
host = json.loads(sql("select public.create_room('Alex','masculin');"))
room, host_token = host["room_id"], host["player_token"]
guest = json.loads(sql(f"select public.join_room_any('{room}','Sam','feminin');"))
guest_token = guest["player_token"]
check("création de la salle et arrivée du deuxième joueur", bool(room and guest_token), room)

# --- 2. sécurité : l'invité ne peut pas lancer ni remplacer les questions -----
check("l'invité ne peut pas lancer la partie personnalisée",
      expect_error("start_custom_game", f"'{room}','{guest_token}',{questions}", "E_HOST"))
check("l'invité ne peut pas remplacer une séquence déjà écrite",
      expect_error("start_custom_game",
                   f"'{room}','{guest_token}',to_jsonb(array['Autre question ?','Autre question 2 ?','Autre question 3 ?','Autre question 4 ?','Autre question 5 ?'])",
                   "E_HOST"))

# --- 3. validations serveur ---------------------------------------------------
short = "to_jsonb(array['Une question ?','Deuxième question ?','Troisième ?','Quatrième ?'])"
check("moins de 5 questions refusé par le serveur",
      expect_error("start_custom_game", f"'{room}','{host_token}',{short}", "E_CUSTOM"))
many = "to_jsonb(array[" + ",".join(f"'Question numéro {i} ?'" for i in range(1, 26)) + "])"
check("plus de 24 questions refusé par le serveur",
      expect_error("start_custom_game", f"'{room}','{host_token}',{many}", "E_CUSTOM"))
dup = "to_jsonb(array['Quel souvenir te fait encore sourire ?','Quel souvenir te fait encore sourire ?','Trois ?','Quatre ?','Cinq ?'])"
check("doublon refusé par le serveur",
      expect_error("start_custom_game", f"'{room}','{host_token}',{dup}", "E_CUSTOM"))
too_long = "to_jsonb(array['" + "x" * 281 + "','B ?','C ?','D ?','E ?'])"
check("question trop longue refusée par le serveur",
      expect_error("start_custom_game", f"'{room}','{host_token}',{too_long}", "E_CUSTOM"))

# --- 4. lancement par l'hôte --------------------------------------------------
started = rpc("start_custom_game", f"'{room}','{host_token}',{questions}")
check("l'hôte lance la partie personnalisée", started.strip().lower() in ("t", "true"), started)

state = sql(f"select status, cardinality(interaction_ids), interaction_ids[1], adult_enabled, jsonb_array_length(custom_deck) from public.rooms where id='{room}';")
check("la salle passe en jeu avec 5 cartes personnalisées et sans 18+",
      state == "playing|5|perso-1|f|5", state)

# --- 5. relecture après reconnexion ------------------------------------------
deck = json.loads(rpc("get_custom_deck", f"'{room}','{guest_token}'"))
check("les questions sont relues depuis la salle après reconnexion",
      len(deck) == 5 and deck[0] == q[0] and deck[4] == q[4], json.dumps(deck, ensure_ascii=False)[:90])

# --- 6. les deux joueurs ne peuvent plus modifier la séquence ------------------
check("impossible de remplacer les questions une fois la partie lancée",
      expect_error("start_custom_game", f"'{room}','{host_token}',{questions}", "E_STATE"))

# --- 7. réponses, passage, avancée -------------------------------------------
snap_host = json.loads(rpc("get_room_snapshot", f"'{room}','{host_token}'"))
snap_guest = json.loads(rpc("get_room_snapshot", f"'{room}','{guest_token}'"))
check("les deux joueurs voient la même carte personnalisée",
      snap_host["interaction_id"] == snap_guest["interaction_id"] == "perso-1",
      f"{snap_host['interaction_id']} / {snap_guest['interaction_id']}")

rpc("submit_answer", f"'{room}','{host_token}','Le premier soir ou on a ri aux larmes.'")
hidden = json.loads(rpc("get_room_snapshot", f"'{room}','{guest_token}'"))
check("une seule reponse ne revele rien", hidden.get("revealed") is False, str(hidden.get("revealed")))

rpc("submit_answer", f"'{room}','{guest_token}','Le jour du demenagement.'")
revealed = json.loads(rpc("get_room_snapshot", f"'{room}','{host_token}'"))
check("révélation simultanée quand les deux ont répondu", revealed.get("revealed") is True, str(revealed.get("revealed")))

rpc("next_interaction", f"'{room}','{host_token}'")
advanced = rpc("next_interaction", f"'{room}','{guest_token}'")
check("il faut les deux pour avancer", json.loads(advanced).get("advanced") is True, advanced)
after = json.loads(rpc("get_room_snapshot", f"'{room}','{host_token}'"))
check("la carte suivante est la deuxième question écrite", after["interaction_id"] == "perso-2", after["interaction_id"])

# passage
rpc("submit_answer", f"'{room}','{guest_token}','', true")
rpc("submit_answer", f"'{room}','{host_token}','Une réponse courte.'")
passed = sql(f"select passed from public.answers a join public.players p on p.id=a.player_id where a.room_id='{room}' and a.interaction_id='perso-2' and p.seat=2;")
check("passer une question est enregistré comme un passage", passed == "t", passed)

rpc("next_interaction", f"'{room}','{host_token}'")
rpc("next_interaction", f"'{room}','{guest_token}'")

# --- 8. fin de partie ---------------------------------------------------------
for index in range(3, 6):
    rpc("submit_answer", f"'{room}','{host_token}','Reponse hote {index}.'")
    rpc("submit_answer", f"'{room}','{guest_token}','Reponse invitee {index}.'")
    rpc("next_interaction", f"'{room}','{host_token}'")
    rpc("next_interaction", f"'{room}','{guest_token}'")

final = json.loads(rpc("get_room_snapshot", f"'{room}','{host_token}'"))
check("la partie se termine après la dernière question", final["room"]["status"] == "finished", final["room"]["status"])

answers = sql(f"select count(*) from public.answers where room_id='{room}';")
check("toutes les réponses sont conservées", answers == "10", answers)

deck_after = json.loads(rpc("get_custom_deck", f"'{room}','{host_token}'"))
check("les questions restent lisibles après la partie", len(deck_after) == 5, str(len(deck_after)))

# --- 9. un salon du catalogue n'a pas de séquence personnalisée ---------------
catalog_room = json.loads(sql("select public.create_room('Lou','feminin');"))
check("un salon ordinaire n'a aucune question personnalisée",
      rpc("get_custom_deck", f"'{catalog_room['room_id']}','{catalog_room['player_token']}'") == "[]")

print()
ok = sum(1 for _, passed in results if passed)
print(f"{ok}/{len(results)} vérifications réussies")
sys.exit(0 if ok == len(results) else 1)
