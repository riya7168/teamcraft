-- Optional project deadline, editable through the existing project-lead policy.
alter table public.projects
  add column if not exists due_date date;
