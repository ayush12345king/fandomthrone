import crypto from 'node:crypto';
import { PROVIDER } from './util.js';

const RZP = 'https://api.razorpay.com/v1';
const STRIPE = 'https://api.stripe.com/v1';

function form(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v && typeof v === 'object') form(v, key, out);
    else if (v !== undefined && v !== null) out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return out.join('&');
}

async function stripe(method, path, body) {
  const r = await fetch(STRIPE + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body ? form(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || 'Stripe error');
  return j;
}

async function razorpay(method, path, body) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const r = await fetch(RZP + path, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.description || 'Razorpay error');
  return j;
}

const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const DODO = () => process.env.DODO_BASE || (process.env.DODO_ENV === 'live' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com');
async function dodo(method, path, body) {
  const r = await fetch(DODO() + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.DODO_API_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let j; try { j = text ? JSON.parse(text) : {}; } catch { j = { message: text }; }
  if (!r.ok) throw new Error(j.message || j.error || `Dodo error ${r.status}`);
  return j;
}

// meta: { board, contenderId?, newName?, amount (in currency), currency, points, backer, message }
export async function createCheckout(meta, label, site, ref) {
  const minor = meta.amount * 100;
  const metadata = {
    ref: ref || '', board: meta.board, contenderId: meta.contenderId || '', newName: meta.newName || '',
    amount: String(meta.amount), currency: meta.currency, points: String(meta.points), backer: meta.backer, message: meta.message || '',
  };
  if (PROVIDER === 'dodo') {
    const product = meta.currency === 'INR' ? process.env.DODO_PRODUCT_INR : process.env.DODO_PRODUCT_USD;
    if (!product) throw new Error(`Payments in ${meta.currency} are not set up yet.`);
    const s = await dodo('POST', '/checkouts', {
      product_cart: [{ product_id: product, quantity: 1, amount: minor }],
      return_url: `${site}/thanks?ref=${encodeURIComponent(ref)}`,
      metadata,
    });
    return { provider: 'dodo', url: s.checkout_url };
  }
  if (PROVIDER === 'stripe') {
    const s = await stripe('POST', '/checkout/sessions', {
      mode: 'payment',
      success_url: `${site}/thanks?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/b/${meta.board}`,
      line_items: { 0: { quantity: 1, price_data: { currency: meta.currency.toLowerCase(), unit_amount: minor, product_data: { name: label, description: 'A paid public shoutout on a Fandom Throne leaderboard. No prize, non-refundable.' } } } },
      metadata,
      payment_intent_data: { description: label },
    });
    return { provider: 'stripe', url: s.url };
  }
  if (PROVIDER === 'razorpay') {
    const o = await razorpay('POST', '/orders', { amount: minor, currency: meta.currency, receipt: `ft_${Date.now()}`, notes: metadata });
    return { provider: 'razorpay', orderId: o.id, keyId: process.env.RAZORPAY_KEY_ID, amount: minor, currency: meta.currency, label };
  }
  throw new Error('Unknown PAYMENT_PROVIDER');
}

const metaFrom = (m) => ({
  board: m.board, contenderId: m.contenderId || null, newName: m.newName || null,
  amount: parseInt(m.points || m.amount, 10), paid: parseInt(m.amount, 10), currency: m.currency || null,
  backer: m.backer, message: m.message || '',
});

// ---------- Dodo ----------
// The pending record (saved before checkout) is the source of truth for what was bought;
// the payment from Dodo must be succeeded, in the same currency and at least the same amount.
function dodoMatches(p, pending, ref) {
  if (!p || p.status !== 'succeeded') return false;
  // The ref is written by our server when it opens the checkout, so it ties this payment to this shoutout.
  if (!p.metadata || p.metadata.ref !== ref) return false;
  // Same currency: the paid total must cover the amount. If the buyer switched currency on Dodo's page,
  // Dodo converted the server-set price, so the matching ref is enough.
  if (String(p.currency || '').toUpperCase() !== pending.currency) return true;
  return Number(p.total_amount) >= pending.amount * 100;
}

export async function dodoConfirm(paymentId, pending, ref) {
  const p = await dodo('GET', `/payments/${encodeURIComponent(paymentId)}`);
  return dodoMatches(p, pending, ref) ? p.payment_id || paymentId : null;
}

// Standard Webhooks: HMAC-SHA256 over "id.timestamp.body" with the base64 key after "whsec_".
export function dodoWebhookVerify(raw, headers) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  const id = headers['webhook-id'], ts = headers['webhook-timestamp'], sig = headers['webhook-signature'];
  if (!secret || !id || !ts || !sig) return null;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return null;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest('base64');
  const ok = String(sig).split(' ').some((part) => { const [, v] = part.split(','); return v && safeEq(v, expected); });
  return ok ? JSON.parse(raw) : null;
}
export { dodoMatches };

// Stripe: confirm a Checkout Session after redirect.
export async function stripeSession(sid) {
  const s = await stripe('GET', `/checkout/sessions/${encodeURIComponent(sid)}`);
  if (s.payment_status !== 'paid') return null;
  return { paymentId: s.id, ...metaFrom(s.metadata) };
}

export function stripeVerify(raw, header) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return null;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')).filter((p) => p[0] === 't').map((p) => [p[0], p[1]]));
  const sigs = header.split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!parts.t || Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return null;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  if (!sigs.some((s) => safeEq(s, expected))) return null;
  return JSON.parse(raw);
}

export function stripeEventToCredit(event) {
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') return null;
  const s = event.data.object;
  if (s.payment_status !== 'paid') return null;
  return { paymentId: s.id, ...metaFrom(s.metadata) };
}

// Razorpay: verify the checkout handler response, then make sure the payment is captured.
export async function razorpayConfirm({ orderId, paymentId, signature }) {
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
  if (!safeEq(expected, signature)) return null;
  return razorpayOrderPaid(orderId, paymentId);
}

export async function razorpayOrderPaid(orderId, paymentId) {
  const order = await razorpay('GET', `/orders/${encodeURIComponent(orderId)}`);
  if (paymentId) {
    const p = await razorpay('GET', `/payments/${encodeURIComponent(paymentId)}`);
    if (p.order_id !== orderId) return null;
    if (p.status === 'authorized') await razorpay('POST', `/payments/${encodeURIComponent(paymentId)}/capture`, { amount: p.amount, currency: p.currency });
    else if (p.status !== 'captured') return null;
  } else if (order.status !== 'paid') return null;
  return { paymentId: order.id, ...metaFrom(order.notes) };
}

export function razorpayWebhookVerify(raw, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return safeEq(expected, signature) ? JSON.parse(raw) : null;
}
