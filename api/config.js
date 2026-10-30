import { CURRENCY, SYMBOL, MIN_BID, MAX_BID, PROVIDER, send } from '../lib/util.js';
import { BOARDS } from '../lib/boards.js';

export default function handler(req, res) {
  send(res, 200, {
    currency: CURRENCY, symbol: SYMBOL, minBid: MIN_BID, maxBid: MAX_BID, provider: PROVIDER,
    boards: BOARDS.map(({ id, name, color, ink, blurb }) => ({ id, name, color, ink, blurb })),
  }, 'public, s-maxage=300');
}
