#!/usr/bin/env python3
"""Integration checks for QSPICY Palier 4 roles and individual interests."""
import json, os, subprocess, sys

DB=os.environ.get("TEST_DB","qspicy_test")
checks=[]

def base():
    common=["psql","-q","-X","-A","-t","-v","ON_ERROR_STOP=1"]
    if os.environ.get("PGHOST"):
        return common+["-h",os.environ["PGHOST"],"-p",os.environ.get("PGPORT","5432"),"-U",os.environ.get("PGUSER","postgres")]
    return ["sudo","-u","postgres"]+common

def sql(statement):
    p=subprocess.run(base()+["-d",DB,"-c",statement],capture_output=True,text=True)
    if p.returncode:
        message=(p.stderr or p.stdout).strip().splitlines()
        raise RuntimeError(message[-1] if message else "PostgreSQL query failed")
    return (p.stdout or "").strip()

def rpc(name,args):
    return sql(f"set role anon; select public.{name}({args});")

def expect(name,args,code):
    try:
        rpc(name,args)
    except RuntimeError as error:
        return code in str(error)
    return False

def check(name,ok,detail=""):
    checks.append(bool(ok))
    print(("PASS" if ok else "FAIL")+" — "+name+(f" ({detail})" if detail else ""))

def room_pair(host_name, guest_name):
    host=json.loads(sql(f"select public.create_room('{host_name}','masculin')"))
    room,host_token=host["room_id"],host["player_token"]
    guest=json.loads(sql(f"select public.join_room_any('{room}','{guest_name}','feminin')"))
    return room,host_token,guest["player_token"]

# Couple: one interest per person, host-only start, and union of interests.
room,host,guest=room_pair("HoteP4","InviteP4")
check("un joueur ne peut pas enregistrer plusieurs centres d'intérêt",expect("set_player_categories",f"'{room}','{host}',array['decouverte','seduction']::text[]","E_INTEREST"))
rpc("set_player_categories",f"'{room}','{host}',array['decouverte']::text[]")
rpc("set_player_categories",f"'{room}','{guest}',array['complicite']::text[]")
stored=sql(f"select (select cardinality(selected_categories) from public.players where room_id='{room}' and seat=1)||'|'||(select cardinality(selected_categories) from public.players where room_id='{room}' and seat=2)")
check("chaque participant conserve exactement un intérêt",stored=="1|1",stored)
check("l'invité ne peut pas lancer le jeu",expect("start_game_by_level",f"'{room}','{guest}',1","E_HOST"))
rpc("start_game_by_level",f"'{room}','{host}',1")
selected=sql(f"select string_agg(distinct c.category,',' order by c.category) from public.rooms r cross join unnest(r.interaction_ids) i(id) join public.catalog c on c.id=i.id where r.id='{room}'")
check("le moteur Couple combine les deux intérêts individuels",selected=="complicite,decouverte",selected)
check("l'ancien RPC de lancement non gradué est fermé",sql("select has_function_privilege('anon','public.start_game(uuid,text,text[])','execute')")=="f")

# DUOS: all four players contribute one interest; only seat 1 may start.
host_room=json.loads(sql("select public.create_duo_room('HoteDuoP4','masculin')"))
duo,token1=host_room["room_id"],host_room["player_token"]
tokens=[token1]
for name,avatar in [("InviteDuo2","feminin"),("InviteDuo3","masculin"),("InviteDuo4","feminin")]:
    joined=json.loads(sql(f"select public.join_room_any('{duo}','{name}','{avatar}')"))
    tokens.append(joined["player_token"])
interests=["decouverte","complicite","profondeur","seduction"]
for token,interest in zip(tokens,interests):
    rpc("set_player_categories",f"'{duo}','{token}',array['{interest}']::text[]")
check("un invité DUOS ne peut pas lancer",expect("start_duo_game_by_level",f"'{duo}','{tokens[1]}',2","E_HOST"))
rpc("start_duo_game_by_level",f"'{duo}','{token1}',2")
duo_categories=sql(f"select string_agg(distinct c.category,',' order by c.category) from public.rooms r cross join unnest(r.interaction_ids) i(id) join public.catalog c on c.id=i.id where r.id='{duo}'")
check("le moteur DUOS utilise les intérêts choisis par les quatre joueurs",duo_categories=="complicite,decouverte,profondeur,seduction",duo_categories)

# Custom: the host can select cards from either participant's interest.
room,host,guest=room_pair("HoteCustomP4","InviteCustomP4")
rpc("set_player_categories",f"'{room}','{host}',array['decouverte']::text[]")
rpc("set_player_categories",f"'{room}','{guest}',array['complicite']::text[]")
ids=sql("select string_agg(quote_literal(id),',') from (select id from public.catalog where category='decouverte' and level=1 order by id limit 3 union all select id from public.catalog where category='complicite' and level=1 order by id limit 2) cards")
# Parenthesize each UNION arm to keep LIMIT scoped to its own category.
ids=sql("select string_agg(quote_literal(id),',') from ((select id from public.catalog where category='decouverte' and level=1 order by id limit 3) union all (select id from public.catalog where category='complicite' and level=1 order by id limit 2)) cards")
rpc("start_custom_game",f"'{room}','{host}',array[{ids}]::text[]")
custom_categories=sql(f"select string_agg(distinct c.category,',' order by c.category) from public.rooms r cross join unnest(r.interaction_ids) i(id) join public.catalog c on c.id=i.id where r.id='{room}'")
check("le Personnalisé accepte les cartes des deux intérêts",custom_categories=="complicite,decouverte",custom_categories)

print(f"\n{sum(checks)}/{len(checks)} vérifications réussies")
sys.exit(0 if all(checks) else 1)
