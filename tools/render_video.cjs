// 逐格渲染 index.html 並與旁白合成 MP4：node tools/render_video.cjs <url> <輸出.mp4> [fps]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
(async () => {
  const [,, url, out, fpsArg] = process.argv;
  const fps = +(fpsArg || 15);
  const root = path.resolve(__dirname, '..');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto(url + '#render'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  const total = await p.evaluate(() => window.TOTAL_DURATION);
  const n = Math.ceil(total * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-i', path.join(root, 'build', 'narration.wav'), '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-tune', 'animation', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => renderAt(t), i / fps);
    const buf = await p.screenshot({ type: 'jpeg', quality: 90 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % (fps * 30) === 0) console.log(`frame ${i}/${n}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await b.close();
  console.log('done', out);
})();
