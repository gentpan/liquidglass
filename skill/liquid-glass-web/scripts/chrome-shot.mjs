#!/usr/bin/env node
// Drive headless Chrome in real time over the DevTools protocol and save a screenshot.
// Unlike `--virtual-time-budget`, springs and rAF run on the wall clock, so hover, press and
// open states look exactly as a user would see them.
//
//   node chrome-shot.mjs <url> <out.png> [--w 1280] [--h 900] [--dpr 2] [--wait 2500]
//        [--scroll <y>] [--full] [--eval "<js expression>"]
//        [--actions '[{"type":"move|click|down|up","x":300,"y":200,"wait":400}]']
//
// --eval prints the expression's value (promises are awaited) before the screenshot.
// Needs Node 22+ (global WebSocket) and Google Chrome in /Applications (override with CHROME=path).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const [url, out] = argv;
if (!url || !out) {
  console.error('usage: node chrome-shot.mjs <url> <out.png> [options]');
  process.exit(2);
}
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : d;
};
const flag = (k) => argv.includes(`--${k}`);
const W = Number(opt('w', 1280));
const H = Number(opt('h', 900));
const dpr = Number(opt('dpr', 2));
const wait = Number(opt('wait', 2500));
const chromePath = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9300 + Math.floor(Math.random() * 600);
const profile = mkdtempSync(join(tmpdir(), 'chrome-shot-'));
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });

let ws;
for (let i = 0; i < 100 && !ws; i++) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = targets.find((t) => t.type === 'page');
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
  if (!ws) await sleep(100);
}
if (!ws) {
  chrome.kill();
  throw new Error('Chrome did not start');
}
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let seq = 0;
const pending = new Map();
ws.addEventListener('message', (m) => {
  const msg = JSON.parse(m.data);
  pending.get(msg.id)?.(msg);
  pending.delete(msg.id);
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

try {
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: dpr, mobile: false });
  await send('Page.enable');
  await send('Page.navigate', { url });
  await sleep(wait);

  const scroll = opt('scroll', null);
  if (scroll !== null) {
    await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${Number(scroll)})` });
    await sleep(800);
  }
  const actions = opt('actions', null);
  for (const a of actions ? JSON.parse(actions) : []) {
    const at = { x: a.x, y: a.y, clickCount: 1 };
    if (a.type === 'move') await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at, button: 'none' });
    if (a.type === 'down' || a.type === 'click') await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button: 'left' });
    if (a.type === 'up' || a.type === 'click') await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button: 'left' });
    await sleep(a.wait ?? 400);
  }
  const expression = opt('eval', null);
  if (expression) {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    console.log(JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails ?? null));
  }

  const params = { format: 'png' };
  if (flag('full')) {
    const { result } = await send('Page.getLayoutMetrics');
    const size = result.cssContentSize ?? result.contentSize;
    params.captureBeyondViewport = true;
    params.clip = { x: 0, y: 0, width: W, height: Math.ceil(size.height), scale: 1 };
  }
  const shot = await send('Page.captureScreenshot', params);
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log(`saved ${out}`);
} finally {
  ws.close();
  chrome.kill();
  setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
}
