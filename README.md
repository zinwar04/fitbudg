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

Settings -> Data includes JSON backup/restore, transaction CSV export, and account data clearing. Food Library and Meal Templates also support CSV export plus `.csv`/`.xlsx` import for bulk entry.

## Supabase Setup

1. Open your Supabase project SQL editor.
2. Run `supabase/schema.sql` once.
3. Enable email/password auth in Authentication -> Providers.
4. Add the Supabase and Gemini environment variables in Vercel.
5. Redeploy.

## External Food Search Setup

FitBudget can search USDA FoodData Central for generic foods and Open Food Facts for packaged foods and barcode lookup. USDA requires an API key. Open Food Facts read-only lookup does not require an API key, but the Edge Functions must send a contact email in the User-Agent.

For an existing database, apply the migration in `supabase/migrations/20260526233000_add_food_external_metadata.sql` before importing external foods.

Store these only as Supabase Edge Function secrets:

```bash
supabase secrets set USDA_FDC_API_KEY=your_usda_key_here
supabase secrets set APP_CONTACT_EMAIL=your_email@example.com
```

Deploy the functions:

```bash
supabase functions deploy food-search-usda
supabase functions deploy food-search-open-food-facts
supabase functions deploy food-barcode-open-food-facts
supabase functions deploy food-import-to-library
```

The frontend calls these functions with `supabase.functions.invoke(...)`; it does not call USDA FoodData Central or Open Food Facts directly, and the USDA key is never exposed to browser code.

## Deploy to Vercel

1. Push to GitHub.
2. Import the repository in Vercel.
3. Add environment variables in the Vercel dashboard.
4. Deploy. The app uses the Next.js App Router and needs no custom server.
