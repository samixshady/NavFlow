#!/usr/bin/env python3
"""Simple HTTP server for serving frontend files."""

import http.server
import socketserver
import os
from pathlib import Path

# Change to the frontend directory
frontend_dir = Path(__file__).parent / 'frontend'
os.chdir(frontend_dir)

PORT = 8001

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()
    
    def do_GET(self):
        # Serve index.html for root and unknown paths
        if self.path == '/':
            self.path = '/index.html'
        elif not '.' in self.path:
            # If it's a route without a file extension, serve index.html
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"✅ Frontend server running at http://localhost:{PORT}")
    print(f"📁 Serving files from: {frontend_dir}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Frontend server stopped")
