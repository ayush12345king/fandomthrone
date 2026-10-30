import { stripeVerify, stripeEventToCredit } from '../lib/payments.js';
import { credit } from '../lib/store.js';
import { readRaw, send } from '../lib/util.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const raw = await readRaw(req);
  const event = stripeVerify(raw, req.headers['stripe-signature']);
  if (!event) return send(res, 400, { error: 'bad signature' });
  const c = stripeEventToCredit(event);
  if (c) await credit(c);
  send(res, 200, { received: true });
}
