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
      if (obj && typeof obj === 'object') {
        obj.scan_count = 0;
        return obj;
      }
    } catch (e) {}
  }
  return {
    batch_id: "DEMO-001",
    uuid: "018f3a2e-7b4c-4d1f-9c8e-2a6b5d3f0e17",
    herb: { name: "铁皮石斛", latin: "Dendrobium officinale", dao_di_region: "浙江省温州市乐清市雁荡山", dao_di_certified: true },
    farmer: { name: "陈伟民", cooperative: "铁枫堂雁荡山种植基地" },
    farmland: { name: "雁荡山道地示范田", area_mu: 196, altitude: 480, soil_type: "火山岩腐殖土" },
    plant_date: "2025-04-12", harvest_date: "2026-04-20",
    timeline: [
      { type: "播种", date: "2025-04-12", desc: "雁荡山原生种苗定植，GPS 地块确权编号 YDS-196" },
      { type: "施肥", date: "2025-06-08", desc: "施用腐熟羊粪有机肥，土壤 pH 6.2，NPK 均衡" },
      { type: "灌溉", date: "2025-08-15", desc: "山泉水滴灌，弱网 IoT 传感周期上报 13.1 万条" },
      { type: "采收", date: "2026-04-20", desc: "人工精选 2 年以上鲜条，含水率达标，分拣包装" },
      { type: "检测", date: "2026-04-21", desc: "送检温州市食品药品检验检测中心，国密 SM3 存证上链" }
    ],
    env: {
      avg_temp: 21.6, avg_humidity: 68, total_light: 1580,
      series: [
        { t: 16.2, h: 72 }, { t: 17.8, h: 70 }, { t: 19.4, h: 71 }, { t: 21.0, h: 69 },
        { t: 22.5, h: 67 }, { t: 23.8, h: 66 }, { t: 24.6, h: 65 }, { t: 24.0, h: 67 },
        { t: 22.1, h: 68 }, { t: 20.3, h: 70 }, { t: 18.5, h: 69 }, { t: 17.1, h: 68 }
      ]
    },
    quality: {
      agency: "温州市食品药品检验检测中心", standard: "《中国药典》2025 年版 · 一部",
      items: [
        { name: "浸出物", result: "≥ 6.5%", limit: "≥ 6.5%", compliant: true },
        { name: "多糖含量", result: "32.8%", limit: "≥ 25.0%", compliant: true },
        { name: "甘露糖", result: "13.2%", limit: "13.0% ~ 38.0%", compliant: true },
        { name: "农药残留", result: "未检出", limit: "≤ 限量", compliant: true },
        { name: "重金属", result: "合格", limit: "≤ 限量", compliant: true }
      ]
    },
    chain: {
      chain_name: "长安链 ChainMaker",
      sm3_hash: "8a3f5c9d2e7b4a1f6c8d0e2f4a6b8c0d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b",
      tx_hash: "0x9c4f8e2a1b6d3c5f7e9a0b2d4c6e8f1a3b5d7f9e1a3c5b7d9f0e2a4c6b8d0e1",
      block_height: 2187346, on_chain_time: "2026-04-22 10:32:18"
    },
    scan_count: 0
  };
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

function setCountSync(n) {
  _memoryCount = n;
  try { fs.writeFileSync(TMP_FILE, String(n), 'utf8'); } catch (e) {}
}

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    var baseData = loadBaseData();
    if (!baseData) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'failed to read data' }));
    }

    if (req.method === 'GET') {
      var cnt = getCountSync();
      baseData.scan_count = cnt;
      res.statusCode = 200;
      return res.end(JSON.stringify(baseData));
    }

    if (req.method === 'POST') {
      var body = {};
      try {
        body = req.body ? (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) : {};
      } catch (e) { body = {}; }

      if (body.reset === true) {
        setCountSync(0);
        baseData.scan_count = 0;
        res.statusCode = 200;
        return res.end(JSON.stringify(baseData));
      }

      if (body.increment === false) {
        var cnt2 = getCountSync();
        baseData.scan_count = cnt2;
        res.statusCode = 200;
        return res.end(JSON.stringify(baseData));
      }

      var cur = getCountSync();
      var next = cur + 1;
      setCountSync(next);
      baseData.scan_count = next;
      console.log('[scan] increment: ' + cur + ' -> ' + next);

      res.statusCode = 200;
      return res.end(JSON.stringify(baseData));
    }
  } catch (err) {
    console.error('[scan.js] error:', err.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal server error', detail: err.message }));
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'method not allowed' }));
};