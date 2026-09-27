# Nudge

*Log every set. Nudge it up.*

A fast, focused workout log for the gym floor. Built phone-first, with a full desktop layout too. No feeds, no clutter: pick a routine, and today's sets are already filled in from last time. Beat them by a little, tick them off, finish.

Progress comes from small, steady increases: 2.5 kg more, one extra rep. Nudge is built around that. Every set shows what you did last time, and you get a nudge when you beat it.

## Highlights

- **Pre-filled from last time.** Each exercise shows only its last session, and today's sets start from it.
- **See progress as you lift.** "↑ +2.5 kg vs last" on sets that beat last time, and a **PR** badge for all-time bests.
- **Made for sweaty thumbs.** A +/− bar above the keyboard steps weight or reps and jumps to the next field, with big tap targets and undo for anything you remove.
- **Instant and offline-tolerant.** Screens render from a local cache, and an in-progress workout survives reloads, a locked phone and bad signal.
- **Works everywhere.** Phone, tablet or desktop. Install it to your home screen, and use light or dark mode.

## Features

### At the gym
- **Live workout** from a routine or from scratch, pre-filled from each exercise's last session.
- **Today-only changes:** add, remove, skip or reorder exercises and sets without touching the routine. Removals can be undone.
- **+/− bar** above the phone keyboard: steps weight (2.5 kg / 5 lb), reps, time or incline, with a **Next** button. On desktop, the arrow keys step.
- **Two exercise types:** strength (weight × reps) and timed (duration, with optional incline for treadmills, hills and stairs).
- **Smart finish:** if you ticked or edited some sets and left others as they were, you choose whether to save only the ones you did.
- **Forgotten workouts:** a workout left idle for hours prompts you to save it (at the time of your last edit), resume it or discard it.
- **Every edit is saved on the device instantly,** so nothing is lost between sets.

### Progress
- **Beat-last-time markers** and **PR badges** while you lift, computed against your full history.
- **Finish summary:** exercises, sets, volume, how many sets beat last time, and any new personal records.
- **Exercise pages:** the all-time best set, estimated 1RM, and a progress chart of your best set each session. Bodyweight exercises chart reps and timed ones chart duration.
- **Weekly goal:** aim for 1–7 workouts a week. Home shows this week's progress and your streak.

### Routines and exercises
- **Routines:** create, rename, reorder, set default sets per exercise, preview, then start.
- **Exercise library:** search, and tag exercises by muscle group (Chest, Back, Shoulders, Arms, Legs, Core, Cardio, Full body) to filter the library and the picker.
- **Example routines:** Push, Pull and Leg Day with 15 tagged exercises, to get going in one tap.

### History
- **Every workout,** grouped by month and loaded as you scroll. Search by name and filter by routine (or custom workouts).
- **Edit or delete a finished workout** to fix a typo or a wrong set. Pre-fills, bests and charts update to match.

### Settings and accounts
- **kg or lb,** saved to your account. Weights are always stored in kg, so switching never changes your history.
- **Email-only sign-in** with no passwords. A new email must be confirmed before an account is created, likely typos ("gmial.com") get a "Did you mean …?" suggestion, and the last email is remembered on the device.
- **Light, dark or system theme.**
- **Installable** with its own icon, and opens full-screen from the home screen.

## Tech stack

| | |
|---|---|
| **App** | Next.js 16 (App Router) · React 19 · TypeScript |
| **UI** | Tailwind CSS v4 · shadcn/ui (Radix) · lucide icons · sonner toasts |
| **Backend** | Supabase: Postgres, Auth, Row Level Security, SQL functions |
| **Local data** | Dexie (IndexedDB) |
| **Hosting** | Vercel |

## How it works

```
 Screen ──reads──▶ IndexedDB cache (Dexie) ◀──refresh── Supabase
    │                                                     ▲
    └──────────────────────writes─────────────────────────┘
```

- **Reads are local.** Screens read from IndexedDB through live queries, so they render instantly and keep working on a weak connection. The cache refreshes from Supabase on launch, when the app regains focus, and when the device comes back online.
- **Writes go to Supabase first,** then update the cache.
- **A live workout stays on the device** until you finish it, then it's saved in one transaction (`save_session`). Saves use client-generated ids and are idempotent, so a retried save never duplicates a workout.
- **Pure logic is kept separate** (`lib/workout/`): pre-filling, finish rules, "beat last time" and PR detection, weekly streaks and unit conversion are plain functions with no UI or database code.
- **Security is enforced by the database.** Every table has Row Level Security, so each user can only read and write their own rows, whatever the client does.

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

⚠️ Never put the `service_role` / secret key in this app.

To try it on your phone, open `http://<your-computer's-ip>:3000` on the same Wi-Fi.

| Script | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (includes type checking) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check only |

## Supabase setup

1. **Auth:** Authentication → Sign In / Providers → **Email**. Keep it enabled and turn **off** "Confirm email".
2. **Database:** SQL Editor → New query. Paste all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. This creates every table, security policy and function. Run it once, on a new, empty project.
3. **URL configuration** (once deployed): Authentication → URL Configuration.
   - **Site URL:** the app's URL.
   - **Redirect URLs:** add `<app-url>/**` and `http://localhost:3000/**`.

### Data model

```
auth.users
 ├─ exercises           name, kind ('strength' | 'timed'), track_incline, muscle_groups
 ├─ workout_templates   name                                       ← routines
 │   └─ template_exercises → exercises    position, default_sets
 └─ workout_sessions    name (snapshot), started_at, completed_at, status, template_id (nullable)
     └─ session_exercises → exercises     position, status ('pending' | 'completed' | 'skipped')
         └─ sets        set_number, weight (kg), reps, duration_seconds, incline, completed
```

- **Every table has `user_id`**, which defaults to `auth.uid()`. Row Level Security allows each user to see and change only their own rows.
- **Composite foreign keys** (`parent_id`, `user_id`) stop a row from ever referencing another user's data.
- **Workouts are snapshots.** Deleting a routine keeps its past workouts. Exercises that have history can't be deleted.
- **Each set needs its main measure:** `reps` (strength) or `duration_seconds` (timed).
- **Database functions** (all `security invoker`, so Row Level Security still applies):
  - `get_last_sessions(ids)`: the most recent completed session with sets, for each exercise (pre-fill).
  - `get_exercise_bests(ids)`: all-time bests per exercise (estimated 1RM, heaviest weight, most bodyweight reps, longest time), for PR badges.
  - `save_session(p)`: saves a finished workout with its exercises and sets in one transaction. It's idempotent.
  - `update_session(p)`: edits a finished workout in one transaction.
  - `save_template(id, name, items)`: creates or updates a routine and its exercise list in one go.

## Project structure

```
app/
  login/                     Sign-in (email, typo check, confirm-before-create)
  (authed)/                  Signed-in area: SessionProvider resolves the user and syncs the cache
    (tabs)/                  Screens with navigation (bottom tabs on phones, sidebar on desktop)
      page.tsx               Home: today's routine, weekly goal, recent workouts
      workouts/              Routines tab: list, preview and editor
      exercises/             Exercise library, and each exercise's chart and history
      history/               Every finished workout: paged, searchable, filterable
      sessions/[id]/         One finished workout: summary, edit, delete
      settings/              Theme, units, weekly goal, account
    workout/                 The live workout (focused, no navigation) and its finish summary
  manifest.ts, icon.tsx, apple-icon.tsx   Installable app: manifest and generated icons
components/                  UI only; no direct database access
  ui/                        shadcn/ui primitives
  workout/                   Exercise blocks, set rows, +/− bar, finish and forgotten-workout dialogs
  exercises/ templates/      Library, picker, exercise dialog, progress chart; routine editor and preview
  home/ login/               Weekly progress; login app preview
  nav/ layout/ common/       Navigation, account menu, page shell, skeletons, shared dialogs and tiles
  providers/                 Session, first-sync gate, keyboard tracking
lib/
  repositories/              The only code that talks to Supabase (with friendly error messages)
  supabase/                  Supabase clients (browser and proxy) and config
  db/                        Dexie schema and TypeScript types
  sync/                      Server → local cache refresh
  workout/                   Pure logic: pre-fill, draft edits, finish rules, progress and PRs, weekly streaks
  hooks/                     Reactive read hooks over the local cache
  auth/                      Sign-in, account creation, email typo suggestions
  preferences.ts, units.ts   Per-account settings (kg/lb, weekly goal); unit conversion
  muscleGroups.ts, format.ts Tag list; display formatting for dates, sets and durations
supabase/schema.sql          The complete database schema
proxy.ts                     Next.js proxy: session refresh and sign-in redirect
```

## Deploying

Nudge is built for **Vercel**:

1. Import the GitHub repo into Vercel. It detects Next.js automatically.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables for Production, Preview and Development. Redeploy after changing them.
3. For a custom domain, add it under Vercel → Settings → Domains and create the CNAME record it shows at your DNS provider. On Cloudflare, set it to **DNS only**.
4. Set the Supabase Site URL and Redirect URLs (see [Supabase setup](#supabase-setup)).

Every push to `main` redeploys automatically.

## Good to know

- **Email-only sign-in is convenient, not secure:** anyone who knows a user's email can sign in as them. It suits a personal or trusted-group app. Once your users have signed up, you can turn off "Allow new users to sign up" in Supabase. Everything credential-related lives in `lib/auth/auth.ts`, so stronger sign-in (passwords or one-time codes) is a contained change.
- **An in-progress workout lives on the device where it was started.** Finished workouts sync everywhere.
- **Saving needs a connection.** Screens work from the cache offline, and a workout that can't be saved stays safe on the device until it can.
- **Supabase free-tier projects pause** after about a week of inactivity. Resume them from the dashboard.
