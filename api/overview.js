import { overview } from '../lib/store.js';
import { send } from '../lib/util.js';

export default async function handler(req, res) {
  try { send(res, 200, await overview(), 'public, s-maxage=3, stale-while-revalidate=10'); }
  catch (e) { send(res, 500, { error: e.message }); }
}
