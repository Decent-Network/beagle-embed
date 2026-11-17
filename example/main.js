import { openChat, beagleChatUrl } from "../src/open.js";

const addressEl = document.querySelector("#address");
const bridgeEl = document.querySelector("#bridge");
const note = document.querySelector("#note");
const dock = document.querySelector("#dock");
const full = document.querySelector("#full");

const assets = {
  react: "/vendor/react.production.min.js",
  reactDom: "/vendor/react-dom.production.min.js",
  qrcode: "/vendor/qrcode.js",
  peerWebrtc: "/vendor/peer-webrtc.js",
  chatComponents: "/vendor/chat-components.js",
  beagleWeb: "/beagle-web.js",
  beagleUi: "/vendor/beagle-ui.js",
};

function syncLink() {
  full.href = beagleChatUrl("https://app.beagle.chat", addressEl.value.trim());
}
addressEl.addEventListener("input", syncLink);
syncLink();

async function go(mode) {
  note.textContent = "";
  dock.hidden = false;
  const result = await openChat(dock, {
    mode,
    address: addressEl.value.trim(),
    bridgeUrl: bridgeEl.value.trim(),
    assets,
  });
  if (!result.opened && result.reason === "installed") {
    dock.hidden = true;
    note.textContent = "This computer has Beagle installed. The key stays there.";
    full.href = result.openUrl;
  }
}

document.querySelector("#open").addEventListener("click", () => go("auto"));
document.querySelector("#force").addEventListener("click", () => go("in-tab"));
