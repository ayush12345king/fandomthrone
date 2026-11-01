import { getBoard } from '../lib/boards.js';
import { findContender, credit, savePending } from '../lib/store.js';
import { createCheckout } from '../lib/payments.js';
import { readJson, send, siteUrl, cleanText, isClean, MIN, MAX, PROVIDER, SYMBOLS, currencyFor, toPoints } from '../lib/util.js';
import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  const b = await readJson(req);
  const board = getBoard(b.board);
  if (!board) return send(res, 400, { error: 'Pick a board first.' });

  // The client says which currency it showed; anything unexpected falls back to the visitor's own.
  const currency = ['INR', 'USD'].includes(b.currency) && (PROVIDER === 'dodo' || PROVIDER === 'dev') ? b.currency : currencyFor(req);
  const amount = Number(b.amount);
  if (!Number.isInteger(amount) || amount < MIN[currency] || amount > MAX[currency])
    return send(res, 400, { error: `Enter a whole amount from ${SYMBOLS[currency]}${MIN[currency]} to ${SYMBOLS[currency]}${MAX[currency].toLocaleString()}.` });

  const backer = cleanText(b.backer, 24) || 'Anonymous fan';
  const message = cleanText(b.message, 80);
  if (!isClean(backer)) return send(res, 400, { error: 'Your display name has words we don\'t allow. Pick another one.' });
  if (!isClean(message)) return send(res, 400, { error: 'Your message has words we don\'t allow. Edit it and try again.' });

  let contenderId = null, newName = null, name;
  if (b.newName) {
    newName = cleanText(b.newName, 40);
    if (newName.length < 2) return send(res, 400, { error: 'The new name needs at least 2 characters.' });
    if (!isClean(newName)) return send(res, 400, { error: 'That name has words we don\'t allow.' });
    name = newName;
  } else {
    const c = await findContender(board.id, String(b.contenderId || ''));
    if (!c) return send(res, 400, { error: 'That name isn\'t on this board.' });
    contenderId = c.id; name = c.name;
  }
  const meta = { board: board.id, contenderId, newName, amount, currency, points: toPoints(amount, currency), backer, message };
  const label = `Shoutout for ${name} on ${board.name} | Fandom Throne`;
  try {
    if (PROVIDER === 'dev') {
      if (process.env.LOCAL_DEV !== '1') return send(res, 500, { error: 'Payments are not configured.' });
      const pid = 'dev_' + crypto.randomUUID();
      await credit({ paymentId: pid, ...meta, amount: meta.points, paid: amount });
      return send(res, 200, { provider: 'dev', url: `/thanks?pid=${pid}` });
    }
    const ref = crypto.randomUUID();
    await savePending(ref, meta);
    const out = await createCheckout(meta, label, siteUrl(req), ref);
    send(res, 200, out);
  } catch (e) { send(res, 502, { error: 'The payment page could not be opened. Try again in a moment. (' + e.message + ')' }); }
}
