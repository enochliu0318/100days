import http.server, functools, sys

# 本地预览服务器:所有响应禁用缓存,保证刷新即是最新版
# 用法: python3 serve.py [端口]  (默认 8000)
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass

handler = functools.partial(NoCacheHandler, directory='public')
print(f'Serving public/ at http://localhost:{port} (no-cache)')
http.server.ThreadingHTTPServer(('0.0.0.0', port), handler).serve_forever()
