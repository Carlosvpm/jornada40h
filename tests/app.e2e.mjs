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

  console.log("12. virada do rodízio (domingo da B → segunda da A)");
  const virada = await p2.evaluate(() => {
    const J = window.__j40h, D = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
    const T = { tipo: "turno", inicio: "08:00", fim: "17:00" }, F = { tipo: "folga" };
    // Mercado fictício: 9 pessoas, 4 ao mesmo tempo, 7 dias (o motor sem o reparo deixava alguém 8 dias seguidos).
    const f = {};
    D.forEach(d => { f[d] = { abre: d === "qui" || d === "sex" || d === "dom" ? "07:00" : "07:30", fecha: d === "dom" ? "12:00" : d === "sex" ? "19:00" : "20:00", pessoas: 4 }; });
    const s = { negocio: { nome: "Mercado Exemplo", tipo: "Mercado" }, funcionamento: f, custos: { salario: 1621, encargos: 1.7, he: 50 }, versao: "42", semana: "A", intervalo: "fora",
      equipe: Array.from({ length: 9 }, (_, i) => ({ id: "p" + i, nome: "Pessoa " + (i + 1), funcao: "" })) };
    J.gerarTudo(s);
    const erros = s2 => ["40", "42"].flatMap(v => ["A", "B"].flatMap(w => J.calcular(s2, v, w).erros));
    const montada = erros(s);
    // Grade à mão: folga seg/ter na A e sáb/dom na B. Da quarta da A ao domingo da B são 10 dias seguidos.
    const g = { A: { p0: {} }, B: { p0: {} } };
    D.forEach(d => { g.A.p0[d] = d === "seg" || d === "ter" ? F : T; g.B.p0[d] = d === "sab" || d === "dom" ? F : T; });
    const m = { negocio: s.negocio, funcionamento: f, custos: s.custos, versao: "42", semana: "B", intervalo: "fora",
      equipe: [{ id: "p0", nome: "Ana", funcao: "" }], escalas: { 42: g, 40: g } };
    return { montada, manual: J.calcular(m, "42", "B").erros.concat(J.calcular(m, "42", "A").erros) };
  });
  ok(!virada.montada.some(e => /dias seguidos|semana [AB]/.test(e)), "escala montada sem mais de 6 dias seguidos na virada" + (virada.montada.length ? ": " + virada.montada[0] : ""));
  ok(virada.manual.some(e => /Ana trabalha 10 dias seguidos, de quarta da semana A a sexta da semana B/.test(e)), "alerta de dias seguidos na virada A → B");

  console.log("13. regressão da montagem (contas sem os campos novos)");
  const montagens = await p2.evaluate(est => {
    const J = window.__j40h, D = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"], out = {};
    const base = { custos: { salario: 1800, encargos: 1.7, he: 50 }, versao: "42", semana: "A", intervalo: "fora" };
    const mercado = {}; D.forEach(d => { mercado[d] = { abre: d === "qui" || d === "sex" || d === "dom" ? "07:00" : "07:30", fecha: d === "dom" ? "12:00" : d === "sex" ? "19:00" : "20:00", pessoas: 4 }; });
    const padaria = {}; D.forEach(d => { padaria[d] = d === "dom" ? { abre: "07:00", fecha: "13:00", pessoas: 2 } : { abre: "06:00", fecha: "19:00", pessoas: 2 }; });
    const casos = {
      topo: Object.assign({}, base, JSON.parse(JSON.stringify(est))),
      mercado: Object.assign({}, base, { negocio: { nome: "Mercado Exemplo", tipo: "Mercado" }, funcionamento: mercado, equipe: Array.from({ length: 9 }, (_, i) => ({ id: "p" + i, nome: "Pessoa " + (i + 1), funcao: "" })) }),
      padaria: Object.assign({}, base, { negocio: { nome: "Padaria Exemplo", tipo: "Padaria" }, funcionamento: padaria, equipe: ["Ana", "Bia", "Caio", "Duda", "Edu"].map((n, i) => ({ id: "p" + i, nome: n, funcao: "atendente" })) }),
    };
    for (const k in casos) { J.gerarTudo(casos[k]); out[k] = JSON.stringify(casos[k].escalas); }
    return out;
  }, estado);
  const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "app-base.json");
  if (process.env.GRAVAR) { fs.writeFileSync(FIX, JSON.stringify(montagens, null, 1)); console.log("  fixture gravada"); }
  else {
    const base = JSON.parse(fs.readFileSync(FIX, "utf8"));
    const dif = Object.keys(base).filter(k => base[k] !== montagens[k]);
    ok(!dif.length, "mesma escala de antes" + (dif.length ? ": " + dif.join(", ") : ""));
  }

  console.log("14. par que não folga junto e domingo da mulher");
  const D7 = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
  const sete = {}; D7.forEach(d => { sete[d] = { abre: "06:00", fecha: "19:00", pessoas: 2 }; });
  const baseP = { negocio: { nome: "Padaria Exemplo", tipo: "Padaria" }, funcionamento: sete, custos: { salario: 1800, encargos: 1.7, he: 50 }, versao: "42", semana: "A", intervalo: "fora" };
  const r14 = await p2.evaluate(([b, D]) => {
    const J = window.__j40h, c = o => JSON.parse(JSON.stringify(o)), out = {};
    const n = J.normalizar(Object.assign(c(b), { equipe: [{ id: "p0", nome: "Ana", naoFolgaCom: ["p1", "zz", "p0"] }, { id: "p1", nome: "Bia" }, { id: "p2", nome: "Caio", sexo: "X" }] }));
    out.norm = n.equipe.map(p => [p.naoFolgaCom, p.sexo]);
    const par = Object.assign(c(b), { equipe: ["Ana", "Bia", "Caio", "Duda", "Edu"].map((x, i) => ({ id: "p" + i, nome: x, funcao: "atendente", naoFolgaCom: i === 0 ? ["p1"] : i === 1 ? ["p0"] : [] })) });
    J.gerarTudo(par);
    out.par = ["42", "40"].flatMap(v => ["A", "B"].flatMap(w => J.conflitosPar(par, v, w)));
    const dup = Object.assign(c(b), { equipe: ["Ana", "Ana", "Caio", "Duda", "Edu"].map((x, i) => ({ id: "p" + i, nome: x, funcao: "", naoFolgaCom: i === 0 ? ["p2"] : i === 2 ? ["p0"] : [] })) });
    J.gerarTudo(dup);
    out.dup = ["42", "40"].flatMap(v => ["A", "B"].flatMap(w => J.conflitosPar(dup, v, w)));
    const merc = {}; D.forEach(d => { merc[d] = { abre: "07:00", fecha: d === "dom" ? "12:00" : "20:00", pessoas: 4 }; });
    const mu = Object.assign(c(b), { funcionamento: merc, equipe: Array.from({ length: 9 }, (_, i) => ({ id: "p" + i, nome: "Pessoa " + (i + 1), funcao: "", sexo: i < 4 ? "F" : "" })) });
    J.gerarTudo(mu);
    out.mulher = ["42", "40"].flatMap(v => J.mulheresSemDomingo(mu, v));
    // Grade à mão: Ana (mulher) trabalha os dois domingos; Caio (homem) também.
    const T = { tipo: "turno", inicio: "06:00", fim: "15:00" }, F = { tipo: "folga" }, g = {};
    ["A", "B"].forEach(w => { g[w] = {}; ["p0", "p2"].forEach(id => { g[w][id] = {}; D.forEach(d => { g[w][id][d] = d === "seg" || d === "ter" ? F : T; }); }); });
    const dom = Object.assign(c(b), { equipe: [{ id: "p0", nome: "Ana", funcao: "", sexo: "F" }, { id: "p2", nome: "Caio", funcao: "" }], escalas: { 42: g, 40: c(g) } });
    out.lei = J.problemasLei(dom, "42").map(x => x.txt);
    out.domingo = J.metricas(dom).domingo;
    return out;
  }, [baseP, D7]);
  ok(JSON.stringify(r14.norm) === JSON.stringify([[["p1"], ""], [["p0"], ""], [[], ""]]), "normalizar simetriza o par, tira id inexistente e sexo inválido: " + JSON.stringify(r14.norm));
  ok(!r14.par.length, "escala montada sem o par folgando junto" + (r14.par.length ? ": " + JSON.stringify(r14.par) : ""));
  ok(!r14.dup.length, "nomes repetidos: par respeitado" + (r14.dup.length ? ": " + JSON.stringify(r14.dup) : ""));
  ok(!r14.mulher.length, "4 mulheres no mercado: todas folgam domingo em A ou B" + (r14.mulher.length ? ": " + r14.mulher.join(", ") : ""));
  ok(r14.lei.some(t => /Ana/.test(t) && /CLT, art\. 386/.test(t)) && r14.lei.some(t => /Caio/.test(t) && /10\.101/.test(t) && !/Ana/.test(t)), "alerta da mulher cita o art. 386 e o geral fica só com o homem");
  ok(r14.domingo === 2, "métrica de domingo continua contando todos");
  // Pela tela: grade à mão com Ana e Bia de folga na quinta da A; Bia em meio período.
  {
    const T = { tipo: "turno", inicio: "06:00", fim: "15:00" }, F = { tipo: "folga" }, g = { A: {}, B: {} };
    ["p0", "p1"].forEach(id => ["A", "B"].forEach(w => { g[w][id] = {}; D7.forEach(d => { g[w][id][d] = (w === "A" ? ["qui", "dom"] : ["seg", "ter"]).includes(d) ? (id === "p0" && w === "A" && d === "dom" ? T : F) : T; }); }));
    g.A.p0.sab = F;
    const est = Object.assign({}, baseP, { equipe: [{ id: "p0", nome: "Ana", funcao: "", naoFolgaCom: ["p1"] }, { id: "p1", nome: "Bia", funcao: "", horas: 20, naoFolgaCom: ["p0"] }], escalas: { 42: g, 40: JSON.parse(JSON.stringify(g)) } });
    const p3 = await (await browser.newContext()).newPage();
    const e3 = []; p3.on("pageerror", e => e3.push(e.message));
    await p3.goto(BASE + "/app/#d=" + Buffer.from(JSON.stringify(est)).toString("base64url"));
    await p3.waitForSelector("#grid [data-p], #grid button.cell");
    const txt = await p3.textContent("#alertas");
    ok(/Ana e Bia folgam no mesmo dia \(quinta, semana A\), mas foram marcadas para não folgar juntas\./.test(txt), "alerta do par na tela");
    ok(await p3.evaluate(() => window.__j40h.metricas(window.__j40h.state).pares) === 3, "métrica conta as 3 folgas juntas (qui da A; seg e ter da B)");
    ok(!e3.length, "par com meio período sem erro de JavaScript" + (e3.length ? ": " + e3.join(" | ") : ""));
    await p3.close();
  }

  console.log("15. cadastro: sexo e não folgar junto");
  {
    const p4 = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
    await p4.addInitScript(() => { try { localStorage.setItem("j40h:vista", "pessoa"); } catch (e) {} });
    const e4 = []; p4.on("pageerror", e => e4.push(e.message));
    await p4.goto(BASE + "/app/#d=" + hash);
    await p4.waitForSelector("#grid button.cell");
    await p4.click('#grid [data-pessoa="p0"]');
    await p4.selectOption("#pSexo", "F");
    await p4.check('#pJuntos [data-pj="p1"]', { force: true });
    await p4.click('#dlgPForm button[value="ok"]');
    const st = await p4.evaluate(() => { const s = window.__j40h.state; return { a: s.equipe[0], b: s.equipe[1], pend: !!s.pendente }; });
    ok(st.a.sexo === "F" && JSON.stringify(st.a.naoFolgaCom) === '["p1"]' && JSON.stringify(st.b.naoFolgaCom) === '["p0"]', "salvar grava sexo e o par dos dois lados");
    ok(st.pend, "mudança de sexo/par pede para montar de novo");
    await p4.click('#grid [data-pessoa="p1"]');
    ok(await p4.isChecked('#pJuntos [data-pj="p0"]'), "ficha da Bia mostra a Ana marcada");
    await p4.click("#pRemover"); await p4.click("#pRemover");
    const rest = await p4.evaluate(() => window.__j40h.state.equipe[0].naoFolgaCom);
    ok(Array.isArray(rest) && !rest.length, "remover a Bia tira ela do par da Ana");
    ok(!e4.length, "cadastro sem erro de JavaScript" + (e4.length ? ": " + e4.join(" | ") : ""));
    await p4.close();
  }

  console.log("16. proposta da IA com sexo e par");
  {
    const r16 = await p2.evaluate(b => {
      const J = window.__j40h, base = Object.assign(JSON.parse(JSON.stringify(b)), { equipe: [
        { id: "p0", nome: "Ana", funcao: "", sexo: "F", naoFolgaCom: [] }, { id: "p1", nome: "Bia", funcao: "" }, { id: "p2", nome: "Caio", funcao: "", sexo: "M" }] });
      J.gerarTudo(base);
      const eq = base.equipe.map(p => ({ id: p.id, nome: p.nome, funcao: "", salario: 0, horas: 0, folgaFixa: "", naoPode: [] }));
      const com = J.aplicarProposta({ equipe: eq.map((p, i) => Object.assign({}, p, i === 0 ? { sexo: "F", naoFolgaCom: ["p1"] } : { sexo: "", naoFolgaCom: [] })), remontar: true, celulas: [] }, base);
      const sem = J.aplicarProposta({ equipe: eq, remontar: true, celulas: [] }, base);
      const sm = J.semanasIA(com);
      return { com: com.equipe.map(p => [p.sexo, p.naoFolgaCom]), sem: sem.equipe.map(p => [p.sexo, p.naoFolgaCom || []]),
        conf: ["A", "B"].every(w => Array.isArray(sm[w].paresFolgandoJuntos)) && Array.isArray(sm.mulheresSemDomingoNasSemanasAeB) };
    }, baseP);
    ok(JSON.stringify(r16.com) === JSON.stringify([["F", ["p1"]], ["", ["p0"]], ["", []]]), "proposta grava sexo e o par dos dois lados: " + JSON.stringify(r16.com));
    ok(r16.conf, "conferência da IA recebe pares e mulheres sem domingo por semana");
    ok(JSON.stringify(r16.sem) === JSON.stringify([["F", []], ["", []], ["M", []]]), "proposta sem os campos mantém os valores antigos: " + JSON.stringify(r16.sem));
  }

  console.log("17. revisão final");
  {
    const r17 = await p2.evaluate(b => {
      const J = window.__j40h, base = Object.assign(JSON.parse(JSON.stringify(b)), { equipe: [
        { id: "p0", nome: "Ana", funcao: "", naoFolgaCom: ["p1"] }, { id: "p1", nome: "Bia", funcao: "", naoFolgaCom: ["p0"] }, { id: "p2", nome: "Caio", funcao: "" }] });
      J.gerarTudo(base);
      const eq = base.equipe.map(p => ({ id: p.id, nome: p.nome, funcao: "", salario: 0, horas: 0, folgaFixa: "", naoPode: [], sexo: "", naoFolgaCom: p.id === "p1" ? ["p0"] : [] }));
      return J.aplicarProposta({ equipe: eq, remontar: true, celulas: [] }, base).equipe.map(p => p.naoFolgaCom);
    }, baseP);
    const r17b = await p2.evaluate(([b, D]) => {
      const J = window.__j40h, merc = {};
      D.forEach(d => { merc[d] = { abre: "07:00", fecha: d === "dom" ? "13:00" : "20:00", pessoas: 3 }; });
      const s = Object.assign(JSON.parse(JSON.stringify(b)), { funcionamento: merc, equipe: Array.from({ length: 5 }, (_, i) => ({ id: "p" + i, nome: "Pessoa " + (i + 1), funcao: "" }))
        .concat([{ id: "p9", nome: "Bia", funcao: "", sexo: "F", horas: 24 }]) });
      J.gerarTudo(s);
      return { sem: ["42", "40"].flatMap(v => J.mulheresSemDomingo(s, v)), dom: ["A", "B"].map(w => (s.escalas["42"][w].p9 || {}).dom) };
    }, [baseP, D7]);
    ok(!r17b.sem.length, "mulher em meio período folga no domingo em A ou B: " + JSON.stringify(r17b.dom));
    ok(JSON.stringify(r17) === "[[],[],[]]", "IA tirar o par de um lado só desfaz o par: " + JSON.stringify(r17));
  }

  console.log("18. intervalo de 2 h");
  const durMin = c => { const m = h => parseInt(h) * 60 + +h.slice(3); let a = m(c.inicio), b = m(c.fim); if (b <= a) b += 1440; return b - a; };
  {
    const r18 = await p2.evaluate(b => {
      const J = window.__j40h, c = o => JSON.parse(JSON.stringify(o));
      const norm = [undefined, 120, 90].map(x => J.normalizar(Object.assign(c(b), { intervaloMin: x, equipe: [{ id: "p0", nome: "Ana" }] })).intervaloMin);
      const eq = ["Ana", "Bia", "Caio", "Duda", "Edu"].map((n, i) => ({ id: "p" + i, nome: n, funcao: "" }));
      const s = Object.assign(c(b), { intervaloMin: 120, equipe: eq });
      J.gerarTudo(s);
      const cels = ["A", "B"].flatMap(w => eq.flatMap(p => Object.values(s.escalas["42"][w][p.id]).filter(x => x.tipo === "turno")));
      const horas = ["A", "B"].flatMap(w => J.calcular(s, "42", w).pessoas.map(p => p.horas));
      const d1 = Object.assign(c(b), { intervalo: "dentro", intervaloMin: 120, equipe: c(eq) }), d2 = Object.assign(c(b), { intervalo: "dentro", intervaloMin: 60, equipe: c(eq) });
      J.gerarTudo(d1); J.gerarTudo(d2);
      return { norm, cels, horas, dentro: JSON.stringify(d1.escalas) === JSON.stringify(d2.escalas) };
    }, baseP);
    ok(JSON.stringify(r18.norm) === "[60,120,60]", "normalizar: intervaloMin 60 por padrão, 120 quando escolhido: " + JSON.stringify(r18.norm));
    ok(r18.cels.length && r18.cels.every(x => durMin(x) === 624 || x.rotulo === "Turno único"), "2 h: turno de quem é integral = 8h24 + 2 h na loja");
    ok(r18.horas.every(h => h <= 42 + 1e-9), "2 h: ninguém passa de 42 h");
    ok(r18.dentro, "almoço dentro do turno: intervaloMin não muda nada");

    const est18 = Object.assign({}, baseP, { intervalo: "fora", equipe: ["Ana", "Bia", "Caio", "Duda", "Edu"].map((n, i) => ({ id: "p" + i, nome: n, funcao: "" })) });
    const p6 = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
    await p6.addInitScript(() => { try { localStorage.setItem("j40h:vista", "pessoa"); } catch (e) {} });
    const e6 = []; p6.on("pageerror", e => e6.push(e.message));
    await p6.goto(BASE + "/app/#d=" + Buffer.from(JSON.stringify(est18)).toString("base64url"));
    await p6.waitForSelector("#grid button.cell");
    const antes18 = await p6.evaluate(() => JSON.stringify(window.__j40h.state.escalas));
    await p6.click("#cfg > summary");
    await p6.selectOption("#fIntervalo", "120");
    const st18 = await p6.evaluate(() => { const s = window.__j40h.state; return { im: s.intervaloMin, t: s.escalas["42"].A.p0 }; });
    ok(st18.im === 120 && Object.values(st18.t).some(x => x.tipo === "turno" && durMin(x) === 624), "trocar para 2 h remonta a escala");
    const alms = await p6.$$eval("#grid small.alm", xs => xs.map(x => x.textContent));
    const dif = t => { const m = t.match(/(\d+)h(\d\d)?–(\d+)h(\d\d)?/); return m ? (+m[3] * 60 + +(m[4] || 0)) - (+m[1] * 60 + +(m[2] || 0)) : -1; };
    ok(alms.length && alms.every(t => dif(t) === 120), "grade mostra almoço de 2 h: " + alms.slice(0, 3).join(", "));
    await p6.click('[data-dica="desfazer"]');
    ok(await p6.evaluate(a => window.__j40h.state.intervaloMin === 60 && JSON.stringify(window.__j40h.state.escalas) === a, antes18), "Desfazer volta para 1 h e a escala de antes");
    await p6.goto(BASE + "/app/#d=" + Buffer.from(JSON.stringify(Object.assign({}, est18, { intervalo: "dentro" }))).toString("base64url"));
    await p6.reload();
    await p6.waitForSelector("#grid button.cell");
    ok(await p6.isDisabled("#fIntervalo"), "almoço dentro do turno: escolha do intervalo desativada");
    ok(!e6.length, "intervalo sem erro de JavaScript" + (e6.length ? ": " + e6.join(" | ") : ""));
    await p6.close();
  }

  console.log("19. jornada própria");
  {
    const r19 = await p2.evaluate(b => {
      const J = window.__j40h, c = o => JSON.parse(JSON.stringify(o)), out = {};
      out.norm = ["6", 9, 0, undefined].map(x => J.normalizar(Object.assign(c(b), { equipe: [{ id: "p0", nome: "Ana", horasDia: x }] })).equipe[0].horasDia);
      const eq = extra => ["Ana", "Bia", "Caio", "Duda", "Edu"].map((n, i) => Object.assign({ id: "p" + i, nome: n, funcao: "" }, i === 0 ? extra : {}));
      const s = J.normalizar(Object.assign(c(b), { equipe: eq({ horasDia: 6 }) }));
      const dur = x => { const m = h => parseInt(h) * 60 + +h.slice(3); let a = m(x.inicio), e = m(x.fim); if (e <= a) e += 1440; return e - a; };
      out.ana = ["42", "40"].flatMap(v => ["A", "B"].map(w => {
        const cs = Object.values(s.escalas[v][w].p0), ts = cs.filter(x => x.tipo === "turno");
        return { durs: ts.map(dur), folgas: cs.length - ts.length, horas: J.calcular(s, v, w).pessoas[0].horas };
      }));
      const s24 = J.normalizar(Object.assign(c(b), { equipe: eq({ horasDia: 6, horas: 24 }) }));
      out.lim24 = ["A", "B"].map(w => { const p = J.calcular(s24, "42", w).pessoas[0]; return [p.limite, p.horas]; });
      const s8 = J.normalizar(Object.assign(c(b), { equipe: eq({ horasDia: 8 }) }));
      out.j8 = [J.jornadaPropria(s8.equipe[0], "40"), J.jornadaPropria(s8.equipe[0], "42")];
      out.j8dur = Object.values(s8.escalas["42"].A.p0).filter(x => x.tipo === "turno").map(dur);
      const sem = J.normalizar(Object.assign(c(b), { equipe: eq({}) }));
      out.folha = [J.metricas(sem).folha, J.metricas(s).folha];
      const ed = c(s); ed.escalas["42"].A.p0.seg = { tipo: "turno", inicio: "06:00", fim: "15:00", rotulo: "" };
      out.aviso = J.calcular(ed, "42", "A").avisos;
      return out;
    }, baseP);
    ok(JSON.stringify(r19.norm) === "[6,8.4,null,null]", "normalizar horasDia: " + JSON.stringify(r19.norm));
    ok(r19.ana.every(x => x.durs.length && x.durs.every(d => d === 375) && x.folgas === 2 && x.horas <= 30 + 1e-9), "Ana com 6 h por dia em 42/40, A/B, mesmo depois dos reparos: " + JSON.stringify(r19.ana));
    ok(r19.lim24.every(([l, h]) => l === 24 && h <= 24 + 1e-9), "horas por semana menor limita a semana: " + JSON.stringify(r19.lim24));
    ok(JSON.stringify(r19.j8) === "[false,true]" && r19.j8dur.every(d => d === 540), "8 h por dia: integral na de 40 h, jornada própria na de 42 h");
    const esperado = 1800 * 1.7 * (1 - 30 / 42);
    ok(Math.abs(r19.folha[0] - r19.folha[1] - esperado) < 1, "custo proporcional às 30 h: " + JSON.stringify(r19.folha));
    ok(r19.aviso.some(a => /Ana faz 8 h na segunda: acima da jornada própria de 6 h por dia/.test(a)), "aviso de dia acima da jornada própria: " + JSON.stringify(r19.aviso));

    const p7 = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
    await p7.addInitScript(() => { try { localStorage.setItem("j40h:vista", "pessoa"); } catch (e) {} });
    const e7 = []; p7.on("pageerror", e => e7.push(e.message));
    await p7.goto(BASE + "/app/#d=" + hash);
    await p7.waitForSelector("#grid button.cell");
    await p7.click('#grid [data-pessoa="p0"]');
    await p7.fill("#pHorasDia", "6");
    await p7.click('#dlgPForm button[value="ok"]');
    const st19 = await p7.evaluate(() => { const s = window.__j40h.state; return { hd: s.equipe[0].horasDia, pend: !!s.pendente }; });
    ok(st19.hd === 6 && st19.pend, "ficha grava horas por dia e pede para montar de novo");
    ok((await p7.textContent('#equipeStrip [data-pessoa="p0"]')).includes("6 h/dia"), "chip mostra 6 h/dia");
    ok(!e7.length, "jornada própria sem erro de JavaScript" + (e7.length ? ": " + e7.join(" | ") : ""));
    await p7.close();
  }

  console.log("20. IA: jornada e intervalo");
  {
    const r20 = await p2.evaluate(b => {
      const J = window.__j40h, c = o => JSON.parse(JSON.stringify(o));
      const s = J.normalizar(Object.assign(c(b), { equipe: ["Ana", "Bia", "Caio"].map((n, i) => Object.assign({ id: "p" + i, nome: n, funcao: "" }, i === 0 ? { horasDia: 6, horas: 24 } : {})) }));
      const ctx = J.contextoIA(s);
      const igual = J.aplicarProposta({ funcionamento: ctx.funcionamento, equipe: ctx.equipe, intervaloMin: ctx.regras.intervaloMin, remontar: true, celulas: [] }, s);
      const semCampo = J.aplicarProposta({ equipe: ctx.equipe.map(p => { const q = Object.assign({}, p); delete q.horasDia; return q; }), remontar: true, celulas: [] }, s);
      const dois = J.aplicarProposta({ equipe: ctx.equipe, intervaloMin: 120, remontar: true, celulas: [] }, s);
      const dur = x => { const m = h => parseInt(h) * 60 + +h.slice(3); let a = m(x.inicio), e = m(x.fim); if (e <= a) e += 1440; return e - a; };
      return { ctx: [ctx.equipe[0].horasDia, ctx.equipe[0].horas, ctx.regras.intervaloMin], igual: [igual.equipe[0].horasDia, igual.equipe[0].horas, igual.intervaloMin],
        semCampo: semCampo.equipe[0].horasDia, dois: [dois.intervaloMin, Object.values(dois.escalas["42"].A.p1).some(x => x.tipo === "turno" && dur(x) === 624)] };
    }, baseP);
    ok(JSON.stringify(r20.ctx) === "[6,24,60]", "contexto da IA leva horasDia, horas e intervaloMin: " + JSON.stringify(r20.ctx));
    ok(JSON.stringify(r20.igual) === "[6,24,60]", "proposta sem mudança mantém a jornada própria: " + JSON.stringify(r20.igual));
    ok(r20.semCampo === 6, "proposta sem horasDia mantém o antigo");
    ok(JSON.stringify(r20.dois) === "[120,true]", "proposta com intervalo de 2 h remonta: " + JSON.stringify(r20.dois));
  }

  console.log("21. revisão final");
  {
    const r21 = await p2.evaluate(est => {
      const J = window.__j40h, c = o => JSON.parse(JSON.stringify(o)), out = {};
      const erros = (s, nomes) => ["42", "40"].flatMap(v => ["A", "B"].flatMap(w => J.calcular(s, v, w).erros.filter(e => nomes.some(n => e.startsWith(n + " ")))));
      const a7 = J.normalizar(Object.assign(c(est), { intervalo: "fora", equipe: c(est.equipe).map((p, i) => Object.assign(p, i === 0 ? { horasDia: 7 } : {})) }));
      out.descanso = erros(a7, ["Ana"]);
      const par = J.normalizar(Object.assign(c(est), { intervalo: "fora", equipe: c(est.equipe).map((p, i) => Object.assign(p, i === 0 ? { horasDia: 7 } : i === 1 ? { horasDia: 7, horas: 20 } : {})) }));
      out.semana = erros(par, ["Ana", "Bia"]);
      const curto = {}; ["seg", "ter", "qua", "qui", "sex", "sab", "dom"].forEach(d => { curto[d] = { abre: "07:00", fecha: "15:00", pessoas: 1 }; });
      const sc = J.normalizar(Object.assign(c(est), { funcionamento: curto, intervalo: "fora", equipe: c(est.equipe).map((p, i) => Object.assign(p, i === 0 ? { horasDia: 6 } : {})) }));
      out.dia = J.turnoDoGrupo("dia", "seg", "", sc.equipe[0], sc);
      return out;
    }, estado);
    ok(!r21.descanso.length, "Ana com 7 h por dia sem erro de descanso: " + JSON.stringify(r21.descanso));
    ok(!r21.semana.length, "mesmo tamanho de turno com limites diferentes: ninguém passa da semana: " + JSON.stringify(r21.semana));
    const dd = r21.dia ? durMin(r21.dia) : 0;
    ok(dd > 0 && dd <= 375, "arrastar para o turno do dia respeita a jornada própria: " + JSON.stringify(r21.dia));
    const p8 = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
    await p8.addInitScript(() => { try { localStorage.setItem("j40h:vista", "pessoa"); } catch (e) {} });
    await p8.goto(BASE + "/app/#d=" + Buffer.from(JSON.stringify(Object.assign({}, estado, { intervalo: "fora" }))).toString("base64url"));
    await p8.waitForSelector("#grid button.cell");
    await p8.click("#cfg > summary");
    await p8.selectOption("#fIntervalo", "120");
    ok((await p8.textContent("#gradeNota")).includes("2 h de almoço"), "nota da grade fala em 2 h de almoço");
    ok((await p8.textContent("#iaDica")).includes("2 h de almoço") && !(await p8.textContent("#iaDica")).includes("mais longo"), "dica da troca diz o almoço novo, sem 'mais longo'");
    await p8.close();
  }

  console.log("22. funções e picos (dados)");
  {
    const r22 = await p2.evaluate(est => {
      const J = window.__j40h, c = o => JSON.parse(JSON.stringify(o)), out = {};
      const n = J.normalizar(Object.assign(c(est), { intervalo: "fora", picos: [
        { dias: ["seg"], inicio: "11:00", fim: "14:00", funcao: "zz", pessoas: 0 },
        { dias: ["seg"], inicio: "11:00", fim: "11:00", funcao: "", pessoas: 1 },
        { dias: ["seg"], inicio: "xx", fim: "14:00", funcao: "", pessoas: 1 }] }));
      out.funcoes = n.funcoes.map(f => f.nome).sort();
      out.ids = new Set(n.funcoes.map(f => f.id)).size;
      out.picos = n.picos.map(p => [p.funcao, p.pessoas]);
      const cx = n.funcoes.find(f => f.nome === "caixa").id;
      const comP = picos => J.normalizar(Object.assign(c(est), { intervalo: "fora", funcoes: n.funcoes, picos }));
      const sT = comP([{ dias: ["seg"], inicio: "11:00", fim: "14:00", funcao: "", pessoas: 4 }]);
      const sC = comP([{ dias: ["seg"], inicio: "11:00", fim: "14:00", funcao: cx, pessoas: 1 }]);
      out.nec = [J.necessidade(sT, "seg", 720).total, J.necessidade(sT, "seg", 600).total, J.necessidade(sC, "seg", 720).porFuncao.caixa];
      const s0 = comP([]);
      out.falta = [J.calcular(s0, "42", "A").dias.seg.blocos.filter(b => b.need === 4).length, J.calcular(sT, "42", "A").dias.seg.blocos.filter(b => b.need === 4).length];
      const sF = comP([{ dias: ["seg"], inicio: "18:00", fim: "20:00", funcao: "", pessoas: 5 }]);
      out.fora = J.calcular(sF, "42", "A").dias.seg.blocos.filter(b => b.need === 5).length;
      return out;
    }, estado);
    ok(JSON.stringify(r22.funcoes) === '["atendente","caixa"]' && r22.ids === 2, "funções nascem da equipe: " + JSON.stringify(r22.funcoes));
    ok(JSON.stringify(r22.picos) === '[["",1]]', "pico com função inexistente vira qualquer; inválidos somem: " + JSON.stringify(r22.picos));
    ok(JSON.stringify(r22.nec) === "[4,2,1]", "necessidade: total e por função: " + JSON.stringify(r22.nec));
    ok(r22.falta[0] === 0 && r22.falta[1] === 6, "pico entra na necessidade da cobertura: " + JSON.stringify(r22.falta));
    ok(r22.fora === 2, "pico depois do fechamento conta só no aberto");
  }

  console.log("22b. almoço fora do pico e alerta de pico");
  {
    const r = await p2.evaluate(est => {
      const J = window.__j40h, c = o => JSON.parse(JSON.stringify(o)), out = {};
      const n = J.normalizar(Object.assign(c(est), { intervalo: "fora" }));
      const cx = n.funcoes.find(f => f.nome === "caixa").id;
      const com = (picos, extra) => J.normalizar(Object.assign(c(est), { intervalo: "fora", funcoes: n.funcoes, picos }, extra || {}));
      const s1 = com([{ dias: ["seg", "ter", "qua", "qui", "sex"], inicio: "11:00", fim: "14:00", funcao: cx, pessoas: 1 }]);
      out.pico1 = ["42", "40"].flatMap(v => ["A", "B"].flatMap(w => J.calcular(s1, v, w).picos.map(x => v + w + x.d + ":" + x.ini)));
      const s3 = com([{ dias: ["seg"], inicio: "11:00", fim: "14:00", funcao: cx, pessoas: 3 }]);
      out.m3 = J.metricas(s3).picos; out.m0 = J.metricas(com([])).picos;
      out.prob = J.problemas(J.metricas(com([])), J.metricas(s3));
      const fs2 = n.funcoes.concat([{ id: "pd", nome: "padeiro" }]);
      const sp = J.normalizar(Object.assign(c(est), { intervalo: "fora", funcoes: fs2, picos: [{ dias: ["ter"], inicio: "06:00", fim: "08:00", funcao: "pd", pessoas: 1 }] }));
      out.padeiro = J.calcular(sp, "42", "A").picos.map(x => x.funcao + x.def);
      const big = com([{ dias: ["seg", "ter", "qua", "qui", "sex", "sab"], inicio: "10:00", fim: "15:00", funcao: "", pessoas: 6 }]);
      out.contratar = J.metricas(big).cus.ops.some(o => o.id === "contratar" && o.plano);
      return out;
    }, estado);
    ok(!r.pico1.length, "um caixa no pico de seg a sex, com almoço fora do pico: " + JSON.stringify(r.pico1));
    ok(r.m3 > 0 && r.m0 === 0 && r.prob.some(t => /pico/.test(t)), "métrica e antes/depois contam pico descoberto: " + JSON.stringify([r.m3, r.prob]));
    ok(JSON.stringify(r.padeiro) === '["padeiro1"]', "pico de função que ninguém tem: alerta, sem travar: " + JSON.stringify(r.padeiro));
    ok(r.contratar, "pico alto entra na sugestão de contratar");
    const p9 = await (await browser.newContext({ viewport: { width: 1360, height: 900 } })).newPage();
    await p9.addInitScript(() => { try { localStorage.setItem("j40h:vista", "pessoa"); } catch (e) {} });
    const e9 = []; p9.on("pageerror", e => e9.push(e.message));
    const est9 = Object.assign({}, estado, { intervalo: "fora", funcoes: [{ id: "fa", nome: "atendente" }, { id: "fc", nome: "caixa" }], picos: [{ id: "k1", dias: ["seg"], inicio: "11:00", fim: "14:00", funcao: "fc", pessoas: 3 }] });
    await p9.goto(BASE + "/app/#d=" + Buffer.from(JSON.stringify(est9)).toString("base64url"));
    await p9.waitForSelector("#grid button.cell");
    const al = await p9.textContent("#alertas");
    ok(/Segunda 11h–14h: faltam? \d caixa/.test(al), "alerta 'Segunda 11h–14h: falta(m) N caixa'");
    ok(!e9.length, "pico sem erro de JavaScript" + (e9.length ? ": " + e9.join(" | ") : ""));
    await p9.close();
  }

  ok(!erros.length, "sem erro de JavaScript" + (erros.length ? ": " + erros.join(" | ") : ""));
} finally {
  await browser.close();
  server.close();
}
console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo ok");
process.exit(falhas ? 1 : 0);
