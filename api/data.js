const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);

    let kv;
    try { kv = require('@vercel/kv'); } catch (e) { kv = null; }

    if (kv && kv.default) {
      try {
        const v = await kv.default.get('scan_count');
        if (v !== null && v !== undefined) {
          data.scan_count = parseInt(v, 10) || 0;
        }
      } catch (e) {}
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('[data.js] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}