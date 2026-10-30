// Shared front-end code for Fandom Throne.
export const CROWN = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><path d="M3 10l6.5 5L16 5l6.5 10L29 10l-3 15H6L3 10z"/><rect x="6" y="26.5" width="20" height="3" rx="1"/></svg>';
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let CFG = null;
export async function config() {
  if (!CFG) CFG = await getJSON('/api/config');
  return CFG;
}
export async function getJSON(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({ error: 'Unexpected server response.' }));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function money(n, cfg = CFG) {
  const loc = cfg && cfg.currency === 'INR' ? 'en-IN' : 'en-US';
  return (cfg ? cfg.symbol : '$') + Math.round(Number(n || 0)).toLocaleString(loc);
}
export function ago(t) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}
export function span(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (!m) return 'under a minute';
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${mm}m`;
  return `${mm}m`;
}

// ---------- crests: original shields in each contender's colours ----------
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const inkOn = (hex) => (lum(hex) > 0.4 ? '#15172B' : '#FFFFFF');
// A colour that stays visible on both light and dark backgrounds.
export const barColor = (c) => { const l = lum(c.c1 || '#888888'); return l < 0.05 || l > 0.85 ? (c.c2 || '#F2B705') : c.c1; };
// Short label for buttons: the full name if short, otherwise its crest letters.
export const shortName = (c) => (c.name.length <= 15 ? c.name : (c.abbr || initials(c.name)));
export function initials(name) {
  const words = String(name).split(/[\s-]+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean);
  if (words.length === 1) { const w = words[0]; return (w.length <= 5 ? w : w.slice(0, 2)).toUpperCase(); }
  return words.slice(0, 3).map((w) => w[0]).join('').toUpperCase();
}
let crestN = 0;
const SHIELD = 'M50 4 L94 17 V58 C94 89 73 107 50 116 C27 107 6 89 6 58 V17 Z';
export function crest(c, size = 48, cls = '') {
  const c1 = c.c1 || '#15172B', c2 = c.c2 || '#F2B705', pat = c.pattern || 'solid';
  const id = 'cr' + (++crestN);
  let fill = `<rect width="100" height="120" fill="${c1}"/>`;
  if (pat === 'half') fill += `<rect x="50" width="50" height="120" fill="${c2}"/>`;
  if (pat === 'sash') fill += `<polygon points="-14,14 14,-14 114,106 86,134" fill="${c2}"/>`;
  if (pat === 'stripes') for (let x = 10; x < 100; x += 24) fill += `<rect x="${x}" width="12" height="120" fill="${c2}"/>`;
  if (pat === 'checker') for (let y = 0; y < 120; y += 16) for (let x = 0; x < 100; x += 16) if (((x + y) / 16) % 2 === 0) fill += `<rect x="${x}" y="${y}" width="16" height="16" fill="${c2}"/>`;
  const txt = c.abbr || initials(c.name || '');
  const fs = txt.length >= 5 ? 16 : txt.length === 4 ? 19 : txt.length === 3 ? 27 : 36;
  const plate = pat === 'solid'
    ? ''
    : `<circle cx="50" cy="60" r="27" fill="${c1}" stroke="${c2}" stroke-width="4"/>`;
  return `<svg class="crest ${cls}" viewBox="0 0 100 120" width="${size}" height="${Math.round(size * 1.2)}" role="img" aria-label="${esc(c.name || '')} crest">
    <defs><clipPath id="${id}"><path d="${SHIELD}"/></clipPath></defs>
    <g clip-path="url(#${id})">${fill}</g>
    <path d="${SHIELD}" fill="none" stroke="${c2}" stroke-width="5"/>
    <path d="${SHIELD}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>
    ${plate}
    <text x="50" y="${60 + fs * 0.36}" text-anchor="middle" font-family="'Big Shoulders Display', Impact, sans-serif" font-weight="900" font-size="${fs}" fill="${inkOn(c1)}" letter-spacing="0.5">${esc(txt)}</text>
  </svg>`;
}

// ---------- motion helpers ----------
export function countUp(el, to, fmt = money) {
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  if (reduceMotion || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now(), dur = 900;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - (1 - p) ** 3;
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

let toastWrap;
export function toast(html, color) {
  if (!toastWrap) { toastWrap = document.createElement('div'); toastWrap.className = 'toasts'; toastWrap.setAttribute('aria-live', 'polite'); document.body.appendChild(toastWrap); }
  const t = document.createElement('div');
  t.className = 'toast';
  if (color) t.style.setProperty('--c', color);
  t.innerHTML = html;
  toastWrap.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 5000);
}

export function confetti(colors = ['#F2B705', '#E5368B', '#1E7A46', '#0B4F9C', '#F26B1D', '#7A2BC9']) {
  if (reduceMotion) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const W = (cv.width = innerWidth), H = (cv.height = innerHeight);
  const parts = Array.from({ length: 160 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 200, y: H * 0.35, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  const frame = (t) => {
    ctx.clearRect(0, 0, W, H);
    parts.forEach((p) => {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
    if (t - t0 < 4000) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}

// ---------- ticker of latest bids ----------
export function renderTicker(el, items, boards) {
  let html;
  if (items.length) {
    html = items.slice(0, 16).map((e) => `<span class="tk">${crest(e, 18)}<b>${esc(e.backer)}</b> put ${money(e.amount)} on <b>${esc(e.name)}</b>${e.tookThrone ? ' <em>took #1</em>' : ''}</span>`).join('');
  } else {
    html = (boards || []).map((b) => `<span class="tk"><b>${esc(b.name)}</b> throne is unclaimed. The first bid takes it.</span>`).join('');
  }
  if (!html) return;
  el.innerHTML = `<div class="tk-track">${html}${html}</div>`;
}

export function feedHTML(items, showBoard) {
  if (!items.length) return '<p class="empty">No bids yet. The first one takes the throne.</p>';
  return '<ul class="feed">' + items.map((e) => `
    <li>
      ${crest(e, 30)}
      <span class="what"><b>${esc(e.backer)}</b> put ${money(e.amount)} on <b>${esc(e.name)}</b>${showBoard ? ` in ${esc(e.boardName)}` : ''}${e.tookThrone ? `<span class="crowned">${e.dethroned ? 'took #1 from ' + esc(e.dethroned) : 'took #1'}</span>` : ''}
        ${e.message ? `<span class="msg">“${esc(e.message)}”</span>` : ''}</span>
      <span class="when">${ago(e.at)}</span>
    </li>`).join('') + '</ul>';
}

// Show a toast for each bid newer than the last one seen.
let lastSeen = null;
export function announceNew(feed) {
  if (!feed.length) return;
  const newest = feed[0].at;
  if (lastSeen !== null) {
    feed.filter((e) => e.at > lastSeen).slice(0, 3).reverse().forEach((e) => {
      toast(`${crest(e, 34)}<span><b>${esc(e.backer)}</b> just put ${money(e.amount)} on <b>${esc(e.name)}</b>${e.tookThrone ? '. New #1!' : ''}</span>`, e.color);
    });
  }
  lastSeen = Math.max(lastSeen || 0, newest);
}

export function shareLinks(url, text) {
  const u = encodeURIComponent(url), t = encodeURIComponent(text);
  return `<div class="sharebar">
    <a class="sbtn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${t}&url=${u}">Post on X</a>
    <a class="sbtn" target="_blank" rel="noopener" href="https://wa.me/?text=${t}%20${u}">WhatsApp</a>
    <button class="sbtn" type="button" data-copy="${esc(url)}">Copy link</button>
  </div>`;
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Link copied'; setTimeout(() => (b.textContent = 'Copy link'), 1800); } catch {}
});

// ---------- bid dialog ----------
let dlg;
function ensureDialog() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <form method="dialog" novalidate>
      <div class="dlg-head"><div id="bd-crest"></div><div><h3 id="bd-title"></h3><p class="sub" id="bd-sub"></p></div></div>
      <label id="bd-newwrap" hidden>Who are you adding?
        <input id="bd-new" maxlength="40" autocomplete="off" placeholder="Name of the team, star or character">
      </label>
      <label>Amount <small id="bd-min"></small>
        <div class="money"><span id="bd-sym"></span><input id="bd-amt" type="number" inputmode="numeric" min="1" step="1" required></div>
      </label>
      <div class="chips" id="bd-chips"></div>
      <label>Your name on the board <small>(optional)</small>
        <input id="bd-backer" maxlength="24" autocomplete="nickname" placeholder="Anonymous fan">
      </label>
      <label>Message for the rivals <small>(optional, 80 characters)</small>
        <input id="bd-msg" maxlength="80" autocomplete="off" placeholder="Your move.">
      </label>
      <p class="err" id="bd-err" role="alert"></p>
      <p class="fine">You're paying for a spot on a public leaderboard. There's no prize and payments aren't refundable. Fan-made site, not linked to any team, league, artist or studio.</p>
      <div class="dlg-actions">
        <button class="btn ghost" value="cancel" formnovalidate>Cancel</button>
        <button class="btn gold" id="bd-pay" value="pay">Pay</button>
      </div>
    </form>`;
  document.body.appendChild(dlg);
  try { const n = localStorage.getItem('ft_backer'); if (n) dlg.querySelector('#bd-backer').value = n; } catch {}
  return dlg;
}

export async function openBid({ board, contender, leaderTotal, isNew }) {
  const cfg = await config();
  const d = ensureDialog();
  const $ = (s) => d.querySelector(s);
  const amt = $('#bd-amt');
  const pay = $('#bd-pay');
  $('#bd-err').textContent = '';
  $('#bd-sym').textContent = cfg.symbol;
  $('#bd-min').textContent = `(minimum ${money(cfg.minBid)})`;
  $('#bd-newwrap').hidden = !isNew;
  $('#bd-crest').innerHTML = isNew ? `<div class="crest-new">+</div>` : crest(contender, 54);
  const takeAmt = isNew ? leaderTotal + 1 : Math.max(cfg.minBid, leaderTotal - (contender?.total || 0) + 1);
  const isKing = !isNew && contender && contender.rank === 1 && contender.total > 0;
  if (isNew) {
    $('#bd-title').textContent = 'Add someone';
    $('#bd-sub').textContent = `They join ${board.name} with whatever you pay.`;
  } else {
    $('#bd-title').textContent = `Back ${contender.name}`;
    $('#bd-sub').textContent = isKing ? 'Already #1. Make the lead bigger.' : `${money(takeAmt)} puts them on the throne.`;
  }
  const presets = [...new Set([cfg.minBid, cfg.currency === 'INR' ? 100 : 5, cfg.currency === 'INR' ? 500 : 20])].filter((v) => v !== takeAmt);
  $('#bd-chips').innerHTML = (isKing ? '' : `<button type="button" class="chip take" data-v="${takeAmt}">Take #1: ${money(takeAmt)}</button>`)
    + presets.map((v) => `<button type="button" class="chip" data-v="${v}">${money(v)}</button>`).join('');
  $('#bd-chips').onclick = (e) => { const v = e.target.dataset.v; if (v) { amt.value = v; sync(); } };
  amt.min = cfg.minBid;
  amt.value = isKing ? cfg.minBid : takeAmt;
  const sync = () => { pay.textContent = `Pay ${money(parseInt(amt.value, 10) || 0)}`; };
  amt.oninput = sync; sync();
  pay.disabled = false;

  d.querySelector('form').onsubmit = async (e) => {
    if (e.submitter && e.submitter.value === 'cancel') return;
    e.preventDefault();
    const body = {
      board: board.id, amount: parseInt(amt.value, 10),
      backer: $('#bd-backer').value.trim(), message: $('#bd-msg').value.trim(),
    };
    if (isNew) body.newName = $('#bd-new').value.trim(); else body.contenderId = contender.id;
    try { localStorage.setItem('ft_backer', body.backer); } catch {}
    pay.disabled = true; pay.textContent = 'Opening payment…'; $('#bd-err').textContent = '';
    try {
      const out = await getJSON('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (out.url) { location.href = out.url; return; }
      if (out.provider === 'razorpay') await razorpayPay(out, body);
    } catch (err) {
      $('#bd-err').textContent = err.message; pay.disabled = false; sync();
    }
  };
  d.showModal();
  (isNew ? $('#bd-new') : amt).focus();
}

function loadScript(src) {
  return new Promise((ok, fail) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Could not load the payment window. Check your connection.')); document.head.appendChild(s); });
}
async function razorpayPay(o) {
  if (!window.Razorpay) await loadScript('https://checkout.razorpay.com/v1/checkout.js');
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: o.keyId, order_id: o.orderId, amount: o.amount, currency: o.currency,
      name: 'Fandom Throne', description: o.label, theme: { color: '#15172B' },
      handler: async (r) => {
        try {
          await getJSON('/api/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }) });
          location.href = `/thanks?pid=${encodeURIComponent(r.razorpay_order_id)}`;
          resolve();
        } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled. Nothing was charged.')) },
    });
    rz.open();
  });
}
