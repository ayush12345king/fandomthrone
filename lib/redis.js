// Upstash Redis over its REST API (no dependencies). Locally (LOCAL_DEV=1, no Redis env) an in-memory mock is used.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

function useMock() {
  if (URL_ && TOKEN) return false;
  if (process.env.LOCAL_DEV === '1') return true;
  throw new Error('Database not configured: set KV_REST_API_URL and KV_REST_API_TOKEN');
}

export async function cmd(...args) {
  if (useMock()) return mock(args.map(String));
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args.map(String)),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export async function pipe(cmds) {
  if (!cmds.length) return [];
  if (useMock()) return cmds.map((c) => mock(c.map(String)));
  const r = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds.map((c) => c.map(String))),
  });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error(j.error || 'Redis pipeline failed');
  return j.map((x) => { if (x.error) throw new Error(x.error); return x.result; });
}

// ---------- in-memory mock (local development only) ----------
const db = globalThis.__ftMock || (globalThis.__ftMock = new Map());
const get = (k, type, init) => {
  let v = db.get(k);
  if (!v) { v = init(); db.set(k, v); }
  return v;
};
function mock([c, k, ...a]) {
  switch (c.toUpperCase()) {
    case 'GET': return db.has(k) ? db.get(k) : null;
    case 'SET': {
      const nx = a.map((x) => x.toUpperCase()).includes('NX');
      if (nx && db.has(k)) return null;
      db.set(k, a[0]); return 'OK';
    }
    case 'DEL': return db.delete(k) ? 1 : 0;
    case 'EXPIRE': return 1;
    case 'ZINCRBY': { const z = get(k, 'z', () => new Map()); const n = (z.get(a[1]) || 0) + Number(a[0]); z.set(a[1], n); return String(n); }
    case 'ZSCORE': { const z = db.get(k); return z && z.has(a[0]) ? String(z.get(a[0])) : null; }
    case 'ZREM': { const z = db.get(k); return z && z.delete(a[0]) ? 1 : 0; }
    case 'ZREVRANGE': {
      const z = db.get(k); if (!z) return [];
      const arr = [...z.entries()].sort((x, y) => y[1] - x[1]);
      const end = Number(a[1]) < 0 ? arr.length : Number(a[1]) + 1;
      const sl = arr.slice(Number(a[0]), end);
      return a[2] ? sl.flatMap(([m, s]) => [m, String(s)]) : sl.map(([m]) => m);
    }
    case 'HSET': { const h = get(k, 'h', () => new Map()); for (let i = 0; i < a.length; i += 2) h.set(a[i], a[i + 1]); return 1; }
    case 'HSETNX': { const h = get(k, 'h', () => new Map()); if (h.has(a[0])) return 0; h.set(a[0], a[1]); return 1; }
    case 'HGET': { const h = db.get(k); return h && h.has(a[0]) ? h.get(a[0]) : null; }
    case 'HGETALL': { const h = db.get(k); return h ? [...h.entries()].flat() : []; }
    case 'HINCRBY': { const h = get(k, 'h', () => new Map()); const n = Number(h.get(a[0]) || 0) + Number(a[1]); h.set(a[0], String(n)); return n; }
    case 'SADD': { const s = get(k, 's', () => new Set()); let n = 0; a.forEach((m) => { if (!s.has(m)) { s.add(m); n++; } }); return n; }
    case 'SREM': { const s = db.get(k); let n = 0; if (s) a.forEach((m) => { if (s.delete(m)) n++; }); return n; }
    case 'SMEMBERS': { const s = db.get(k); return s ? [...s] : []; }
    case 'LPUSH': { const l = get(k, 'l', () => []); a.forEach((v) => l.unshift(v)); return l.length; }
    case 'LTRIM': { const l = db.get(k); if (l) l.splice(Number(a[1]) + 1); return 'OK'; }
    case 'LRANGE': { const l = db.get(k) || []; const end = Number(a[1]) < 0 ? l.length : Number(a[1]) + 1; return l.slice(Number(a[0]), end); }
    default: throw new Error('mock: unsupported ' + c);
  }
}
