// Static server for the example. Heavy files are read from the installed
// beagle-ui package and from a beagle-web build directory. Nothing is copied.
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webPublic = process.env.BEAGLE_WEB_PUBLIC
  || join(process.env.HOME, "blockchain/eth/beagle-web/public");
const uiFile = join(root, "node_modules/@decentnetwork/beagle-ui/dist/beagle-ui.js");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

function send(res, file) {
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404); res.end("not found"); return;
  }
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] || "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(file).pipe(res);
}

function route(url) {
  const path = decodeURIComponent(url.split("?")[0]);
  if (path === "/" || path === "/example" || path === "/example/") return join(root, "example/index.html");
  if (path === "/vendor/beagle-ui.js") return uiFile;
  if (path === "/beagle-web.js" || path === "/sw.js" || path.startsWith("/vendor/")) {
    const rel = path.replace(/^\//, "");
    return join(webPublic, rel);
  }
  if (path.startsWith("/example/") || path.startsWith("/src/")) {
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) return null;
    return file;
  }
  return null;
}

export function start(port = 0) {
  if (!existsSync(uiFile)) throw new Error("missing " + uiFile + " — run npm install");
  if (!existsSync(join(webPublic, "beagle-web.js"))) {
    throw new Error("missing beagle-web.js in " + webPublic + " — set BEAGLE_WEB_PUBLIC");
  }
  const server = createServer((req, res) => send(res, route(req.url || "/")));
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}/example/index.html` });
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787);
  start(port).then(({ url }) => console.log(url));
}
