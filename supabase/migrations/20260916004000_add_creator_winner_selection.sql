alter table public.bounties
add column if not exists winner_submission_id text references public.bounty_submissions(id) on delete set null,
add column if not exists winner_wallet_address text,
add column if not exists winner_selected_at timestamptz;

create index if not exists bounties_winner_submission_idx on public.bounties (winner_submission_id);

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

revoke execute on function public.select_creator_winner(text, text, text) from anon, authenticated;
