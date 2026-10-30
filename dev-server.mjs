// Local development server: serves /public like Vercel and runs /api/*.js handlers.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(root, 'public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const PORT = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z-]/g, '');
      const file = path.join(root, 'api', name + '.js');
      if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
      const mod = await import(pathToFileURL(file).href);
      return await mod.default(req, res);
    }
    let p = url.pathname;
    if (/^\/b\/[^/]+$/.test(p)) p = '/board.html';
    else if (p === '/') p = '/index.html';
    else if (!path.extname(p)) p += '.html';
    const f = path.join(pub, path.normalize(p));
    if (!f.startsWith(pub) || !fs.existsSync(f)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', types[path.extname(f)] || 'application/octet-stream');
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    console.error(e);
    res.statusCode = 500; res.end(String(e.message));
  }
}).listen(PORT, () => console.log(`Fandom Throne dev server on http://localhost:${PORT}`));
