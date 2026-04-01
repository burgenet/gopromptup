'use strict';
// Lightweight dev server: serves static files + proxies /api -> backend
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = 5173;
const API_TARGET = process.env.API_PROXY_TARGET || 'http://localhost:3010';

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

// http-proxy-middleware v3: createProxyMiddleware returns an express-compatible
// middleware. For a raw http.Server we must use the .upgrade + request handler
// approach, or simply use the middleware with a shim next().
const apiProxy = createProxyMiddleware({
  target: API_TARGET,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      res.writeHead(502);
      res.end('Proxy error: ' + err.message);
    },
  },
});

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    return apiProxy(req, res, (err) => {
      if (err) {
        res.writeHead(502);
        res.end('Proxy error: ' + (err && err.message));
      }
    });
  }

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  filePath = filePath.split('?')[0];

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[gopromptup-frontend] dev server on http://localhost:${PORT}`);
  console.log(`[gopromptup-frontend] proxying /api -> ${API_TARGET}`);
});
