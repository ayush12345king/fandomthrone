import crypto from 'node:crypto';
import { CURRENCY, PROVIDER } from './util.js';

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

// meta: { board, contenderId?, newName?, amount, backer, message }
export async function createCheckout(meta, label, site) {
  const minor = meta.amount * 100;
  const metadata = {
    board: meta.board, contenderId: meta.contenderId || '', newName: meta.newName || '',
    amount: String(meta.amount), backer: meta.backer, message: meta.message || '',
  };
  if (PROVIDER === 'stripe') {
    const s = await stripe('POST', '/checkout/sessions', {
      mode: 'payment',
      success_url: `${site}/thanks?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/b/${meta.board}`,
      line_items: { 0: { quantity: 1, price_data: { currency: CURRENCY.toLowerCase(), unit_amount: minor, product_data: { name: label, description: 'Leaderboard visibility on Fandom Throne. No prize, non-refundable.' } } } },
      metadata,
      payment_intent_data: { description: label },
    });
    return { provider: 'stripe', url: s.url };
  }
  if (PROVIDER === 'razorpay') {
    const o = await razorpay('POST', '/orders', { amount: minor, currency: CURRENCY, receipt: `ft_${Date.now()}`, notes: metadata });
    return { provider: 'razorpay', orderId: o.id, keyId: process.env.RAZORPAY_KEY_ID, amount: minor, currency: CURRENCY, label };
  }
  throw new Error('Unknown PAYMENT_PROVIDER');
}

const metaFrom = (m) => ({
  board: m.board, contenderId: m.contenderId || null, newName: m.newName || null,
  amount: parseInt(m.amount, 10), backer: m.backer, message: m.message || '',
});

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
