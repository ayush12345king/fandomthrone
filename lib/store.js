import { cmd, pipe } from './redis.js';
import { BOARDS, getBoard, seedList, slugify, colorsFor } from './boards.js';

const K = {
  z: (b) => `ft:z:${b}`,
  zw: (b, w) => `ft:zw:${b}:${w}`,
  c: (b, id) => `ft:c:${b}:${id}`,
  custom: (b) => `ft:custom:${b}`,
  hidden: (b) => `ft:hidden:${b}`,
  backers: (b, id) => `ft:bk:${b}:${id}`,
  fans: (b) => `ft:fans:${b}`,
  reign: (b) => `ft:reign:${b}`,
  feed: 'ft:feed',
  feedB: (b) => `ft:feed:${b}`,
  paid: (p) => `ft:paid:${p}`,
  result: (p) => `ft:result:${p}`,
  stats: 'ft:stats',
  boardTotals: 'ft:boardtotals',
  record: 'ft:record',
};

export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const wk = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}

// Next Monday 00:00 UTC, when the weekly ranking starts over.
export function weekEndsAt(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + (8 - day));
  return t.getTime();
}

const pairs = (flat) => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = flat[i + 1]; return o; };
const zpairs = (flat) => { const m = new Map(); for (let i = 0; i < (flat || []).length; i += 2) m.set(flat[i], Number(flat[i + 1])); return m; };
const zlist = (flat) => { const out = []; for (let i = 0; i < (flat || []).length; i += 2) out.push({ name: flat[i], amount: Number(flat[i + 1]) }); return out; };

// All contenders on a board (seeds + fan-added, minus hidden), with crest colours.
async function contenders(boardId) {
  const board = getBoard(boardId);
  const [custom, hidden] = await pipe([['SMEMBERS', K.custom(boardId)], ['SMEMBERS', K.hidden(boardId)]]);
  const hid = new Set(hidden || []);
  const list = seedList(board).filter((c) => !hid.has(c.id));
  const seedIds = new Set(list.map((c) => c.id));
  const extra = (custom || []).filter((id) => !hid.has(id) && !seedIds.has(id));
  if (extra.length) {
    const names = await pipe(extra.map((id) => ['HGET', K.c(boardId, id), 'name']));
    extra.forEach((id, i) => {
      const name = names[i] || id;
      list.push({ id, name, order: 1000 + i, custom: true, ...colorsFor(name) });
    });
  }
  return list;
}

export async function findContender(boardId, id) {
  return (await contenders(boardId)).find((c) => c.id === id) || null;
}

const look = (c) => ({ c1: c.c1, c2: c.c2, pattern: c.pattern, abbr: c.abbr });

export async function readBoard(boardId, period = 'all') {
  const board = getBoard(boardId);
  if (!board) return null;
  const list = await contenders(boardId);
  const [allFlat, weekFlat, feed, fansFlat, reign, boardTotal] = await pipe([
    ['ZREVRANGE', K.z(boardId), 0, -1, 'WITHSCORES'],
    ['ZREVRANGE', K.zw(boardId, weekKey()), 0, -1, 'WITHSCORES'],
    ['LRANGE', K.feedB(boardId), 0, 24],
    ['ZREVRANGE', K.fans(boardId), 0, 9, 'WITHSCORES'],
    ['HGETALL', K.reign(boardId)],
    ['HGET', K.boardTotals, boardId],
  ]);
  const all = zpairs(allFlat);
  const week = zpairs(weekFlat);
  const metas = await pipe(list.map((c) => ['HGETALL', K.c(boardId, c.id)]));
  const tops = await pipe(list.map((c) => ['ZREVRANGE', K.backers(boardId, c.id), 0, 0, 'WITHSCORES']));
  const rows = list.map((c, i) => {
    const m = pairs(metas[i]);
    const tb = tops[i] || [];
    return {
      id: c.id, name: c.name, custom: !!c.custom, ...look(c),
      total: all.get(c.id) || 0, week: week.get(c.id) || 0,
      topBacker: tb[0] || null, topBackerAmount: tb[1] ? Number(tb[1]) : 0,
      lastBacker: m.lastBacker || null, lastMsg: m.lastMsg || null, lastAt: m.lastAt ? Number(m.lastAt) : null,
      firstAt: m.firstAt ? Number(m.firstAt) : Infinity, order: c.order,
    };
  });
  const key = period === 'week' ? 'week' : 'total';
  rows.sort((a, b) => (b[key] - a[key]) || (a.firstAt - b.firstAt) || (a.order - b.order));
  rows.forEach((r, i) => { r.rank = i + 1; if (r.firstAt === Infinity) r.firstAt = null; delete r.order; });
  const r = pairs(reign);
  return {
    board: { id: board.id, name: board.name, short: board.short, color: board.color, ink: board.ink, blurb: board.blurb },
    period: key === 'week' ? 'week' : 'all', week: weekKey(), weekEndsAt: weekEndsAt(),
    total: Number(boardTotal || 0),
    reign: r.id ? { id: r.id, since: Number(r.since) } : null,
    topFans: zlist(fansFlat),
    rows,
    feed: (feed || []).map((s) => JSON.parse(s)),
  };
}

export async function overview() {
  const cmds = [];
  BOARDS.forEach((b) => cmds.push(['ZREVRANGE', K.z(b.id), 0, 2, 'WITHSCORES'], ['HGETALL', K.reign(b.id)]));
  BOARDS.forEach((b) => b.rivalries.forEach(([x, y]) => cmds.push(['ZSCORE', K.z(b.id), x], ['ZSCORE', K.z(b.id), y])));
  cmds.push(['LRANGE', K.feed, 0, 29], ['HGETALL', K.stats], ['HGETALL', K.boardTotals], ['GET', K.record]);
  const res = await pipe(cmds);
  let i = 0;
  const totals = pairs(res[res.length - 2]);
  const boards = [];
  for (const b of BOARDS) {
    const topFlat = res[i++];
    const reign = pairs(res[i++]);
    const seeds = seedList(b);
    const top = [];
    for (let k = 0; k < (topFlat || []).length; k += 2) {
      const id = topFlat[k];
      let c = seeds.find((s) => s.id === id);
      if (!c) { const name = (await cmd('HGET', K.c(b.id, id), 'name')) || id; c = { id, name, ...colorsFor(name) }; }
      top.push({ id, name: c.name, total: Number(topFlat[k + 1]), ...look(c) });
    }
    const leader = top[0] || { ...seeds[0], total: 0 };
    boards.push({
      id: b.id, name: b.name, short: b.short, color: b.color, ink: b.ink, blurb: b.blurb,
      leader: { id: leader.id, name: leader.name, total: leader.total, ...look(leader) },
      top, total: Number(totals[b.id] || 0),
      reignSince: reign.id && reign.id === leader.id ? Number(reign.since) : null,
    });
  }
  const rivalries = [];
  for (const b of BOARDS) {
    const seeds = seedList(b);
    for (const [x, y] of b.rivalries) {
      const a = seeds.find((s) => s.id === x), c = seeds.find((s) => s.id === y);
      const sa = Number(res[i++] || 0), sc = Number(res[i++] || 0);
      rivalries.push({
        board: b.id, boardName: b.name, boardColor: b.color,
        a: { id: a.id, name: a.name, total: sa, ...look(a) },
        b: { id: c.id, name: c.name, total: sc, ...look(c) },
      });
    }
  }
  const feed = (res[i++] || []).map((s) => JSON.parse(s));
  const stats = pairs(res[i++]);
  i++; // board totals already read
  const record = res[i] ? JSON.parse(res[i]) : null;
  return {
    boards, rivalries, feed, record,
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
  let id = contenderId, contender;
  if (newName) {
    const r = await resolveNew(board, newName);
    id = r.id;
    if (r.isNew) await pipe([['SADD', K.custom(board), id], ['HSET', K.c(board, id), 'name', r.name]]);
  }
  contender = (await findContender(board, id)) || { id, name: newName || id, ...colorsFor(newName || id) };
  const name = contender.name;
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
    ['ZINCRBY', K.fans(board), amount, backer],
    ['HINCRBY', K.stats, 'raised', amount],
    ['HINCRBY', K.stats, 'bids', 1],
    ['HINCRBY', K.boardTotals, board, amount],
    ['GET', K.record],
  ]);
  const total = Number(out[0]);
  const rec = out[10] ? JSON.parse(out[10]) : null;
  const after = await cmd('ZREVRANGE', K.z(board), 0, -1);
  const rankIdx = after.indexOf(id);
  const tookThrone = after[0] === id && prevTop !== id;
  let dethroned = null;
  if (tookThrone && prevTop) {
    const seed = seedList(b).find((c) => c.id === prevTop);
    dethroned = seed ? seed.name : await cmd('HGET', K.c(board, prevTop), 'name');
  }
  const event = {
    board, boardName: b.name, color: b.color, id, name, amount, backer, message: message || '', at: now, tookThrone, dethroned,
    ...look(contender),
  };
  const ev = JSON.stringify(event);
  const result = { ...event, total, rank: rankIdx + 1, paymentId };
  const writes = [
    ['LPUSH', K.feed, ev], ['LTRIM', K.feed, 0, 99],
    ['LPUSH', K.feedB(board), ev], ['LTRIM', K.feedB(board), 0, 99],
    ['SET', K.result(paymentId), JSON.stringify(result), 'EX', 60 * 60 * 24 * 30],
  ];
  if (tookThrone) writes.push(['HSET', K.reign(board), 'id', id, 'since', now]);
  if (!rec || amount > rec.amount) writes.push(['SET', K.record, JSON.stringify({ amount, backer, name, board, boardName: b.name, at: now })]);
  await pipe(writes);
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
  if (action === 'hideFan') { await cmd('ZREM', K.fans(board), id); return 'fan removed from top fans'; }
  throw new Error('unknown action');
}
