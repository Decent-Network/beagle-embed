# @decentnetwork/beagle-embed

A chat panel a host page opens when a visitor asks for it. The page stays as it is.

This is a new package because the two existing ones are each the whole page. `@decentnetwork/beagle-ui`'s `mount(el)` draws the app over the viewport, and the beagle-web bundle boots itself as the page. Loading either one in the host document would replace the host. This package loads both, and only after the click, inside a frame the size of the element the host already has. It does not contain a copy of either, and it does not change `mount()`, so a host that already calls `mount()` for the full app behaves as before.

## Install

```bash
npm install @decentnetwork/beagle-embed
```

`@decentnetwork/beagle-ui` (0.2.40) is a dependency. `@decentnetwork/beagle-web` is not on npm: the name 404s, and the local package is private with no `exports`. A dependency that does not exist would make `npm install` fail, so the peer is passed in as URLs:

| `assets` field | file |
|---|---|
| `react` | `vendor/react.production.min.js` |
| `reactDom` | `vendor/react-dom.production.min.js` |
| `qrcode` | `vendor/qrcode.js` |
| `peerWebrtc` | `vendor/peer-webrtc.js` |
| `chatComponents` | `vendor/chat-components.js` |
| `beagleWeb` | `beagle-web.js` |
| `beagleUi` | `node_modules/@decentnetwork/beagle-ui/dist/beagle-ui.js` |

What still has to change upstream, before a host can import the peer instead of pointing at files:

- Publish `@decentnetwork/beagle-web` with an export a page can call, for example `startInTabPeer({ bridgeUrl })`. The current bundle is an IIFE. Evaluating it patches `fetch`, registers `/sw.js` on that origin, and boots. The export should take the Web Lock `beagle-peer` and should not register a service worker unless the host asks.
- `mount(el)` in beagle-ui lays the app out with `position: fixed; inset: 0`, so the element is ignored for layout, and the open thread is read from `location.search` or `location.hash` (`?address=`). A `mount(el, { contain: true, address })` that fills `el` would let a host skip the frame. This package sets the frame's hash to `#?address=` and lets the existing parser select the thread.

## Open the panel

```js
import { openChat, beagleChatUrl } from "@decentnetwork/beagle-embed";

const el = document.querySelector("#dock");
const result = await openChat(el, {
  address,                       // carrier address; selects that friend
  bridgeUrl: "wss://your-bridge/ws", // optional; ciphertext only
  assets,                        // the table above
});
if (!result.opened && result.reason === "installed") {
  // The key is in the installed app. It is not copied into the page.
  window.open(result.openUrl, "beagle-app");
}
```

`mode: "auto"` (the default) checks `http://127.0.0.1:8766` and `http://localhost:8766`. A key stored on this origin (`localStorage` key `beagle-connect:identity`) is copied into the store the in-tab peer reads, and the panel runs as that identity. The installed app's key stays in the app. With no site key, the panel does not start an empty peer: `reason` is `"installed"` when port 8766 answers, and `"need-sign-in"` otherwise. `mode: "in-tab"` skips the 8766 check and still requires the site key.

One key, one live peer. The beagle-web bundle takes the Web Lock `beagle-peer`. A second panel is read-only (`held: false`, "held by another tab").

The same thread in the full client is `beagleChatUrl(origin, address)`, which sets `?address=`. Use the window name `beagle-app` so a second click lands on the same window.

## Which Beagle

Pass `clientOrigin` when the visitor has signed in.

- `http://127.0.0.1:8766` (this computer): the panel is that client. The key stays there. Return `{ opened: true, reason: "client" }`.
- `https://app.beagle.chat`, or any other public origin: the panel is not a frame. The browser would start a second key. The panel shows a link, and the return is `{ opened: false, reason: "web-client", openUrl }`. `labels.webClient` and `labels.openWeb` replace the default sentence and link text.

With no `clientOrigin`, the panel is this site's key inside a real page, `/beagle-frame.html`. Serve `frame/beagle-frame.html` at that path (or pass `frameUrl`). `frameHtml()` is the same document. `about:blank` is not used: on Safari the chat's back button would leave the host page. The address is a query parameter, not a hash.

`assets` are the script URLs in the table above. `profile` is `{ name, description, punkId, avatarDataUrl }`. The frame writes that name when the peer does not have one yet, so a friend request is not refused for an empty name. A picture is kept in `sessionStorage`, not in the URL.

Size the host element yourself. The example dock is 380px wide and, under 700px, full screen. beagle-ui treats a frame under 700px as a phone, so the conversation fills the panel.

## Sign-out does not delete the user

The userid, the name, the avatar, and the description belong to the person using the browser. They do not belong to the host site. Sign-out clears only the host's record that this browser is signed in.

Do not delete these when the visitor signs out:

- `localStorage` `beagle-connect:identity` — the key. That key is the userid.
- `localStorage` `beagle-connect:name`
- `localStorage` `beagle-web:kv:identity`, and the profile the frame stored (name, description, avatar)
- `sessionStorage` `beagle-embed:profile` for as long as the tab is open

`forgetSiteIdentity()` from `@decentnetwork/beagle-connect` removes the key and the name. A sign-out button must not call it. One host did. The name form came back, a new name was saved, and the chat was still the previous userid, so the friend request had already succeeded. Leave the key where it is.

What sign-out may clear is the host's own session: the cookie and, on the server, the revoked session id. After that the visitor can sign in with a different userid. The key already in the browser stays, and the next chat uses that same userid and that same name.

The example's Sign out removes only `sessionStorage` `beagle-embed:demo-session`. It does not remove the page's key.

Nothing here loads on first paint. The panel document is what requests beagle-ui and beagle-web.

## Example

`example/index.html`

```bash
npm install
BEAGLE_WEB_PUBLIC=/path/to/beagle-web/public npm run serve
```

The server reads beagle-web's `public/` directory and the installed beagle-ui build. It does not copy them.

Clicks, checked on 2026-11-17:

1. Load the page. None of the files in the table below are requested.
2. **This computer** or **app.beagle.chat** in the header. The Beagle window approves, and the header shows that name and userid. The column stays closed.
3. **Chat**, the button at the lower right, opens one 380px column as that signed-in account. This computer is framed. app.beagle.chat is a link. With nobody signed in, Chat uses a key this page makes.
4. **Close** hides the column. **Sign out** drops this page's session only. The key, name, avatar, and description stay in the browser. If the column is open, it uses this page's key, which was not deleted.
6. Paste a carrier address. **Open in this page**. The panel opens on that address: the frame hash is `#?address=…`, and the conversation view offers to add that contact. That click loaded **1,801,858** bytes:

| file | bytes |
|---|---|
| beagle-web.js | 1,099,190 |
| beagle-ui.js | 429,984 |
| react-dom.production.min.js | 131,835 |
| peer-webrtc.js | 64,040 |
| qrcode.js | 56,694 |
| react.production.min.js | 10,751 |
| chat-components.js | 9,364 |
| **total** | **1,801,858** |

7. A second tab, same click, does not take the lock. The first tab still holds `beagle-peer`.
8. **Open in Beagle** opens `https://app.beagle.chat/?address=` plus the address, in the window `beagle-app`.

Tapping Add in that panel, before a display name is set, does not send. The view replies that the peer is still starting, and then that a friend request needs a name. This run did not deliver a message: there was no second identity online to accept the request. Set the name under Profile → edit, then Add, once a bridge and a friend are reachable.

`npm run measure` repeats the byte count and the two-tab lock check. `npm test` checks the `?address=` link and that this package does not name a host product.
