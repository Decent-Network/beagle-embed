# Session memory (read me)

Last updated: 2026-11-18

## Current pins
- Package `@decentnetwork/beagle-embed` 0.2.1 is published as `latest` (registry may take a minute to list it). Adds `signInChoice` (one web sign-in unless this page can see port 8766), `localBeagle`, and `beagleMarkSvg`. 0.2.0 remains the previous version.
- Example at `http://127.0.0.1:8787/example/index.html`. Header is **Sign in with Beagle**, then This computer or app.beagle.chat. Signed-in name and userid stay in that header. The chat column starts under the header (`top: var(--header-h)`), 380px, and the article uses the width beside it. Signed out, Chat uses this origin's `beagle-connect:identity`.
- After **Open in this page**, measured 1,801,858 bytes (beagle-web.js 1,099,190, beagle-ui 0.2.40 429,984, plus the five vendor scripts). Nothing in that set loads before the click.
- `openChat` does not start an empty peer. A `beagle-connect:identity` on this origin is copied into `beagle-web:kv:identity` before the bundle boots, so the panel has that userid and carrier address. No site key and port 8766 is up: `{ opened: false, reason: "installed" }`. No site key and nothing on 8766: `{ reason: "need-sign-in" }`. Not published; npm 0.1.0 still opens an empty peer.
- The in-tab panel is a same-origin `/beagle-frame.html`, so the Web Lock `beagle-peer` is shared with the host origin. A srcdoc frame is a null origin and was rejected for that reason. about:blank was dropped: Safari's back button left the host page.
- Upstream, not done here: publish `@decentnetwork/beagle-web` with a non-booting export that skips `/sw.js` unless asked. beagle-ui `mount(el)` is still `position: fixed; inset: 0` and reads the thread from the location. Do not fork either.

## Do / Don’t
- Do load beagle-ui from npm and beagle-web from the host's URLs.
- Do not put a host product's name, agent list, or copy into this package.
- Do not change `mount()` in beagle-ui from this repo.
- Sign-out clears the host session only. Do not delete the userid, name, avatar, or description, and do not call `forgetSiteIdentity()`. Those stay in the browser. See README “Sign-out does not delete the user”.

## Open follow-ups
- A chat message was not delivered. Add, before a display name, is refused by the view. Delivery needs a name, a bridge, and a friend online.
- Wiring a host's own panel to this package is that host's change. 0.2.0 is on npm; this checkout's 0.2.0 files are still uncommitted.
