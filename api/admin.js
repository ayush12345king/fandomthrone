import { adminAction } from '../lib/store.js';
import { readJson, send } from '../lib/util.js';
import { getBoard } from '../lib/boards.js';

// POST { token, action: 'hide' | 'unhide' | 'clearMsg', board, id }
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
  const b = await readJson(req);
  if (!process.env.ADMIN_TOKEN || b.token !== process.env.ADMIN_TOKEN) return send(res, 401, { error: 'Wrong admin token.' });
  if (!getBoard(b.board)) return send(res, 400, { error: 'Unknown board.' });
  try { send(res, 200, { ok: await adminAction(b) }); }
  catch (e) { send(res, 400, { error: e.message }); }
}
