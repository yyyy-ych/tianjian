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

async function getCount() {
  if (kv && typeof kv.get === 'function') {
    try {
      const v = await kv.get('scan_count');
      if (v !== null && v !== undefined) return parseInt(v, 10) || 0;
    } catch (e) {}
  }
  try {
    const raw = fs.readFileSync('/tmp/scan_count.json', 'utf-8');
    const n = parseInt(raw, 10);
    if (!isNaN(n)) return n;
  } catch (e) {}
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return typeof data.scan_count === 'number' ? data.scan_count : 0;
  } catch (e) {
    return 0;
  }
}

async function setCount(n) {
  if (kv && typeof kv.set === 'function') {
    try {
      await kv.set('scan_count', String(n));
    } catch (e) {}
  }
  try {
    fs.writeFileSync('/tmp/scan_count.json', String(n), 'utf8');
  } catch (e) {}
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    data.scan_count = n;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
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
    const current = await getCount();
    const next = current + 1;
    await setCount(next);

    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    data.scan_count = next;

    res.status(200).json(data);
  } catch (err) {
    console.error('[visit.js] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}