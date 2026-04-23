# Video Ranking MVP — Setup Guide

This feature records anonymous play events to Cloudflare Analytics Engine (AE), aggregates them to D1 daily via Cron, and exposes a read-only JSON ranking API at `/api/ranking`. 14 static ranking pages (EN7 + JA7) read that API.

All resources fit in Cloudflare's free tier.

## 0. Prerequisites

- You're already deploying streamfilter.tv to Cloudflare Pages via GitHub auto-deploy
- `wrangler` CLI installed locally (`npm i -g wrangler` if not)
- Logged in: `wrangler login`

## 1. Create the D1 database

```bash
cd /Users/matsu/APP/cccompany/youtube-filter
wrangler d1 create streamfilter-ranking
```

Copy the `database_id` from the output and paste into **two** files:

- `wrangler.toml` line 8 → replace `REPLACE_WITH_ACTUAL_ID`
- `workers/wrangler-cron.toml` line 9 → same value

## 2. Apply the schema

```bash
wrangler d1 execute streamfilter-ranking --remote --file=./schema.sql
```

Verify:
```bash
wrangler d1 execute streamfilter-ranking --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```
Expected: `ranking_daily`, `video_meta`.

## 3. Enable Analytics Engine

AE is enabled by default on free accounts but the dataset is auto-created on first write. No manual step needed. The dataset name `video_plays` must match what's in both `wrangler.toml` and `workers/wrangler-cron.toml`.

## 4. Bind D1 + AE to the Pages project

The Pages Functions (`functions/api/track.js` and `functions/api/ranking.js`) need `env.DB` and `env.AE`. Configure in the Cloudflare Dashboard:

1. Go to **Pages → streamfilter → Settings → Functions → Bindings**
2. Add **D1 database binding**:
   - Variable name: `DB`
   - D1 database: `streamfilter-ranking`
3. Add **Analytics Engine binding**:
   - Variable name: `AE`
   - Dataset: `video_plays`
4. Save. Next deploy picks up the bindings.

> The `wrangler.toml` in the repo is a reference; Pages Functions read bindings from the dashboard config, not wrangler.toml, unless you're using `wrangler pages deploy` directly.

## 5. Create the AE SQL API token

The Cron Worker needs to call the AE SQL API. Create a token:

1. Go to **My Profile → API Tokens → Create Token → Custom token**
2. Permissions:
   - **Account → Analytics: Read**
3. Account resources: Include → your account
4. Create, copy the token.

Also grab your **Account ID** from the Pages project sidebar (or any dashboard page).

## 6. Deploy the Cron Worker

```bash
cd workers
wrangler deploy --config wrangler-cron.toml
```

Edit `workers/wrangler-cron.toml` first:
- Line 9: replace `REPLACE_WITH_ACTUAL_ID` with the D1 ID
- Line 18: replace `REPLACE_WITH_ACCOUNT_ID` with your Cloudflare Account ID

Then set the secrets:
```bash
wrangler secret put CF_AE_TOKEN --config wrangler-cron.toml
# paste the AE SQL API token from step 5

wrangler secret put CRON_SECRET --config wrangler-cron.toml
# paste a random string you pick — used to authorize the /__run endpoint.
# openssl rand -hex 32  ← if you want one generated
```

## 7. Trigger the Cron once manually to verify

```bash
# Get the worker URL from the deploy output, e.g. streamfilter-cron.<account>.workers.dev
curl "https://streamfilter-cron.<account>.workers.dev/__run?key=<YOUR_CRON_SECRET>"
```

Then check D1:
```bash
wrangler d1 execute streamfilter-ranking --remote --command="SELECT * FROM ranking_daily LIMIT 5"
```

Should be empty until playbacks happen. After a play, the next Cron run (or manual trigger) populates rows.

## 8. Push code and verify

```bash
# From /Users/matsu/APP/cccompany/youtube-filter
git add .
git commit -m "Add video ranking MVP"
git push
```

Cloudflare Pages auto-deploys. Check:

- `https://streamfilter.tv/ranking.html` loads (shows "No data yet" initially)
- Open devtools Network tab, play a video on `https://streamfilter.tv/`
- A POST to `/api/track` should return 200
- `curl https://streamfilter.tv/api/ranking?period=all&country=global` → `{"ok":true,"data":[]}` until aggregation happens

## 9. Schedule

The Cron trigger runs daily at UTC 00:00 (JST 09:00). First-day ranking appears tomorrow morning.

To speed up testing, hit the `/__run` endpoint with your token as the `key` query parameter.

---

## What to watch for

- **Pages Functions bindings are separate from wrangler.toml.** If `/api/track` returns 500 "env.AE is undefined", you forgot step 4.
- **AE local dev doesn't work.** `wrangler pages dev` doesn't emulate AE. Test AE writes by deploying to Preview first.
- **CPU time ceiling.** The Cron has a 10ms CPU limit on free tier, but I/O (AE SQL API fetch, D1 batch) doesn't count. Current design is safe.
- **Cron quota.** You now use 1 of 5 free Cron triggers across your Cloudflare account.
- **Privacy policy.** English was updated. Japanese visitors see `/privacy.html` (English). If you want a JA version, create `ja/privacy.html` as a follow-up.

## Files changed

New:
- `wrangler.toml`, `schema.sql`, `_headers`
- `assets/tracker.js`, `assets/ranking-ui.js`
- `functions/api/track.js`, `functions/api/ranking.js`
- `workers/ranking-cron.js`, `workers/wrangler-cron.toml`
- `ranking.html` + `ranking/{today,week,month,jp,us,watchtime}.html`
- `ja/ranking.html` + `ja/ranking/{today,week,month,jp,us,watchtime}.html`

Edited:
- `index.html`, `ja/index.html` — tracker script + `loadVideo()` hook + footer Ranking link
- `privacy.html` — anonymized ranking data disclosure
- `sitemap.xml` — 14 ranking URLs added
