import { getResult, credit, getPending, saveResultAlias } from '../lib/store.js';
import { stripeSession, razorpayConfirm, dodoConfirm } from '../lib/payments.js';
import { readJson, send } from '../lib/util.js';

// GET ?ref=<our ref>&payment_id=<dodo id> | ?sid=<stripe session> | ?pid=<payment id>
// POST {orderId,paymentId,signature} for Razorpay
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const b = await readJson(req);
      const c = await razorpayConfirm({ orderId: b.orderId, paymentId: b.paymentId, signature: b.signature });
      if (!c) return send(res, 400, { error: 'We could not verify this payment. If you were charged, email us with your payment ID.' });
      return send(res, 200, await credit(c));
    }
    const q = new URL(req.url, 'http://x').searchParams;

    const ref = q.get('ref');
    if (ref) {
      let r = await getResult(ref);
      const paymentId = q.get('payment_id');
      if (!r && paymentId) {
        const pending = await getPending(ref);
        if (!pending) return send(res, 404, { error: 'This checkout has expired. If you were charged, email us with your payment ID.' });
        const ok = await dodoConfirm(paymentId, pending, ref);
        if (ok) {
          r = await credit({ paymentId: ok, ...pending, amount: pending.points, paid: pending.amount });
          await saveResultAlias(ref, r);
        }
      }
      if (!r) {
        const status = q.get('status');
        if (status && status !== 'succeeded') return send(res, 402, { error: 'The payment did not go through, so nothing was charged. You can try again from the board.' });
        return send(res, 404, { error: 'Payment not confirmed yet. Refresh in a few seconds.' });
      }
      return send(res, 200, r);
    }

    const id = q.get('sid') || q.get('pid');
    if (!id) return send(res, 400, { error: 'Missing payment reference.' });
    let r = await getResult(id);
    if (!r && q.get('sid')) {
      const c = await stripeSession(id);
      if (c) r = await credit(c);
    }
    if (!r) return send(res, 404, { error: 'Payment not confirmed yet. Refresh in a few seconds.' });
    send(res, 200, r);
  } catch (e) { send(res, 500, { error: e.message }); }
}
