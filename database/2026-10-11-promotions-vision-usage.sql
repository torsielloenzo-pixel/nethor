-- Rate limit multimodal Promotions by authenticated user and UTC day.
-- No direct table privileges: the RPC is the only mutation path.
create table if not exists public.promotion_vision_usage(
  user_id uuid not null references public.profiles(id),
  usage_day date not null,
  calls integer not null default 0 check(calls between 0 and 300),
  updated_at timestamptz not null default now(),
  primary key(user_id,usage_day)
);
alter table public.promotion_vision_usage enable row level security;
revoke all on public.promotion_vision_usage from public,anon,authenticated;
create or replace function public.reserve_promotion_vision_call(p_call_kind text)
returns integer
language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_calls integer;
begin
 if p_call_kind not in ('detect','read','verify') then
  raise exception 'Analyse visuelle inconnue';
 end if;
 if v_user is null or not private.session_is_active()
 or not exists(select 1 from public.profiles p
  where p.id=v_user and p.account_enabled is distinct from false
    and p.role in ('admin','role_point-de-vente')) then
  raise exception 'Accès analyse visuelle refusé' using errcode='42501';
 end if;
 insert into public.promotion_vision_usage(user_id,usage_day,calls)
  values(v_user,(now() at time zone 'UTC')::date,1)
 on conflict(user_id,usage_day) do update
  set calls=public.promotion_vision_usage.calls+1,updated_at=now()
  where public.promotion_vision_usage.calls<300
 returning calls into v_calls;
 if v_calls is null then raise exception 'Quota de 300 analyses IA par jour atteint'; end if;
 return v_calls;
end;$$;
revoke all on function public.reserve_promotion_vision_call(text) from public,anon;
grant execute on function public.reserve_promotion_vision_call(text) to authenticated;
