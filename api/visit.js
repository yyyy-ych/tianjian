const fs = require('fs');
const path = require('path');

const TMP_FILE = '/tmp/scan_count.json';

var _memoryCount = null;

function getCountSync() {
  if (_memoryCount !== null) return _memoryCount;
  try {
    var raw = fs.readFileSync(TMP_FILE, 'utf8');
    var n = parseInt(raw, 10);
    if (!isNaN(n)) { _memoryCount = n; return n; }
  } catch (e) {}
  _memoryCount = 0;
  return 0;
}

function setCountSync(n) {
  _memoryCount = n;
  try { fs.writeFileSync(TMP_FILE, String(n), 'utf8'); } catch (e) {}
}

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    if (req.method === 'GET') {
      var cnt = getCountSync();
      res.statusCode = 200;
      return res.end(JSON.stringify({ scan_count: cnt }));
    }

    if (req.method === 'POST') {
      var body = {};
      try {
        body = req.body ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
      } catch (e) { body = {}; }

      if (body.reset === true) {
        setCountSync(0);
        res.statusCode = 200;
        return res.end(JSON.stringify({ scan_count: 0, reset: true }));
      }

      var cur = getCountSync();
      var next = cur + 1;
      setCountSync(next);
      res.statusCode = 200;
      return res.end(JSON.stringify({ scan_count: next }));
    }
  } catch (err) {
    console.error('[visit.js] error:', err.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal server error' }));
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'method not allowed' }));
};