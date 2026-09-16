-- Meme2Earn Supabase setup
-- Run this in Supabase Dashboard > SQL Editor.
--
-- Current secure app flow:
-- - Privy handles user login and embedded EVM wallet creation.
-- - The React app sends the Privy access token to the Supabase Edge Function
--   in supabase/functions/profile.
-- - The Edge Function verifies the Privy token server-side, then writes with
--   the Supabase service role key.
-- - Browser clients keep public read access, but do not get direct write access.

-- 1. Public profile table
create table if not exists public.profiles (
  id text primary key,
  wallet_address text,
  username text not null default '',
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are public readable" on public.profiles;
create policy "Profiles are public readable"
on public.profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Anon clients can create profiles" on public.profiles;
drop policy if exists "Anon clients can update profiles" on public.profiles;

-- 2. Public storage bucket for profile images
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profiles',
  'profiles',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Profile images are public readable" on storage.objects;
create policy "Profile images are public readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'profiles');

drop policy if exists "Anon clients can upload profile images" on storage.objects;
drop policy if exists "Anon clients can update profile images" on storage.objects;
drop policy if exists "Anon clients can delete profile images" on storage.objects;
