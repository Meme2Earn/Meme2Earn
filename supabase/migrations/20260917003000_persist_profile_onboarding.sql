-- Persist onboarding so returning Privy users are not asked to repeat it.
alter table public.profiles
add column if not exists terms_accepted_at timestamptz;

-- Profiles created before this column already completed the previous onboarding flow.
update public.profiles
set terms_accepted_at = coalesce(terms_accepted_at, updated_at, now())
where terms_accepted_at is null;
