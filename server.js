const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = __dirname;
const STATIC_ROOT = path.join(ROOT, 'src');
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';

const PUBLIC_ROUTES = new Map([
  ['/', 'host/index.html'],
  ['/index.html', 'host/index.html'],
  ['/host.js', 'host/host.js'],
  ['/portal.html', 'portal/portal.html'],
  ['/portal.js', 'portal/portal.js'],
  ['/audio-widget.js', 'widget/audio-widget.js'],
  ['/widget.css', 'widget/widget.css'],
  ['/styles.css', 'shared/styles.css'],
]);

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function getNetworkAddresses() {
  return Object.values(os.networkInterfaces())
    .flatMap((interfaces) => interfaces || [])
    .filter((networkInterface) => networkInterface.family === 'IPv4' && !networkInterface.internal)
    .map((networkInterface) => networkInterface.address);
}

function resolveFile(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const relativePath = PUBLIC_ROUTES.get(pathname);

  if (!relativePath) {
    return null;
  }

  const filePath = path.resolve(STATIC_ROOT, relativePath);

  if (filePath !== STATIC_ROOT && !filePath.startsWith(`${STATIC_ROOT}${path.sep}`)) {
    return null;
  }

  return filePath;
}

const server = http.createServer((request, response) => {
  let filePath;

  try {
    filePath = resolveFile(request.url || '/');
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const contentType = CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream';
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': contentType,
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Audio widget spike: http://localhost:${PORT}`);
  for (const address of getNetworkAddresses()) {
    console.log(`Device URL: http://${address}:${PORT}`);
  }
});