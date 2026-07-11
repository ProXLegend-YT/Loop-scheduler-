const { getUrls, saveUrls } = require('./_redis');

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeUrl(input) {
  let v = (input || '').trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  return v;
}

module.exports = async function handler(req, res) {
  try {
    // ----- GET: list everything currently scheduled -----
    if (req.method === 'GET') {
      const urls = await getUrls();
      return res.status(200).json({ urls });
    }

    // ----- POST: add a new URL to the schedule -----
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body || '{}'); } catch { body = {}; }
      }
      const normalized = normalizeUrl(body && body.url);
      if (!normalized) return res.status(400).json({ error: 'Missing or invalid url' });

      const urls = await getUrls();
      const id = randomId();
      urls[id] = {
        url: normalized,
        createdAt: new Date().toISOString(),
        lastPingedAt: null,
        lastStatus: null,
      };
      await saveUrls(urls);
      return res.status(200).json({ id, entry: urls[id] });
    }

    // ----- DELETE: remove a URL from the schedule -----
    if (req.method === 'DELETE') {
      let id = req.query && req.query.id;
      if (!id && req.body) {
        let body = req.body;
        if (typeof body === 'string') {
          try { body = JSON.parse(body || '{}'); } catch { body = {}; }
        }
        id = body.id;
      }
      if (!id) return res.status(400).json({ error: 'Missing id' });

      const urls = await getUrls();
      delete urls[id];
      await saveUrls(urls);
      return res.status(200).json({ removed: id });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
