import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const appRoot = fileURLToPath(new URL("./", import.meta.url));
const port = Number(process.env.PORT ?? 0);

if (!Number.isInteger(port) || port < 0 || port > 65_535) {
  throw new Error("PORT must be an integer between 0 and 65535");
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function resolveRequestPath(requestTarget) {
  const rawPath = requestTarget.split(/[?#]/, 1)[0];
  if (!rawPath.startsWith("/")) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.resolve(appRoot, `.${requestedPath}`);
  const relativePath = path.relative(appRoot, filePath);
  if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    return null;
  }
  return filePath;
}

function notFound(response) {
  response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  response.end("Not found\n");
}

const server = http.createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    notFound(response);
    return;
  }

  const filePath = resolveRequestPath(request.url ?? "/");
  if (filePath === null) {
    notFound(response);
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      notFound(response);
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-length": body.byteLength,
      "content-type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      "x-content-type-options": "nosniff"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    notFound(response);
  }
});

server.listen(port, host, () => {
  const address = server.address();
  process.stdout.write(`${JSON.stringify({ url: `http://${host}:${address.port}/` })}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
