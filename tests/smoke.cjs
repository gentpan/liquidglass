// Smoke tests: the site and docs load without errors, the components behave, and the library
// can be imported outside a browser. Run with `npm test` (needs Playwright's Chromium).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };

const FIXTURE = `<!doctype html><meta charset="utf-8"><body>
<lg-switch id="sw" checked>Wi-Fi</lg-switch>
<lg-slider id="sl" value="40" label="Volume"></lg-slider>
<lg-segmented id="seg" value="week"><button value="day">Day</button><button value="week">Week</button></lg-segmented>
<lg-menubar><lg-menu id="menu" label="Edit"><button data-shortcut="<img src=x onerror=window.pwned=1>">Copy</button></lg-menu></lg-menubar>
<script type="module">
  import * as lg from '/lib/components.js';
  window.lg = lg;
  window.ready = true;
</script>`;

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/__fixture.html') return res.end(FIXTURE);
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT + path.sep) && file !== ROOT) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, body) => {
      if (err) return res.writeHead(404).end();
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('library imports outside a browser (SSR)', async () => {
  await import(path.join(ROOT, 'lib/components.js'));
});

test('site and docs load without errors', async ({ page, base }) => {
  for (const url of ['/', '/docs/']) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + url, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    page.removeAllListeners('pageerror');
    assert.deepEqual(errors, [], `${url}: ${errors.join('; ')}`);
  }
});

test('components render glass and keep state in sync', async ({ page, base }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/__fixture.html');
  await page.waitForFunction(() => window.ready);
  await page.waitForFunction(() => document.querySelector('#sw .lg-refract')?.style.filter.startsWith('url('));

  const r = await page.evaluate(() => {
    const sw = document.getElementById('sw');
    sw.querySelector('input').click(); // user turns it off
    const afterClick = sw.checked;
    sw.checked = true; // attribute is still present: must still apply
    const afterSet = sw.checked;

    const seg = document.createElement('lg-segmented');
    seg.value = 'b'; // before it is built
    seg.innerHTML = '<button value="a">A</button><button value="b">B</button>';
    document.body.append(seg);

    const sl = document.getElementById('sl');
    sl.setAttribute('max', '200');

    return {
      afterClick,
      afterSet,
      segValue: seg.value,
      segIndex: document.getElementById('seg').value,
      sliderMax: sl.querySelector('input').max,
      kbd: document.querySelector('#menu kbd')?.textContent,
      pwned: !!window.pwned,
    };
  });
  assert.equal(r.afterClick, false);
  assert.equal(r.afterSet, true);
  assert.equal(r.segValue, 'b');
  assert.equal(r.segIndex, 'week');
  assert.equal(r.sliderMax, '200');
  assert.equal(r.kbd, '<img src=x onerror=window.pwned=1>');
  assert.equal(r.pwned, false);
  assert.deepEqual(errors, []);
});

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  let failed = 0;
  for (const { name, fn } of tests) {
    const page = await browser.newPage();
    try {
      await fn({ page, base });
      console.log(`ok   ${name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL ${name}\n     ${e.message}`);
    }
    await page.close();
  }
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
})();
