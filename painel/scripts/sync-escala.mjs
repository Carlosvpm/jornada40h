// Copia o dashboard da escala (fonte única em site/app e site/js) para public/escala.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const destino = path.join(raiz, "painel", "public", "escala");
fs.mkdirSync(destino, { recursive: true });
for (const [de, para] of [
  ["site/app/index.html", "index.html"],
  ["site/app/app.css", "app.css"],
  ["site/app/app.js", "app.js"],
  ["site/js/escala.js", "escala.js"],
]) fs.copyFileSync(path.join(raiz, de), path.join(destino, para));
console.log("escala sincronizada em painel/public/escala");
