import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beagleChatUrl, panelHtml, frameHtml, frameSrc, isInstalledOrigin, isWebOrigin, signInChoice, beagleMarkSvg, signInChoiceHtml } from "../src/open.js";

test("the full client opens on ?address=", () => {
  const url = beagleChatUrl("https://app.beagle.chat", "EFLMYdZsJVh9hYzstT488HTwPE4Lk4RwptokJ6fwR8J7ERk3rpCM");
  assert.equal(url, "https://app.beagle.chat/?address=EFLMYdZsJVh9hYzstT488HTwPE4Lk4RwptokJ6fwR8J7ERk3rpCM");
});

test("the panel document names the dependency scripts and the address", () => {
  const html = panelHtml({
    address: "Sw1d4dJQVyxC1VY1RyqcBg5oc8z7HgGT4r4qMpWBXDozt8BaEJ3s",
    bridgeUrl: "wss://bridge.example/ws",
    assets: {
      react: "http://localhost/vendor/react.production.min.js",
      beagleWeb: "http://localhost/beagle-web.js",
      beagleUi: "http://localhost/vendor/beagle-ui.js",
    },
  });
  assert.match(html, /beagle-web\.js/);
  assert.match(html, /beagle-ui\.js/);
  assert.match(html, /Sw1d4dJQVyxC1VY1RyqcBg5oc8z7HgGT4r4qMpWBXDozt8BaEJ3s/);
  assert.match(html, /wss:\/\/bridge\.example\/ws/);
  assert.match(html, /beagle-connect:identity/);
  assert.match(html, /beagle-web:kv:identity/);
  assert.doesNotMatch(html, /interview/i);
});

test("this computer is framed and a public Beagle is not", () => {
  assert.equal(isInstalledOrigin("http://127.0.0.1:8766"), true);
  assert.equal(isInstalledOrigin("http://localhost:8766"), true);
  assert.equal(isWebOrigin("https://app.beagle.chat"), true);
  assert.equal(isWebOrigin("http://127.0.0.1:8766"), false);
});

test("the frame URL carries the address and the scripts", () => {
  const url = frameSrc("/beagle-frame.html", {
    address: "Sw1d4dJQVyxC1VY1RyqcBg5oc8z7HgGT4r4qMpWBXDozt8BaEJ3s",
    bridgeUrl: "wss://bridge.example/ws",
    assets: { beagleUi: "/api/beagle-ui", beagleWeb: "https://app.beagle.chat/beagle-web.js" },
  }, "http://localhost:3000/");
  const u = new URL(url);
  assert.equal(u.pathname, "/beagle-frame.html");
  assert.equal(u.searchParams.get("address"), "Sw1d4dJQVyxC1VY1RyqcBg5oc8z7HgGT4r4qMpWBXDozt8BaEJ3s");
  assert.equal(u.searchParams.get("bridge"), "wss://bridge.example/ws");
  assert.equal(u.searchParams.get("beagleUi"), "/api/beagle-ui");
});

test("the served frame matches the export and does not set the hash", () => {
  const html = frameHtml();
  assert.equal(readFileSync(new URL("../frame/beagle-frame.html", import.meta.url), "utf8"), html);
  assert.match(html, /beagle-web:backend/);
  assert.match(html, /beagle-connect:identity/);
  assert.doesNotMatch(html, /location\.hash/);
  assert.doesNotMatch(html, /interview/i);
});

test("the sign-in choice is a popup page, not two buttons on the host", () => {
  const html = signInChoiceHtml({ title: "Sign in", localLabel: "This computer", webLabel: "app.beagle.chat" });
  assert.match(html, /beagle-embed:pick/);
  assert.match(html, /This computer/);
  assert.match(html, /app\.beagle\.chat/);
  assert.match(beagleMarkSvg(), /m4\.5 17/);
  assert.equal(signInChoice({ pageLoopback: true, localUp: true }), "choose");
  assert.equal(signInChoice({ pageLoopback: true, localUp: false }), "web");
  assert.equal(signInChoice({ pageLoopback: false, localUp: true }), "web");
});

test("the package source does not name a host product", () => {
  const files = ["src/open.js", "src/frame.js", "src/account.js", "example/index.html", "example/main.js", "README.md", "package.json"];
  for (const f of files) {
    const text = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.doesNotMatch(text, /interview/i, f);
  }
});
