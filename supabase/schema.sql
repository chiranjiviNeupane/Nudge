-- Record — complete database schema.
-- Run once, in full, in the Supabase SQL editor of a NEW project.
-- (The existing project already has all of this.)
--
-- Every table carries user_id (defaulting to auth.uid()) so Row Level Security
-- is a simple equality check. Child tables use composite foreign keys
-- (parent_id, user_id) so a row can only ever reference a parent owned by the
-- same user.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Exercises
-- kind: 'strength' (weight × reps) or 'timed' (duration)
-- track_incline: timed exercises that also record incline (treadmill, hill)
-- ---------------------------------------------------------------------------

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  kind text not null default 'strength' check (kind in ('strength', 'timed')),
  track_incline boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create unique index exercises_user_name_key on public.exercises (user_id, lower(name));

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Workout templates (routines)
-- ---------------------------------------------------------------------------

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index workout_templates_user_idx on public.workout_templates (user_id, created_at);

create trigger workout_templates_set_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();

create table public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid not null,
  exercise_id uuid not null,
  position integer not null check (position >= 0),
  default_sets integer not null default 3 check (default_sets between 1 and 20),
  created_at timestamptz not null default now(),
  foreign key (template_id, user_id)
    references public.workout_templates (id, user_id) on delete cascade,
  foreign key (exercise_id, user_id)
    references public.exercises (id, user_id) on delete restrict,
  unique (template_id, exercise_id)
);

create index template_exercises_template_idx on public.template_exercises (template_id, position);
create index template_exercises_exercise_idx on public.template_exercises (exercise_id);
create index template_exercises_user_idx on public.template_exercises (user_id);

-- ---------------------------------------------------------------------------
-- Workout sessions (snapshots of what actually happened)
-- ---------------------------------------------------------------------------

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id uuid,
  -- Snapshot of the workout name at the time, so history survives renames/deletes.
  name text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  unique (id, user_id),
  foreign key (template_id, user_id)
    references public.workout_templates (id, user_id) on delete set null (template_id),
  check (status <> 'completed' or completed_at is not null)
);

create index workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc);

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid not null,
  position integer not null check (position >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (session_id, user_id)
    references public.workout_sessions (id, user_id) on delete cascade,
  foreign key (exercise_id, user_id)
    references public.exercises (id, user_id) on delete restrict
);

create index session_exercises_session_idx on public.session_exercises (session_id, position);
create index session_exercises_user_exercise_idx on public.session_exercises (user_id, exercise_id);

-- Strength sets use weight (null = bodyweight) + reps; timed sets use
-- duration_seconds (+ optional incline). Every set needs one or the other.
create table public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_exercise_id uuid not null,
  set_number integer not null check (set_number >= 1),
  weight numeric(6, 2) check (weight is null or weight >= 0),
  reps integer check (reps is null or reps >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  incline numeric(4, 1) check (incline is null or incline between -20 and 100),
  notes text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (session_exercise_id, user_id)
    references public.session_exercises (id, user_id) on delete cascade,
  unique (session_exercise_id, set_number),
  constraint sets_has_measure check (reps is not null or duration_seconds is not null)
);

create index sets_user_idx on public.sets (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: every user sees and writes only their own rows.
-- ---------------------------------------------------------------------------

alter table public.exercises          enable row level security;
alter table public.workout_templates  enable row level security;
alter table public.template_exercises enable row level security;
alter table public.workout_sessions   enable row level security;
alter table public.session_exercises  enable row level security;
alter table public.sets               enable row level security;

create policy "Own exercises" on public.exercises
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Own templates" on public.workout_templates
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Own template exercises" on public.template_exercises
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Own sessions" on public.workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Own session exercises" on public.session_exercises
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Own sets" on public.sets
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.exercises, public.workout_templates, public.template_exercises,
  public.workout_sessions, public.session_exercises, public.sets from anon;
grant select, insert, update, delete on public.exercises, public.workout_templates,
  public.template_exercises, public.workout_sessions, public.session_exercises,
  public.sets to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: most recent completed session per exercise (for the workout screen).
-- security invoker => RLS still applies.
-- ---------------------------------------------------------------------------

create or replace function public.get_last_sessions(p_exercise_ids uuid[])
returns table (exercise_id uuid, session_id uuid, completed_at timestamptz, sets jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct on (se.exercise_id)
    se.exercise_id,
    ws.id,
    ws.completed_at,
    (
      select jsonb_agg(
        jsonb_build_object(
          'set_number', s.set_number,
          'weight', s.weight,
          'reps', s.reps,
          'duration_seconds', s.duration_seconds,
          'incline', s.incline
        )
        order by s.set_number
      )
      from public.sets s
      where s.session_exercise_id = se.id
    )
  from public.session_exercises se
  join public.workout_sessions ws on ws.id = se.session_id
  where se.user_id = (select auth.uid())
    and se.exercise_id = any (p_exercise_ids)
    and ws.status = 'completed'
    and se.status <> 'skipped'
    and exists (select 1 from public.sets s where s.session_exercise_id = se.id)
  order by se.exercise_id, ws.completed_at desc, se.position;
$$;

-- ---------------------------------------------------------------------------
-- RPC: save a finished session atomically. Idempotent on the session id so a
-- retried request (e.g. from a future offline outbox) never duplicates data.
--
-- p = {
--   id, template_id?, name, started_at, completed_at?,
--   exercises: [{ id, exercise_id, position, status,
--                 sets: [{ set_number, weight?, reps?, duration_seconds?,
--                          incline?, notes?, completed }] }]
-- }
-- ---------------------------------------------------------------------------

create or replace function public.save_session(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid := (p ->> 'id')::uuid;
  v_template_id uuid;
begin
  if exists (select 1 from public.workout_sessions where id = v_session_id) then
    return v_session_id;
  end if;

  -- The template may have been deleted since the workout started.
  select t.id into v_template_id
  from public.workout_templates t
  where t.id = nullif(p ->> 'template_id', '')::uuid;

  insert into public.workout_sessions (id, template_id, name, started_at, completed_at, status)
  values (
    v_session_id,
    v_template_id,
    p ->> 'name',
    coalesce((p ->> 'started_at')::timestamptz, now()),
    coalesce((p ->> 'completed_at')::timestamptz, now()),
    'completed'
  );

  insert into public.session_exercises (id, session_id, exercise_id, position, status)
  select (e.v ->> 'id')::uuid, v_session_id, (e.v ->> 'exercise_id')::uuid,
         (e.v ->> 'position')::integer, e.v ->> 'status'
  from jsonb_array_elements(coalesce(p -> 'exercises', '[]'::jsonb)) as e (v);

  insert into public.sets (
    session_exercise_id, set_number, weight, reps, duration_seconds, incline, notes, completed
  )
  select (e.v ->> 'id')::uuid, (s.v ->> 'set_number')::integer,
         (s.v ->> 'weight')::numeric, (s.v ->> 'reps')::integer,
         (s.v ->> 'duration_seconds')::integer, (s.v ->> 'incline')::numeric,
         nullif(s.v ->> 'notes', ''), coalesce((s.v ->> 'completed')::boolean, false)
  from jsonb_array_elements(coalesce(p -> 'exercises', '[]'::jsonb)) as e (v),
       jsonb_array_elements(coalesce(e.v -> 'sets', '[]'::jsonb)) as s (v);

  return v_session_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create/update a template and replace its exercise list atomically
-- (rename, add, remove, reorder, default sets — all in one call).
--
-- p_items = [{ exercise_id, default_sets }] in display order.
-- ---------------------------------------------------------------------------

create or replace function public.save_template(p_id uuid, p_name text, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.workout_templates (id, name)
  values (p_id, btrim(p_name))
  on conflict (id) do update set name = excluded.name;

  delete from public.template_exercises where template_id = p_id;

  insert into public.template_exercises (template_id, exercise_id, position, default_sets)
  select p_id, (i.v ->> 'exercise_id')::uuid, (i.ord - 1)::integer,
         coalesce((i.v ->> 'default_sets')::integer, 3)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as i (v, ord);

  return p_id;
end;
$$;

revoke execute on function public.get_last_sessions(uuid[]) from public, anon;
revoke execute on function public.save_session(jsonb) from public, anon;
revoke execute on function public.save_template(uuid, text, jsonb) from public, anon;
grant execute on function public.get_last_sessions(uuid[]) to authenticated;
grant execute on function public.save_session(jsonb) to authenticated;
grant execute on function public.save_template(uuid, text, jsonb) to authenticated;
