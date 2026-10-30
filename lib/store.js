import { cmd, pipe } from './redis.js';
import { BOARDS, getBoard, seedList, slugify } from './boards.js';

const K = {
  z: (b) => `ft:z:${b}`,
  zw: (b, w) => `ft:zw:${b}:${w}`,
  c: (b, id) => `ft:c:${b}:${id}`,
  custom: (b) => `ft:custom:${b}`,
  hidden: (b) => `ft:hidden:${b}`,
  backers: (b, id) => `ft:bk:${b}:${id}`,
  feed: 'ft:feed',
  feedB: (b) => `ft:feed:${b}`,
  paid: (p) => `ft:paid:${p}`,
  result: (p) => `ft:result:${p}`,
  stats: 'ft:stats',
};

export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const wk = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}

const pairs = (flat) => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = flat[i + 1]; return o; };
const zpairs = (flat) => { const m = new Map(); for (let i = 0; i < (flat || []).length; i += 2) m.set(flat[i], Number(flat[i + 1])); return m; };

// All contenders on a board (seeds + fan-added, minus hidden).
async function contenders(boardId) {
  const board = getBoard(boardId);
  const [custom, hidden] = await pipe([['SMEMBERS', K.custom(boardId)], ['SMEMBERS', K.hidden(boardId)]]);
  const hid = new Set(hidden || []);
  const list = seedList(board).filter((c) => !hid.has(c.id));
  const seedIds = new Set(list.map((c) => c.id));
  const extra = (custom || []).filter((id) => !hid.has(id) && !seedIds.has(id));
  if (extra.length) {
    const names = await pipe(extra.map((id) => ['HGET', K.c(boardId, id), 'name']));
    extra.forEach((id, i) => list.push({ id, name: names[i] || id, order: 1000 + i, custom: true }));
  }
  return list;
}

export async function findContender(boardId, id) {
  return (await contenders(boardId)).find((c) => c.id === id) || null;
}

export async function readBoard(boardId, period = 'all') {
  const board = getBoard(boardId);
  if (!board) return null;
  const list = await contenders(boardId);
  const [allFlat, weekFlat, feed] = await pipe([
    ['ZREVRANGE', K.z(boardId), 0, -1, 'WITHSCORES'],
    ['ZREVRANGE', K.zw(boardId, weekKey()), 0, -1, 'WITHSCORES'],
    ['LRANGE', K.feedB(boardId), 0, 24],
  ]);
  const all = zpairs(allFlat);
  const week = zpairs(weekFlat);
  const metas = await pipe(list.map((c) => ['HGETALL', K.c(boardId, c.id)]));
  const tops = await pipe(list.map((c) => ['ZREVRANGE', K.backers(boardId, c.id), 0, 0, 'WITHSCORES']));
  const rows = list.map((c, i) => {
    const m = pairs(metas[i]);
    const tb = tops[i] || [];
    return {
      id: c.id, name: c.name, custom: !!c.custom,
      total: all.get(c.id) || 0, week: week.get(c.id) || 0,
      topBacker: tb[0] || null, topBackerAmount: tb[1] ? Number(tb[1]) : 0,
      lastBacker: m.lastBacker || null, lastMsg: m.lastMsg || null, lastAt: m.lastAt ? Number(m.lastAt) : null,
      firstAt: m.firstAt ? Number(m.firstAt) : Infinity, order: c.order,
    };
  });
  const key = period === 'week' ? 'week' : 'total';
  rows.sort((a, b) => (b[key] - a[key]) || (a.firstAt - b.firstAt) || (a.order - b.order));
  rows.forEach((r, i) => { r.rank = i + 1; if (r.firstAt === Infinity) r.firstAt = null; delete r.order; });
  return {
    board: { id: board.id, name: board.name, color: board.color, ink: board.ink, blurb: board.blurb },
    period: key === 'week' ? 'week' : 'all', week: weekKey(), rows,
    feed: (feed || []).map((s) => JSON.parse(s)),
  };
}

export async function overview() {
  const cmds = [];
  BOARDS.forEach((b) => cmds.push(['ZREVRANGE', K.z(b.id), 0, 0, 'WITHSCORES']));
  cmds.push(['LRANGE', K.feed, 0, 29], ['HGETALL', K.stats]);
  const res = await pipe(cmds);
  const boards = await Promise.all(BOARDS.map(async (b, i) => {
    const [id, score] = res[i] || [];
    let leader = null;
    if (id) {
      const seed = seedList(b).find((c) => c.id === id);
      leader = { id, name: seed ? seed.name : (await cmd('HGET', K.c(b.id, id), 'name')) || id, total: Number(score) };
    } else {
      const first = seedList(b)[0];
      leader = { id: first.id, name: first.name, total: 0 };
    }
    return { id: b.id, name: b.name, color: b.color, ink: b.ink, blurb: b.blurb, leader };
  }));
  const stats = pairs(res[BOARDS.length + 1]);
  return {
    boards,
    feed: (res[BOARDS.length] || []).map((s) => JSON.parse(s)),
    stats: { raised: Number(stats.raised || 0), bids: Number(stats.bids || 0) },
  };
}

// Resolve a new fan-added name to an id (reuse an existing contender with the same name).
export async function resolveNew(boardId, name) {
  const list = await contenders(boardId);
  const want = slugify(name);
  const hit = list.find((c) => slugify(c.name) === want);
  if (hit) return { id: hit.id, name: hit.name, isNew: false };
  return { id: want, name, isNew: true };
}

// Credit a confirmed payment exactly once. Returns the stored result.
export async function credit({ paymentId, board, contenderId, newName, amount, backer, message }) {
  const first = await cmd('SET', K.paid(paymentId), '1', 'NX');
  if (first === null) {
    const prev = await cmd('GET', K.result(paymentId));
    return prev ? JSON.parse(prev) : null;
  }
  const b = getBoard(board);
  amount = Math.floor(Number(amount));
  let id = contenderId, name;
  if (newName) {
    const r = await resolveNew(board, newName);
    id = r.id; name = r.name;
    if (r.isNew) await pipe([['SADD', K.custom(board), id], ['HSET', K.c(board, id), 'name', name]]);
  } else {
    const c = await findContender(board, id);
    name = c ? c.name : id;
  }
  const before = await cmd('ZREVRANGE', K.z(board), 0, 0);
  const prevTop = before && before[0];
  const now = Date.now();
  const wk = K.zw(board, weekKey());
  const out = await pipe([
    ['ZINCRBY', K.z(board), amount, id],
    ['ZINCRBY', wk, amount, id],
    ['EXPIRE', wk, 60 * 60 * 24 * 60],
    ['HSETNX', K.c(board, id), 'firstAt', now],
    message ? ['HSET', K.c(board, id), 'name', name, 'lastBacker', backer, 'lastMsg', message, 'lastAt', now] : ['HSET', K.c(board, id), 'name', name, 'lastAt', now],
    ['ZINCRBY', K.backers(board, id), amount, backer],
    ['HINCRBY', K.stats, 'raised', amount],
    ['HINCRBY', K.stats, 'bids', 1],
  ]);
  const total = Number(out[0]);
  const after = await cmd('ZREVRANGE', K.z(board), 0, -1);
  const rankIdx = after.indexOf(id);
  const tookThrone = after[0] === id && prevTop !== id;
  let dethroned = null;
  if (tookThrone && prevTop) {
    const seed = seedList(b).find((c) => c.id === prevTop);
    dethroned = seed ? seed.name : await cmd('HGET', K.c(board, prevTop), 'name');
  }
  const event = { board, boardName: b.name, color: b.color, id, name, amount, backer, message: message || '', at: now, tookThrone, dethroned };
  const ev = JSON.stringify(event);
  const result = { ...event, total, rank: rankIdx + 1, paymentId };
  await pipe([
    ['LPUSH', K.feed, ev], ['LTRIM', K.feed, 0, 99],
    ['LPUSH', K.feedB(board), ev], ['LTRIM', K.feedB(board), 0, 99],
    ['SET', K.result(paymentId), JSON.stringify(result), 'EX', 60 * 60 * 24 * 30],
  ]);
  return result;
}

export async function getResult(paymentId) {
  const r = await cmd('GET', K.result(paymentId));
  return r ? JSON.parse(r) : null;
}

export async function adminAction({ action, board, id }) {
  if (action === 'hide') { await cmd('SADD', K.hidden(board), id); await cmd('ZREM', K.z(board), id); return 'hidden'; }
  if (action === 'unhide') { await cmd('SREM', K.hidden(board), id); return 'unhidden (score reset to 0)'; }
  if (action === 'clearMsg') { await cmd('HSET', K.c(board, id), 'lastMsg', ''); return 'message cleared'; }
  if (action === 'rename') return 'not supported';
  throw new Error('unknown action');
}
