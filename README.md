# Teamcraft

Teamcraft helps project groups form around skills, interests, and availability, then keeps contributions visible to the team. It uses Next.js App Router, React, Supabase Auth, and Postgres Row Level Security.

## Run locally

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key from **Project Settings → API**. The publishable key is intended for browser use; never put a `service_role` key in this app.
3. In the Supabase SQL Editor, run [`supabase/migrations/202611160001_teamcraft_schema.sql`](supabase/migrations/202611160001_teamcraft_schema.sql).
4. Run [`supabase/migrations/202611200001_project_join_codes.sql`](supabase/migrations/202611200001_project_join_codes.sql) to enable six-digit project join codes.
5. Run [`supabase/migrations/202611200002_project_due_dates.sql`](supabase/migrations/202611200002_project_due_dates.sql) to add optional project due dates.
6. Run [`supabase/migrations/202611200003_project_github_repo.sql`](supabase/migrations/202611200003_project_github_repo.sql) to add optional GitHub repository links.
7. In **Authentication → URL Configuration**, set the site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback` as a redirect URL.
8. Restart the dev server after adding `.env.local`:

   ```bash
   npm install
   npm run dev
   ```

6. Open `http://localhost:3000`, create an account, then create a project. The database trigger gives the creator the `lead` role automatically.

## Roles and access

- **Lead:** edit project details and skill needs, share the project join code, review contributions, transfer project leadership, and remove members.
- **Member:** see their project, log contributions, and shortlist discoverable teammate profiles.

Roles are stored on `project_members`, so one user can lead one project and be a member of another. Postgres RLS policies enforce project membership and lead-only actions. UI visibility is only a convenience; database policies are the security boundary.

Project leads and members can share the project's six-digit join code. Teammates sign in, open `/join`, and enter that code. Each account can make five code attempts per 15-minute window.

Team matching uses profile skills, interests, and weekly availability. A user must opt into discovery at account creation to appear in matching.

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The app also accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY` for existing Supabase projects that have not moved to publishable keys.
