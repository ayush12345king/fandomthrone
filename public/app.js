// Shared front-end code for Fandom Throne.
export const CROWN = '<svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><path d="M3 10l6.5 5L16 5l6.5 10L29 10l-3 15H6L3 10z"/><rect x="6" y="26.5" width="20" height="3" rx="1"/></svg>';

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
  return (cfg ? cfg.symbol : '$') + Number(n || 0).toLocaleString(loc);
}
export function ago(t) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.round(s / 60) + 'm ago';
  if (s < 86400) return Math.round(s / 3600) + 'h ago';
  return Math.round(s / 86400) + 'd ago';
}

export function feedHTML(items, showBoard) {
  if (!items.length) return '<p class="empty">No bids yet. The first one takes the throne.</p>';
  return '<ul class="feed">' + items.map((e) => `
    <li style="--c:${esc(e.color)}">
      <span class="dot"></span>
      <span class="what"><b>${esc(e.backer)}</b> put ${money(e.amount)} on <b>${esc(e.name)}</b>${showBoard ? ` in ${esc(e.boardName)}` : ''}${e.tookThrone ? `<span class="crowned">${e.dethroned ? 'took #1 from ' + esc(e.dethroned) : 'took #1'}</span>` : ''}
        ${e.message ? `<span class="msg">“${esc(e.message)}”</span>` : ''}</span>
      <span class="when">${ago(e.at)}</span>
    </li>`).join('') + '</ul>';
}

// ---------- bid dialog ----------
let dlg;
function ensureDialog() {
  if (dlg) return dlg;
  dlg = document.createElement('dialog');
  dlg.innerHTML = `
    <form method="dialog" novalidate>
      <h3 id="bd-title"></h3>
      <p class="sub" id="bd-sub"></p>
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
async function razorpayPay(o, body) {
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
