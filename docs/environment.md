# Environment Setup

FitBudget should never depend on a committed `.env` file. Keep real values in provider-managed environment variables for deployments and in `.env.local` for your own machine.

## Files

| File | Commit? | Use |
| --- | --- | --- |
| `.env.example` | Yes | Placeholder names only. No real project refs or API keys. |
| `.env.local` | No | Local development secrets. Next.js loads this automatically. |
| `.env` | No | Avoid using this repo-wide because it is easy to accidentally publish. |
| `.env.production` | No | Avoid committing production defaults unless they contain no secrets and no real service identifiers. |

The repo has a secret guard that fails if real-looking keys or tracked `.env` files are committed.

## Required Web App Variables

Set these in Vercel Project Settings -> Environment Variables for Production and Preview. Add Development too if you use `vercel env pull`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_APP_URL=https://your-production-domain.example
GEMINI_API_KEY=your_gemini_api_key
```

`NEXT_PUBLIC_*` values are exposed to the browser by design. `GEMINI_API_KEY` must stay server-only and must never be prefixed with `NEXT_PUBLIC_`.
The assistant route uses the stable `gemini-2.5-flash` model server-side; there is no client-side model variable.

For Vercel, mark `GEMINI_API_KEY` as Sensitive in Production and Preview. After changing any Vercel environment variable, trigger a new deployment because old deployments keep their old environment.

## Local Development

Use either Vercel CLI or a manually created `.env.local`.

```bash
vercel link
vercel env pull .env.local --yes
```

Manual `.env.local` is also fine:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_api_key
```

## Supabase Edge Function Secrets

These are not Vercel variables. Store them as Supabase Edge Function secrets:

```bash
supabase secrets set USDA_FDC_API_KEY=your_usda_key_here
supabase secrets set APP_CONTACT_EMAIL=your_email@example.com
```

## If A Key Was Published

Treat every published key as compromised, even if you remove it from the latest commit.

1. Rotate or delete the exposed Gemini/Google API key in Google Cloud or Google AI Studio.
2. Create a new key, restrict it to the Gemini/Generative Language API where possible, and use it only as `GEMINI_API_KEY`.
3. Add the new key to Vercel as a Sensitive variable for Production and Preview.
4. Redeploy the app.
5. Remove leaked secrets from Git history with `git-filter-repo` only after coordinating a force-push plan.
6. Contact GitHub Support if cached GitHub views or pull request refs still expose sensitive data after history rewrite.

Rotating the provider key is the part that restores security. Rewriting Git history reduces future accidental exposure, but it cannot revoke a key that has already been seen.
