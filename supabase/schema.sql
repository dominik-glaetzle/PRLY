create extension if not exists "pgcrypto";

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  date timestamp with time zone not null,
  duration_minutes int not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  name text not null,
  sets int not null default 1,
  reps int not null,
  weight double precision not null,
  note text
);

alter table public.workouts enable row level security;
alter table public.exercises enable row level security;

create policy "Workouts are viewable by owner" on public.workouts
  for select using (auth.uid() = user_id);

create policy "Workouts are insertable by owner" on public.workouts
  for insert with check (auth.uid() = user_id);

create policy "Workouts are updatable by owner" on public.workouts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Workouts are deletable by owner" on public.workouts
  for delete using (auth.uid() = user_id);

create policy "Exercises are viewable by owner" on public.exercises
  for select using (
    auth.uid() = (select user_id from public.workouts where id = workout_id)
  );

create policy "Exercises are insertable by owner" on public.exercises
  for insert with check (
    auth.uid() = (select user_id from public.workouts where id = workout_id)
  );

create policy "Exercises are deletable by owner" on public.exercises
  for delete using (
    auth.uid() = (select user_id from public.workouts where id = workout_id)
  );
