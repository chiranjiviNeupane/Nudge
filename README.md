# Record

A fast, minimal workout tracker, built mainly for your phone at the gym and usable in a desktop browser too.

Pick a routine and start. Each exercise shows only your **last session**, and today's sets are pre-filled from it. Adjust, tick sets off, and finish.

## Features

- **Routines (templates):** create, rename, reorder exercises, set default sets per exercise, delete.
- **Live workout:**
  - Pre-filled from each exercise's last session.
  - Add, remove or skip exercises and sets for today only. The routine never changes.
  - Every edit is saved on the device instantly, so a reload or locked phone loses nothing.
- **Two exercise types:**
  - **Strength:** weight × reps.
  - **Timed:** duration, with optional incline (treadmill, hill, stairs). Planks and similar are time only.
- **Smart finish:** if some sets were updated or ticked and others left untouched, you're asked whether to save all of them or only the ones you did.
- **Forgotten workouts:** an unfinished workout idle for 3+ hours (or 1+ hour if started on an earlier day) triggers a prompt: Save it, Resume or Discard. Save it uses the time of your last edit.
- **History:**
  - Tap a workout in "Recent" on Home to see its summary.
  - Tap an exercise to see its full history.
- **Accounts:** email-only sign-in. The same data is available on every device.
- **Light and dark themes** (follows the system by default).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres, Auth, Row Level Security) · Dexie (IndexedDB)

## Getting started

Requirements: Node.js 20.9 or newer, and a Supabase project (see below).

```bash
npm install
cp .env.local.example .env.local   # then fill in the two values
npm run dev                        # http://localhost:3000
```

`.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable / anon key>
```

Find both in **Supabase → Project Settings → API Keys**. Use the Project URL only, without `/rest/v1`.

⚠️ Never use the `service_role` / secret key in this app.

To open the dev server from a phone on the same Wi-Fi, use `http://<your-pc-ip>:3000`.

| Script | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (includes type checking) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check only |

## Supabase setup

1. **Auth:** Authentication → Sign In / Providers → **Email**. Keep it enabled and turn **off** "Confirm email".
2. **Database:** for a **new** project, open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. It creates every table, security policy and function described below. The current project already has it, so don't run it there.
3. **URL configuration** (when deployed): Authentication → URL Configuration.
   - **Site URL:** the app's URL.
   - **Redirect URLs:** add `<app-url>/**` and `http://localhost:3000/**`.

### Data model (`supabase/schema.sql`)

```
auth.users
 ├─ exercises           name, kind ('strength' | 'timed'), track_incline
 ├─ workout_templates   name
 │   └─ template_exercises → exercises    position, default_sets
 └─ workout_sessions    name (snapshot), started_at, completed_at, status, template_id (nullable)
     └─ session_exercises → exercises     position, status ('pending' | 'completed' | 'skipped')
         └─ sets        set_number, weight, reps, duration_seconds, incline, completed
```

- **Every table has `user_id`**, which defaults to `auth.uid()`. Row Level Security allows each user to see and change only rows where `user_id = auth.uid()`.
- **Composite foreign keys** (`parent_id`, `user_id`) stop rows from referencing another user's data.
- **Sessions are snapshots.** Deleting a routine keeps past sessions (`template_id` is set to null). Exercises that have history can't be deleted.
- **Each set must have** `reps` (strength) or `duration_seconds` (timed).
- **Database functions** (all `security invoker`, so RLS applies):
  - `get_last_sessions(exercise_ids uuid[])`: the most recent completed, non-skipped session with sets for each exercise.
  - `save_session(p jsonb)`: saves a finished workout, its exercises and its sets in one transaction. It's idempotent on the client-generated session id.
  - `save_template(p_id uuid, p_name text, p_items jsonb)`: creates or updates a routine and replaces its exercise list atomically.

## How the code is organized

```
app/
  login/                     Email-only sign-in
  (authed)/                  Signed-in area (SessionProvider: user + local cache sync)
    (tabs)/                  Screens with navigation (bottom bar on mobile, sidebar on desktop)
      page.tsx               Home: today's suggested routine, recent workouts
      workouts/              Routine list and editor
      exercises/             Exercise library and per-exercise history
      sessions/[id]/         Summary of one finished workout
      settings/              Theme and account
    workout/                 The live workout screen (focused, no navigation)
components/                  UI only. No direct database access.
  ui/                        shadcn/ui primitives (button, dialog, sheet, menu…)
  workout/                   Live workout: exercise blocks, set rows, finish and unfinished-workout dialogs
  exercises/ templates/      Exercise picker and create/edit dialog; routine editor
  nav/ layout/ common/       Navigation, account menu, page shell, shared dialogs
  providers/                 Signed-in session and first-sync gate
lib/
  repositories/              The only code that talks to Supabase
  supabase/                  Supabase clients (browser + proxy) and config
  db/                        Dexie (IndexedDB) schema and TypeScript types
  sync/                      Server → local cache refresh
  workout/                   Pure logic: pre-fill, draft edits, finish rules, staleness, suggestions
  hooks/                     Reactive read hooks over the local cache
  auth/                      Sign-in (email-only)
  navigation/                "Back" targets for the exercise history page
  format.ts, id.ts           Display formatting (dates, sets, durations); UUIDs
supabase/schema.sql          Complete database schema (for setting up a new project)
proxy.ts                     Next.js 16 proxy (formerly middleware): session refresh and login redirect
```

- **Reads:** screens read from IndexedDB, so they render instantly. The cache is refreshed from Supabase on load, when the tab regains focus, and when the device comes back online.
- **Writes:** writes go to Supabase first, then update the cache.
- **Live workout:** stored only on the device until you tap Finish, then saved with one `save_session` call.
- **Offline:** screens work from the cache without a connection, but saving needs one. Saves use client-generated IDs and are idempotent, so an offline save queue can be added later without server changes.

## Deploying

The app is built for **Vercel**:

1. Import the GitHub repo into Vercel. It detects Next.js automatically.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables for Production, Preview and Development. Redeploy after changing them.
3. For a custom subdomain:
   - Add it under Vercel → Settings → Domains.
   - Create the CNAME record it shows at your DNS provider. On Cloudflare, set it to **DNS only**.
4. Set the Supabase Site URL and Redirect URLs (see above).

Every push to `main` redeploys automatically.

## Notes

- **Email-only sign-in isn't secure.** Anyone who knows a user's email can sign in as them. Once your users have signed up, consider disabling "Allow new users to sign up" in Supabase. Stronger sign-in only needs changes in `lib/auth/auth.ts` and the login page.
- **Supabase free-tier projects pause** after about a week of inactivity. Resume them from the dashboard.
- **An in-progress workout lives only on the device where it was started.** Finished workouts sync everywhere.
