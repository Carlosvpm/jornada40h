// Testes do motor da escala usado pelo painel (site/js/escala.js).
// Uso: node tests/escala.motor.mjs            (compara a regressão com tests/fixtures/motor-base.json)
//      node tests/escala.motor.mjs --gravar   (grava a fixture com o código atual)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const { gerarEscala, DIAS } = require("../site/js/escala.js");
const FIXTURE = path.join(AQUI, "fixtures", "motor-base.json");
const GRAVAR = process.argv.includes("--gravar");

let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  FALHA ") + msg); if (!cond) falhas++; };

/** Dias de folga (não turno e não reserva) de uma pessoa na saída do motor. */
function folgasDe(saida, nome) {
  const linha = saida.grade.find(l => l.nome === nome);
  return DIAS.filter(d => { const t = linha.dias[d].tipo; return t !== "turno" && t !== "livre"; });
}

function func(diasSemana, abre, fecha, pessoas, extras) {
  const f = {};
  DIAS.forEach(d => { f[d] = null; });
  diasSemana.forEach(d => { f[d] = { abre, fecha, pessoas }; });
  if (extras) Object.keys(extras).forEach(d => { f[d] = extras[d] ? Object.assign({ pessoas }, extras[d]) : null; });
  return f;
}
const SEG_SEX = ["seg", "ter", "qua", "qui", "sex"];
const SEG_SAB = SEG_SEX.concat(["sab"]);
const SEG_DOM = SEG_SAB.concat(["dom"]);
const V42 = { jornadaSemanal: 42, jornadaDiariaMax: 8.4, intervaloFora: true };
const V40 = { jornadaSemanal: 40, jornadaDiariaMax: 8, intervaloFora: true };

const PADARIA = func(SEG_SAB, "06:00", "19:00", 2, { dom: { abre: "07:00", fecha: "13:00" } });
const CINCO = ["Ana", "Bia", "Caio", "Duda", "Edu"];
const MERCADO = func(SEG_DOM, "07:00", "20:00", 4, { dom: { abre: "07:00", fecha: "12:00" } });
const NOVE = Array.from({ length: 9 }, (_, i) => "Pessoa " + (i + 1));

const CENARIOS = [
  { nome: "Tatiane", tipo: "Restaurante ou lanchonete", funcionamento: func(SEG_SAB, "11:00", "18:00", 4), funcionarios: 4 },
  { nome: "Marcos", tipo: "Outro", funcionamento: func(SEG_DOM, "08:00", "18:00", 2), funcionarios: 3 },
  { nome: "Rhayane", tipo: "Restaurante ou lanchonete", funcionamento: func(SEG_SAB, "11:00", "18:00", 4), funcionarios: 3 },
  { nome: "Gabriel", tipo: "Restaurante ou lanchonete", funcionamento: func(SEG_SAB, "08:00", "19:00", 4, { sab: { abre: "08:00", fecha: "20:00" } }), funcionarios: 10 },
  { nome: "Padaria demo", tipo: "Padaria", funcionamento: func(SEG_SAB, "06:00", "17:00", 3, { sab: { abre: "06:00", fecha: "18:00" } }), funcionarios: 4 },
  { nome: "Padaria Exemplo", tipo: "Padaria", funcionamento: PADARIA, funcionarios: CINCO.map(n => ({ nome: n, funcao: "atendente" })) },
  { nome: "Mercado 9", tipo: "Mercado", funcionamento: MERCADO, funcionarios: NOVE.map(n => ({ nome: n })) },
];

console.log("1. regressão (contas sem os campos novos)");
const atual = {};
for (const c of CENARIOS) for (const [rv, regras] of [["42", V42], ["40", V40]]) for (const semana of ["A", "B"]) {
  const s = gerarEscala({ negocio: { nome: c.nome, tipo: c.tipo }, funcionamento: c.funcionamento, funcionarios: c.funcionarios, salarioMedio: 1800, semana, regras });
  atual[`${c.nome}|${rv}|${semana}`] = JSON.stringify({ grade: s.grade, avisos: s.avisos });
}
if (GRAVAR) {
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, JSON.stringify(atual, null, 1));
  console.log("  fixture gravada: " + Object.keys(atual).length + " casos");
} else {
  const base = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  const dif = Object.keys(base).filter(k => base[k] !== atual[k]);
  ok(Object.keys(base).length === Object.keys(atual).length && !dif.length, "mesma grade e avisos de antes" + (dif.length ? ": " + dif.join(", ") : ""));
}

// Casos novos entram abaixo (Tasks 2 e 3).

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo ok");
process.exit(falhas ? 1 : 0);
