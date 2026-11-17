// Click "Open in this page" and sum the bytes the panel then loads.
// Also opens a second tab and checks that only one holds the beagle-peer lock.
import { chromium } from "playwright-core";
import { start } from "./serve.mjs";

const HEAVY = [
  "beagle-web.js",
  "beagle-ui.js",
  "react.production.min.js",
  "react-dom.production.min.js",
  "peer-webrtc.js",
  "chat-components.js",
  "qrcode.js",
];

function isHeavy(url) {
  return HEAVY.some((name) => url.includes(name));
}

const { server, url } = await start(0);
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext();
try {
  const page = await context.newPage();
  const before = [];
  page.on("response", (res) => { if (isHeavy(res.url())) before.push(res.url()); });
  await page.goto(url);
  await page.waitForTimeout(400);
  const beforeClick = before.slice();
  if (beforeClick.length) throw new Error("heavy files loaded before the click: " + beforeClick.join(", "));

  await page.click("#open");
  await page.waitForTimeout(700);
  const autoNote = await page.textContent("#note");
  const autoHeavy = before.slice();
  if (autoHeavy.length) throw new Error("Open chat loaded the panel beside an installed Beagle: " + autoHeavy.join(", "));

  const loaded = new Map();
  page.on("response", async (res) => {
    if (!isHeavy(res.url())) return;
    const len = Number(res.headers()["content-length"] || 0);
    let body = len;
    if (!body) { try { body = (await res.body()).length; } catch { body = 0; } }
    loaded.set(res.url().split("?")[0], body);
  });
  const address = "Sw1d4dJQVyxC1VY1RyqcBg5oc8z7HgGT4r4qMpWBXDozt8BaEJ3s";
  await page.fill("#address", address);
  await page.click("#force");
  await page.waitForTimeout(2500);
  const frame = page.frames().find((f) => f !== page.mainFrame());
  if (!frame) throw new Error("panel frame did not open");
  await frame.waitForFunction(() => window.BeagleWeb && window.__beagleBoot, null, { timeout: 15000 });
  await frame.waitForFunction(() => window.BeagleWeb.lockState, null, { timeout: 15000 });
  const snap = (f) => f.evaluate(async () => ({
    origin: location.origin,
    secure: isSecureContext,
    state: window.BeagleWeb.lockState,
    supported: window.BeagleWeb.lock && window.BeagleWeb.lock.supported,
    locks: navigator.locks ? await navigator.locks.query() : null,
  }));
  const first = await snap(frame);

  let total = 0;
  const rows = [];
  for (const [u, n] of loaded) {
    total += n;
    rows.push({ file: u.slice(u.lastIndexOf("/") + 1), bytes: n });
  }
  rows.sort((a, b) => b.bytes - a.bytes);

  const page2 = await context.newPage();
  await page2.goto(url);
  await page2.click("#force");
  const frame2 = page2.frames().find((f) => f !== page2.mainFrame());
  await frame2.waitForFunction(() => window.BeagleWeb && window.BeagleWeb.lockState, null, { timeout: 15000 });
  const second = await snap(frame2);

  const firstAfter = await snap(frame);
  const panelText = await frame.evaluate(() => document.body.innerText.slice(0, 500));
  console.log(JSON.stringify({
    beforeClick,
    autoNote,
    afterClick: rows,
    totalBytes: total,
    firstLock: first,
    firstLockAfterSecond: firstAfter,
    secondLock: second,
    panelText,
  }, null, 2));
  const hash = await frame.evaluate(() => location.hash);
  if (!hash.includes(address)) throw new Error("panel did not keep ?address= in the hash: " + hash);
  if (first.origin === "null") throw new Error("panel origin is opaque, so the lock cannot be shared");
  if (!(first.state && first.state.held === true)) throw new Error("first panel did not hold the lock");
  if (!(second.state && second.state.held === false)) {
    throw new Error("second panel also held the lock: " + JSON.stringify(second));
  }
} finally {
  await browser.close();
  server.close();
}
