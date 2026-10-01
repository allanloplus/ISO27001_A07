// 擷取指定秒數的畫面做檢查：node tools/shots.cjs <url> <outdir> <秒數...>
const { chromium } = require('playwright');
(async () => {
  const [,, url, out, ...times] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('console', m => m.type() === 'error' && console.log('console:', m.text()));
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto(url + '#render'); await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  for (const t of times) { await p.evaluate(t => renderAt(+t), t); await p.screenshot({ path: `${out}/s_${t}.png` }); }
  await b.close();
})();
