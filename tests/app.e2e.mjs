// Teste do dashboard da escala (site/app/): monta a escala a partir de um link #d=…,
// edita uma célula, confere recálculo, custos, planilha e layout de impressão.
//
// Uso: node tests/app.e2e.mjs            (serve site/ numa porta local)
//      PW=/caminho/para/playwright-core SHOTS=/pasta node tests/app.e2e.mjs
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || "playwright-core");
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "site");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const SHOTS = process.env.SHOTS || "";

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const BASE = "http://127.0.0.1:" + server.address().port;

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FALHA ") + msg); if (!cond) falhas++; };

// Negócio fictício (dados de cliente não entram no repositório).
const f = {};
for (const d of ["seg", "ter", "qua"]) f[d] = { abre: "05:30", fecha: "19:00", pessoas: 2 };
for (const d of ["qui", "sex", "sab"]) f[d] = { abre: "05:30", fecha: "19:00", pessoas: 3 };
f.dom = { abre: "05:30", fecha: "12:00", pessoas: 3 };
const estado = {
  negocio: { nome: "Padaria Exemplo", tipo: "Padaria" },
  funcionamento: f,
  equipe: [["Ana", "atendente"], ["Bia", "atendente"], ["Caio", "atendente"], ["Duda", "caixa"], ["Edu", "caixa"]]
    .map(([nome, funcao], i) => ({ id: "p" + i, nome, funcao })),
  custos: { salario: 1960, encargos: 1.7, he: 50 },
  versao: "42", semana: "A"
};
const hash = Buffer.from(JSON.stringify(estado)).toString("base64url");

const browser = await chromium.launch({ channel: process.env.PW ? undefined : "chrome" });
try {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", e => erros.push(e.message));

  console.log("1. abre pelo link pessoal");
  await page.goto(BASE + "/app/#d=" + hash);
  await page.waitForSelector("#grid button.cell");
  ok(await page.textContent("#tNegocio") === "Padaria Exemplo", "nome do negócio no topo");
  ok(await page.locator("#grid tbody tr").count() === 5, "5 pessoas na grade");
  const s = await page.evaluate(() => window.__j40h.state);
  ok(s.escalas["42"].A && s.escalas["40"].B, "escalas 42h/40h × semana A/B geradas");
  for (const v of ["42", "40"]) for (const sem of ["A", "B"]) {
    const erros = await page.evaluate(([v, sem]) => window.__j40h.calcular(window.__j40h.state, v, sem).erros, [v, sem]);
    ok(!erros.length, `escala ${v}h semana ${sem} sai dentro da lei` + (erros.length ? ": " + erros.join(" | ") : ""));
  }
  const kpi = await page.textContent("#kpis");
  ok(/Horas sem cobertura/.test(kpi) && /h/.test(kpi), "KPIs renderizados");
  ok(await page.locator(".op.best").count() === 1, "uma saída marcada como mais barata");
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "app-42.png"), fullPage: true });

  console.log("2. edita uma célula (turno → folga) e recalcula");
  const antes = await page.evaluate(() => window.__j40h.calcular(window.__j40h.state, "42", "A").falta);
  const cel = page.locator("#grid button.cell.turno").first();
  await cel.click();
  await page.locator('#dlgForm input[value=folga]').check();
  await page.click("#dlgOk");
  const depois = await page.evaluate(() => window.__j40h.calcular(window.__j40h.state, "42", "A").falta);
  ok(depois > antes, `horas descobertas sobem ao tirar um turno (${antes} → ${depois})`);

  console.log("3. turno ilegal vira alerta");
  await page.locator("#grid button.cell.turno").first().click();
  await page.fill("#dlgIni", "05:30");
  await page.fill("#dlgFim", "18:30");
  await page.click("#dlgOk");
  ok(/passa do máximo/.test(await page.textContent("#alertas")), "turno de 13 h gera alerta de limite diário");
  ok(await page.locator("#grid .cell.erro").count() >= 1, "célula com erro destacada");

  console.log("4. persiste ao recarregar o mesmo link");
  await page.reload();
  await page.waitForSelector("#grid button.cell");
  ok(/passa do máximo/.test(await page.textContent("#alertas")), "edição mantida após recarregar");

  console.log("5. troca para 40h e semana B");
  await page.click('[data-v="40"]');
  await page.click('[data-s="B"]');
  ok(/40 h · semana B/.test(await page.textContent("#tSemana")), "título da grade em 40h semana B");
  ok(await page.getAttribute(".side-nav [data-v=\"40\"]", "aria-selected") === "true", "item 40 h ativo na sidebar");
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "app-40b.png"), fullPage: true });

  console.log("6. simular contratação");
  const n0 = await page.locator("#grid tbody tr").count();
  const acao = page.locator('[data-acao="contratar"]');
  if (await acao.count()) {
    await acao.click();
    ok(await page.locator("#grid tbody tr").count() === n0 + 1, "pessoa nova entra na grade");
  } else ok(true, "sem horas descobertas: nada a simular");

  console.log("7. planilha");
  const dl = page.waitForEvent("download", { timeout: 20000 });
  await page.click("#btnXlsx");
  const arq = await dl;
  ok(/escala-5x2-padaria-exemplo\.xlsx$/.test(arq.suggestedFilename()), "baixa " + arq.suggestedFilename());

  console.log("8. layout de impressão (PDF)");
  await page.emulateMedia({ media: "print" });
  ok(!(await page.isVisible(".top")) && !(await page.isVisible(".side")) && await page.isVisible(".print-head"), "impressão esconde topo e sidebar e mostra o cabeçalho");
  if (SHOTS) await page.pdf({ path: path.join(SHOTS, "app.pdf"), format: "A4", landscape: true, printBackground: true });
  await page.emulateMedia({ media: "screen" });

  console.log("9. edita pessoa e dia pela grade");
  await page.click("[data-pessoa]");
  await page.fill("#pNome", "Joana Teste");
  await page.check('#pNaoPode [data-pnp="seg"]', { force: true });
  await page.click('#dlgPForm button[value="ok"]');
  ok(/Joana Teste/.test(await page.textContent("#grid tbody tr:first-child td.p")), "nome editado aparece na grade");
  ok(await page.isVisible("#pend"), "restrição nova mostra o aviso para montar de novo");
  await page.click("#btnRegen2"); await page.click("#btnRegen2");
  ok(!(await page.isVisible("#pend")), "montar de novo some com o aviso");
  const segJoana = await page.evaluate(() => { const s = window.__j40h.state, id = s.equipe[0].id; return ["A", "B"].map(sem => s.escalas[s.versao][sem][id].seg.tipo); });
  ok(segJoana.every(t => t === "folga"), "dia que não pode trabalhar vira folga nas semanas A e B");
  const n1 = await page.locator("#grid tbody tr").count();
  await page.click("#btnAddPessoa2");
  await page.fill("#pNome", "Pessoa Nova");
  await page.click('#dlgPForm button[value="ok"]');
  ok(await page.locator("#grid tbody tr").count() === n1 + 1, "adicionar pessoa pela grade");
  await page.click('[data-dia="dom"]');
  await page.uncheck("#dAberto");
  await page.click('#dlgDForm button[value="ok"]');
  ok(await page.locator("#grid .cell.fechado").count() === n1 + 1, "fechar domingo pelo cabeçalho do dia");
  await page.click("#perfilBtn");
  await page.click('[data-tema="dark"]');
  ok(await page.evaluate(() => document.documentElement.dataset.theme === "dark" && localStorage.getItem("j40h:tema") === "dark"), "tema escuro pelo menu de perfil");
  await page.click('[data-tema="system"]');
  ok(await page.evaluate(() => !document.documentElement.dataset.theme), "volta a seguir o sistema");

  console.log("10. celular");
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/app/#d=" + hash);
  await m.waitForSelector("#grid button.cell");
  const largura = await m.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= 390, "sem rolagem horizontal da página no celular (" + largura + "px)");
  if (SHOTS) await m.screenshot({ path: path.join(SHOTS, "app-mobile.png"), fullPage: true });

  console.log("11. sem link: abre exemplo");
  const p2 = await (await browser.newContext()).newPage();
  await p2.goto(BASE + "/app/");
  await p2.waitForSelector("#grid button.cell");
  ok(await p2.evaluate(() => document.querySelector("#cfg").open), "exemplo abre com a configuração aberta");

  ok(!erros.length, "sem erro de JavaScript" + (erros.length ? ": " + erros.join(" | ") : ""));
} finally {
  await browser.close();
  server.close();
}
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo ok");
process.exit(falhas ? 1 : 0);
