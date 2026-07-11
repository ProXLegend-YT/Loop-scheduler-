# Loop — scheduled URL pinger

Pings a list of URLs on a schedule, without needing any browser tab or device
left open. Storage lives in Upstash Redis (free); the actual "every minute"
trigger comes from the free service cron-job.org, since Vercel's own Cron
Jobs can't run more often than once a day on the free Hobby plan.

## Files

- `api/schedule.js` — add / list / remove URLs (`GET`, `POST`, `DELETE`)
- `api/run-all.js` — pings every stored URL; this is what cron-job.org calls
- `api/_redis.js` — small helper that talks to Upstash's REST API
- `public/index.html` — simple page to add/remove URLs and see status
- `vercel.json` — gives `run-all` a bit more time to finish pinging everything

## One-time setup

**1. Add Redis storage to your Vercel project**
In the Vercel dashboard: your project → Storage tab → Marketplace →
search "Upstash Redis" → install it and connect it to this project.
Vercel will automatically add two environment variables for you:
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. You don't need to
copy these by hand.

**2. (Optional but recommended) Add a secret**
In your project's Environment Variables settings, add:
```
CRON_SECRET = <any random string you make up>
```
This stops random people from hitting `/api/run-all` and spamming your
pinged sites.

**3. Deploy**
Push this folder to the GitHub repo your Vercel project is connected to (or
drop these files into your existing NullPoint repo — the `api/` folder can
sit alongside your other tools). Vercel will pick up the `api/*.js` files as
serverless functions automatically.

**4. Add a few URLs**
Open your deployed `index.html` (e.g. `https://yourproject.vercel.app/`),
paste a URL, hit Add. It's now stored, but nothing will ping it yet — that's
step 5.

**5. Set up the actual schedule on cron-job.org**
- Sign up free at cron-job.org
- Create a new cron job
- URL: `https://yourproject.vercel.app/api/run-all?key=YOUR_CRON_SECRET`
  (skip the `?key=` part if you didn't set `CRON_SECRET`)
- Schedule: every 1 minute (the free plan's fastest option)
- Save

That's it — cron-job.org will now hit your endpoint every minute, and your
endpoint pings every URL you've added, updating each one's last-ping status.

## Notes

- **Interval:** 1 minute is the fastest cron-job.org's free plan allows.
  True 10-second pings need something that stays running continuously
  (a small always-on server), which isn't how serverless/free schedulers work.
- **Storage:** everything is stored in one Redis key as JSON. Fine for a
  personal list of a handful of URLs; if this becomes a public NullPoint tool
  with many users adding their own URLs, you'll want per-user keys and some
  rate limiting so one person can't queue thousands of pings.
- **Timeouts:** each ping aborts after 8 seconds so one slow site can't hang
  the whole batch.
