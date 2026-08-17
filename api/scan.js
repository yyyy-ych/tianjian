const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data.json');

let kv;
try { kv = require('@vercel/kv'); } catch (e) { kv = null; }

function readBaseData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    data.scan_count = 0;
    return data;
  } catch (e) {
    return null;
  }
}

async function getCount() {
  if (kv && kv.default) {
    try {
      const v = await kv.default.get('scan_count');
      if (v !== null && v !== undefined) return parseInt(v, 10) || 0;
    } catch (e) {}
  }
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return typeof data.scan_count === 'number' ? data.scan_count : 0;
  } catch (e) {
    return 0;
  }
}

async function setCount(n) {
  if (kv && kv.default) {
    try {
      await kv.default.set('scan_count', String(n));
    } catch (e) {}
  }
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    data.scan_count = n;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const baseData = readBaseData();
    if (!baseData) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'failed to read data' }));
    }

    if (req.method === 'GET') {
      const count = await getCount();
      baseData.scan_count = count;
      res.statusCode = 200;
      return res.end(JSON.stringify(baseData));
    }

    if (req.method === 'POST') {
      let body = {};
      try {
        body = req.body ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
      } catch (e) {
        body = {};
      }

      if (body.reset === true) {
        await setCount(0);
        baseData.scan_count = 0;
        res.statusCode = 200;
        return res.end(JSON.stringify(baseData));
      }

      if (body.increment === false) {
        const count = await getCount();
        baseData.scan_count = count;
        res.statusCode = 200;
        return res.end(JSON.stringify(baseData));
      }

      const current = await getCount();
      const next = current + 1;
      await setCount(next);
      baseData.scan_count = next;

      res.statusCode = 200;
      return res.end(JSON.stringify(baseData));
    }
  } catch (err) {
    console.error('[scan.js] error:', err.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal server error' }));
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'method not allowed' }));
}