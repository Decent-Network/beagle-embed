import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beagleChatUrl, panelHtml } from "../src/open.js";

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
  assert.doesNotMatch(html, /interview/i);
});

test("the package source does not name a host product", () => {
  const files = ["src/open.js", "example/index.html", "example/main.js", "README.md", "package.json"];
  for (const f of files) {
    const text = readFileSync(new URL("../" + f, import.meta.url), "utf8");
    assert.doesNotMatch(text, /interview/i, f);
  }
});
