alter table public.bounties
add column if not exists escrow_address text not null default '',
add column if not exists escrow_bounty_id text not null default '',
add column if not exists escrow_tx_hash text not null default '',
add column if not exists escrow_status text not null default '',
add column if not exists escrow_finalize_tx_hash text not null default '';

create index if not exists bounties_escrow_address_idx on public.bounties (escrow_address);
create index if not exists bounties_escrow_bounty_id_idx on public.bounties (escrow_bounty_id);
