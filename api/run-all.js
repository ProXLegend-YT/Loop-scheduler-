const { getUrls, saveUrls } = require('./_redis');

// This is the endpoint cron-job.org calls on a schedule (every minute on the
// free plan). It loops through every stored URL and pings each one.

module.exports = async function handler(req, res) {
  // Optional shared-secret check so random people can't trigger your pings.
  // Set CRON_SECRET in your Vercel project env vars, then call this as:
  //   /api/run-all?key=YOUR_SECRET
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      req.query.key || (req.headers.authorization || '').replace('Bearer ', '');
    if (provided !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const urls = await getUrls();
    const ids = Object.keys(urls);

    const results = await Promise.all(
      ids.map(async (id) => {
        const entry = urls[id];
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const r = await fetch(entry.url, { signal: controller.signal });
          clearTimeout(timeout);
          entry.lastPingedAt = new Date().toISOString();
          entry.lastStatus = r.status;
          return { id, url: entry.url, status: r.status };
        } catch (err) {
          entry.lastPingedAt = new Date().toISOString();
          entry.lastStatus = 'error';
          return { id, url: entry.url, error: err.message };
        }
      })
    );

    await saveUrls(urls);
    return res.status(200).json({ pinged: results.length, results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
