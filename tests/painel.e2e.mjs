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
// PORTA + 100 sobe um 2º servidor; 4045 é porta que o Chromium bloqueia (ERR_UNSAFE_PORT), então pula 3945.
const PORTA = (p => (p === 3945 ? 3946 : p))(3900 + Math.floor(Math.random() * 90));
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
  await page.waitForFunction(() => /^10 pedidos restantes/.test(document.querySelector("#iaSaldo").textContent), null, { timeout: 5000 });
  ok(await page.isVisible("#iaSaldo"), "ao abrir o diálogo da IA aparece o saldo do banco (10 pedidos restantes)");
  await page.fill("#iaPedido", "A primeira pessoa não pode trabalhar aos sábados");
  await page.click('[data-ia="enviar"]');
  await page.waitForSelector("#iaResultado:not([hidden]) .ia-comp", { timeout: 15000 });
  ok(await page.evaluate(() => document.querySelector("#iaSaldo").textContent) === "9 pedidos restantes", "depois de um pedido o saldo cai 1 (a conferência não desconta)");
  const usoCli = db.prepare("SELECT s.etapa, s.ok FROM uso_ia s JOIN usuarios u ON u.id = s.usuario_id WHERE u.email = 'cliente@exemplo.com' ORDER BY s.id").all();
  ok(usoCli.length === 2 && usoCli[1].etapa === "conferencia" && usoCli[1].ok === 1, "o navegador manda a rodada: a conferência passa (não dá 409)");
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

  console.log("3c2. memória do caso para a IA");
  const pedidosIA = () => db.prepare("SELECT p.pedido, p.resumo, p.aplicado FROM pedidos_ia p JOIN usuarios u ON u.id = p.usuario_id WHERE u.email = 'cliente@exemplo.com' ORDER BY p.id").all();
  await espera(() => pedidosIA()[0]?.aplicado === 1);
  const mem = pedidosIA();
  ok(mem.length === 2 && /não pode trabalhar aos sábados/.test(mem[0].pedido) && mem[0].resumo, "cada pedido à IA fica guardado com o resumo (a conferência não duplica)");
  ok(mem[0].aplicado === 1 && mem[1].aplicado === 0, "fica marcado o que foi aplicado e o que foi descartado");
  ok(db.prepare("SELECT caso FROM usuarios WHERE email = 'cliente@exemplo.com'").get().caso === "Ana não trabalha aos sábados.", "a IA atualiza o briefing (memória do negócio) quando o dono conta algo novo");
  ok((await liberar("cliente@exemplo.com", { caso: "Observações: a Ana estuda à noite." })).ok, "admin grava o que se sabe do negócio");
  const adm = await (await fetch(BASE + "/painel/api/admin/escala?email=cliente@exemplo.com", { headers: { "x-admin-key": ADMIN_KEY } })).json();
  ok(adm.memoria?.sobreONegocio === "Observações: a Ana estuda à noite." && adm.memoria.pedidosAnteriores.length === 2 && adm.memoria.pedidosAnteriores[0].aplicado === true, "admin lê a memória do caso junto com a escala");
  ok((await post("/painel/api/ia/aplicado", { id: 1 })).status === 401, "marcar aplicado sem login → 401");

  console.log("3c3. créditos da IA: inclusos, recarga e pendentes");
  const credAdm = (corpo, headers = { "x-admin-key": ADMIN_KEY }) => post("/painel/api/admin/creditos", corpo, "9.9.9.9", headers);
  const saldoEmail = email => db.prepare("SELECT COALESCE(SUM(m.delta),0) AS s FROM usuarios u LEFT JOIN creditos_mov m ON m.usuario_id = u.id WHERE u.email = ?").get(email).s;
  const inclusos = email => db.prepare("SELECT m.delta FROM creditos_mov m JOIN usuarios u ON u.id = m.usuario_id WHERE u.email = ? AND m.tipo = 'inclusos'").all(email);
  ok(inclusos("cliente@exemplo.com").length === 1 && inclusos("cliente@exemplo.com")[0].delta === 10, "conta liberada tem 1 lançamento de 10 créditos inclusos");
  await liberar("cliente@exemplo.com");
  ok(inclusos("cliente@exemplo.com").length === 1, "liberar de novo não duplica os inclusos");
  const saldoAntes = saldoEmail("cliente@exemplo.com");
  ok((await credAdm({ email: "cliente@exemplo.com", delta: 10, tipo: "recarga", ref: "x" }, {})).status === 401, "créditos sem chave → 401");
  ok((await credAdm({ email: "cliente@exemplo.com", delta: 3.5, tipo: "recarga", ref: "x" })).status === 400, "delta fracionado → 400");
  ok((await credAdm({ email: "cliente@exemplo.com", delta: 51, tipo: "recarga", ref: "x" })).status === 400, "delta fora de -50..50 → 400");
  ok((await credAdm({ email: "cliente@exemplo.com", delta: 0, tipo: "recarga", ref: "x" })).status === 400, "delta zero → 400");
  ok((await credAdm({ email: "cliente@exemplo.com", delta: 5, tipo: "uso", ref: "x" })).status === 400, "tipo \"uso\" não vale pelo admin → 400");
  ok((await credAdm({ email: "cliente@exemplo.com", delta: 5, tipo: "recarga" })).status === 400, "sem ref → 400");
  ok((await credAdm({ email: "cliente@exemplo.com", delta: 5, tipo: "recarga", ref: "r".repeat(101) })).status === 400, "ref com mais de 100 caracteres → 400");
  ok(saldoEmail("cliente@exemplo.com") === saldoAntes, "pedidos recusados não mexem no saldo");
  const rc1 = await (await credAdm({ email: "Cliente@Exemplo.com", delta: 10, tipo: "recarga", ref: "kiwi-1" })).json();
  ok(rc1.saldo === saldoAntes + 10 && rc1.duplicado === false && rc1.pendente === false, "recarga sobe o saldo em 10");
  const rc2 = await (await credAdm({ email: "cliente@exemplo.com", delta: 10, tipo: "recarga", ref: "kiwi-1" })).json();
  ok(rc2.duplicado === true && rc2.saldo === saldoAntes + 10, "repetir a mesma ref → duplicado, saldo igual");
  const rp = await (await credAdm({ email: "novo@exemplo.com", delta: 10, tipo: "recarga", ref: "kiwi-2" })).json();
  ok(rp.pendente === true && rp.saldo === null, "recarga para e-mail sem conta fica pendente");
  await liberar("novo@exemplo.com");
  ok(saldoEmail("novo@exemplo.com") === 20, "ao liberar a conta: 10 inclusos + 10 pendentes");
  ok(db.prepare("SELECT COUNT(*) AS n FROM creditos_pendentes WHERE email = 'novo@exemplo.com'").get().n === 0, "a pendência some depois de aplicada");

  console.log("3c4. cobrança de 1 crédito por pedido à IA, rodadas e saldo");
  const entrarApi = async (email, ip) => {
    await liberar(email);
    const antes = ultimoCodigo(email);
    await post("/painel/api/codigo", { email }, ip);
    await espera(() => ultimoCodigo(email) && ultimoCodigo(email) !== antes);
    const r = await post("/painel/api/entrar", { email, codigo: ultimoCodigo(email) }, ip);
    return r.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
  };
  const cookieA = await entrarApi("cobra-a@exemplo.com", "10.0.0.1");
  const cookieB = await entrarApi("cobra-b@exemplo.com", "10.0.0.2");
  const ia = (cookie, corpo) => post("/painel/api/ia", { contexto: estado, pedido: "A primeira pessoa não pode trabalhar aos sábados", ...corpo }, "10.0.0.1", { cookie });
  const uso = email => db.prepare("SELECT s.* FROM uso_ia s JOIN usuarios u ON u.id = s.usuario_id WHERE u.email = ? ORDER BY s.id").all(email);
  const livro = (email, tipo) => db.prepare("SELECT m.ref, m.delta FROM creditos_mov m JOIN usuarios u ON u.id = m.usuario_id WHERE u.email = ? AND m.tipo = ? ORDER BY m.id").all(email, tipo);
  const dbw = new Database(path.join(DATA_DIR, "jornada40h.db")); // o db acima é só leitura
  const limpaLimites = () => dbw.prepare("DELETE FROM limites WHERE chave LIKE 'ia:%'").run();
  const A = "cobra-a@exemplo.com", B = "cobra-b@exemplo.com";

  ok((await fetch(BASE + "/painel/api/ia/saldo")).status === 401, "saldo sem sessão → 401");
  const sd0 = await (await fetch(BASE + "/painel/api/ia/saldo", { headers: { cookie: cookieA } })).json();
  ok(sd0.saldo === 10 && sd0.recarga === "", "saldo com sessão: 10 inclusos e recarga (sem RECARGA_URL) vazia");

  const p1 = await ia(cookieA, {});
  const j1 = await p1.json();
  ok(p1.status === 200 && Number.isInteger(j1.rodada) && j1.saldo === 9 && saldoEmail(A) === 9, "proposta → 200 com rodada e saldo 9 (−1)");
  ok(uso(A).length === 1 && uso(A)[0].id === j1.rodada && uso(A)[0].ok === 1 && uso(A)[0].etapa === "proposta" && uso(A)[0].pedido_id === j1.historico, "uso_ia guarda a rodada com ok = 1, etapa e pedido");
  ok(livro(A, "uso").some(m => m.ref === "ia:r" + j1.rodada && m.delta === -1), "livro-razão: uso com ref ia:r<rodada>");

  const c1 = await ia(cookieA, { conferir: { grade: 1 }, rodada: j1.rodada, historico: j1.historico });
  const cj1 = await c1.json();
  ok(c1.status === 200 && cj1.saldo === 9 && saldoEmail(A) === 9, "conferência da rodada → 200 e saldo igual");
  ok((await ia(cookieA, { conferir: { grade: 1 }, rodada: j1.rodada })).status === 409, "mesma conferência de novo → 409");
  const pB = await (await ia(cookieB, {})).json();
  ok((await ia(cookieA, { conferir: { grade: 1 }, rodada: pB.rodada })).status === 409, "rodada de outra conta → 409");
  ok((await ia(cookieA, { conferir: { grade: 1 } })).status === 409 && (await ia(cookieA, { conferir: { grade: 1 }, rodada: 99999 })).status === 409, "conferência sem rodada ou com rodada inexistente → 409");
  const p2 = await (await ia(cookieA, {})).json();
  dbw.prepare("UPDATE uso_ia SET criado_em = datetime('now','-16 minutes') WHERE id = ?").run(p2.rodada);
  ok((await ia(cookieA, { conferir: { grade: 1 }, rodada: p2.rodada })).status === 409, "rodada com mais de 15 minutos → 409");
  ok(saldoEmail(A) === 8, "conferências recusadas não cobram (2 propostas = 8)");

  limpaLimites();
  const m1 = await (await ia(cookieA, { anterior: { x: 1 }, historico: j1.historico })).json();
  ok(m1.saldo === 8 && saldoEmail(A) === 8 && uso(A).at(-1).etapa === "melhorar", "1ª melhoria do pedido é grátis");
  const m2 = await (await ia(cookieA, { anterior: { x: 1 }, historico: j1.historico })).json();
  ok(m2.saldo === 7 && saldoEmail(A) === 7, "2ª melhoria do mesmo pedido custa 1");
  ok(db.prepare("SELECT COUNT(*) AS n FROM pedidos_ia p JOIN usuarios u ON u.id = p.usuario_id WHERE u.email = ?").get(A).n === 2, "melhorar não cria pedido novo (só os 2 das propostas)");
  const cm = await ia(cookieA, { conferir: { grade: 1 }, rodada: m1.rodada, historico: j1.historico });
  ok(cm.status === 200 && saldoEmail(A) === 7, "melhoria grátis também pode ser conferida, sem custo");

  // Conferência e melhoria usam o texto do pedido gravado, não o "pedido" do corpo. O IA_MOCK falha (422) quando o
  // texto do pedido tem [falha]: com [falha] só no corpo a chamada passa; com [falha] no texto gravado ela falha.
  limpaLimites();
  const pedidoDe = id => db.prepare("SELECT pedido, resumo, melhorias FROM pedidos_ia WHERE id = ?").get(id);
  const pb1 = await (await ia(cookieB, {})).json();
  const pb2 = await (await ia(cookieB, { pedido: "Outro pedido da B" })).json();
  dbw.prepare("UPDATE pedidos_ia SET resumo = 'velho' WHERE id IN (?, ?)").run(pb1.historico, pb2.historico);
  const cb1 = await ia(cookieB, { pedido: "texto forjado [falha]", conferir: { grade: 1 }, rodada: pb1.rodada, historico: pb2.historico });
  ok(cb1.status === 200, "conferência com outro \"pedido\" no corpo usa o texto gravado (o [falha] do corpo é ignorado)");
  ok(pedidoDe(pb1.historico).resumo !== "velho" && pedidoDe(pb2.historico).resumo === "velho", "a conferência atualiza o resumo do pedido da rodada, não o do \"historico\" do corpo");
  const saldoB = saldoEmail(B);
  const mb1 = await ia(cookieB, { pedido: "texto forjado [falha]", anterior: { x: 1 }, historico: pb1.historico });
  const mbj1 = await mb1.json();
  ok(mb1.status === 200 && mbj1.historico === pb1.historico && saldoEmail(B) === saldoB, "melhoria com outro \"pedido\" no corpo usa o texto gravado (grátis, 200)");
  ok(pedidoDe(pb1.historico).pedido === "A primeira pessoa não pode trabalhar aos sábados", "o texto gravado do pedido não muda com a melhoria");
  const mb2 = await ia(cookieB, { pedido: "texto forjado [falha]", anterior: { x: 1 }, historico: pb1.historico });
  ok(mb2.status === 200 && saldoEmail(B) === saldoB - 1, "melhoria paga também usa o texto gravado (cobra 1, 200)");

  // Compensação: IA que falha na conferência devolve a reserva; na melhoria grátis, a próxima segue grátis.
  limpaLimites();
  const pb3 = await (await ia(cookieB, { pedido: "Pedido que vai falhar depois" })).json();
  dbw.prepare("UPDATE pedidos_ia SET pedido = 'Pedido gravado [falha]' WHERE id = ?").run(pb3.historico);
  const cf1 = await ia(cookieB, { pedido: "texto limpo", conferir: { grade: 1 }, rodada: pb3.rodada });
  ok(cf1.status === 422 && uso(B).find(r => r.id === pb3.rodada).conferida === 0, "conferência com [falha] no pedido gravado → 422 e a reserva volta (conferida = 0)");
  const saldoB3 = saldoEmail(B);
  const mf1 = await ia(cookieB, { pedido: "texto limpo", anterior: { x: 1 }, historico: pb3.historico });
  ok(mf1.status === 422 && saldoEmail(B) === saldoB3 && pedidoDe(pb3.historico).melhorias === 0, "melhoria grátis com [falha] no pedido gravado → 422, saldo igual e a grátis não é gasta");
  dbw.prepare("UPDATE pedidos_ia SET pedido = 'Pedido gravado' WHERE id = ?").run(pb3.historico);
  const cf2 = await ia(cookieB, { conferir: { grade: 1 }, rodada: pb3.rodada });
  ok(cf2.status === 200 && saldoEmail(B) === saldoB3, "depois da falha a mesma conferência pode ser usada (200, sem custo)");
  const mf2 = await ia(cookieB, { anterior: { x: 1 }, historico: pb3.historico });
  ok(mf2.status === 200 && saldoEmail(B) === saldoB3 && pedidoDe(pb3.historico).melhorias === 1, "depois da falha a próxima melhoria segue grátis");
  const mf3 = await ia(cookieB, { anterior: { x: 1 }, historico: pb3.historico });
  ok(mf3.status === 200 && saldoEmail(B) === saldoB3 - 1, "e a seguinte cobra 1");

  const antesF = saldoEmail(A);
  const fal = await ia(cookieA, { pedido: "quero [falha] agora" });
  ok(fal.status === 422 && saldoEmail(A) === antesF, "IA que falha → 422 e saldo igual ao de antes");
  const rf = uso(A).at(-1);
  ok(rf.ok === 0 && livro(A, "uso").some(m => m.ref === "ia:r" + rf.id) && livro(A, "estorno").some(m => m.ref === "ia:r" + rf.id && m.delta === 1), "falha deixa uso + estorno no livro-razão");

  // Saldo zero → 402 e nenhuma linha nova em uso_ia.
  limpaLimites();
  const sA = saldoEmail(A);
  ok((await credAdm({ email: A, delta: -sA, tipo: "ajuste", ref: "zera-a" })).ok && saldoEmail(A) === 0, "admin zera o saldo (ajuste)");
  const nUso = uso(A).length;
  const z = await ia(cookieA, {});
  const zj = await z.json();
  ok(z.status === 402 && zj.semCredito === true && zj.saldo === 0 && typeof zj.erro === "string" && "recarga" in zj, "sem saldo → 402 com semCredito, saldo e recarga");
  ok(uso(A).length === nUso, "402 não cria linha em uso_ia");
  const cz = await ia(cookieA, { conferir: { grade: 1 }, rodada: p1.rodada });
  ok(cz.status === 409, "sem saldo a conferência já usada segue 409 (não 402)");

  // Duas abas com saldo 1 → só uma passa.
  limpaLimites();
  await credAdm({ email: A, delta: 1, tipo: "ajuste", ref: "um-a" });
  const par = await Promise.all([ia(cookieA, {}), ia(cookieA, {})]);
  const st = par.map(r => r.status).sort();
  ok(st[0] === 200 && st[1] === 402 && saldoEmail(A) === 0, "duas propostas em paralelo com saldo 1 → uma 200 e uma 402");

  console.log("3b2. saldo zerado: modal de recarga, melhorar com histórico");
  {
    const cliente = "cliente@exemplo.com";
    await page.evaluate(() => { window.__corpos = []; const f = window.fetch; window.fetch = (u, o) => { if (o && o.body && /\/api\/ia$/.test(String(u))) window.__corpos.push(JSON.parse(o.body)); return f(u, o); }; });
    await page.click("#btnIA");
    await page.fill("#iaPedido", "A primeira pessoa não pode trabalhar aos sábados");
    limpaLimites();
    await page.click('[data-ia="enviar"]');
    await page.waitForSelector("#iaResultado:not([hidden]) .ia-comp", { timeout: 15000 });
    await page.click('[data-ia="melhorar"]');
    await page.waitForFunction(() => window.__corpos.some(c => c.anterior), null, { timeout: 15000 });
    await page.waitForSelector("#iaResultado:not([hidden]) .ia-comp", { timeout: 15000 });
    const cm = await page.evaluate(() => window.__corpos.find(c => c.anterior));
    const ped = db.prepare("SELECT MAX(p.id) AS id FROM pedidos_ia p JOIN usuarios u ON u.id = p.usuario_id WHERE u.email = ?").get(cliente).id;
    ok(cm.historico === ped, "melhorar manda o historico do pedido original");
    const cf = await page.evaluate(() => window.__corpos.filter(c => c.conferir).map(c => c.rodada));
    ok(cf.length >= 2 && cf.every(Number.isInteger), "conferências mandam a rodada");
    await page.click('#iaActs [value="cancel"]');

    await credAdm({ email: cliente, delta: -saldoEmail(cliente), tipo: "ajuste", ref: "zera-cliente" });
    ok(saldoEmail(cliente) === 0, "admin zerou o saldo do cliente");
    await page.click("#btnIA");
    await page.waitForFunction(() => /^0 pedidos restantes/.test(document.querySelector("#iaSaldo").textContent), null, { timeout: 5000 });
    ok(await page.locator("#iaSaldo a").count() === 0, "sem RECARGA_URL o saldo baixo não tem link de recarga");
    await page.fill("#iaPedido", "Pedido que precisa ficar guardado");
    limpaLimites();
    await page.click('[data-ia="enviar"]');
    await page.waitForSelector("#dlgSemCredito[open]", { timeout: 10000 });
    ok(await page.textContent("#dlgSemCredito h3") === "Seus pedidos à IA acabaram", "modal sem crédito com o título exato");
    ok(/^Você usou todos os pedidos de ajuste com IA\. Recarregue para continuar usando o assistente\. A sua escala e os ajustes à mão continuam funcionando normalmente\.$/.test((await page.textContent("#dlgSemCredito p")).trim()), "modal com o texto exato");
    ok(await page.inputValue("#iaPedido") === "Pedido que precisa ficar guardado" && await page.isVisible("#iaPasso1"), "o texto do pedido continua no passo 1");
    ok(await page.locator('#dlgSemCredito [data-sc="recarregar"]').isHidden(), "sem RECARGA_URL o botão de recarga fica escondido");
    ok((await page.textContent('#dlgSemCredito [data-sc="fechar"]')).trim() === "Agora não", "botão secundário \"Agora não\"");
    await page.click('#dlgSemCredito [data-sc="fechar"]');
    ok(await page.isHidden("#dlgSemCredito") && await page.evaluate(() => document.querySelector("#dlgIA").open), "\"Agora não\" fecha só a modal");
    await page.click('#iaActs [value="cancel"]');

    // Servidor com RECARGA_URL: o botão aponta para ele (mesmo banco e mesma sessão).
    const RECARGA = "https://pagamento.exemplo.com/recarga?x=1";
    const PORTA2 = PORTA + 100;
    const srv2 = spawn(process.execPath, ["server.js"], { cwd: STANDALONE, env: { ...process.env, PORT: String(PORTA2), HOSTNAME: "127.0.0.1", DATA_DIR, ADMIN_KEY, NODE_ENV: "production", EMAIL_DEV_LOG: "1", RESEND_API_KEY: "", ANTHROPIC_API_KEY: "", IA_MOCK: "1", RECARGA_URL: RECARGA }, stdio: "ignore" });
    try {
      for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${PORTA2}/painel/login`); break; } catch { await new Promise(r => setTimeout(r, 200)); } }
      await page.goto(`http://127.0.0.1:${PORTA2}/painel`);
      await page.waitForSelector("#grid [data-p]", { timeout: 15000 });
      ok(await page.evaluate(() => window.J40H_PAINEL.recarga) === RECARGA, "a config do painel leva recarga = RECARGA_URL");
      await page.evaluate(() => sessionStorage.setItem("j40h:revisao-pulada", "1"));
      await page.click("#btnIA");
      await page.waitForFunction(() => /^0 pedidos restantes/.test(document.querySelector("#iaSaldo").textContent), null, { timeout: 5000 });
      ok(await page.getAttribute("#iaSaldo a", "href") === RECARGA, "saldo baixo mostra o link Recarregar");
      await page.fill("#iaPedido", "Outro pedido");
      limpaLimites();
      await page.click('[data-ia="enviar"]');
      await page.waitForSelector("#dlgSemCredito[open]", { timeout: 10000 });
      const bt = page.locator('#dlgSemCredito [data-sc="recarregar"]');
      ok(await bt.isVisible() && await bt.getAttribute("href") === RECARGA && await bt.getAttribute("target") === "_blank" && (await bt.textContent()).trim() === "Recarregar +10 pedidos por R$ 19,90", "botão de recarga aponta para a RECARGA_URL e abre em outra aba");
    } finally { srv2.kill(); }
    await page.goto(BASE + "/painel");
    await page.waitForSelector("#grid [data-p]", { timeout: 15000 });
    await page.evaluate(() => sessionStorage.setItem("j40h:revisao-pulada", "1"));
  }

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
