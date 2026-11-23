-- QSPICY DUOS — consentement explicite pour l'espace commun.
-- Le partage inter-duos est fermé par défaut. Les joueurs existants doivent
-- réactiver individuellement cette permission avant toute interaction de groupe.

alter table public.duo_permissions
  alter column cross_participation set default false;

update public.duo_permissions
set cross_participation = false,
    updated_at = now();

do $$
begin
  execute replace(
    replace(
      pg_get_functiondef('public.get_duo_snapshot(uuid,text)'::regprocedure),
      'coalesce(dp.cross_participation,true)',
      'coalesce(dp.cross_participation,false)'
    ),
    'coalesce((select cross_participation from public.duo_permissions where player_id=me.id),true)',
    'coalesce((select cross_participation from public.duo_permissions where player_id=me.id),false)'
  );

  execute replace(
    pg_get_functiondef('public.send_duo_message(uuid,text,text,text,text)'::regprocedure),
    'coalesce(dp.cross_participation,true)',
    'coalesce(dp.cross_participation,false)'
  );

  execute replace(
    pg_get_functiondef('public.submit_duo_answer(uuid,text,text,text,boolean,text)'::regprocedure),
    'coalesce(dp.cross_participation,true)',
    'coalesce(dp.cross_participation,false)'
  );
end $$;
