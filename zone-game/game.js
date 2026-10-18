/* 實體安全大冒險｜互動闖關版：遊戲引擎
 * 平面圖、表單、角色共用 ../shared/zone-world.js；關卡內容在 missions.js；語音對照在 voice.js（由 tools/build_voice.py 產生）
 * 製作：Allan Lo 顧問，2026/10/18
 */
(() => {
'use strict';
const { ZONES, ROOMS, WALLS, GLASS, DOORS, NODES, route, BOUNDS, ANNEX, ANNEX_TEXT, OPS, CREDIT, ANNEX_ORDER, DOCS, FORMS, ACTORS, ITEMS, LEGEND_SVG, buildWorld, actorSVG, roomAt, esc } = ZW;
const $ = (s, r = document) => r.querySelector(s);
const W = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const hyp = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const MW = 900, MH = 664;
const VOICES = typeof VOICE !== 'undefined' ? VOICE : {};
const SAVE_KEY = 'iso27001-zone-game-v1';
const PIN_CODE = '2468';
const Z_PLAY = 1.35, Z_ALL = Math.min(MW / (BOUNDS[2] - BOUNDS[0]), MH / (BOUNDS[3] - BOUNDS[1]));

/* ═════════════ 1. 碰撞：牆、玻璃、上鎖的門、家具 ═════════════ */
const PR = 9, WR = 5 + PR;                 // 阿哲腳下半徑；牆厚一半 + 半徑
const SEGS = [...WALLS, ...GLASS];
const DESKS = [];
for (const y of [395, 560]) for (const x of [470, 535, 680, 745]) DESKS.push([x, y, 60, 28]);
// 與 shared/zone-world.js 中 buildWorld() 繪製的家具位置一致
const OBST = [
  [225, 378, 112, 32], [207, 604, 32, 92],                                   // 接待櫃台、沙發
  [606, 58, 70, 144], [714, 22, 24, 186], [758, 22, 24, 186], [846, 12, 68, 62], // 會議桌、檔案櫃、待銷毀上鎖櫃
  [975, 10, 90, 36], [926, 92, 22, 58],                                      // 配線架、外線引入
  [1188, 12, 102, 44], [1308, 12, 122, 44], [1398, 82, 34, 100],             // UPS、電池櫃、配電盤
  [1180, 238, 231, 38], [1180, 344, 231, 38],                                // 兩排機櫃
  [1400, 418, 34, 124], [1301, 534, 40, 18], [1180, 528, 80, 24], [1105, 476, 20, 74], // 空調、氣體滅火、監控台、SOP 架
  [452, 676, 44, 32], [878, 372, 26, 64], [878, 470, 26, 64], [998, 498, 32, 38], // 印表機、研發財務區桌子與保險櫃
  [930, 655, 100, 35], [1330, 588, 92, 64], [42, 46, 116, 62],               // 驗收檢查台、棧板、發電機
  [22, 618, 78, 40], [22, 458, 78, 40], [22, 378, 78, 40], [22, 218, 78, 40], // 停車場車輛
  ...DESKS,
];
const DOOR = {}; for (const d of DOORS) DOOR[d.id] = d;
const mid = d => [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2];

function pushSeg(p, ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy;
  const t = L2 ? clamp(((p.x - ax) * dx + (p.y - ay) * dy) / L2) : 0;
  const cx = ax + dx * t, cy = ay + dy * t;
  let ox = p.x - cx, oy = p.y - cy; const d = Math.hypot(ox, oy);
  if (d >= r) return false;
  if (d < 1e-6) { ox = -dy; oy = dx; const n = Math.hypot(ox, oy) || 1; ox /= n; oy /= n; } else { ox /= d; oy /= d; }
  p.x = cx + ox * r; p.y = cy + oy * r; return true;
}
function pushRect(p, [x, y, w, h], r) {
  const cx = clamp(p.x, x, x + w), cy = clamp(p.y, y, y + h);
  const ox = p.x - cx, oy = p.y - cy, d = Math.hypot(ox, oy);
  if (d >= r) return false;
  if (d < 1e-6) {
    const l = p.x - x, rr = x + w - p.x, t = p.y - y, b = y + h - p.y, m = Math.min(l, rr, t, b);
    if (m === l) p.x = x - r; else if (m === rr) p.x = x + w + r; else if (m === t) p.y = y - r; else p.y = y + h + r;
    return true;
  }
  p.x = cx + ox / d * r; p.y = cy + oy / d * r; return true;
}
function solve(p) {
  const locked = DOORS.filter(lockedForMe);
  for (let k = 0; k < 4; k++) {
    let hit = false;
    for (const s of SEGS) hit = pushSeg(p, s[0], s[1], s[2], s[3], WR) || hit;
    for (const d of locked) hit = pushSeg(p, d.a[0], d.a[1], d.b[0], d.b[1], WR) || hit;
    for (const o of OBST) hit = pushRect(p, o, PR) || hit;
    if (!hit) break;
  }
  p.x = clamp(p.x, BOUNDS[0] + PR, BOUNDS[2] - PR); p.y = clamp(p.y, BOUNDS[1] + PR, BOUNDS[3] - PR);
}
// 視線（尋路拉直用）：線段不可穿牆，也不可穿家具
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function segDist(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy; const t = L2 ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2) : 0; return hyp(p[0], p[1], a[0] + dx * t, a[1] + dy * t); }
function segSeg(a, b, c, d) {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if ((d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0)) return 0;
  return Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b));
}
function segRect(a, b, [x, y, w, h], r) {
  const x0 = x - r, y0 = y - r, x1 = x + w + r, y1 = y + h + r, dx = b[0] - a[0], dy = b[1] - a[1];
  let t0 = 0, t1 = 1;
  for (const [pp, qq] of [[-dx, a[0] - x0], [dx, x1 - a[0]], [-dy, a[1] - y0], [dy, y1 - a[1]]]) {
    if (pp === 0) { if (qq < 0) return false; continue; }
    const t = qq / pp;
    if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
function los(a, b) {
  for (const s of SEGS) if (segSeg(a, b, [s[0], s[1]], [s[2], s[3]]) < WR - 3) return false;
  for (const o of OBST) if (segRect(a, b, o, PR - 2)) return false;
  return true;
}
const NODE_LIST = Object.entries(NODES);
function nearestNode(p, needLos = true) {
  const sorted = NODE_LIST.map(([k, q]) => [k, hyp(p[0], p[1], q[0], q[1])]).sort((a, b) => a[1] - b[1]);
  if (needLos) for (const [k] of sorted.slice(0, 14)) if (los(p, NODES[k])) return k;
  return sorted[0][0];
}
function navPath(from, to) {
  if (los(from, to)) return [to];
  const a = nearestNode(from), b = nearestNode(to);
  if (!los(NODES[b], to)) to = NODES[b];
  const pts = [from, ...route(a, b).map(n => NODES[n]), to];
  const out = []; let i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !los(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
  return out;
}

/* ═════════════ 2. 平面圖與遊戲圖層 ═════════════ */
$('#wc').innerHTML = buildWorld();
W('actors').insertAdjacentHTML('beforebegin', `
  <g id="gprops">
    <g id="p-rackopen"><rect x="1213" y="344" width="31" height="38" rx="3" fill="#0B1220"/><rect x="1217" y="349" width="23" height="5" fill="#475569"/><rect x="1217" y="358" width="23" height="5" fill="#475569"/><path d="M1213 382 L1196 402" stroke="#374151" stroke-width="5" stroke-linecap="round"/></g>
    <g id="p-cord"><path d="M1182 416 C1182 400 1195 398 1196 382 M1188 416 C1190 404 1215 402 1228 382" fill="none" stroke="#1F2937" stroke-width="2"/><rect x="1168" y="416" width="28" height="9" rx="2" fill="#F8FAFC" stroke="#475569"/><circle cx="1175" cy="420.5" r="1.6" fill="#334155"/><circle cx="1182" cy="420.5" r="1.6" fill="#334155"/><circle cx="1189" cy="420.5" r="1.6" fill="#334155"/></g>
    <g id="p-pwrmix"><path d="M1090 30 C1010 70 1075 120 1000 150 S950 175 958 190" fill="none" stroke="#EA580C" stroke-width="3.5" stroke-linecap="round"/><rect x="952" y="188" width="12" height="8" rx="1.5" fill="#EA580C"/></g>
    <g id="p-openport"><circle cx="1059" cy="19" r="3.2" fill="#22C55E"/><circle id="p-portring" cx="1059" cy="19" r="7" fill="none" stroke="#22C55E" stroke-width="1.5"/></g>
  </g>
  <polyline id="groute" fill="none" stroke="#FFC53D" stroke-width="5" stroke-dasharray="1 11" stroke-linecap="round" opacity=".95"/>
  <g id="gtarget"><circle r="22" fill="rgba(255,197,61,.18)" stroke="#FFC53D" stroke-width="4"/><g id="gtarrow"><path d="M-11 -66 h22 l-11 16z" fill="#FFC53D" stroke="#7A4A00" stroke-width="2"/></g></g>`);

/* ═════════════ 3. 角色與場景狀態 ═════════════ */
const F0 = { wb: 0, hl: '', legend: 0, gatealarm: 0, blinds: 0, cables: 0, labels: 0, pwrmix: 0, openport: 0, truck: 0, box: 0, boxopen: 0, newsrv: 0,
  junk: 0, rackopen: 0, cord: 0, upstest: 0, gen: 0, nasfail: 0, nasgone: 0, cage: 0, cctv: 0, night: 0, messy: 0, printer: 0, rain: 0, sandbag: 0 };
let F = { ...F0 }, FT = {};
let clock = 0;
function setF(k, v) { if (F[k] !== v) { F[k] = v; FT[k] = clock; } }
const A = {};
for (const id in ACTORS) A[id] = { id, x: NODES.car[0], y: NODES.car[1], vis: id === 'eng', item: '', name: ACTORS[id].name, face: 1, walkT: -9, node: 'car', path: null, pi: 0, then: null, follow: null, gap: 34, emo: '', emoT: -9, curItem: null };
const ME = A.eng;
ME.stuck = 0;
let TR = [[ME.x, ME.y, 0]], ARC = 0;   // 阿哲走過的軌跡，陪同者沿軌跡跟隨
function resetTrail() { TR = [[ME.x, ME.y, 0]]; ARC = 0; }
function trailPush() { const l = TR[TR.length - 1], d = hyp(l[0], l[1], ME.x, ME.y); if (d > 2) { ARC += d; TR.push([ME.x, ME.y, ARC]); if (TR.length > 900) TR.shift(); } }
function trailAt(a) {
  if (a <= TR[0][2]) return TR[0];
  let lo = 0, hi = TR.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (TR[m][2] < a) lo = m; else hi = m; }
  const p = TR[lo], q = TR[hi], k = q[2] > p[2] ? (a - p[2]) / (q[2] - p[2]) : 0;
  return [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];
}
function place(id, node) {
  const n = A[id];
  [n.x, n.y] = NODES[node]; n.node = node; n.vis = true; n.path = null; n.follow = null;
  if (id === 'eng') { ME.path = null; resetTrail(); }
}
function moveNpc(id, to, then) {
  const n = A[id];
  n.follow = null; n.vis = true;
  const from = n.node && hyp(n.x, n.y, ...NODES[n.node]) < 4 ? n.node : nearestNode([n.x, n.y], false);
  n.path = [[n.x, n.y], ...route(from, to).map(k => NODES[k])]; n.pi = 1; n.node = to; n.then = then || null;
}
function act(a) {
  if (typeof a === 'object') { moveNpc(a.npc, a.to, a.then); return; }
  let r;
  if ((r = a.match(/^\$(\w+)=(.*)$/))) { setF(r[1], r[2] === '' ? '' : isNaN(+r[2]) ? r[2] : +r[2]); return; }
  if ((r = a.match(/^(\w+)=(\w+)$/))) { place(r[1], r[2]); return; }
  if ((r = a.match(/^(\w+):(show|hide)$/))) { const n = A[r[1]]; n.vis = r[2] === 'show'; if (!n.vis) { n.follow = null; n.path = null; } return; }
  if ((r = a.match(/^(\w+)\.item=(\w*)$/))) { A[r[1]].item = r[2]; return; }
  if ((r = a.match(/^(\w+)\.name=(.+)$/))) { A[r[1]].name = r[2]; return; }
  if ((r = a.match(/^(\w+)!(.+)$/))) { A[r[1]].emo = r[2]; A[r[1]].emoT = clock; return; }
  if ((r = a.match(/^(\w+)~(\w*)$/))) {
    const n = A[r[1]];
    if (r[2]) { n.follow = r[2]; n.vis = true; n.path = null; n.gap = r[1] === 'tail' ? 30 : 38; }
    else { n.follow = null; n.node = nearestNode([n.x, n.y], false); }
    return;
  }
  throw new Error('無法解析的動作：' + a);
}
// 從頭重播前面關卡的場景旗標，讓跳關時場景與依序闖關一致
function flagActs(m) {
  const out = [...(m.setup || [])];
  for (const st of m.steps) { out.push(...(st.pre || [])); for (const it of st.run) for (const a of it.act || []) { if (typeof a === 'string') out.push(a); else out.push(...(a.then || [])); } }
  return out.filter(a => a.startsWith('$'));
}
function resetWorld(i) {
  F = { ...F0 }; FT = {};
  for (let k = 0; k < i; k++) for (const a of flagActs(MISSIONS[k])) act(a);
  for (const k in F) FT[k] = -99;
  for (const id in A) if (id !== 'eng') { const n = A[id]; n.vis = false; n.follow = null; n.path = null; n.item = ''; n.name = ACTORS[id].name; }
  ME.item = '';
}

/* ═════════════ 4. 進度、計分與存檔 ═════════════ */
let S = { done: [], mistakes: [], cur: 0, voice: true, started: false };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && Array.isArray(s.done)) S = { ...S, ...s }; } catch (e) { /* 瀏覽器不允許儲存時，照常遊玩 */ }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* 忽略 */ } }
const score = () => Math.max(0, 100 - S.mistakes.length * 5);
const earned = () => { const g = new Set(); for (const m of MISSIONS) if (S.done.includes(m.no)) m.annex.forEach(c => g.add(c)); return g; };
function addMistake(q, pick, fix, ref) {
  const m = MISSIONS[MI];
  S.mistakes.push({ no: m.no, title: m.title, q, pick, fix, ref });
  save(); renderHud();
}

/* ═════════════ 5. 畫面元素 ═════════════ */
const AC = {};
for (const id in ACTORS) {
  const g = W('ac-' + id);
  AC[id] = { g, flip: $('.flip', g), bob: $('.bob', g), legL: $('.legL', g), legR: $('.legR', g), armB: $('.armB', g), armF: $('.armF', g), item: $('.item', g) };
  const tag = document.createElement('div'); tag.className = 'tag' + (id === 'eng' ? ' me' : ''); tag.style.background = ACTORS[id].tag; W('tags').appendChild(tag);
  const emo = document.createElement('div'); emo.className = 'emo'; W('tags').appendChild(emo);
  Object.assign(AC[id], { tag, emo, tagTxt: '' });
}
const DOORS_UI = DOORS.map(d => ({ d, g: W('d-' + d.id), rd: d.rd ? W('rd-' + d.id) : null, open: 0 }));
const RL = ROOMS.filter(r => !r.nolabel).map(rm => {
  const el = document.createElement('div'); el.className = 'rl ' + rm.z;
  el.innerHTML = `<i>${rm.out ? '白區' : esc(rm.code)}</i>${esc(rm.name)}`; W('labels').appendChild(el);
  return { el, rm, anchor: rm.id === 'S' ? [120, 730] : [rm.r[0] + 8, rm.r[1] + 8] };
});
const BD = {};
for (const c of ANNEX_ORDER) { const b = document.createElement('div'); b.className = 'bdg' + (c.length > 3 ? ' wide' : ''); b.textContent = c; b.title = `附錄A ${c} ${ANNEX[c]}`; W('badges').appendChild(b); BD[c] = b; }
W('legend').innerHTML = `<div class="r">${'WGYR'.split('').map(z => `<span class="z"><b style="background:${z === 'W' ? '#fff' : ZONES[z].chip}"></b>${ZONES[z].name}</span>`).join('')}</div>
  <div class="r"><span>${LEGEND_SVG.ent}出入口</span><span>${LEGEND_SVG.acc}門禁</span><span>${LEGEND_SVG.cam}監視器</span><span>${LEGEND_SVG.fire}消防</span><span>${LEGEND_SVG.env}環控</span></div>`;
W('cctv').innerHTML = `<div class="h"><span>監視系統｜保存 6 個月｜指定人員存取</span><b>● REC</b></div>` + [['CAM-01 大廳閘門', '330 200 220 140'], ['CAM-05 R-01 機房門口', '1040 360 200 128'], ['CAM-06 R-01 機櫃走道', '1170 220 260 166'], ['CAM-07 交付裝卸區', '900 570 360 230']]
  .map(([n, vb]) => `<div class="cam"><svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice"><use href="#wc"/></svg><span>${n}</span></div>`).join('');
const markEls = [];   // 找碴已找到的標記

const cache = new Map();
function setA(el, k, v) { let o = cache.get(el); if (!o) cache.set(el, o = {}); if (o[k] === v) return; o[k] = v; el.setAttribute(k, v); }
function setS(el, k, v) { let o = cache.get(el); if (!o) cache.set(el, o = {}); if (o['s' + k] === v) return; o['s' + k] = v; el.style[k] = v; }
const vis = (el, on) => setS(el, 'display', on ? '' : 'none');

/* ═════════════ 6. 任務流程 ═════════════ */
let MI = -1, SI = 0, mode = 'title', pinOK = false, pinCool = 0, msgCool = 0, overview = false, finding = null;
const M = () => MISSIONS[MI];
const stepNow = () => (MI >= 0 && M().steps[SI]) || null;
const targetOf = st => !st || !st.at ? null : Array.isArray(st.at) ? st.at : NODES[st.at];

let GEN = 0;   // 每次開始關卡就換一代，讓上一關尚未完成的流程失效
function startMission(i, teleport) {
  GEN++;
  closeModal(); W('dlg').hidden = true; DL = null; W('voice').pause();
  if (finding) { finding = null; W('findbar').hidden = true; W('map').classList.remove('finding'); markEls.forEach(m => m.remove()); markEls.length = 0; }
  MI = i; SI = 0; pinOK = false; overview = false;
  const m = M();
  resetWorld(i);
  if (teleport) place('eng', m.start);
  (m.setup || []).forEach(act);
  S.cur = i; S.started = true; save();
  renderQuest(); renderHud();
  const gen = GEN;
  talk(m.intro, () => { if (gen === GEN) enterStep(); });
}
function enterStep() {
  const st = stepNow();
  (st.pre || []).forEach(act);
  renderQuest();
  if (!st.at) runStep(); else { mode = 'play'; routeT = 0; }
}
function runStep() {
  const st = stepNow();
  mode = 'busy'; ME.path = null;
  runQueue(st.run.slice(), () => { SI++; if (SI < M().steps.length) enterStep(); else missionClear(); });
}
let curItem = null;   // 目前執行中的互動（自動測試用）
function runQueue(items, done) {
  const gen = GEN;
  const next = () => {
    if (gen !== GEN) return;
    if (!items.length) { done(); return; }
    const it = items.shift();
    curItem = it;
    if (it.act) { it.act.forEach(act); next(); }
    else if (it.talk) talk(it.talk, next);
    else if (it.choice) choice(it.choice, next);
    else if (it.multi) multi(it.multi, next);
    else if (it.match) match(it.match, next);
    else if (it.form) form(it.form, next);
    else if (it.find) find(it.find, next);
    else next();
  };
  next();
}
function missionClear() {
  const m = M();
  if (!S.done.includes(m.no)) S.done.push(m.no);
  S.cur = Math.min(MI + 1, MISSIONS.length - 1); save();
  renderQuest(); renderHud();
  for (const c of m.annex) { BD[c].classList.remove('pop'); void BD[c].offsetWidth; BD[c].classList.add('pop'); }
  mode = 'busy';
  openModal(`<div class="card" style="width:560px;text-align:center"><div class="cb" style="align-items:center;gap:12px;padding:22px">
      <div style="font:400 54px/1 var(--f-display);color:#E39B0B;-webkit-text-stroke:2px #0F172A;paint-order:stroke fill">QUEST CLEAR!</div>
      <div class="q">第 ${String(m.no).padStart(2, '0')} 關｜${esc(m.title)}</div>
      <div style="display:flex;flex-direction:column;gap:8px;align-self:stretch">${m.annex.map(c => `<div class="fb ok" style="display:flex;gap:10px;align-items:center;text-align:left"><span class="bdg got${c.length > 3 ? ' wide' : ''}" style="width:44px;height:44px">${c}</span><span><b>附錄A ${c} ${esc(ANNEX[c])}</b><br>${esc(ANNEX_TEXT[c])}</span></div>`).join('')}</div>
      <div class="acts" style="align-self:stretch"><button class="btn go" id="mOk">${MI + 1 < MISSIONS.length ? '下一關 ▶' : '查看稽核報告 ▶'}</button></div></div></div>`);
  W('mOk').onclick = () => { closeModal(); talk(m.outro, () => { if (MI + 1 < MISSIONS.length) startMission(MI + 1, false); else talk(FINALE, report); }); };
  W('mOk').focus();
}

/* ═════════════ 7. 對話 ═════════════ */
const FACE_OK = { A: ['smile', 'laugh', 'think', 'confused', 'wow', 'point', 'wink', 'talk'], R: ['wink', 'laugh', 'think', 'wow', 'confused', 'talk', 'cry', 'excited'] };
let DL = null;   // 目前的對話：{ lines, i, t0, done }
function talk(lines, done) {
  if (!lines || !lines.length) { done(); return; }
  mode = 'busy'; ME.path = null;
  DL = { lines, i: 0, t0: clock, done };
  showLine();
}
function showLine() {
  const l = DL.lines[DL.i], dlg = W('dlg');
  dlg.hidden = false; dlg.className = 'dlg ' + l.s;
  const e = FACE_OK[l.s].includes(l.e) ? l.e : 'talk';
  W('dlgImg').src = `../assets/chars/${l.s === 'A' ? 'allan' : 'arale'}_${e}.webp`;
  W('dlgWho').textContent = l.s === 'A' ? 'Allan 老師（關主）' : '阿拉蕾';
  DL.t0 = clock; DL.full = false;
  const v = W('voice'), src = VOICES[l.s + '|' + l.t];
  v.pause();
  if (S.voice && src) { v.src = src; v.play().catch(() => {}); }
}
function advance() {
  if (!DL) return;
  const l = DL.lines[DL.i];
  if (!DL.full && Math.floor((clock - DL.t0) * 30) < l.t.length) { DL.full = true; return; }
  DL.i++;
  if (DL.i < DL.lines.length) { showLine(); return; }
  W('dlg').hidden = true; W('voice').pause();
  const done = DL.done; DL = null; done();
}
W('dlg').addEventListener('click', e => { e.stopPropagation(); advance(); });

/* ═════════════ 8. 互動視窗：選擇、複選、配對、表單、密碼、任務板 ═════════════ */
function openModal(html) { const m = W('modal'); m.innerHTML = html; m.hidden = false; }
function closeModal() { W('modal').hidden = true; W('modal').innerHTML = ''; }
const KEYS = 'ABCDEFG';
const head = (no, name, right = '') => `<div class="ch"><i>${esc(no)}</i><b>${esc(name)}</b><span>${esc(right)}</span></div>`;
const missionTag = () => `第 ${String(M().no).padStart(2, '0')} 關`;
function docTable(id) {
  const f = FORMS[id]; if (!f) return '';
  if (f.kv) return `<table class="tbl">${f.kv.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
  return `<div class="ref">${esc(f.no)} ${esc(f.name)}</div><table class="tbl"><tr>${f.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr>${f.rows.filter(r => !r.c).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
}
const remind = text => `<div class="fb" style="background:#FFFBEB;border:2px solid #FCD34D;color:#7A4A00"><b>提醒</b>　${esc(text)}（尚未送出，不列入不符合事項）</div>`;
function feedback(ok, text, ref) {
  return `<div class="fb ${ok ? 'ok' : 'no'}"><b>${ok ? '✔ 正確' : '✘ 不符合'}</b>　${esc(text || '')}${ok ? '' : `<br><span class="ref">已記錄 1 筆不符合事項（合規分數 −5）｜依據：${esc(ref)}</span>`}</div>`;
}
function choice(c, next) {
  mode = 'busy';
  openModal(`<div class="card">${head('情境題', missionTag(), c.ref)}<div class="cb">
    ${c.doc ? docTable(c.doc) : ''}<div class="q">${esc(c.q)}</div>
    ${c.opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${KEYS[i]}</span><span>${esc(o.t)}</span></button>`).join('')}
    <div id="fbx"></div><div class="acts"><button class="btn go" id="mOk" disabled>繼續 ▶</button></div></div></div>`);
  const wrongs = new Set();
  W('modal').querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (!W('mOk').disabled) return;
    const o = c.opts[+b.dataset.i];
    if (o.ok) {
      b.classList.add('right');
      W('modal').querySelectorAll('.opt').forEach(x => x.disabled = true);
      W('fbx').innerHTML = feedback(true, o.fb);
      W('mOk').disabled = false; W('mOk').focus();
    } else if (!wrongs.has(b.dataset.i)) {
      wrongs.add(b.dataset.i); b.classList.add('wrong'); b.disabled = true;
      W('fbx').innerHTML = feedback(false, o.fb, c.ref);
      addMistake(c.q, o.t, c.opts.find(x => x.ok).t, c.ref);
    }
  });
  W('mOk').onclick = () => { closeModal(); next(); };
}
function multi(c, next) {
  mode = 'busy';
  openModal(`<div class="card">${head(c.table ? '紀錄審閱' : '複選題', c.title || missionTag(), c.ref)}<div class="cb">
    <div class="q">${esc(c.q)}</div>
    ${c.opts.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${c.table ? '☐' : KEYS[i]}</span><span${c.table ? ' style="font-variant-numeric:tabular-nums"' : ''}>${esc(o.t)}</span></button>`).join('')}
    <div id="fbx"></div><div class="acts"><button class="btn" id="mSub">送出</button><button class="btn go" id="mOk" hidden>繼續 ▶</button></div></div></div>`);
  const opts = [...W('modal').querySelectorAll('.opt')], sel = new Set();
  opts.forEach(b => b.onclick = () => {
    if (!W('mOk').hidden) return;
    const i = +b.dataset.i;
    sel.has(i) ? sel.delete(i) : sel.add(i);
    opts.forEach(x => x.classList.remove('wrong', 'miss', 'right'));
    b.classList.toggle('sel', sel.has(i)); if (c.table) $('.k', b).textContent = sel.has(i) ? '☑' : '☐';
  });
  W('mSub').onclick = () => {
    if (!sel.size) { W('fbx').innerHTML = remind('請至少選擇一個項目再送出'); return; }
    const bad = c.opts.map((o, i) => !!o.ok !== sel.has(i));
    if (!bad.some(Boolean)) {
      opts.forEach((b, i) => { b.disabled = true; if (c.opts[i].ok) b.classList.add('right'); });
      W('fbx').innerHTML = feedback(true, c.fb); W('mSub').hidden = true; W('mOk').hidden = false; W('mOk').focus();
      return;
    }
    opts.forEach((b, i) => { if (bad[i]) b.classList.add(sel.has(i) ? 'wrong' : 'miss'); });
    W('fbx').innerHTML = feedback(false, '紅框是不該選的項目，虛線框是漏選的項目，請修正後再送出。', c.ref);
    addMistake(c.q, c.opts.filter((o, i) => sel.has(i)).map(o => o.t).join('、') || '（未選）', c.opts.filter(o => o.ok).map(o => o.t).join('、'), c.ref);
  };
  W('mOk').onclick = () => { closeModal(); next(); };
}
function match(c, next) {
  mode = 'busy';
  openModal(`<div class="card">${head('配對題', c.title || missionTag(), c.ref)}<div class="cb">
    <div class="q">${esc(c.q)}</div>
    <table class="tbl">${c.rows.map((r, i) => `<tr data-i="${i}"><td class="k">${esc(r.k)}</td><td><select data-i="${i}"><option value="">請選擇…</option>${c.opts.map(o => `<option>${esc(o)}</option>`).join('')}</select></td></tr>`).join('')}</table>
    <div id="fbx"></div><div class="acts"><button class="btn" id="mSub">送出</button><button class="btn go" id="mOk" hidden>繼續 ▶</button></div></div></div>`);
  const sels = [...W('modal').querySelectorAll('select')], rows = [...W('modal').querySelectorAll('tr')];
  sels.forEach((s, i) => s.onchange = () => rows[i].classList.remove('bad'));
  W('mSub').onclick = () => {
    const empty = sels.filter(x => !x.value).length;
    if (empty) { W('fbx').innerHTML = remind(`還有 ${empty} 列尚未選擇`); return; }
    const bad = c.rows.map((r, i) => sels[i].value !== r.ans);
    if (!bad.some(Boolean)) {
      rows.forEach(r => r.classList.add('good')); sels.forEach(s => s.disabled = true);
      W('fbx').innerHTML = feedback(true, c.fb); W('mSub').hidden = true; W('mOk').hidden = false; W('mOk').focus();
      return;
    }
    rows.forEach((r, i) => r.classList.toggle('bad', bad[i]));
    W('fbx').innerHTML = feedback(false, '紅色列的對應不正確，請修正後再送出。', c.ref);
    addMistake(c.q, c.rows.filter((r, i) => bad[i]).map((r, i) => `${r.k}→${sels[c.rows.indexOf(r)].value || '未選'}`).join('；'), c.rows.filter((r, i) => bad[i]).map(r => `${r.k}→${r.ans}`).join('；'), c.ref);
  };
  W('mOk').onclick = () => { closeModal(); next(); };
}
function form(c, next) {
  mode = 'busy';
  const ctl = (f, i) => {
    if (f.fixed) return esc(f.fixed);
    if (f.sel) return `<select data-i="${i}"><option value="">請選擇…</option>${f.sel.map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
    if (f.chk) return f.chk.map(o => `<label><input type="checkbox" data-i="${i}" value="${esc(o)}">${esc(o)}</label>`).join('');
    if (f.radio) return f.radio.map(o => `<label><input type="radio" name="r${i}" data-i="${i}" value="${esc(o)}">${esc(o)}</label>`).join('');
    if (f.judge) return `<b>${esc(f.judge)}</b>　<span class="std">標準：${esc(f.std)}</span>　<span class="judge" data-i="${i}"><button type="button" class="n" data-v="正常">正常</button><button type="button" class="a" data-v="異常">異常</button></span>`;
    return '';
  };
  openModal(`<div class="card">${head(c.no, c.name, c.ref)}<div class="cb">
    <div class="ref">${c.fields.some(f => f.judge) ? '依現場讀數判讀「正常／異常」，送出後主管核閱。' : '請依現場情境填寫表單，送出後由主管簽核。'}</div>
    <table class="tbl">${c.fields.map((f, i) => `<tr data-i="${i}"><td class="k">${esc(f.k)}</td><td>${ctl(f, i)}</td></tr>`).join('')}</table>
    <div id="fbx"></div><div id="stp" style="display:flex"></div><div class="acts"><button class="btn" id="mSub">送出簽核</button><button class="btn go" id="mOk" hidden>繼續 ▶</button></div></div></div>`);
  const md = W('modal'), rows = [...md.querySelectorAll('tr')];
  md.querySelectorAll('.judge button').forEach(b => b.onclick = () => { b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); rows[+b.parentNode.dataset.i].classList.remove('bad'); });
  md.querySelectorAll('select, input').forEach(el => el.onchange = () => rows[+el.dataset.i].classList.remove('bad'));
  const val = (f, i) => {
    if (f.sel) return md.querySelector(`select[data-i="${i}"]`).value;
    if (f.chk) return [...md.querySelectorAll(`input[data-i="${i}"]:checked`)].map(x => x.value);
    if (f.radio) { const r = md.querySelector(`input[data-i="${i}"]:checked`); return r ? r.value : ''; }
    if (f.judge) { const b = md.querySelector(`.judge[data-i="${i}"] button.on`); return b ? b.dataset.v : ''; }
    return null;
  };
  const same = (v, ans) => Array.isArray(ans) ? Array.isArray(v) && v.length === ans.length && ans.every(a => v.includes(a)) : v === ans;
  W('mSub').onclick = () => {
    const empty = c.fields.filter((f, i) => (f.sel || f.radio || f.judge) && !val(f, i));
    if (empty.length) { W('fbx').innerHTML = remind(`尚未填寫：${empty.map(f => f.k).join('、')}`); rows.forEach((r, i) => r.classList.toggle('bad', empty.includes(c.fields[i]))); return; }
    const bad = c.fields.map((f, i) => f.ans !== undefined && !same(val(f, i), f.ans));
    if (!bad.some(Boolean)) {
      rows.forEach((r, i) => { if (c.fields[i].ans !== undefined) r.classList.add('good'); });
      md.querySelectorAll('select, input, .judge button').forEach(x => x.disabled = true);
      W('fbx').innerHTML = feedback(true, c.fb);
      W('stp').innerHTML = `<div class="stamp">${c.fields.some(f => f.judge) ? '已核閱' : '核准'}</div>`;
      W('mSub').hidden = true; W('mOk').hidden = false; W('mOk').focus();
      return;
    }
    rows.forEach((r, i) => r.classList.toggle('bad', bad[i]));
    const names = c.fields.filter((f, i) => bad[i]);
    W('fbx').innerHTML = feedback(false, `紅色欄位填寫不正確或未填：${names.map(f => f.k).join('、')}。`, c.ref);
    addMistake(`${c.no} ${c.name}`, names.map(f => { const v = val(f, c.fields.indexOf(f)); return `${f.k}：${Array.isArray(v) ? v.join('、') || '未勾選' : v || '未填'}`; }).join('；'),
      names.map(f => `${f.k}：${Array.isArray(f.ans) ? f.ans.join('、') : f.ans}`).join('；'), c.ref);
  };
  W('mOk').onclick = () => { closeModal(); next(); };
}
function openPin(id) {
  mode = 'busy'; ME.path = null;
  let code = '';
  const d = DOOR[id], rm = id === 'r01' ? 'R-01 電腦機房' : 'R-02 UPS／電力室';
  openModal(`<div class="card" style="width:420px">${head('門禁', rm + '｜紅區', 'L2-09 §5.2.1')}<div class="cb" style="align-items:center">
    <div class="ref" style="text-align:center">紅區門禁：門禁卡＋密碼（第二因子）<br>阿哲已刷卡，請輸入密碼（教學用密碼：${PIN_CODE}）</div>
    <div class="pin"><div class="disp" id="pd">····</div>${[1, 2, 3, 4, 5, 6, 7, 8, 9, '清除', 0, '取消'].map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}</div>
    <div id="fbx" style="align-self:stretch"></div></div></div>`);
  W('modal').querySelectorAll('.pin button').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k === '取消') { closeModal(); pinCool = clock + 2.5; mode = 'play'; pushBack(d); return; }
    if (k === '清除') code = ''; else if (code.length < 4) code += k;
    W('pd').textContent = (code.replace(/./g, '●') + '····').slice(0, 4);
    if (code.length === 4) {
      if (code === PIN_CODE) { pinOK = true; W('fbx').innerHTML = feedback(true, '卡片與密碼驗證成功，門禁系統已留下進出紀錄。'); setTimeout(() => { closeModal(); mode = 'play'; }, 700); }
      else { W('fbx').innerHTML = '<div class="fb no"><b>密碼錯誤</b>　請再試一次（連續錯誤會觸發門禁告警）。</div>'; code = ''; setTimeout(() => { W('pd') && (W('pd').textContent = '····'); }, 400); }
    }
  });
}
function pushBack(d) { const [mx, my] = mid(d); const dx = ME.x - mx, dy = ME.y - my, n = Math.hypot(dx, dy) || 1; ME.x = mx + dx / n * 62; ME.y = my + dy / n * 62; const p = { x: ME.x, y: ME.y }; solve(p); ME.x = p.x; ME.y = p.y; }

/* ═════════════ 9. 地圖找碴 ═════════════ */
function find(c, next) {
  mode = 'busy'; ME.path = null; overview = false;
  finding = { c, found: new Set(), next, hintT: -9 };
  W('map').classList.add('finding');
  drawFindbar();
}
function drawFindbar() {
  const fb = W('findbar'), f = finding;
  fb.hidden = false;
  const all = f.found.size === f.c.spots.length;
  fb.innerHTML = all ? `<span>✔ 全部完成！</span><button type="button" id="fGo">繼續 ▶</button>`
    : `<span>🔍 ${esc(f.c.title)}</span><b>${f.found.size} / ${f.c.spots.length}</b>${f.c.show ? '' : '<button type="button" class="ghost" id="fHint">提示</button>'}`;
  if (all) { W('fGo').onclick = endFind; W('fGo').focus(); }
  else if (W('fHint')) W('fHint').onclick = () => { finding.hintT = clock; };
}
function endFind() {
  const f = finding; finding = null;
  W('findbar').hidden = true; W('map').classList.remove('finding');
  markEls.forEach(m => m.remove()); markEls.length = 0;
  f.next();
}
function findClick(wx, wy) {
  const f = finding; if (!f || f.found.size === f.c.spots.length) return;
  let best = -1, bd = 1e9;
  f.c.spots.forEach((s, i) => { if (f.found.has(i)) return; const d = hyp(wx, wy, s.x, s.y) / Math.max(s.r * 1.3, 12 / CAM.z); if (d < 1 && d < bd) { bd = d; best = i; } });
  if (best < 0) { flashMsg('這裡看起來沒有問題，再找找看。', 1.4); return; }
  f.found.add(best);
  const s = f.c.spots[best], el = document.createElement('div'); el.className = 'mark-ok'; el.textContent = '✔'; el.dataset.x = s.x; el.dataset.y = s.y; W('tags').appendChild(el); markEls.push(el);
  toast(`<span style="font:700 17px var(--f-body)">✔ ${esc(s.t)}</span>`, '#BBF7D0', 2.2);
  drawFindbar();
}

/* ═════════════ 10. 提示訊息、任務卡、HUD ═════════════ */
let toastT = -9, toastDur = 0, msgT = -9, msgDur = 0;
function toast(html, bg, dur = 2.3) { const t = W('toast'); t.innerHTML = html; t.style.background = bg; t.hidden = false; toastT = clock; toastDur = dur; }
function flashMsg(text, dur = 2.6) { const m = W('msg'); m.textContent = text; m.hidden = false; msgT = clock; msgDur = dur; }
const zoneColor = z => z === 'ALL' ? 'linear-gradient(90deg,#fff 0 25%,#4ADE80 25% 50%,#FACC15 50% 75%,#FB7185 75%)' : ZONES[z].chip;
const zoneName = z => z === 'ALL' ? '白・綠・黃・紅' : `${ZONES[z].name}｜${ZONES[z].full}`;
function procLines(list) {
  const g = new Map();
  for (const p of list) { const [code, ...rest] = p.split(' '); if (!g.has(code)) g.set(code, []); if (rest.length) g.get(code).push(rest.join(' ')); }
  return [...g].map(([code, secs]) => `<p><b>ISMS-${esc(code)}</b>${esc(DOCS[code] || '')}${secs.length ? `<em>${esc(secs.join('、'))}</em>` : ''}</p>`).join('');
}
function renderQuest() {
  const q = W('quest');
  const btns = `<div class="qbtns"><button type="button" data-b="board">任務板</button><button type="button" data-b="map" class="${overview ? 'on' : ''}">全圖 M</button><button type="button" data-b="voice" class="${S.voice ? 'on' : ''}">語音${S.voice ? '開' : '關'}</button><button type="button" data-b="help">說明</button></div>`;
  if (MI < 0) {
    q.innerHTML = `<div class="qh"><span class="no">QUEST LIST</span><span class="zpill" style="background:${zoneColor('ALL')}">四色區域</span></div><h3>關卡一覽</h3>
      <div class="qlist">${MISSIONS.map(m => `<div class="${S.done.includes(m.no) ? 'done' : ''}"><b>${String(m.no).padStart(2, '0')}</b><i style="background:${m.zone === 'ALL' ? '#fff' : ZONES[m.zone].chip}"></i><span>${esc(m.title)}</span></div>`).join('')}</div>
      <div class="sec">依據文件</div><div class="basis"><div class="bl"><i>程序書</i><div>${procLines(['L2-09', 'L3-02'])}</div></div>
        <div class="bl"><i>表單</i><div class="chips">${['L4-29', 'L4-30', 'L4-31', 'L4-32', 'L4-33', 'L4-61', 'L4-62', 'L4-63'].map(f => `<span class="chip f">${f}</span>`).join('')}</div></div></div>
      <div class="sec">ISO/IEC 27001:2022</div><div class="basis"><div class="bl"><i>運作流程</i><div class="chips"><span class="chip o">A07 實體安全（Physical security）</span></div></div>
        <div class="bl"><i>附錄A</i><div><p>7.1～7.14，以及屬性含實體安全的 5.37、6.7，共 16 項</p></div></div></div>
      <div class="meta"><span>${esc(CREDIT)}</span></div>${btns}`;
    fitPanel(); return;
  }
  const m = M(), got = earned(), st = stepNow();
  q.innerHTML = `<div class="qh"><span class="no">QUEST ${String(m.no).padStart(2, '0')}</span><span class="zpill" style="background:${zoneColor(m.zone)}">${esc(zoneName(m.zone))}</span></div>
    <h3>${esc(m.title)}</h3>
    <div class="goal"><small>目前目標</small><div>${st ? esc(st.goal) : '✔ 本關完成'}</div></div>
    <div class="meta"><span><b>地點</b>${esc(m.place)}</span><span><b>頻率</b>${esc(m.freq)}</span></div>
    <div class="sec">作業步驟</div>
    <ul class="steps">${m.steps.map((s, i) => `<li class="${i < SI ? 'done' : i === SI ? 'now' : ''}"><span class="cb">${i < SI ? '✔' : ''}</span><span>${esc(s.goal)}</span></li>`).join('')}</ul>
    <div class="sec">依據文件</div>
    <div class="basis"><div class="bl"><i>程序書</i><div>${procLines(m.proc)}</div></div>
      ${m.forms.length ? `<div class="bl"><i>表單</i><div class="chips">${m.forms.map(f => `<span class="chip f">${esc(f + ' ' + (DOCS[f] || ''))}</span>`).join('')}</div></div>` : ''}</div>
    <div class="sec">ISO/IEC 27001:2022</div>
    <div class="basis"><div class="bl"><i>運作流程</i><div class="chips">${(m.ops || ['A07']).map(o => `<span class="chip o">${esc(o + ' ' + OPS[o])}</span>`).join('')}</div></div>
      ${m.annex.map(a => `<div class="ctl${got.has(a) ? ' got' : ''}"><b>附錄A ${a} ${esc(ANNEX[a])}${got.has(a) ? '　✔' : ''}</b><p>${esc(ANNEX_TEXT[a])}</p></div>`).join('')}</div>
    ${btns}`;
  fitPanel();
}
function fitPanel() {
  const q = W('quest');
  q.classList.remove('tight', 'tighter');
  if (q.scrollHeight > q.clientHeight + 1) q.classList.add('tight');
  if (q.scrollHeight > q.clientHeight + 1) q.classList.add('tighter');
}
W('quest').addEventListener('click', e => {
  const b = e.target.closest('[data-b]'); if (!b) return;
  if (b.dataset.b === 'board') openBoard();
  if (b.dataset.b === 'map') toggleOverview();
  if (b.dataset.b === 'voice') { S.voice = !S.voice; save(); if (!S.voice) W('voice').pause(); renderQuest(); }
  if (b.dataset.b === 'help') openHelp();
});
function renderHud() {
  const got = earned();
  for (const c of ANNEX_ORDER) BD[c].classList.toggle('got', got.has(c));
  W('sc').textContent = score(); W('sc').classList.toggle('bad', score() < 85);
  W('nc').textContent = S.mistakes.length; W('nc').classList.toggle('bad', S.mistakes.length > 0);
  W('qn').textContent = MI < 0 ? '—' : `${String(M().no).padStart(2, '0')} / ${MISSIONS.length}`;
}
function toggleOverview() { if (finding) return; overview = !overview; W('bMap').classList.toggle('on', overview); renderQuest(); }
W('bMap').addEventListener('click', e => { e.stopPropagation(); toggleOverview(); });

function openBoard() {
  if (mode !== 'play' && mode !== 'title') { flashMsg('請先完成目前的對話或題目，再開啟任務板。'); return; }
  const prev = mode; mode = 'busy';
  openModal(`<div class="card">${head('任務板', '13 個任務 × 16 枚附錄A徽章', '建議依序闖關')}<div class="cb">
    <div class="mlist">${MISSIONS.map((m, i) => `<button type="button" data-i="${i}" class="${S.done.includes(m.no) ? 'done' : ''} ${i === MI ? 'cur' : ''}"><b>${String(m.no).padStart(2, '0')}</b><i style="background:${m.zone === 'ALL' ? '#fff' : ZONES[m.zone].chip}"></i><span>${esc(m.title)}</span><em>${S.done.includes(m.no) ? '✔ ' : ''}${m.annex.join('、')}</em></button>`).join('')}</div>
    <div class="acts"><button class="btn alt" id="bReset">清除進度，從頭開始</button>${S.done.length === MISSIONS.length ? '<button class="btn alt" id="bRep">稽核報告</button>' : ''}<button class="btn" id="bClose">關閉</button></div></div></div>`);
  W('modal').querySelectorAll('.mlist button').forEach(b => b.onclick = () => { closeModal(); W('title').hidden = true; startMission(+b.dataset.i, true); });
  W('bClose').onclick = () => { closeModal(); mode = prev; };
  W('bReset').onclick = () => { S = { done: [], mistakes: [], cur: 0, voice: S.voice, started: true }; save(); closeModal(); W('title').hidden = true; renderHud(); talk(INTRO, () => startMission(0, true)); };
  if (W('bRep')) W('bRep').onclick = () => { closeModal(); report(); };
}
function openHelp() {
  const prev = mode === 'title' ? 'title' : mode; if (mode !== 'play' && mode !== 'title') return;
  mode = 'busy';
  openModal(`<div class="card" style="width:600px">${head('說明', '操作方式與規則')}<div class="cb help">
    <div><b>移動</b>：<kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> 或 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>；按住 <kbd>Shift</kbd> 快跑；也可以直接點地圖，阿哲會自動走過去。</div>
    <div><b>目標</b>：右側「目前目標」與地圖上的黃色虛線、箭頭會帶路，走到定點就會觸發情境。</div>
    <div><b>對話</b>：點擊對話框或按 <kbd>Enter</kbd>／<kbd>空白鍵</kbd> 繼續。<kbd>M</kbd> 切換全圖。</div>
    <div><b>門禁</b>：紅區（機房、電力室）需要門禁卡＋密碼；Y-04 研發／財務區不是阿哲的權責區域，不能進入。</div>
    <div><b>計分</b>：選錯、填錯會記一筆不符合事項（合規分數 −5），可以修正後繼續。破關時產生稽核報告。</div>
    <div><b>依據</b>：ISMS-L2-09 實體與環境安全管理程序書、ISMS-L3-02 機房與設備保護作業說明書、L4 表單；ISO/IEC 27001:2022 附錄A 運作流程 A07 實體安全。</div>
    <div class="ref">${esc(CREDIT)}</div>
    <div class="acts"><button class="btn go" id="bClose">知道了</button></div></div></div>`);
  W('bClose').onclick = () => { closeModal(); mode = prev; };
  W('bClose').focus();
}
function report() {
  mode = 'busy';
  const n = S.mistakes.length, sc = score(), got = earned();
  const verdict = n === 0 ? '零缺失！文件、紀錄、現場三方一致，可以自信面對驗證稽核。'
    : n <= 3 ? '有少數不符合事項，請依下列內容複習對應條文並完成矯正。' : '不符合事項偏多，建議重新挑戰，並複習 L2-09、L3-02 相關條文。';
  openModal(`<div class="card" style="width:760px">${head('稽核報告', '實體安全大冒險｜互動闖關版', new Date().toLocaleDateString('zh-TW'))}<div class="cb" id="rep">
    <div class="rep-sum"><div><b class="${sc < 85 ? 'bad' : ''}">${sc}</b><span>合規分數</span></div><div><b class="${n ? 'bad' : ''}">${n}</b><span>不符合事項</span></div><div><b>${got.size} / 16</b><span>附錄A 徽章</span></div></div>
    <div class="verdict">${esc(verdict)}</div>
    ${n ? S.mistakes.map((x, i) => `<div class="nc"><b>不符合事項 ${i + 1}｜第 ${String(x.no).padStart(2, '0')} 關 ${esc(x.title)}</b><br>情境：${esc(x.q)}<br>你的作法：${esc(x.pick)}<br>正確作法：${esc(x.fix)}<br><span class="r">依據：${esc(x.ref)}</span></div>`).join('') : ''}
    <div class="ref">依據 ISMS-L2-09、ISMS-L3-02 及 L4 表單｜ISO/IEC 27001:2022 附錄A 運作流程 A07 實體安全｜${esc(CREDIT)}</div>
    <div class="acts"><button class="btn alt" id="rPrint">列印／存成 PDF</button><a class="btn alt" href="../zone-quest/index.html" style="text-decoration:none">觀看影片版</a><button class="btn alt" id="rBoard">任務板</button><button class="btn go" id="rAgain">重新挑戰</button></div></div></div>`);
  W('rPrint').onclick = () => window.print();
  W('rBoard').onclick = () => { closeModal(); mode = 'play'; openBoard(); };
  W('rAgain').onclick = () => { S = { done: [], mistakes: [], cur: 0, voice: S.voice, started: true }; save(); closeModal(); renderHud(); talk(INTRO, () => startMission(0, true)); };
}

/* ═════════════ 11. 開始畫面 ═════════════ */
function showTitle() {
  mode = 'title';
  const t = W('title'), cont = S.started && (S.done.length || S.cur);
  t.hidden = false;
  t.innerHTML = `<div class="kick">ISO/IEC 27001:2022 附錄A｜運作流程 A07 實體安全</div>
    <h1>實體安全大冒險<small>互動闖關版</small></h1>
    <p>親自操控機房管理者阿哲，走完白、綠、黃、紅四大安全區域</p>
    <div class="zs">${'WGYR'.split('').map(z => `<span style="background:${z === 'W' ? '#fff' : ZONES[z].chip}">${ZONES[z].name}</span>`).join('')}</div>
    <div class="tb"><button type="button" id="tNew">▶ ${cont ? '重新開始' : '開始闖關'}</button>${cont ? `<button type="button" id="tCont">繼續第 ${String(MISSIONS[S.cur].no).padStart(2, '0')} 關</button>` : ''}<button type="button" class="alt" id="tHelp">操作說明</button><a class="alt" href="../zone-quest/index.html">影片版</a></div>
    <div class="by">${esc(CREDIT)}</div>`;
  W('tNew').onclick = () => { S = { done: [], mistakes: [], cur: 0, voice: S.voice, started: true }; save(); t.hidden = true; renderHud(); talk(INTRO, () => startMission(0, true)); };
  if (W('tCont')) W('tCont').onclick = () => { t.hidden = true; startMission(S.cur, true); };
  W('tHelp').onclick = openHelp;
}

/* ═════════════ 12. 輸入 ═════════════ */
const KEY = {};
const KMAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('select')) return;
  if (KMAP[e.code]) { KEY[KMAP[e.code]] = true; if (mode === 'play') { e.preventDefault(); ME.path = null; } }
  if (e.key === 'Shift') KEY.run = true;
  if ((e.key === 'Enter' || e.key === ' ') && DL) { e.preventDefault(); advance(); }
  if ((e.key === 'm' || e.key === 'M') && (mode === 'play' || overview)) toggleOverview();
});
addEventListener('keyup', e => { if (KMAP[e.code]) KEY[KMAP[e.code]] = false; if (e.key === 'Shift') KEY.run = false; });
addEventListener('blur', () => { for (const k in KEY) KEY[k] = false; });
function mapToWorld(e) {
  const r = W('map').getBoundingClientRect();
  const sx = (e.clientX - r.left) * MW / r.width, sy = (e.clientY - r.top) * MH / r.height;
  return [(sx - MW / 2) / CAM.z + CAM.x, (sy - MH / 2) / CAM.z + CAM.y];
}
W('map').addEventListener('pointerdown', e => {
  if (e.target.closest('#modal, #dlg, #findbar, .mapbtn')) return;
  const [wx, wy] = mapToWorld(e);
  if (finding) { findClick(wx, wy); return; }
  if (DL) { advance(); return; }
  if (mode !== 'play') return;
  if (overview) { overview = false; W('bMap').classList.remove('on'); renderQuest(); }
  ME.path = navPath([ME.x, ME.y], [wx, wy]); ME.stuck = 0;
  clickFx = { x: wx, y: wy, t: clock };
});
let clickFx = null;

/* ═════════════ 13. 每格更新 ═════════════ */
let lastRoom = null, routeT = 0, routePts = [];
function update(dt) {
  // 阿哲
  if (mode === 'play') {
    let dx = (KEY.r ? 1 : 0) - (KEY.l ? 1 : 0), dy = (KEY.d ? 1 : 0) - (KEY.u ? 1 : 0);
    if (!dx && !dy && ME.path) {
      const [tx, ty] = ME.path[0], d = hyp(ME.x, ME.y, tx, ty);
      if (d < 6) { ME.path.shift(); if (!ME.path.length) ME.path = null; } else { dx = (tx - ME.x) / d; dy = (ty - ME.y) / d; }
    }
    if (dx || dy) {
      const n = Math.hypot(dx, dy), sp = (KEY.run ? 290 : 180) * dt;
      const p = { x: ME.x + dx / n * sp, y: ME.y + dy / n * sp };
      solve(p);
      const moved = hyp(ME.x, ME.y, p.x, p.y);
      if (ME.path && moved < sp * 0.2) { ME.stuck += dt; if (ME.stuck > 0.45) { ME.path = null; ME.stuck = 0; } } else ME.stuck = 0;
      if (Math.abs(p.x - ME.x) > 0.25) ME.face = p.x < ME.x ? -1 : 1;
      if (moved > 0.1) ME.walkT = clock;
      ME.x = p.x; ME.y = p.y; trailPush();
    }
    // 門禁：紅區要密碼；Y-04 非權責區域；閘門告警
    for (const d of DOORS) {
      const [mx, my] = mid(d), dd = hyp(ME.x, ME.y, mx, my);
      if ((d.id === 'r01' || d.id === 'r02') && !pinOK && outsideOf(d) && dd < 46 && clock > pinCool) { openPin(d.id); break; }
      if (d.id === 'y04' && dd < 31 && clock > msgCool) { flashMsg('Y-04 研發／財務區（黃區）不是阿哲的權責區域：須經單位主管核准，並由權責人員全程陪同（L2-09 §5.2.1）。', 4); msgCool = clock + 5; }
      if (d.id === 'gate' && F.gatealarm && dd < 40 && clock > msgCool) { flashMsg('閘門告警中：一人一卡，請先處理尾隨。'); msgCool = clock + 3; }
    }
    // 抵達目標
    const st = stepNow(), tg = targetOf(st);
    if (mode === 'play' && tg && hyp(ME.x, ME.y, tg[0], tg[1]) < 28) runStep();
  }
  // 其他角色
  for (const id in A) {
    if (id === 'eng') continue;
    const n = A[id]; if (!n.vis) continue;
    const ox = n.x, oy = n.y;
    if (n.follow) {
      const [tx, ty] = trailAt(ARC - n.gap), d = hyp(n.x, n.y, tx, ty), stp = Math.min(d, 320 * dt);
      const tooClose = hyp(tx, ty, ME.x, ME.y) < n.gap * 0.7 && hyp(n.x, n.y, ME.x, ME.y) < n.gap * 1.6;
      if (d > 0.01 && !tooClose) { n.x += (tx - n.x) / d * stp; n.y += (ty - n.y) / d * stp; }
    } else if (n.path) {
      let rem = 150 * dt;
      while (rem > 0 && n.path) {
        const [tx, ty] = n.path[n.pi], d = hyp(n.x, n.y, tx, ty);
        if (d <= rem) { n.x = tx; n.y = ty; rem -= d; n.pi++; if (n.pi >= n.path.length) { n.path = null; const th = n.then; n.then = null; if (th) th.forEach(act); } }
        else { n.x += (tx - n.x) / d * rem; n.y += (ty - n.y) / d * rem; rem = 0; }
      }
    }
    if (hyp(ox, oy, n.x, n.y) > 0.15) n.walkT = clock;
    if (Math.abs(n.x - ox) > 0.3) n.face = n.x < ox ? -1 : 1;
  }
  // 進入新區域的提示
  const rm = roomAt([ME.x, ME.y]), key = rm.out ? 'out' : rm.z + rm.code;
  if (key !== lastRoom) {
    const prevZone = lastRoom ? lastRoom[0] : null;
    if (lastRoom !== null && mode !== 'title' && !finding && !rm.out && rm.z !== prevZone) { const z = ZONES[rm.z]; toast(`進入${z.name}<small>${esc(z.rule)}</small>`, rm.z === 'W' ? '#fff' : z.chip, 2.6); }
    lastRoom = key;
  }
}

/* ═════════════ 14. 每格繪製 ═════════════ */
let CAM = { x: ME.x, y: ME.y, z: Z_PLAY };
function clampCam(c) {
  const hw = MW / 2 / c.z, hh = MH / 2 / c.z, [x0, y0, x1, y1] = BOUNDS;
  return { x: 2 * hw >= x1 - x0 ? (x0 + x1) / 2 : clamp(c.x, x0 + hw, x1 - hw), y: 2 * hh >= y1 - y0 ? (y0 + y1) / 2 : clamp(c.y, y0 + hh, y1 - hh), z: c.z };
}
const toScreen = (x, y) => [(x - CAM.x) * CAM.z + MW / 2, (y - CAM.y) * CAM.z + MH / 2];
function render(dt) {
  // 鏡頭
  let tgt;
  if (finding) tgt = { x: finding.c.cam[0], y: finding.c.cam[1], z: finding.c.cam[2] };
  else if (overview || mode === 'title') tgt = { x: 720, y: 400, z: Z_ALL };
  else tgt = { x: ME.x, y: ME.y - 20, z: Z_PLAY };
  tgt = clampCam(tgt);
  const k = 1 - Math.exp(-dt * 6);
  CAM = clampCam({ x: lerp(CAM.x, tgt.x, k), y: lerp(CAM.y, tgt.y, k), z: Math.exp(lerp(Math.log(CAM.z), Math.log(tgt.z), k)) });
  setA(W('cam'), 'transform', `translate(${(MW / 2 - CAM.x * CAM.z).toFixed(2)} ${(MH / 2 - CAM.y * CAM.z).toFixed(2)}) scale(${CAM.z.toFixed(4)})`);

  // 角色
  for (const id in A) {
    const n = A[id], a = AC[id];
    vis(a.g, n.vis);
    if (!n.vis) { vis(a.tag, false); vis(a.emo, false); continue; }
    setA(a.g, 'opacity', finding ? 0.3 : 1);
    const moving = clock - n.walkT < 0.12, ph = clock * 11, sw = moving ? Math.sin(ph) : 0;
    setA(a.g, 'transform', `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`);
    setA(a.flip, 'transform', `scale(${n.face} 1)`);
    setA(a.legL, 'transform', `translate(0 ${(moving ? -Math.max(0, sw) * 3.5 : 0).toFixed(2)})`);
    setA(a.legR, 'transform', `translate(0 ${(moving ? -Math.max(0, -sw) * 3.5 : 0).toFixed(2)})`);
    setA(a.bob, 'transform', `translate(0 ${(moving ? -Math.abs(Math.cos(ph)) * 1.8 : Math.sin(clock * 2.4 + id.length) * 0.6).toFixed(2)})`);
    if (a.curItem !== n.item) { a.curItem = n.item; a.item.innerHTML = ITEMS[n.item] || ''; }
    setA(a.armB, 'transform', `rotate(${(sw * 22).toFixed(1)} -11 -29)`);
    setA(a.armF, 'transform', n.item ? 'rotate(-35 11 -29)' : `rotate(${(-sw * 22).toFixed(1)} 11 -29)`);
    const [sx, sy] = toScreen(n.x, n.y);
    if (a.tagTxt !== n.name) { a.tagTxt = n.name; a.tag.textContent = n.name; }
    vis(a.tag, true);
    setS(a.tag, 'transform', `translate(${(sx - a.tag.offsetWidth / 2).toFixed(1)}px, ${(sy - 60 * CAM.z - 20).toFixed(1)}px)`);
    const eOn = n.emo && clock - n.emoT < 2.6;
    vis(a.emo, eOn);
    if (eOn) { if (a.emo.textContent !== n.emo) a.emo.textContent = n.emo; const p = clamp((clock - n.emoT) / 0.25) * clamp((n.emoT + 2.6 - clock) / 0.3); setS(a.emo, 'transform', `translate(${(sx + 6).toFixed(1)}px, ${(sy - 60 * CAM.z - 62).toFixed(1)}px) scale(${p.toFixed(3)})`); }
  }
  const ids = Object.keys(A).filter(id => A[id].vis).sort((p, q) => A[p].y - A[q].y).join();
  if (ids !== render.order) { render.order = ids; for (const id of ids.split(',')) if (id) W('actors').appendChild(AC[id].g); }

  // 門：有人靠近、且沒有上鎖就打開
  for (const u of DOORS_UI) {
    const { d } = u, [mx, my] = mid(d);
    let near = false;
    for (const id in A) if (A[id].vis && hyp(A[id].x, A[id].y, mx, my) < 64) near = true;
    const locked = lockedForMe(d);
    u.open = lerp(u.open, near && !locked ? 1 : 0, 1 - Math.exp(-dt * 9));
    const g = u.g, o = u.open;
    if (d.kind === 'slide') { setA($('.p1', g), 'transform', `translate(0 ${(-o * 26).toFixed(1)})`); setA($('.p2', g), 'transform', `translate(0 ${(o * 26).toFixed(1)})`); }
    else if (d.kind === 'gate') { setA($('.f1', g), 'transform', `rotate(${(-o * 80).toFixed(1)} ${d.a[0]} ${d.a[1] + 7})`); setA($('.f2', g), 'transform', `rotate(${(o * 80).toFixed(1)} ${d.b[0]} ${d.b[1] - 7})`); setA(W('gatelight'), 'fill', F.gatealarm ? (Math.floor(clock * 4) % 2 ? '#F43F5E' : '#7F1D1D') : o > 0.1 ? '#22C55E' : '#64748B'); }
    else if (d.kind === 'roll') setA(g, 'opacity', (1 - o * 0.75).toFixed(2));
    else setA(g, 'transform', `rotate(${(d.s * o * 82).toFixed(1)} ${d.a[0]} ${d.a[1]})`);
    if (u.rd) {
      const meNear = hyp(ME.x, ME.y, mx, my) < 60;
      setA(u.rd, 'fill', (d.id === 'y04' && meNear) || (d.id === 'gate' && F.gatealarm) ? '#F43F5E' : meNear && !lockedForMe(d) ? '#22C55E' : meNear ? '#FACC15' : '#64748B');
    }
  }

  // 場景狀態
  vis(W('wbink'), F.wb); vis(W('frost'), F.blinds); vis(W('sight'), false);
  vis(W('cmessy'), !F.cables); vis(W('ctidy'), F.cables); vis(W('clabels'), F.labels);
  vis(W('p-pwrmix'), F.pwrmix); vis(W('p-openport'), F.openport); setA(W('p-portring'), 'opacity', Math.floor(clock * 3) % 2 ? 1 : 0.2);
  { const t0 = FT.truck ?? -99, kk = F.truck ? clamp((clock - t0) / 2) : 1 - clamp((clock - t0) / 2), e = 1 - Math.pow(1 - kk, 3); vis(W('truck'), e > 0.01); setA(W('truck'), 'transform', `translate(${((1 - e) * 360).toFixed(1)} 0)`); }
  vis(W('box'), F.box); vis(W('boxc'), !F.boxopen); vis(W('boxo'), F.boxopen);
  vis(W('newsrv'), F.newsrv && clock - (FT.newsrv ?? -99) < 6); setA(W('newsrv'), 'opacity', (0.5 + 0.5 * Math.abs(Math.sin(clock * 5))).toFixed(2));
  vis(W('junk'), F.junk); vis(W('junkhl'), false); vis(W('soph'), false);
  vis(W('p-rackopen'), F.rackopen); vis(W('p-cord'), F.cord);
  vis(W('upstest'), F.upstest);
  for (const b of ['upsbar1', 'upsbar2']) { setA(W(b), 'width', F.upstest ? (8 + 18 * Math.abs(Math.sin(clock * 0.9))).toFixed(1) : 26); setA(W(b), 'fill', F.upstest ? '#FDE047' : '#22C55E'); }
  setA(W('genbody'), 'transform', F.gen ? `translate(${(Math.sin(clock * 47) * 0.9).toFixed(2)} ${(Math.cos(clock * 39) * 0.7).toFixed(2)})` : '');
  setA(W('genled'), 'fill', F.gen ? '#22C55E' : '#64748B');
  W('puffs').innerHTML = F.gen ? [0, 1, 2].map(i => { const q = (clock * 0.8 + i / 3) % 1; return `<circle cx="${150 + q * 14}" cy="${46 - q * 40}" r="${4 + q * 9}" fill="#94A3B8" opacity="${(0.65 * (1 - q)).toFixed(2)}"/>`; }).join('') : '';
  vis(W('nas'), F.nasfail); vis(W('nasgone'), F.nasgone); setA(W('nasled'), 'opacity', Math.floor(clock * 3) % 2 ? 1 : 0.2);
  vis(W('cageitem'), F.cage);
  vis(W('npcs'), !F.night);
  vis(W('papers'), F.messy); vis(W('messyhl'), false); vis(W('prpaper'), F.printer);
  for (const el of document.querySelectorAll('.scr')) setA(el, 'fill', F.night ? (el.id === 'scr21' && F.messy ? '#BAE6FD' : '#1E293B') : '#93C5FD');
  vis(W('sandbag'), F.sandbag);
  for (let i = 0; i < 3; i++) setA(W('fan' + i), 'transform', `rotate(${((clock * 400 + i * 40) % 360).toFixed(1)} 1417 ${450 + i * 30})`);
  for (const z of 'WGYR') { const on = F.hl === z || F.hl === 'ALL', g = W('zo-' + z); setA(g, 'stroke-width', on ? 7 : 3); setA(g, 'opacity', on ? (0.65 + 0.35 * Math.abs(Math.sin(clock * 3))).toFixed(2) : 0.5); setA(g, 'stroke-dasharray', on ? '14 8' : '8 6'); setA(g, 'stroke-dashoffset', on ? (-clock * 30 % 22).toFixed(1) : 0); }
  W('legend').classList.toggle('hl', !!F.legend);
  for (const g of document.querySelectorAll('#marks .mk')) setA(g, 'transform', F.legend ? `translate(${g.dataset.x} ${g.dataset.y}) scale(${(1 + 0.5 * Math.abs(Math.sin(clock * 5))).toFixed(3)}) translate(${-g.dataset.x} ${-g.dataset.y})` : '');
  for (const el of document.querySelectorAll('.camled')) setA(el, 'fill', Math.floor(clock * 1.5) % 2 ? '#fff' : '#FCA5A5');
  W('night').hidden = !F.night; W('rain').hidden = !F.rain;
  if (F.rain) setS(W('rain'), 'backgroundPosition', `${(clock * -260 % 460).toFixed(0)}px ${(clock * 900 % 460).toFixed(0)}px`);
  W('cctv').hidden = !F.cctv;

  // 目標指引：虛線路徑、目標圈、畫面外箭頭
  const st = mode === 'play' && !overview ? stepNow() : null, tg = targetOf(st);
  vis(W('gtarget'), !!tg); vis(W('groute'), !!tg);
  const off = W('offarrow');
  if (tg) {
    setA(W('gtarget'), 'transform', `translate(${tg[0]} ${tg[1]})`);
    setA(W('gtarrow'), 'transform', `translate(0 ${(-Math.abs(Math.sin(clock * 4)) * 10).toFixed(1)})`);
    routeT -= dt;
    if (routeT <= 0) { routeT = 0.3; routePts = [[ME.x, ME.y], ...navPath([ME.x, ME.y], tg)]; }
    routePts[0] = [ME.x, ME.y];
    setA(W('groute'), 'points', routePts.map(p => p[0].toFixed(0) + ',' + p[1].toFixed(0)).join(' '));
    setA(W('groute'), 'stroke-dashoffset', (-clock * 24 % 12).toFixed(1));
    const [sx, sy] = toScreen(tg[0], tg[1]);
    const out = sx < 20 || sx > MW - 20 || sy < 20 || sy > MH - 20;
    off.hidden = !out;
    if (out) { const cx = MW / 2, cy = MH / 2, ang = Math.atan2(sy - cy, sx - cx), t = Math.min((MW / 2 - 40) / Math.abs(Math.cos(ang) || 1e-6), (MH / 2 - 40) / Math.abs(Math.sin(ang) || 1e-6)); setS(off, 'transform', `translate(${cx + Math.cos(ang) * t}px, ${cy + Math.sin(ang) * t}px) rotate(${ang}rad)`); }
  } else off.hidden = true;

  // 房間標籤、所在位置
  for (const r of RL) {
    const [sx, sy] = toScreen(...r.anchor), on = sx > -150 && sx < MW && sy > -20 && sy < MH - 10 && !(r.rm.out && CAM.z > 1.1);
    vis(r.el, on); if (on) setS(r.el, 'transform', `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`);
  }
  const rm = roomAt([ME.x, ME.y]), z = ZONES[rm.z], locS = `📍 ${rm.out ? '' : rm.code + ' '}${rm.name}<small>${z.name}・${z.full}</small>`;
  if (W('loc')._s !== locS) { W('loc')._s = locS; W('loc').innerHTML = locS; W('loc').style.borderLeftColor = rm.z === 'W' ? '#E2E8F0' : z.chip; }
  vis(W('loc'), mode !== 'title' && !finding);

  // 找碴：已找到的標記、提示圈
  for (const el of markEls) { const [sx, sy] = toScreen(+el.dataset.x, +el.dataset.y); setS(el, 'transform', `translate(${sx}px, ${sy}px)`); }
  render.rings = render.rings || [];
  const ringOn = finding && (finding.c.show || clock - finding.hintT < 2.5) ? finding.c.spots.filter((s, i) => !finding.found.has(i)) : [];
  while (render.rings.length < ringOn.length) { const r = document.createElement('div'); r.className = 'hint-ring'; W('tags').appendChild(r); render.rings.push(r); }
  render.rings.forEach((r, i) => {
    const s = ringOn[i]; vis(r, !!s); if (!s) return;
    const [sx, sy] = toScreen(s.x, s.y), rr = Math.max(14, s.r * CAM.z) * (1 + 0.12 * Math.sin(clock * 6));
    setS(r, 'transform', `translate(${(sx - rr).toFixed(1)}px, ${(sy - rr).toFixed(1)}px)`); setS(r, 'width', rr * 2 + 'px'); setS(r, 'height', rr * 2 + 'px');
  });

  // 提示訊息
  const tt = W('toast'); if (!tt.hidden) { const p = clamp((clock - toastT) / 0.25) * clamp((toastT + toastDur - clock) / 0.3); setS(tt, 'opacity', p.toFixed(3)); if (p <= 0 && clock > toastT + 0.3) tt.hidden = true; }
  const mg = W('msg'); if (!mg.hidden && clock > msgT + msgDur) mg.hidden = true;

  // 對話打字效果
  if (DL) { const l = DL.lines[DL.i], n = DL.full ? l.t.length : Math.min(l.t.length, Math.floor((clock - DL.t0) * 30) + 1), s = l.t.slice(0, n); const el = W('dlgTxt'); if (el._s !== s) { el._s = s; el.textContent = s; } }
}
const outsideOf = d => d.id === 'r01' ? ME.x < 1100 : ME.y > 200;   // 站在紅區門外
function lockedForMe(d) {
  if (d.id === 'y04') return true;
  if (d.id === 'gate') return !!F.gatealarm;
  if (d.id === 'r01' || d.id === 'r02') return !pinOK && outsideOf(d);
  return false;
}

/* ═════════════ 15. 啟動 ═════════════ */
const fit = () => {
  const s = Math.min(innerWidth / 1280, innerHeight / 720);
  W('viewport').style.width = 1280 * s + 'px'; W('viewport').style.height = 720 * s + 'px';
  W('stage').style.transform = `scale(${s})`;
};
addEventListener('resize', fit); fit();
let last = performance.now();
function frame(ts) {
  const dt = clamp((ts - last) / 1000, 0, 0.05); last = ts; clock += dt;
  update(dt); render(dt);
  requestAnimationFrame(frame);
}
renderQuest(); renderHud(); showTitle();
document.fonts?.ready.then(fitPanel);
CAM = clampCam({ x: 720, y: 400, z: Z_ALL });
requestAnimationFrame(frame);

// 自動測試用：模擬玩家完成目前的互動（不影響一般遊玩）
window.__game = {
  get mode() { return mode; }, get mission() { return MI; }, get step() { return SI; }, get finding() { return !!finding; }, get dialog() { return !!DL; }, get score() { return score(); },
  S: () => S, me: () => [ME.x, ME.y], start: i => { W('title').hidden = true; startMission(i, true); },
  newGame: () => W('tNew').click(), advance, pin: () => { pinOK = true; if (!W('modal').hidden && W('pd')) { closeModal(); mode = 'play'; } },
  goTarget: () => { const tg = targetOf(stepNow()); if (tg && mode === 'play') { ME.x = tg[0]; ME.y = tg[1]; resetTrail(); } },
  findAll: () => { if (!finding) return; finding.c.spots.forEach(s => findClick(s.x, s.y)); },
  solveModal: () => {
    const md = W('modal'); if (md.hidden) return false;
    const it = curItem; if (!it) return false;
    if (it.choice) { const i = it.choice.opts.findIndex(o => o.ok); md.querySelectorAll('.opt')[i].click(); }
    if (it.multi) { md.querySelectorAll('.opt').forEach((b, i) => { if (!!it.multi.opts[i].ok !== b.classList.contains('sel')) b.click(); }); W('mSub').click(); }
    if (it.match) { md.querySelectorAll('select').forEach((s, i) => { s.value = it.match.rows[i].ans; }); W('mSub').click(); }
    if (it.form) {
      it.form.fields.forEach((f, i) => {
        if (f.sel) md.querySelector(`select[data-i="${i}"]`).value = f.ans;
        if (f.chk) md.querySelectorAll(`input[data-i="${i}"]`).forEach(x => { x.checked = f.ans.includes(x.value); });
        if (f.radio) md.querySelectorAll(`input[data-i="${i}"]`).forEach(x => { x.checked = x.value === f.ans; });
        if (f.judge) md.querySelector(`.judge[data-i="${i}"] button[data-v="${f.ans}"]`).click();
      });
      W('mSub').click();
    }
    return true;
  },
};
})();
