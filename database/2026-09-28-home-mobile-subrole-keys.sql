-- Nethor • Accueil mobile : lecture sécurisée des sous-rôles du compte courant
-- 2026-09-28

create or replace function public.my_subrole_keys()
returns table(subrole_key text)
language sql
stable
security definer
set search_path=''
as $$
  select us.subrole_key
  from public.user_subroles us
  where us.user_id=(select auth.uid())
  order by us.subrole_key
$$;

revoke all on function public.my_subrole_keys() from public, anon;
grant execute on function public.my_subrole_keys() to authenticated;
