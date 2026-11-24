-- Additive TeamCraft enhancement: task tracking, skill proficiency, and peer feedback.
alter table public.profiles
  add column if not exists skill_levels jsonb not null default '{}'::jsonb;

alter table public.contributions
  add column if not exists task_id uuid,
  add column if not exists evidence_url text,
  add column if not exists github_reference text;

alter table public.contributions drop constraint if exists contributions_status_check;
alter table public.contributions add constraint contributions_status_check
  check (status in ('submitted', 'reviewed', 'needs_changes', 'rejected'));

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) between 2 and 180),
  description text not null default '',
  assignee_id uuid references public.profiles(id) on delete set null,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Critical')),
  status text not null default 'To Do' check (status in ('To Do', 'In Progress', 'In Review', 'Completed')),
  due_date date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contributions drop constraint if exists contributions_task_id_fkey;
alter table public.project_tasks add constraint project_tasks_id_project_unique unique (id, project_id);
alter table public.contributions add constraint contributions_task_id_fkey
  foreign key (task_id, project_id) references public.project_tasks(id, project_id) on delete set null (task_id);

create index if not exists project_tasks_project_status_idx on public.project_tasks(project_id, status, due_date);
create index if not exists project_tasks_assignee_idx on public.project_tasks(assignee_id, project_id);

create table if not exists public.peer_evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  evaluator_id uuid not null references public.profiles(id) on delete cascade,
  evaluatee_id uuid not null references public.profiles(id) on delete cascade,
  participation smallint not null check (participation between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  reliability smallint not null check (reliability between 1 and 5),
  collaboration smallint not null check (collaboration between 1 and 5),
  responsibility smallint not null check (responsibility between 1 and 5),
  feedback text not null default '' check (length(feedback) <= 2000),
  created_at timestamptz not null default now(),
  constraint peer_evaluations_no_self check (evaluator_id <> evaluatee_id),
  constraint peer_evaluations_once unique (project_id, evaluator_id, evaluatee_id)
);

create index if not exists peer_evaluations_project_idx on public.peer_evaluations(project_id, evaluatee_id);

create or replace function public.review_contribution(contribution_id uuid, next_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_project uuid;
begin
  if next_status not in ('reviewed', 'needs_changes', 'rejected') then
    raise exception 'Review status must be reviewed, needs_changes, or rejected.';
  end if;
  select project_id into target_project from public.contributions where id = contribution_id;
  if target_project is null or not public.is_project_lead(target_project) then
    raise exception 'Only the project lead can review this contribution.';
  end if;
  update public.contributions set status = next_status, reviewed_by = (select auth.uid()), reviewed_at = now(), updated_at = now()
    where id = contribution_id;
end;
$$;

create or replace function public.update_project_task_status(task_id uuid, next_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare task_row public.project_tasks%rowtype;
begin
  if next_status not in ('To Do', 'In Progress', 'In Review', 'Completed') then
    raise exception 'Invalid task status.';
  end if;
  select * into task_row from public.project_tasks where id = task_id for update;
  if task_row.id is null or not public.is_project_member(task_row.project_id) then
    raise exception 'Task not found in your project.';
  end if;
  if not public.is_project_lead(task_row.project_id) and task_row.assignee_id is distinct from (select auth.uid()) then
    raise exception 'Only the assignee or project lead can update this task.';
  end if;
  update public.project_tasks set status = next_status, updated_at = now() where id = task_id;
end;
$$;

create or replace function public.project_peer_summaries(target_project uuid)
returns table (
  evaluatee_id uuid,
  response_count bigint,
  participation numeric,
  communication numeric,
  reliability numeric,
  collaboration numeric,
  responsibility numeric
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_project_member(target_project) then
    raise exception 'You must be a project member to view team summaries.';
  end if;
  return query
    select pe.evaluatee_id, count(*)::bigint,
      round(avg(pe.participation)::numeric, 1), round(avg(pe.communication)::numeric, 1),
      round(avg(pe.reliability)::numeric, 1), round(avg(pe.collaboration)::numeric, 1),
      round(avg(pe.responsibility)::numeric, 1)
    from public.peer_evaluations pe
    where pe.project_id = target_project
    group by pe.evaluatee_id
    having count(*) >= 3;
end;
$$;

alter table public.project_tasks enable row level security;
alter table public.peer_evaluations enable row level security;

drop policy if exists "Project members can read tasks" on public.project_tasks;
create policy "Project members can read tasks" on public.project_tasks
  for select to authenticated using (public.is_project_member(project_id));
drop policy if exists "Project members can create tasks" on public.project_tasks;
create policy "Project members can create tasks" on public.project_tasks
  for insert to authenticated with check (
    created_by = (select auth.uid()) and public.is_project_lead(project_id)
    and (assignee_id is null or exists (
      select 1 from public.project_members pm where pm.project_id = project_tasks.project_id and pm.user_id = assignee_id
    ))
  );
drop policy if exists "Assignees and leads can update tasks" on public.project_tasks;
drop policy if exists "Leads can delete tasks" on public.project_tasks;
create policy "Leads can delete tasks" on public.project_tasks
  for delete to authenticated using (public.is_project_lead(project_id));

drop policy if exists "Evaluators can read their private feedback" on public.peer_evaluations;
create policy "Evaluators can read their private feedback" on public.peer_evaluations
  for select to authenticated using (evaluator_id = (select auth.uid()));
drop policy if exists "Project members can submit peer feedback" on public.peer_evaluations;
create policy "Project members can submit peer feedback" on public.peer_evaluations
  for insert to authenticated with check (
    evaluator_id = (select auth.uid()) and evaluator_id <> evaluatee_id
    and public.is_project_member(project_id)
    and exists (select 1 from public.project_members pm where pm.project_id = peer_evaluations.project_id and pm.user_id = peer_evaluations.evaluatee_id)
  );
drop policy if exists "Evaluators can delete their feedback" on public.peer_evaluations;
create policy "Evaluators can delete their feedback" on public.peer_evaluations
  for delete to authenticated using (evaluator_id = (select auth.uid()));

revoke update on public.project_tasks from authenticated;
grant select, insert, delete on public.project_tasks to authenticated;
revoke all on function public.update_project_task_status(uuid, text) from public;
grant execute on function public.update_project_task_status(uuid, text) to authenticated;
revoke all on function public.project_peer_summaries(uuid) from public;
grant execute on function public.project_peer_summaries(uuid) to authenticated;
grant select, insert, delete on public.peer_evaluations to authenticated;
