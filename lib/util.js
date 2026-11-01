export const PROVIDER = (process.env.PAYMENT_PROVIDER || 'dodo').toLowerCase();

// Leaderboards count "points": 1 point = ₹1. Dollar payments are converted at a fixed rate,
// so Indian and international fans compete on the same scale.
export const USD_INR = Number(process.env.USD_INR || 85);
export const SYMBOLS = { INR: '₹', USD: '$' };
export const MIN = { INR: parseInt(process.env.MIN_INR || '99', 10), USD: parseInt(process.env.MIN_USD || '5', 10) };
export const MAX = { INR: parseInt(process.env.MAX_INR || '500000', 10), USD: parseInt(process.env.MAX_USD || '5000', 10) };
export const toPoints = (amount, currency) => (currency === 'USD' ? Math.round(amount * USD_INR) : Math.round(amount));

// Which currency a visitor pays in: rupees in India, dollars everywhere else.
// Razorpay can only take rupees and Stripe here is set up for dollars.
export function currencyFor(req) {
  if (PROVIDER === 'razorpay') return 'INR';
  if (PROVIDER === 'stripe') return 'USD';
  const q = new URL(req.url, 'http://x').searchParams.get('cur');
  if (q === 'INR' || q === 'USD') return q;
  const country = String(req.headers['x-vercel-ip-country'] || process.env.DEFAULT_COUNTRY || '').toUpperCase();
  return country === 'IN' ? 'INR' : 'USD';
}

export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (host && host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function readRaw(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString('utf8');
}

export async function readJson(req) {
  const raw = await readRaw(req);
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function send(res, status, data, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache || 'no-store');
  res.end(JSON.stringify(data));
}

// ---- Moderation: a basic word filter (English + Hinglish). Admins can hide anything via /api/admin.
const BLOCK = [
  'fuck', 'fuk', 'shit', 'cunt', 'bitch', 'whore', 'slut', 'nigg', 'fag', 'retard', 'rape', 'porn', 'nazi', 'hitler',
  'kys', 'killyourself', 'dick', 'pussy', 'cock', 'asshole', 'bastard',
  'chutiy', 'madarch', 'behench', 'bhench', 'bhosd', 'randi', 'gaand', 'lund', 'lawde', 'lavde', 'harami', 'kutt',
];
export function isClean(text) {
  const t = String(text || '').toLowerCase()
    .replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't')
    .replace(/[^a-z]/g, '');
  if (/(^|[^a-z])(bc|mc)([^a-z]|$)/i.test(String(text))) return false;
  return !BLOCK.some((w) => t.includes(w));
}

export function cleanText(s, max) {
  return String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
