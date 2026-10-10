-- Nethor · Sondages hebdomadaires mobiles (12 octobre — 6 décembre 2026)
-- Réponses privées, un vote modifiable par utilisateur et par semaine.
-- Résultats agrégés uniquement après clôture et à partir de 5 participants.
create table if not exists public.weekly_polls (
 id uuid primary key default gen_random_uuid(),
 campaign_code text not null,
 week_number integer not null check (week_number between 1 and 52),
 start_on date not null,
 end_on date not null,
 theme text not null,
 question text not null,
 action_hint text not null default '',
 created_at timestamptz not null default now(),
 constraint weekly_polls_dates_ok check(end_on >= start_on),
 constraint weekly_polls_campaign_week_key unique (campaign_code,week_number)
);
create table if not exists public.weekly_poll_options (
 id uuid primary key default gen_random_uuid(),
 poll_id uuid not null references public.weekly_polls(id) on delete cascade,
 position integer not null check(position between 1 and 20),
 label text not null,
 constraint weekly_poll_options_position_key unique(poll_id,position),
 constraint weekly_poll_options_pair_key unique(poll_id,id)
);
create table if not exists public.weekly_poll_votes (
 poll_id uuid not null references public.weekly_polls(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 option_id uuid not null,
 updated_at timestamptz not null default now(),
 primary key(poll_id,user_id),
 constraint weekly_poll_votes_valid_option foreign key(poll_id,option_id)
   references public.weekly_poll_options(poll_id,id) on delete cascade
);
create index if not exists weekly_poll_votes_option_idx on public.weekly_poll_votes(poll_id,option_id);

alter table public.weekly_polls enable row level security;
alter table public.weekly_poll_options enable row level security;
alter table public.weekly_poll_votes enable row level security;

revoke all on table public.weekly_polls,public.weekly_poll_options,public.weekly_poll_votes from anon;
revoke all on table public.weekly_polls,public.weekly_poll_options,public.weekly_poll_votes from authenticated;
grant select on table public.weekly_polls,public.weekly_poll_options to authenticated;
grant select,insert,update on table public.weekly_poll_votes to authenticated;

drop policy if exists "weekly polls active user read" on public.weekly_polls;
create policy "weekly polls active user read" on public.weekly_polls for select to authenticated
using ((select auth.uid()) is not null and exists(
 select 1 from public.profiles me where me.id=(select auth.uid()) and me.account_enabled is distinct from false
));
drop policy if exists "weekly poll options active user read" on public.weekly_poll_options;
create policy "weekly poll options active user read" on public.weekly_poll_options for select to authenticated
using ((select auth.uid()) is not null and exists(
 select 1 from public.profiles me where me.id=(select auth.uid()) and me.account_enabled is distinct from false
));
drop policy if exists "weekly poll votes own read" on public.weekly_poll_votes;
create policy "weekly poll votes own read" on public.weekly_poll_votes for select to authenticated
using(user_id=(select auth.uid()) and exists(
 select 1 from public.profiles me where me.id=(select auth.uid()) and me.account_enabled is distinct from false
));
drop policy if exists "weekly poll votes own insert" on public.weekly_poll_votes;
create policy "weekly poll votes own insert" on public.weekly_poll_votes for insert to authenticated
with check(
 user_id=(select auth.uid()) and
 exists(select 1 from public.profiles me where me.id=(select auth.uid()) and me.account_enabled is distinct from false) and
 exists(select 1 from public.weekly_polls p
   where p.id=poll_id and (now() at time zone 'Europe/Paris')::date between p.start_on and p.end_on)
);
drop policy if exists "weekly poll votes own update" on public.weekly_poll_votes;
create policy "weekly poll votes own update" on public.weekly_poll_votes for update to authenticated
using(user_id=(select auth.uid()) and exists(
 select 1 from public.weekly_polls p where p.id=poll_id
 and (now() at time zone 'Europe/Paris')::date between p.start_on and p.end_on
))
with check(
 user_id=(select auth.uid()) and
 exists(select 1 from public.profiles me where me.id=(select auth.uid()) and me.account_enabled is distinct from false) and
 exists(select 1 from public.weekly_polls p where p.id=poll_id
 and (now() at time zone 'Europe/Paris')::date between p.start_on and p.end_on)
);
create or replace function public.weekly_poll_set_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end;$$;
revoke all on function public.weekly_poll_set_updated_at() from public,anon,authenticated;
drop trigger if exists weekly_poll_votes_update_stamp on public.weekly_poll_votes;
create trigger weekly_poll_votes_update_stamp before update on public.weekly_poll_votes
for each row execute function public.weekly_poll_set_updated_at();

-- Appel RPC réservé aux utilisateurs actifs ; ne retourne jamais de vote individuel.
create or replace function public.weekly_poll_results(p_poll_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p_end date; n bigint; details jsonb;
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.profiles me where me.id=(select auth.uid()) and me.account_enabled is distinct from false
 ) then raise exception 'Accès refusé' using errcode='42501'; end if;
 select p.end_on into p_end from public.weekly_polls p where p.id=p_poll_id;
 if not found then raise exception 'Sondage introuvable' using errcode='22023'; end if;
 select count(*) into n from public.weekly_poll_votes v where v.poll_id=p_poll_id;
 if ((now() at time zone 'Europe/Paris')::date <= p_end) or n<5 then
   return jsonb_build_object('available',false,'total',null,'options','[]'::jsonb);
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'count',(
  select count(*) from public.weekly_poll_votes v where v.poll_id=p_poll_id and v.option_id=o.id
 )) order by o.position),'[]'::jsonb)
 into details from public.weekly_poll_options o where o.poll_id=p_poll_id;
 return jsonb_build_object('available',true,'total',n,'options',details);
end;$$;
revoke all on function public.weekly_poll_results(uuid) from public,anon;
grant execute on function public.weekly_poll_results(uuid) to authenticated;

insert into public.weekly_polls(campaign_code,week_number,start_on,end_on,theme,question,action_hint) values
  ('nethor_2026_q4',1,'2026-10-12'::date,'2026-10-18'::date,'Transmission d''informations','Quand tu prends ton poste, quelle information te manque le plus souvent ?','Tester une fiche de transmission : fait, à faire, à surveiller.'),
  ('nethor_2026_q4',2,'2026-10-19'::date,'2026-10-25'::date,'Matériel de travail','Quel équipement mériterait d''être amélioré en priorité pour faciliter ton travail ?','Examiner le matériel signalé et prioriser entretien, réparation ou remplacement.'),
  ('nethor_2026_q4',3,'2026-10-26'::date,'2026-11-01'::date,'Organisation des espaces','Dans quelle zone une meilleure organisation te ferait-elle gagner le plus de temps ?','Observer la zone retenue et tester une amélioration du rangement ou de la circulation.'),
  ('nethor_2026_q4',4,'2026-11-02'::date,'2026-11-08'::date,'Consignes et procédures','Sur quel sujet aimerais-tu avoir des consignes plus faciles à retrouver ?','Créer une fiche pratique validée par un responsable, accessible sur Nethor.'),
  ('nethor_2026_q4',5,'2026-11-09'::date,'2026-11-15'::date,'Charge de travail','À quel moment un meilleur soutien ou une meilleure organisation serait-il le plus utile ?','Analyser avec les salariés le moment concerné et tester un ajustement.'),
  ('nethor_2026_q4',6,'2026-11-16'::date,'2026-11-22'::date,'Confort et pauses','Quelle amélioration rendrait tes pauses plus agréables ?','Identifier une amélioration simple de l''espace de pause à discuter avec la direction.'),
  ('nethor_2026_q4',7,'2026-11-23'::date,'2026-11-29'::date,'Ergonomie et manutention','Quelle amélioration faciliterait le plus les tâches physiques du quotidien ?','Examiner les contraintes physiques avec les personnes concernées et agir sans délai en cas de danger.'),
  ('nethor_2026_q4',8,'2026-11-30'::date,'2026-12-06'::date,'Priorité collective','Parmi ces améliorations, laquelle aimerais-tu voir avancer en priorité ?','Comparer cette priorité avec les sept premiers sondages et établir un plan d''action réalisable.')
on conflict (campaign_code,week_number) do update set
 start_on=excluded.start_on,end_on=excluded.end_on,theme=excluded.theme,
 question=excluded.question,action_hint=excluded.action_hint;

insert into public.weekly_poll_options(poll_id,position,label)
select p.id,x.position,x.label from (values
  (1,1,'Les tâches déjà effectuées'),
  (1,2,'Les tâches qu''il reste à faire'),
  (1,3,'Les livraisons et les stocks'),
  (1,4,'Les problèmes ou consignes à connaître'),
  (1,5,'Je dispose généralement des informations nécessaires'),
  (2,1,'Les caisses, écrans et scanners'),
  (2,2,'Le matériel de manutention'),
  (2,3,'La machine de nettoyage'),
  (2,4,'Les outils du quotidien (cutters, étiquetage, etc.)'),
  (2,5,'Aucun besoin particulier'),
  (3,1,'La réserve des produits secs'),
  (3,2,'Le sas frais et les chambres froides'),
  (3,3,'L''espace caisse et ses rangements'),
  (3,4,'Les zones de réception des livraisons'),
  (3,5,'Aucune difficulté particulière'),
  (4,1,'Les prix, promotions et étiquettes'),
  (4,2,'Les procédures de caisse et paiements'),
  (4,3,'Les dates, la casse et les retraits'),
  (4,4,'Les commandes et procédures de boulangerie'),
  (4,5,'Les consignes actuelles me suffisent'),
  (5,1,'Pendant les livraisons'),
  (5,2,'Lors du réassort et de la mise en rayon'),
  (5,3,'Pendant les périodes d''affluence en caisse'),
  (5,4,'Lors de la fermeture et des dernières tâches'),
  (5,5,'L''organisation actuelle me convient'),
  (6,1,'Un espace plus calme et reposant'),
  (6,2,'Des tables et sièges plus confortables'),
  (6,3,'Des équipements pratiques (frigo, micro-ondes, etc.)'),
  (6,4,'Un espace plus propre et mieux rangé'),
  (6,5,'L''espace actuel me convient'),
  (7,1,'Du matériel de manutention plus accessible'),
  (7,2,'Des allées et passages moins encombrés'),
  (7,3,'Des produits et outils mieux positionnés'),
  (7,4,'Une meilleure organisation des tâches lourdes'),
  (7,5,'Pas de difficulté particulière'),
  (8,1,'Améliorer la transmission des informations'),
  (8,2,'Améliorer ou réparer le matériel'),
  (8,3,'Réorganiser les espaces de travail'),
  (8,4,'Améliorer le confort et l''ergonomie'),
  (8,5,'Faciliter les consignes et l''organisation')
) as x(week_number,position,label)
join public.weekly_polls p on p.campaign_code='nethor_2026_q4' and p.week_number=x.week_number
on conflict(poll_id,position) do update set label=excluded.label;
