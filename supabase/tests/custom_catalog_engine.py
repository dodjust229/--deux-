#!/usr/bin/env python3
"""Integration tests for the catalog-backed QSPICY custom engine."""
import json, os, subprocess, sys
DB=os.environ.get("TEST_DB","qspicy_test")
checks=[]
def base():
    common=["psql","-q","-X","-A","-t","-v","ON_ERROR_STOP=1"]
    if os.environ.get("PGHOST"):
        return common+["-h",os.environ["PGHOST"],"-p",os.environ.get("PGPORT","5432"),"-U",os.environ.get("PGUSER","postgres")]
    return ["sudo","-u","postgres"]+common
def sql(s):
    p=subprocess.run(base()+["-d",DB,"-c",s],capture_output=True,text=True)
    if p.returncode: raise RuntimeError((p.stderr or p.stdout).strip().splitlines()[0])
    return (p.stdout or "").strip()
def rpc(name,args):
    return sql(f"set role anon; select public.{name}({args});")
def expect(name,args,code):
    try: rpc(name,args)
    except RuntimeError as e: return code in str(e)
    return False
def check(name,ok,detail=""):
    checks.append(bool(ok)); print(("PASS" if ok else "FAIL")+" — "+name+(f" ({detail})" if detail else ""))
def room_pair(a,b):
    host=json.loads(sql(f"select public.create_room('{a}','masculin')"))
    rid,ht=host["room_id"],host["player_token"]
    guest=json.loads(sql(f"select public.join_room_any('{rid}','{b}','feminin')"))
    return rid,ht,guest["player_token"]
sql("truncate public.rate_events;")
rid,host,guest=room_pair("Hote3","Invite3")
ids="array['p04','p03','p01','p02','p05']::text[]"
check("l'invité ne peut pas lancer le mode personnalisé",expect("start_custom_game",f"'{rid}','{guest}',{ids}","E_HOST"))
check("un identifiant hors catalogue est rejeté",expect("start_custom_game",f"'{rid}','{host}',array['perso-1','p03','p01','p02','p05']::text[]","E_CUSTOM"))
check("une sélection 18+ est bloquée sans accord des deux",expect("start_custom_game",f"'{rid}','{host}',{ids}","E_CONSENT"))
rpc("set_adult_consent",f"'{rid}','{host}',true")
rpc("set_adult_consent",f"'{rid}','{guest}',true")
started=rpc("start_custom_game",f"'{rid}','{host}',{ids}")
check("l'hôte lance un paquet mixte avec cartes canoniques",started.lower() in ("t","true"),started)
state=sql(f"select status||'|'||array_to_string(interaction_ids,',')||'|'||adult_enabled from public.rooms where id='{rid}'")
check("l'ordre réel est enregistré avec les identifiants du catalogue",state=="playing|p04,p03,p01,p02,p05|t",state)
snap=json.loads(rpc("get_room_snapshot",f"'{rid}','{guest}'"))
check("le snapshot expose l'identifiant canonique et le bon niveau",snap.get("interaction_id")=="p04",str(snap.get("interaction_id")))
# Withdrawal on an adult card skips every remaining adult card until a safe card is reached.
rpc("set_adult_consent",f"'{rid}','{host}',false")
after=json.loads(rpc("get_room_snapshot",f"'{rid}','{guest}'"))
check("le retrait du consentement masque la carte adulte et saute les suivantes",after.get("interaction_id")=="p01",str(after.get("interaction_id")))
# The previous selection has been recorded in the room history; with enough unseen cards, reuse is rejected.
sql(f"update public.rooms set status='waiting' where id='{rid}'")
check("une sélection déjà jouée est refusée tant qu'il reste assez de cartes inédites",expect("start_custom_game",f"'{rid}','{host}',{ids}","E_CUSTOM_REPEAT"))
legacy=sql("select has_function_privilege('anon','public.start_custom_game(uuid,text,jsonb)','execute')")
check("l'ancien point d'entrée texte arbitraire n'est plus exécutable",legacy=="f",legacy)
rights=sql("select has_function_privilege('anon','public.start_custom_game(uuid,text,text[])','execute')||'|'||has_function_privilege('authenticated','public.start_custom_game(uuid,text,text[])','execute')||'|'||has_function_privilege('public','public.start_custom_game(uuid,text,text[])','execute')")
check("droits RPC limités à anon (authentification par jeton dans la fonction)",rights=="true|false|false",rights)
print(f"\n{sum(checks)}/{len(checks)} vérifications réussies")
sys.exit(0 if all(checks) else 1)
