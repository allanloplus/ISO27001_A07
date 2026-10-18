/* 實體安全大冒險：影片版（zone-quest）與互動闖關版（zone-game）共用的場所、表單、角色與平面圖繪製
 * 依據 ISMS-L2-09、ISMS-L3-02 與 L4 表單；修改平面圖或表單內容只要改這裡，兩個版本會一起更新。
 * 製作：Allan Lo 顧問，2026/10/18
 */
const ZW = (() => {
'use strict';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ═════════════════════ 1. 場所資料（依 ISMS-L4-29 安全區域佈置圖） ═════════════════════ */
const ZONES = {
  W: { name: '白區', full: '公共區', fill: '#FFFFFF', line: '#94A3B8', chip: '#F1F5F9', rule: '任何人可進入；不放資訊處理設施與 2 級以上資訊' },
  G: { name: '綠區', full: '一般管制區', fill: '#DCF5E4', line: '#16A34A', chip: '#4ADE80', rule: '識別證／門禁卡進入；訪客登記並由員工陪同' },
  Y: { name: '黃區', full: '限制區', fill: '#FFF1BD', line: '#D69E06', chip: '#FACC15', rule: '獨立門禁並留存紀錄；非權責人員核准並陪同' },
  R: { name: '紅區', full: '高風險區', fill: '#FFDAD5', line: '#E11D48', chip: '#FB7185', rule: '限機房授權人員名單；卡＋密碼；全程監視' },
};
const ROOMS = [
  { id: 'P', code: 'W', name: '停車場（戶外）', z: 'W', r: [0, 0, 200, 720], out: true },
  { id: 'S', code: 'W', name: '道路', z: 'W', r: [-60, 720, 1580, 160], out: true },
  { id: 'W02', code: 'W-02', name: '會客室', z: 'W', r: [200, 0, 240, 240] },
  { id: 'W01', code: 'W-01', name: '大廳／接待區', z: 'W', r: [200, 240, 240, 480] },
  { id: 'G02', code: 'G-02', name: '會議室', z: 'G', r: [440, 0, 260, 240] },
  { id: 'Y02', code: 'Y-02', name: '文件庫房', z: 'Y', r: [700, 0, 220, 240] },
  { id: 'Y01', code: 'Y-01', name: '網路配線間', z: 'Y', r: [920, 0, 180, 240] },
  { id: 'R02', code: 'R-02', name: 'UPS／電力室', z: 'R', r: [1100, 0, 340, 200] },
  { id: 'GC', code: 'G-01', name: '走廊', z: 'G', r: [440, 240, 660, 80] },
  { id: 'GC2', code: 'G-01', name: '走廊', z: 'G', r: [1040, 320, 60, 240], nolabel: true },
  { id: 'G01', code: 'G-01', name: '辦公區', z: 'G', r: [440, 320, 420, 400] },
  { id: 'Y04', code: 'Y-04', name: '研發／財務區', z: 'Y', r: [860, 320, 180, 240] },
  { id: 'R01', code: 'R-01', name: '電腦機房', z: 'R', r: [1100, 200, 340, 360] },
  { id: 'Y03', code: 'Y-03', name: '交付裝卸區', z: 'Y', r: [860, 560, 580, 160] },
];
// 牆面（門口已留缺口）
const WALLS = [
  [200, 0, 1440, 0], [1440, 0, 1440, 720], [200, 720, 1200, 720], [1300, 720, 1440, 720], [200, 0, 200, 530], [200, 590, 200, 720],
  [200, 240, 295, 240], [345, 240, 440, 240], [440, 0, 440, 252], [440, 308, 440, 720],
  [440, 240, 545, 240], [595, 240, 700, 240], [700, 0, 700, 240], [700, 240, 785, 240], [835, 240, 920, 240], [920, 0, 920, 240],
  [920, 240, 985, 240], [1035, 240, 1100, 240], [1100, 0, 1100, 415], [1100, 465, 1100, 560],
  [1100, 200, 1125, 200], [1175, 200, 1440, 200],
  [440, 320, 625, 320], [675, 320, 860, 320], [860, 320, 925, 320], [975, 320, 1040, 320],
  [860, 560, 860, 720], [1040, 320, 1040, 560], [860, 560, 1045, 560], [1095, 560, 1440, 560],
];
const GLASS = [[860, 320, 860, 560]];
// 門：a→b 為門洞，hinge 在 a；s 為開門方向；rd 為讀卡機（門禁 ◆）
const DOORS = [
  { id: 'main', a: [200, 530], b: [200, 590], kind: 'slide' },
  { id: 'w02', a: [295, 240], b: [345, 240], s: -1 },
  { id: 'gate', a: [440, 252], b: [440, 308], kind: 'gate', rd: [452, 246] },
  { id: 'g02', a: [545, 240], b: [595, 240], s: -1 },
  { id: 'y02', a: [835, 240], b: [785, 240], s: 1, rd: [846, 252] },
  { id: 'y01', a: [1035, 240], b: [985, 240], s: 1, rd: [1046, 252] },
  { id: 'r02', a: [1175, 200], b: [1125, 200], s: 1, rd: [1186, 212] },
  { id: 'r01', a: [1100, 465], b: [1100, 415], s: 1, rd: [1088, 404] },
  { id: 'y04', a: [925, 320], b: [975, 320], s: 1, rd: [986, 310] },
  { id: 'dockin', a: [1095, 560], b: [1045, 560], s: -1, rd: [1036, 549] },
  { id: 'roll', a: [1200, 720], b: [1300, 720], kind: 'roll' },
];
// 佈置圖圖例：▲出入口 ◆門禁（讀卡機另繪）●監視器 ■消防設備 ◎環控感測器
const MARKS = [
  ['ent', 186, 600], ['ent', 432, 330], ['ent', 1090, 488], ['ent', 1250, 704],
  ['cam', 214, 254], ['cam', 456, 333], ['cam', 1086, 254], ['cam', 1026, 334], ['cam', 1114, 476], ['cam', 1426, 214], ['cam', 1426, 574], ['cam', 714, 14], ['cam', 934, 14], ['cam', 1114, 14], ['cam', 188, 518],
  ['fire', 428, 706], ['fire', 700, 308], ['fire', 846, 706], ['fire', 1114, 186], ['fire', 874, 706], ['fire', 1290, 543],
  ['env', 1428, 330], ['env', 1164, 546], ['env', 1428, 186], ['env', 1240, 400],
];
// 導航節點與通道
const NODES = {
  car: [110, 640], park_n: [110, 300], gen: [110, 166], main_out: [165, 560], street_w: [110, 762], street_m: [700, 762], street_e: [1250, 762],
  main_in: [240, 560], lobby: [300, 560], lobby_sofa: [262, 650], recep: [285, 449], recep2: [332, 457], lobby_e: [395, 470], lobby_n: [395, 300], w02_s: [320, 265], w02: [320, 150],
  gate_w: [410, 280], gate_e: [478, 280], c_g02: [570, 280], c_g01: [650, 280], c_y02: [810, 280], c_y04: [950, 280], c_y01: [1010, 280], c_end: [1070, 280],
  g02: [570, 190], wb: [515, 84], y02: [815, 170], cage: [880, 130], y01: [1010, 170], patch: [1020, 102],
  g01_n: [650, 345], g01_c: [650, 492], g01_e: [775, 492], seat_e: [775, 454], glassv: [835, 470], g01_w: [540, 492], g01_s: [650, 645], seat_m: [565, 634], printer: [518, 676],
  y04_n: [950, 345], y04: [965, 470],
  c2_n: [1070, 340], c2_m: [1070, 440], c2_s: [1070, 535],
  r01_in: [1135, 440], r01_c: [1220, 470], console: [1220, 512], sop: [1150, 516], crac: [1382, 480], cyl: [1322, 512], row2_s: [1330, 424],
  aisle_w: [1150, 310], aisle_m: [1295, 310], aisle_e: [1395, 310], r01_nw: [1150, 224],
  r02_n: [1150, 172], r02: [1250, 115], ups: [1240, 104], batt: [1370, 104], panel: [1372, 140],
  dock_n: [1070, 592], dock: [1150, 640], inspect: [980, 640], table_e: [1050, 672], pallet: [1300, 640], roll_in: [1250, 690], roll_in2: [1212, 688], roll_out: [1250, 744],
};
const EDGES = `car-main_out car-park_n car-street_w park_n-gen park_n-main_out street_w-street_m street_m-street_e street_e-roll_out roll_out-roll_in
  roll_in-dock roll_in-roll_in2 roll_in2-dock dock-dock_n dock-inspect dock-table_e dock-pallet inspect-dock_n table_e-dock_n dock_n-c2_s c2_s-c2_m c2_m-c2_n
  c2_n-c_end c2_m-r01_in r01_in-r01_c r01_in-aisle_w r01_in-sop r01_c-console r01_c-sop r01_c-row2_s row2_s-crac crac-cyl cyl-r01_c aisle_w-aisle_m aisle_m-aisle_e
  aisle_w-r01_nw r01_nw-r02_n r02_n-r02 r02-ups r02-batt batt-panel r02-panel main_out-main_in main_in-lobby lobby-recep lobby-recep2 recep-recep2 recep2-lobby_e
  lobby-lobby_e lobby-lobby_sofa lobby_e-lobby_n lobby_n-gate_w lobby_n-w02_s w02_s-w02 gate_w-gate_e gate_e-c_g02 c_g02-c_g01 c_g01-c_y02 c_y02-c_y04 c_y04-c_y01
  c_y01-c_end c_g02-g02 g02-wb c_y02-y02 y02-cage c_y01-y01 y01-patch c_g01-g01_n g01_n-g01_c g01_c-g01_e g01_e-seat_e g01_e-glassv g01_c-g01_w g01_c-g01_s
  g01_s-seat_m g01_s-printer c_y04-y04_n y04_n-y04`.trim().split(/\s+/).map(e => e.split('-'));
const ADJ = {};
for (const [a, b] of EDGES) {
  if (!NODES[a] || !NODES[b]) throw new Error('edge ' + a + '-' + b);
  const d = Math.hypot(NODES[a][0] - NODES[b][0], NODES[a][1] - NODES[b][1]);
  (ADJ[a] = ADJ[a] || []).push([b, d]); (ADJ[b] = ADJ[b] || []).push([a, d]);
}
function route(from, to) {
  if (from === to) return [from];
  const dist = { [from]: 0 }, prev = {}, done = new Set();
  while (true) {
    let u = null;
    for (const k in dist) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k;
    if (u === null) throw new Error('no route ' + from + '→' + to);
    if (u === to) break;
    done.add(u);
    for (const [v, d] of ADJ[u] || []) if (!done.has(v) && (dist[v] === undefined || dist[u] + d < dist[v])) { dist[v] = dist[u] + d; prev[v] = u; }
  }
  const p = [to]; while (p[0] !== from) p.unshift(prev[p[0]]);
  return p;
}
const CAMS = {
  all: { x: 720, y: 400, z: 0.595 }, W: { x: 300, y: 430, z: 1.0 }, G: { x: 660, y: 430, z: 1.0 }, Y: { x: 960, y: 380, z: 0.66 },
  R: { x: 1270, y: 300, z: 1.2 }, dock: { x: 1160, y: 660, z: 1.25 }, gen: { x: 200, y: 200, z: 1.3 },
};
const BOUNDS = [-20, -20, 1460, 820];

/* ═════════════════════ 2. 附錄A、表單、角色 ═════════════════════ */
const ANNEX = {
  '7.1': '實體安全周界', '7.2': '實體進入', '7.3': '保全辦公室、房間及設施', '7.4': '實體安全監視', '7.5': '防範實體及環境威脅',
  '7.6': '於安全區域內工作', '7.7': '桌面淨空與螢幕淨空', '7.8': '設備安置及保護', '7.9': '場所外資產之安全', '7.10': '儲存媒體',
  '7.11': '支援之公用服務事業', '7.12': '佈纜安全', '7.13': '設備維護', '7.14': '設備汰除或重新使用之保全', '5.37': '書面紀錄之運作程序', '6.7': '遠端工作',
};
// 控制措施要旨：依 ISO/IEC 27001:2022 附錄A 控制措施改寫之中文摘要（非 CNS 27001:2023 原文）
const ANNEX_TEXT = {
  '7.1': '應界定並使用安全周界，以保護含有資訊及其他相關聯資產之區域。',
  '7.2': '安全區域應藉由適切之進入控制及存取點予以保護。',
  '7.3': '應設計並實作辦公室、房間及設施之實體安全。',
  '7.4': '應持續監視場所，以防範未經授權之實體存取。',
  '7.5': '應設計並實作對實體及環境威脅（如天然災害、對基礎設施之蓄意或非蓄意威脅）之防護。',
  '7.6': '應設計並實作於安全區域內工作之安全措施。',
  '7.7': '應定義並適切施行紙本與可移除式儲存媒體之桌面淨空，及資訊處理設施之螢幕淨空規則。',
  '7.8': '設備應安全地安置並受保護。',
  '7.9': '場所外之資產應受保護。',
  '7.10': '儲存媒體應依分類方案及處置要求，於取得、使用、運送及汰除之生命週期中予以管理。',
  '7.11': '資訊處理設施應受保護，免於電源失效及其他因支援之公用服務事業失效所致之中斷。',
  '7.12': '傳輸電力、資料或支援資訊服務之纜線，應受保護以防截取、干擾或損害。',
  '7.13': '設備應正確維護，以確保資訊之可用性、完整性及機密性。',
  '7.14': '含儲存媒體之設備於汰除或重新使用前應加以查證，確保敏感資料及授權軟體已移除或安全覆寫。',
  '5.37': '資訊處理設施之運作程序應文件化，並提供予有需要之人員。',
  '6.7': '人員遠端工作時應實作安全措施，以保護於組織場所外存取、處理或儲存之資訊。',
};
// 運作流程（ISO/IEC 27002:2022 屬性 Operational capabilities）；編號依本公司程序書表頭
const OPS = { A07: '實體安全', A04: '資產管理', A13: '持續性' };
const OPS_EN = { A07: 'Physical security', A04: 'Asset management', A13: 'Continuity' };
const CREDIT = '製作：Allan Lo 顧問｜2026/10/18';
const ANNEX_ORDER = ['7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '7.7', '7.8', '7.9', '7.10', '7.11', '7.12', '7.13', '7.14', '5.37', '6.7'];
const DOCS = {
  'L2-09': '實體與環境安全管理程序書', 'L3-02': '機房與設備保護作業說明書', 'L3-01': '員工資訊安全作業規範', 'L3-04': '遠距工作作業說明書',
  'L2-03': '組織全景與風險管理程序書', 'L2-14': '營運持續管理程序書',
  'L4-29': '安全區域佈置圖', 'L4-30': '機房授權人員名單', 'L4-31': '人員進出登記表', 'L4-32': '網路架構圖', 'L4-33': '設備連網及外對內連線申請表',
  'L4-40': '資安列管合約清單', 'L4-61': '資訊資產進出及異動紀錄表', 'L4-62': '設備報廢資料清除確認單', 'L4-63': '機房環境設備檢查紀錄表',
};
// 表單卡內容：欄位取自 doc/ 目錄中的四階表單，人名以遮罩表示
const FORMS = {
  'L4-29': { no: 'ISMS-L4-29', name: '安全區域佈置圖｜安全區域清單', head: ['編號', '區域', '等級', '門禁／進入', '監視器'],
    rows: [['R-01', '電腦機房', '紅', '卡＋密碼', '門口、機櫃前後'], ['R-02', 'UPS／電力室', '紅', '卡＋密碼', '門口'], ['Y-01', '網路配線間', '黃', '鑰匙／門禁卡', '走廊'], ['Y-02', '文件庫房', '黃', '門禁卡', '門口'],
      ['Y-03', '交付裝卸區', '黃', '門禁卡', '裝卸口'], ['Y-04', '研發／財務區', '黃', '門禁卡', '門口'], ['G-01', '辦公區', '綠', '員工證', '出入口'], ['W-01', '接待區', '白', '—', '出入口']],
    foot: '圖例 ▲出入口 ◆門禁 ●監視器 ■消防 ◎環控｜每年 4 月審查' },
  'L4-30': { no: 'ISMS-L4-30', name: '機房授權人員名單', head: ['部門', '授權人員', '授權機房', '授權日期', '停止授權'],
    rows: [['資訊部', '阿哲', 'R-01、R-02', '2026/01/05', '—'], ['資訊部', '李○○', 'R-01', '2026/01/05', '—'], ['總務部', '張○○', 'R-02', '2026/03/02', '—'],
      { bad: 1, c: ['原廠', '王○○', '—', '—', '不在名單'] }],
    foot: '非授權人員：事前申請 → 進出登記 → 全程陪同' },
  'L4-30x': { no: 'ISMS-L4-30', name: '機房授權人員名單｜年度核對', head: ['部門', '授權人員', '授權機房', '授權日期', '停止授權'],
    rows: [['資訊部', '阿哲', 'R-01、R-02', '2026/01/05', '—'], ['資訊部', '李○○', 'R-01', '2026/01/05', '—'],
      { bad: 1, c: ['資訊部', '林○○', 'R-01', '2025/02/01', '2026/09/30 離職'] }, ['總務部', '張○○', 'R-02', '2026/03/02', '—']],
    foot: '比對人事名單 → 離職卡片立即停用 → 異常依 L2-13 通報', stamp: '停卡' },
  'L4-31': { no: 'ISMS-L4-31', name: '人員進出登記表', kv: [['年月日', '2026/10/19'], ['進入人員單位', 'XX 系統股份有限公司（原廠）'], ['進入人員簽名', '王○○'], ['陪同人員簽名', '阿哲'],
    ['進入／離開時間', '10:05 ／ 11:40'], ['工作內容', '更換故障硬碟'], ['攜帶可攜式設備', '☑筆電 ☑隨身碟｜理由：診斷工具'], ['主管簽名', '✔ 資訊單位主管']], stamp: '核准' },
  'L4-33': { no: 'ISMS-L4-33', name: '設備連網及外對內連線申請表', kv: [['申請人（正式人員）', '阿哲／資訊部'], ['外部使用者', '王○○／XX 系統'], ['申請事由', '☑ 作業系統、資訊系統、資料庫維護用'],
    ['連網設備資訊', 'NB-X1｜MAC 3C:52:82:…'], ['連線時間', '10/19 10:00 ～ 10/19 12:00'], ['使用地點', '☑ 單位內：R-01 電腦機房'], ['審查結果', '☑ 允許連接｜權責主管 ✔']], stamp: '限時' },
  'L4-61in': { no: 'ISMS-L4-61', name: '資訊資產進出及異動紀錄表', kv: [['☑ 攜進', '2026/10/19 09:40'], ['攜進出地點', '☑ 交付及裝卸區域 ☑ 電腦機房'], ['資訊資產名稱', '伺服器 SRV-07'],
    ['序號／財產編號', 'SN 8F2K-11／IT-2026-031'], ['攜進／出原因', '☑ 交付裝卸 ☑ 資訊資產新增'], ['申請人／主管', '阿哲／資訊部主管 ✔']], stamp: '驗收' },
  'L4-61rep': { no: 'ISMS-L4-61', name: '資訊資產進出及異動紀錄表', kv: [['☑ 攜出', '2026/10/19 15:20'], ['攜進出地點', '☑ 電腦機房 ☑ 交付及裝卸區域'], ['資訊資產名稱', '網路儲存設備 NAS-02'],
    ['攜進／出原因', '☑ 資訊資產送修（預計修復：10/26）'], ['是否完成加密？', '□是 ☑否，原因：硬碟已拆除留存'], ['申請單位主管', '✔ 同意']], stamp: '送修' },
  'L4-61home': { no: 'ISMS-L4-61', name: '資訊資產進出及異動紀錄表', kv: [['☑ 攜出', '2026/10/19 19:10'], ['攜進出地點', '☑ 一般辦公區域'], ['資訊資產名稱', '筆記型電腦 NB-015'],
    ['攜進／出原因', '☑ 借（夜間值班），預計歸還 10/20'], ['是否完成加密？', '☑ 是（全碟加密）'], ['申請單位主管', '✔ 同意']], stamp: '加密' },
  'L4-62': { no: 'ISMS-L4-62', name: '設備報廢資料清除確認單', kv: [['部門／申請人', '資訊部／阿哲'], ['財產編號／資產名稱', 'IT-2019-008／舊伺服器'], ['保管者', '資訊部'], ['報廢日期', '2026/10/19'],
    ['備註（清除方式）', '4 級：消磁＋實體破壞，附銷毀證明'], ['資訊單位執行人員', '阿哲 ✔'], ['主管簽核', '資訊安全專責主管 ✔']], stamp: '核准' },
  'L4-63': { no: 'ISMS-L4-63', name: '機房環境設備檢查紀錄表', head: ['項目', '正常範圍／狀態', '結果'], check: 1,
    rows: [['溫度／濕度', '18～27℃／40～60%', '✔ 正常'], ['空調', '運轉、濾網、排水', '✔ 正常'], ['漏水偵測', '感測器無告警', '✔ 正常'], ['UPS', '無告警；負載 <70%', '✔ 正常'],
      ['消防', '滅火器效期、煙霧偵測', '✔ 正常'], { bad: 1, c: ['環境', '無易燃物、無飲食', '✗ 紙箱、飲料→已清除'] }, ['門禁與監視', '門鎖、讀卡機、錄影', '✔ 正常'], ['機櫃', '上鎖、理線、無異音', '✔ 正常']],
    foot: '每月至少一次（建議每週）｜資訊單位主管核閱｜保存 3 年' },
  'L4-32': { no: 'ISMS-L4-32', name: '網路架構圖｜必要元素檢核', head: ['必要元素（L3-06 5.2.1）', '有'], check: 1,
    rows: [['網段／VLAN 規劃（含安全區域專用）', '☑'], ['IP 位址規劃', '☑'], ['對外連線、ISP、專線、VPN', '☑'], ['防火牆／IPS／VPN 閘道位置', '☑'], ['核心交換器、路由器名稱型號', '☑'], ['備援線路／設備標示', '☑']],
    foot: '3 級（密）｜每年審查，網路變更後更新' },
  wipe: { no: 'L3-02 §5.7.1', name: '設備汰除：媒體資料清除方式', head: ['資料等級', '再使用（內部）', '汰除／離開本公司'],
    rows: [['1～2 級', '格式化或覆寫', '覆寫至少 1 次'], ['3 級（密）', '安全刪除工具覆寫', '覆寫並消磁，或實體破壞'], { bad: 1, c: ['4 級（機密）', '覆寫並由第二人確認', '消磁並實體破壞，留存照片或銷毀證明'] }],
    foot: '網路設備、印表機、事務機：重設出廠並清除儲存區與帳號' },
};
const SKIN = '#F6D2B0';
const ACTORS = {
  eng: { name: '阿哲', role: '機房管理者', tag: '#2563EB', shirt: '#2F6FDE', pants: '#26324A', shoe: '#F8FAFC', hair: '#1E1B2E', glasses: 1, badge: 'staff' },
  vis: { name: '原廠工程師', tag: '#EA580C', shirt: '#64748B', pants: '#334155', shoe: '#1F2937', hair: '#3F2A1E', vest: '#F97316', cap: '#F59E0B', badge: 'visitor' },
  drv: { name: '送貨司機', tag: '#92400E', shirt: '#A16207', pants: '#3F3F46', shoe: '#1F2937', hair: '#2A1A12', cap: '#1D4ED8' },
  tail: { name: '陌生人', tag: '#475569', shirt: '#3F4656', pants: '#27272A', shoe: '#18181B', hair: '#111', hood: '#3F4656' },
  mnt: { name: '保養廠商', tag: '#0F766E', shirt: '#0F766E', pants: '#334155', shoe: '#1F2937', hair: '#2A1A12', helmet: '#F8FAFC', vest: '#FDE047' },
};
const ITEMS = {
  clip: '<rect x="-2" y="-9" width="13" height="17" rx="1.5" fill="#B45309"/><rect x="0" y="-6" width="9" height="12" fill="#fff"/><rect x="2.5" y="-11" width="4" height="3" rx="1" fill="#94A3B8"/><path d="M1.5 -3h6M1.5 0h6M1.5 3h4" stroke="#64748B" stroke-width="1"/>',
  box: '<rect x="-15" y="-12" width="25" height="18" rx="2" fill="#D6A86B" stroke="#9A6B34" stroke-width="1.2"/><path d="M-2.5 -12v18" stroke="#F4E3C3" stroke-width="3"/>',
  server: '<rect x="-15" y="-7" width="27" height="11" rx="1.5" fill="#334155" stroke="#0F172A"/><circle cx="-11" cy="-1.5" r="1.4" fill="#22C55E"/><circle cx="-7" cy="-1.5" r="1.4" fill="#38BDF8"/><path d="M-3 -4h13M-3 1h13" stroke="#64748B"/>',
  oldsrv: '<rect x="-15" y="-7" width="27" height="11" rx="1.5" fill="#57534E" stroke="#1C1917"/><path d="M-11 -4h21M-11 1h21" stroke="#78716C"/><rect x="2" y="1" width="12" height="8" rx="1" fill="#EF4444" stroke="#7F1D1D" stroke-width=".8"/>',
  disk: '<rect x="0" y="-7" width="10" height="13" rx="1.5" fill="#94A3B8" stroke="#334155"/><circle cx="5" cy="-.5" r="2.8" fill="#E2E8F0" stroke="#475569" stroke-width=".8"/>',
  nas: '<rect x="-2" y="-13" width="15" height="19" rx="2" fill="#1E293B" stroke="#0F172A"/><path d="M1 -9h9M1 -5h9M1 -1h9" stroke="#475569"/><circle cx="10" cy="3" r="1.4" fill="#F43F5E"/>',
  laptop: '<rect x="-1" y="-9" width="16" height="12" rx="1.5" fill="#64748B" stroke="#1E293B"/><circle cx="7" cy="-3" r="1.6" fill="#CBD5E1"/>',
  tool: '<rect x="-1" y="-6" width="16" height="11" rx="1.5" fill="#DC2626" stroke="#7F1D1D"/><path d="M3 -6v-3h8v3" fill="none" stroke="#7F1D1D" stroke-width="1.6"/>',
};

/* ═════════════════════ 3. 繪製平面圖（SVG） ═════════════════════ */
const rect = (x, y, w, h, a = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${a}/>`;
const txt = (x, y, s, a = '') => `<text x="${x}" y="${y}" ${a}>${esc(s)}</text>`;
function desk(x, y, id, opt = {}) {
  const cx = x + 30;
  let s = rect(x, y, 60, 28, 'rx="3" fill="#E9D6B4" stroke="#B08D57" stroke-width="1.2"');
  s += rect(cx - 15, y + 3, 30, 5, 'rx="1.5" fill="#0F172A"');
  s += rect(cx - 14, y + 8, 28, 3, `fill="#93C5FD" class="scr" id="${id}"`);
  if (opt.dual) s += rect(cx - 15 - 18, y + 4, 16, 5, 'rx="1.5" fill="#0F172A"') + rect(cx - 32, y + 9, 14, 3, 'fill="#93C5FD" class="scr"');
  s += rect(cx - 10, y + 16, 20, 5, 'rx="1" fill="#CBD5E1" stroke="#94A3B8" stroke-width=".6"');
  s += `<circle cx="${cx}" cy="${y + 41}" r="9" fill="#64748B" stroke="#334155" stroke-width="1.2"/>`;
  return s;
}
function seated(x, y, shirt, hair) {
  return `<g><ellipse cx="${x}" cy="${y + 3}" rx="11" ry="6.5" fill="${shirt}" stroke="rgba(0,0,0,.25)"/><circle cx="${x}" cy="${y - 3}" r="7" fill="${hair}"/><circle cx="${x}" cy="${y - 1}" r="4.5" fill="${SKIN}"/></g>`;
}
function rack(x, y, i) {
  let s = rect(x, y, 31, 38, 'rx="3" fill="#1F2937" stroke="#0B1220" stroke-width="1.2"');
  for (let k = 0; k < 4; k++) s += rect(x + 4, y + 5 + k * 7, 23, 4, 'rx="1" fill="#334155"') + `<circle cx="${x + 8}" cy="${y + 7 + k * 7}" r="1.2" fill="${(i + k) % 3 ? '#22C55E' : '#38BDF8'}"/>`;
  s += `<path d="M${x + 13} ${y + 37} v-3 a2.5 2.5 0 0 1 5 0 v3" fill="none" stroke="#FACC15" stroke-width="1.2"/>` + rect(x + 12, y + 36, 7, 5, 'rx="1" fill="#FACC15"');
  return s;
}
function mark(k, x, y) {
  if (k === 'ent') return `<path d="M${x} ${y - 7} L${x + 7} ${y + 5} L${x - 7} ${y + 5}Z" fill="#16A34A" stroke="#fff" stroke-width="1.5"/>`;
  if (k === 'cam') return `<g><circle cx="${x}" cy="${y}" r="6" fill="#DC2626" stroke="#fff" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="2" fill="#fff" class="camled"/></g>`;
  if (k === 'fire') return rect(x - 5.5, y - 5.5, 11, 11, 'fill="#DC2626" stroke="#fff" stroke-width="1.5"');
  if (k === 'env') return `<g><circle cx="${x}" cy="${y}" r="6.5" fill="#fff" stroke="#7C3AED" stroke-width="2"/><circle cx="${x}" cy="${y}" r="2.6" fill="#7C3AED"/></g>`;
  return '';
}
const LEGEND_SVG = {
  ent: '<svg viewBox="-8 -8 16 16"><path d="M0 -7 L7 5 L-7 5Z" fill="#16A34A"/></svg>',
  acc: '<svg viewBox="-8 -8 16 16"><path d="M0 -7 L7 0 L0 7 L-7 0Z" fill="#2563EB"/></svg>',
  cam: '<svg viewBox="-8 -8 16 16"><circle r="6" fill="#DC2626"/><circle r="2" fill="#fff"/></svg>',
  fire: '<svg viewBox="-8 -8 16 16"><rect x="-6" y="-6" width="12" height="12" fill="#DC2626"/></svg>',
  env: '<svg viewBox="-8 -8 16 16"><circle r="6" fill="#fff" stroke="#7C3AED" stroke-width="2"/><circle r="2.6" fill="#7C3AED"/></svg>',
};
function buildWorld() {
  const o = [];
  o.push(`<defs>
    <pattern id="tile" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#000" stroke-opacity=".06"/></pattern>
    <pattern id="raised" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="none" stroke="#9F1239" stroke-opacity=".14"/><circle cx="15" cy="15" r="1.3" fill="#9F1239" fill-opacity=".18"/></pattern>
    <pattern id="mesh" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#475569" stroke-width="1.2"/></pattern>
    <pattern id="hazard" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#1F2937"/><rect x="7" width="7" height="14" fill="#FACC15"/></pattern>
    <pattern id="park" width="200" height="80" patternUnits="userSpaceOnUse"><path d="M18 0 H128" stroke="#fff" stroke-width="3"/></pattern>
  </defs>`);
  // 戶外：停車場、道路、發電機
  o.push(rect(-60, -60, 1580, 940, 'fill="#C3CACE"'));
  o.push(rect(0, 0, 200, 720, 'fill="#CDD3D7"') + rect(0, 150, 200, 560, 'fill="url(#park)"'));
  o.push(rect(-60, 720, 1580, 160, 'fill="#AEB5BB"') + rect(-60, 720, 1580, 12, 'fill="#E2E8F0"') + `<path d="M-60 786 H1520" stroke="#FDE68A" stroke-width="3" stroke-dasharray="26 18"/>`);
  for (const [y, c] of [[618, '#3B82F6'], [458, '#EF4444'], [378, '#F8FAFC'], [218, '#10B981']]) o.push(`<g>${rect(22, y, 78, 40, `rx="10" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="1.5"`)}${rect(34, y + 6, 20, 28, 'rx="5" fill="#1E293B" opacity=".55"')}${rect(70, y + 6, 14, 28, 'rx="4" fill="#1E293B" opacity=".4"')}</g>`);
  for (const [x, y, r] of [[186, 14, 14], [14, 92, 12], [186, 700, 13], [16, 700, 12], [600, 806, 14], [900, 806, 12]]) o.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#7CC98F" stroke="#3E8E57" stroke-width="2"/>`);
  o.push(`<g id="gen">${rect(22, 24, 156, 112, 'rx="6" fill="#D8DEE2" stroke="#64748B" stroke-width="2" stroke-dasharray="6 4"')}<g id="genbody">${rect(42, 46, 116, 62, 'rx="6" fill="#475569" stroke="#1E293B" stroke-width="2"')}`
    + `${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${56 + i * 9} 56 v42" stroke="#334155" stroke-width="3"/>`).join('')}${rect(118, 54, 30, 18, 'rx="2" fill="#1E293B"')}<circle id="genled" cx="133" cy="63" r="3.5" fill="#64748B"/>`
    + `${txt(100, 124, '發電機', 'text-anchor="middle" font-size="12" font-weight="700" fill="#334155"')}<circle cx="150" cy="50" r="4" fill="#1E293B"/></g><g id="puffs"></g></g>`);
  // 室內地板（依區域顏色）
  for (const rm of ROOMS) if (!rm.out) {
    const [x, y, w, h] = rm.r;
    o.push(rect(x, y, w, h, `fill="${ZONES[rm.z].fill}"`) + rect(x, y, w, h, `fill="url(#${rm.id === 'R01' || rm.id === 'R02' ? 'raised' : 'tile'})"`));
  }
  // 大廳、會客室
  o.push(rect(225, 378, 112, 32, 'rx="8" fill="#D9B98C" stroke="#9C7A4C" stroke-width="1.5"') + rect(300, 385, 20, 14, 'rx="1.5" fill="#fff" stroke="#64748B"') + rect(240, 386, 18, 11, 'rx="2" fill="#F472B6" stroke="#9D174D" stroke-width=".8"'));
  o.push(seated(282, 362, '#7C3AED', '#1F2937'));
  o.push(rect(207, 604, 32, 92, 'rx="9" fill="#94A3B8" stroke="#475569" stroke-width="1.5"') + rect(204, 535, 22, 50, 'rx="3" fill="#64748B" opacity=".45"'));
  o.push(`<circle cx="424" cy="702" r="12" fill="#4ADE80" stroke="#15803D" stroke-width="2"/><circle cx="216" cy="262" r="10" fill="#4ADE80" stroke="#15803D" stroke-width="2"/>`);
  o.push(`<circle cx="320" cy="118" r="32" fill="#E9D6B4" stroke="#B08D57" stroke-width="1.5"/>` + [[320, 72], [320, 164], [274, 118], [366, 118]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#CBD5E1" stroke="#64748B"/>`).join('') + rect(232, 12, 92, 24, 'rx="6" fill="#94A3B8" stroke="#475569"'));
  // 會議室與白板
  o.push(rect(606, 58, 70, 144, 'rx="10" fill="#E9D6B4" stroke="#B08D57" stroke-width="1.5"') + [76, 110, 144, 178].map(y => `<circle cx="594" cy="${y}" r="8" fill="#CBD5E1" stroke="#64748B"/><circle cx="688" cy="${y}" r="8" fill="#CBD5E1" stroke="#64748B"/>`).join(''));
  o.push(`<g>${rect(460, 9, 110, 34, 'rx="3" fill="#fff" stroke="#64748B" stroke-width="2"')}<g id="wbink"><path d="M470 20 q10 -8 20 0 t20 0 t20 0" fill="none" stroke="#DC2626" stroke-width="2"/><path d="M470 31 h34 M512 31 h20" stroke="#2563EB" stroke-width="2"/>${txt(540, 24, 'Q4 報價', 'font-size="9" font-weight="900" fill="#DC2626"')}<path d="M537 34 l24 -6" stroke="#16A34A" stroke-width="2"/></g></g>`);
  // 文件庫房：檔案櫃、待銷毀上鎖櫃
  for (const x of [714, 758]) { o.push(rect(x, 22, 24, 186, 'rx="3" fill="#A8A29E" stroke="#57534E" stroke-width="1.2"')); for (let k = 0; k < 9; k++) o.push(rect(x + 3, 26 + k * 20, 18, 15, `rx="1.5" fill="${['#60A5FA', '#F59E0B', '#34D399', '#F472B6'][(k + x) % 4]}"`)); }
  o.push(`<g>${rect(846, 12, 68, 62, 'rx="3" fill="#E2E8F0"')}<g id="cageitem">${rect(856, 30, 32, 13, 'rx="2" fill="#57534E" stroke="#1C1917"')}${rect(876, 38, 14, 10, 'rx="1" fill="#EF4444" stroke="#7F1D1D" stroke-width=".8"')}</g>${rect(846, 12, 68, 62, 'rx="3" fill="url(#mesh)" stroke="#334155" stroke-width="2.2"')}`
    + `<path d="M876 70 v-5 a4 4 0 0 1 8 0 v5" fill="none" stroke="#B45309" stroke-width="2"/>${rect(873, 68, 14, 10, 'rx="2" fill="#F59E0B" stroke="#92400E"')}${txt(880, 92, '待銷毀上鎖櫃', 'text-anchor="middle" font-size="10" font-weight="900" fill="#7F1D1D"')}</g>`);
  // 網路配線間
  o.push(rect(975, 10, 90, 36, 'rx="3" fill="#1F2937" stroke="#0B1220" stroke-width="1.5"'));
  for (let k = 0; k < 12; k++) for (let r = 0; r < 2; r++) o.push(rect(980 + k * 7, 16 + r * 12, 4, 5, `fill="${(k + r) % 5 ? '#60A5FA' : '#1E293B'}"`));
  o.push(rect(926, 92, 22, 58, 'rx="3" fill="#64748B" stroke="#1E293B"') + txt(937, 166, '外線引入', 'text-anchor="middle" font-size="9" font-weight="900" fill="#713F12"'));
  o.push(`<g id="cmessy" fill="none" stroke-width="2.6" stroke-linecap="round">
    <path d="M985 46 C 960 90, 1080 80, 1040 130 S 960 180, 1000 210" stroke="#2563EB"/><path d="M1000 46 C 1060 110, 950 120, 990 160 S 1080 200, 1060 225" stroke="#F59E0B"/>
    <path d="M1015 46 C 1000 100, 1090 120, 1030 170 S 950 150, 948 130" stroke="#16A34A"/><path d="M1035 46 C 1095 70, 960 140, 1085 190" stroke="#DC2626"/><path d="M1050 46 C 1000 70, 1080 160, 975 200" stroke="#7C3AED"/></g>`);
  o.push(`<g id="ctidy">${rect(978, 50, 84, 10, 'rx="2" fill="#CBD5E1" stroke="#94A3B8"')}<path d="M984 55 H1056 M1060 55 H1078 V228" fill="none" stroke="#2563EB" stroke-width="3"/>
    <path d="M1092 6 V234" stroke="#EA580C" stroke-width="5"/>${txt(1086, 120, '電力', 'font-size="9" font-weight="900" fill="#9A3412" text-anchor="end"')}${txt(1072, 100, '通訊', 'font-size="9" font-weight="900" fill="#1E3A8A" text-anchor="end"')}
    <g id="clabels">${[985, 1005, 1025, 1045].map((x, i) => rect(x, 61, 13, 8, 'rx="1.5" fill="#fff" stroke="#1E293B" stroke-width=".8"') + txt(x + 6.5, 67.5, 'A0' + (i + 1), 'font-size="5.5" font-weight="900" text-anchor="middle" fill="#0F172A"')).join('')}</g></g>`);
  // UPS／電力室
  o.push(`<g>${rect(1188, 12, 46, 44, 'rx="3" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5"')}${rect(1244, 12, 46, 44, 'rx="3" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5"')}`
    + `${rect(1196, 20, 30, 10, 'rx="1.5" fill="#064E3B"')}${rect(1252, 20, 30, 10, 'rx="1.5" fill="#064E3B"')}<rect id="upsbar1" x="1198" y="22" width="26" height="6" fill="#22C55E"/><rect id="upsbar2" x="1254" y="22" width="26" height="6" fill="#22C55E"/>`
    + `${txt(1239, 70, 'UPS', 'text-anchor="middle" font-size="11" font-weight="900" fill="#7F1D1D"')}${rect(1308, 12, 122, 44, 'rx="3" fill="#334155" stroke="#0F172A" stroke-width="1.5"')}`
    + `${[0, 1, 2, 3, 4, 5, 6, 7].map(i => rect(1313 + i * 14.5, 17, 11, 34, 'rx="1.5" fill="#475569"')).join('')}${txt(1369, 70, '電池櫃', 'text-anchor="middle" font-size="11" font-weight="900" fill="#7F1D1D"')}`
    + `${rect(1398, 82, 34, 100, 'rx="3" fill="#94A3B8" stroke="#334155" stroke-width="1.5"')}${[0, 1, 2, 3, 4, 5].map(i => rect(1404, 90 + i * 14, 22, 8, 'rx="1" fill="#E2E8F0" stroke="#475569" stroke-width=".6"')).join('')}`
    + `${txt(1415, 196, '配電盤', 'text-anchor="middle" font-size="10" font-weight="900" fill="#7F1D1D"')}<g id="upstest">${rect(1188, -6, 102, 14, 'rx="4" fill="#0F172A"')}${txt(1239, 4.5, '電池測試中', 'text-anchor="middle" font-size="9" font-weight="900" fill="#FDE047"')}</g></g>`);
  // 電腦機房
  for (let i = 0; i < 7; i++) o.push(rack(1180 + i * 33, 238, i) + rack(1180 + i * 33, 344, i + 3));
  o.push(`<g id="newsrv">${rect(1278, 234, 35, 46, 'rx="4" fill="none" stroke="#38BDF8" stroke-width="3"')}${txt(1295, 230, 'NEW', 'text-anchor="middle" font-size="9" font-weight="900" fill="#0369A1"')}</g>`);
  o.push(`<g id="nas"><circle id="nasled" cx="1404" cy="244" r="3" fill="#F43F5E"/><g id="naswarn">${`<path d="M1394 226 l9 -15 l9 15z" fill="#FACC15" stroke="#7C2D12" stroke-width="1.5"/>` + txt(1403, 224, '!', 'text-anchor="middle" font-size="10" font-weight="900" fill="#7C2D12"')}</g></g><g id="nasgone">${rect(1380, 242, 27, 30, 'rx="2" fill="#0B1220"')}</g>`);
  o.push(`<path d="M1168 230 H1420 V392 H1168 Z" fill="none" stroke="#0EA5E9" stroke-width="2" stroke-dasharray="5 4" opacity=".8"/>`);
  o.push(rect(1400, 418, 34, 124, 'rx="4" fill="#E2E8F0" stroke="#64748B" stroke-width="1.5"') + [450, 480, 510].map((y, i) => `<circle cx="1417" cy="${y}" r="11" fill="#CBD5E1" stroke="#475569"/><g id="fan${i}"><path d="M1417 ${y} l0 -9 M1417 ${y} l7.8 4.5 M1417 ${y} l-7.8 4.5" stroke="#334155" stroke-width="3" stroke-linecap="round"/></g>`).join('') + txt(1392, 556, '空調', 'text-anchor="end" font-size="10" font-weight="900" fill="#7F1D1D"'));
  o.push(`<circle cx="1310" cy="543" r="9" fill="#DC2626" stroke="#7F1D1D" stroke-width="1.5"/><circle cx="1332" cy="543" r="9" fill="#DC2626" stroke="#7F1D1D" stroke-width="1.5"/>` + txt(1356, 547, '氣體滅火', 'font-size="9" font-weight="900" fill="#7F1D1D"'));
  o.push(rect(1180, 528, 80, 24, 'rx="3" fill="#CBD5E1" stroke="#64748B"') + rect(1205, 530, 30, 6, 'rx="1" fill="#0F172A"') + rect(1206, 536, 28, 3, 'fill="#38BDF8"'));
  o.push(`<g id="sop">${rect(1105, 476, 20, 74, 'rx="2" fill="#78716C" stroke="#292524"')}${['#2563EB', '#16A34A', '#DC2626', '#F59E0B', '#7C3AED'].map((c, i) => rect(1108, 480 + i * 13, 14, 10, `rx="1" fill="${c}"`)).join('')}${txt(1115, 470, 'SOP', 'text-anchor="middle" font-size="10" font-weight="900" fill="#7F1D1D"')}</g>`);
  o.push(`<g id="soph">${rect(1098, 456, 34, 100, 'rx="6" fill="none" stroke="#FACC15" stroke-width="4"')}</g>`);
  o.push(`<g id="junk">${rect(1336, 392, 26, 21, 'rx="2" fill="#D6A86B" stroke="#9A6B34" stroke-width="1.2"')}<path d="M1349 392 v21" stroke="#F4E3C3" stroke-width="3"/><circle cx="1374" cy="404" r="6" fill="#F5D0A9" stroke="#92400E" stroke-width="1.2"/><path d="M1376 402 l5 -9" stroke="#EC4899" stroke-width="2"/></g>`);
  o.push(`<g id="junkhl"><circle cx="1356" cy="403" r="28" fill="none" stroke="#F43F5E" stroke-width="3.5" stroke-dasharray="7 5"/></g>`);
  for (const [x, y] of [[1295, 296], [1295, 470], [1250, 120]]) o.push(`<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="#94A3B8" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="1.6" fill="#EF4444"/>`);
  // 辦公區
  const NPC = [];
  for (const [y, row] of [[395, 1], [560, 2]]) for (const [x, c] of [[470, 0], [535, 1], [680, 2], [745, 3]]) {
    const id = `scr${row}${c}`;
    o.push(desk(x, y, id, { dual: row === 1 && c === 3 }));
    if (!(row === 1 && c === 3)) NPC.push(seated(x + 30, y + 41, ['#0EA5E9', '#F97316', '#8B5CF6', '#10B981', '#EC4899', '#EAB308', '#14B8A6'][NPC.length % 7], ['#1F2937', '#78350F', '#111827'][NPC.length % 3]));
  }
  o.push(`<g id="papers"><rect x="540" y="566" width="18" height="13" fill="#fff" stroke="#94A3B8" transform="rotate(-12 549 572)"/><rect x="560" y="568" width="18" height="13" fill="#fff" stroke="#94A3B8" transform="rotate(9 569 574)"/><path d="M543 571 h10 M563 573 h10" stroke="#64748B"/>${rect(581, 557, 9, 9, 'fill="#FDE047" stroke="#A16207" stroke-width=".8"')}</g>`);
  o.push(`<g id="messyhl"><circle cx="565" cy="578" r="34" fill="none" stroke="#F43F5E" stroke-width="3.5" stroke-dasharray="7 5"/></g>`);
  o.push(rect(452, 676, 44, 32, 'rx="4" fill="#CBD5E1" stroke="#475569" stroke-width="1.5"') + rect(458, 682, 32, 6, 'rx="1" fill="#475569"') + `<g id="prpaper">${rect(461, 666, 26, 16, 'fill="#fff" stroke="#94A3B8"')}<path d="M465 671 h18 M465 675 h12" stroke="#64748B"/></g>` + txt(474, 718, '印表機', 'text-anchor="middle" font-size="9" font-weight="900" fill="#14532D"'));
  // 研發／財務區：玻璃隔間、保險櫃
  o.push(rect(878, 372, 26, 64, 'rx="3" fill="#E9D6B4" stroke="#B08D57"') + rect(878, 470, 26, 64, 'rx="3" fill="#E9D6B4" stroke="#B08D57"'));
  for (const y of [380, 478]) o.push(rect(880, y, 5, 46, 'rx="1" fill="#0F172A"') + `<g class="finscr">${rect(874, y + 2, 5, 42, 'fill="#60A5FA"')}<path d="M876 ${y + 36} l0 -8 l0 -6 l0 -14" stroke="#16A34A" stroke-width="2"/></g>`);
  NPC.push(seated(922, 404, '#BE185D', '#1F2937'));
  o.push(rect(998, 498, 32, 38, 'rx="3" fill="#475569" stroke="#1E293B" stroke-width="1.5"') + `<circle cx="1014" cy="517" r="7" fill="#94A3B8" stroke="#1E293B"/>`);
  o.push(`<g id="sight"><path d="M842 468 L878 404" stroke="#F43F5E" stroke-width="3" stroke-dasharray="6 5"/><circle cx="878" cy="404" r="16" fill="none" stroke="#F43F5E" stroke-width="3"/></g>`);
  // 交付裝卸區
  o.push(rect(1196, 696, 108, 18, 'fill="url(#hazard)" opacity=".55"') + rect(930, 655, 100, 35, 'rx="3" fill="#CBD5E1" stroke="#64748B" stroke-width="1.5"') + txt(980, 705, '驗收檢查台', 'text-anchor="middle" font-size="9" font-weight="900" fill="#713F12"'));
  o.push(rect(1330, 588, 92, 64, 'rx="3" fill="#B45309" opacity=".85"') + [[1336, 594], [1364, 594], [1392, 594], [1336, 620], [1364, 620]].map(([x, y]) => rect(x, y, 24, 22, 'rx="2" fill="#D6A86B" stroke="#9A6B34"')).join(''));
  o.push(`<path d="M1045 578 H1095" stroke="#DC2626" stroke-width="4"/>` + txt(1070, 616, '送貨人員止步', 'text-anchor="middle" font-size="10" font-weight="900" fill="#B91C1C"'));
  o.push(`<g id="box"><g id="boxc">${rect(966, 660, 30, 22, 'rx="2" fill="#D6A86B" stroke="#9A6B34" stroke-width="1.2"')}<path d="M981 660 v22" stroke="#F4E3C3" stroke-width="3"/></g>`
    + `<g id="boxo">${rect(966, 660, 30, 22, 'rx="2" fill="#B88A50" stroke="#9A6B34" stroke-width="1.2"')}<path d="M966 660 l-8 -8 M996 660 l8 -8" stroke="#D6A86B" stroke-width="4"/>${rect(970, 664, 22, 9, 'rx="1" fill="#334155"')}<circle cx="974" cy="668" r="1.4" fill="#22C55E"/></g></g>`);
  o.push(`<g id="sandbag">${[0, 1, 2, 3, 4, 5, 6].map(i => `<ellipse cx="${1196 + i * 18}" cy="736" rx="11" ry="7" fill="#C8A26B" stroke="#7C5A2B" stroke-width="1.5"/>`).join('')}${[0, 1, 2, 3, 4, 5].map(i => `<ellipse cx="${1205 + i * 18}" cy="728" rx="11" ry="7" fill="#D6B47E" stroke="#7C5A2B" stroke-width="1.5"/>`).join('')}</g>`);
  o.push(`<g id="truck"><g>${rect(1288, 740, 118, 52, 'rx="5" fill="#F8FAFC" stroke="#334155" stroke-width="2"')}${rect(1288, 758, 118, 8, 'fill="#16C47F"')}${rect(1406, 744, 42, 44, 'rx="8" fill="#2563EB" stroke="#1E3A8A" stroke-width="2"')}${rect(1430, 750, 12, 32, 'rx="3" fill="#BFDBFE"')}</g></g>`);
  o.push(`<g id="npcs">${NPC.join('')}</g>`);
  // 區域外框
  for (const z of 'WGYR') o.push(`<g id="zo-${z}" fill="none" stroke="${ZONES[z].line}">${ROOMS.filter(r => r.z === z && !r.out).map(r => rect(r.r[0] + 6, r.r[1] + 6, r.r[2] - 12, r.r[3] - 12, 'rx="6"')).join('')}</g>`);
  // 牆、玻璃、門
  o.push(`<path d="${WALLS.map(w => `M${w[0]} ${w[1]}L${w[2]} ${w[3]}`).join('')}" stroke="#2B3A4A" stroke-width="10" stroke-linecap="square" fill="none"/>`);
  o.push(`<path d="${WALLS.map(w => `M${w[0]} ${w[1]}L${w[2]} ${w[3]}`).join('')}" stroke="#5B6B7E" stroke-width="3" stroke-linecap="square" fill="none"/>`);
  for (const g of GLASS) o.push(`<line x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}" stroke="#7DD3FC" stroke-width="7"/><line x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}" stroke="#fff" stroke-width="2" opacity=".8"/>`);
  o.push(`<g id="frost">${rect(855, 324, 10, 232, 'fill="#fff" opacity=".9"')}${Array.from({ length: 23 }, (_, i) => `<path d="M855 ${330 + i * 10} h10" stroke="#94A3B8" stroke-width="1.5"/>`).join('')}</g>`);
  for (const d of DOORS) {
    const [ax, ay] = d.a, [bx, by] = d.b, len = Math.hypot(bx - ax, by - ay);
    if (d.kind === 'slide') o.push(`<g id="d-${d.id}"><line class="p1" x1="${ax}" y1="${ay}" x2="${ax}" y2="${ay + len / 2}" stroke="#38BDF8" stroke-width="5"/><line class="p2" x1="${ax}" y1="${ay + len / 2}" x2="${ax}" y2="${by}" stroke="#38BDF8" stroke-width="5"/></g>`);
    else if (d.kind === 'gate') o.push(`<g id="d-${d.id}">${rect(ax - 6, ay - 2, 12, 10, 'rx="2" fill="#475569"')}${rect(bx - 6, by - 8, 12, 10, 'rx="2" fill="#475569"')}<line class="f1" x1="${ax}" y1="${ay + 7}" x2="${ax}" y2="${ay + 27}" stroke="#7DD3FC" stroke-width="5" stroke-linecap="round"/><line class="f2" x1="${bx}" y1="${by - 7}" x2="${bx}" y2="${by - 27}" stroke="#7DD3FC" stroke-width="5" stroke-linecap="round"/><circle id="gatelight" cx="${ax}" cy="${ay + 3}" r="3.5" fill="#22C55E"/></g>`);
    else if (d.kind === 'roll') o.push(`<g id="d-${d.id}">${rect(ax, ay - 6, len, 12, 'fill="#94A3B8" stroke="#334155" stroke-width="1.5"')}${Array.from({ length: 9 }, (_, i) => `<path d="M${ax + 10 + i * 10} ${ay - 6} v12" stroke="#64748B"/>`).join('')}</g>`);
    else o.push(`<g id="d-${d.id}"><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#8B5E34" stroke-width="5" stroke-linecap="round"/></g>`);
    if (d.rd) o.push(`<g>${rect(d.rd[0] - 5, d.rd[1] - 6, 10, 12, 'rx="2" fill="#1E293B"')}<path d="M${d.rd[0]} ${d.rd[1] - 12} l6 6 l-6 6 l-6 -6z" fill="#2563EB" stroke="#fff" stroke-width="1.2"/><circle id="rd-${d.id}" cx="${d.rd[0]}" cy="${d.rd[1] + 2}" r="2.6" fill="#64748B"/></g>`);
  }
  o.push(`<g id="marks">${MARKS.map(([k, x, y], i) => `<g class="mk mk-${k}" data-x="${x}" data-y="${y}">${mark(k, x, y)}</g>`).join('')}</g>`);
  o.push(`<g id="actors">${Object.entries(ACTORS).map(([id, d]) => actorSVG(id, d)).join('')}</g>`);
  return o.join('');
}
function actorSVG(id, d) {
  const head = -44;
  let hair = `<path d="M-11.5 ${head} a11.5 11.5 0 0 1 23 0 q-4 -4 -11 -4 q-8 0 -12 4z" fill="${d.hair}"/>`;
  if (d.cap) hair = `<path d="M-12 ${head - 1} a12 12 0 0 1 24 0z" fill="${d.cap}"/><path d="M4 ${head - 2} h12 a2 2 0 0 1 0 4 h-12z" fill="${d.cap}"/>`;
  if (d.helmet) hair = `<path d="M-13 ${head} a13 13 0 0 1 26 0z" fill="${d.helmet}" stroke="#94A3B8"/><rect x="-14" y="${head - 1}" width="28" height="3" rx="1.5" fill="#CBD5E1"/>`;
  let face = `<circle cx="-2.5" cy="${head + 1}" r="1.7" fill="#1F2937"/><circle cx="5.5" cy="${head + 1}" r="1.7" fill="#1F2937"/><path d="M0 ${head + 6} q2.5 2 5 0" fill="none" stroke="#9A3412" stroke-width="1.2" stroke-linecap="round"/><circle cx="-6" cy="${head + 4.5}" r="2" fill="#F9A8A8" opacity=".7"/><circle cx="9" cy="${head + 4.5}" r="2" fill="#F9A8A8" opacity=".7"/>`;
  if (d.glasses) face += `<circle cx="-2.5" cy="${head + 1}" r="3.6" fill="none" stroke="#111827" stroke-width="1.3"/><circle cx="5.5" cy="${head + 1}" r="3.6" fill="none" stroke="#111827" stroke-width="1.3"/><path d="M1.1 ${head + 1} h0.8" stroke="#111827" stroke-width="1.3"/>`;
  if (d.hood) { hair = `<path d="M-13 ${head + 4} a13 14 0 0 1 26 0 v4 h-4 v-5 a9 9 0 0 0 -18 0 v5 h-4z" fill="${d.hood}"/>`; face += `<rect x="-4" y="${head + 3}" width="13" height="6" rx="2.5" fill="#E5E7EB"/>`; }
  const vest = d.vest ? `<path d="M-9.5 -32 h6 v19 h-6z M3.5 -32 h6 v19 h-6z" fill="${d.vest}"/><path d="M-9.5 -22 h6 M3.5 -22 h6" stroke="#fff" stroke-width="2"/>` : '';
  const badge = d.badge === 'staff' ? `<path d="M-4 -33 L0 -25 L4 -33" fill="none" stroke="#1E3A8A" stroke-width="1.2"/>${rect(-3.5, -26, 7, 8, 'rx="1" fill="#fff" stroke="#1E3A8A" stroke-width=".8"')}${rect(-3.5, -26, 7, 2.5, 'fill="#2563EB"')}`
    : d.badge === 'visitor' ? `<path d="M-4 -33 L0 -25 L4 -33" fill="none" stroke="#9D174D" stroke-width="1.2"/>${rect(-4, -26, 8, 8, 'rx="1" fill="#F472B6" stroke="#9D174D" stroke-width=".8"')}` : '';
  return `<g id="ac-${id}" class="actor" style="display:none">
    <ellipse rx="12" ry="4.5" fill="#0F172A" opacity=".25"/>
    <g class="flip"><g class="bob">
      <g class="legL"><rect x="-6.5" y="-15" width="5.5" height="14" rx="2.5" fill="${d.pants}"/><rect x="-7.5" y="-3" width="7" height="4" rx="2" fill="${d.shoe}" stroke="#334155" stroke-width=".6"/></g>
      <g class="legR"><rect x="1" y="-15" width="5.5" height="14" rx="2.5" fill="${d.pants}"/><rect x="0.5" y="-3" width="7" height="4" rx="2" fill="${d.shoe}" stroke="#334155" stroke-width=".6"/></g>
      <g class="armB"><rect x="-13.5" y="-31" width="5" height="15" rx="2.5" fill="${d.shirt}"/><circle cx="-11" cy="-16" r="2.7" fill="${SKIN}"/></g>
      <rect x="-9.5" y="-33" width="19" height="20" rx="7" fill="${d.shirt}" stroke="rgba(0,0,0,.2)"/>
      ${vest}${badge}
      <g class="head"><circle cx="0" cy="${head}" r="11.5" fill="${SKIN}" stroke="#C99A78" stroke-width=".8"/>${face}${hair}</g>
      <g class="armF"><rect x="8.5" y="-31" width="5" height="15" rx="2.5" fill="${d.shirt}"/><circle cx="11" cy="-16" r="2.7" fill="${SKIN}"/></g>
      <g class="item" transform="translate(12 -19)"></g>
    </g></g></g>`;
}

function roomAt(p) {
  for (const rm of ROOMS) { if (rm.out) continue; const [x, y, w, h] = rm.r; if (p[0] >= x && p[0] < x + w && p[1] >= y && p[1] < y + h) return rm; }
  return ROOMS[p[1] >= 720 ? 1 : 0];
}

return { ZONES, ROOMS, WALLS, GLASS, DOORS, MARKS, NODES, EDGES, ADJ, route, CAMS, BOUNDS, ANNEX, ANNEX_TEXT, OPS, OPS_EN, CREDIT, ANNEX_ORDER, DOCS, FORMS, SKIN, ACTORS, ITEMS, LEGEND_SVG, buildWorld, actorSVG, roomAt, esc };
})();
if (typeof module !== 'undefined') module.exports = { ZW };
