-- Existing projects may have created profiles before wallet persistence was added.
alter table public.profiles
add column if not exists wallet_address text;
