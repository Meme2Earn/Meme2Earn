create unique index if not exists bounty_submissions_one_per_wallet_idx
on public.bounty_submissions (bounty_id, lower(wallet_address));
