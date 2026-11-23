-- Give each project a shareable six-digit join code.
alter table public.projects add column if not exists join_code text;

do $$
declare
  project_row record;
  next_code text;
begin
  for project_row in select id from public.projects where join_code is null or join_code !~ '^[0-9]{6}$' loop
    loop
      next_code := lpad(floor(random() * 1000000)::integer::text, 6, '0');
      exit when not exists (select 1 from public.projects where join_code = next_code);
    end loop;
    update public.projects set join_code = next_code where id = project_row.id;
  end loop;
end;
$$;

alter table public.projects alter column join_code set not null;
create unique index if not exists projects_join_code_key on public.projects(join_code);
alter table public.projects drop constraint if exists projects_join_code_format;
alter table public.projects add constraint projects_join_code_format check (join_code ~ '^[0-9]{6}$');

-- Keep failed guesses from being tried repeatedly by the same account.
create table if not exists public.project_join_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null default now()
);
alter table public.project_join_attempts enable row level security;
revoke all on public.project_join_attempts from anon, authenticated;

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
  new_join_code text;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'You must sign in before creating a project.';
  end if;

  loop
    new_join_code := lpad(floor(random() * 1000000)::integer::text, 6, '0');
    exit when not exists (select 1 from public.projects where join_code = new_join_code);
  end loop;

  insert into public.projects (name, description, interests, weekly_hours_needed, created_by, join_code)
  values (project_name, coalesce(project_description, ''), coalesce(project_interests, '{}'), coalesce(project_hours_needed, 0), current_user_id, new_join_code)
  returning id into new_project_id;

  return new_project_id;
end;
$$;

create or replace function public.join_project_with_code(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  attempts integer;
  target_project uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in before entering a project code.';
  end if;

  insert into public.project_join_attempts (user_id, attempt_count, window_started_at)
  values (current_user_id, 1, now())
  on conflict (user_id) do update
    set attempt_count = case
          when public.project_join_attempts.window_started_at < now() - interval '15 minutes' then 1
          else public.project_join_attempts.attempt_count + 1
        end,
        window_started_at = case
          when public.project_join_attempts.window_started_at < now() - interval '15 minutes' then now()
          else public.project_join_attempts.window_started_at
        end
  returning attempt_count into attempts;

  if attempts > 5 then
    return null;
  end if;

  if code !~ '^[0-9]{6}$' then
    return null;
  end if;

  select id into target_project from public.projects where join_code = code;
  if target_project is null then
    return null;
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (target_project, current_user_id, 'member')
  on conflict (project_id, user_id) do nothing;

  return target_project;
end;
$$;

revoke all on function public.create_project(text, text, text[], integer) from public, anon;
revoke all on function public.join_project_with_code(text) from public, anon;
grant execute on function public.create_project(text, text, text[], integer) to authenticated;
grant execute on function public.join_project_with_code(text) to authenticated;
