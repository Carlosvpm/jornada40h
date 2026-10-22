// Avaliação de modelos do Ajuste com IA: mesmos pedidos na padaria fictícia, pela rota admin do painel em
// produção (usa a chave da Anthropic que está no servidor); cada proposta é aplicada e medida no app.
// Custa dinheiro de verdade (~US$ 0,70 com os 3 modelos).
//
// Uso: PW=/caminho/playwright-core node tests/ia-modelos.mjs [modelo...]
//      chave de admin em ~/.config/jornada40h/admin_key
import fs from "node:fs"; import http from "node:http"; import path from "node:path";
import { fileURLToPath } from "node:url"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || "playwright-core");
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "site");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end("404"); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
}).listen(0);
const BASE = "http://127.0.0.1:" + server.address().port;
const KEY = fs.readFileSync(process.env.HOME + "/.config/jornada40h/admin_key", "utf8").trim();
const MODELOS = process.argv.slice(2).length ? process.argv.slice(2) : ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"];
const PRECO = { "claude-opus-5-5": [4, 20, 0.2], "claude-sonnet-5-5": [2, 10, 0.2], "claude-haiku-5-5": [0.1, 0.5, 0.01] };
const f = {};
for (const d of ["seg", "ter", "qua"]) f[d] = { abre: "05:30", fecha: "19:00", pessoas: 2 };
for (const d of ["qui", "sex", "sab"]) f[d] = { abre: "05:30", fecha: "19:00", pessoas: 3 };
f.dom = { abre: "05:30", fecha: "12:00", pessoas: 3 };
const estado = { negocio: { nome: "Padaria Exemplo", tipo: "Padaria" }, funcionamento: f,
  equipe: [["Ana", "atendente"], ["Bia", "atendente"], ["Caio", "atendente"], ["Duda", "caixa"], ["Edu", "caixa"]].map(([nome, funcao], i) => ({ id: "p" + i, nome, funcao })),
  custos: { salario: 1960, encargos: 1.7, he: 50 }, versao: "42", semana: "A" };
const hash = Buffer.from(JSON.stringify(estado)).toString("base64url");
const REFS = ["CF, art. 7º, XIII", "CF, art. 7º, XV", "CF, art. 7º, XVI", "CLT, art. 58", "CLT, art. 59", "CLT, art. 66", "CLT, art. 67", "CLT, art. 71", "CLT, art. 386", "Lei 605/1949, art. 1º", "Lei 10.101/2000, art. 6º"];
const CASOS = [
  { id: "naoPode", pedido: "A Ana não pode mais trabalhar aos sábados.", ok: (d) => d.cel("p0", "sab") !== "turno" && d.cel("p0", "sab", "B") !== "turno" },
  { id: "fecharDom", pedido: "Quero fechar a padaria no domingo.", ok: (d) => !d.s.funcionamento.dom },
  { id: "contratar", pedido: "Contratei a Paula, atendente. Coloque ela na escala.", ok: (d) => d.s.equipe.length === 6 && d.s.equipe.some(p => /paula/i.test(p.nome)) },
  { id: "trocaFolga", pedido: "A Bia vai folgar na quarta em vez do dia em que ela folga hoje no começo da semana. Mantém o resto como está.", ok: (d) => d.cel("p1", "qua") === "folga" && d.folgas("p1") >= 2 },
  { id: "sabado21", pedido: "Quero abrir sábado até as 21h, com 3 pessoas.", ok: (d) => d.s.funcionamento.sab && d.s.funcionamento.sab.fecha === "21:00" },
  { id: "buracoSab", pedido: "Cubra o buraco de sábado à tarde sem contratar ninguém.", ok: (d) => d.s.equipe.length === 5 && d.depois.calc.dias.sab.falta < d.antes.calc.dias.sab.falta && d.depois.erros <= d.antes.erros },
  { id: "dezHoras", pedido: "Posso colocar a Duda para trabalhar 10 horas na sexta? É legal?", ok: (d) => /art\. 59/.test(d.texto) },
  { id: "domingoLei", pedido: "O Caio pode trabalhar todos os domingos?", ok: (d) => /(Lei 10\.101|art\. 67|art\. 386)/.test(d.texto) },
];
const b = await chromium.launch();
const linhas = [];
async function rodar(modelo) {
  const p = await (await b.newContext()).newPage();
  await p.goto(BASE + "/app/#d=" + hash); await p.waitForSelector("#grid [data-p]");
  const ctx = await p.evaluate(() => window.__j40h.contextoIA());
  for (const c of CASOS) {
    const r = await fetch("https://jornada40h.com.br/painel/api/admin/ia-teste", { method: "POST", headers: { "content-type": "application/json", "x-admin-key": KEY }, body: JSON.stringify({ modelo, pedido: c.pedido, contexto: ctx }) });
    const j = await r.json();
    if (!r.ok) { linhas.push({ modelo, caso: c.id, erro: j.erro, ms: j.ms }); continue; }
    const res = j.resultado, u = j.uso, P = PRECO[modelo];
    const custo = ((u.entrada) * P[0] + u.saida * P[1] + u.cacheLido * P[2] + u.cacheGravado * P[0] * 1.25) / 1e6;
    const med = await p.evaluate((prop) => {
      const J = window.__j40h, s = J.aplicarProposta(prop);
      const a = J.metricas(J.state), d = J.metricas(s);
      return { s, antes: { falta: a.falta, erros: a.erros, calc: { dias: a.calc.dias } }, depois: { falta: d.falta, erros: d.erros, calc: { dias: d.calc.dias } } };
    }, res.proposta);
    const texto = [res.resumo, ...(res.mudancas || []), ...(res.avisos || [])].join(" ");
    const citas = [...texto.matchAll(/\(([^()]*(?:art\.|Lei)[^()]*)\)/g)].map(m => m[1]);
    const ruins = citas.flatMap(x => x.split(/;\s*/)).map(x => x.trim()).filter(x => !REFS.some(r => x.startsWith(r)));
    const g = med.s.escalas[med.s.versao];
    const d = { ...med, texto, cel: (id, dia, sem = "A") => ((g[sem][id] || {})[dia] || {}).tipo, folgas: (id) => Object.values(g.A[id] || {}).filter(x => x.tipo !== "turno").length };
    let intento = false; try { intento = !!c.ok(d); } catch (e) {}
    linhas.push({ modelo, caso: c.id, intento, erros: med.antes.erros + "→" + med.depois.erros, falta: med.antes.falta + "→" + med.depois.falta, citas: citas.length, citaRuim: ruins.join(" | "), ms: j.ms, custo: +custo.toFixed(4), entrada: u.entrada, saida: u.saida, cache: u.cacheLido, resumo: res.resumo });
  }
}
await Promise.all(MODELOS.map(rodar));
await b.close(); server.close();
for (const m of MODELOS) {
  const L = linhas.filter(l => l.modelo === m);
  const ok = L.filter(l => l.intento).length, errs = L.filter(l => l.erro).length;
  const custo = L.reduce((t, l) => t + (l.custo || 0), 0), ms = L.filter(l => l.ms).reduce((t, l) => t + l.ms, 0) / L.length;
  console.log(`\n## ${m}: intenção ${ok}/${L.length}, falhas ${errs}, custo total US$ ${custo.toFixed(3)} (média ${(custo / L.length).toFixed(4)}), tempo médio ${(ms / 1000).toFixed(1)} s`);
  for (const l of L) console.log(` ${l.intento ? "✓" : "✗"} ${l.caso.padEnd(10)} erros ${l.erros ?? "-"} falta ${l.falta ?? "-"} citas ${l.citas ?? "-"}${l.citaRuim ? " RUIM: " + l.citaRuim : ""} ${l.erro ? "ERRO " + l.erro : ""} ${(l.ms / 1000).toFixed(0)}s US$${l.custo}`);
}
