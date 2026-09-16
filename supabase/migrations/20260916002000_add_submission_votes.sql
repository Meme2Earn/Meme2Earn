alter table public.bounty_submissions
add column if not exists upvotes integer not null default 0 check (upvotes >= 0),
add column if not exists downvotes integer not null default 0 check (downvotes >= 0);

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

  select *
  into current_submission
  from public.bounty_submissions
  where id = target_submission_id
  for update;

  if not found then
    raise exception 'Submission not found.';
  end if;

  select *
  into current_bounty
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
    insert into public.bounty_submission_votes (
      submission_id,
      bounty_id,
      wallet_address,
      vote
    )
    values (
      target_submission_id,
      current_submission.bounty_id,
      user_wallet,
      user_vote
    )
    on conflict (submission_id, wallet_address)
    do update set
      vote = excluded.vote,
      updated_at = now();
  end if;

  update public.bounty_submissions
  set
    upvotes = (
      select count(*)::integer
      from public.bounty_submission_votes
      where submission_id = target_submission_id
        and vote = 1
    ),
    downvotes = (
      select count(*)::integer
      from public.bounty_submission_votes
      where submission_id = target_submission_id
        and vote = -1
    )
  where id = target_submission_id;

  return query select * from public.bounty_submissions where id = target_submission_id;
end;
$$;

revoke execute on function public.vote_submission(text, text, integer) from anon, authenticated;
