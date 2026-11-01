#!/usr/bin/env python3
# Local dev server: static files + POST /console appends browser errors to LOG (one JSON per line).
import http.server, sys, json, time
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 7810
LOG = '/tmp/p2p-go-console.jsonl'

class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/console': return self.send_error(404)
        body = self.rfile.read(min(int(self.headers.get('content-length', 0)), 65536)).decode('utf-8', 'replace')
        with open(LOG, 'a') as f: f.write(json.dumps({'t': time.strftime('%H:%M:%S'), 'ua': self.headers.get('user-agent', '')[:60], 'msg': body}) + '\n')
        self.send_response(204); self.end_headers()
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(('', PORT), H).serve_forever()
