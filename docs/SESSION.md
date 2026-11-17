# Session memory (read me)

Last updated: 2026-11-17

## Current pins
- Package `@decentnetwork/beagle-embed` 0.1.0. Public repo `Decent-Network/beagle-embed`. npm `latest` once publish succeeds.
- Example: `example/index.html`. Serve with `BEAGLE_WEB_PUBLIC` pointing at a beagle-web `public/` directory. Do not copy those files into this repo.
- After **Open in this page**, measured 1,801,858 bytes (beagle-web.js 1,099,190, beagle-ui 0.2.40 429,984, plus the five vendor scripts). Nothing in that set loads before the click.
- `openChat(el, { mode: "auto" })` returns `{ opened: false, reason: "installed" }` when `127.0.0.1:8766` answers and this origin has no `beagle-connect:identity`. The full client link is `?address=`.
- The panel is an `about:blank` frame written with `document.write`, so it keeps the host origin and the Web Lock `beagle-peer` is shared. A srcdoc frame is a null origin and was rejected for that reason.
- Upstream, not done here: publish `@decentnetwork/beagle-web` with a non-booting export that skips `/sw.js` unless asked. beagle-ui `mount(el)` is still `position: fixed; inset: 0` and reads the thread from the location. Do not fork either.

## Do / Don’t
- Do load beagle-ui from npm and beagle-web from the host's URLs.
- Do not put a host product's name, agent list, or copy into this package.
- Do not change `mount()` in beagle-ui from this repo.

## Open follow-ups
- A chat message was not delivered. Add, before a display name, is refused by the view. Delivery needs a name, a bridge, and a friend online.
- Wiring a host's own panel to this package is that host's change, after this version is on npm.
