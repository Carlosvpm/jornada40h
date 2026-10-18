/**
 * Jornada 40h — template do relatório em PDF (2 páginas A4) e da imagem
 * de exemplo da escala para a landing page.
 *
 * - renderRelatorioHTML(dados)  -> HTML completo, sem JS, sem recursos externos,
 *   layout só com <table>, fontes do sistema (Georgia / Arial). Pensado para
 *   HtmlService.createHtmlOutput(html).getBlob().getAs("application/pdf") no
 *   Apps Script e também para page.pdf() do Chromium.
 * - renderExemploEscalaHTML(escala, opcoes) -> só a grade, com Lora/Inter via
 *   @font-face e CSS moderno, para virar PNG de 1200 px na landing page.
 *
 * Sintaxe compatível com Apps Script (ES2019, sem módulos ES).
 */

/* ===================================================================== */
/* Paleta e utilidades                                                   */
/* ===================================================================== */

var COR = {
  navy900: "#0B1428", navy800: "#0F1B33", navy700: "#16264A",
  gold: "#D4A72C", goldDark: "#B88E1E", goldWash: "#FBF1D6",
  green: "#1F8A70", greenWash: "#E6F4F0",
  red: "#C8102E", redWash: "#FDECEF",
  ink: "#14213D", muted: "#5B6478", line: "#E6EBF5", wash: "#F3F5F9",
  turnoWash: "#EEF2FA", fechado: "#ECEEF3"
};

var DIAS_PDF = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
var ROTULO_DIA = { seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom" };

/** Escapa texto para HTML. */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 2083 -> "R$ 2.083" (sem centavos). */
function brl(v) {
  var n = Math.round(Number(v) || 0);
  var neg = n < 0; n = Math.abs(n);
  var s = String(n), out = "";
  while (s.length > 3) { out = "." + s.slice(-3) + out; s = s.slice(0, -3); }
  return (neg ? "−" : "") + "R$ " + s + out;
}

/** Preço com centavos quando houver: 47.9 -> "R$ 47,90"; 77 -> "R$ 77". */
function brlPreco(v) {
  var n = Number(v) || 0;
  if (Math.round(n) === n) return brl(n);
  return "R$ " + n.toFixed(2).replace(".", ",");
}

/** 8.25 -> "8,3"; 8 -> "8". */
function num1(v) {
  var n = Math.round((Number(v) || 0) * 10) / 10;
  return String(n).replace(".", ",");
}

function plural(n, um, varios) { return Number(n) === 1 ? um : varios; }

/** Horas de um turno "06:00"–"14:00". */
function horasTurno(c) {
  var a = c.inicio.split(":"), f = c.fim.split(":");
  var h = (Number(f[0]) + Number(f[1]) / 60) - (Number(a[0]) + Number(a[1]) / 60);
  return h < 0 ? h + 24 : h;
}

/* ===================================================================== */
/* Página 1 — diagnóstico                                                */
/* ===================================================================== */

/** Decide o modo do diagnóstico: "ok", "parcial" ou "contratar". */
function modoDiagnostico(lead) {
  var hd = Number(lead.horasDescobertas) || 0;
  var fam = lead.funcionariosAMais != null ? Number(lead.funcionariosAMais) : hd / 40;
  if (hd <= 0.05) return "ok";
  if (fam < 1) return "parcial";
  return "contratar";
}

function cabecalho(marca, data, titulo, extra) {
  return '<table class="head" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td class="head-l"><table cellpadding="0" cellspacing="0"><tr>' +
    '<td class="selo">40h</td>' +
    '<td class="head-brand"><b>' + esc(marca.nome) + '</b><br><span>' + esc(titulo) + '</span></td>' +
    '</tr></table></td>' +
    '<td class="head-r">' + (extra || "") + '<span class="head-date">' + esc(data) + '</span></td>' +
    '</tr></table>';
}

function rodape(marca, pagina, aviso) {
  return '<table class="foot" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td class="foot-l">' + (aviso ? esc(aviso) : esc(marca.site) + ' · ' + esc(marca.email)) + '</td>' +
    '<td class="foot-r">' + esc(marca.nome) + ' · página ' + pagina + ' de 2</td>' +
    '</tr></table>';
}

function pagina1(d) {
  var lead = d.lead, marca = d.marca;
  var modo = modoDiagnostico(lead);
  var F = Number(lead.funcionarios) || 0, P = Number(lead.pessoasSimultaneas) || 0;
  var hd = Number(lead.horasDescobertas) || 0;
  var fam = lead.funcionariosAMais != null ? Number(lead.funcionariosAMais) : hd / 40;
  var custoHE = Number(lead.custoHoraExtraMes) || 0;
  var custoContratar = Number(lead.custoContratarMes) || 0;
  var reduzir = Number(lead.horasReduzir) || (P ? hd / P : 0);
  var heDia = F > 0 ? hd / (F * 5) : Infinity;
  var horasAbertas = Number(lead.horasAbertasSemana) || 0;
  var C = horasAbertas * P;
  var fdsTexto = Number(lead.diasAbertos) >= 7 ? "fim de semana" : "sábado";
  var primeiroNome = String(lead.nome || "").split(" ")[0];

  var eyebrow, titulo, sub, destaqueValor, destaqueRotulo, destaqueClasse;
  if (modo === "ok") {
    eyebrow = "Boa notícia";
    titulo = "Sua equipe cobre as 40 horas, mas são " + F + plural(F, " folga", " folgas") + " a mais por semana para encaixar";
    sub = "Você não precisa contratar. Mas cada pessoa ganha uma folga a mais, e são " + F + plural(F, " folga nova", " folgas novas") +
      " por semana para distribuir sem deixar o " + fdsTexto + " descoberto.";
    destaqueValor = "+" + F; destaqueRotulo = plural(F, "folga por semana", "folgas por semana"); destaqueClasse = "ok";
  } else if (modo === "parcial") {
    eyebrow = "Atenção";
    titulo = "Faltam " + num1(hd) + " horas por semana na sua escala";
    sub = "É menos de um funcionário inteiro. Isso quase sempre se resolve com revezamento de folgas e um reforço de " + fdsTexto +
      ", sem contratar ninguém em tempo integral. Mas, deixado no improviso, vira hora extra todo mês.";
    destaqueValor = num1(hd) + " h"; destaqueRotulo = "por semana sem ninguém"; destaqueClasse = "alerta";
  } else {
    eyebrow = "Atenção";
    titulo = "Você vai precisar de +" + num1(fam) + plural(fam < 1.95 ? 1 : 2, " funcionário", " funcionários");
    sub = "Com 40 horas, sua equipe atual não cobre o horário de funcionamento: ficam " + num1(hd) + " horas por semana sem ninguém. " +
      (lead.contratarTexto ? "Contratando " + lead.contratarTexto + ", são cerca de " + brl(custoContratar) + " a mais por mês." : "");
    destaqueValor = "+" + num1(fam); destaqueRotulo = plural(fam < 1.95 ? 1 : 2, "funcionário", "funcionários"); destaqueClasse = "alerta";
  }

  // Cards
  var cards;
  if (modo === "ok") {
    cards = [
      { t: "Contratar", v: brl(0), s: "Sua equipe atual já cobre as horas. Não precisa contratar." },
      { t: "Hora extra", v: brl(0), s: "Sem horas descobertas, não há hora extra obrigatória." },
      { t: "Folgas", v: "+" + F + plural(F, " folga", " folgas") + "/sem", s: "Cada pessoa ganha 1 folga a mais por semana. São " + F + " dias de folga novos para distribuir sem deixar o " + fdsTexto + " descoberto." }
    ];
  } else {
    var fracaoTxt = lead.contratarTexto ? lead.contratarTexto : "1 pessoa";
    var maisBarato = (heDia > 2 || custoContratar <= custoHE) ? 0 : 1;
    cards = [
      { t: "Contratar", v: brl(custoContratar) + "/mês", s: "Contratar " + fracaoTxt + " para cobrir as " + num1(hd) + " h por semana que ficam sem ninguém. Inclui estimativa de encargos.", tag: maisBarato === 0 ? "menor custo" : "" },
      { t: "Hora extra", v: brl(custoHE) + "/mês", s: "Cobrir as " + num1(hd) + " h semanais com a equipe atual, com adicional de 50%. Todo mês, para sempre." +
          (heDia > 2 ? " <span class=\"warn\">Cerca de " + num1(heDia) + " h extras por pessoa por dia, acima do limite de 2 h. Não é sustentável.</span>" : ""), tag: maisBarato === 1 ? "menor custo" : "", semEsc: true },
      { t: "Reduzir horário", v: "−" + num1(reduzir) + " h/sem", s: "Fechar " + num1(reduzir) + " h a menos por semana. Sem custo extra, mas você perde as vendas desses horários." }
    ];
  }
  var cardsHtml = '<table class="cards" width="100%" cellpadding="0" cellspacing="0"><tr>' + cards.map(function (c, i) {
    return '<td class="card' + (i === 0 ? ' first' : '') + (c.tag ? ' best' : '') + '">' +
      '<div class="card-t">' + esc(c.t) + (c.tag ? '<span class="tag">' + esc(c.tag) + '</span>' : '') + '</div>' +
      '<div class="card-v">' + esc(c.v) + '</div>' +
      '<div class="card-s">' + (c.semEsc ? c.s : esc(c.s)) + '</div></td>';
  }).join("") + '</tr></table>';

  // Como a conta foi feita
  var conta = "Aberto " + num1(horasAbertas) + " h por semana, com " + P + plural(P, " pessoa", " pessoas") + " ao mesmo tempo: " +
    num1(C) + " h de trabalho por semana. Com 44 h isso pedia " + num1(C / 44) + " funcionários; com 40 h, pede " + num1(C / 40) + ". Você tem " + F + ".";

  // O que a escala 5x2 muda (ponte para a página 2)
  var ponte;
  if (modo === "ok") {
    ponte = "Montada no improviso, sobra gente na segunda e falta no " + fdsTexto + ". A escala da próxima página mostra como ficam as folgas e o rodízio.";
  } else if (modo === "parcial") {
    ponte = "A escala da próxima página mostra, hora a hora, onde as " + num1(hd) + " h ficam descobertas e o que resolve com menos custo.";
  } else {
    var menor = Math.min(custoContratar, heDia > 2 ? Infinity : custoHE);
    ponte = "A saída mais barata ainda custa " + brl(menor) + " por mês. Uma escala montada no movimento real do seu negócio pode reduzir esse número: veja na próxima página.";
  }

  var dados = [
    ["Negócio", lead.tipo], ["Dias abertos", lead.diasAbertos + " por semana"],
    ["Horas abertas", num1(horasAbertas) + " h/semana"], ["Pessoas ao mesmo tempo", P],
    ["Funcionários hoje", F], ["Salário médio", brl(lead.salarioMedio)]
  ];

  return '<div class="page">' +
    cabecalho(marca, d.data, "Diagnóstico da escala 5x2", '<span class="head-who">' + esc(lead.nome) + '</span>') +
    '<div class="eyebrow ' + destaqueClasse + '">' + esc(eyebrow) + ' · ' + esc(lead.tipo) + '</div>' +
    '<h1>' + esc(titulo) + '</h1>' +
    '<table class="hero" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td class="hero-num ' + destaqueClasse + '"><div class="big">' + esc(destaqueValor) + '</div><div class="big-l">' + esc(destaqueRotulo) + '</div></td>' +
    '<td class="hero-txt"><p>' + esc(sub) + '</p><p class="conta">' + esc(conta) + '</p></td>' +
    '</tr></table>' +
    '<div class="sec">Suas três opções' + (modo === "ok" ? " (o que muda mesmo sem contratar)" : " para fechar a conta") + '</div>' +
    cardsHtml +
    '<div class="ponte"><span class="ponte-ico">→</span>' + esc(ponte) + '</div>' +
    '<div class="sec small">O que muda com o fim da 6x1</div>' +
    '<table class="muda" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td><b>44 h → 40 h</b><span>Jornada semanal menor para todo mundo, com o mesmo salário.</span></td>' +
    '<td><b>6x1 → 5x2</b><span>Cinco dias de trabalho e duas folgas por semana para cada pessoa.</span></td>' +
    '<td><b>Rodízio A/B</b><span>Quem folga no ' + esc(fdsTexto) + ' alterna de uma semana para a outra. Ninguém fica só com o pior dia.</span></td>' +
    '<td><b>Hora extra: 2 h/dia</b><span>Limite legal por pessoa. Acima disso, só contratando ou reduzindo horário.</span></td>' +
    '</tr></table>' +
    '<div class="sec small">Dados usados</div>' +
    '<table class="dados" cellpadding="0" cellspacing="0"><tr>' + dados.map(function (x) {
      return '<td><span>' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></td>';
    }).join("") + '</tr></table>' +
    '<p class="nota">Como calculamos: horas abertas × pessoas ao mesmo tempo = horas de trabalho por semana; cada funcionário em 40 h cobre 40 dessas horas. Hora extra = horas descobertas × 4,33 semanas × (salário ÷ 200) × 1,5. Contratação = salário × 1,7 (estimativa de encargos), proporcional ao contrato.</p>' +
    '<div class="spacer"></div>' +
    rodape(marca, 1, "Valores estimados a partir dos dados que você informou. Confirme com seu contador antes de decidir.") +
    '</div>';
}

/* ===================================================================== */
/* Página 2 — escala de exemplo + oferta                                 */
/* ===================================================================== */

/** Célula da grade (compartilhada entre o PDF e a imagem da LP). */
function celulaGrade(c) {
  if (!c) return '<td class="c-fechado">—</td>';
  if (c.tipo === "turno") return '<td class="c-turno"><b>' + esc(c.inicio) + '–' + esc(c.fim) + '</b><i>' + esc(c.rotulo) + '</i></td>';
  if (c.tipo === "folga") return '<td class="c-folga">folga</td>';
  if (c.tipo === "livre") return '<td class="c-livre">reserva</td>';
  return '<td class="c-fechado">—</td>';
}

/** Tabela pessoa × dia com as linhas de totais. */
function tabelaGrade(escala, compacta) {
  var html = '<table class="grade' + (compacta ? ' compacta' : '') + '" width="100%" cellpadding="0" cellspacing="0">';
  html += '<tr><th class="th-nome">Pessoa</th>' + DIAS_PDF.map(function (d) {
    var cob = escala.cobertura[d];
    var aberto = cob && cob.necessario > 0;
    return '<th>' + ROTULO_DIA[d] + (aberto ? '<i>' + esc(cob.blocos[0].hora) + '–' + esc(fimDia(cob)) + '</i>' : '<i>fechado</i>') + '</th>';
  }).join("") + '<th class="th-h">h/sem</th></tr>';
  escala.grade.forEach(function (g) {
    html += '<tr><td class="nome"><b>' + esc(g.nome) + '</b>' + (g.funcao ? '<i>' + esc(g.funcao) + '</i>' : '') + '</td>' +
      DIAS_PDF.map(function (d) { return celulaGrade(g.dias[d]); }).join("") +
      '<td class="h">' + num1(g.horasSemana) + ' h</td></tr>';
  });
  html += '<tr class="tot"><td class="nome">Pessoas no dia</td>' + DIAS_PDF.map(function (d) {
    var cob = escala.cobertura[d];
    if (!cob || !cob.necessario) return '<td class="c-fechado">—</td>';
    var n = escala.resumo.pessoasPorDia[d];
    return '<td>' + n + ' <span>(' + cob.necessario + ' por vez)</span></td>';
  }).join("") + '<td></td></tr>';
  html += '</table>';
  return html;
}

/** Hora de fechamento a partir dos blocos (último bloco + 30 min). */
function fimDia(cob) {
  var ult = cob.blocos[cob.blocos.length - 1].hora.split(":");
  var min = Number(ult[0]) * 60 + Number(ult[1]) + 30;
  var h = Math.floor((min % 1440) / 60), m = min % 60;
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}

/** Mini-barras de cobertura por dia (necessário vs escalado). */
function barrasCobertura(escala) {
  var html = '<table class="barras" width="100%" cellpadding="0" cellspacing="0"><tr>';
  DIAS_PDF.forEach(function (d) {
    var cob = escala.cobertura[d];
    if (!cob || !cob.necessario) {
      html += '<td class="barra-td off"><div class="barra-l">' + ROTULO_DIA[d] + '</div><div class="barra-v">fechado</div></td>';
      return;
    }
    var precisa = cob.blocos.length * 0.5 * cob.necessario;
    var coberto = Math.max(0, precisa - cob.horasDescobertas);
    var pct = precisa > 0 ? Math.round(coberto / precisa * 100) : 100;
    html += '<td class="barra-td"><div class="barra-l">' + ROTULO_DIA[d] + '</div>' +
      '<table class="barra" width="100%" cellpadding="0" cellspacing="0"><tr>' +
      (pct > 0 ? '<td class="ok" width="' + pct + '%"></td>' : '') +
      (pct < 100 ? '<td class="falta" width="' + (100 - pct) + '%"></td>' : '') +
      '</tr></table>' +
      '<div class="barra-v' + (cob.horasDescobertas > 0 ? ' falta' : '') + '">' +
      (cob.horasDescobertas > 0 ? 'faltam ' + num1(cob.horasDescobertas) + ' h' : 'coberto') + '</div></td>';
  });
  html += '</tr></table>';
  return html;
}

function pagina2(d) {
  var escala = d.escala, oferta = d.oferta, marca = d.marca, lead = d.lead;
  var n = escala.grade.length;
  var compacta = n > 7;
  var hd = escala.resumo.horasDescobertasSemana;
  var avisos = (escala.avisos || []).slice(0, compacta ? 5 : 6);
  var maxAvisoLen = 320;

  var hdPagina = Number(lead.horasDescobertas) || 0;
  var introGrade = n + plural(n, " pessoa", " pessoas") + ", " + escala.cobertura.seg.necessario + " ao mesmo tempo, 2 folgas por semana cada, semana " + esc(escala.resumo.semana) +
    ". " + (hd > 0.05 ? "Ficam " + num1(hd) + " h descobertas na semana (em vermelho abaixo)." : "Todas as horas de funcionamento ficam cobertas.");
  if (Math.abs(hd - hdPagina) > 1) {
    introGrade += " A conta rápida da página anterior soma horas soltas (" + num1(hdPagina) + " h); a escala de verdade, com turnos inteiros e 2 folgas por pessoa, mostra " + num1(hd) + " h. É esta que vale na prática.";
  }

  return '<div class="page">' +
    cabecalho(marca, d.data, "Como ficaria sua escala 5x2", '<span class="head-who">' + esc(lead.nome) + '</span>') +
    '<table class="faixa" width="100%" cellpadding="0" cellspacing="0"><tr><td class="faixa-tag">EXEMPLO</td>' +
    '<td class="faixa-txt">Montada com uma equipe de exemplo do mesmo tamanho e horário do seu negócio. <b>A sua vem com os nomes e horários da sua equipe.</b></td></tr></table>' +
    '<h2>Como ficaria sua escala 5x2</h2>' +
    '<p class="intro">' + introGrade + '</p>' +
    tabelaGrade(escala, compacta) +
    '<table class="legenda" cellpadding="0" cellspacing="0"><tr>' +
    '<td><span class="sw c-turno"></span>turno de trabalho</td>' +
    '<td><span class="sw c-folga"></span>folga</td>' +
    '<td><span class="sw c-livre"></span>reserva (sobra gente)</td>' +
    '<td><span class="sw c-fechado"></span>fechado</td></tr></table>' +
    '<div class="sec small">Cobertura por dia: horas de trabalho necessárias × horas escaladas</div>' +
    barrasCobertura(escala) +
    '<div class="sec small">O que a escala mostra</div>' +
    '<ul class="avisos">' + avisos.map(function (a) {
      var t = a.length > maxAvisoLen ? a.slice(0, maxAvisoLen - 1).replace(/\s+\S*$/, "") + "…" : a;
      return '<li>' + esc(t) + '</li>';
    }).join("") + '</ul>' +
    '<table class="oferta" width="100%" cellpadding="0" cellspacing="0"><tr>' +
    '<td class="of-l"><div class="of-t">Receba a escala real do seu negócio</div>' +
    '<ul class="of-list">' +
    '<li>Com os nomes, funções e horários da sua equipe</li>' +
    '<li>Folgas, rodízio de ' + (lead.diasAbertos >= 7 ? "fim de semana" : "sábado") + ' (semanas A e B) e cobertura hora a hora</li>' +
    '<li>Onde falta gente e a opção mais barata para cobrir</li>' +
    '<li>Entrega em até 48 h · Garantia de 7 dias: não serviu, devolvemos</li>' +
    '</ul></td>' +
    '<td class="of-r"><div class="of-de">de <s>' + esc(brlPreco(oferta.precoCheio)) + '</s></div>' +
    '<div class="of-preco">' + esc(brlPreco(oferta.precoFundador)) + '</div>' +
    '<div class="of-ate">preço de fundador até ' + esc(oferta.ate) + ' · pagamento único</div>' +
    '<a class="btn" href="' + esc(oferta.checkoutUrl) + '">Quero minha escala pronta</a>' +
    '<div class="of-url">' + esc(oferta.checkoutUrl) + '</div></td>' +
    '</tr></table>' +
    '<div class="spacer"></div>' +
    rodape(marca, 2) +
    '</div>';
}

/* ===================================================================== */
/* CSS do relatório (só o que o conversor do Apps Script entende)        */
/* ===================================================================== */

function cssRelatorio() {
  return [
    '@page { size: A4; margin: 0; }',
    'html, body { margin: 0; padding: 0; }',
    'body { font-family: Arial, Helvetica, sans-serif; color: ' + COR.ink + '; font-size: 11px; line-height: 1.45; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    '.page { width: 210mm; height: 297mm; padding: 14mm; box-sizing: border-box; page-break-after: always; overflow: hidden; position: relative; background: #fff; }',
    '.page:last-child { page-break-after: auto; }',
    'table { border-collapse: collapse; }',
    'td, th { vertical-align: top; }',
    'p { margin: 0 0 6px; }',
    'h1, h2, .of-t, .of-preco, .big { font-family: Georgia, "Times New Roman", serif; }',
    /* cabeçalho */
    '.head { background: ' + COR.navy800 + '; border-radius: 8px; }',
    '.head td { vertical-align: middle; }',
    '.head-l { padding: 9px 14px; }',
    '.selo { width: 36px; height: 36px; border-radius: 18px; background: ' + COR.gold + '; color: ' + COR.navy900 + '; font-weight: bold; font-size: 13px; text-align: center; vertical-align: middle; line-height: 36px; }',
    '.head-brand { padding-left: 10px; color: #fff; font-size: 13px; line-height: 1.25; vertical-align: middle; }',
    '.head-brand span { color: #A3AEC6; font-size: 10px; }',
    '.head-r { text-align: right; padding: 9px 14px; color: #A3AEC6; font-size: 10px; }',
    '.head-who { display: block; color: #fff; font-weight: bold; font-size: 12px; }',
    '.head-date { display: block; }',
    /* página 1 */
    '.eyebrow { margin: 18px 0 4px; font-size: 10px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: ' + COR.goldDark + '; }',
    '.eyebrow.ok { color: ' + COR.green + '; }',
    'h1 { font-size: 27px; line-height: 1.2; margin: 0 0 14px; color: ' + COR.navy900 + '; font-weight: bold; }',
    '.hero { margin-bottom: 14px; }',
    '.hero-num { width: 160px; background: ' + COR.navy800 + '; border-radius: 8px; padding: 18px 12px; text-align: center; vertical-align: middle; }',
    '.hero-num .big { font-size: 40px; line-height: 1; color: ' + COR.gold + '; font-weight: bold; }',
    '.hero-num.alerta .big { color: ' + COR.gold + '; }',
    '.hero-num.ok .big { color: #5CCDAA; }',
    '.hero-num .big-l { color: #E7ECF5; font-size: 10px; margin-top: 6px; line-height: 1.25; }',
    '.hero-txt { padding: 2px 0 0 18px; vertical-align: middle; font-size: 12.5px; }',
    '.hero-txt .conta { color: ' + COR.muted + '; font-size: 10.5px; margin: 0; }',
    '.sec { font-size: 10px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: ' + COR.muted + '; border-bottom: 1px solid ' + COR.line + '; padding-bottom: 4px; margin: 16px 0 8px; }',
    '.sec.small { margin-top: 12px; }',
    '.cards td.card { width: 33%; border: 1px solid ' + COR.line + '; border-left: 0; background: ' + COR.wash + '; padding: 12px 14px; }',
    '.cards td.card.first { border-left: 1px solid ' + COR.line + '; border-radius: 8px 0 0 8px; }',
    '.cards td.card:last-child { border-radius: 0 8px 8px 0; }',
    '.cards td.card.best { background: #fff; border-top: 3px solid ' + COR.gold + '; }',
    '.card-t { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: .8px; color: ' + COR.muted + '; }',
    '.card-t .tag { display: inline-block; margin-left: 6px; background: ' + COR.goldWash + '; color: ' + COR.goldDark + '; border-radius: 10px; padding: 1px 7px; font-size: 8.5px; letter-spacing: .3px; text-transform: none; }',
    '.card-v { font-size: 21px; font-weight: bold; color: ' + COR.navy900 + '; margin: 4px 0 4px; }',
    '.card-s { font-size: 10.5px; color: ' + COR.ink + '; line-height: 1.4; }',
    '.card-s .warn { display: block; color: ' + COR.red + '; font-weight: bold; margin-top: 3px; }',
    '.ponte { margin: 14px 0 0; padding: 11px 14px; border-left: 3px solid ' + COR.gold + '; background: ' + COR.goldWash + '; border-radius: 0 6px 6px 0; font-size: 11px; }',
    '.ponte-ico { font-weight: bold; color: ' + COR.goldDark + '; margin-right: 6px; }',
    '.muda td { width: 25%; padding: 6px 10px 6px 0; vertical-align: top; }',
    '.muda td b { display: block; font-size: 13px; color: ' + COR.navy900 + '; margin-bottom: 2px; }',
    '.muda td span { display: block; font-size: 9.5px; color: ' + COR.muted + '; line-height: 1.4; }',
    '.dados { width: 100%; }',
    '.dados td { width: 16.6%; padding: 4px 8px 4px 0; font-size: 10px; }',
    '.dados td span { display: block; color: ' + COR.muted + '; font-size: 9px; }',
    '.dados td b { display: block; font-size: 11px; }',
    '.nota { color: ' + COR.muted + '; font-size: 9px; line-height: 1.4; margin-top: 6px; }',
    '.foot { position: absolute; left: 14mm; width: 182mm; bottom: 10mm; border-top: 1px solid ' + COR.line + '; font-size: 9px; color: ' + COR.muted + '; }',
    '.foot td { padding-top: 6px; }',
    '.foot-r { text-align: right; white-space: nowrap; padding-left: 16px; }',
    /* página 2 */
    '.faixa { margin-top: 10px; background: ' + COR.goldWash + '; border: 1px solid ' + COR.gold + '; border-radius: 6px; }',
    '.faixa-tag { width: 70px; background: ' + COR.gold + '; color: ' + COR.navy900 + '; font-weight: bold; font-size: 12px; letter-spacing: 2px; text-align: center; vertical-align: middle; padding: 8px 6px; border-radius: 5px 0 0 5px; }',
    '.faixa-txt { padding: 7px 12px; font-size: 10.5px; vertical-align: middle; color: ' + COR.ink + '; }',
    'h2 { font-size: 20px; margin: 12px 0 4px; color: ' + COR.navy900 + '; }',
    '.intro { font-size: 10.5px; color: ' + COR.muted + '; margin-bottom: 10px; }',
    '.grade th { background: ' + COR.navy800 + '; color: #fff; font-size: 9.5px; padding: 5px 4px; text-align: center; font-weight: bold; }',
    '.grade th i { display: block; font-style: normal; font-weight: normal; color: #A3AEC6; font-size: 8px; }',
    '.grade th.th-nome { text-align: left; padding-left: 8px; border-radius: 6px 0 0 0; }',
    '.grade th.th-h { border-radius: 0 6px 0 0; width: 40px; }',
    '.grade td { border: 1px solid ' + COR.line + '; text-align: center; padding: 7px 3px; font-size: 10px; vertical-align: middle; }',
    '.grade td.nome { text-align: left; padding-left: 8px; width: 92px; }',
    '.grade td.nome i { display: block; font-style: normal; color: ' + COR.muted + '; font-size: 8.5px; }',
    '.grade td.h { font-weight: bold; color: ' + COR.muted + '; }',
    '.grade td.c-turno { background: ' + COR.turnoWash + '; color: ' + COR.navy900 + '; }',
    '.grade td.c-turno b { display: block; font-size: 10px; }',
    '.grade td.c-turno i { display: block; font-style: normal; color: ' + COR.muted + '; font-size: 8px; }',
    '.grade td.c-folga { background: ' + COR.goldWash + '; color: ' + COR.goldDark + '; font-weight: bold; }',
    '.grade td.c-livre { background: ' + COR.greenWash + '; color: ' + COR.green + '; font-weight: bold; }',
    '.grade td.c-fechado { background: ' + COR.fechado + '; color: #9AA3B5; }',
    '.grade tr.tot td { background: ' + COR.wash + '; font-weight: bold; color: ' + COR.navy900 + '; }',
    '.grade tr.tot td span { font-weight: normal; color: ' + COR.muted + '; }',
    '.grade.compacta td { padding: 4px 2px; font-size: 9px; }',
    '.grade.compacta td.c-turno b { font-size: 8.5px; }',
    '.grade.compacta td.c-turno i { font-size: 7px; }',
    '.grade.compacta td.nome i { display: none; }',
    '.legenda { margin-top: 6px; }',
    '.legenda td { font-size: 8.5px; color: ' + COR.muted + '; padding-right: 14px; }',
    '.sw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; border: 1px solid ' + COR.line + '; }',
    '.sw.c-turno { background: ' + COR.turnoWash + '; } .sw.c-folga { background: ' + COR.goldWash + '; } .sw.c-livre { background: ' + COR.greenWash + '; } .sw.c-fechado { background: ' + COR.fechado + '; }',
    '.barras td.barra-td { width: 14.28%; padding: 0 4px 0 0; }',
    '.barra-l { font-size: 9px; font-weight: bold; color: ' + COR.navy900 + '; margin-bottom: 2px; }',
    '.barra td { height: 9px; }',
    '.barra td.ok { background: ' + COR.green + '; border-radius: 3px 0 0 3px; }',
    '.barra td.falta { background: ' + COR.red + '; border-radius: 0 3px 3px 0; }',
    '.barra-v { font-size: 8.5px; color: ' + COR.green + '; margin-top: 2px; }',
    '.barra-v.falta { color: ' + COR.red + '; font-weight: bold; }',
    '.barra-td.off .barra-v { color: #9AA3B5; }',
    '.avisos { margin: 0; padding: 0 0 0 14px; font-size: 10px; line-height: 1.45; }',
    '.avisos li { margin-bottom: 3px; }',
    '.oferta { margin-top: 14px; border: 1.5px solid ' + COR.gold + '; border-radius: 8px; background: #fff; }',
    '.of-l { padding: 16px 18px; vertical-align: middle; }',
    '.of-t { font-size: 19px; color: ' + COR.navy900 + '; font-weight: bold; margin-bottom: 6px; }',
    '.of-list { margin: 0; padding-left: 16px; font-size: 10.5px; line-height: 1.6; }',
    '.of-r { width: 200px; background: ' + COR.navy800 + '; border-radius: 0 6px 6px 0; padding: 12px 14px; text-align: center; vertical-align: middle; color: #fff; }',
    '.of-de { font-size: 10px; color: #A3AEC6; } .of-de s { color: #A3AEC6; }',
    '.of-preco { font-size: 34px; color: ' + COR.gold + '; font-weight: bold; line-height: 1.1; }',
    '.of-ate { font-size: 9px; color: #E7ECF5; margin: 4px 0 8px; }',
    '.btn { display: block; background: ' + COR.green + '; color: #fff; text-decoration: none; font-weight: bold; font-size: 11.5px; padding: 9px 8px; border-radius: 6px; }',
    '.of-url { font-size: 7.5px; color: #A3AEC6; margin-top: 5px; word-break: break-all; }',
    '.spacer { height: 10mm; }'
  ].join("\n");
}

/**
 * Relatório completo (2 páginas A4). Veja o README para o formato de `dados`.
 */
function renderRelatorioHTML(dados) {
  var d = dados || {};
  d.lead = d.lead || {}; d.oferta = d.oferta || {}; d.marca = d.marca || {};
  d.marca.nome = d.marca.nome || "Jornada 40h";
  d.data = d.data || "";
  var titulo = "Jornada 40h · Diagnóstico e escala 5x2" + (d.lead.nome ? " · " + d.lead.nome : "");
  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(titulo) + '</title>' +
    '<style>' + cssRelatorio() + '</style></head><body>' +
    pagina1(d) + (d.escala && d.escala.grade ? pagina2(d) : "") +
    '</body></html>';
}

/* ===================================================================== */
/* Imagem da grade para a landing page                                   */
/* ===================================================================== */

/**
 * Só a grade (sem oferta), 1200 px de largura, com Lora/Inter locais.
 * opcoes: { titulo, subtitulo, fontsDir (URL/caminho da pasta de fontes) }
 */
function renderExemploEscalaHTML(escala, opcoes) {
  var o = opcoes || {};
  var fontsDir = o.fontsDir;
  if (!fontsDir) {
    fontsDir = (typeof __dirname !== "undefined") ? "file://" + __dirname + "/../remotion/public/fonts" : "../remotion/public/fonts";
  }
  var n = escala.grade.length;
  var hd = escala.resumo.horasDescobertasSemana;
  var titulo = o.titulo || "Escala 5x2 · semana " + escala.resumo.semana;
  var subtitulo = o.subtitulo || (n + " pessoas · " + escala.cobertura.seg.necessario + " ao mesmo tempo · 2 folgas por semana cada");

  var css = [
    '@font-face { font-family: "Lora"; src: url("' + fontsDir + '/Lora-Variable.ttf") format("truetype"); font-weight: 400 700; }',
    '@font-face { font-family: "Inter"; src: url("' + fontsDir + '/Inter-Regular.otf") format("opentype"); font-weight: 400; }',
    '@font-face { font-family: "Inter"; src: url("' + fontsDir + '/Inter-Medium.otf") format("opentype"); font-weight: 500; }',
    '@font-face { font-family: "Inter"; src: url("' + fontsDir + '/Inter-SemiBold.otf") format("opentype"); font-weight: 600; }',
    '@font-face { font-family: "Inter"; src: url("' + fontsDir + '/Inter-Bold.otf") format("opentype"); font-weight: 700; }',
    'html, body { margin: 0; padding: 0; background: #fff; }',
    'body { font-family: "Inter", system-ui, sans-serif; color: ' + COR.ink + '; }',
    '#exemplo { width: 1200px; box-sizing: border-box; background: #fff; border-radius: 20px; overflow: hidden; border: 1px solid ' + COR.line + '; box-shadow: 0 24px 60px rgba(3,8,20,.12); }',
    '.top { background: linear-gradient(135deg, ' + COR.navy900 + ', ' + COR.navy700 + '); color: #fff; padding: 22px 32px; display: flex; align-items: center; gap: 18px; }',
    '.top .selo { width: 48px; height: 48px; border-radius: 50%; background: ' + COR.gold + '; color: ' + COR.navy900 + '; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 16px; }',
    '.top h1 { font-family: "Lora", Georgia, serif; font-size: 26px; margin: 0; font-weight: 700; }',
    '.top p { margin: 2px 0 0; color: #A3AEC6; font-size: 14px; }',
    '.top .tag { margin-left: auto; background: ' + COR.goldWash + '; color: ' + COR.goldDark + '; border: 1px solid ' + COR.gold + '; border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 600; letter-spacing: .5px; }',
    '.wrap { padding: 22px 32px 24px; }',
    'table.grade { width: 100%; border-collapse: separate; border-spacing: 4px; }',
    '.grade th { font-size: 13px; font-weight: 600; color: ' + COR.muted + '; padding: 4px 6px 8px; text-align: center; text-transform: uppercase; letter-spacing: .6px; }',
    '.grade th i { display: block; font-style: normal; font-weight: 500; text-transform: none; letter-spacing: 0; font-size: 12px; color: #9AA3B5; }',
    '.grade th.th-nome { text-align: left; }',
    '.grade td { border-radius: 8px; text-align: center; padding: 9px 6px; font-size: 14px; vertical-align: middle; }',
    '.grade td.nome { text-align: left; padding-left: 10px; width: 150px; font-weight: 600; font-size: 15px; }',
    '.grade td.nome i { display: block; font-style: normal; font-weight: 400; color: ' + COR.muted + '; font-size: 12px; }',
    '.grade td.h { font-weight: 600; color: ' + COR.muted + '; width: 60px; }',
    '.grade td.c-turno { background: ' + COR.turnoWash + '; color: ' + COR.navy900 + '; }',
    '.grade td.c-turno b { display: block; font-weight: 600; font-size: 14.5px; letter-spacing: -.2px; }',
    '.grade td.c-turno i { display: block; font-style: normal; color: ' + COR.muted + '; font-size: 11px; margin-top: 1px; }',
    '.grade td.c-folga { background: ' + COR.goldWash + '; color: ' + COR.goldDark + '; font-weight: 600; }',
    '.grade td.c-livre { background: ' + COR.greenWash + '; color: ' + COR.green + '; font-weight: 600; }',
    '.grade td.c-fechado { background: ' + COR.fechado + '; color: #9AA3B5; }',
    '.grade tr.tot td { background: ' + COR.wash + '; font-weight: 600; color: ' + COR.navy900 + '; }',
    '.grade tr.tot td span { font-weight: 400; color: ' + COR.muted + '; }',
    '.cob { display: flex; gap: 10px; margin: 18px 4px 0; padding-top: 16px; border-top: 1px solid ' + COR.line + '; }',
    '.cob-d { flex: 1; font-size: 12px; }',
    '.cob-d b { display: block; font-weight: 600; color: ' + COR.navy900 + '; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .5px; font-size: 11.5px; }',
    '.cob-bar { height: 10px; border-radius: 5px; background: ' + COR.redWash + '; overflow: hidden; }',
    '.cob-d.off .cob-bar { background: ' + COR.fechado + '; }',
    '.cob-bar i { display: block; height: 100%; background: ' + COR.green + '; border-radius: 5px; }',
    '.cob-d span { display: block; margin-top: 5px; color: #9AA3B5; }',
    '.cob-d span.ok { color: ' + COR.green + '; font-weight: 500; }',
    '.cob-d span.falta { color: ' + COR.red + '; font-weight: 600; }',
    '.bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; font-size: 13px; color: ' + COR.muted + '; }',
    '.legenda { display: flex; gap: 18px; }',
    '.legenda span { display: inline-flex; align-items: center; gap: 6px; }',
    '.sw { display: inline-block; width: 14px; height: 14px; border-radius: 4px; }',
    '.sw.c-turno { background: ' + COR.turnoWash + '; } .sw.c-folga { background: ' + COR.goldWash + '; } .sw.c-livre { background: ' + COR.greenWash + '; } .sw.c-fechado { background: ' + COR.fechado + '; }',
    '.resumo { font-weight: 600; color: ' + (hd > 0.05 ? COR.red : COR.green) + '; }'
  ].join("\n");

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Exemplo de escala</title><style>' + css + '</style></head><body>' +
    '<div id="exemplo">' +
    '<div class="top"><div class="selo">40h</div><div><h1>' + esc(titulo) + '</h1><p>' + esc(subtitulo) + '</p></div><div class="tag">EXEMPLO</div></div>' +
    '<div class="wrap">' + tabelaGrade(escala, false) +
    '<div class="cob">' + DIAS_PDF.map(function (d) {
      var cob = escala.cobertura[d];
      if (!cob || !cob.necessario) return '<div class="cob-d off"><b>' + ROTULO_DIA[d] + '</b><div class="cob-bar"></div><span>fechado</span></div>';
      var precisa = cob.blocos.length * 0.5 * cob.necessario;
      var pct = precisa > 0 ? Math.round(Math.max(0, precisa - cob.horasDescobertas) / precisa * 100) : 100;
      return '<div class="cob-d"><b>' + ROTULO_DIA[d] + '</b><div class="cob-bar"><i style="width:' + pct + '%"></i></div>' +
        '<span class="' + (cob.horasDescobertas > 0 ? 'falta' : 'ok') + '">' + (cob.horasDescobertas > 0 ? 'faltam ' + num1(cob.horasDescobertas) + ' h' : 'coberto') + '</span></div>';
    }).join("") + '</div>' +
    '<div class="bottom"><div class="legenda">' +
    '<span><i class="sw c-turno"></i>turno</span><span><i class="sw c-folga"></i>folga</span><span><i class="sw c-livre"></i>reserva</span><span><i class="sw c-fechado"></i>fechado</span></div>' +
    '<div class="resumo">' + (hd > 0.05 ? "Faltam " + num1(hd) + " h na semana. A escala mostra onde e quanto custa cobrir." : "Todas as horas de funcionamento cobertas") + '</div>' +
    '</div></div></div></body></html>';
}

if (typeof module !== "undefined") module.exports = { renderRelatorioHTML, renderExemploEscalaHTML };
