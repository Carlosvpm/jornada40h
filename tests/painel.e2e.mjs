// Teste do painel (painel/, Next + SQLite): acesso liberado pelo admin → login por código no e-mail
// → escala salva no banco → sair/entrar → limites e proteções. Roda o build standalone com banco
// temporário; sem RESEND_API_KEY o servidor escreve o código no log (EMAIL_DEV_LOG=1).
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
const Database = require(path.join(PAINEL, "node_modules", "better-sqlite3"));
const STANDALONE = path.join(PAINEL, ".next", "standalone");
const PORTA = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORTA}`;
const ADMIN_KEY = "teste-" + "x".repeat(30);
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "j40h-painel-"));

fs.cpSync(path.join(PAINEL, ".next", "static"), path.join(STANDALONE, ".next", "static"), { recursive: true });
fs.cpSync(path.join(PAINEL, "public"), path.join(STANDALONE, "public"), { recursive: true });

const srv = spawn(process.execPath, ["server.js"], {
  cwd: STANDALONE,
  env: { ...process.env, PORT: String(PORTA), HOSTNAME: "127.0.0.1", DATA_DIR, ADMIN_KEY, NODE_ENV: "production", EMAIL_DEV_LOG: "1", RESEND_API_KEY: "", ANTHROPIC_API_KEY: "", IA_MOCK: "1" },
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
const ultimoCodigo = email => [...log.matchAll(new RegExp(`\\[codigo\\] ${email.replace(/[.@]/g, "\\$&")} (\\d{6})`, "g"))].pop()?.[1];
const espera = async (cond, ms = 5000) => { const t = Date.now(); while (!cond() && Date.now() - t < ms) await new Promise(r => setTimeout(r, 100)); };
const post = (url, corpo, ip = "1.1.1.1", headers = {}) => fetch(BASE + url, { method: "POST", headers: { "Content-Type": "application/json", "x-real-ip": ip, ...headers }, body: JSON.stringify(corpo) });
const liberar = (email, extra = {}) => post("/painel/api/admin/convites", { email, ...extra }, "9.9.9.9", { "x-admin-key": ADMIN_KEY });

const estado = {
  negocio: { nome: "Padaria Exemplo", tipo: "Padaria" },
  funcionamento: Object.fromEntries(["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map(d => [d, d === "dom" ? null : { abre: "06:00", fecha: "18:00", pessoas: 2 }])),
  equipe: ["Ana", "Bia", "Caio", "Duda"].map((nome, i) => ({ id: "p" + i, nome, funcao: "atendente" })),
  custos: { salario: 1800, encargos: 1.7, he: 50 },
};

async function entrarPelaTela(page, email) {
  await page.goto(BASE + "/painel/login");
  await page.fill("input[name=email]", email);
  const antes = ultimoCodigo(email);
  await page.click("button[type=submit]");
  await page.waitForSelector("input[name=codigo]");
  await espera(() => ultimoCodigo(email) && ultimoCodigo(email) !== antes);
  await page.fill("input[name=codigo]", ultimoCodigo(email));
  await page.click("button[type=submit]");
  await page.waitForSelector("#grid [data-p]", { timeout: 15000 });
}

const browser = await chromium.launch({ channel: process.env.PW ? undefined : "chrome" });
try {
  console.log("1. proteções");
  ok((await fetch(BASE + "/painel/api/escala")).status === 401, "API da escala sem sessão → 401");
  ok((await post("/painel/api/admin/convites", {})).status === 401, "liberar acesso sem chave → 401");
  ok((await fetch(BASE + "/painel/api/admin/convites", { headers: { "x-admin-key": ADMIN_KEY } })).status === 200, "checagem da chave (GET) → 200");
  const r0 = await fetch(BASE + "/painel", { redirect: "manual" });
  ok(r0.status >= 300 && r0.status < 400 && /\/painel\/login/.test(r0.headers.get("location") || ""), "painel sem sessão redireciona para o login");

  console.log("2. acesso liberado + login por código");
  const rl = await liberar("Cliente@Exemplo.com", { nome: "Cliente", estado });
  ok(rl.ok && /\/painel\/login$/.test((await rl.json()).link), "acesso liberado devolve o link do login");
  const ctxP = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await ctxP.addInitScript(() => { try { localStorage.setItem("j40h:vista", "pessoa"); } catch (e) {} });
  const page = await ctxP.newPage();
  const erros = [];
  page.on("pageerror", e => erros.push(e.message));
  await entrarPelaTela(page, "cliente@exemplo.com");
  ok(await page.textContent("#tNegocio") === "Padaria Exemplo", "login por código abre a escala inicial");
  const db = new Database(path.join(DATA_DIR, "jornada40h.db"), { readonly: true });
  ok(db.prepare("SELECT COUNT(*) n FROM codigos").get().n === 0, "código usado é apagado do banco");
  ok(!JSON.stringify(db.prepare("SELECT * FROM codigos").all()).match(/\b\d{6}\b/), "banco não guarda código em claro");

  console.log("3. edição salva no banco");
  await page.locator("#grid button.cell.turno").first().click();
  await page.locator("#dlgForm input[value=folga]").check();
  await page.click("#dlgOk");
  await page.waitForFunction(() => document.querySelector("#tSalvo").textContent === "salvo na sua conta", null, { timeout: 5000 });
  const folgas = await page.locator("#grid .cell.folga").count();
  await page.reload();
  await page.waitForSelector("#grid button.cell");
  ok(await page.locator("#grid .cell.folga").count() === folgas, "edição continua depois de recarregar");
  // Tirar um turno abre buraco: ao entrar de novo, a revisão mostra e oferece a contratação.
  await page.waitForSelector("#dlgRev[open]");
  ok(/sem cobertura/.test(await page.textContent("#revCorpo")) && await page.isChecked("#revPlano"), "revisão ao entrar explica o buraco e propõe contratar");
  await page.click('#dlgRev [value="pular"]');
  await page.waitForFunction(() => sessionStorage.getItem("j40h:revisao-pulada"));

  console.log("3b. ajuste com IA (resposta simulada)");
  ok(await page.isVisible("#btnIA"), "botão Ajuste com IA aparece no painel");
  await page.click("#btnIA");
  await page.fill("#iaPedido", "A primeira pessoa não pode trabalhar aos sábados");
  await page.click('[data-ia="enviar"]');
  await page.waitForSelector("#iaResultado:not([hidden]) .ia-comp", { timeout: 15000 });
  ok(/sábado/.test(await page.textContent("#iaResultado")), "proposta mostra resumo e o que muda");
  ok(await page.locator("#iaResultado .ia-comp tbody tr").count() === 4, "comparação antes e depois");
  const antesIA = await page.evaluate(() => JSON.stringify(window.__j40h.state.equipe));
  await page.click('[data-ia="aplicar"]');
  const eq = await page.evaluate(() => window.__j40h.state.equipe);
  ok(eq[0].naoPode.includes("sab") && JSON.stringify(eq) !== antesIA, "aplicar grava a proposta");
  await page.click('#iaDica [data-dica="desfazer"]');
  ok(await page.evaluate(() => JSON.stringify(window.__j40h.state.equipe)) === antesIA, "desfazer volta ao que era");

  console.log("3c. card de dúvida: o dono responde e a IA corrige");
  ok(await page.isHidden("#duvidas"), "sem dado estranho, sem card");
  await page.evaluate(() => { const s = window.__j40h.state; s.funcionamento.seg.pessoas = 4; window.__j40h.render(); });
  ok(/4 pessoas trabalhando ao mesmo tempo/.test(await page.textContent("#duvidas")), "4 ao mesmo tempo com equipe de 4 vira pergunta");
  await page.fill("#duvTxt", "São 4 no total, ficam 2 ao mesmo tempo");
  await page.click('#duvidas [data-duv="enviar"]');
  await page.waitForSelector("#iaResultado:not([hidden]) .ia-comp", { timeout: 15000 });
  ok(/Minha resposta: São 4 no total/.test(await page.inputValue("#iaPedido")), "resposta vai para a IA com a pergunta junto");
  await page.click('#iaActs [value="cancel"]');
  await page.click('#duvidas [data-duv="ok"]');
  ok(await page.isHidden("#duvidas") && await page.evaluate(() => !!window.__j40h.state.duvidasOk["pessoas:4:4"]), "\"Está certo assim\" some com o card e fica gravado");
  await page.evaluate(() => { const s = window.__j40h.state; s.funcionamento.seg.pessoas = 2; delete s.duvidasOk; window.__j40h.render(); });

  console.log("3d. revisão ao entrar: ponto fora da lei explicado, aplicar (com desfazer) e pular");
  const original = await page.evaluate(() => window.__j40h.state);
  const quebrada = await page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(window.__j40h.state)), g = s.escalas["42"].A, id = s.equipe[0].id;
    for (const d of ["seg", "ter", "qua", "qui", "sex", "sab"]) g[id][d] = { tipo: "turno", inicio: "06:00", fim: "15:24", rotulo: "Abertura", almoco: "10:00" };
    return s;
  });
  await page.evaluate(e => fetch("/painel/api/escala", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: e }) }), quebrada);
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForSelector("#dlgRev[open]");
  const rev = await page.textContent("#revCorpo");
  ok(/fora da lei/.test(rev) && /42 h, semana A: Ana/.test(rev) && /só 1 folga/.test(rev), "revisão lista o ponto fora da lei com a semana");
  ok(/monta de novo só a semana com problema \(42 h, semana A\)/.test(rev), "explica o ajuste");
  await page.click("#revOk");
  await page.waitForSelector("#iaDica:not([hidden])");
  await page.waitForFunction(() => document.querySelector("#tSalvo").textContent === "salvo na sua conta", null, { timeout: 5000 });
  const depoisRev = await page.evaluate(() => ({ e: window.__j40h.calcular(window.__j40h.state, "42", "A").erros.length, b: JSON.stringify(window.__j40h.state.escalas["42"].B) }));
  ok(depoisRev.e === 0 && depoisRev.b === JSON.stringify(quebrada.escalas["42"].B), "aplicar refaz só a semana com problema");
  await page.click('#iaDica [data-dica="desfazer"]');
  ok(await page.evaluate(() => window.__j40h.calcular(window.__j40h.state, "42", "A").erros.length) > 0, "desfazer volta a escala de antes");
  await page.waitForFunction(() => document.querySelector("#tSalvo").textContent === "salvo na sua conta", null, { timeout: 5000 });
  await page.reload();
  await page.waitForSelector("#dlgRev[open]");
  await page.click('#dlgRev [value="pular"]');
  await page.waitForFunction(() => sessionStorage.getItem("j40h:revisao-pulada"));
  await page.reload();
  await page.waitForSelector("#grid [data-p]");
  await page.waitForTimeout(600);
  ok(await page.isHidden("#dlgRev"), "pular: não volta na mesma sessão do navegador");
  await page.evaluate(e => fetch("/painel/api/escala", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: e }) }), original);

  const semLogin = await fetch(BASE + "/painel/api/ia", { method: "POST", body: "{}" });
  ok(semLogin.status === 401, "IA sem login → 401");

  console.log("4. sair, código errado, entrar de novo");
  await page.click("#btnLink");
  await page.waitForURL(/\/painel\/login/);
  ok((await page.request.get(BASE + "/painel/api/escala")).status() === 401, "depois de sair a API volta a 401");
  await page.fill("input[name=email]", "cliente@exemplo.com");
  await page.click("button[type=submit]");
  await page.waitForSelector("input[name=codigo]");
  await page.fill("input[name=codigo]", "000000");
  await page.click("button[type=submit]");
  await page.waitForSelector(".erro");
  ok(/errado ou vencido/.test(await page.textContent(".erro")), "código errado mostra erro");
  await espera(() => ultimoCodigo("cliente@exemplo.com"));
  await page.fill("input[name=codigo]", ultimoCodigo("cliente@exemplo.com"));
  await page.click("button[type=submit]");
  await page.waitForSelector("#grid button.cell", { timeout: 15000 });
  ok(await page.locator("#grid .cell.folga").count() === folgas, "código certo abre a escala salva");

  console.log("5. e-mail sem acesso: mesma resposta, nenhum código");
  const rn = await post("/painel/api/codigo", { email: "ninguem@exemplo.com" }, "2.2.2.2");
  ok(rn.ok && /Se este e-mail tem acesso/.test((await rn.json()).mensagem), "resposta igual à de quem tem acesso");
  ok(!ultimoCodigo("ninguem@exemplo.com"), "nenhum código gerado para quem não tem acesso");

  console.log("6. código vence em 15 min e é apagado");
  await liberar("vence@exemplo.com");
  await post("/painel/api/codigo", { email: "vence@exemplo.com" }, "3.3.3.3");
  await espera(() => ultimoCodigo("vence@exemplo.com"));
  const rw = new Database(path.join(DATA_DIR, "jornada40h.db"));
  const linha = rw.prepare("SELECT expira_em FROM codigos WHERE email = ?").get("vence@exemplo.com");
  ok(linha && Math.abs(linha.expira_em - Date.now() - 15 * 60e3) < 60e3, "código criado com validade de 15 min");
  rw.prepare("UPDATE codigos SET expira_em = ? WHERE email = ?").run(Date.now() - 1000, "vence@exemplo.com");
  const rv = await post("/painel/api/entrar", { email: "vence@exemplo.com", codigo: ultimoCodigo("vence@exemplo.com") }, "3.3.3.3");
  ok(rv.status === 401, "código vencido não entra");
  await espera(() => rw.prepare("SELECT COUNT(*) n FROM codigos WHERE email = ?").get("vence@exemplo.com").n === 0, 70000);
  ok(rw.prepare("SELECT COUNT(*) n FROM codigos WHERE email = ?").get("vence@exemplo.com").n === 0, "faxina apaga o código vencido do banco");

  console.log("7. código apagado depois de 5 erros");
  await liberar("erra@exemplo.com");
  await post("/painel/api/codigo", { email: "erra@exemplo.com" }, "4.4.4.4");
  await espera(() => ultimoCodigo("erra@exemplo.com"));
  const certo = ultimoCodigo("erra@exemplo.com");
  const errado = certo === "111111" ? "222222" : "111111";
  for (let i = 0; i < 5; i++) await post("/painel/api/entrar", { email: "erra@exemplo.com", codigo: errado }, "4.4.4.4");
  ok((await post("/painel/api/entrar", { email: "erra@exemplo.com", codigo: certo }, "4.4.4.4")).status === 401, "depois de 5 erros nem o código certo entra");

  console.log("8. rate limit");
  await liberar("limite@exemplo.com");
  ok((await post("/painel/api/codigo", { email: "limite@exemplo.com" }, "5.5.5.5")).ok, "1º código ok");
  const r2 = await post("/painel/api/codigo", { email: "limite@exemplo.com" }, "5.5.5.6");
  ok(r2.status === 429 && Number(r2.headers.get("retry-after")) > 0, "2º código no mesmo minuto (o 1º não usado) → 429 com Retry-After");
  let ultimo;
  for (let i = 0; i < 11; i++) ultimo = await post("/painel/api/codigo", { email: `x${i}@exemplo.com` }, "6.6.6.6");
  ok(ultimo.status === 429, "11º pedido de código do mesmo IP → 429");
  for (let i = 0; i < 31; i++) ultimo = await post("/painel/api/entrar", { email: `y${i % 3}@exemplo.com`, codigo: "123456" }, "7.7.7.7");
  ok(ultimo.status === 429, "31ª tentativa de código do mesmo IP → 429");
  for (let i = 0; i < 11; i++) ultimo = await post("/painel/api/entrar", { email: "alvo@exemplo.com", codigo: "123456" }, "8.8.8." + i);
  ok(ultimo.status === 429, "11ª tentativa no mesmo e-mail, de IPs diferentes → 429");
  for (let i = 0; i < 21; i++) ultimo = await post("/painel/api/admin/convites", { email: "a@b.com" }, "10.0.0.1", { "x-admin-key": "errada-" + "z".repeat(29) });
  ok(ultimo.status === 429, "21ª chave de admin errada do mesmo IP → 429");

  console.log("9. contas isoladas e link antigo de convite");
  const ctx2 = await browser.newContext();
  const q = await ctx2.newPage();
  await liberar("outro@exemplo.com");
  await entrarPelaTela(q, "outro@exemplo.com");
  ok(await q.textContent("#tNegocio") !== "Padaria Exemplo", "outra conta não vê a escala da primeira");
  await q.goto(BASE + "/painel/convite/qualquer-token");
  ok(/^\/painel(\/login)?\/?$/.test(new URL(q.url()).pathname), "link de convite antigo leva ao painel/login");

  console.log("10. celular");
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/painel/login");
  ok(await m.evaluate(() => document.documentElement.scrollWidth) <= 390, "login sem rolagem horizontal no celular");
  if (process.env.SHOTS) {
    await m.fill("input[name=email]", "cliente@exemplo.com");
    await m.screenshot({ path: path.join(process.env.SHOTS, "painel-login-mobile.png") });
  }

  console.log("11. funil da LP");
  const ev = (corpo, ip = "7.7.7.7") => fetch(BASE + "/painel/api/ev", { method: "POST", headers: { "content-type": "text/plain", "x-real-ip": ip }, body: JSON.stringify(corpo) });
  ok((await ev({ ev: "PageView", sid: "s1abc", variante: "a5", anuncio: "v4l-02" })).status === 204, "evento aceito (204)");
  await ev({ ev: "InitiateCheckout", sid: "s1abc", variante: "a5", anuncio: "v4l-02" });
  await ev({ ev: "PageView", sid: "s2abc", variante: "a5sp", anuncio: "v4l-01" });
  await ev({ ev: "PageView", sid: "s2abc", variante: "a5sp", anuncio: "v4l-01" });
  ok((await ev({ ev: "<script>", sid: "s1abc" })).status === 400, "nome de evento inválido → 400");
  ok((await fetch(BASE + "/painel/api/admin/funil")).status === 401, "relatório do funil sem chave → 401");
  const f = await (await fetch(BASE + "/painel/api/admin/funil?desde=2020-01-01", { headers: { "x-admin-key": ADMIN_KEY } })).json();
  ok(f.funil.a5?.PageView === 1 && f.funil.a5?.InitiateCheckout === 1 && f.funil.a5sp?.PageView === 1, "funil conta visitas únicas por variante");
  const fa = await (await fetch(BASE + "/painel/api/admin/funil?por=anuncio", { headers: { "x-admin-key": ADMIN_KEY } })).json();
  ok(fa.funil["v4l-01"]?.PageView === 1, "funil por anúncio");

  ok(!erros.length, "sem erro de JavaScript" + (erros.length ? ": " + erros.join(" | ") : ""));
  db.close(); rw.close();
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
