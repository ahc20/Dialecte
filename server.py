#!/usr/bin/env python3
import http.server
import socketserver
import os

# Changer le répertoire de travail vers public
os.chdir('public')

PORT = 8080

Handler = http.server.SimpleHTTPRequestHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serveur démarré sur http://localhost:{PORT}")
    print("Appuyez sur Ctrl+C pour arrêter")
    httpd.serve_forever() 