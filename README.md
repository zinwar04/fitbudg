# FitBudget

FitBudget is an offline-first personal health and finance app built with Next.js 14, TypeScript, Tailwind CSS v3, shadcn-style Radix primitives, Dexie, Zustand with Immer, Recharts, Framer Motion, React Hook Form, and Zod.

## Run

```bash
npm install
npm run dev
npm run build
npm run start
```

Create `.env.local` for Supabase auth/sync and optional assistant responses:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yxxwawvrhurlwzdngran.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Without `OPENAI_API_KEY`, the assistant uses a contextual mock response based on the user's local data.

## Data

All user data is stored in IndexedDB through the `/lib/db` service layer first, then synced to Supabase as a protected per-user snapshot. UI components never access Dexie or Supabase tables directly. Export, import, demo data, cloud sync, and clear-data controls are available in Settings -> Data.

## Supabase Setup

1. Open your Supabase project SQL editor.
2. Run `supabase/schema.sql` once. It creates `public.fitbudget_snapshots` with Row Level Security so each user can only access their own data.
3. Add the Supabase URL and publishable key to `.env.local`.
4. Start the app, sign up, complete onboarding, and FitBudget will sync changes after local writes.

Supabase Auth must have email/password enabled in Authentication -> Providers. If email confirmation is enabled, new users must confirm their email before signing in.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repository in Vercel.
3. Add environment variables in the Vercel dashboard.
4. Deploy. The app uses the Next.js App Router and needs no custom server.
# fitbudg
