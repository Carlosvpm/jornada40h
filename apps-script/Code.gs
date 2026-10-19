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

/**
 * E-mail imediato depois do cadastro (variante a4): só o diagnóstico curto.
 * Os custos das 3 saídas e a escala ficam no relatório completo pago (R$ 47,90).
 * Usa botao_() e enviarEmailSequencia_() de Sequencia.gs.
 */
function enviarRelatorio(lead) {
  const n1 = v => (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const esc = s => String(s || "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[c]));
  const primeiro = String(lead.nome || "").trim().split(" ")[0] || "tudo bem";
  const tipo = esc(lead.tipo || "negócio");
  const D = Number(lead.horas_descobertas_semana) || 0;
  const gap = Math.max(0, Number(lead.funcionarios_a_mais) || 0);
  const F = Number(lead.funcionarios) || 0;
  const diag = D <= 0.05
    ? "Sua equipe dá conta das horas, mas são <b>" + (F * 2) + " folgas por semana</b> para encaixar sem deixar o " + (Number(lead.dias_abertos) >= 7 ? "fim de semana" : "sábado") + " descoberto."
    : gap >= 0.95
      ? "Com 2 folgas por pessoa, faltam cerca de <b>" + n1(D) + " horas por semana</b> na sua escala, algo como <b>+" + n1(gap) + " funcionário</b>."
      : "Com 2 folgas por pessoa, faltam cerca de <b>" + n1(D) + " horas por semana</b> na sua escala.";
  const assunto = primeiro + ", o diagnóstico do seu negócio para o fim da escala 6x1";
  const corpo =
    "<p>Oi, " + esc(primeiro) + "! Aqui é o Carlos, da Jornada 40h. Este é o diagnóstico do seu negócio" + (lead.tipo ? " (" + tipo.toLowerCase() + ")" : "") + ":</p>" +
    "<p style=\"font-size:17px\">" + diag + "</p>" +
    "<p>A emenda já foi publicada (EC 141): por volta de 16 de dezembro, cada funcionário passa a ter 2 folgas por semana e a jornada cai para 42h; em dezembro de 2027, para 40h, sem reduzir salário.</p>" +
    "<p><b>No relatório completo + escala pronta você recebe:</b></p>" +
    "<ul style=\"padding-left:18px;margin:0 0 12px\">" +
    "<li>quanto custa cada saída (contratar, hora extra ou reduzir horário) e qual é a mais barata para você;</li>" +
    "<li>a escala 5x2 da sua equipe, pessoa por pessoa, nas versões de 42h e 40h, em PDF e planilha;</li>" +
    "<li>acesso antecipado ao app da transição, com assistente de IA.</li></ul>" +
    "<p>De <s>R$ " + precoTxt_(PRECO_CHEIO) + "</s> por <b>R$ " + precoTxt_(PRECO_OFERTA) + "</b>, pagamento único, entrega em até 48h e garantia de 7 dias.</p>" +
    botao_(checkoutDe_(lead), "Liberar meu resultado completo + escala · R$ " + precoTxt_(PRECO_OFERTA)) +
    "<p style=\"font-size:13px;color:#5B6478\">Ficou com dúvida? É só responder este e-mail.</p>";
  enviarEmailSequencia_(lead, assunto, "O diagnóstico do seu negócio", corpo, []);
}

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
