import { razorpayWebhookVerify, razorpayOrderPaid } from '../lib/payments.js';
import { credit } from '../lib/store.js';
import { readRaw, send } from '../lib/util.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const raw = await readRaw(req);
  const event = razorpayWebhookVerify(raw, req.headers['x-razorpay-signature']);
  if (!event) return send(res, 400, { error: 'bad signature' });
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const p = event.payload.payment && event.payload.payment.entity;
    if (p && p.order_id) {
      const c = await razorpayOrderPaid(p.order_id, p.id);
      if (c) await credit(c);
    }
  }
  send(res, 200, { received: true });
}
