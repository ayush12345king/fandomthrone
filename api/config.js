import { SYMBOLS, MIN, MAX, PROVIDER, USD_INR, currencyFor, send } from '../lib/util.js';
import { BOARDS } from '../lib/boards.js';

// Per-visitor settings: rupees for visitors in India, dollars elsewhere (?cur=INR|USD overrides).
export default function handler(req, res) {
  const currency = currencyFor(req);
  res.setHeader('Vary', 'X-Vercel-IP-Country');
  send(res, 200, {
    currency, symbol: SYMBOLS[currency], minBid: MIN[currency], maxBid: MAX[currency],
    rate: currency === 'USD' ? USD_INR : 1, provider: PROVIDER,
    canSwitch: PROVIDER === 'dodo' || PROVIDER === 'dev',
    boards: BOARDS.map(({ id, name, short, color, ink, blurb }) => ({ id, name, short, color, ink, blurb })),
  }, 'private, max-age=300');
}
