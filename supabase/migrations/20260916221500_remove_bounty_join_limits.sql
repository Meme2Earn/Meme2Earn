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

revoke execute on function public.join_bounty(text, text, text, text) from anon, authenticated;
