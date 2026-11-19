import { openChat, isInstalledOrigin } from "../src/open.js";

const LOCAL = ["http://127.0.0.1:8766", "http://localhost:8766"];
const WEB = "https://app.beagle.chat";
const SESSION = "beagle-embed:demo-session";
const ACCEPT = new Set([...LOCAL, WEB]);
const ASSETS = {
  react: "/vendor/react.production.min.js",
  reactDom: "/vendor/react-dom.production.min.js",
  qrcode: "/vendor/qrcode.js",
  peerWebrtc: "/vendor/peer-webrtc.js",
  chatComponents: "/vendor/chat-components.js",
  beagleWeb: "/beagle-web.js",
  beagleUi: "/vendor/beagle-ui.js",
};

const addressEl = document.querySelector("#address");
const note = document.querySelector("#note");
const dock = document.querySelector("#dock");
const dockBody = document.querySelector("#dock-body");
const dockTitle = document.querySelector("#dock-title");

async function localClient() {
  for (const origin of LOCAL) {
    try {
      const r = await fetch(origin + "/api/state", { signal: AbortSignal.timeout(800) });
      if (r.ok) return { origin, data: await r.json() };
    } catch { /* next */ }
  }
  return null;
}

function threadAddress(raw, friends) {
  const q = raw.trim();
  if (!q) return "";
  const hit = (friends || []).find((f) => f.address === q || f.name === q || f.carrierId === q || f.pubkey === q);
  return hit && hit.address ? hit.address : q;
}

function showDock() {
  dock.hidden = false;
  document.body.classList.add("chat-open");
}

function closeChat() {
  dock.hidden = true;
  dockBody.replaceChildren();
  document.body.classList.remove("chat-open");
}

function ensureSiteKey() {
  const KEY = "beagle-connect:identity";
  try {
    const held = localStorage.getItem(KEY);
    if (held) return JSON.parse(held);
  } catch { /* make a new one */ }
  const nacl = globalThis.nacl;
  if (!nacl || !nacl.box) throw new Error("could not make a key");
  const pair = nacl.box.keyPair();
  const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const file = {
    format: "decent-peer-tox-keypair-v1",
    publicKey: hex(pair.publicKey),
    secretKey: hex(pair.secretKey),
  };
  localStorage.setItem(KEY, JSON.stringify(file));
  return file;
}

function loadSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION) || "null");
    if (!s || !s.userid || !ACCEPT.has(s.origin)) return null;
    return s;
  } catch { return null; }
}

function saveSession(s) {
  if (s) sessionStorage.setItem(SESSION, JSON.stringify(s));
  else sessionStorage.removeItem(SESSION);
}

function renderSession() {
  const s = loadSession();
  const who = document.querySelector("#who");
  const out = document.querySelector("#sign-out");
  const label = document.querySelector("#sign-label");
  const localBtn = document.querySelector("#sign-local");
  const webBtn = document.querySelector("#sign-web");
  if (!s) {
    who.hidden = true;
    who.replaceChildren();
    out.hidden = true;
    label.hidden = false;
    localBtn.hidden = false;
    webBtn.hidden = false;
    return;
  }
  label.hidden = true;
  localBtn.hidden = true;
  webBtn.hidden = true;
  who.hidden = false;
  who.replaceChildren();
  who.append(document.createTextNode((s.name || "signed in") + " "));
  const id = document.createElement("span");
  id.textContent = s.userid.slice(0, 10) + "…";
  id.title = s.userid;
  who.append(id);
  out.hidden = false;
}

function signIn(which) {
  const popup = window.open("about:blank", "decent-auth", "width=420,height=520");
  if (!popup) { note.textContent = "Pop-up blocked. Allow pop-ups for this page."; return; }
  const go = (origin) => {
    if (!origin) {
      try { popup.close(); } catch { /* already gone */ }
      note.textContent = "Nothing is answering on port 8766.";
      return;
    }
    const nonce = crypto.randomUUID();
    let settled = false;
    const finish = (text) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      if (text) note.textContent = text;
    };
    const timer = setTimeout(() => finish("No answer from the sign-in window."), 20000);
    function onMessage(e) {
      if (e.origin !== origin) return;
      const d = e.data;
      if (!d || d.type !== "decent-auth" || d.nonce !== nonce) return;
      if (d.error || !d.userid) { finish(d.error === "denied" ? "Sign-in cancelled." : "Sign-in did not return a userid."); return; }
      saveSession({ origin, userid: d.userid, name: d.name || "" });
      renderSession();
      finish("");
      note.textContent = `Signed in as ${d.name || d.userid}.`;
      if (!dock.hidden) openPanel();
    }
    window.addEventListener("message", onMessage);
    popup.location.href = origin + "/connect?origin=" + encodeURIComponent(location.origin)
      + "&nonce=" + encodeURIComponent(nonce);
  };
  if (which === "web") { go(WEB); return; }
  localClient().then((found) => go(found && found.origin)).catch(() => go(null));
}

async function openPanel() {
  const s = loadSession();
  const typed = addressEl.value.trim();
  const name = document.querySelector("#name").value.trim();
  showDock();
  if (s) {
    let address = typed;
    if (typed && isInstalledOrigin(s.origin)) {
      const found = await localClient();
      if (found) address = threadAddress(typed, found.data.friends);
    }
    dockTitle.textContent = s.name || "Chat";
    const result = await openChat(dockBody, { address, clientOrigin: s.origin });
    const who = s.name || (s.userid.slice(0, 10) + "…");
    note.textContent = result.reason === "web-client"
      ? `Chat as ${who}. That account opens in its own tab.`
      : `Chat as ${who}.`;
    return;
  }
  let file;
  try { file = ensureSiteKey(); }
  catch (e) {
    closeChat();
    note.textContent = e && e.message ? e.message : "could not make a key";
    return;
  }
  dockTitle.textContent = name || "This page";
  const result = await openChat(dockBody, {
    address: typed,
    bridgeUrl: "wss://bridge.beagle.chat/relay-ws,wss://im.beagle.chat/relay-ws",
    frameUrl: "/beagle-frame.html",
    assets: ASSETS,
    profile: name ? { name } : null,
    mode: "in-tab",
  });
  if (!result.opened) {
    closeChat();
    note.textContent = "This page's key could not open.";
    return;
  }
  note.textContent = `Chat as this page's key${file.publicKey ? ` (${file.publicKey.slice(0, 8)}…)` : ""}. Sign in to use another account.`;
}

function signOut() {
  saveSession(null);
  renderSession();
  note.textContent = "Signed out. The column is this page's key.";
  openPanel();
}

document.querySelector("#sign-local").addEventListener("click", () => signIn("local"));
document.querySelector("#sign-web").addEventListener("click", () => signIn("web"));
document.querySelector("#sign-out").addEventListener("click", signOut);
document.querySelector("#chat").addEventListener("click", () => openPanel());
document.querySelector("#close-chat").addEventListener("click", closeChat);
renderSession();
