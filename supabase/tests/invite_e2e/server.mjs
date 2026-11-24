// Sert le front compilé et fait suivre /rest/v1 vers PostgREST.
// Un seul point d'entrée : le front appelle son API sur sa propre origine, comme derrière
// le domaine Supabase, sans configuration CORS.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.STATIC_DIR ?? "/tmp/qspicy-invite-dist";
const PORT = Number(process.env.PORT ?? 5299);
const PGRST = `http://127.0.0.1:${process.env.PGRST_PORT ?? 3199}`;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml",
  ".json": "application/json", ".ico": "image/x-icon", ".woff2": "font/woff2"
};

http.createServer(async (req, res) => {
  // La fonction Edge de partage de photos n'existe pas sur la base de test : on répond
  // une galerie vide. Un 200 non-JSON ferait planter l'écran d'attente côté client.
  if (req.url.startsWith("/functions/v1/qspicy-room-media")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ my_receive_media: true, players: [], items: [] }));
    return;
  }

  if (req.url.startsWith("/rest/v1/")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    try {
      const upstream = await fetch(PGRST + req.url.slice("/rest/v1".length), {
        method: req.method,
        headers: { ...req.headers, host: new URL(PGRST).host },
        body: ["GET", "HEAD"].includes(req.method) ? undefined : body
      });
      res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" });
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ message: String(error) }));
    }
    return;
  }

  const url = new URL(req.url, "http://localhost");
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(ROOT, "index.html");
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, "127.0.0.1", () => console.log(`front de test sur ${PORT}`));
