/**
 * Sequência de e-mails pós-cálculo (D+1, D+3, D+7) com PDF personalizado.
 *
 * Depende de escala.gs (gerarEscala, exemploEquipe) e pdf-template.gs (renderRelatorioHTML),
 * copiados de /engine no repositório para arquivos deste projeto Apps Script.
 *
 * Instalação: rode `instalarGatilhoSequencia` UMA vez pelo editor (cria gatilho de hora em hora).
 * Controle: aba "Sequencia" (uma linha por e-mail). Para parar alguém: status = "sair".
 */

const SEQ_ABA = "Sequencia";
const SEQ_COLUNAS = ["email", "nome", "data_lead", "status", "d1_enviado", "d3_enviado", "d7_enviado", "ultimo_erro", "atualizado"];
const SEQ_HORA_INICIO = 8;   // só envia entre 8h e 20h (America/Fortaleza)
const SEQ_HORA_FIM = 20;
const SEQ_MAX_POR_RODADA = 20; // limite de e-mails por execução (cota diária do Gmail ~100)
const OFERTA_ATE = "31/10";

/** Cria o gatilho horário (idempotente). */
function instalarGatilhoSequencia() {
  const existe = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === "processarSequencia");
  if (!existe) ScriptApp.newTrigger("processarSequencia").timeBased().everyHours(1).create();
  Logger.log(existe ? "Gatilho já existia." : "Gatilho criado: processarSequencia a cada 1h.");
}

/** Executada pelo gatilho. Lê Leads + Vendas, decide quem recebe o quê, envia e registra. */
function processarSequencia() {
  const tz = "America/Fortaleza";
  const hora = Number(Utilities.formatDate(new Date(), tz, "H"));
  if (hora < SEQ_HORA_INICIO || hora >= SEQ_HORA_FIM) return;

  const ss = PLANILHA_ID ? SpreadsheetApp.openById(PLANILHA_ID) : SpreadsheetApp.getActiveSpreadsheet();
  const leads = lerLeadsUnicos_(ss);
  const compradores = lerEmailsCompradores_(ss);
  const seq = abrirSequencia_(ss);
  const agora = new Date();
  let enviados = 0;

  leads.forEach(lead => {
    if (enviados >= SEQ_MAX_POR_RODADA) return;
    const email = String(lead.email || "").trim().toLowerCase();
    if (!email) return;
    let linha = seq.porEmail[email];
    if (!linha) linha = criarLinhaSequencia_(seq, lead);

    // Quem já comprou, pediu para sair ou é teste: não recebe nada.
    if (compradores.has(email) && linha.status !== "comprou") { atualizarLinha_(seq, linha, { status: "comprou" }); return; }
    if (ehTeste_(lead) && linha.status !== "teste") { atualizarLinha_(seq, linha, { status: "teste" }); return; }
    if (linha.status !== "ativo") return;

    const dias = (agora - new Date(lead.data)) / 36e5 / 24;
    try {
      if (!linha.d1_enviado && dias >= 0.8 && dias < 6) {
        enviarD1_(lead); atualizarLinha_(seq, linha, { d1_enviado: agora }); enviados++;
      } else if (linha.d1_enviado && !linha.d3_enviado && dias >= 3 && dias < 9) {
        enviarD3_(lead); atualizarLinha_(seq, linha, { d3_enviado: agora }); enviados++;
      } else if (linha.d3_enviado && !linha.d7_enviado && dias >= 7 && dias < 14) {
        enviarD7_(lead); atualizarLinha_(seq, linha, { d7_enviado: agora, status: "concluido" }); enviados++;
      }
    } catch (err) {
      atualizarLinha_(seq, linha, { ultimo_erro: String(err).slice(0, 300) });
    }
  });
}

/* ---------- E-mails ---------- */

function enviarD1_(lead) {
  const primeiro = primeiroNome_(lead.nome);
  const pdf = gerarPdfRelatorio_(lead);
  const D = Number(lead.horas_descobertas_semana) || 0;
  const gap = Number(lead.funcionarios_a_mais) || 0;
  const F = Number(lead.funcionarios) || 0;
  const assunto = D <= 0.05
    ? primeiro + ", veja como ficam as " + F + " folgas a mais na sua escala (PDF)"
    : gap < 0.95
      ? primeiro + ", como cobrir as " + n1_(D) + "h descobertas sem contratar (PDF)"
      : primeiro + ", como ficaria sua escala 5x2 com +" + n1_(gap) + " funcionário (PDF)";
  const corpo =
    "<p>Oi, " + esc_(primeiro) + "! Ontem você fez a conta da jornada de 40h para o seu " + esc_(lead.tipo || "negócio") + ".</p>" +
    "<p>Montei em PDF o que a conta não mostra: <b>como ficaria uma escala 5x2 para uma equipe do tamanho da sua</b>, com as folgas distribuídas, o " + (Number(lead.dias_abertos) >= 7 ? "fim de semana" : "sábado") + " coberto e os pontos onde a escala " +
    (D <= 0.05 ? "precisa de rodízio." : "fica descoberta e quanto isso custa.") + "</p>" +
    "<p>É um exemplo com nomes fictícios. A sua vem com os nomes, horários e regras do seu negócio, pronta para colar na parede.</p>" +
    botao_(lead.checkout_url || CHECKOUT_URL, "Quero a escala do meu negócio · R$ " + PRECO_OFERTA) +
    "<p style=\"font-size:13px;color:#5B6478\">Preço de fundador até " + OFERTA_ATE + " (depois R$ " + PRECO_CHEIO + "). Entrega em até 48h · garantia de 7 dias.</p>";
  enviarEmailSequencia_(lead, assunto, "Como ficaria a sua escala 5x2", corpo, pdf ? [pdf] : []);
}

function enviarD3_(lead) {
  const primeiro = primeiroNome_(lead.nome);
  const D = Number(lead.horas_descobertas_semana) || 0;
  const he = Number(lead.custo_hora_extra_mes) || 0;
  const F = Number(lead.funcionarios) || 0;
  const assunto = D <= 0.05
    ? primeiro + ", o erro mais comum de quem já tem equipe suficiente"
    : primeiro + ", e se você não quiser contratar ninguém?";
  const corpo = D <= 0.05
    ? "<p>Oi, " + esc_(primeiro) + ". Quem tem equipe suficiente costuma achar que a jornada de 40h não muda nada. Muda uma coisa: <b>são " + F + " folgas a mais por semana</b> para encaixar, e quase sempre elas caem no sábado, que é justamente o dia que não pode ficar descoberto.</p>" +
      "<p>O erro é montar isso no improviso, semana a semana, e descobrir o buraco na sexta. A escala 5x2 pronta resolve de uma vez: rodízio de fim de semana, folgas fixas para quem precisa e um quadro para colar na parede.</p>"
    : "<p>Oi, " + esc_(primeiro) + ". A pergunta que mais ouvimos: <i>\"e se eu não quiser contratar?\"</i></p>" +
      "<p>No seu caso são <b>" + n1_(D) + " horas por semana</b> sem ninguém. Cobrir com hora extra custa cerca de <b>" + brl_(he) + " por mês</b>, todo mês. Na maioria dos negócios desse tamanho, dá para resolver com <b>revezamento de folgas + um reforço só no fim de semana</b> (meio período ou diarista), sem contrato integral.</p>" +
      "<p>A escala 5x2 pronta mostra exatamente isso para o seu horário e a sua equipe: quem trabalha quando, onde sobra, onde falta, e qual é a opção mais barata para fechar a conta.</p>";
  enviarEmailSequencia_(lead, assunto, D <= 0.05 ? "O erro mais comum" : "Sem contratar ninguém",
    corpo + botao_(lead.checkout_url || CHECKOUT_URL, "Montar minha escala · R$ " + PRECO_OFERTA) +
    "<p style=\"font-size:13px;color:#5B6478\">Preço de fundador até " + OFERTA_ATE + ". Entrega em até 48h · garantia de 7 dias: não serviu, devolvemos.</p>", []);
}

function enviarD7_(lead) {
  const primeiro = primeiroNome_(lead.nome);
  const assunto = primeiro + ", último aviso: R$ " + PRECO_OFERTA + " só até " + OFERTA_ATE;
  const corpo =
    "<p>Oi, " + esc_(primeiro) + ". Este é o último e-mail desta série.</p>" +
    "<p>A escala 5x2 pronta do seu " + esc_(lead.tipo || "negócio") + " continua por <b>R$ " + PRECO_OFERTA + "</b> até " + OFERTA_ATE + ". Depois disso volta para R$ " + PRECO_CHEIO + ".</p>" +
    "<p>Se a jornada de 40h ainda não é prioridade, tudo bem: a calculadora continua grátis em <a href=\"" + SITE_URL + "\">" + SITE_URL.replace(/^https?:\/\//, "") + "</a> quando precisar.</p>" +
    botao_(lead.checkout_url || CHECKOUT_URL, "Garantir o preço de fundador") +
    "<p style=\"font-size:13px;color:#5B6478\">Entrega em até 48h · garantia de 7 dias.</p>";
  enviarEmailSequencia_(lead, assunto, "Último aviso", corpo, []);
}

/* ---------- PDF ---------- */

/**
 * Monta a entrada do motor a partir do lead (a calculadora não guarda horário por dia,
 * então distribui as horas abertas igualmente pelos dias abertos, começando às 08:00).
 */
function montarInputEscala_(lead) {
  const dias = Number(lead.dias_abertos) || 6;
  const horas = Number(lead.horas_abertas_semana) || 60;
  const P = Math.max(1, Number(lead.pessoas_simultaneas) || 1);
  const F = Math.max(1, Math.min(12, Number(lead.funcionarios) || 1));
  const hDia = Math.max(4, Math.min(16, Math.round((horas / dias) * 2) / 2));
  const abre = dias >= 6 ? "08:00" : "09:00";
  const fecha = minutosParaHora_(horaParaMinutos_(abre) + hDia * 60);
  const ordem = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
  const funcionamento = {};
  ordem.forEach((d, i) => { funcionamento[d] = i < dias ? { abre, fecha, pessoas: P } : null; });
  return {
    negocio: { nome: "Seu " + (lead.tipo || "negócio"), tipo: lead.tipo || "" },
    funcionamento,
    funcionarios: exemploEquipe(F, lead.tipo || ""),
    regras: { jornadaSemanal: 40, jornadaDiariaMax: 8, folgasPorSemana: 2, intervaloMin: 60 },
    salarioMedio: Number(lead.salario_medio) || 0,
    semana: "A"
  };
}

function gerarPdfRelatorio_(lead) {
  try {
    const escala = gerarEscala(montarInputEscala_(lead));
    const html = renderRelatorioHTML({
      lead: {
        nome: lead.nome, tipo: lead.tipo, funcionarios: Number(lead.funcionarios) || 0, pessoasSimultaneas: Number(lead.pessoas_simultaneas) || 0,
        horasAbertasSemana: Number(lead.horas_abertas_semana) || 0, diasAbertos: Number(lead.dias_abertos) || 0, salarioMedio: Number(lead.salario_medio) || 0,
        horasDescobertas: Number(lead.horas_descobertas_semana) || 0, custoHoraExtraMes: Number(lead.custo_hora_extra_mes) || 0,
        custoContratarMes: Number(lead.custo_parcial_mes != null ? lead.custo_parcial_mes : lead.custo_contratar_mes) || 0,
        contratarTexto: lead.contratar_texto || "", horasReduzir: Number(lead.horas_a_reduzir_semana) || 0, funcionariosAMais: Number(lead.funcionarios_a_mais) || 0
      },
      escala,
      oferta: { precoCheio: PRECO_CHEIO, precoFundador: PRECO_OFERTA, ate: OFERTA_ATE, checkoutUrl: lead.checkout_url || CHECKOUT_URL },
      marca: { nome: "Jornada 40h", site: SITE_URL, email: EMAIL_CONTATO },
      data: Utilities.formatDate(new Date(), "America/Fortaleza", "dd/MM/yyyy")
    });
    const nome = "Escala-5x2-exemplo-" + String(primeiroNome_(lead.nome)).replace(/[^a-zA-Z0-9]/g, "") + ".pdf";
    return Utilities.newBlob(html, "text/html", "relatorio.html").getAs("application/pdf").setName(nome);
  } catch (err) {
    Logger.log("PDF falhou: " + err);
    return null; // o e-mail segue sem anexo
  }
}

/* ---------- Planilha ---------- */

function lerLeadsUnicos_(ss) {
  const aba = ss.getSheetByName("Leads");
  if (!aba || aba.getLastRow() < 2) return [];
  const valores = aba.getDataRange().getValues();
  const cab = valores[0].map(String);
  const porEmail = {};
  for (let i = 1; i < valores.length; i++) {
    const obj = {};
    cab.forEach((c, j) => obj[c] = valores[i][j]);
    const email = String(obj.email || "").trim().toLowerCase();
    if (!email) continue;
    // fica com o cálculo mais recente de cada e-mail, mas mantém a data do PRIMEIRO (para contar D+1 certo)
    if (!porEmail[email]) { porEmail[email] = obj; porEmail[email].data = obj.data; }
    else { const primeira = porEmail[email].data; porEmail[email] = obj; porEmail[email].data = primeira; }
  }
  return Object.keys(porEmail).map(k => porEmail[k]);
}

function lerEmailsCompradores_(ss) {
  const set = new Set();
  const aba = ss.getSheetByName("Vendas");
  if (!aba || aba.getLastRow() < 2) return set;
  const v = aba.getDataRange().getValues();
  const cab = v[0].map(String);
  const iE = cab.indexOf("email"), iS = cab.indexOf("status");
  for (let i = 1; i < v.length; i++) {
    const st = String(v[i][iS] || "").toLowerCase();
    if (st === "paid" || st === "approved") set.add(String(v[i][iE] || "").trim().toLowerCase());
  }
  return set;
}

function abrirSequencia_(ss) {
  let aba = ss.getSheetByName(SEQ_ABA);
  if (!aba) { aba = ss.insertSheet(SEQ_ABA); aba.appendRow(SEQ_COLUNAS); aba.setFrozenRows(1); }
  const porEmail = {};
  if (aba.getLastRow() > 1) {
    const v = aba.getRange(2, 1, aba.getLastRow() - 1, SEQ_COLUNAS.length).getValues();
    v.forEach((row, i) => {
      const obj = { _row: i + 2 };
      SEQ_COLUNAS.forEach((c, j) => obj[c] = row[j]);
      porEmail[String(obj.email).toLowerCase()] = obj;
    });
  }
  return { aba, porEmail };
}

function criarLinhaSequencia_(seq, lead) {
  const linha = { email: String(lead.email).trim().toLowerCase(), nome: lead.nome || "", data_lead: lead.data, status: "ativo", d1_enviado: "", d3_enviado: "", d7_enviado: "", ultimo_erro: "", atualizado: new Date() };
  seq.aba.appendRow(SEQ_COLUNAS.map(c => linha[c]));
  linha._row = seq.aba.getLastRow();
  seq.porEmail[linha.email] = linha;
  return linha;
}

function atualizarLinha_(seq, linha, mudancas) {
  Object.keys(mudancas).forEach(k => linha[k] = mudancas[k]);
  linha.atualizado = new Date();
  seq.aba.getRange(linha._row, 1, 1, SEQ_COLUNAS.length).setValues([SEQ_COLUNAS.map(c => linha[c] === undefined ? "" : linha[c])]);
}

/* ---------- Utilidades ---------- */

function ehTeste_(lead) {
  const email = String(lead.email || "").toLowerCase();
  return email.indexOf("calculadora40h") >= 0 || /teste|playwright/i.test(String(lead.nome || "")) || String(lead.utm_source || "") === "teste";
}
function primeiroNome_(n) { return String(n || "").trim().split(" ")[0] || "tudo bem"; }
function esc_(s) { return String(s || "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[c])); }
function n1_(v) { return (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 }); }
function brl_(v) { return "R$ " + Math.round(Number(v) || 0).toLocaleString("pt-BR"); }
function horaParaMinutos_(h) { const p = String(h).split(":"); return Number(p[0]) * 60 + Number(p[1] || 0); }
function minutosParaHora_(m) { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
function botao_(url, texto) {
  return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:18px 0\"><tr><td style=\"background:#1F8A70;border-radius:10px\"><a href=\"" + url + "\" style=\"display:inline-block;padding:14px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#fff;text-decoration:none\">" + texto + " →</a></td></tr></table>";
}

function enviarEmailSequencia_(lead, assunto, titulo, corpoHtml, anexos) {
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const html =
    "<!doctype html><html><body style=\"margin:0;background:#F3F5F9\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr><td align=\"center\" style=\"padding:24px 12px\">" +
    "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden\">" +
    "<tr><td style=\"background:#0B1428;padding:22px 32px;" + font + "\"><span style=\"display:inline-block;background:#D4A72C;color:#0B1428;font-weight:bold;font-size:13px;padding:5px 10px;border-radius:8px\">40h</span><span style=\"color:#fff;font-size:17px;font-weight:bold;margin-left:10px\">Jornada 40h</span></td></tr>" +
    "<tr><td style=\"padding:28px 32px;" + font + "font-size:15px;line-height:1.6;color:#14213D\"><div style=\"font-size:22px;font-weight:bold;color:#14213D;margin-bottom:8px\">" + titulo + "</div>" + corpoHtml + "</td></tr>" +
    "<tr><td style=\"padding:0 32px 28px;" + font + "font-size:12px;color:#5B6478;line-height:1.6\">Jornada 40h · <a href=\"mailto:" + EMAIL_CONTATO + "\" style=\"color:#5B6478\">" + EMAIL_CONTATO + "</a> · <a href=\"" + SITE_URL + "privacidade.html\" style=\"color:#5B6478\">Privacidade</a><br>Você recebe estes e-mails porque pediu o relatório na calculadora. Para não receber mais, responda com <b>sair</b>.</td></tr>" +
    "</table></td></tr></table></body></html>";
  const texto = corpoHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() + " " + (lead.checkout_url || CHECKOUT_URL);
  const opcoes = { to: lead.email, subject: assunto, htmlBody: html, body: texto, name: NOME_REMETENTE, replyTo: EMAIL_CONTATO };
  if (anexos && anexos.length) opcoes.attachments = anexos;
  MailApp.sendEmail(opcoes);
}

/** Teste manual: gera o PDF para um lead fictício e manda para o e-mail da conta. */
function testarSequenciaD1() {
  const lead = {
    nome: "Teste Tatiane", email: Session.getActiveUser().getEmail(), tipo: "Restaurante ou lanchonete",
    dias_abertos: 6, horas_abertas_semana: 42, pessoas_simultaneas: 4, funcionarios: 4, salario_medio: 2450,
    funcionarios_a_mais: 0.2, custo_contratar_mes: 4165, custo_parcial_mes: 2083, contratar_texto: "1 em meio período (20h)",
    horas_descobertas_semana: 8, custo_hora_extra_mes: 637, horas_a_reduzir_semana: 2, data: new Date(Date.now() - 864e5)
  };
  enviarD1_(lead);
  Logger.log("Enviado para " + lead.email);
}
