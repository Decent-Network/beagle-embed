// Sign-in choice and the visible launcher mark. A host page still verifies
// the signature. This module only decides which Beagle to open, and draws
// the mark other sites would otherwise redraw.

export const WEB_CLIENT = "https://app.beagle.chat";

const LOCAL = ["http://127.0.0.1:8766", "http://localhost:8766"];

/** "choose" when this page can see a Beagle on port 8766. Otherwise "web":
 *  open app.beagle.chat and do not offer a second button. */
export function signInChoice({ pageLoopback, localUp }) {
  if (pageLoopback && localUp) return "choose";
  return "web";
}

export function pageIsLoopback() {
  try {
    const h = location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  } catch { return false; }
}

/** The Beagle on this computer, or null. A public page should not call this:
 *  the browser asks permission before it will touch loopback. */
export async function localBeagle() {
  for (const origin of LOCAL) {
    try {
      const r = await fetch(origin + "/api/state", { signal: AbortSignal.timeout(800) });
      if (r.ok) return origin;
    } catch { /* next */ }
  }
  return null;
}

/** Small page for the sign-in popup: this computer, or the web client.
 *  A click posts `{ type: "beagle-embed:pick", which }` to the opener. */
export function signInChoiceHtml(labels) {
  const L = {
    title: (labels && labels.title) || "Sign in with Beagle",
    local: (labels && labels.localLabel) || "This computer",
    web: (labels && labels.webLabel) || "app.beagle.chat",
  };
  const packed = JSON.stringify(L).replace(/</g, "\\u003c");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${L.title.replace(/[<>&]/g, "")}</title>
<style>
  body { margin: 0; padding: 28px; background: #0b0b0f; color: #f4f4f5; font: 15px/1.4 ui-sans-serif, system-ui, sans-serif; }
  p { margin: 0 0 16px; }
  button { display: block; width: 100%; margin: 8px 0; padding: 12px 14px; border-radius: 10px; border: 1px solid #3f3f46; background: #18181b; color: #fff; font: inherit; text-align: left; cursor: pointer; }
  button:hover { border-color: #a78bfa; }
</style></head><body>
<p id="t"></p>
<button type="button" id="local"></button>
<button type="button" id="web"></button>
<script>
var L = ${packed};
document.getElementById("t").textContent = L.title;
document.getElementById("local").textContent = L.local;
document.getElementById("web").textContent = L.web;
function pick(which) { if (window.opener) window.opener.postMessage({ type: "beagle-embed:pick", which: which }, "*"); }
document.getElementById("local").onclick = function () { pick("local"); };
document.getElementById("web").onclick = function () { pick("web"); };
</script>
</body></html>`;
}

/** Draw the choice in a popup opened on the click. Resolves "local", "web", or "closed". */
export function showSignInChoice(win, labels) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (which) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMessage);
      clearInterval(timer);
      resolve(which);
    };
    function onMessage(e) {
      if (!win || e.source !== win) return;
      const d = e.data;
      if (!d || d.type !== "beagle-embed:pick") return;
      finish(d.which === "web" ? "web" : "local");
    }
    const timer = setInterval(() => { if (!win || win.closed) finish("closed"); }, 300);
    window.addEventListener("message", onMessage);
    try {
      win.document.open();
      win.document.write(signInChoiceHtml(labels));
      win.document.close();
    } catch { finish("closed"); }
  });
}
export function beagleMarkSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 17 6-6-6-6"/><path d="M12 18.5h7.5"/></svg>`;
}
