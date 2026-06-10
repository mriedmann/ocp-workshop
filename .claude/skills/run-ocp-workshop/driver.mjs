#!/usr/bin/env node
/**
 * driver.mjs — launch and drive ocp-workshop Slidev presentations
 *
 * Usage:
 *   node driver.mjs [deck] [port] [command] [args...]
 *
 * Decks:  full (default), ch01, ch02, ch03, ch04
 * Port:   3030 (default)
 *
 * Commands:
 *   start           Start Slidev server and print URL (leaves it running)
 *   stop            Kill Slidev process on the port
 *   screenshot <N>  Screenshot slide N → /tmp/slidev-ss/slide-N.png
 *   count           Print total slide count from overview page
 *   export <out>    Export all slides to PDF via `slidev export`
 *   smoke           Start → screenshot slide 1 → print overview count → stop
 */

import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');  // project root

const DECKS = {
  full: 'slides.md',
  ch01: 'chapters/01-linux/slides.md',
  ch02: 'chapters/02-containers/slides.md',
  ch03: 'chapters/03-kubernetes/slides.md',
  ch04: 'chapters/04-openshift/slides.md',
};

const [, , deckArg = 'full', portArg = '3030', cmd = 'smoke', ...rest] = process.argv;
const deck = DECKS[deckArg] ?? DECKS.full;
const port = parseInt(portArg, 10);
const SS_DIR = '/tmp/slidev-ss';

async function getBrowser() {
  const require = createRequire(import.meta.url);
  const { chromium } = require(path.join(__dir, 'node_modules/playwright-chromium'));
  return chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
}

async function waitForServer(url, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}

function startServer(deckPath) {
  const proc = spawn('npx', ['slidev', deckPath, '--port', String(port), '--no-open'], {
    cwd: __dir,
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();
  return proc.pid;
}

function stopServer() {
  try {
    execSync(`fuser -k ${port}/tcp 2>/dev/null`, { cwd: __dir });
    console.log(`Stopped server on port ${port}`);
  } catch { /* already stopped */ }
}

async function screenshot(slideNum, outPath) {
  mkdirSync(SS_DIR, { recursive: true });
  const dest = outPath ?? path.join(SS_DIR, `slide-${slideNum}.png`);
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:${port}/${slideNum}`, { waitUntil: 'networkidle', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: dest });
  await browser.close();
  console.log(`Screenshot: ${dest}`);
  return dest;
}

async function slideCount() {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://localhost:${port}/overview`, { waitUntil: 'networkidle', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const title = await page.title();
  const countMatch = title.match(/(\d+)\s+slides?/i);
  // Try reading the count from the overview stats bar
  const stats = await page.evaluate(() =>
    document.querySelector('[class*="stats"]')?.innerText
    || document.querySelector('.slidev-overview-count')?.innerText
    || document.title
  );
  await browser.close();
  console.log('Title:', title);
  console.log('Stats:', stats);
  return stats;
}

async function exportPdf(output) {
  const outPath = path.resolve(__dir, output ?? `dist/${deckArg}-export.pdf`);
  console.log(`Exporting ${deck} → ${outPath}`);
  execSync(`npx slidev export ${deck} --output ${outPath}`, { cwd: __dir, stdio: 'inherit' });
  console.log(`Exported: ${outPath}`);
}

// --- main ---

if (cmd === 'start') {
  startServer(deck);
  await waitForServer(`http://localhost:${port}`);
  console.log(`Slidev running at http://localhost:${port}`);
  console.log(`Overview:  http://localhost:${port}/overview`);
  console.log(`Presenter: http://localhost:${port}/presenter`);

} else if (cmd === 'stop') {
  stopServer();

} else if (cmd === 'screenshot') {
  const n = parseInt(rest[0] ?? '1', 10);
  await screenshot(n, rest[1]);

} else if (cmd === 'count') {
  await slideCount();

} else if (cmd === 'export') {
  await exportPdf(rest[0]);

} else if (cmd === 'smoke') {
  // Start → screenshot slide 1 → count → stop
  console.log(`Starting ${deckArg} deck on port ${port}…`);
  startServer(deck);
  await waitForServer(`http://localhost:${port}`);
  console.log(`Server up: http://localhost:${port}`);
  await screenshot(1);
  await slideCount();
  stopServer();
  console.log('Smoke test passed.');

} else {
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}
