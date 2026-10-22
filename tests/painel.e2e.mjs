// Teste do painel com login (painel/, Next + SQLite): convite → senha → escala salva no banco →
// login/logout → proteções. Roda o build standalone com um banco temporário.
//
// Uso: (cd painel && npm run build) && node tests/painel.e2e.mjs
//      PW=/caminho/para/playwright-core node tests/painel.e2e.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || "playwright-core");
const PAINEL = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "painel");
const STANDALONE = path.join(PAINEL, ".next", "standalone");
const PORTA = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORTA}`;
const ADMIN_KEY = "teste-" + "x".repeat(30);
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "j40h-painel-"));

// O standalone precisa de .next/static e public ao lado do server.js (igual ao Dockerfile).
fs.cpSync(path.join(PAINEL, ".next", "static"), path.join(STANDALONE, ".next", "static"), { recursive: true });
fs.cpSync(path.join(PAINEL, "public"), path.join(STANDALONE, "public"), { recursive: true });

const srv = spawn(process.execPath, ["server.js"], {
  cwd: STANDALONE,
  env: { ...process.env, PORT: String(PORTA), HOSTNAME: "127.0.0.1", DATA_DIR, ADMIN_KEY, NODE_ENV: "production" },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
srv.stdout.on("data", d => (log += d));
srv.stderr.on("data", d => (log += d));
for (let i = 0; i < 50; i++) {
  try { await fetch(BASE + "/painel/login"); break; } catch { await new Promise(r => setTimeout(r, 200)); }
}

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FALHA ") + msg); if (!cond) falhas++; };

const estado = {
  negocio: { nome: "Padaria Exemplo", tipo: "Padaria" },
  funcionamento: Object.fromEntries(["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map(d => [d, d === "dom" ? null : { abre: "06:00", fecha: "18:00", pessoas: 2 }])),
  equipe: ["Ana", "Bia", "Caio", "Duda"].map((nome, i) => ({ id: "p" + i, nome, funcao: "atendente" })),
  custos: { salario: 1800, encargos: 1.7, he: 50 },
};

const browser = await chromium.launch({ channel: process.env.PW ? undefined : "chrome" });
try {
  console.log("1. proteções");
  ok((await fetch(BASE + "/painel/api/escala")).status === 401, "API da escala sem sessão → 401");
  const semChave = await fetch(BASE + "/painel/api/admin/convites", { method: "POST", body: "{}" });
  ok(semChave.status === 401, "criar convite sem chave → 401");
  const r0 = await fetch(BASE + "/painel", { redirect: "manual" });
  ok(r0.status >= 300 && r0.status < 400 && /\/painel\/login/.test(r0.headers.get("location") || ""), "painel sem sessão redireciona para o login");

  console.log("2. convite");
  const rc = await fetch(BASE + "/painel/api/admin/convites", {
    method: "POST", headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "Cliente@Exemplo.com", nome: "Cliente", estado }),
  });
  const { link } = await rc.json();
  ok(rc.ok && /\/painel\/convite\//.test(link), "convite criado");

  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const erros = [];
  page.on("pageerror", e => erros.push(e.message));
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
  ok(await page.inputValue("input[readonly]") === "cliente@exemplo.com", "convite mostra o e-mail normalizado");
  await page.fill("input[name=senha]", "senha-forte-1");
  await page.fill("input[name=senha2]", "senha-forte-1");
  await page.click("button[type=submit]");
  await page.waitForSelector("#grid button.cell", { timeout: 15000 });
  ok(await page.textContent("#tNegocio") === "Padaria Exemplo", "escala inicial do convite carregada");

  console.log("3. convite não pode ser reusado");
  const p2 = await browser.newPage();
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, BASE));
  ok(/Convite expirado/.test(await p2.textContent("h1")), "link usado mostra 'Convite expirado'");
  await p2.close();

  console.log("4. edição salva no banco");
  await page.locator("#grid button.cell.turno").first().click();
  await page.locator("#dlgForm input[value=folga]").check();
  await page.click("#dlgOk");
  await page.waitForFunction(() => document.querySelector("#tSalvo").textContent === "salvo na sua conta", null, { timeout: 5000 });
  const folgasAntes = await page.locator("#grid .cell.folga").count();
  await page.reload();
  await page.waitForSelector("#grid button.cell");
  ok(await page.locator("#grid .cell.folga").count() === folgasAntes, "edição continua depois de recarregar");

  console.log("5. sair e entrar");
  await page.click("#btnLink");
  await page.waitForURL(/\/painel\/login/);
  ok((await page.request.get(BASE + "/painel/api/escala")).status() === 401, "depois de sair a API volta a 401");
  await page.fill("input[name=email]", "cliente@exemplo.com");
  await page.fill("input[name=senha]", "errada-123");
  await page.click("button[type=submit]");
  await page.waitForSelector(".erro");
  ok(/incorretos/.test(await page.textContent(".erro")), "senha errada mostra erro");
  await page.fill("input[name=senha]", "senha-forte-1");
  await page.click("button[type=submit]");
  await page.waitForSelector("#grid button.cell", { timeout: 15000 });
  ok(await page.locator("#grid .cell.folga").count() === folgasAntes, "login abre a escala salva");

  console.log("6. dados isolados por conta");
  const rc2 = await fetch(BASE + "/painel/api/admin/convites", {
    method: "POST", headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "outro@exemplo.com" }),
  });
  const ctx2 = await browser.newContext();
  const q = await ctx2.newPage();
  await q.goto((await rc2.json()).link.replace(/^https?:\/\/[^/]+/, BASE));
  await q.fill("input[name=senha]", "outra-senha-1");
  await q.fill("input[name=senha2]", "outra-senha-1");
  await q.click("button[type=submit]");
  await q.waitForSelector("#grid button.cell", { timeout: 15000 });
  ok(await q.textContent("#tNegocio") !== "Padaria Exemplo", "outra conta não vê a escala da primeira");

  console.log("7. login no celular");
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/painel/login");
  ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, "login sem rolagem horizontal no celular");
  if (process.env.SHOTS) {
    await m.screenshot({ path: path.join(process.env.SHOTS, "painel-login-mobile.png") });
    const d = await browser.newPage({ viewport: { width: 1360, height: 860 } });
    await d.goto(BASE + "/painel/login");
    await d.screenshot({ path: path.join(process.env.SHOTS, "painel-login.png") });
  }

  ok(!erros.length, "sem erro de JavaScript" + (erros.length ? ": " + erros.join(" | ") : ""));
} catch (e) {
  falhas++;
  console.log("  FALHA " + e.message + "\n" + log.slice(-2000));
} finally {
  await browser.close();
  srv.kill();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
}
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo ok");
process.exit(falhas ? 1 : 0);
