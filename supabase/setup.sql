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

-- 3. Public bounty campaign table
create table if not exists public.bounties (
  id text primary key,
  title text not null,
  description text not null default '',
  category text not null,
  reward numeric not null check (reward > 0),
  coin text not null,
  token_address text not null default '',
  deadline date,
  applicants integer not null default 0 check (applicants >= 0),
  max_applicants integer not null default 1 check (max_applicants > 0),
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Completed')),
  poster text not null,
  image_url text,
  funding_type text not null default 'Self-Funded Dare' check (funding_type in ('Self-Funded Dare', 'Community-Funded Dare')),
  winner_selection text not null default 'Community decides' check (winner_selection in ('Community decides', 'Creator decides')),
  winner_submission_id text,
  winner_wallet_address text,
  winner_selected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bounties enable row level security;

drop policy if exists "Bounties are public readable" on public.bounties;
create policy "Bounties are public readable"
on public.bounties
for select
to anon, authenticated
using (true);

drop policy if exists "Clients can create bounties" on public.bounties;

create index if not exists bounties_created_at_idx on public.bounties (created_at desc);
create index if not exists bounties_status_idx on public.bounties (status);
create index if not exists bounties_poster_idx on public.bounties (poster);
create index if not exists bounties_winner_submission_idx on public.bounties (winner_submission_id);

create table if not exists public.bounty_joins (
  bounty_id text not null references public.bounties(id) on delete cascade,
  wallet_address text not null,
  username text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  primary key (bounty_id, wallet_address)
);

alter table public.bounty_joins enable row level security;

drop policy if exists "Bounty joins are public readable" on public.bounty_joins;
create policy "Bounty joins are public readable"
on public.bounty_joins
for select
to anon, authenticated
using (true);

drop policy if exists "Clients can create bounty joins" on public.bounty_joins;

create table if not exists public.bounty_submissions (
  id text primary key,
  bounty_id text not null references public.bounties(id) on delete cascade,
  wallet_address text not null,
  author text not null default '',
  avatar_url text,
  text text not null,
  video_url text not null default '',
  video_path text not null default '',
  video_name text not null default '',
  video_type text not null default '',
  upvotes integer not null default 0 check (upvotes >= 0),
  downvotes integer not null default 0 check (downvotes >= 0),
  created_at timestamptz not null default now()
);

alter table public.bounty_submissions enable row level security;

drop policy if exists "Bounty submissions are public readable" on public.bounty_submissions;
create policy "Bounty submissions are public readable"
on public.bounty_submissions
for select
to anon, authenticated
using (true);

drop policy if exists "Joined clients can create submissions" on public.bounty_submissions;

create index if not exists bounty_joins_wallet_idx on public.bounty_joins (wallet_address);
create index if not exists bounty_submissions_bounty_idx on public.bounty_submissions (bounty_id, created_at desc);

create table if not exists public.bounty_submission_votes (
  submission_id text not null references public.bounty_submissions(id) on delete cascade,
  bounty_id text not null references public.bounties(id) on delete cascade,
  wallet_address text not null,
  vote integer not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (submission_id, wallet_address)
);

alter table public.bounty_submission_votes enable row level security;

drop policy if exists "Submission votes are public readable" on public.bounty_submission_votes;
create policy "Submission votes are public readable"
on public.bounty_submission_votes
for select
to anon, authenticated
using (true);

create index if not exists bounty_submission_votes_wallet_idx on public.bounty_submission_votes (wallet_address);
create index if not exists bounty_submission_votes_bounty_idx on public.bounty_submission_votes (bounty_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-videos',
  'submission-videos',
  true,
  524288000,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Submission videos are public readable" on storage.objects;
create policy "Submission videos are public readable"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'submission-videos');

drop policy if exists "Logged clients can upload submission videos" on storage.objects;
create policy "Logged clients can upload submission videos"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'submission-videos'
  and lower((storage.foldername(name))[1]) <> ''
);

create or replace function public.join_bounty(
  target_bounty_id text,
  user_wallet text,
  user_username text default '',
  user_avatar text default ''
)
returns setof public.bounties
language plpgsql
security definer
set search_path = public
as $$
declare
  current_bounty public.bounties%rowtype;
begin
  if target_bounty_id is null or target_bounty_id = '' then
    raise exception 'Missing bounty id.';
  end if;

  if user_wallet is null or user_wallet = '' then
    raise exception 'Missing wallet address.';
  end if;

  select *
  into current_bounty
  from public.bounties
  where id = target_bounty_id
  for update;

  if not found then
    raise exception 'Bounty not found.';
  end if;

  if exists (
    select 1
    from public.bounty_joins
    where bounty_id = target_bounty_id
      and wallet_address = user_wallet
  ) then
    return query select * from public.bounties where id = target_bounty_id;
    return;
  end if;

  if current_bounty.applicants >= current_bounty.max_applicants then
    raise exception 'Bounty is full.';
  end if;

  insert into public.bounty_joins (
    bounty_id,
    wallet_address,
    username,
    avatar_url
  )
  values (
    target_bounty_id,
    user_wallet,
    coalesce(user_username, ''),
    nullif(user_avatar, '')
  );

  update public.bounties
  set
    applicants = applicants + 1,
    updated_at = now()
  where id = target_bounty_id;

  return query select * from public.bounties where id = target_bounty_id;
end;
$$;

create or replace function public.vote_submission(
  target_submission_id text,
  user_wallet text,
  user_vote integer
)
returns setof public.bounty_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  current_submission public.bounty_submissions%rowtype;
  current_bounty public.bounties%rowtype;
begin
  if target_submission_id is null or target_submission_id = '' then
    raise exception 'Missing submission id.';
  end if;

  if user_wallet is null or user_wallet = '' then
    raise exception 'Missing wallet address.';
  end if;

  if user_vote not in (-1, 0, 1) then
    raise exception 'Invalid vote.';
  end if;

  select * into current_submission
  from public.bounty_submissions
  where id = target_submission_id
  for update;

  if not found then
    raise exception 'Submission not found.';
  end if;

  select * into current_bounty
  from public.bounties
  where id = current_submission.bounty_id;

  if not found then
    raise exception 'Bounty not found.';
  end if;

  if current_bounty.winner_selection <> 'Community decides' then
    raise exception 'This bounty is not community decided.';
  end if;

  if current_bounty.status = 'Completed' or (current_bounty.deadline is not null and current_bounty.deadline < current_date) then
    raise exception 'Voting is closed.';
  end if;

  if user_vote = 0 then
    delete from public.bounty_submission_votes
    where submission_id = target_submission_id
      and wallet_address = user_wallet;
  else
    insert into public.bounty_submission_votes (submission_id, bounty_id, wallet_address, vote)
    values (target_submission_id, current_submission.bounty_id, user_wallet, user_vote)
    on conflict (submission_id, wallet_address)
    do update set vote = excluded.vote, updated_at = now();
  end if;

  update public.bounty_submissions
  set
    upvotes = (
      select count(*)::integer from public.bounty_submission_votes
      where submission_id = target_submission_id and vote = 1
    ),
    downvotes = (
      select count(*)::integer from public.bounty_submission_votes
      where submission_id = target_submission_id and vote = -1
    )
  where id = target_submission_id;

  return query select * from public.bounty_submissions where id = target_submission_id;
end;
$$;

create or replace function public.select_creator_winner(
  target_bounty_id text,
  target_submission_id text,
  creator_wallet text
)
returns setof public.bounties
language plpgsql
security definer
set search_path = public
as $$
declare
  current_bounty public.bounties%rowtype;
  current_submission public.bounty_submissions%rowtype;
begin
  if target_bounty_id is null or target_bounty_id = '' then
    raise exception 'Bounty id is required.';
  end if;

  if target_submission_id is null or target_submission_id = '' then
    raise exception 'Submission id is required.';
  end if;

  if creator_wallet is null or creator_wallet = '' then
    raise exception 'Wallet address is required.';
  end if;

  select *
  into current_bounty
  from public.bounties
  where id = target_bounty_id
  for update;

  if not found then
    raise exception 'Bounty not found.';
  end if;

  if lower(current_bounty.poster) <> lower(creator_wallet) then
    raise exception 'Only the bounty creator can select a winner.';
  end if;

  if current_bounty.winner_selection <> 'Creator decides' then
    raise exception 'This bounty uses community winner selection.';
  end if;

  select *
  into current_submission
  from public.bounty_submissions
  where id = target_submission_id
    and bounty_id = target_bounty_id;

  if not found then
    raise exception 'Submission not found for this bounty.';
  end if;

  update public.bounties
  set winner_submission_id = current_submission.id,
      winner_wallet_address = current_submission.wallet_address,
      winner_selected_at = now(),
      status = 'Completed',
      updated_at = now()
  where id = target_bounty_id;

  return query select * from public.bounties where id = target_bounty_id;
end;
$$;

revoke execute on function public.join_bounty(text, text, text, text) from anon, authenticated;
revoke execute on function public.vote_submission(text, text, integer) from anon, authenticated;
revoke execute on function public.select_creator_winner(text, text, text) from anon, authenticated;
