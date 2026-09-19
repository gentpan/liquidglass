#!/usr/bin/env python3
"""Static file server for checking glass pages in headless browsers.

    python3 serve.py <directory> [port=4180]

Extras over `python3 -m http.server`:
  * Cache-Control: no-store, so edited JS is always re-fetched.
  * `<page>.html?hold=<ms>` injects an <img> that answers after <ms>. `firefox --screenshot` shoots
    as soon as the load event fires — before the displacement maps have decoded and the first
    animation frames have run — and a pending image holds that event back.
"""
import http.server
import os
import sys
import time
import urllib.parse

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 4180
GIF = bytes.fromhex('47494638396101000100800000000000ffffff21f90401000000002c00000000010001000002024401003b')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(url.query)
        if url.path == '/__delay':
            time.sleep(min(int(query.get('ms', ['1000'])[0]), 20000) / 1000)
            return self._send(GIF, 'image/gif')
        if url.path.endswith('.html') and 'hold' in query:
            path = os.path.normpath(os.path.join(ROOT, url.path.lstrip('/')))
            if not path.startswith(ROOT) or not os.path.isfile(path):
                return super().do_GET()
            with open(path, 'rb') as f:
                body = f.read()
            ms = int(query['hold'][0])
            body = body.replace(b'</body>', f'<img src="/__delay?ms={ms}" alt="" hidden></body>'.encode(), 1)
            return self._send(body, 'text/html; charset=utf-8')
        return super().do_GET()

    def _send(self, body, content_type):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    print(f'serving {ROOT} on http://127.0.0.1:{PORT}')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
