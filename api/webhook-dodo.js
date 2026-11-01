import { dodoWebhookVerify, dodoMatches } from '../lib/payments.js';
import { credit, getPending, saveResultAlias } from '../lib/store.js';
import { readRaw, send } from '../lib/util.js';

export const config = { api: { bodyParser: false } };

// Backup path: credits the shoutout even if the buyer closes the tab before the thank-you page loads.
export default async function handler(req, res) {
  const raw = await readRaw(req);
  const event = dodoWebhookVerify(raw, req.headers);
  if (!event) return send(res, 401, { error: 'bad signature' });
  if (event.type === 'payment.succeeded') {
    const p = event.data || {};
    const ref = p.metadata && p.metadata.ref;
    const pending = ref ? await getPending(ref) : null;
    if (pending && dodoMatches(p, pending, ref)) {
      const r = await credit({ paymentId: p.payment_id, ...pending, amount: pending.points, paid: pending.amount });
      await saveResultAlias(ref, r);
    }
  }
  send(res, 200, { received: true });
}
