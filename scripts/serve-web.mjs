import { createReadStream, existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "web-superloopy", "dist");
const port = Number(process.env.PORT || 4179);

const mime = {
  ".css": "text/css; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ktx2": "image/ktx2",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2"
};

function safePath(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  return join(root, clean === "/" ? "index.html" : clean);
}

createServer((request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    let pathname = url.pathname;

    if (pathname === "/_next/image") {
      const original = url.searchParams.get("url") || "";
      pathname = `/uploads/${original.split("/").pop()}`;
    }

    let filePath = safePath(pathname);
    try {
      if (statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
    } catch {
      if (!extname(pathname)) filePath = join(root, "index.html");
    }

    if (!existsSync(filePath)) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end(`Not found: ${pathname}`);
      return;
    }

    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "content-type": mime[extname(filePath)] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(String(error.stack || error));
  }
}).listen(port, async () => {
  await readFile(join(root, "index.html"), "utf8");
  console.log(`Superloopy web preview running at http://127.0.0.1:${port}/`);
});
