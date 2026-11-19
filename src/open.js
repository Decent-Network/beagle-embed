// A chat panel for a host page.
//
// The conversation view is @decentnetwork/beagle-ui (mount). The in-tab peer
// is the beagle-web browser bundle (it patches fetch for /api and takes the
// Web Lock "beagle-peer"). Neither is copied into this package. Both load
// only when the panel opens, and only inside an iframe so the host page
// stays put. beagle-ui's mount() pins itself to the viewport; the iframe is
// what makes that a panel.
//
// The in-tab frame is a real same-origin URL (default /beagle-frame.html),
// not about:blank. about:blank shares the host page's session history on
// Safari, so the chat's back button leaves the site. A srcdoc frame is a
// null origin, and each panel would start its own peer.
//
// beagle-web is not on npm yet and has no export map. Pass the URL of its
// built beagle-web.js (and the vendor scripts it expects) in `assets`.
// The gap is written up in the README.

import { FRAME_HTML } from "./frame.js";
export { signInChoice, pageIsLoopback, localBeagle, beagleMarkSvg, showSignInChoice, signInChoiceHtml, WEB_CLIENT } from "./account.js";

export { FRAME_HTML };
export const VERSION = "0.2.2";
export const FRAME_PATH = "/beagle-frame.html";
const PROFILE_KEY = "beagle-embed:profile";

const WEB = "https://app.beagle.chat";
const SITE_KEY = "beagle-connect:identity";
const LOCAL = ["http://127.0.0.1:8766", "http://localhost:8766"];

export function beagleChatUrl(origin, address) {
  const u = new URL(origin || WEB);
  if (address) u.searchParams.set("address", address);
  return u.href;
}

function jsString(value) {
  return JSON.stringify(value == null ? "" : String(value)).replace(/</g, "\\u003c");
}

/**
 * Copy this origin's site key into the store beagle-web reads, before that
 * bundle boots. beagle-web never looks at `beagle-connect:identity`. With no
 * key of its own it stays on the early router: empty userid, empty carrier,
 * transport `tcp-relay`. The welcome step that would mint a key is not shown
 * in this panel. An identity already in `beagle-web:kv:identity` is left as it is.
 */
function seedSiteKeyScript() {
  return `<script>
(function () {
  try {
    var ua = navigator.userAgent || "";
    if (/AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Firefox|FxiOS/.test(ua)) {
      localStorage.setItem("beagle-web:backend", "ls");
    }
  } catch (e) {}
  try {
    var mirror = "beagle-web:kv:identity";
    if (localStorage.getItem(mirror)) return;
    var raw = localStorage.getItem(${jsString(SITE_KEY)});
    if (!raw) return;
    var file = JSON.parse(raw);
    if (!file || file.format !== "decent-peer-tox-keypair-v1") return;
    if (typeof file.publicKey !== "string" || typeof file.secretKey !== "string") return;
    localStorage.setItem(mirror, JSON.stringify({ v: { format: file.format, publicKey: file.publicKey, secretKey: file.secretKey } }));
  } catch (e) {}
})();
<\/script>`;
}

/** Loopback is the Beagle on this computer. Its key can be shown in a frame. */
export function isInstalledOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "[::1]";
  } catch { return false; }
}

/** A public Beagle keeps its key in its own tab. A frame would mint another. */
export function isWebOrigin(origin) {
  if (!origin || isInstalledOrigin(origin)) return false;
  try {
    const u = new URL(origin);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch { return false; }
}

const ASSET_KEYS = ["react", "reactDom", "qrcode", "peerWebrtc", "chatComponents", "beagleWeb", "beagleUi"];

/** URL of the same-origin frame. Address and asset URLs are query params. */
export function frameSrc(frameUrl, opts, base) {
  const u = new URL(frameUrl || FRAME_PATH, base || "http://localhost/");
  const address = opts && opts.address;
  const bridgeUrl = opts && opts.bridgeUrl;
  if (address) u.searchParams.set("address", address);
  if (bridgeUrl) u.searchParams.set("bridge", bridgeUrl);
  const assets = (opts && opts.assets) || {};
  for (const key of ASSET_KEYS) {
    if (assets[key]) u.searchParams.set(key, assets[key]);
  }
  return u.href;
}

/** HTML for the panel document. Scripts are the host's asset URLs, made absolute by the caller. */
export function panelHtml({ address, bridgeUrl, assets }) {
  const a = assets || {};
  const scripts = [a.react, a.reactDom, a.qrcode, a.peerWebrtc, a.chatComponents, a.beagleWeb]
    .filter(Boolean)
    .map((src) => `<script src=${jsString(src)}><\/script>`)
    .join("\n");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body,#root{margin:0;height:100%;background:#0b0b0f}</style>
</head>
<body>
<div id="root"></div>
${seedSiteKeyScript()}
<script>
globalThis.__BEAGLE_BRIDGE__ = ${jsString(bridgeUrl || "")};
var address = ${jsString(address || "")};
<\/script>
${scripts}
<script type="module">
import { mount, setUiHost } from ${jsString(a.beagleUi)};
setUiHost({
  hostNeedsWelcome: true,
  hostPrefersRtcFile: true,
  hostHasKeyBackup: true,
  hostAssistant: false,
  hostEnsWrite: false,
  fileUrl: (name) => "/api/file-download?name=" + encodeURIComponent(name),
  fileDownloadUrl: (name) => "/api/file-download?name=" + encodeURIComponent(name) + "&dl=1",
});
mount(document.getElementById("root"));
<\/script>
</body>
</html>`;
}

function readSiteKey() {
  try { return localStorage.getItem(SITE_KEY); }
  catch { return null; }
}

async function probeInstalled() {
  for (const origin of LOCAL) {
    try {
      const r = await fetch(origin + "/api/state", { signal: AbortSignal.timeout(400) });
      if (r.ok) return origin;
    } catch { /* not this one */ }
  }
  return null;
}

function absUrl(url) {
  return new URL(url, location.href).href;
}

function mountFrame(el, src) {
  const frame = document.createElement("iframe");
  frame.title = "Beagle";
  frame.style.cssText = "border:0;width:100%;height:100%;display:block;background:#0b0b0f";
  frame.src = src;
  el.replaceChildren(frame);
  return frame;
}

function renderWebLink(el, openUrl, labels) {
  const L = labels || {};
  const wrap = document.createElement("div");
  wrap.style.cssText = "height:100%;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:24px;background:#0b0b0f;color:#f4f4f5;font:14px/1.45 ui-sans-serif,system-ui,sans-serif";
  const p = document.createElement("p");
  p.style.cssText = "margin:0";
  p.textContent = L.webClient || "This Beagle keeps its key in its own tab, so this panel cannot use it.";
  const a = document.createElement("a");
  a.href = openUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = L.openWeb || "Open in a new tab";
  a.style.cssText = "align-self:flex-start;padding:8px 12px;border:1px solid rgba(255,255,255,.25);border-radius:8px;color:#f4f4f5;text-decoration:none";
  wrap.append(p, a);
  el.replaceChildren(wrap);
}

function rememberProfile(profile) {
  try {
    if (profile && String(profile.name || "").trim()) sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else sessionStorage.removeItem(PROFILE_KEY);
  } catch { /* the frame still boots; the name can be set inside it */ }
}

/**
 * Open a chat panel inside `el`.
 *
 * `clientOrigin` is the Beagle the visitor signed in with.
 *   Loopback (this computer, port 8766): that client is shown in the frame.
 *   Its key stays in the client. A public origin such as https://app.beagle.chat
 *   is not framed — the browser would mint a second key. The panel shows a
 *   link, and the return is { opened: false, reason: "web-client", openUrl }.
 *
 * No clientOrigin: the panel runs as this origin's site key
 * (`beagle-connect:identity`), inside /beagle-frame.html (override with
 * `frameUrl`). The host serves that file; `frameHtml` is its contents.
 * Pass `assets` (the script URLs) and an optional `profile` { name,
 * description, punkId, avatarDataUrl }. The frame writes the profile when
 * the peer has no name yet.
 * No site key, and an installed Beagle answers: the panel does not start.
 * reason is "installed" and openUrl points at that client.
 * No site key and nothing installed: reason is "need-sign-in".
 * mode "in-tab": skip the installed-app check. Still needs the site key.
 *
 * @returns {Promise<{opened:boolean, reason:string, openUrl?:string, installedOrigin?:string|null}>}
 */
export function frameHtml() {
  return FRAME_HTML;
}

export async function openChat(el, opts = {}) {
  const address = opts.address || "";
  const clientOrigin = opts.clientOrigin || "";
  if (isInstalledOrigin(clientOrigin)) {
    const src = new URL(clientOrigin.endsWith("/") ? clientOrigin : clientOrigin + "/");
    if (address) src.searchParams.set("address", address);
    mountFrame(el, src.href);
    return { opened: true, reason: "client", installedOrigin: clientOrigin, openUrl: src.href };
  }
  if (isWebOrigin(clientOrigin)) {
    const openUrl = beagleChatUrl(clientOrigin, address);
    renderWebLink(el, openUrl, opts.labels);
    return { opened: false, reason: "web-client", installedOrigin: null, openUrl };
  }
  const mode = opts.mode === "in-tab" ? "in-tab" : "auto";
  const site = readSiteKey();
  if (!site) {
    const installed = mode === "in-tab" ? null : await probeInstalled();
    return {
      opened: false,
      reason: installed ? "installed" : "need-sign-in",
      installedOrigin: installed,
      openUrl: beagleChatUrl(installed || opts.beagleOrigin, address),
    };
  }
  const assets = opts.assets || {};
  const resolved = {};
  for (const key of ASSET_KEYS) {
    if (assets[key]) resolved[key] = absUrl(assets[key]);
  }
  rememberProfile(opts.profile);
  const src = frameSrc(opts.frameUrl || FRAME_PATH, { address, bridgeUrl: opts.bridgeUrl, assets: resolved }, location.href);
  mountFrame(el, src);
  return {
    opened: true,
    reason: "site",
    installedOrigin: null,
    openUrl: beagleChatUrl(opts.beagleOrigin, address),
  };
}
