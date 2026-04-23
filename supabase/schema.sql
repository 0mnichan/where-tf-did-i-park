-- ============================================================
-- where tf did i park — Supabase schema
-- Run this entire file in the Supabase SQL editor (one shot)
-- ============================================================

-- Enable RLS on auth.users (already enabled by default in Supabase)
-- alter table auth.users enable row level security;

-- ============================================================
-- Vehicle profiles table
-- ============================================================
create table if not exists public.vehicle_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  make text not null,
  color text not null,
  plate text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.vehicle_profiles enable row level security;

drop policy if exists "Users can only access their own vehicle profile" on public.vehicle_profiles;
create policy "Users can only access their own vehicle profile"
  on public.vehicle_profiles
  for all
  using (auth.uid() = user_id);

-- ============================================================
-- Saved spots table
-- ============================================================
create table if not exists public.saved_spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  lat double precision not null,
  lng double precision not null,
  accuracy double precision not null,
  heading double precision,
  pitch double precision,
  photo_url text,
  saved_at timestamptz default now(),
  is_active boolean default true
);

alter table public.saved_spots enable row level security;

drop policy if exists "Users can only access their own spots" on public.saved_spots;
create policy "Users can only access their own spots"
  on public.saved_spots
  for all
  using (auth.uid() = user_id);

-- Index for fast lookup of active spot
create index if not exists saved_spots_user_active_idx
  on public.saved_spots(user_id, is_active, saved_at desc);

-- ============================================================
-- Storage bucket policies
-- Run AFTER creating the 'parking-photos' bucket in the
-- Supabase dashboard (Storage → New bucket → parking-photos,
-- set to Public).
-- ============================================================

drop policy if exists "Users can upload their own photos" on storage.objects;
create policy "Users can upload their own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'parking-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can read their own photos" on storage.objects;
create policy "Users can read their own photos"
  on storage.objects for select
  using (
    bucket_id = 'parking-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own photos" on storage.objects;
create policy "Users can delete their own photos"
  on storage.objects for delete
  using (
    bucket_id = 'parking-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
