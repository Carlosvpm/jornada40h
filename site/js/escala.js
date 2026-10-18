/**
 * Jornada 40h — motor de escala 5x2
 * ---------------------------------
 * Gera, de forma determinística e explicável, uma escala semanal para um
 * pequeno negócio que precisa sair da 6x1 (44 h) para a 5x2 (40 h).
 *
 * JavaScript puro, sem dependências. Sintaxe compatível com Google Apps Script
 * (V8 / ES2019): nada de import/export, `?.`, `??` ou campos privados.
 *
 * Uso (Node):      const { gerarEscala } = require("./escala.js");
 * Uso (Apps Script): copie este arquivo para o projeto; as funções ficam globais.
 *
 * Entrada e saída estão documentadas no README.md desta pasta.
 */

/* ===================================================================== */
/* Constantes e utilidades                                               */
/* ===================================================================== */

var DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
var NOME_DIA = {
  seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta",
  sex: "Sexta", sab: "Sábado", dom: "Domingo"
};
var NOME_DIA_CURTO = { seg: "seg", ter: "ter", qua: "qua", qui: "qui", sex: "sex", sab: "sáb", dom: "dom" };
var FIM_DE_SEMANA = ["sab", "dom"];
var BLOCO_MIN = 30; // granularidade da cobertura (minutos)

/** "06:30" -> 390 (minutos desde 00:00). */
function paraMinutos(hhmm) {
  if (typeof hhmm === "number") return hhmm;
  var partes = String(hhmm).split(":");
  var h = parseInt(partes[0], 10) || 0;
  var m = parseInt(partes[1], 10) || 0;
  return h * 60 + m;
}

/** 390 -> "06:30". Aceita valores acima de 24h (virada de noite) e normaliza. */
function paraHora(min) {
  var m = ((min % 1440) + 1440) % 1440;
  var h = Math.floor(m / 60);
  var mm = m % 60;
  return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
}

/** "06:30" -> "6h30"; "14:00" -> "14h" (formato de fala do dono do negócio). */
function horaFalada(hhmm) {
  var min = paraMinutos(hhmm);
  var h = Math.floor((min % 1440) / 60);
  var mm = min % 60;
  return mm === 0 ? h + "h" : h + "h" + (mm < 10 ? "0" : "") + mm;
}

/** Formata horas decimais em português: 4 -> "4 h", 4.5 -> "4,5 h". */
function fmtHoras(h) {
  var v = Math.round(h * 10) / 10;
  var s = String(v).replace(".", ",");
  return s + " h";
}

/** Formata valor em reais sem centavos: 637 -> "R$ 637". */
function fmtReais(v) {
  var n = Math.round(v);
  var s = String(n);
  var out = "";
  while (s.length > 3) {
    out = "." + s.slice(-3) + out;
    s = s.slice(0, -3);
  }
  return "R$ " + s + out;
}

/** Cópia rasa de objeto simples (sem Object.assign em alvo compartilhado). */
function copiar(obj) {
  var o = {};
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) o[k] = obj[k];
  return o;
}

/* ===================================================================== */
/* Equipe de exemplo                                                     */
/* ===================================================================== */

var NOMES_EXEMPLO = [
  "Ana", "Bruno", "Carla", "Diego", "Elaine", "Fábio", "Gabriela", "Henrique",
  "Isabela", "João", "Karina", "Lucas", "Mariana", "Nelson", "Patrícia",
  "Rafael", "Sandra", "Tiago", "Vanessa", "Wagner"
];

var FUNCOES_POR_TIPO = {
  padaria: ["padeiro(a)", "atendente", "caixa"],
  restaurante: ["cozinheiro(a)", "atendente", "caixa"],
  lanchonete: ["cozinheiro(a)", "atendente", "caixa"],
  loja: ["vendedor(a)", "caixa"],
  mercado: ["repositor(a)", "caixa", "atendente"],
  farmacia: ["farmacêutico(a)", "atendente"],
  salao: ["cabeleireiro(a)", "manicure", "recepção"],
  barbearia: ["barbeiro(a)", "recepção"],
  generico: ["atendente"]
};

/** Normaliza o tipo de negócio ("Restaurante ou lanchonete" -> "restaurante"). */
function chaveTipo(tipo) {
  var t = String(tipo || "").toLowerCase()
    .replace(/[áàâã]/g, "a").replace(/[éê]/g, "e").replace(/í/g, "i")
    .replace(/[óôõ]/g, "o").replace(/ú/g, "u").replace(/ç/g, "c");
  var chaves = ["padaria", "restaurante", "lanchonete", "loja", "mercado", "farmacia", "salao", "barbearia"];
  for (var i = 0; i < chaves.length; i++) if (t.indexOf(chaves[i]) >= 0) return chaves[i];
  return "generico";
}

/**
 * Devolve n funcionários fictícios com funções plausíveis para o tipo de negócio.
 * Ex.: exemploEquipe(3, "Padaria") -> [{nome:"Ana",funcao:"padeiro(a)"}, ...]
 */
function exemploEquipe(n, tipo) {
  var funcoes = FUNCOES_POR_TIPO[chaveTipo(tipo)];
  var equipe = [];
  for (var i = 0; i < n; i++) {
    equipe.push({
      nome: NOMES_EXEMPLO[i % NOMES_EXEMPLO.length] + (i >= NOMES_EXEMPLO.length ? " " + (Math.floor(i / NOMES_EXEMPLO.length) + 1) : ""),
      funcao: funcoes[i % funcoes.length]
    });
  }
  return equipe;
}

/* ===================================================================== */
/* Passo 1 — dias, horas abertas, demanda e turnos possíveis             */
/* ===================================================================== */

/**
 * Para cada dia aberto calcula: abre/fecha em minutos, horas abertas,
 * pessoas necessárias ao mesmo tempo, demanda (pessoa-horas) e os turnos
 * possíveis (abertura / meio / fechamento), já limitados à jornada diária.
 */
function montarDias(funcionamento, regras) {
  var info = {};
  var maxMin = regras.jornadaDiariaMax * 60;
  DIAS.forEach(function (d) {
    var f = funcionamento ? funcionamento[d] : null;
    if (!f || !f.abre || !f.fecha) { info[d] = { aberto: false }; return; }
    var abre = paraMinutos(f.abre);
    var fecha = paraMinutos(f.fecha);
    if (fecha <= abre) fecha += 1440; // fecha depois da meia-noite
    var pessoas = Math.max(1, Math.round(Number(f.pessoas) || 1));
    var horas = (fecha - abre) / 60;
    var turnos = [];
    if (fecha - abre <= maxMin) {
      turnos.push({ rotulo: "Turno único", inicio: abre, fim: fecha });
    } else if (fecha - abre <= 2 * maxMin) {
      turnos.push({ rotulo: "Abertura", inicio: abre, fim: abre + maxMin });
      turnos.push({ rotulo: "Fechamento", inicio: fecha - maxMin, fim: fecha });
    } else {
      // Dia muito longo (> 2 jornadas): abertura, meio e fechamento.
      var meioIni = Math.round((abre + fecha) / 2 - maxMin / 2);
      turnos.push({ rotulo: "Abertura", inicio: abre, fim: abre + maxMin });
      turnos.push({ rotulo: "Meio", inicio: meioIni, fim: meioIni + maxMin });
      turnos.push({ rotulo: "Fechamento", inicio: fecha - maxMin, fim: fecha });
    }
    info[d] = {
      aberto: true, abre: abre, fecha: fecha, horas: horas, pessoas: pessoas,
      demanda: horas * pessoas, turnos: turnos,
      // quantas pessoas cobririam o dia inteiro sem buraco
      pessoasParaCobrir: pessoas * turnos.length
    };
  });
  return info;
}

/* ===================================================================== */
/* Passo 2 — folgas (fixas, impedimentos, rodízio de fim de semana)      */
/* ===================================================================== */

/**
 * Decide em que dias cada pessoa folga. Devolve um mapa nome -> { seg: true, ... }
 * (true = folga). Dias fechados contam como folga para todos.
 *
 * Ordem das decisões:
 *  1. dias fechados, folgaFixa e naoPode;
 *  2. rodízio do fim de semana (semana A: primeira metade da equipe, B: segunda);
 *  3. folgas restantes nos dias de menor demanda relativa (demanda ÷ pessoas disponíveis),
 *     sem nunca zerar um dia aberto.
 */
function distribuirFolgas(funcionarios, dias, regras, semana, avisos) {
  var abertos = DIAS.filter(function (d) { return dias[d].aberto; });
  var fechados = DIAS.filter(function (d) { return !dias[d].aberto; });
  var diasTrabalho = Math.min(abertos.length, 7 - regras.folgasPorSemana);
  var extrasPorPessoa = Math.max(0, abertos.length - diasTrabalho); // folgas em dias abertos

  // disponíveis[d] = quantas pessoas ainda podem trabalhar no dia d
  var disponiveis = {};
  abertos.forEach(function (d) { disponiveis[d] = funcionarios.length; });

  var folgas = {};      // nome -> { dia: true }
  var restantes = {};   // nome -> folgas extras ainda por marcar

  // 1. dias fechados, folga fixa e impedimentos
  funcionarios.forEach(function (p) {
    var f = {};
    fechados.forEach(function (d) { f[d] = true; });
    var extras = extrasPorPessoa;
    var fixa = p.folgaFixa ? String(p.folgaFixa).toLowerCase().slice(0, 3) : null;
    var naoPode = (p.naoPode || []).map(function (d) { return String(d).toLowerCase().slice(0, 3); });
    abertos.forEach(function (d) {
      var obrigatoria = (fixa === d) || naoPode.indexOf(d) >= 0;
      if (obrigatoria && !f[d]) {
        f[d] = true;
        disponiveis[d]--;
        extras--;
      }
    });
    if (extras < 0) {
      avisos.push(p.nome + " tem mais restrições de dia do que folgas: vai trabalhar " +
        (diasTrabalho + extras) + " dias na semana em vez de " + diasTrabalho + ".");
      extras = 0;
    }
    folgas[p.nome] = f;
    restantes[p.nome] = extras;
  });

  // Quantas folgas extras cabem em cada dia sem desequilibrar a semana:
  // a média de folgas por dia aberto, ou a sobra de gente do dia (o que for maior).
  var totalExtras = 0;
  funcionarios.forEach(function (p) { totalExtras += restantes[p.nome]; });
  var mediaPorDia = abertos.length ? Math.ceil(totalExtras / abertos.length) : 0;

  function podeFolgar(d) { return disponiveis[d] - 1 >= 1; }

  // Custo de tirar mais uma pessoa do dia d: demanda ÷ pessoas que sobram.
  function custoFolga(d) { return dias[d].demanda / (disponiveis[d] - 1); }

  // 2. rodízio de fim de semana
  var fds = FIM_DE_SEMANA.filter(function (d) { return dias[d].aberto; });
  if (fds.length && extrasPorPessoa > 0) {
    var metade = Math.ceil(funcionarios.length / 2);
    var grupo = semana === "B" ? funcionarios.slice(metade) : funcionarios.slice(0, metade);
    var folgasFds = {};
    fds.forEach(function (d) { folgasFds[d] = funcionarios.length - disponiveis[d]; });
    grupo.forEach(function (p) {
      if (restantes[p.nome] <= 0) return;
      var jaTem = fds.some(function (d) { return folgas[p.nome][d]; });
      if (jaTem) return;
      var melhor = null;
      fds.forEach(function (d) {
        if (!podeFolgar(d)) return;
        var limite = Math.max(1, mediaPorDia, disponiveis[d] - dias[d].pessoasParaCobrir);
        if (folgasFds[d] >= limite) return;
        if (!melhor || custoFolga(d) < custoFolga(melhor)) melhor = d;
      });
      if (melhor) {
        folgas[p.nome][melhor] = true;
        disponiveis[melhor]--;
        folgasFds[melhor]++;
        restantes[p.nome]--;
      }
    });
  }

  // 3. folgas restantes: rodada a rodada, cada pessoa pega o dia de menor custo
  var houve = true;
  while (houve) {
    houve = false;
    funcionarios.forEach(function (p) {
      if (restantes[p.nome] <= 0) return;
      var melhor = null;
      abertos.forEach(function (d) {
        if (folgas[p.nome][d] || !podeFolgar(d)) return;
        if (!melhor || custoFolga(d) < custoFolga(melhor) - 1e-9) melhor = d;
      });
      if (!melhor) {
        avisos.push("Não foi possível dar todas as folgas a " + p.nome + " sem deixar um dia sem ninguém.");
        restantes[p.nome] = 0;
        return;
      }
      folgas[p.nome][melhor] = true;
      disponiveis[melhor]--;
      restantes[p.nome]--;
      houve = true;
    });
  }

  return folgas;
}

/* ===================================================================== */
/* Passo 3 — turnos do dia                                               */
/* ===================================================================== */

/** Cria os blocos de 30 min do dia com o necessário e zero escalados. */
function criarBlocos(dia) {
  var blocos = [];
  for (var t = dia.abre; t < dia.fecha; t += BLOCO_MIN) {
    blocos.push({ hora: paraHora(t), inicio: t, necessario: dia.pessoas, escalado: 0 });
  }
  return blocos;
}

/** Quantos blocos ainda descobertos este turno cobriria. */
function ganhoTurno(blocos, turno) {
  var g = 0;
  for (var i = 0; i < blocos.length; i++) {
    var b = blocos[i];
    if (b.inicio >= turno.inicio && b.inicio < turno.fim && b.escalado < b.necessario) g++;
  }
  return g;
}

function aplicarTurno(blocos, turno) {
  for (var i = 0; i < blocos.length; i++) {
    var b = blocos[i];
    if (b.inicio >= turno.inicio && b.inicio < turno.fim) b.escalado++;
  }
}

/**
 * Atribui turnos às pessoas disponíveis num dia.
 * Critério, nesta ordem: maior cobertura de horas ainda descobertas;
 * turno com menos gente no dia; turno que a pessoa fez menos vezes na
 * semana (ninguém só fecha); ordem dos turnos.
 * Quem não acrescenta cobertura fica "livre" (reserva).
 */
function escalarDia(dia, pessoasDisp, contagem, blocos) {
  var porTurno = dia.turnos.map(function () { return 0; });
  var resultado = {};
  // Quem fez menos turnos na semana escolhe primeiro (equilíbrio de carga).
  var ordem = pessoasDisp.slice().sort(function (a, b) {
    return (contagem[a.nome].total - contagem[b.nome].total) || (a.indice - b.indice);
  });
  ordem.forEach(function (p) {
    var melhor = -1, melhorChave = null;
    dia.turnos.forEach(function (t, i) {
      var ganho = ganhoTurno(blocos, t);
      if (ganho === 0) return;
      var chave = [ -ganho, porTurno[i], contagem[p.nome][t.rotulo] || 0, i ];
      if (melhor < 0 || comparaChave(chave, melhorChave) < 0) { melhor = i; melhorChave = chave; }
    });
    if (melhor < 0) { resultado[p.nome] = { tipo: "livre" }; return; }
    var t = dia.turnos[melhor];
    aplicarTurno(blocos, t);
    porTurno[melhor]++;
    contagem[p.nome][t.rotulo] = (contagem[p.nome][t.rotulo] || 0) + 1;
    contagem[p.nome].total++;
    resultado[p.nome] = { tipo: "turno", inicio: paraHora(t.inicio), fim: paraHora(t.fim), rotulo: t.rotulo, horas: (t.fim - t.inicio) / 60 };
  });
  return resultado;
}

function comparaChave(a, b) {
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

/* ===================================================================== */
/* Passo 5 — avisos em linguagem de dono de negócio                      */
/* ===================================================================== */

/**
 * Descreve os buracos de um dia como faixas: [{deficit, inicio, fim, horas}].
 */
function faixasDescobertas(blocos) {
  var faixas = [];
  var atual = null;
  blocos.forEach(function (b) {
    var deficit = Math.max(0, b.necessario - b.escalado);
    if (deficit > 0 && atual && atual.deficit === deficit && atual.fim === b.inicio) {
      atual.fim = b.inicio + BLOCO_MIN;
    } else if (deficit > 0) {
      atual = { deficit: deficit, inicio: b.inicio, fim: b.inicio + BLOCO_MIN };
      faixas.push(atual);
    } else {
      atual = null;
    }
  });
  faixas.forEach(function (f) { f.horas = (f.fim - f.inicio) / 60; });
  return faixas;
}

function textoFaixas(faixas) {
  return faixas.map(function (f) {
    return f.deficit + (f.deficit === 1 ? " pessoa a menos" : " pessoas a menos") +
      " das " + horaFalada(f.inicio) + " às " + horaFalada(f.fim);
  }).join(" e ");
}

/** Agrupa dias consecutivos com o mesmo texto: "De segunda a sexta". */
function rotuloGrupo(grupo) {
  if (grupo.length === 1) return NOME_DIA[grupo[0]];
  var consecutivos = true;
  for (var i = 1; i < grupo.length; i++) {
    if (DIAS.indexOf(grupo[i]) !== DIAS.indexOf(grupo[i - 1]) + 1) consecutivos = false;
  }
  if (consecutivos && grupo.length >= 3) return "De " + NOME_DIA[grupo[0]].toLowerCase() + " a " + NOME_DIA[grupo[grupo.length - 1]].toLowerCase();
  var nomes = grupo.map(function (d, i) { return i === 0 ? NOME_DIA[d] : NOME_DIA[d].toLowerCase(); });
  return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
}

/* ===================================================================== */
/* Função principal                                                      */
/* ===================================================================== */

/**
 * Gera a escala semanal. Veja o README para o formato de entrada e saída.
 */
function gerarEscala(input) {
  input = input || {};
  var regras = {
    jornadaSemanal: 40, jornadaDiariaMax: 8, folgasPorSemana: 2, intervaloMin: 60
  };
  if (input.regras) for (var k in input.regras) if (input.regras[k] != null) regras[k] = Number(input.regras[k]);
  var semana = String(input.semana || "A").toUpperCase() === "B" ? "B" : "A";
  var tipo = input.negocio && input.negocio.tipo ? input.negocio.tipo : "";
  var salario = Number(input.salarioMedio || (input.negocio && input.negocio.salarioMedio) || 0);
  var avisos = [];

  // Equipe: lista de pessoas ou um número N
  var funcionarios = [];
  if (typeof input.funcionarios === "number") {
    funcionarios = exemploEquipe(Math.max(0, Math.round(input.funcionarios)), tipo);
  } else if (Array.isArray(input.funcionarios)) {
    funcionarios = input.funcionarios.map(function (f, i) {
      return typeof f === "string" ? { nome: f } : copiar(f);
    });
  }
  funcionarios = funcionarios.map(function (f, i) {
    var p = copiar(f);
    p.nome = p.nome || ("Pessoa " + (i + 1));
    p.funcao = p.funcao || "";
    p.indice = i;
    return p;
  });

  var dias = montarDias(input.funcionamento, regras);
  var abertos = DIAS.filter(function (d) { return dias[d].aberto; });

  // Saída vazia quando não dá para montar nada
  if (!funcionarios.length || !abertos.length) {
    if (!funcionarios.length) avisos.push("Sem funcionários não há escala para montar. Informe pelo menos 1 pessoa.");
    if (!abertos.length) avisos.push("Nenhum dia com horário de funcionamento. Informe pelo menos 1 dia aberto.");
    var cobVazia = {};
    DIAS.forEach(function (d) {
      cobVazia[d] = dias[d].aberto
        ? { necessario: dias[d].pessoas, blocos: criarBlocos(dias[d]), horasDescobertas: dias[d].demanda, horasSobrando: 0 }
        : { necessario: 0, blocos: [], horasDescobertas: 0, horasSobrando: 0 };
    });
    var hd = 0; abertos.forEach(function (d) { hd += dias[d].demanda; });
    return {
      dias: DIAS.slice(), grade: [], cobertura: cobVazia,
      resumo: { horasDescobertasSemana: hd, horasSobrandoSemana: 0, folgasPorDia: {}, pessoasPorDia: {}, semana: semana },
      avisos: avisos, ok: false
    };
  }

  // Passo 2: folgas
  var folgas = distribuirFolgas(funcionarios, dias, regras, semana, avisos);

  // Passo 3: turnos por dia
  var contagem = {};
  funcionarios.forEach(function (p) { contagem[p.nome] = { total: 0 }; });
  var gradePorNome = {};
  funcionarios.forEach(function (p) { gradePorNome[p.nome] = {}; });
  var cobertura = {};
  var folgasPorDia = {}, pessoasPorDia = {};

  DIAS.forEach(function (d) {
    var dia = dias[d];
    if (!dia.aberto) {
      funcionarios.forEach(function (p) { gradePorNome[p.nome][d] = { tipo: "fechado" }; });
      cobertura[d] = { necessario: 0, blocos: [], horasDescobertas: 0, horasSobrando: 0 };
      folgasPorDia[d] = funcionarios.length;
      pessoasPorDia[d] = 0;
      return;
    }
    var blocos = criarBlocos(dia);
    var disponiveis = funcionarios.filter(function (p) { return !folgas[p.nome][d]; });
    var escalados = escalarDia(dia, disponiveis, contagem, blocos);
    var nPessoas = 0, nFolgas = 0;
    funcionarios.forEach(function (p) {
      if (folgas[p.nome][d]) { gradePorNome[p.nome][d] = { tipo: "folga" }; nFolgas++; }
      else { gradePorNome[p.nome][d] = escalados[p.nome]; if (escalados[p.nome].tipo === "turno") nPessoas++; }
    });
    folgasPorDia[d] = nFolgas;
    pessoasPorDia[d] = nPessoas;
    // Passo 4: cobertura hora a hora
    var desc = 0, sobra = 0;
    blocos.forEach(function (b) {
      desc += Math.max(0, b.necessario - b.escalado) * (BLOCO_MIN / 60);
      sobra += Math.max(0, b.escalado - b.necessario) * (BLOCO_MIN / 60);
    });
    cobertura[d] = {
      necessario: dia.pessoas,
      blocos: blocos.map(function (b) { return { hora: b.hora, necessario: b.necessario, escalado: b.escalado }; }),
      horasDescobertas: desc, horasSobrando: sobra, faixas: faixasDescobertas(blocos)
    };
  });

  // Passo 4 (continuação): horas semanais; encurta se passar da jornada
  var grade = funcionarios.map(function (p) {
    var horas = 0;
    DIAS.forEach(function (d) { var c = gradePorNome[p.nome][d]; if (c.tipo === "turno") horas += c.horas; });
    if (horas > regras.jornadaSemanal + 1e-9) {
      var excesso = horas - regras.jornadaSemanal;
      // Encurta o fim dos últimos turnos até caber na jornada.
      for (var i = DIAS.length - 1; i >= 0 && excesso > 1e-9; i--) {
        var c = gradePorNome[p.nome][DIAS[i]];
        if (c.tipo !== "turno") continue;
        var corte = Math.min(excesso, c.horas - 1);
        if (corte <= 0) continue;
        c.fim = paraHora(paraMinutos(c.fim) - Math.round(corte * 60));
        c.horas -= corte;
        excesso -= corte;
      }
      horas = regras.jornadaSemanal;
      avisos.push(p.nome + " passaria de " + regras.jornadaSemanal + " h na semana; os últimos turnos foram encurtados para caber na jornada.");
    }
    var diasObj = {};
    DIAS.forEach(function (d) {
      var c = copiar(gradePorNome[p.nome][d]);
      delete c.horas;
      diasObj[d] = c;
    });
    return { nome: p.nome, funcao: p.funcao, horasSemana: Math.round(horas * 10) / 10, dias: diasObj };
  });

  // Resumo
  var horasDesc = 0, horasSobra = 0;
  DIAS.forEach(function (d) { horasDesc += cobertura[d].horasDescobertas; horasSobra += cobertura[d].horasSobrando; });
  var resumo = {
    horasDescobertasSemana: Math.round(horasDesc * 10) / 10,
    horasSobrandoSemana: Math.round(horasSobra * 10) / 10,
    folgasPorDia: folgasPorDia, pessoasPorDia: pessoasPorDia, semana: semana
  };

  // Passo 5: avisos
  montarAvisos(avisos, funcionarios, dias, abertos, cobertura, grade, regras, semana, salario);

  // Limpa o campo interno "faixas" da cobertura pública (fica em cobertura[d].faixas mesmo; útil ao PDF)
  return { dias: DIAS.slice(), grade: grade, cobertura: cobertura, resumo: resumo, avisos: avisos, ok: true };
}

/** Gera os avisos finais (horas descobertas, folgas, intervalo, reservas). */
function montarAvisos(avisos, funcionarios, dias, abertos, cobertura, grade, regras, semana, salario) {
  // Horas descobertas, agrupando dias com o mesmo buraco
  var grupos = [];
  abertos.forEach(function (d) {
    var c = cobertura[d];
    if (!c.faixas.length) return;
    var texto = textoFaixas(c.faixas);
    var ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.texto === texto && ultimo.horas === c.horasDescobertas) ultimo.dias.push(d);
    else grupos.push({ texto: texto, horas: c.horasDescobertas, dias: [d] });
  });
  grupos.forEach(function (g) {
    var totalGrupo = g.horas * g.dias.length;
    var msg = rotuloGrupo(g.dias) + (g.dias.length > 1 ? " ficam com " : " fica com ") + g.texto + " (" + fmtHoras(g.horas) +
      (g.dias.length > 1 ? " por dia, " + fmtHoras(totalGrupo) + " na semana" : " descobertas") + ").";
    var opcoes = [];
    if (totalGrupo <= 22) opcoes.push("1 pessoa em meio período" + (g.dias.length === 1 ? " " + prepDia(g.dias[0]) : ""));
    else if (totalGrupo <= 32) opcoes.push("1 pessoa em contrato parcial (30 h)");
    else opcoes.push(Math.ceil(totalGrupo / regras.jornadaSemanal) + " pessoa(s) em tempo integral");
    if (salario > 0) {
      var custo = totalGrupo * 4.33 * (salario / 200) * 1.5;
      opcoes.push("hora extra de ~" + fmtReais(custo) + "/mês");
    } else {
      opcoes.push("hora extra (no máximo 2 h por pessoa por dia)");
    }
    avisos.push(msg + " Opções: " + opcoes.join(" ou ") + ".");
  });

  // Hora extra tem limite legal de 2 h por pessoa por dia
  var totalDesc = 0;
  abertos.forEach(function (d) { totalDesc += cobertura[d].horasDescobertas; });
  var diasTrabalho = Math.min(abertos.length, 7 - regras.folgasPorSemana);
  if (totalDesc > 0 && funcionarios.length > 0 && diasTrabalho > 0) {
    var heDia = totalDesc / (funcionarios.length * diasTrabalho);
    if (heDia > 2) {
      avisos.push("Cobrir tudo só com hora extra daria cerca de " + fmtHoras(heDia) + " extras por pessoa por dia, acima do limite legal de 2 h. Hora extra sozinha não resolve: é preciso contratar ou reduzir horário.");
    }
  }

  // Reservas (gente sobrando)
  var reservas = {};
  grade.forEach(function (g) {
    DIAS.forEach(function (d) { if (g.dias[d].tipo === "livre") (reservas[d] = reservas[d] || []).push(g.nome); });
  });
  var diasReserva = DIAS.filter(function (d) { return reservas[d]; });
  if (diasReserva.length) {
    avisos.push("Sobra gente em " + diasReserva.map(function (d) { return NOME_DIA[d].toLowerCase() + " (" + reservas[d].join(", ") + ")"; }).join(", ") +
      ": marcado como reserva. Use para cobrir faltas, férias e atestados.");
  }

  // Folgas e rodízio
  var fdsAbertos = FIM_DE_SEMANA.filter(function (d) { return dias[d].aberto; });
  var fechados = DIAS.filter(function (d) { return !dias[d].aberto; });
  var txtFolga = "Cada pessoa tem " + regras.folgasPorSemana + " folgas por semana";
  if (fechados.length) txtFolga += " (" + fechados.map(function (d) { return NOME_DIA[d].toLowerCase(); }).join(" e ") + ", que o negócio fecha, " + (fechados.length === 1 ? "conta" : "contam") + " como folga)";
  if (fdsAbertos.length) txtFolga += "; o rodízio alterna quem folga no fim de semana entre as semanas A e B (esta é a semana " + semana + ")";
  avisos.push(txtFolga + ".");

  // Intervalo
  var maxTurno = 0;
  grade.forEach(function (g) {
    DIAS.forEach(function (d) {
      var c = g.dias[d];
      if (c.tipo === "turno") maxTurno = Math.max(maxTurno, (paraMinutos(c.fim) - paraMinutos(c.inicio)) / 60);
    });
  });
  if (maxTurno > 6) {
    avisos.push("Turnos acima de 6 h precisam de " + (regras.intervaloMin >= 60 ? Math.round(regras.intervaloMin / 60) + " h" : regras.intervaloMin + " min") +
      " de intervalo para refeição, que não conta como trabalho. Combine o horário do intervalo para não esvaziar o balcão.");
  } else if (maxTurno > 4) {
    avisos.push("Turnos de 4 a 6 h precisam de 15 min de intervalo, que não conta como trabalho.");
  }
}

function prepDia(d) {
  if (d === "sab") return "aos sábados";
  if (d === "dom") return "aos domingos";
  return "às " + NOME_DIA[d].toLowerCase() + "s";
}

/* ===================================================================== */
/* Resumo em texto                                                       */
/* ===================================================================== */

/**
 * 3–4 frases em português resumindo a escala gerada.
 */
function resumoEscala(saida) {
  if (!saida || !saida.ok) {
    return "Não foi possível montar a escala: " + ((saida && saida.avisos && saida.avisos[0]) || "dados insuficientes.");
  }
  var n = saida.grade.length;
  var abertos = saida.dias.filter(function (d) { return saida.cobertura[d].necessario > 0; });
  var fechados = saida.dias.filter(function (d) { return saida.cobertura[d].necessario === 0; });
  var folgasPessoa = Math.min.apply(null, saida.grade.map(function (g) {
    return saida.dias.filter(function (d) { return g.dias[d].tipo === "folga" || g.dias[d].tipo === "fechado"; }).length;
  }));
  var frases = [];
  frases.push("Com " + n + (n === 1 ? " pessoa" : " pessoas") + " e " + folgasPessoa + " folgas cada, a escala cobre " +
    (abertos.length === 7 ? "a semana inteira" : rotuloGrupo(abertos).toLowerCase().replace(/^de /, "de ")) +
    (fechados.length ? " (fechado " + fechados.map(function (d) { return NOME_DIA_CURTO[d]; }).join(" e ") + ")" : "") + ".");

  var hd = saida.resumo.horasDescobertasSemana;
  if (hd <= 0.05) {
    frases.push("Todas as horas de funcionamento ficam cobertas com a equipe atual.");
  } else {
    var piores = abertos.slice().sort(function (a, b) { return saida.cobertura[b].horasDescobertas - saida.cobertura[a].horasDescobertas; });
    var pior = piores[0];
    var c = saida.cobertura[pior];
    frases.push("Ficam " + fmtHoras(hd) + " descobertas na semana" +
      (c.horasDescobertas > 0 ? "; o pior dia é " + NOME_DIA[pior].toLowerCase() + ", com " + textoFaixas(c.faixas) : "") + ".");
  }
  if (saida.resumo.horasSobrandoSemana > 0.05) {
    frases.push("Em alguns horários há gente a mais (" + fmtHoras(saida.resumo.horasSobrandoSemana) + " na semana), que serve de reserva para faltas e férias.");
  }
  var maxH = Math.max.apply(null, saida.grade.map(function (g) { return g.horasSemana; }));
  frases.push("Ninguém passa de " + String(maxH).replace(".", ",") + " h por semana e o fim de semana é alternado entre as semanas A e B.");
  return frases.join(" ");
}

/* ===================================================================== */
/* Exportação (Node) — no Apps Script as funções ficam globais            */
/* ===================================================================== */

if (typeof module !== "undefined") module.exports = { gerarEscala, exemploEquipe, resumoEscala, DIAS, NOME_DIA, NOME_DIA_CURTO, fmtHoras, fmtReais };
