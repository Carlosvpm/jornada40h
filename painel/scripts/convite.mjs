// Cria um convite no painel e imprime o link (o cliente cria a senha nele).
// Uso: node painel/scripts/convite.mjs email "Nome" [estado.json] [--base https://jornada40h.com.br]
// A chave de admin vem de ~/.config/jornada40h/admin_key (mesmo valor do ADMIN_KEY no Dokploy).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const iBase = args.indexOf("--base");
const base = iBase >= 0 ? args.splice(iBase, 2)[1] : "https://jornada40h.com.br";
const [email, nome = "", arquivo] = args;
if (!email) { console.error("uso: node painel/scripts/convite.mjs email \"Nome\" [estado.json]"); process.exit(1); }
const chave = fs.readFileSync(path.join(os.homedir(), ".config", "jornada40h", "admin_key"), "utf8").trim();
const estado = arquivo ? JSON.parse(fs.readFileSync(arquivo, "utf8")) : undefined;
const r = await fetch(base + "/painel/api/admin/convites", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-admin-key": chave },
  body: JSON.stringify({ email, nome, estado }),
});
const d = await r.json();
if (!r.ok) { console.error(r.status, d.erro); process.exit(1); }
console.log(d.link);
