# Reel Club

Letterboxd meets a scheduled group watch club. Form a club with friends, nominate movies, rank-choice vote on what to watch next, then rate & review together once the credits roll.

**Live:** https://reel-club-eight.vercel.app

## Features

1. **Auth & onboarding** — Google sign-in via Auth.js, profile setup (display name, username, avatar synced from Google, bio)
2. **Clubs** — create/join via invite code, member roles, schedule cadence (weekly/biweekly/monthly/custom), winners-per-cycle
3. **Movie search & catalog** — TMDB search with OMDb enrichment, cached locally so repeat lookups don't re-hit the APIs
4. **Nomination flow** — club members nominate movies during the `NOMINATING` phase of each cycle
5. **Voting** — ranked-choice (instant-runoff) voting among nominees during the `VOTING` phase
6. **Watching → rating/review** — mark a cycle's winner(s) watched, then members rate (0–10) and review, with per-review visibility (club-only vs. club & friends)
7. **Stats & analytics** — average ratings, ratings distribution, favorite genres/directors, per-user and per-club
8. **Leaderboard** — per-club rankings by ratings given/received
9. **Social layer** — friend requests, cross-club activity feed scoped by review visibility and friendship

## Tech stack

- **Framework:** Next.js (App Router) + TypeScript, Server Actions
- **UI:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Database:** Postgres on Supabase, via Prisma ORM
- **Auth:** Auth.js (NextAuth v5), Google OAuth, Prisma adapter, database sessions
- **Movie data:** [TMDB](https://www.themoviedb.org/documentation/api) (search/catalog) + [OMDb](https://www.omdbapi.com/) (enrichment), cached in the DB
- **Hosting:** Vercel

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npx prisma migrate dev       # applies migrations to your DATABASE_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See [`.env.example`](.env.example) for the full annotated list. You'll need:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (Transaction pooler, port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Same page, Session pooler / direct connection, port 5432 (used by `prisma migrate`) |
| `AUTH_SECRET` | `npx auth secret` (or `openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), OAuth 2.0 Client ID (Web application) |
| `TMDB_API_KEY` | [TMDB → Settings → API](https://www.themoviedb.org/settings/api) |
| `OMDB_API_KEY` | [OMDb API key request](https://www.omdbapi.com/apikey.aspx) (emailed to you) |

For local Google sign-in, add `http://localhost:3000` as an Authorized JavaScript origin and `http://localhost:3000/api/auth/callback/google` as an Authorized redirect URI on the OAuth client.

## Deployment

Currently deployed on Vercel, connected to the `main` branch of this GitHub repo (auto-deploys on push).

To redeploy elsewhere or re-provision:

1. **Database:** create a Supabase Postgres project, run `npx prisma migrate deploy` against it with `DATABASE_URL`/`DIRECT_URL` set to that project's connection strings.
2. **Vercel:** import the repo, set all variables from `.env.example` (Production + Preview) in Project Settings → Environment Variables.
3. **Google OAuth:** on the same OAuth client, add the deployed origin (`https://your-domain`) and callback (`https://your-domain/api/auth/callback/google`) as a second Authorized JavaScript origin / redirect URI — Google keeps both localhost and production entries side by side. Changes can take a few minutes to a few hours to propagate.
4. **TMDB / OMDb keys** work as-is against any domain (no per-domain restriction).

### Free-tier limits to watch

At small scale (roughly 20–50 users) this stays within free tiers, but keep an eye on:

- **Vercel Hobby** — fine for personal/non-commercial use; if this becomes a shared product, Vercel's Hobby plan terms may require upgrading to Pro.
- **Supabase Free** — 500 MB database storage and the project pauses after 1 week of inactivity (auto-resumes on next request, with a brief cold-start delay). Watch DB size as movie/rating/review data grows.
- **OMDb** — free key is capped at 1,000 requests/day; the app caches movies locally after first lookup, so this only matters for first-time searches across many distinct titles in a day.
- **TMDB** — free tier has no hard daily cap for this kind of usage, but is still subject to their fair-use rate limiting.

## Project structure

- `prisma/schema.prisma` — data model (User, Club, ClubMembership, Cycle, Nomination, Vote, Movie, Rating, Review, Friendship, ActivityFeedItem, etc.)
- `src/app/(app)/` — authenticated app routes (clubs, profile, movies)
- `src/lib/` — server actions, TMDB/OMDb clients, voting (IRV), stats aggregation, activity feed
- `src/components/` — shared UI, including shadcn/ui primitives in `src/components/ui/`
