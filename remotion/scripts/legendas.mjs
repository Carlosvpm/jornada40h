#!/usr/bin/env node
/**
 * Gera out/semana-N/legendas.md com legenda + hashtags + link UTM por post.
 * Uso: node scripts/legendas.mjs --week 1 [--out out/semana-1]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const week = Number(opt("week", "1"));
const outDir = path.resolve(ROOT, opt("out", `out/semana-${week}`));
const SITE = "https://incandescent-profiterole-dfec92.netlify.app/";

const posts = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "posts.json"), "utf8")).filter((p) => p.semana === week);

const tipo = { carrossel: "Carrossel", reel: "Reel", story: "Story" };
const arquivos = (p) => {
  const dir = path.join(outDir, p.id);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).sort().map((f) => `${p.id}/${f}`);
};

let md = `# Legendas · Semana ${week} · Jornada 40h\n\n`;
md += `Link da bio (atualize antes de publicar): ${SITE}\n\n`;
md += `Cada post tem o próprio link com UTM para medir origem no Netlify/GA.\n\n---\n\n`;

for (const p of posts) {
  const utm = `${SITE}?utm_source=instagram&utm_medium=organico&utm_content=${encodeURIComponent(p.id)}`;
  md += `## ${p.dia} · ${tipo[p.type]} · \`${p.id}\`\n\n`;
  md += `**${p.titulo}**\n\n`;
  md += `Link UTM (bio / sticker de link): ${utm}\n\n`;
  const files = arquivos(p);
  if (files.length) md += `Arquivos: ${files.map((f) => `\`${f}\``).join(", ")}\n\n`;
  md += `### Legenda\n\n`;
  md += "```\n" + p.legenda.trim() + "\n\n" + p.hashtags.join(" ") + "\n```\n\n";
  if (p.type === "story") md += `_Story: adicione o sticker de link apontando para o link UTM acima${p.id === "enquete" ? " e o sticker de enquete (Sim/Não) sobre os botões do 1º frame" : ""}._\n\n`;
  if (p.type === "carrossel") md += `_Carrossel: publique os slides na ordem (01 → ${String(files.filter((f) => f.endsWith(".png")).length).padStart(2, "0")})._\n\n`;
  if (p.type === "reel") md += `_Reel: vídeo sem áudio; adicione um áudio em alta na publicação. Capa sugerida: \`${p.id}/${p.id}-cena-01.png\`._\n\n`;
  md += `---\n\n`;
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "legendas.md"), md);
console.log("legendas:", path.relative(ROOT, path.join(outDir, "legendas.md")));
