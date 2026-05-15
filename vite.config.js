import { defineConfig } from "vite";
import { Readable } from "stream";

function gameDownloadPlugin() {
  return {
    name: "game-download-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith("/proxy-game-download")) {
          return next();
        }

        const targetUrl =
          "https://archive.org/download/gta-vicecity-wasm-assets/game.tar.gz";

        console.log("[game-proxy] starting fetch:", targetUrl);

        try {
          const upstream = await fetch(targetUrl, {
            redirect: "follow",
            headers: { "User-Agent": "Mozilla/5.0" },
          });

          console.log("[game-proxy] got response:", upstream.status, upstream.headers.get("content-length"));

          if (!upstream.ok) {
            res.statusCode = upstream.status;
            res.end(`Upstream error: ${upstream.status}`);
            return;
          }

          res.statusCode = 200;
          res.setHeader(
            "content-type",
            upstream.headers.get("content-type") || "application/octet-stream",
          );
          res.setHeader("access-control-allow-origin", "*");
          res.setHeader("cross-origin-resource-policy", "cross-origin");
          const contentLength = upstream.headers.get("content-length");
          if (contentLength) {
            res.setHeader("content-length", contentLength);
            console.log("[game-proxy] streaming", contentLength, "bytes");
          }

          res.flushHeaders();

          const nodeStream = Readable.fromWeb(upstream.body);
          nodeStream.pipe(res);
          nodeStream.on("error", (err) => {
            console.error("[game-proxy] stream error:", err.message);
          });
          res.on("close", () => {
            nodeStream.destroy();
          });

        } catch (err) {
          console.error("[game-proxy] error:", err.message);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.end(`Proxy error: ${err.message}`);
          }
        }
      });
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [gameDownloadPlugin()],
  define: {
    __IS_VERCEL__: JSON.stringify(!!process.env.VERCEL),
  },
  server: {
    host: true,
    port: 5000,
    allowedHosts: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
