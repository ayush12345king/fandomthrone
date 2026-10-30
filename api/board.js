import { readBoard } from '../lib/store.js';
import { send } from '../lib/util.js';

export default async function handler(req, res) {
  const q = new URL(req.url, 'http://x').searchParams;
  try {
    const data = await readBoard(q.get('id'), q.get('period'));
    if (!data) return send(res, 404, { error: 'This board does not exist.' });
    send(res, 200, data, 'public, s-maxage=10, stale-while-revalidate=30');
  } catch (e) { send(res, 500, { error: e.message }); }
}
