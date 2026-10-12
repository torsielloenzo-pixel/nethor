-- Snapshot of 3 real private helpers read-only from Supabase on 2026-10-12.
-- Run in GitHub Actions disposable PostgreSQL only. Never against the live project.

-- chat_can_read source_md5=6806820d782427b2e721c9eebdce94ae
CREATE OR REPLACE FUNCTION private.chat_can_read(p_conversation uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1
    from public.chat_conversations c
    where c.id=p_conversation
      and (
        c.type='general'
        or exists(
          select 1 from public.chat_participants cp
          where cp.conversation_id=c.id and cp.user_id=p_user
        )
      )
  )
$function$;

-- chat_is_participant source_md5=e7fdd23c99dab7741634b8f5fe9496b9
CREATE OR REPLACE FUNCTION private.chat_is_participant(p_conversation uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists(
    select 1 from public.chat_participants cp
    where cp.conversation_id=p_conversation and cp.user_id=p_user
  )
$function$;

-- has_role source_md5=33951e547dcd3277b8becf0ab96b0119
CREATE OR REPLACE FUNCTION private.has_role(allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.session_is_active()
     and exists (
       select 1
       from public.profiles
       where id = (select auth.uid())
         and role = any(allowed_roles)
     )
$function$;
