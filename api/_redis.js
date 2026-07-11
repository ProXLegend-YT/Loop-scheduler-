// Small helper around the Upstash Redis REST API.
// Requires these two env vars to be set in your Vercel project:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// (Both get added automatically if you install the Upstash Redis
// integration from the Vercel Marketplace.)

const BASE = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

async function redis(...command) {
  if (!BASE || !TOKEN) {
    throw new Error(
      'Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars. ' +
      'Add the Upstash Redis integration in your Vercel project settings.'
    );
  }
  const res = await fetch(BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

const KEY = 'loop:urls';

async function getUrls() {
  const raw = await redis('GET', KEY);
  return raw ? JSON.parse(raw) : {};
}

async function saveUrls(urls) {
  await redis('SET', KEY, JSON.stringify(urls));
}

module.exports = { redis, getUrls, saveUrls };
