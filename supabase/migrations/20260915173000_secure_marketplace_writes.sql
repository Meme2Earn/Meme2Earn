-- Tighten marketplace writes.
-- Browser clients keep public read access, but writes should go through
-- supabase/functions/marketplace where Privy access tokens are verified.

drop policy if exists "Clients can create bounties" on public.bounties;
drop policy if exists "Clients can create bounty joins" on public.bounty_joins;
drop policy if exists "Joined clients can create submissions" on public.bounty_submissions;

revoke execute on function public.join_bounty(text, text, text, text) from anon, authenticated;
