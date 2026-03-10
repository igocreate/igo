
const fs    = require('fs');
const http  = require('http');
const path  = require('path');

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const dim    = (s) => `\x1b[2m${s}\x1b[0m`;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
};

const LIVERELOAD_SCRIPT = `<script>
(function() {
  var source;
  function connect() {
    source = new EventSource('/__reload');
    source.onmessage = function() { location.reload(); };
    source.onerror = function() { source.close(); setTimeout(connect, 1000); };
  }
  connect();
})();
</script>`;

//
module.exports = (rootDir, { port = 3000, watchDirs = [], onBeforeReload }) => {
  const sseClients = [];

  // Static file server with live reload injection
  const server = http.createServer((req, res) => {
    // SSE endpoint
    if (req.url === '/__reload') {
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      });
      res.write('\n');
      sseClients.push(res);
      req.on('close', () => {
        const idx = sseClients.indexOf(res);
        if (idx !== -1) sseClients.splice(idx, 1);
      });
      return;
    }

    // Resolve file path
    let urlPath = req.url.split('?')[0];
    if (urlPath.endsWith('/')) urlPath += 'index.html';

    let filePath = path.join(rootDir, urlPath);

    // Clean URL fallback: /about → /about/index.html
    if (!fs.existsSync(filePath) && !path.extname(filePath)) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Inject live reload script into HTML
    if (ext === '.html') {
      let html = fs.readFileSync(filePath, 'utf8');
      html = html.replace('</body>', LIVERELOAD_SCRIPT + '</body>');
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(html);
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
  });

  server.listen(port, () => {
    console.log(green(`\n✦ Serving on http://localhost:${port}`));
    console.log(dim('  Watching for changes...\n'));
  });

  // File watcher with debounce
  let debounceTimer = null;
  let running = false;

  const onChange = async () => {
    if (running) return;
    running = true;
    console.log(dim('\n  File changed, regenerating...'));
    try {
      if (onBeforeReload) await onBeforeReload();
      for (const client of sseClients) {
        client.write('data: reload\n\n');
      }
    } catch (err) {
      console.error('Generation error:', err.message);
    }
    running = false;
  };

  for (const dir of watchDirs) {
    if (!fs.existsSync(dir)) continue;
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onChange, 300);
    });
  }
};
