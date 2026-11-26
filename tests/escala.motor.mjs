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

const monta = (funcionamento, funcionarios, semana, regras = V42) =>
  gerarEscala({ negocio: { nome: "X", tipo: "Padaria" }, funcionamento, funcionarios, salarioMedio: 1800, semana, regras });
const junto = (s, a, b) => folgasDe(s, a).filter(d => folgasDe(s, b).includes(d));

console.log("2. não folgar junto");
const SETE = func(SEG_DOM, "06:00", "19:00", 2);
const comPar = (extra = {}) => CINCO.map(n => Object.assign({ nome: n, funcao: "atendente" },
  n === "Ana" ? { naoFolgaCom: ["Bia"] } : n === "Bia" ? { naoFolgaCom: ["Ana"] } : {}, extra[n] || {}));
for (const sem of ["A", "B"]) for (const [rv, rg] of [["42", V42], ["40", V40]]) {
  const s = monta(SETE, comPar(), sem, rg);
  const j = junto(s, "Ana", "Bia");
  ok(!j.length && folgasDe(s, "Ana").length === 2 && folgasDe(s, "Bia").length === 2, `par: Ana e Bia nunca folgam no mesmo dia aberto (${rv}h, ${sem})` + (j.length ? ": " + j.join(",") : ""));
}
{
  const s = monta(PADARIA.dom ? Object.assign({}, PADARIA, { dom: null }) : PADARIA, comPar(), "A");
  ok(folgasDe(s, "Ana").includes("dom") && folgasDe(s, "Bia").includes("dom") && !s.avisos.some(a => /folgam no mesmo dia/.test(a)), "par: dia fechado não conta");
}
{
  const s = monta(SETE, comPar({ Ana: { folgaFixa: "qua" }, Bia: { folgaFixa: "qua" } }), "A");
  ok(junto(s, "Ana", "Bia").includes("qua") && s.avisos.some(a => /Ana e Bia folgam no mesmo dia \(quarta\)/.test(a)), "par: folga fixa igual vence o par, com aviso");
}

console.log("3. mulher folga no domingo a cada 2 semanas");
const mulheres = (lista, idx, extra = {}) => lista.map((n, i) => Object.assign({ nome: n }, idx.includes(i) ? { sexo: "F" } : {}, extra[n] || {}));
{
  const eq = mulheres(NOVE, [0, 1, 2, 3]);
  const A = monta(MERCADO, eq, "A"), B = monta(MERCADO, eq, "B");
  const sem = [0, 1, 2, 3].map(i => NOVE[i]).filter(n => !folgasDe(A, n).includes("dom") && !folgasDe(B, n).includes("dom"));
  ok(!sem.length, "mulher: folga no domingo em A ou B" + (sem.length ? ": " + sem.join(", ") : ""));
  const domA = n => folgasDe(A, n).includes("dom"), domB = n => folgasDe(B, n).includes("dom");
  ok(domA(NOVE[0]) && domA(NOVE[2]) && domB(NOVE[1]) && domB(NOVE[3]), "mulheres alternam entre A e B");
}
{
  const eq = mulheres(CINCO, [0], { Ana: { folgaFixa: "sab" } });
  const A = monta(SETE, eq, "A"), B = monta(SETE, eq, "B");
  const tem = [A, B].some(s => { const f = folgasDe(s, "Ana"); return f.includes("sab") && f.includes("dom") && f.length === 2; });
  ok(tem, "mulher com folga fixa no sábado ganha o domingo na semana dela");
}
{
  const fechado = Object.assign({}, MERCADO, { dom: null });
  const com = monta(fechado, mulheres(NOVE, [0, 1, 2, 3]), "A"), sem = monta(fechado, mulheres(NOVE, []), "A");
  ok(JSON.stringify(com.grade.map(l => l.dias)) === JSON.stringify(sem.grade.map(l => l.dias)), "domingo fechado: grupos de hoje");
}
{
  const cinco = func(["seg", "ter", "qua", "qui", "dom"], "08:00", "16:00", 1);
  const eq = mulheres(["Ana", "Bia", "Caio"], [0]);
  const A = monta(cinco, eq, "A"), B = monta(cinco, eq, "B");
  const s = [A, B].find(x => folgasDe(x, "Ana").includes("dom"));
  ok(!!s && s.avisos.some(a => /Ana trabalha 4 dias nesta semana para folgar no domingo/.test(a)), "abre 5 dias com domingo: folga no domingo e aviso");
}

console.log("4. revisão final");
{
  const eq = ["Ana", "Bia", "Cris", "Duda", "Edu", "Fabio"].map(n => Object.assign({ nome: n },
    ["Ana", "Bia", "Cris"].includes(n) ? { sexo: "F" } : {}, n === "Ana" ? { naoFolgaCom: ["Cris"] } : n === "Cris" ? { naoFolgaCom: ["Ana"] } : {}));
  const r = ["A", "B"].map(w => monta(SETE, eq, w));
  const j = r.map(x => junto(x, "Ana", "Cris"));
  ok(j.every(x => !x.length), "par de mulheres não folga junto no domingo (vão para semanas diferentes)" + (j.some(x => x.length) ? ": " + JSON.stringify(j) : ""));
}
{
  const eq = ["Ana", "Cris", "Duda", "Edu"].map(n => Object.assign({ nome: n }, ["Ana", "Cris"].includes(n) ? { sexo: "F" } : {},
    n === "Ana" ? { naoFolgaCom: ["Cris"], folgaFixa: "dom" } : n === "Cris" ? { naoFolgaCom: ["Ana"] } : {}));
  const r = ["A", "B"].map(w => monta(SETE, eq, w));
  const x = r.find(s => junto(s, "Ana", "Cris").includes("dom"));
  ok(!x || x.avisos.some(a => /Ana e Cris folgam no mesmo dia \(domingo\)/.test(a)), "domingo da mulher junto do par sai com aviso");
}

console.log("5. intervalo de 2 h");
const { intervaloDe } = require("../site/js/escala.js");
const V42_2 = Object.assign({}, V42, { intervaloMin: 120 });
const dur = c => { let a = parseInt(c.inicio) * 60 + +c.inicio.slice(3), b = parseInt(c.fim) * 60 + +c.fim.slice(3); if (b <= a) b += 1440; return b - a; };
const turnosDe = (s, nome, dias = DIAS) => dias.map(d => s.grade.find(l => l.nome === nome).dias[d]).filter(c => c.tipo === "turno");
ok(intervaloDe(600, 120) === 120 && intervaloDe(540, 120) === 120 && intervaloDe(470, 120) === 60 && intervaloDe(300, 120) === 15 && intervaloDe(564) === 60 && intervaloDe(564, 60) === 60, "intervaloDe com 1 h e 2 h");
{
  const s = monta(PADARIA, CINCO.map(n => ({ nome: n, funcao: "atendente" })), "A", V42_2);
  const ts = CINCO.flatMap(n => turnosDe(s, n, SEG_SAB));
  ok(ts.length && ts.every(c => dur(c) === 624 || c.rotulo === "Turno único") && s.grade.every(l => l.horasSemana <= 42), "intervalo 2 h: turno na loja = jornada + 2 h");
  ok(s.avisos.some(a => a.includes("precisam de 2 h de intervalo")), "aviso cita 2 h");
}
{
  const s = monta(MERCADO, NOVE.map(n => ({ nome: n })), "A", V42_2);
  const ts = NOVE.flatMap(n => turnosDe(s, n, ["dom"]));
  ok(ts.length && ts.every(c => c.rotulo === "Turno único" && dur(c) === 300), "intervalo 2 h: dia curto não ganha 2 h");
  const a = monta(MERCADO, NOVE.map(n => ({ nome: n })), "A", Object.assign({}, V42, { intervaloMin: 60 })), b = monta(MERCADO, NOVE.map(n => ({ nome: n })), "A");
  ok(JSON.stringify(a.grade) === JSON.stringify(b.grade), "intervalo 1 h explícito = padrão");
}

console.log("6. jornada própria");
const comAna = extra => CINCO.map(n => Object.assign({ nome: n, funcao: "atendente" }, n === "Ana" ? extra : {}));
for (const sem of ["A", "B"]) {
  const s = monta(SETE, comAna({ horasDia: 6 }), sem);
  const ta = turnosDe(s, "Ana");
  ok(ta.length === 5 && ta.every(c => dur(c) === 375 && (c.rotulo === "Meio" || c.inicio === "06:00" || c.fim === "19:00")) && s.grade[0].horasSemana === 30, `jornada própria: turnos da Ana com 6 h de trabalho (${sem})` + " " + JSON.stringify(ta.map(c => c.inicio + "-" + c.fim)));
  const outros = CINCO.slice(1).flatMap(n => turnosDe(s, n));
  ok(outros.every(c => dur(c) === 564), `jornada própria: os outros seguem a jornada da empresa (${sem})`);
}
{
  const s = monta(SETE, comAna({ horasDia: 6, horasSemana: 24 }), "A");
  ok(s.grade[0].horasSemana === 24 && s.avisos.some(a => /Ana passaria de 24 h na semana/.test(a)), "jornada própria: horasSemana menor encurta com aviso");
  const m = monta(SETE, comAna({ horasDia: 6, horasSemana: 40 }), "A");
  ok(m.grade[0].horasSemana === 30 && !m.avisos.some(a => /Ana passaria/.test(a)), "jornada própria: horasSemana maior fica em 5 × horasDia");
  const i2 = monta(SETE, comAna({ horasDia: 7 }), "A", V42_2);
  ok(turnosDe(i2, "Ana").every(c => dur(c) === 540) && turnosDe(i2, "Ana").length === 5, "jornada própria com 2 h de intervalo");
  const igual = monta(SETE, comAna({ horasDia: 8.4 }), "A"), sem = monta(SETE, comAna({}), "A");
  ok(JSON.stringify(igual.grade) === JSON.stringify(sem.grade), "horasDia igual ou acima da jornada diária = integral");
}

console.log("7. revisão final");
{
  const curto = func(SEG_DOM, "07:00", "15:00", 2);
  const r = ["A", "B"].map(w => monta(curto, comAna({ horasDia: 6.5 }), w, V42_2));
  const trab = c => dur(c) - intervaloDe(dur(c), 120);
  const ts = r.flatMap(s => turnosDe(s, "Ana"));
  ok(ts.length && ts.every(c => trab(c) <= 390), "dia mais curto que o turno com 2 h: Ana não passa de 6,5 h" + " " + JSON.stringify(ts.map(c => c.inicio + "-" + c.fim)));
}

console.log("8. picos");
const montaP = (funcionamento, funcionarios, semana, picos) =>
  gerarEscala({ negocio: { nome: "X", tipo: "Padaria" }, funcionamento, funcionarios, salarioMedio: 1800, semana, regras: V42, picos });
{
  const f = func(SEG_SAB, "06:00", "19:00", 2);
  const s = montaP(f, Array.from({ length: 7 }, (_, i) => ({ nome: "P" + i })), "A", [{ dias: SEG_SEX, inicio: "11:00", fim: "14:00", funcao: "", pessoas: 3 }]);
  const bl = s.cobertura.seg.blocos, noPico = b => b.hora >= "11:00" && b.hora < "14:00";
  ok(bl.filter(noPico).length === 6 && bl.every(b => b.necessario === (noPico(b) ? 3 : 2)), "pico total: 3 pessoas das 11h às 14h");
  ok(bl.filter(noPico).every(b => b.escalado >= 3), "pico total coberto quando a equipe permite");
}
{
  const eq = ["Ana", "Bia", "Caio", "Duda", "Edu", "Fabio"].map((n, i) => ({ nome: n, funcao: i < 2 ? "Caixa" : "atendente" }));
  const pico = [{ dias: SEG_SEX, inicio: "11:00", fim: "14:00", funcao: "caixa", pessoas: 1 }];
  const faltas = [];
  for (const w of ["A", "B"]) {
    const s = montaP(SETE, eq, w, pico);
    SEG_SEX.forEach(d => {
      const tem = ["Ana", "Bia"].some(n => { const c = s.grade.find(l => l.nome === n).dias[d]; return c.tipo === "turno" && c.inicio <= "11:00" && c.fim >= "14:00"; });
      if (!tem) faltas.push(w + d);
    });
  }
  ok(!faltas.length, "pico por função: caixa no turno do pico" + (faltas.length ? ": " + faltas.join(",") : ""));
}
{
  const s = montaP(func(SEG_SAB, "06:00", "19:00", 2), CINCO.map(n => ({ nome: n })), "A", [{ dias: ["seg"], inicio: "18:00", fim: "20:00", funcao: "", pessoas: 3 }]);
  const sobe = s.cobertura.seg.blocos.filter(b => b.necessario === 3).map(b => b.hora);
  ok(JSON.stringify(sobe) === '["18:00","18:30"]', "pico fora do horário conta só no aberto: " + JSON.stringify(sobe));
}

{
  // Dia longo (06–22): o caixa precisa preferir o turno que cobre o pico, mesmo com o fechamento descoberto.
  const f = Object.assign(func(SEG_SAB, "06:00", "22:00", 2), func(["dom"], "07:00", "13:00", 2));
  const eq = Array.from({ length: 8 }, (_, i) => ({ nome: "P" + i, funcao: i < 2 ? "caixa" : "atendente" }));
  const faltas = [];
  for (const w of ["A", "B"]) {
    const s = montaP(f, eq, w, [{ dias: SEG_SAB, inicio: "11:00", fim: "14:00", funcao: "caixa", pessoas: 1 }]);
    SEG_SAB.forEach(d => {
      const tem = ["P0", "P1"].some(n => { const c = s.grade.find(l => l.nome === n).dias[d]; return c.tipo === "turno" && c.inicio <= "11:00" && c.fim >= "14:00"; });
      if (!tem && ["P0", "P1"].some(n => s.grade.find(l => l.nome === n).dias[d].tipo === "turno")) faltas.push(w + d);
    });
  }
  ok(!faltas.length, "dia longo: caixa que trabalha no dia pega o turno do pico" + (faltas.length ? ": " + faltas.join(",") : ""));
}

console.log(falhas ? `\n${falhas} falha(s)` : "\nTudo ok");
process.exit(falhas ? 1 : 0);
