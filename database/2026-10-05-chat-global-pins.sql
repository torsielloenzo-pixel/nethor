-- Nethor • Conversations épinglées globalement par l'administrateur.

alter table public.chat_conversations
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_by uuid references public.profiles(id) on delete set null;

create index if not exists chat_conversations_pinned_at_idx
  on public.chat_conversations(pinned_at desc)
  where pinned_at is not null;

create or replace function public.chat_set_conversation_pinned(
  p_conversation uuid,
  p_pinned boolean
)
returns timestamptz
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  result_at timestamptz;
begin
  if uid is null or not private.has_role(array['admin']) then
    raise exception 'not allowed';
  end if;

  if not exists(
    select 1
    from public.chat_conversations c
    where c.id=p_conversation
      and c.archived_at is null
  ) then
    raise exception 'conversation not found';
  end if;

  update public.chat_conversations
  set pinned_at=case when coalesce(p_pinned,false) then now() else null end,
      pinned_by=case when coalesce(p_pinned,false) then uid else null end
  where id=p_conversation
  returning pinned_at into result_at;

  return result_at;
end
$$;

revoke all on function public.chat_set_conversation_pinned(uuid,boolean) from public,anon;
grant execute on function public.chat_set_conversation_pinned(uuid,boolean) to authenticated;
