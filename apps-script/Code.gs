/**
 * Recebe os leads da calculadora, grava na aba "Leads" desta planilha
 * e (opcionalmente) envia o relatório por e-mail para o lead.
 *
 * Como instalar: veja o guia LEIA-ME.md, passo 1.
 */

// Mude para false se preferir enviar os e-mails por outra ferramenta (Brevo etc.).
const ENVIAR_EMAIL = true;

// ID da planilha (o trecho entre /d/ e /edit no link). Deixe vazio se o script foi criado
// pelo menu Extensões > Apps Script da própria planilha.
const PLANILHA_ID = "1KHik9c9_M6RcKcO959RsAYAyJcLKE1XVq51V8jzDp5s";

// Nome que aparece como remetente do e-mail.
const NOME_REMETENTE = "Calculadora 40h";

const COLUNAS = [
  "data", "nome", "whatsapp", "email", "cidade", "faturamento", "tipo",
  "dias_abertos", "horas_abertas_semana", "pessoas_simultaneas", "funcionarios", "salario_medio",
  "funcionarios_a_mais", "custo_contratar_mes", "horas_descobertas_semana", "custo_hora_extra_mes", "horas_a_reduzir_semana",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "pagina"
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const lead = JSON.parse(e.postData.contents);
    lead.data = new Date();

    const ss = PLANILHA_ID ? SpreadsheetApp.openById(PLANILHA_ID) : SpreadsheetApp.getActiveSpreadsheet();

    if (lead.tipo_registro === "pedido") { registrarPedido(ss, lead); return resposta({ ok: true, tipo: "pedido" }); }
    if (lead.order_id && lead.order_status) { registrarVendaKiwify(ss, lead); return resposta({ ok: true, tipo: "kiwify" }); }

    let aba = ss.getSheetByName("Leads");
    if (!aba) {
      aba = ss.insertSheet("Leads");
      aba.appendRow(COLUNAS);
      aba.setFrozenRows(1);
    }
    aba.appendRow(COLUNAS.map(c => lead[c] !== undefined ? lead[c] : ""));

    if (ENVIAR_EMAIL && lead.email) enviarRelatorio(lead);

    return resposta({ ok: true });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Link de pagamento usado no e-mail quando a página não enviar um (fallback).
const CHECKOUT_URL = "https://pay.kiwify.com.br/xftQB3Y"; // oferta de R$ 47,90 (a de R$ 77 é yy3LT4h)
const SITE_URL = "https://jornada40h.com.br/";
const EMAIL_CONTATO = "calculadora40h@gmail.com";
const PRECO_CHEIO = 77;
const PRECO_OFERTA = 47.9;
/** 47.9 -> "47,90"; 77 -> "77". */
/** Checkout da oferta atual; ignora links antigos gravados no lead (ex.: o de R$ 77). */
function checkoutDe_(lead) {
  const u = String(lead.checkout_url || "");
  if (u.indexOf(CHECKOUT_URL) === 0) return u;
  return CHECKOUT_URL + (lead.email ? "?email=" + encodeURIComponent(String(lead.email).trim()) : "");
}
function precoTxt_(v) { return Math.round(v) === v ? String(v) : v.toFixed(2).replace(".", ","); }

function enviarRelatorio(lead) {
  const brl = v => "R$ " + Math.round(Number(v) || 0).toLocaleString("pt-BR");
  const n1 = v => (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const esc = s => String(s || "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[c]));
  const primeiroNome = esc(String(lead.nome || "").trim().split(" ")[0]) || "tudo bem";
  const tipo = esc(lead.tipo || "negócio");
  const D = Number(lead.horas_descobertas_semana) || 0;
  const coberto = D <= 0.05;
  const checkout = checkoutDe_(lead);
  const faltam = Math.max(0, Math.ceil(Number(lead.funcionarios_a_mais) - 0.05));
  const gapNum = Math.max(0, Number(lead.funcionarios_a_mais) || 0);
  const faltamTxt = n1(gapNum); // igual à página: "+1,2 funcionário"
  const funcTxt = gapNum < 1.95 ? "funcionário" : "funcionários";
  // Falta menos de 1 funcionário inteiro: o ângulo é "horas descobertas", não "contratar".
  const parcial = !coberto && D < 36;
  const F = Number(lead.funcionarios) || 0;
  const diasAbertos = Number(lead.dias_abertos) || 6;
  const fimDeSemana = diasAbertos >= 7 ? "fim de semana" : "sábado";
  // Contratação mínima (mesma regra da página): N integrais + 1 meio período/parcial se sobrar > 4h.
  const fracaoDe = h => h <= 4 ? 0 : h <= 20 ? 0.5 : h <= 30 ? 0.75 : 1;
  const inteiros = coberto ? 0 : Math.floor(D / 40 + 0.001);
  const fracaoResto = fracaoDe(Math.max(0, D - inteiros * 40));
  const custoContratar = lead.custo_parcial_mes != null ? Number(lead.custo_parcial_mes) : (inteiros + fracaoResto) * (Number(lead.salario_medio) || 0) * 1.7;
  const contratarTexto = lead.contratar_texto || (
    (inteiros > 0 ? inteiros + (inteiros === 1 ? " pessoa em tempo integral" : " pessoas em tempo integral") : "") +
    (inteiros > 0 && fracaoResto > 0 ? " + " : "") +
    (fracaoResto > 0 ? "1 em " + (fracaoResto <= 0.5 ? "meio período (20h)" : fracaoResto <= 0.75 ? "contrato parcial (30h)" : "tempo integral") : ""));
  const dataHoje = Utilities.formatDate(new Date(), "America/Fortaleza", "dd/MM/yyyy");

  // Paleta (mesma da página): fundo escuro, dourado, verde da oferta.
  const C = { navy: "#0B1428", navy2: "#0F1B33", gold: "#D4A72C", ink: "#14213D", muted: "#5B6478", line: "#E6EBF5", bg: "#F3F5F9", green: "#1F8A70", red: "#C8102E" };
  const font = "font-family:Arial,Helvetica,sans-serif;";

  const bloco = (titulo, valor, texto, cor) =>
    "<tr><td style=\"padding:0 0 10px\">" +
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid " + C.line + ";border-radius:12px\">" +
    "<tr><td style=\"padding:14px 18px;" + font + "\">" +
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
    "<td style=\"" + font + "font-size:15px;font-weight:bold;color:" + C.ink + "\">" + titulo + "</td>" +
    "<td align=\"right\" style=\"" + font + "font-size:16px;font-weight:bold;color:" + (cor || C.ink) + ";white-space:nowrap\">" + valor + "</td>" +
    "</tr></table>" +
    "<div style=\"" + font + "font-size:13px;line-height:1.5;color:" + C.muted + ";margin-top:4px\">" + texto + "</div>" +
    "</td></tr></table></td></tr>";

  // Destaque principal
  const destaque = coberto
    ? "<div style=\"" + font + "font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:" + C.gold + ";font-weight:bold\">Resultado</div>" +
      "<div style=\"" + font + "font-size:30px;line-height:1.15;font-weight:bold;color:#fff;margin-top:8px\">Sua equipe cobre o horário com 40 horas, mas a escala muda</div>" +
      "<div style=\"" + font + "font-size:15px;line-height:1.5;color:#C9D2E3;margin-top:10px\">Você não precisa contratar. Mas cada pessoa ganha uma folga a mais: são <b style=\"color:#fff\">" + F + (F === 1 ? " folga nova" : " folgas novas") + " por semana</b> para encaixar sem deixar o " + fimDeSemana + " descoberto.</div>"
    : parcial
    ? "<div style=\"" + font + "font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:" + C.gold + ";font-weight:bold\">Com a jornada de 40 horas faltam na sua escala</div>" +
      "<div style=\"" + font + "font-size:56px;line-height:1;font-weight:bold;color:#fff;margin-top:10px\">" + n1(D) + " <span style=\"font-size:22px;font-weight:normal;color:#C9D2E3\">horas por semana</span></div>" +
      "<div style=\"" + font + "font-size:15px;line-height:1.5;color:#C9D2E3;margin-top:10px\">Menos de um funcionário inteiro. Cobrir com hora extra custa <b style=\"color:#fff\">" + brl(lead.custo_hora_extra_mes) + " por mês</b>, todo mês. Abaixo, o que cada saída custa.</div>"
    : "<div style=\"" + font + "font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:" + C.gold + ";font-weight:bold\">Com a jornada de 40 horas você vai precisar de</div>" +
      "<div style=\"" + font + "font-size:56px;line-height:1;font-weight:bold;color:#fff;margin-top:10px\">+" + faltamTxt + " <span style=\"font-size:22px;font-weight:normal;color:#C9D2E3\">" + funcTxt + "</span></div>" +
      "<div style=\"" + font + "font-size:15px;line-height:1.5;color:#C9D2E3;margin-top:10px\">Hoje você fica com <b style=\"color:#fff\">" + n1(lead.horas_descobertas_semana) + " horas por semana</b> sem ninguém para cobrir. Abaixo, o que cada saída custa.</div>";

  // 3 saídas
  const saidas = coberto ? "" :
    "<tr><td style=\"padding:28px 32px 8px;" + font + "font-size:18px;font-weight:bold;color:" + C.ink + "\">As 3 saídas para o seu negócio</td></tr>" +
    "<tr><td style=\"padding:0 32px\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" +
    bloco(parcial ? "Contratar meio período" : "Contratar", brl(custoContratar) + "/mês", "Contratar " + contratarTexto + " para cobrir as " + n1(D) + "h por semana que ficam sem ninguém. Inclui estimativa de encargos.", C.ink) +
    bloco("Pagar hora extra", brl(lead.custo_hora_extra_mes) + "/mês", parcial ? "Cobrir as " + n1(D) + "h com a equipe atual, com adicional de 50%. Parece pouco, mas é todo mês, para sempre: " + brl(Number(lead.custo_hora_extra_mes) * 12) + " por ano." : "Cobrir as mesmas horas com a equipe atual, com adicional de 50%. Costuma estourar o limite de 2h extras por dia e não é sustentável.", C.red) +
    bloco("Reduzir o horário", "−" + n1(lead.horas_a_reduzir_semana) + " h/sem", "Fechar " + n1(lead.horas_a_reduzir_semana) + " horas a menos por semana. Sem custo extra, mas você perde as vendas desses horários.", C.green) +
    "</table></td></tr>";

  // Oferta
  const oferta =
    "<tr><td style=\"padding:24px 32px 0\">" +
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:" + C.bg + ";border-radius:14px\"><tr><td style=\"padding:24px\">" +
    "<div style=\"" + font + "font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:" + C.green + ";font-weight:bold\">Próximo passo</div>" +
    "<div style=\"" + font + "font-size:20px;font-weight:bold;color:" + C.ink + ";margin-top:6px\">Receba a escala 5x2 pronta do seu negócio</div>" +
    "<div style=\"" + font + "font-size:14px;line-height:1.55;color:" + C.muted + ";margin-top:8px\">" +
    (coberto
      ? "São " + F + " folga" + (F === 1 ? "" : "s") + " a mais por semana e " + esc(lead.pessoas_simultaneas) + " pessoa(s) em cada turno. Montada no improviso, sobra gente na segunda e falta no " + fimDeSemana + ". Entregamos a escala com rodízio de folgas e cobertura de fim de semana, já no formato 5x2."
      : parcial
      ? "São só <b>" + n1(D) + " horas por semana</b> descobertas. Isso quase sempre se resolve com <b>revezamento de folgas e um reforço de fim de semana</b>, sem contratar ninguém em tempo integral. A escala 5x2 montada no movimento real do seu negócio mostra exatamente como."
      : "A saída mais barata ainda custa <b>" + brl(Math.min(custoContratar || 1e9, Number(lead.custo_hora_extra_mes) || 1e9)) + " por mês</b>. Uma escala montada com o movimento real do seu negócio pode reduzir esse número: rodízio de folgas, cobertura de fim de semana e o mínimo de contratações.") +
    "</div>" +
    "<div style=\"" + font + "margin-top:14px;color:" + C.ink + "\"><span style=\"font-size:14px;color:" + C.muted + ";text-decoration:line-through\">R$ " + precoTxt_(PRECO_CHEIO) + "</span> &nbsp;<span style=\"font-size:30px;font-weight:bold\">R$ " + precoTxt_(PRECO_OFERTA) + "</span> <span style=\"font-size:13px;color:" + C.muted + "\">pagamento único</span></div>" +
    "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:16px\"><tr><td style=\"background:" + C.green + ";border-radius:10px\">" +
    "<a href=\"" + checkout + "\" style=\"display:inline-block;padding:14px 24px;" + font + "font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none\">Quero minha escala pronta →</a>" +
    "</td></tr></table>" +
    "<div style=\"" + font + "font-size:12px;color:" + C.muted + ";margin-top:12px\">Preço de lançamento até 31/10 · Entrega em até 48 horas · Pix ou cartão · Garantia de 7 dias: não serviu, devolvemos.</div>" +
    "</td></tr></table></td></tr>";

  const dados =
    "<tr><td style=\"padding:24px 32px 0;" + font + "font-size:12px;line-height:1.6;color:" + C.muted + "\">" +
    "<b style=\"color:" + C.ink + "\">Dados usados:</b> " + tipo + " · " + esc(lead.dias_abertos) + " dias por semana · " + n1(lead.horas_abertas_semana) + "h abertas · " +
    esc(lead.pessoas_simultaneas) + " pessoa(s) ao mesmo tempo · " + esc(lead.funcionarios) + " funcionário(s) · salário médio " + brl(lead.salario_medio) + "." +
    "<br>Valores estimados (encargos de ~70%, 4,33 semanas/mês, divisor 200h). Não substituem a orientação do seu contador." +
    "</td></tr>";

  const html =
    "<!doctype html><html><body style=\"margin:0;padding:0;background:" + C.bg + "\">" +
    "<div style=\"display:none;max-height:0;overflow:hidden;opacity:0\">" + (coberto ? "Sua equipe cobre o horário, mas são " + F + " folgas a mais por semana para encaixar." : parcial ? "Faltam " + n1(D) + "h por semana na sua escala. Hora extra: " + brl(lead.custo_hora_extra_mes) + "/mês." : "Você vai precisar de +" + faltamTxt + " " + funcTxt + ". Veja quanto custa cada saída.") + "</div>" +
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background:" + C.bg + "\"><tr><td align=\"center\" style=\"padding:24px 12px\">" +
    "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden\">" +

    // Cabeçalho
    "<tr><td style=\"background:" + C.navy + ";padding:22px 32px\">" +
    "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr>" +
    "<td style=\"" + font + "\"><span style=\"display:inline-block;background:" + C.gold + ";color:" + C.navy + ";font-weight:bold;font-size:13px;padding:5px 10px;border-radius:8px\">40h</span>" +
    "<span style=\"color:#ffffff;font-size:17px;font-weight:bold;margin-left:10px\">Jornada 40h</span></td>" +
    "<td align=\"right\" style=\"" + font + "font-size:12px;color:#8E9BB5\">Relatório · " + dataHoje + "</td>" +
    "</tr></table></td></tr>" +

    // Destaque
    "<tr><td style=\"background:" + C.navy2 + ";padding:30px 32px 34px;border-top:1px solid #1E2C4C\">" +
    "<div style=\"" + font + "font-size:15px;color:#C9D2E3;margin-bottom:14px\">Oi, " + primeiroNome + "! Aqui está o relatório do seu negócio (" + tipo + ").</div>" +
    destaque +
    "</td></tr>" +

    saidas + oferta + dados +

    // Rodapé
    "<tr><td style=\"padding:24px 32px 28px\">" +
    "<div style=\"border-top:1px solid " + C.line + ";padding-top:16px;" + font + "font-size:12px;line-height:1.6;color:" + C.muted + "\">" +
    "<b style=\"color:" + C.ink + "\">Jornada 40h</b> · Calculadora e escalas para o fim da 6x1<br>" +
    "<a href=\"" + SITE_URL + "\" style=\"color:" + C.muted + "\">Refazer a conta</a> · " +
    "<a href=\"mailto:" + EMAIL_CONTATO + "\" style=\"color:" + C.muted + "\">" + EMAIL_CONTATO + "</a> · " +
    "<a href=\"" + SITE_URL + "privacidade.html\" style=\"color:" + C.muted + "\">Privacidade</a><br>" +
    "Você recebeu este e-mail porque pediu o relatório na calculadora e aceitou receber mensagens sobre a jornada de 40 horas. " +
    "Para não receber mais, responda com <b>sair</b>." +
    "</div></td></tr>" +

    "</table></td></tr></table></body></html>";

  const texto = "Oi, " + primeiroNome + "! Relatório do seu " + tipo + ": " +
    (coberto ? "sua equipe cobre o horário com 40h, mas são " + F + " folga(s) a mais por semana para encaixar." : parcial ? "faltam " + n1(D) + "h por semana na escala. Meio período: " + brl(custoContratar) + "/mês. Hora extra: " + brl(lead.custo_hora_extra_mes) + "/mês. Reduzir: " + n1(lead.horas_a_reduzir_semana) + "h/semana." : "você vai precisar de +" + faltamTxt + " " + funcTxt + ". Contratar (" + contratarTexto + "): " + brl(custoContratar) + "/mês. Hora extra: " + brl(lead.custo_hora_extra_mes) + "/mês. Reduzir: " + n1(lead.horas_a_reduzir_semana) + "h/semana.") +
    " Escala 5x2 pronta por R$ " + precoTxt_(PRECO_OFERTA) + ": " + checkout;

  MailApp.sendEmail({
    to: lead.email,
    subject: coberto ? "Seu relatório: " + F + " folga" + (F === 1 ? "" : "s") + " a mais por semana para encaixar" : parcial ? "Seu relatório: faltam " + n1(D) + "h por semana na sua escala" : "Seu relatório: +" + faltamTxt + " " + funcTxt + " com a jornada de 40h",
    htmlBody: html,
    body: texto,
    name: NOME_REMETENTE,
    replyTo: EMAIL_CONTATO
  });
}

/* ---------- Pedidos (briefing da escala, vindo de obrigado.html) ---------- */
const DIAS_BRIEFING = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
const COLUNAS_PEDIDO = [
  "data", "status", "pedido_kiwify", "valor", "nome", "whatsapp", "email", "negocio", "tipo", "cidade",
  ...DIAS_BRIEFING.flatMap(d => ["aberto_" + d, "abre_" + d, "fecha_" + d, "pessoas_" + d]),
  "equipe", "pico", "salario_medio", "preferencia", "observacoes",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "pagina"
];

function registrarPedido(ss, p) {
  let aba = ss.getSheetByName("Pedidos");
  if (!aba) {
    aba = ss.insertSheet("Pedidos");
    aba.appendRow(COLUNAS_PEDIDO);
    aba.setFrozenRows(1);
  }
  p.status = "novo";
  aba.appendRow(COLUNAS_PEDIDO.map(c => p[c] !== undefined ? p[c] : ""));

  const esc = s => String(s || "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[c]));
  const nomeDia = { seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", sab: "Sábado", dom: "Domingo" };
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const linhasDias = DIAS_BRIEFING.map(d => "<tr><td style=\"padding:6px 10px;border-bottom:1px solid #E6EBF5;" + font + "font-size:13px\"><b>" + nomeDia[d] + "</b></td><td style=\"padding:6px 10px;border-bottom:1px solid #E6EBF5;" + font + "font-size:13px\">" +
    (p["aberto_" + d] === "sim" ? esc(p["abre_" + d]) + " às " + esc(p["fecha_" + d]) + " · " + esc(p["pessoas_" + d]) + " pessoa(s)" : "<span style=\"color:#999\">fechado</span>") + "</td></tr>").join("");
  const resumo =
    "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"border:1px solid #E6EBF5;border-radius:10px;width:100%\">" + linhasDias + "</table>" +
    "<p style=\"" + font + "font-size:14px;line-height:1.6;color:#14213D\"><b>Equipe:</b><br>" + esc(p.equipe).replace(/\n/g, "<br>") + "</p>" +
    (p.pico ? "<p style=\"" + font + "font-size:14px;color:#14213D\"><b>Pico:</b> " + esc(p.pico) + "</p>" : "") +
    "<p style=\"" + font + "font-size:14px;color:#14213D\"><b>Preferência:</b> " + esc(p.preferencia) + (p.salario_medio ? " · <b>Salário médio:</b> R$ " + esc(p.salario_medio) : "") + "</p>" +
    (p.observacoes ? "<p style=\"" + font + "font-size:14px;color:#14213D\"><b>Observações:</b> " + esc(p.observacoes).replace(/\n/g, "<br>") + "</p>" : "");

  const primeiroNome = esc(String(p.nome || "").trim().split(" ")[0]);
  const shell = (titulo, corpo) =>
    "<!doctype html><html><body style=\"margin:0;background:#F3F5F9\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr><td align=\"center\" style=\"padding:24px 12px\">" +
    "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden\">" +
    "<tr><td style=\"background:#0B1428;padding:22px 32px;" + font + "\"><span style=\"display:inline-block;background:#D4A72C;color:#0B1428;font-weight:bold;font-size:13px;padding:5px 10px;border-radius:8px\">40h</span><span style=\"color:#fff;font-size:17px;font-weight:bold;margin-left:10px\">Jornada 40h</span></td></tr>" +
    "<tr><td style=\"padding:28px 32px;" + font + "\"><div style=\"font-size:22px;font-weight:bold;color:#14213D\">" + titulo + "</div>" + corpo + "</td></tr>" +
    "<tr><td style=\"padding:0 32px 28px;" + font + "font-size:12px;color:#5B6478;line-height:1.6\">Jornada 40h · <a href=\"mailto:" + EMAIL_CONTATO + "\" style=\"color:#5B6478\">" + EMAIL_CONTATO + "</a> · <a href=\"" + SITE_URL + "privacidade.html\" style=\"color:#5B6478\">Privacidade</a></td></tr>" +
    "</table></td></tr></table></body></html>";

  // 1) confirmação para o cliente
  if (p.email) {
    MailApp.sendEmail({
      to: p.email,
      subject: "Recebemos o briefing da sua escala 5x2 · entrega em até 48h úteis",
      htmlBody: shell("Briefing recebido, " + primeiroNome + "!",
        "<p style=\"" + font + "font-size:15px;line-height:1.6;color:#14213D\">Já estamos montando a escala de <b>" + esc(p.negocio) + "</b>. Você recebe em até <b>48 horas úteis</b> no WhatsApp " + esc(p.whatsapp) + " e neste e-mail, em PDF + planilha editável.</p>" +
        "<p style=\"" + font + "font-size:15px;line-height:1.6;color:#14213D\">Se algo abaixo estiver errado, é só responder este e-mail.</p>" + resumo),
      body: "Recebemos o briefing da escala de " + p.negocio + ". Entrega em até 48h úteis no WhatsApp " + p.whatsapp + ".",
      name: NOME_REMETENTE, replyTo: EMAIL_CONTATO
    });
  }
  // 2) aviso para você
  MailApp.sendEmail({
    to: EMAIL_CONTATO,
    subject: "🧾 Novo pedido: " + (p.negocio || p.nome) + " (" + (p.tipo || "") + ")",
    htmlBody: shell("Novo briefing de escala",
      "<p style=\"" + font + "font-size:14px;line-height:1.6;color:#14213D\"><b>" + esc(p.nome) + "</b> · " + esc(p.whatsapp) + " · " + esc(p.email) + "<br>" + esc(p.negocio) + " · " + esc(p.tipo) + " · " + esc(p.cidade) + (p.pedido_kiwify ? " · pedido Kiwify " + esc(p.pedido_kiwify) : "") + "</p>" + resumo +
      "<p style=\"" + font + "font-size:13px;color:#5B6478\">Linha gravada na aba Pedidos (status: novo). Prazo: 48h úteis.</p>"),
    name: "Jornada 40h · pedidos"
  });
}

/* ---------- Vendas (webhook da Kiwify) ---------- */
const COLUNAS_VENDA = ["data", "order_id", "status", "evento", "nome", "email", "whatsapp", "produto", "valor", "metodo", "utm_source", "utm_medium", "utm_campaign", "utm_content", "briefing_enviado"];

function registrarVendaKiwify(ss, w) {
  const c = w.Customer || {}, prod = w.Product || {}, utm = w.TrackingParameters || {};
  const status = String(w.order_status || "").toLowerCase();
  const evento = String(w.webhook_event_type || "");
  const valor = w.Commissions && w.Commissions.charge_amount ? Number(w.Commissions.charge_amount) / 100 : "";
  const venda = {
    data: new Date(), order_id: w.order_id, status, evento,
    nome: c.full_name || c.first_name || "", email: c.email || "", whatsapp: c.mobile || "",
    produto: prod.product_name || "", valor, metodo: w.payment_method || "",
    utm_source: utm.utm_source || "", utm_medium: utm.utm_medium || "", utm_campaign: utm.utm_campaign || "", utm_content: utm.utm_content || "",
    briefing_enviado: ""
  };

  let aba = ss.getSheetByName("Vendas");
  if (!aba) { aba = ss.insertSheet("Vendas"); aba.appendRow(COLUNAS_VENDA); aba.setFrozenRows(1); }

  // Só manda o link do briefing em compra aprovada, e uma vez por pedido.
  const aprovado = status === "paid" || status === "approved";
  if (aprovado && venda.email) {
    const ids = aba.getLastRow() > 1 ? aba.getRange(2, 2, aba.getLastRow() - 1, 1).getValues().flat().map(String) : [];
    const jaEnviado = ids.includes(String(venda.order_id));
    if (!jaEnviado) { enviarLinkBriefing(venda); venda.briefing_enviado = "sim"; }
  }
  aba.appendRow(COLUNAS_VENDA.map(k => venda[k] !== undefined ? venda[k] : ""));
}

function enviarLinkBriefing(v) {
  const esc = s => String(s || "").replace(/[<>&"]/g, ch => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[ch]));
  const primeiroNome = esc(String(v.nome || "").trim().split(" ")[0]) || "tudo bem";
  const link = SITE_URL + "obrigado.html?name=" + encodeURIComponent(v.nome || "") + "&email=" + encodeURIComponent(v.email || "") + "&phone=" + encodeURIComponent(v.whatsapp || "") + "&order_id=" + encodeURIComponent(v.order_id || "");
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const html =
    "<!doctype html><html><body style=\"margin:0;background:#F3F5F9\"><table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\"><tr><td align=\"center\" style=\"padding:24px 12px\">" +
    "<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" style=\"max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden\">" +
    "<tr><td style=\"background:#0B1428;padding:22px 32px;" + font + "\"><span style=\"display:inline-block;background:#D4A72C;color:#0B1428;font-weight:bold;font-size:13px;padding:5px 10px;border-radius:8px\">40h</span><span style=\"color:#fff;font-size:17px;font-weight:bold;margin-left:10px\">Jornada 40h</span></td></tr>" +
    "<tr><td style=\"padding:28px 32px;" + font + "\">" +
    "<div style=\"font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#1F8A70;font-weight:bold\">Pagamento confirmado</div>" +
    "<div style=\"font-size:24px;font-weight:bold;color:#14213D;margin-top:6px\">Falta só o briefing, " + primeiroNome + "</div>" +
    "<p style=\"font-size:15px;line-height:1.6;color:#14213D\">Para montar a sua escala 5x2 precisamos de 3 minutos seus: horário de funcionamento, quantas pessoas por dia e quem é a equipe. Depois disso, a escala chega em até <b>48 horas úteis</b> no seu WhatsApp e e-mail.</p>" +
    "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:18px 0\"><tr><td style=\"background:#1F8A70;border-radius:10px\"><a href=\"" + link + "\" style=\"display:inline-block;padding:14px 24px;" + font + "font-size:16px;font-weight:bold;color:#fff;text-decoration:none\">Preencher o briefing →</a></td></tr></table>" +
    "<p style=\"font-size:13px;line-height:1.6;color:#5B6478\">Pedido " + esc(v.order_id) + " · Se preferir, responda este e-mail com os dados ou mande um áudio no WhatsApp que a gente preenche por você.</p>" +
    "</td></tr>" +
    "<tr><td style=\"padding:0 32px 28px;" + font + "font-size:12px;color:#5B6478\">Jornada 40h · <a href=\"mailto:" + EMAIL_CONTATO + "\" style=\"color:#5B6478\">" + EMAIL_CONTATO + "</a> · Garantia de 7 dias</td></tr>" +
    "</table></td></tr></table></body></html>";
  MailApp.sendEmail({
    to: v.email,
    subject: "Pagamento confirmado · preencha o briefing da sua escala (3 min)",
    htmlBody: html,
    body: "Pagamento confirmado! Preencha o briefing da sua escala 5x2 em: " + link,
    name: NOME_REMETENTE, replyTo: EMAIL_CONTATO
  });
  MailApp.sendEmail({ to: EMAIL_CONTATO, subject: "💰 Venda aprovada: " + (v.nome || v.email) + " · R$ " + v.valor, body: "Pedido " + v.order_id + "\n" + v.nome + " · " + v.email + " · " + v.whatsapp + "\nUTM: " + v.utm_source + " / " + v.utm_content + "\nLink do briefing enviado ao cliente.", name: "Jornada 40h · vendas" });
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Rode esta função uma vez pelo editor para autorizar planilha e e-mail. */
function testar() {
  const r = doPost({ postData: { contents: JSON.stringify({
    nome: "Teste", whatsapp: "98999999999", email: Session.getActiveUser().getEmail(), cidade: "São Luís",
    tipo: "Padaria", dias_abertos: 6, horas_abertas_semana: 67, pessoas_simultaneas: 3, funcionarios: 4, salario_medio: 1800,
    funcionarios_a_mais: 1.03, custo_contratar_mes: 3060, horas_descobertas_semana: 41, custo_hora_extra_mes: 2397, horas_a_reduzir_semana: 13.7,
    checkout_url: "", pagina: "teste"
  }) } });
  Logger.log(r.getContent());
}
