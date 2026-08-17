const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

let kv;
try {
  kv = require('@vercel/kv');
} catch (e) {
  kv = null;
}

const KV_KEY = 'scan_count';

function readDataFile() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { error: 'data.json read failed' };
  }
}

function getCountFromFile() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return typeof data.scan_count === 'number' ? data.scan_count : 0;
  } catch (e) {
    return 0;
  }
}

function writeCountToFile(count) {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    data.scan_count = count;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    return false;
  }
}

async function getCount() {
  if (kv && kv.default) {
    try {
      const v = await kv.default.get(KV_KEY);
      if (v !== null && v !== undefined) return parseInt(v, 10) || 0;
    } catch (e) {}
  }
  return getCountFromFile();
}

async function setCount(n) {
  if (kv && kv.default) {
    try {
      await kv.default.set(KV_KEY, String(n));
    } catch (e) {}
  }
  writeCountToFile(n);
}

function buildResponse(count) {
  const data = readDataFile();
  data.scan_count = count;
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const count = await getCount();
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(buildResponse(count));
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      if (body.reset === true) {
        await setCount(0);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(buildResponse(0));
      }

      const current = await getCount();
      const next = current + 1;
      await setCount(next);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(buildResponse(next));
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[scan.js] error:', err.message);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
}