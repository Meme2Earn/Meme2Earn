alter table public.bounties
add column if not exists winner_selection text not null default 'Community decides'
check (winner_selection in ('Community decides', 'Creator decides'));
