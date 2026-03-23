# Rentry

Rentry is a Next.js app for creating and sharing rich text pages with optional file uploads and expiration.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy environment template and fill in values:

```bash
cp .env.example .env
```

3. Run the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Production Build Check

Use this command before every deploy:

```bash
npm run build
```

## Deploy To Vercel

### 1. Import the repository

- In Vercel, choose **Add New Project** and import this repo.
- Framework preset: **Next.js** (auto-detected).
- Build command: `next build` (default).
- Output: leave default.

### 2. Configure environment variables (Project Settings -> Environment Variables)

Required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CRON_SECRET`

Tip: `.env.example` documents every required variable.

### 3. Cron job

`vercel.json` includes:

- path: `/api/cron/cleanup`
- schedule: `0 * * * *` (hourly)

Make sure `CRON_SECRET` is set in Vercel so the cron route can authenticate.

### 4. Deploy

- Trigger a deploy from Vercel UI, or push to the connected production branch.

## Notes

- The cleanup cron route is configured to run in Node.js runtime with an increased function duration limit.
- Keep server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) only in secure environment variables, never in client code.
