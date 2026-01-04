# Supabase Setup (NXTUP dev)

## 1) Create `.env.local`

Create a file at `NXTUP project sandbox/nxtup/.env.local` (this is gitignored) with:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_USE_SUPABASE=1
```

Restart the dev server after changing env:

```bash
npm run dev
```

## 2) Apply the schema

In Supabase: **SQL Editor → New query** → paste the contents of:

- `supabase/schema.sql`

Run it.

## 3) Important note about Auth/RLS

The schema includes **Row Level Security** policies that are intended for authenticated users.\n\nTo use Supabase as the live backend, we will next add a simple Supabase Auth flow (email OTP or magic link) so the app runs as an authenticated user and can read/write data.\n+
Until that auth wiring is in place, keep `VITE_USE_SUPABASE=0` (or unset) to continue using the mock backend while we iterate on UI.


