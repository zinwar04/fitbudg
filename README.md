# FitBudget

FitBudget is a Supabase-backed personal health and finance app built with Next.js 16, TypeScript, Tailwind CSS v3, Radix/shadcn-style primitives, Zustand with Immer, Recharts, Framer Motion, React Hook Form, Zod, and Gemini.

## Run

```bash
npm install
npm run dev
npm run build
npm run start
```

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yxxwawvrhurlwzdngran.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Without `GEMINI_API_KEY`, the assistant uses a contextual mock response based on the user's stored FitBudget data.

## Data

All user data lives in Supabase tables behind the `/lib/db` service layer. UI components never call Supabase directly. Each table has `user_id`, composite primary keys, indexes for the main query paths, and Row Level Security policies so users can access only their own rows.

Settings -> Data includes JSON backup/restore, transaction CSV export, demo data loading, and account data clearing. Food Library and Meal Templates also support CSV export plus `.csv`/`.xlsx` import for bulk entry.

## Supabase Setup

1. Open your Supabase project SQL editor.
2. Run `supabase/schema.sql` once.
3. Enable email/password auth in Authentication -> Providers.
4. Add the Supabase and Gemini environment variables in Vercel.
5. Redeploy.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repository in Vercel.
3. Add environment variables in the Vercel dashboard.
4. Deploy. The app uses the Next.js App Router and needs no custom server.
