# Supabase Setup

Run `setup.sql` in the Supabase SQL Editor:

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Paste the contents of `supabase/setup.sql`.
4. Run it.
5. This creates:
   - `profiles` table
   - public `profiles` storage bucket
   - `bounties` table for persisted dare campaigns
   - `bounty_joins` table for persisted hunter joins
   - `bounty_submissions` table for persisted submission feeds
   - `join_bounty` RPC for capacity-safe joins
6. Add these values to `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
VITE_SUPABASE_PROFILE_BUCKET=profiles
VITE_SUPABASE_PROFILE_FUNCTION_URL=https://YOUR_PROJECT_ID.supabase.co/functions/v1/profile
VITE_SUPABASE_MARKETPLACE_FUNCTION_URL=https://YOUR_PROJECT_ID.supabase.co/functions/v1/marketplace
```

## Bounty Marketplace Persistence

Dare campaigns are stored in `public.bounties`.
Hunter joins are stored in `public.bounty_joins`.
Submission feed items are stored in `public.bounty_submissions`.

The frontend:

1. Loads bounties from Supabase on app start.
2. Loads joined bounties for the connected wallet.
3. Loads submission feed entries.
4. Falls back to demo campaigns if Supabase is not configured or the table is empty.
5. Inserts newly created campaigns into `public.bounties`.
6. Joins bounties through the `join_bounty` RPC so max hunter slots cannot be exceeded.
7. Saves submissions only for joined hunters.

Marketplace writes go through `supabase/functions/marketplace`. The browser keeps public read access but cannot directly insert bounties, joins, or submissions after the secure write migration is applied.

Deploy the marketplace function:

```bash
supabase functions deploy marketplace
```

## Secure Profile Writes

The browser should not write profiles or profile images directly in production. Meme2Earn uses Privy for login, so the secure path is:

1. The React app gets the current Privy access token.
2. The app sends the token and profile form data to `supabase/functions/profile`.
3. The Edge Function verifies the Privy JWT.
4. The Edge Function writes to Supabase with the service role key.

Deploy the function:

```bash
supabase functions deploy profile
```

Set the required Edge Function secrets:

```bash
supabase secrets set PRIVY_APP_ID=your_privy_app_id
supabase secrets set PRIVY_JWT_VERIFICATION_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
supabase secrets set PROFILE_BUCKET=profiles
```

The same `PRIVY_APP_ID` and `PRIVY_JWT_VERIFICATION_KEY` secrets are used by both `profile` and `marketplace`.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are available automatically in Supabase-hosted Edge Functions. Never put the service role key in `.env` for the frontend.
