# Elevator Field Service

Multi-tenant **elevator maintenance, repair, and assembly** web application for service companies (not manufacturers). Stack: **Next.js (App Router)**, **React**, **Tailwind CSS**, **Supabase** (Postgres, Auth, Storage), deployable on **Vercel**.

Product and technical analysis: `docs/phase-1-product-domain.md` through `docs/phase-4-technical-design.md`.

Database schema: `supabase/migrations/20250326000000_initial_schema.sql`.

## Local development

```bash
npm install
cp .env.local.example .env.local
```

**Local PostgreSQL:** set `DATABASE_URL` in `.env.local` with database **`ElevatorMaintenance`**:

`postgresql://postgres:YOUR_PASSWORD@localhost:5432/ElevatorMaintenance`

Replace `YOUR_PASSWORD` with your real `postgres` user password (SCRAM requires a non-empty password). Then:

```bash
npm run db:migrate
```

Or without editing the file: `PGPASSWORD='yourpassword' npm run db:migrate` (substitutes into `YOUR_PASSWORD` in `DATABASE_URL`).

Migrations run in order from `supabase/migrations/` (local Postgres prereq first, then full schema).

**Seed a company admin (local Postgres):**

```bash
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='your-password' npm run db:seed-admin
```

Optional: `SEED_COMPANY_NAME`, `SEED_COMPANY_SLUG` (default slug `main`). Creates `auth.users` (bcrypt password), `tenants`, and `tenant_members` as `tenant_owner`. The `handle_new_user` trigger also creates `public.profiles`.

### Authentication (two modes)

1. **Local-only (default when Supabase env vars are empty)**  
   - Sign-in hits `POST /api/auth/local/login`, which checks `auth.users` in Postgres (`crypt` / bcrypt) and sets an httpOnly JWT cookie (`local_session`).  
   - Requires `DATABASE_URL`. For production builds, set `LOCAL_AUTH_SECRET` (≥32 chars). In development, a fixed dev fallback is used if unset.  
   - Server data reads use `pg` with `DATABASE_URL` (Postgres superuser connections bypass RLS — acceptable for local dev only).

2. **Supabase**  
   - Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sign-in uses `signInWithPassword`; data reads use the Supabase client where implemented.  
   - Users must exist in Supabase Auth (Dashboard or Admin API), not only in a standalone local `auth.users` table.

```bash
npm run dev
```

### Access model

There is **no public registration**. Each **elevator service company** (a *tenant* in the database — one isolated workspace per sold customer) is provisioned by you: create the Auth user and link them with `tenant_members`. Company **admins** then add employees as collaborators. See `docs/glossary-tenants-and-users.md`.

If the auth trigger for `profiles` conflicts with an existing Supabase project, merge `handle_new_user` with your current setup.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — ESLint
