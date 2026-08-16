# -*- coding: utf-8 -*-
import json
import os
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data.json')
lock = threading.Lock()


class DataHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/visit':
            return self._handle_visit()
        if self.path == '/api/data':
            return self._handle_data()
        return super().do_GET()

    def _handle_visit(self):
        with lock:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
            data['scan_count'] = int(data.get('scan_count', 0)) + 1
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        self._send_json(data)

    def _handle_data(self):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        self._send_json(data)

    def _send_json(self, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("[server]", fmt % args)


if __name__ == '__main__':
    port = 8000
    server = HTTPServer(('0.0.0.0', port), DataHandler)
    print(f"天鉴数链 Demo 服务已启动: http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
        server.server_close()