#!/usr/bin/env node
/**
 * Renderizador de contingência (sem o pacote `remotion` instalado).
 *
 * Empacota src/ com esbuild (aliasing "remotion" -> remotion-shim.tsx), abre o
 * Chromium pré-instalado via Playwright, renderiza frame a frame e monta os
 * MP4 com ffmpeg. Produz exatamente a mesma estrutura de saída que
 * scripts/render-week.sh produz com o Remotion oficial.
 *
 * Uso:
 *   node scripts/fallback/render.mjs --week 1 --out out/semana-1 [--only id]
 *   node scripts/fallback/render.mjs --comp carrossel-a-conta --frame 2 --out slide.png
 *
 * Variáveis de ambiente:
 *   NPM_TOOLS            raiz com node_modules de esbuild/playwright/react
 *                        (padrão /opt/npm-tools)
 *   BROWSER_EXECUTABLE   binário do Chromium (padrão /opt/pw-browsers/chromium-1194/chrome-linux/chrome)
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const NPM_TOOLS = process.env.NPM_TOOLS ?? "/opt/npm-tools";
const BROWSER = process.env.BROWSER_EXECUTABLE ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const req = createRequire(path.join(NPM_TOOLS, "package.json"));
const esbuild = req("esbuild");
const { chromium } = req("playwright");

// ---------- args ----------
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const has = (name) => args.includes(`--${name}`);

const week = Number(opt("week", "1"));
const outDir = path.resolve(ROOT, opt("out", `out/semana-${week}`));
const only = opt("only", null);
const singleComp = opt("comp", null);
const singleFrame = opt("frame", null);
const jpegQuality = Number(opt("quality", "92"));

const posts = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "posts.json"), "utf8"));

// ---------- bundle ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "j40h-"));
const log = (...a) => console.log("[render]", ...a);

log("empacotando com esbuild...");
await esbuild.build({
  entryPoints: [path.join(__dirname, "entry.tsx")],
  bundle: true,
  outfile: path.join(tmp, "bundle.js"),
  format: "iife",
  platform: "browser",
  target: "chrome120",
  jsx: "automatic",
  jsxImportSource: "react",
  nodePaths: [path.join(NPM_TOOLS, "node_modules")],
  alias: { remotion: path.join(__dirname, "remotion-shim.tsx") },
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".json": "json" },
  logLevel: "warning",
});

fs.writeFileSync(
  path.join(tmp, "index.html"),
  `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#000}</style></head><body><script src="/bundle.js"></script></body></html>`,
);

// ---------- servidor estático ----------
const mime = { ".html": "text/html", ".js": "text/javascript", ".ttf": "font/ttf", ".otf": "font/otf", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((rq, rs) => {
  const url = decodeURIComponent(rq.url.split("?")[0]);
  let file;
  if (url === "/" || url === "/index.html") file = path.join(tmp, "index.html");
  else if (url === "/bundle.js") file = path.join(tmp, "bundle.js");
  else if (url.startsWith("/public/")) file = path.join(ROOT, "public", url.slice("/public/".length));
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    rs.writeHead(404);
    rs.end();
    return;
  }
  rs.writeHead(200, { "content-type": mime[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(rs);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// ---------- browser ----------
log("abrindo chromium:", BROWSER);
const browser = await chromium.launch({
  executablePath: BROWSER,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--disable-lcd-text", "--hide-scrollbars"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("[página]", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("[console]", m.text()); });
await page.goto(`${base}/`, { waitUntil: "load" });
const comps = await page.evaluate(() => window.__collect());
log(`${comps.length} composições:`, comps.map((c) => c.id).join(", "));

const settle = async () => {
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < 200; i++) {
    const p = await page.evaluate(() => window.__pending());
    if (p === 0) break;
    await new Promise((r) => setTimeout(r, 25));
  }
};

const renderFrame = async (comp, frame, file, type = "png") => {
  await page.setViewportSize({ width: comp.width, height: comp.height });
  await page.evaluate(([id, f]) => window.__renderFrame(id, f), [comp.id, frame]);
  await settle();
  await page.screenshot({
    path: file,
    type,
    ...(type === "jpeg" ? { quality: jpegQuality } : {}),
    clip: { x: 0, y: 0, width: comp.width, height: comp.height },
  });
};

const ensure = (d) => fs.mkdirSync(d, { recursive: true });
const pad = (n, w = 2) => String(n).padStart(w, "0");

const renderVideo = async (comp, outFile) => {
  const fdir = fs.mkdtempSync(path.join(tmp, `${comp.id}-`));
  const t0 = Date.now();
  for (let f = 0; f < comp.durationInFrames; f++) {
    await renderFrame(comp, f, path.join(fdir, `${pad(f, 5)}.jpg`), "jpeg");
    if (f % 60 === 0) log(`  ${comp.id}: frame ${f}/${comp.durationInFrames}`);
  }
  log(`  ${comp.id}: ${comp.durationInFrames} frames em ${((Date.now() - t0) / 1000).toFixed(1)}s, codificando...`);
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-framerate", String(comp.fps), "-i", path.join(fdir, "%05d.jpg"), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outFile],
    { stdio: "inherit" },
  );
  if (r.status !== 0) throw new Error(`ffmpeg falhou para ${comp.id}`);
  fs.rmSync(fdir, { recursive: true, force: true });
};

const sceneEnds = (post) => {
  const fps = 30;
  let acc = 0;
  return (post.cenas ?? []).map((c) => (acc += Math.round(c.duracao * fps)));
};

try {
  if (singleComp) {
    const comp = comps.find((c) => c.id === singleComp);
    if (!comp) throw new Error(`Composição não encontrada: ${singleComp}`);
    const out = path.resolve(ROOT, opt("out", `${singleComp}.png`));
    ensure(path.dirname(out));
    if (singleFrame !== null) {
      await renderFrame(comp, Number(singleFrame), out, "png");
      log("ok:", out);
    } else {
      await renderVideo(comp, out.endsWith(".mp4") ? out : out.replace(/\.\w+$/, "") + ".mp4");
      log("ok:", out);
    }
  } else {
    const alvo = posts.filter((p) => p.semana === week && (!only || p.id === only));
    for (const post of alvo) {
      const dir = path.join(outDir, post.id);
      ensure(dir);
      const comp = comps.find((c) => c.id === `${post.type}-${post.id}`);
      if (!comp) { console.warn("sem composição para", post.id); continue; }
      log(`${post.dia} · ${post.type} · ${post.id}`);
      if (post.type === "carrossel") {
        for (let i = 0; i < comp.durationInFrames; i++) {
          const f = path.join(dir, `${post.id}-slide-${pad(i + 1)}.png`);
          await renderFrame(comp, i, f, "png");
          log("  ", path.relative(ROOT, f));
        }
      } else {
        const ends = sceneEnds(post);
        // PNG por cena (frame final de cada cena, com a animação assentada)
        for (let i = 0; i < ends.length; i++) {
          const f = path.join(dir, `${post.id}-cena-${pad(i + 1)}.png`);
          await renderFrame(comp, Math.max(0, ends[i] - 12), f, "png");
          log("  ", path.relative(ROOT, f));
        }
        const mp4 = path.join(dir, `${post.id}.mp4`);
        await renderVideo(comp, mp4);
        log("  ", path.relative(ROOT, mp4));
      }
    }
  }
} finally {
  await browser.close();
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
log("concluído.");
