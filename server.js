const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const INDEX = path.join(ROOT, 'index.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function writeData(d) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2), 'utf-8');
}

function sendJSON(res, obj, status) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status || 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const ct = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading file');
      return;
    }
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    sendJSON(res, {}, 200);
    return;
  }

  if (req.url === '/api/scan' || req.url === '/api/scan?') {
    const bodyChunks = [];
    req.on('data', (chunk) => bodyChunks.push(chunk));
    req.on('end', () => {
      let body = {};
      try {
        const raw = Buffer.concat(bodyChunks).toString('utf-8');
        if (raw) body = JSON.parse(raw);
      } catch (e) {}

      if (req.method === 'GET') {
        const data = readData();
        sendJSON(res, {
          scan_count: data.scan_count || 0,
          incremented: false,
          ...data,
        });
        return;
      }

      if (req.method === 'POST') {
        const data = readData();
        const current = data.scan_count || 0;

        if (body.reset === true) {
          data.scan_count = 0;
          writeData(data);
          sendJSON(res, {
            scan_count: 0,
            previous: current,
            reset: true,
          });
          return;
        }

        const next = current + 1;
        data.scan_count = next;
        writeData(data);
        sendJSON(res, {
          scan_count: next,
          previous: current,
          incremented: true,
        });
        return;
      }

      sendJSON(res, { error: 'Method not allowed' }, 405);
    });
    return;
  }

  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    sendFile(res, filePath);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  服务器已启动: http://localhost:${PORT}`);
  console.log(`  API 端点:   http://localhost:${PORT}/api/scan`);
  console.log(`\n  用手机扫码二维码或打开 http://<你的电脑IP>:${PORT} 测试\n`);
});