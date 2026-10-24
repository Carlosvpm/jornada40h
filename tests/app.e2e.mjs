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
  // Estes passos usam a visão por pessoa (uma linha por pessoa); a visão por turno tem a seção 9b.
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem("vistaOk")) { localStorage.setItem("j40h:vista", "pessoa"); sessionStorage.setItem("vistaOk", "1"); } } catch (e) {} });
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

  console.log("5b. custos por simulação (padaria de 5 pessoas, 33 turnos)");
  {
    const p5 = await (await browser.newContext()).newPage();
    await p5.goto(BASE + "/app/#d=" + hash); await p5.waitForSelector("#grid [data-p]");
    const ops = await p5.textContent("#opcoes");
    ok(/Pagar hora extra[\s\S]*não resolve/.test(ops), "hora extra não resolve buraco de 5 h seguidas");
    ok(/meio período de \d+ h/.test(ops) && /turnos em dias específicos/.test(ops), "contratar sugere integral + meio período e explica por quê");
    ok(/33 turnos por semana/.test(await p5.textContent("#explicaTxt")) && /7 pessoas/.test(await p5.textContent("#explicaTxt")), "conta: 33 turnos pedem 7 pessoas");
    ok(/Economia de R\$ [\d.]+\/mês/.test(ops) && /economiza R\$/.test(await p5.textContent("#kpis")), "mostra a economia frente a contratar só em tempo integral");

    console.log("5c. aplicar a saída mais barata com 1 clique");
    const folha0 = await p5.evaluate(() => window.__j40h.metricas(window.__j40h.state).folha);
    await p5.click('[data-acao="contratar"]');
    const r = await p5.evaluate(() => { const J = window.__j40h, s = J.state, m = J.metricas(s); return { falta: m.falta, erros: m.erros, folha: m.folha, parc: s.equipe.filter(p => p.horas).length, plano: s.plano, A: J.calcular(s, "42", "A").falta, B: J.calcular(s, "42", "B").falta }; });
    ok(r.falta <= 0.01 && r.A <= 0.01 && r.B <= 0.01 && !r.erros, "42 h nas semanas A e B cobertas, sem ponto fora da lei (falta " + r.A + "/" + r.B + ")");
    ok(r.parc === 1 && Math.abs(r.folha - folha0 - 4601) < 2, "1 meio período com salário proporcional: folha sobe R$ " + Math.round(r.folha - folha0));
    ok(/Saída aplicada/.test(await p5.textContent("#iaDica")) && r.plano && r.plano.economia > 0, "aviso com antes e depois e economia guardada no plano");
    ok(/Economia com o plano do painel/.test(await p5.textContent("#opcoes")), "card de economia depois de aplicar");
    await p5.click('#iaDica [data-dica="desfazer"]');
    ok(await p5.evaluate(() => window.__j40h.state.equipe.length) === 5, "Desfazer volta para a equipe de 5");
    await p5.close();
  }

  console.log("6. simular contratação");
  const n0 = await page.locator("#grid tbody tr").count();
  const acao = page.locator('[data-acao="contratar"]');
  if (await acao.count()) {
    await acao.click();
    ok(await page.locator("#grid tbody tr").count() > n0, "pessoas novas entram na grade");
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

  console.log("9b. visão por turno");
  await page.click('#vistas [data-vista="turno"]');
  await page.waitForSelector("#grid.por-turno .pc");
  const nomesTurno = await page.$$eval("#grid.por-turno tbody td.p b", els => els.map(e => e.textContent));
  ok(nomesTurno.includes("Abertura") && nomesTurno.includes("Folga"), "linhas por turno: " + nomesTurno.join(", "));
  const est = await page.evaluate(() => window.__j40h.state);
  const trabalhamSeg = est.equipe.filter(p => (est.escalas[est.versao][est.semana][p.id] || {}).seg?.tipo === "turno").length;
  ok(await page.locator('#grid.por-turno tbody tr:not(.g-folga):not(.g-livre) .pc[data-d="seg"]').count() === trabalhamSeg, "cada pessoa que trabalha na segunda aparece num turno");
  await page.locator('#grid.por-turno .g-folga .pc').first().click();
  ok(await page.isVisible("#dlg"), "clicar na pessoa abre a edição do dia dela");
  await page.keyboard.press("Escape");
  ok(/A conta das horas/.test(await page.textContent("#explicaTxt")), "explicação de como a escala foi montada");
  ok(/Valor da hora/.test(await page.textContent("#custoCalc")), "explicação do cálculo dos custos");
  const contaT = await page.textContent("#explicaTxt");
  ok(/A conta dos turnos/.test(contaT) && /turnos por semana/.test(contaT), "explicação da conta dos turnos");
  ok(await page.evaluate(() => localStorage.getItem("j40h:vista")) === "turno", "visão escolhida fica guardada");
  ok(await page.locator('#explicaTxt a.lei[href*="planalto.gov.br"]').count() >= 5, "base legal com link para a lei");
  ok(/CLT, art\. 66/.test(await page.textContent("#explicaTxt")), "explicação cita o artigo do descanso de 11 h");

  console.log("9c. arrastar pessoas no quadro");
  const arrasta = async (de, para) => {
    // A grade é alta (cartões com almoço): centraliza a tela entre origem e destino para os dois caberem.
    await page.evaluate(([de, para]) => {
      const a = document.querySelector(de).getBoundingClientRect(), b = document.querySelector(para).getBoundingClientRect();
      const meio = (Math.min(a.top, b.top) + Math.max(a.bottom, b.bottom)) / 2;
      window.scrollTo({ top: window.scrollY + meio - innerHeight / 2 + 30, behavior: "instant" });
    }, [de, para]);
    const a = await page.locator(de).first().boundingBox(), b = await page.locator(para).first().boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 3 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  };
  const celEst = (id, d) => page.evaluate(([id, d]) => { const s = window.__j40h.state; return (s.escalas[s.versao][s.semana][id] || {})[d] || { tipo: "livre" }; }, [id, d]);
  const folgado = page.locator('#grid.por-turno .g-folga .pc[data-d="ter"]').first();
  const idF = await folgado.getAttribute("data-p");
  await arrasta(`#grid.por-turno .g-folga .pc[data-p="${idF}"][data-d="ter"]`, '#grid.por-turno tr.g-abertura td[data-ad="ter"]');
  const c1 = await celEst(idF, "ter");
  ok(c1.tipo === "turno", "arrastar da folga para a abertura põe a pessoa no turno (" + JSON.stringify(c1) + ")");
  ok(!(await page.isVisible("#dlg")), "arrastar não abre a edição");
  ok(await page.isVisible("#iaDica") && /Desfazer/.test(await page.textContent("#iaDica")), "mostra o que mudou com opção de desfazer");
  await page.click('#iaDica [data-dica="desfazer"]');
  ok((await celEst(idF, "ter")).tipo === "folga", "desfazer volta a folga");
  const trab = page.locator('#grid.por-turno tr.g-abertura .pc[data-d="seg"]').first();
  const idT = await trab.getAttribute("data-p");
  let dAlvo = null;
  for (const d of ["ter", "qua", "qui", "sex", "sab"]) if ((await celEst(idT, d)).tipo === "turno") { dAlvo = d; break; }
  await arrasta(`#grid.por-turno tr.g-abertura .pc[data-p="${idT}"][data-d="seg"]`, `#grid.por-turno tr.g-folga td[data-ad="${dAlvo}"]`);
  const seg2 = await celEst(idT, "seg"), alvo2 = await celEst(idT, dAlvo);
  ok(alvo2.tipo === "folga" && seg2.tipo === "turno", `arrastar para a folga de outro dia troca os dois dias (seg ${seg2.tipo}, ${dAlvo} ${alvo2.tipo})`);
  const folgasDepois = await page.evaluate(id => { const s = window.__j40h.state; return Object.values(s.escalas[s.versao][s.semana][id]).filter(c => c.tipo !== "turno").length; }, idT);
  ok(folgasDepois >= 2, "a troca entre dias mantém as folgas da semana");
  await page.click('#vistas [data-vista="pessoa"]');

  console.log("10. celular");
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/app/#d=" + hash);
  await m.waitForSelector("#grid [data-p]");
  const largura = await m.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= 390, "sem rolagem horizontal da página no celular (" + largura + "px)");
  if (SHOTS) await m.screenshot({ path: path.join(SHOTS, "app-mobile.png"), fullPage: true });

  console.log("11. sem link: abre exemplo");
  const p2 = await (await browser.newContext()).newPage();
  await p2.goto(BASE + "/app/");
  await p2.waitForSelector("#grid [data-p]");
  ok(await p2.evaluate(() => document.querySelector("#cfg").open), "exemplo abre com a configuração aberta");

  ok(!erros.length, "sem erro de JavaScript" + (erros.length ? ": " + erros.join(" | ") : ""));
} finally {
  await browser.close();
  server.close();
}
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo ok");
process.exit(falhas ? 1 : 0);
