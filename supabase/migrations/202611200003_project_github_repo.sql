-- Optional GitHub repository link for each project.
alter table public.projects
  add column if not exists github_repo_url text;

alter table public.projects
  drop constraint if exists projects_github_repo_url_format;

alter table public.projects
  add constraint projects_github_repo_url_format
  check (
    github_repo_url is null
    or github_repo_url ~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(\.git)?/?$'
  );
