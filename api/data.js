const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

let kv;
try {
  const mod = require('@vercel/kv');
  kv = mod.kv || mod.default || mod;
} catch (e) {
  kv = null;
}

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

    if (kv && typeof kv.get === 'function') {
      try {
        const v = await kv.get('scan_count');
        if (v !== null && v !== undefined) {
          data.scan_count = parseInt(v, 10) || 0;
        }
      } catch (e) {}
    }
    try {
      const tmp = fs.readFileSync('/tmp/scan_count.json', 'utf-8');
      const n = parseInt(tmp, 10);
      if (!isNaN(n)) data.scan_count = n;
    } catch (e) {}

    res.status(200).json(data);
  } catch (err) {
    console.error('[data.js] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}