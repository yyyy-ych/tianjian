const fs = require('fs');
const path = require('path');

const TMP_FILE = '/tmp/scan_count.json';

var _memoryCount = null;

function loadBaseData() {
  var candidates = [
    path.join(__dirname, '..', 'data.json'),
    '/var/task/data.json',
    '/var/task/api/data.json',
  ];
  for (var i = 0; i < candidates.length; i++) {
    try {
      var raw = fs.readFileSync(candidates[i], 'utf8');
      var obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') return obj;
    } catch (e) {}
  }
  return { scan_count: 0 };
}

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
    var data = loadBaseData();
    data.scan_count = getCountSync();
    res.statusCode = 200;
    return res.end(JSON.stringify(data));
  } catch (err) {
    console.error('[data.js] error:', err.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};