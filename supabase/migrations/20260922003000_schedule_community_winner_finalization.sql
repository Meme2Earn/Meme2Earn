-- One-time secure scheduler setup for automatic community-vote payouts.
-- Run private.configure_community_winner_schedule() with a generated secret after this migration.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;

create or replace function private.configure_community_winner_schedule(cron_secret text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, vault, cron, net
as $function$
begin
  if length(cron_secret) < 32 then
    raise exception 'Cron secret must be at least 32 characters.';
  end if;

  delete from vault.secrets where name = 'community_finalizer_cron_secret';
  perform vault.create_secret(
    cron_secret,
    'community_finalizer_cron_secret',
    'Authenticates scheduled community winner finalization requests.'
  );

  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'community-winner-finalizer';

  perform cron.schedule(
    'community-winner-finalizer',
    '*/5 * * * *',
    $job$
      select net.http_post(
        url := 'https://pdmxlfiinidcmxsjxbwd.supabase.co/functions/v1/marketplace',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-community-finalizer-cron-secret',
          (select decrypted_secret from vault.decrypted_secrets where name = 'community_finalizer_cron_secret')
        ),
        body := '{"action":"finalize_expired_community_winners"}'::jsonb
      );
    $job$
  );
end;
$function$;

revoke all on function private.configure_community_winner_schedule(text) from public, anon, authenticated;
