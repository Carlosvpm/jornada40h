/**
 * Testes do motor de escala — rodar com `node engine/test.js`
 *
 * Cenários tirados de leads reais da planilha (horários, equipe e salário
 * usados literalmente). "Esperado" é o que a calculadora da página mostrou
 * (fórmula C − F×40, com C = horas abertas × pessoas ao mesmo tempo).
 */
const { gerarEscala, resumoEscala, DIAS, NOME_DIA_CURTO } = require("./escala.js");

/** Monta o funcionamento a partir de uma lista de dias e horários. */
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

const CENARIOS = [
  { nome: "Tatiane", tipo: "Restaurante ou lanchonete", funcionamento: func(SEG_SAB, "11:00", "18:00", 4), funcionarios: 4, salario: 2450, esperado: 8 },
  { nome: "Marcos", tipo: "Outro", funcionamento: func(SEG_DOM, "08:00", "18:00", 2), funcionarios: 3, salario: 1700, esperado: 20 },
  { nome: "Rhayane", tipo: "Restaurante ou lanchonete", funcionamento: func(SEG_SAB, "11:00", "18:00", 4), funcionarios: 3, salario: 1800, esperado: 48 },
  { nome: "Gabriel", tipo: "Restaurante ou lanchonete", funcionamento: func(SEG_SAB, "08:00", "19:00", 4, { sab: { abre: "08:00", fecha: "20:00" } }), funcionarios: 10, salario: 1800, esperado: 0 },
  { nome: "Padaria demo", tipo: "Padaria", funcionamento: func(SEG_SAB, "06:00", "17:00", 3, { sab: { abre: "06:00", fecha: "18:00" } }), funcionarios: 4, salario: 1800, esperado: 41 }
];

/** Mesma conta da página: C − F×40. */
function contaDaPagina(c) {
  let horas = 0;
  DIAS.forEach(d => {
    const f = c.funcionamento[d];
    if (!f) return;
    const [ha, ma] = f.abre.split(":").map(Number), [hf, mf] = f.fecha.split(":").map(Number);
    horas += (hf + mf / 60) - (ha + ma / 60);
  });
  const pessoas = c.funcionamento.seg.pessoas;
  return Math.max(0, horas * pessoas - c.funcionarios * 40);
}

function celula(c) {
  if (c.tipo === "turno") return c.inicio + "-" + c.fim;
  if (c.tipo === "folga") return "folga";
  if (c.tipo === "fechado") return "—";
  return "livre";
}

function tabela(saida) {
  const largNome = Math.max(8, ...saida.grade.map(g => g.nome.length));
  const col = 11;
  const pad = (s, n) => String(s).padEnd(n);
  const linha = "+" + "-".repeat(largNome + 2) + ("+" + "-".repeat(col + 2)).repeat(7) + "+--------+";
  const out = [linha, "| " + pad("Pessoa", largNome) + " |" + DIAS.map(d => " " + pad(NOME_DIA_CURTO[d], col) + " |").join("") + " horas  |", linha];
  saida.grade.forEach(g => {
    out.push("| " + pad(g.nome, largNome) + " |" + DIAS.map(d => " " + pad(celula(g.dias[d]), col) + " |").join("") + " " + pad(g.horasSemana + "h", 6) + " |");
  });
  out.push(linha);
  out.push("| " + pad("no turno", largNome) + " |" + DIAS.map(d => " " + pad(saida.cobertura[d].necessario ? saida.resumo.pessoasPorDia[d] + " de " + saida.cobertura[d].necessario : "—", col) + " |").join("") + "        |");
  out.push("| " + pad("descob.", largNome) + " |" + DIAS.map(d => " " + pad(saida.cobertura[d].necessario ? saida.cobertura[d].horasDescobertas + "h" : "—", col) + " |").join("") + "        |");
  out.push(linha);
  return out.join("\n");
}

let falhas = 0, divergencias = 0;
function check(cond, msg) {
  if (cond) console.log("  ok   " + msg);
  else { console.log("  FALHA " + msg); falhas++; }
}

for (const c of CENARIOS) {
  const entrada = {
    negocio: { nome: c.nome, tipo: c.tipo },
    funcionamento: c.funcionamento,
    funcionarios: c.funcionarios,
    salarioMedio: c.salario,
    regras: { jornadaSemanal: 40, jornadaDiariaMax: 8, folgasPorSemana: 2, intervaloMin: 60 },
    semana: "A"
  };
  const s = gerarEscala(entrada);
  const pagina = contaDaPagina(c);
  console.log("\n=== " + c.nome + " · " + c.tipo + " · " + c.funcionarios + " funcionários · " + c.funcionamento.seg.pessoas + " ao mesmo tempo ===");
  console.log(tabela(s));
  console.log("Horas descobertas (motor): " + s.resumo.horasDescobertasSemana + " h · sobrando: " + s.resumo.horasSobrandoSemana + " h · página (C − F×40): " + pagina + " h · esperado no teste: " + c.esperado + " h");
  console.log("Avisos:");
  s.avisos.forEach(a => console.log("  - " + a));
  console.log("Resumo: " + resumoEscala(s));
  console.log("Checagens:");

  check(s.ok, "escala gerada (ok = true)");
  check(s.grade.length === c.funcionarios, "grade com " + c.funcionarios + " pessoas");
  check(s.grade.every(g => g.horasSemana <= 40 + 1e-9), "ninguém passa de 40 h/semana (máx " + Math.max(...s.grade.map(g => g.horasSemana)) + " h)");
  const minFolgas = Math.min(...s.grade.map(g => DIAS.filter(d => g.dias[d].tipo === "folga" || g.dias[d].tipo === "fechado").length));
  check(minFolgas >= 2, "todo mundo com ≥ 2 folgas contando dias fechados (mín " + minFolgas + ")");
  const diasAbertos = DIAS.filter(d => c.funcionamento[d]);
  check(diasAbertos.every(d => s.resumo.pessoasPorDia[d] > 0), "nenhum dia aberto com 0 pessoas escaladas");
  // Turno nunca maior que a jornada diária
  const maxTurno = Math.max(...s.grade.flatMap(g => DIAS.map(d => {
    const x = g.dias[d]; if (x.tipo !== "turno") return 0;
    const [ha, ma] = x.inicio.split(":").map(Number), [hf, mf] = x.fim.split(":").map(Number);
    return (hf + mf / 60) - (ha + ma / 60);
  })));
  check(maxTurno <= 8 + 1e-9, "nenhum turno acima de 8 h (máx " + maxTurno + " h)");
  // Rodízio: semana B muda quem folga no fim de semana
  const sB = gerarEscala(Object.assign({}, entrada, { semana: "B" }));
  const fdsA = s.grade.filter(g => g.dias.sab.tipo === "folga" || g.dias.dom.tipo === "folga").map(g => g.nome);
  const fdsB = sB.grade.filter(g => g.dias.sab.tipo === "folga" || g.dias.dom.tipo === "folga").map(g => g.nome);
  check(c.funcionarios < 2 || JSON.stringify(fdsA) !== JSON.stringify(fdsB), "rodízio: fim de semana A [" + fdsA + "] ≠ B [" + fdsB + "]");
  // Horas descobertas vs. esperado (±15 %)
  const tol = Math.max(1, c.esperado * 0.15);
  const dentro = Math.abs(s.resumo.horasDescobertasSemana - c.esperado) <= tol;
  if (dentro) console.log("  ok   horas descobertas " + s.resumo.horasDescobertasSemana + " h dentro de ±15% de " + c.esperado + " h");
  else { console.log("  DIVERGE horas descobertas " + s.resumo.horasDescobertasSemana + " h vs. " + c.esperado + " h da página (ver README: o motor conta turnos reais, a página soma horas soltas)"); divergencias++; }
}

console.log("\n" + (falhas ? falhas + " falha(s)" : "Todas as checagens passaram") + (divergencias ? " · " + divergencias + " cenário(s) divergem da conta da página (documentado no README)" : ""));
process.exit(falhas ? 1 : 0);
