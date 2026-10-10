-- Correctif appliqué à Supabase : désactivation sans colonne PL/pgSQL ambiguë.
-- Les sessions existantes sont supprimées, mais aucune donnée métier ou message n'est effacé.
create or replace function public.admin_set_account_enabled(p_user_id uuid,p_enabled boolean)
returns table(account_enabled boolean,sessions_valid_after timestamptz,revoked_sessions integer)
language plpgsql security definer set search_path = '' as $$
declare v_cutoff timestamptz:=clock_timestamp();v_revoked integer:=0;
begin
 if p_user_id is null then raise exception 'Invalid user';end if;
 update public.profiles as target
 set account_enabled=p_enabled,
     sessions_valid_after=case when p_enabled then target.sessions_valid_after else v_cutoff end
 where target.id=p_user_id;
 if not found then raise exception 'Account not found';end if;
 if not p_enabled then
  delete from auth.sessions as s where s.user_id=p_user_id;
  get diagnostics v_revoked=row_count;
 end if;
 return query select p.account_enabled,p.sessions_valid_after,v_revoked
 from public.profiles as p where p.id=p_user_id;
end $$;
revoke all on function public.admin_set_account_enabled(uuid,boolean) from public,anon,authenticated;
grant execute on function public.admin_set_account_enabled(uuid,boolean) to service_role;

-- Ne pas recréer de nouvelles conversations directes pour les comptes désactivés.
create or replace function public.chat_ensure_my_contacts()
returns integer language plpgsql security definer set search_path = '' as $$
declare uid uuid:=auth.uid();r record;total integer:=0;
begin
 if uid is null or not private.can_module(uid,'chat','view') then raise exception 'not allowed';end if;
 for r in select p.id from public.profiles p where p.id<>uid and p.account_enabled=true loop
  perform private.chat_make_direct_contact(uid,r.id);
  total:=total+1;
 end loop;
 return total;
end $$;

-- Les conversations directes avec un compte désactivé sont filtrées
-- dans public.list_chat_conversations() par un NOT EXISTS sur
-- chat_participants + profiles(account_enabled=false).
-- Les chat_messages/chat_participants restent conservés pour réactivation.
