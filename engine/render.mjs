/**
 * Render de prova: gera PDF + PNGs do relatório para os 5 cenários de teste
 * e a imagem da grade de exemplo (padaria) para a landing page.
 *
 *   node engine/render.mjs
 *
 * Saída: engine/out/<nome>.pdf, <nome>-p1.png, <nome>-p2.png
 *        site/img/exemplo-escala.png (1200 px de largura)
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import pw from "/opt/npm-tools/node_modules/playwright/index.js";

const { chromium } = pw;
const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { gerarEscala, DIAS } = require("./escala.js");
const { renderRelatorioHTML, renderExemploEscalaHTML } = require("./pdf-template.js");

const OUT = path.join(__dirname, "out");
const IMG = path.join(__dirname, "..", "site", "img");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(IMG, { recursive: true });

/* ---------- cenários (mesmos do test.js) ---------- */
function func(diasSemana, abre, fecha, pessoas, extras) {
  const f = {};
  DIAS.forEach(d => { f[d] = null; });
  diasSemana.forEach(d => { f[d] = { abre, fecha, pessoas }; });
  if (extras) Object.keys(extras).forEach(d => { f[d] = Object.assign({ pessoas }, extras[d]); });
  return f;
}
const SEG_SEX = ["seg", "ter", "qua", "qui", "sex"];
const SEG_SAB = SEG_SEX.concat(["sab"]);
const SEG_DOM = SEG_SAB.concat(["dom"]);

const CENARIOS = [
  { arquivo: "tatiane", nome: "Tatiane", tipo: "Restaurante ou lanchonete", funcionamento: func(SEG_SAB, "11:00", "18:00", 4), funcionarios: 4, salario: 2450 },
  { arquivo: "marcos", nome: "Marcos", tipo: "Outro", funcionamento: func(SEG_DOM, "08:00", "18:00", 2), funcionarios: 3, salario: 1700 },
  { arquivo: "rhayane", nome: "Rhayane", tipo: "Restaurante ou lanchonete", funcionamento: func(SEG_SAB, "11:00", "18:00", 4), funcionarios: 3, salario: 1800 },
  { arquivo: "gabriel", nome: "Gabriel", tipo: "Restaurante ou lanchonete", funcionamento: func(SEG_SAB, "08:00", "19:00", 4, { sab: { abre: "08:00", fecha: "20:00" } }), funcionarios: 10, salario: 1800 },
  { arquivo: "padaria", nome: "Padaria demo", tipo: "Padaria", funcionamento: func(SEG_SAB, "06:00", "17:00", 3, { sab: { abre: "06:00", fecha: "18:00" } }), funcionarios: 4, salario: 1800 }
];

/* ---------- mesma conta da calculadora da página (site/index.html) ---------- */
function contaDaPagina(c) {
  let horasSemana = 0, diasAbertos = 0;
  DIAS.forEach(d => {
    const f = c.funcionamento[d];
    if (!f) return;
    const [ha, ma] = f.abre.split(":").map(Number), [hf, mf] = f.fecha.split(":").map(Number);
    horasSemana += (hf + mf / 60) - (ha + ma / 60);
    diasAbertos++;
  });
  const P = c.funcionamento.seg.pessoas, F = c.funcionarios, S = c.salario;
  const C = horasSemana * P;
  const gap = C / 40 - F;
  const D = Math.max(0, C - F * 40);
  const fracaoDe = h => h <= 4 ? 0 : h <= 20 ? 0.5 : h <= 30 ? 0.75 : 1;
  const inteiros = D > 0.05 ? Math.floor(D / 40 + 0.001) : 0;
  const resto = Math.max(0, D - inteiros * 40);
  const fracaoResto = fracaoDe(resto);
  const contratar = inteiros + (fracaoResto > 0 ? 1 : 0);
  const custoContratar = (inteiros + fracaoResto) * S * 1.7;
  const contratarTexto = contratar === 0 ? "" :
    (inteiros > 0 ? inteiros + (inteiros === 1 ? " pessoa em tempo integral" : " pessoas em tempo integral") : "") +
    (inteiros > 0 && fracaoResto > 0 ? " + " : "") +
    (fracaoResto > 0 ? "1 em " + (fracaoResto <= 0.5 ? "meio período (20h)" : fracaoResto <= 0.75 ? "contrato parcial (30h)" : "tempo integral") : "");
  const custoHE = D * 4.33 * (S / 200) * 1.5;
  return {
    nome: c.nome, tipo: c.tipo, funcionarios: F, pessoasSimultaneas: P, horasAbertasSemana: +horasSemana.toFixed(1),
    diasAbertos, salarioMedio: S, horasDescobertas: +D.toFixed(1), custoHoraExtraMes: Math.round(custoHE),
    custoContratarMes: Math.round(custoContratar), contratarTexto, horasReduzir: +(D / P).toFixed(1),
    funcionariosAMais: +Math.max(0, gap).toFixed(2)
  };
}

const OFERTA = { precoCheio: 147, precoFundador: 77, ate: "31/10", checkoutUrl: "https://pay.kiwify.com.br/yy3LT4h" };
const MARCA = { nome: "Jornada 40h", site: "https://jornada40h.com.br/", email: "calculadora40h@gmail.com" };
const DATA = "17/10/2026";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1.5 });

for (const c of CENARIOS) {
  const escala = gerarEscala({
    negocio: { nome: c.nome, tipo: c.tipo }, funcionamento: c.funcionamento, funcionarios: c.funcionarios,
    salarioMedio: c.salario, regras: { jornadaSemanal: 40, jornadaDiariaMax: 8, folgasPorSemana: 2, intervaloMin: 60 }, semana: "A"
  });
  const html = renderRelatorioHTML({ lead: contaDaPagina(c), escala, oferta: OFERTA, marca: MARCA, data: DATA });
  fs.writeFileSync(path.join(OUT, c.arquivo + ".html"), html);
  await page.setContent(html, { waitUntil: "load" });
  await page.emulateMedia({ media: "print" });
  await page.pdf({ path: path.join(OUT, c.arquivo + ".pdf"), format: "A4", printBackground: true, preferCSSPageSize: true });
  const paginas = await page.$$(".page");
  for (let i = 0; i < paginas.length; i++) {
    await paginas[i].screenshot({ path: path.join(OUT, c.arquivo + "-p" + (i + 1) + ".png") });
  }
  // Checa se algum conteúdo estourou a página (overflow escondido = texto cortado)
  const estouro = await page.evaluate(() => [...document.querySelectorAll(".page")].map(p => p.scrollHeight - p.clientHeight));
  console.log(c.arquivo + ": " + paginas.length + " páginas · estouro (px) por página: " + estouro.join(", "));
}

/* ---------- imagem da grade de exemplo (padaria) para a LP ---------- */
const padaria = CENARIOS.find(c => c.arquivo === "padaria");
const escalaPadaria = gerarEscala({
  negocio: { nome: "Padaria Pão Quente", tipo: "Padaria" }, funcionamento: padaria.funcionamento, funcionarios: 4,
  salarioMedio: padaria.salario, semana: "A"
});
const htmlGrade = renderExemploEscalaHTML(escalaPadaria, { titulo: "Escala 5x2 · Padaria (exemplo)" });
fs.writeFileSync(path.join(OUT, "exemplo-escala.html"), htmlGrade);
const pageImg = await browser.newPage({ viewport: { width: 1240, height: 900 }, deviceScaleFactor: 1 });
await pageImg.setContent(htmlGrade, { waitUntil: "load" });
await pageImg.evaluate(() => document.fonts.ready);
const el = await pageImg.$("#exemplo");
await el.screenshot({ path: path.join(IMG, "exemplo-escala.png"), omitBackground: true });
const box = await el.boundingBox();
console.log("site/img/exemplo-escala.png: " + Math.round(box.width) + "×" + Math.round(box.height) + " px");

await browser.close();
