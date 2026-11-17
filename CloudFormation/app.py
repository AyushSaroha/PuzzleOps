from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


INDEX_FILE = Path(__file__).with_name("index.html")


class PuzzleOpsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            content = b'{"status":"ok"}'
            content_type = "application/json"
            status = 200
        elif self.path in ("/", "/index.html"):
            content = INDEX_FILE.read_bytes()
            content_type = "text/html; charset=utf-8"
            status = 200
        else:
            self.send_error(404)
            return

        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 5000), PuzzleOpsHandler).serve_forever()
