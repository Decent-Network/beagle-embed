// A chat panel for a host page.
//
// The conversation view is @decentnetwork/beagle-ui (mount). The in-tab peer
// is the beagle-web browser bundle (it patches fetch for /api and takes the
// Web Lock "beagle-peer"). Neither is copied into this package. Both load
// only when the panel opens, and only inside an iframe so the host page
// stays put. beagle-ui's mount() pins itself to the viewport; the iframe is
// what makes that a panel. The frame is about:blank, which keeps the host
// origin, so the Web Lock and the site key are shared across tabs. A srcdoc
// frame is a null origin, and each panel would start its own peer.
//
// beagle-web is not on npm yet and has no export map. Pass the URL of its
// built beagle-web.js (and the vendor scripts it expects) in `assets`.
// The gap is written up in the README.

export const VERSION = "0.1.0";

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
<script>
globalThis.__BEAGLE_BRIDGE__ = ${jsString(bridgeUrl || "")};
var address = ${jsString(address || "")};
if (address) location.hash = "#?address=" + encodeURIComponent(address);
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

/**
 * Open a chat panel inside `el`.
 *
 * mode "auto" (default): if an installed Beagle answers on this machine and
 * this origin has no site-made key, the panel does not start. The installed
 * key cannot be copied into the page. The return value carries openUrl.
 * mode "in-tab": always open the panel (a different key from the installed app).
 *
 * @returns {Promise<{opened:boolean, reason:string, openUrl?:string, installedOrigin?:string|null}>}
 */
export async function openChat(el, opts = {}) {
  const address = opts.address || "";
  const mode = opts.mode === "in-tab" ? "in-tab" : "auto";
  const installed = mode === "in-tab" ? null : await probeInstalled();
  const site = readSiteKey();
  if (installed && !site) {
    return {
      opened: false,
      reason: "installed",
      installedOrigin: installed,
      openUrl: beagleChatUrl(installed, address),
    };
  }
  const assets = opts.assets || {};
  const resolved = {};
  for (const key of ["react", "reactDom", "qrcode", "peerWebrtc", "chatComponents", "beagleWeb", "beagleUi"]) {
    if (assets[key]) resolved[key] = absUrl(assets[key]);
  }
  const frame = document.createElement("iframe");
  frame.title = "Beagle";
  frame.style.cssText = "border:0;width:100%;height:100%;display:block;background:#0b0b0f";
  el.replaceChildren(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(panelHtml({ address, bridgeUrl: opts.bridgeUrl, assets: resolved }));
  doc.close();
  return {
    opened: true,
    reason: site ? "site" : "new",
    installedOrigin: null,
    openUrl: beagleChatUrl(opts.beagleOrigin, address),
  };
}
