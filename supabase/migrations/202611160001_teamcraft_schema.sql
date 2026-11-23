-- Teamcraft schema: project-scoped roles and shared project data.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  weekly_hours integer not null default 0 check (weekly_hours between 0 and 168),
  discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 100),
  description text not null default '',
  interests text[] not null default '{}',
  weekly_hours_needed integer not null default 0 check (weekly_hours_needed between 0 and 168),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('lead', 'member')),
  joined_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_skills (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  skill text not null check (length(trim(skill)) between 1 and 80),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (project_id, skill)
);

create table if not exists public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  role text not null default 'member' check (role = 'member'),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, email)
);

create table if not exists public.project_shortlists (
  project_id uuid not null references public.projects(id) on delete cascade,
  shortlisted_by uuid not null references public.profiles(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, shortlisted_by, candidate_id),
  check (shortlisted_by <> candidate_id)
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  title text not null check (length(trim(title)) between 2 and 240),
  category text not null check (length(trim(category)) between 1 and 60),
  minutes integer not null check (minutes between 0 and 10080),
  notes text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'needs_changes')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_members_user_idx on public.project_members(user_id, project_id);
create index if not exists project_skills_project_idx on public.project_skills(project_id);
create index if not exists project_invitations_email_idx on public.project_invitations(lower(email));
create index if not exists contributions_project_created_idx on public.contributions(project_id, created_at desc);
create index if not exists contributions_user_idx on public.contributions(user_id, project_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  update public.profiles
  set skills = coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'skills', '[]'::jsonb))), '{}'),
      interests = coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'interests', '[]'::jsonb))), '{}'),
      weekly_hours = coalesce((new.raw_user_meta_data ->> 'weekly_hours')::integer, 0),
      discoverable = coalesce((new.raw_user_meta_data ->> 'discoverable')::boolean, false),
      display_name = coalesce(new.raw_user_meta_data ->> 'display_name', '')
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_teamcraft on auth.users;
create trigger on_auth_user_created_teamcraft
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.add_project_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'lead');
  return new;
end;
$$;

-- Create projects from the authenticated session so created_by cannot drift
-- from the identity checked by Row Level Security.
create or replace function public.create_project(
  project_name text,
  project_description text default '',
  project_interests text[] default '{}',
  project_hours_needed integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_project_id uuid;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'You must sign in before creating a project.';
  end if;

  insert into public.projects (name, description, interests, weekly_hours_needed, created_by)
  values (project_name, coalesce(project_description, ''), coalesce(project_interests, '{}'), coalesce(project_hours_needed, 0), current_user_id)
  returning id into new_project_id;

  return new_project_id;
end;
$$;

drop trigger if exists on_project_created_add_lead on public.projects;
create trigger on_project_created_add_lead
  after insert on public.projects
  for each row execute procedure public.add_project_lead();

create or replace function public.is_project_member(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = target_project and pm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_project_lead(target_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = target_project
      and pm.user_id = (select auth.uid())
      and pm.role = 'lead'
  );
$$;

create or replace function public.users_share_project(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members mine
    join public.project_members theirs using (project_id)
    where mine.user_id = (select auth.uid()) and theirs.user_id = target_user
  );
$$;

revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.is_project_lead(uuid) from public;
revoke all on function public.users_share_project(uuid) from public;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.is_project_lead(uuid) to authenticated;
grant execute on function public.users_share_project(uuid) to authenticated;

create or replace function public.accept_project_invitation(invite_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_row public.project_invitations%rowtype;
  current_email text;
begin
  if (select auth.uid()) is null then
    raise exception 'You must sign in before accepting an invitation.';
  end if;

  current_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  select * into invite_row
  from public.project_invitations
  where token = invite_token and lower(email) = current_email and accepted_at is null
  for update;

  if not found then
    raise exception 'Invitation is invalid, already accepted, or belongs to another email.';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (invite_row.project_id, (select auth.uid()), 'member')
  on conflict (project_id, user_id) do nothing;

  update public.project_invitations set accepted_at = now() where id = invite_row.id;
  return invite_row.project_id;
end;
$$;

create or replace function public.review_contribution(contribution_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project uuid;
begin
  if next_status not in ('reviewed', 'needs_changes') then
    raise exception 'Review status must be reviewed or needs_changes.';
  end if;

  select project_id into target_project
  from public.contributions where id = contribution_id;

  if target_project is null or not public.is_project_lead(target_project) then
    raise exception 'Only the project lead can review this contribution.';
  end if;

  update public.contributions
  set status = next_status, reviewed_by = (select auth.uid()), reviewed_at = now(), updated_at = now()
  where id = contribution_id;
end;
$$;

create or replace function public.transfer_project_lead(target_project uuid, next_lead uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_lead(target_project) then
    raise exception 'Only the current project lead can transfer leadership.';
  end if;
  if next_lead = (select auth.uid()) then
    raise exception 'You are already the project lead.';
  end if;
  if not exists (
    select 1 from public.project_members
    where project_id = target_project and user_id = next_lead and role = 'member'
  ) then
    raise exception 'The new lead must already be a project member.';
  end if;

  update public.project_members set role = 'member'
  where project_id = target_project and user_id = (select auth.uid()) and role = 'lead';
  update public.project_members set role = 'lead'
  where project_id = target_project and user_id = next_lead;
end;
$$;

revoke all on function public.accept_project_invitation(uuid) from public;
revoke all on function public.review_contribution(uuid, text) from public;
revoke all on function public.transfer_project_lead(uuid, uuid) from public;
revoke all on function public.create_project(text, text, text[], integer) from public;
grant execute on function public.accept_project_invitation(uuid) to authenticated;
grant execute on function public.review_contribution(uuid, text) to authenticated;
grant execute on function public.transfer_project_lead(uuid, uuid) to authenticated;
grant execute on function public.create_project(text, text, text[], integer) to authenticated;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_skills enable row level security;
alter table public.project_invitations enable row level security;
alter table public.project_shortlists enable row level security;
alter table public.contributions enable row level security;

drop policy if exists "Users can read profiles in their projects" on public.profiles;
create policy "Users can read profiles in their projects"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.users_share_project(id) or discoverable);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Members can read their projects" on public.projects;
create policy "Members can read their projects"
  on public.projects for select to authenticated
  using (
    public.is_project_member(id)
    or exists (
      select 1 from public.project_invitations invitation
      where invitation.project_id = id and invitation.accepted_at is null
        and lower(invitation.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  );
drop policy if exists "Authenticated users can create projects" on public.projects;
create policy "Authenticated users can create projects"
  on public.projects for insert to authenticated
  with check (created_by = (select auth.uid()));
drop policy if exists "Project leads can update their project" on public.projects;
create policy "Project leads can update their project"
  on public.projects for update to authenticated
  using (public.is_project_lead(id)) with check (public.is_project_lead(id));
drop policy if exists "Project leads can delete their project" on public.projects;
create policy "Project leads can delete their project"
  on public.projects for delete to authenticated
  using (public.is_project_lead(id));

drop policy if exists "Members can read project memberships" on public.project_members;
create policy "Members can read project memberships"
  on public.project_members for select to authenticated
  using (public.is_project_member(project_id));
drop policy if exists "Leads can add project members" on public.project_members;
create policy "Leads can add project members"
  on public.project_members for insert to authenticated
  with check (role = 'member' and public.is_project_lead(project_id));
drop policy if exists "Leads can remove project members" on public.project_members;
create policy "Leads can remove project members"
  on public.project_members for delete to authenticated
  using (role = 'member' and public.is_project_lead(project_id));

drop policy if exists "Members can read project skills" on public.project_skills;
create policy "Members can read project skills"
  on public.project_skills for select to authenticated
  using (public.is_project_member(project_id));
drop policy if exists "Leads can add project skills" on public.project_skills;
create policy "Leads can add project skills"
  on public.project_skills for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_project_lead(project_id));
drop policy if exists "Leads can update project skills" on public.project_skills;
create policy "Leads can update project skills"
  on public.project_skills for update to authenticated
  using (public.is_project_lead(project_id)) with check (public.is_project_lead(project_id));
drop policy if exists "Leads can remove project skills" on public.project_skills;
create policy "Leads can remove project skills"
  on public.project_skills for delete to authenticated
  using (public.is_project_lead(project_id));

drop policy if exists "Members and invitees can read invitations" on public.project_invitations;
create policy "Members and invitees can read invitations"
  on public.project_invitations for select to authenticated
  using (
    public.is_project_member(project_id)
    or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
drop policy if exists "Project leads can create member invitations" on public.project_invitations;
create policy "Project leads can create member invitations"
  on public.project_invitations for insert to authenticated
  with check (
    invited_by = (select auth.uid()) and role = 'member'
    and email = lower(trim(email)) and public.is_project_lead(project_id)
  );
drop policy if exists "Project leads can cancel pending invitations" on public.project_invitations;
create policy "Project leads can cancel pending invitations"
  on public.project_invitations for delete to authenticated
  using (accepted_at is null and public.is_project_lead(project_id));

drop policy if exists "Project members can read their shortlist" on public.project_shortlists;
create policy "Project members can read their shortlist"
  on public.project_shortlists for select to authenticated
  using (public.is_project_member(project_id));
drop policy if exists "Project members can shortlist discoverable profiles" on public.project_shortlists;
create policy "Project members can shortlist discoverable profiles"
  on public.project_shortlists for insert to authenticated
  with check (
    shortlisted_by = (select auth.uid())
    and public.is_project_member(project_id)
    and exists (select 1 from public.profiles p where p.id = candidate_id and p.discoverable)
  );
drop policy if exists "Users can remove their own shortlist entries" on public.project_shortlists;
create policy "Users can remove their own shortlist entries"
  on public.project_shortlists for delete to authenticated
  using (shortlisted_by = (select auth.uid()) and public.is_project_member(project_id));

drop policy if exists "Members can read project contributions" on public.contributions;
create policy "Members can read project contributions"
  on public.contributions for select to authenticated
  using (public.is_project_member(project_id));
drop policy if exists "Members can submit their own contributions" on public.contributions;
create policy "Members can submit their own contributions"
  on public.contributions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'submitted' and public.is_project_member(project_id));
drop policy if exists "Authors can edit their unreviewed contributions" on public.contributions;
create policy "Authors can edit their unreviewed contributions"
  on public.contributions for update to authenticated
  using (user_id = (select auth.uid()) and status = 'submitted')
  with check (user_id = (select auth.uid()) and status = 'submitted' and public.is_project_member(project_id));
drop policy if exists "Authors can delete their unreviewed contributions" on public.contributions;
create policy "Authors can delete their unreviewed contributions"
  on public.contributions for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'submitted');

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, delete on public.project_members to authenticated;
grant select, insert, update, delete on public.project_skills to authenticated;
grant select, insert, delete on public.project_invitations to authenticated;
grant select, insert, delete on public.project_shortlists to authenticated;
grant select, insert, update, delete on public.contributions to authenticated;
