-- In-app notifications for shortlists and invitations, with recipient-only RLS.
alter table public.project_invitations
  add column if not exists declined_at timestamptz;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('shortlisted', 'member_joined', 'invitation_declined')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications" on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read" on public.notifications
  for update to authenticated using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.notify_candidate_shortlisted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare project_title text; actor_name text;
begin
  select p.name into project_title from public.projects p where p.id = new.project_id;
  select p.display_name into actor_name from public.profiles p where p.id = new.shortlisted_by;
  insert into public.notifications (recipient_id, project_id, actor_id, type, title, body)
  values (new.candidate_id, new.project_id, new.shortlisted_by, 'shortlisted', 'You were shortlisted',
    coalesce(actor_name, 'A project lead') || ' shortlisted you for ' || coalesce(project_title, 'a project') || '.');
  return new;
end;
$$;

drop trigger if exists on_candidate_shortlisted_notify on public.project_shortlists;
create trigger on_candidate_shortlisted_notify
  after insert on public.project_shortlists
  for each row execute function public.notify_candidate_shortlisted();

create or replace function public.notify_project_member_joined()
returns trigger language plpgsql security definer set search_path = '' as $$
declare project_lead uuid; project_title text; actor_name text;
begin
  if new.role <> 'member' then return new; end if;
  select pm.user_id, p.name into project_lead, project_title
  from public.project_members pm join public.projects p on p.id = pm.project_id
  where pm.project_id = new.project_id and pm.role = 'lead' limit 1;
  if project_lead is null or project_lead = new.user_id then return new; end if;
  select p.display_name into actor_name from public.profiles p where p.id = new.user_id;
  insert into public.notifications (recipient_id, project_id, actor_id, type, title, body)
  values (project_lead, new.project_id, new.user_id, 'member_joined', 'Invitation accepted',
    coalesce(actor_name, 'A teammate') || ' joined ' || coalesce(project_title, 'your project') || '.');
  return new;
end;
$$;

drop trigger if exists on_project_member_joined_notify on public.project_members;
create trigger on_project_member_joined_notify
  after insert on public.project_members
  for each row execute function public.notify_project_member_joined();

create or replace function public.notify_invitation_declined()
returns trigger language plpgsql security definer set search_path = '' as $$
declare project_lead uuid; project_title text; actor_name text;
begin
  if old.declined_at is not null or new.declined_at is null then return new; end if;
  select pm.user_id, p.name into project_lead, project_title
  from public.project_members pm join public.projects p on p.id = pm.project_id
  where pm.project_id = new.project_id and pm.role = 'lead' limit 1;
  if project_lead is null then return new; end if;
  select p.display_name into actor_name from public.profiles p where p.id = auth.uid();
  insert into public.notifications (recipient_id, project_id, actor_id, type, title, body)
  values (project_lead, new.project_id, auth.uid(), 'invitation_declined', 'Invitation declined',
    coalesce(actor_name, new.email) || ' declined the invitation to ' || coalesce(project_title, 'your project') || '.');
  return new;
end;
$$;

drop trigger if exists on_project_invitation_declined_notify on public.project_invitations;
create trigger on_project_invitation_declined_notify
  after update of declined_at on public.project_invitations
  for each row execute function public.notify_invitation_declined();

create or replace function public.decline_project_invitation(invite_token uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare invitation_row public.project_invitations%rowtype; current_email text;
begin
  if (select auth.uid()) is null then raise exception 'Sign in before responding to an invitation.'; end if;
  current_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  select * into invitation_row from public.project_invitations
  where token = invite_token and lower(email) = current_email
    and accepted_at is null and declined_at is null for update;
  if not found then raise exception 'Invitation is unavailable or has already been answered.'; end if;
  update public.project_invitations set declined_at = now() where id = invitation_row.id;
end;
$$;

revoke all on function public.decline_project_invitation(uuid) from public;
grant execute on function public.decline_project_invitation(uuid) to authenticated;

create or replace function public.accept_project_invitation(invite_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invite_row public.project_invitations%rowtype; current_email text;
begin
  if (select auth.uid()) is null then raise exception 'You must sign in before accepting an invitation.'; end if;
  current_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  select * into invite_row from public.project_invitations
  where token = invite_token and lower(email) = current_email
    and accepted_at is null and declined_at is null for update;
  if not found then raise exception 'Invitation is invalid, already answered, or belongs to another email address.'; end if;
  insert into public.project_members (project_id, user_id, role)
  values (invite_row.project_id, (select auth.uid()), 'member') on conflict (project_id, user_id) do nothing;
  update public.project_invitations set accepted_at = now() where id = invite_row.id;
  return invite_row.project_id;
end;
$$;

revoke all on function public.accept_project_invitation(uuid) from public;
grant execute on function public.accept_project_invitation(uuid) to authenticated;
