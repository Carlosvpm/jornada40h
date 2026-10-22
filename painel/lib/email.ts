import { CODIGO_MIN } from "./auth";

const SITE = process.env.PUBLIC_URL || "https://jornada40h.com.br";

// Mesmas cores da LP (site/index.html). E-mail é tabela + estilo inline: é o que Gmail/Outlook respeitam.
const C = { bg: "#080B11", card: "#121722", campo: "#0A0E15", linha: "#232A3A", texto: "#EEF1F6", suave: "#98A2B5", ouro: "#E6B84A", ouroEsc: "#1B1405" };
const SANS = "font-family:Inter,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const DISPLAY = "font-family:'Bricolage Grotesque',Inter,'Segoe UI',Helvetica,Arial,sans-serif;";

export function htmlCodigo(codigo: string): string {
  const login = `${SITE}/painel/login`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>Seu código de acesso</title></head>
<body style="margin:0;padding:0;background:${C.bg};" bgcolor="${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">Código ${codigo} · vale por ${CODIGO_MIN} minutos.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg}"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">
  <tr><td style="padding:0 4px 20px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td width="34" height="34" align="center" bgcolor="${C.ouro}" style="background:${C.ouro};border-radius:9px;${SANS}font-size:12px;font-weight:700;color:${C.ouroEsc};letter-spacing:-0.02em">40h</td>
      <td style="padding-left:10px;${DISPLAY}font-size:18px;font-weight:700;color:${C.texto}">Jornada 40h</td>
    </tr></table>
  </td></tr>
  <tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.linha};border-radius:18px;padding:32px 28px">
    <div style="${DISPLAY}font-size:24px;line-height:1.25;font-weight:700;color:${C.texto};margin:0 0 8px">Seu código de acesso</div>
    <div style="${SANS}font-size:15px;line-height:1.6;color:${C.suave};margin:0 0 24px">Digite este código na tela de login para abrir sua escala.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="center" bgcolor="${C.campo}" style="background:${C.campo};border:1px solid ${C.ouro};border-radius:14px;padding:20px 8px">
        <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:36px;line-height:1;font-weight:700;letter-spacing:10px;color:${C.ouro};padding-left:10px">${codigo}</div>
      </td>
    </tr></table>
    <div style="${SANS}font-size:13px;line-height:1.6;color:${C.suave};margin:14px 0 26px;text-align:center">Vale por <strong style="color:${C.texto}">${CODIGO_MIN} minutos</strong> e só uma vez.</div>
    <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
      <td bgcolor="${C.ouro}" style="background:${C.ouro};border-radius:10px">
        <a href="${login}" style="display:inline-block;padding:13px 26px;${SANS}font-size:15px;font-weight:700;color:${C.ouroEsc};text-decoration:none">Abrir o painel →</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:22px 8px 0;${SANS}font-size:12px;line-height:1.7;color:${C.suave};text-align:center">
    Não pediu este código? Pode ignorar este e-mail: ninguém entra sem ele.<br>
    Dúvidas? É só responder esta mensagem.<br>
    <a href="${SITE}" style="color:${C.suave}">jornada40h.com.br</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// E-mail de "acesso liberado": vai uma vez, quando a escala do cliente fica pronta no painel.
// notas: observações do caso dele (linhas curtas, texto puro), revisadas por uma pessoa antes do envio.
export function htmlAcesso(nome: string, email: string, notas: string[] = []): string {
  const login = `${SITE}/painel/login`;
  const passo = (n: number, txt: string) => `<tr><td width="30" valign="top" style="padding:0 0 12px"><div style="width:22px;height:22px;border-radius:11px;background:${C.ouro};color:${C.ouroEsc};${SANS}font-size:12px;font-weight:700;line-height:22px;text-align:center">${n}</div></td><td style="padding:1px 0 12px;${SANS}font-size:15px;line-height:1.55;color:${C.texto}">${txt}</td></tr>`;
  const item = (txt: string) => `<tr><td width="18" valign="top" style="${SANS}font-size:15px;line-height:1.55;color:${C.ouro}">•</td><td style="padding:0 0 8px;${SANS}font-size:14px;line-height:1.55;color:${C.suave}">${txt}</td></tr>`;
  const ola = nome ? `Olá, ${esc(nome)}!` : "Olá!";
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>Sua escala está pronta</title></head>
<body style="margin:0;padding:0;background:${C.bg};" bgcolor="${C.bg}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">Sua escala 5x2 já está no painel. Entre com seu e-mail, sem senha.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bg}" style="background:${C.bg}"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
  <tr><td style="padding:0 4px 20px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td width="34" height="34" align="center" bgcolor="${C.ouro}" style="background:${C.ouro};border-radius:9px;${SANS}font-size:12px;font-weight:700;color:${C.ouroEsc};letter-spacing:-0.02em">40h</td>
      <td style="padding-left:10px;${DISPLAY}font-size:18px;font-weight:700;color:${C.texto}">Jornada 40h</td>
    </tr></table>
  </td></tr>
  <tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.linha};border-radius:18px;padding:32px 28px">
    <div style="${DISPLAY}font-size:24px;line-height:1.25;font-weight:700;color:${C.texto};margin:0 0 8px">${ola} Sua escala está pronta</div>
    <div style="${SANS}font-size:15px;line-height:1.6;color:${C.suave};margin:0 0 24px">A escala 5x2 da sua equipe já está no painel, nas versões de <strong style="color:${C.texto}">42 h</strong> (a partir de dez/2026) e <strong style="color:${C.texto}">40 h</strong> (a partir de dez/2027), com as semanas A e B.</div>
    <div style="${SANS}font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.ouro};margin:0 0 12px">Como entrar (sem senha)</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${passo(1, `Abra <a href="${login}" style="color:${C.ouro}">jornada40h.com.br/painel/login</a>`)}
      ${passo(2, `Digite este e-mail: <strong>${esc(email)}</strong>`)}
      ${passo(3, `Chega um código de 6 dígitos neste e-mail. Digite na tela (vale 15 minutos).`)}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:14px auto 26px"><tr>
      <td bgcolor="${C.ouro}" style="background:${C.ouro};border-radius:10px">
        <a href="${login}" style="display:inline-block;padding:13px 26px;${SANS}font-size:15px;font-weight:700;color:${C.ouroEsc};text-decoration:none">Abrir minha escala →</a>
      </td>
    </tr></table>
    <div style="${SANS}font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.ouro};margin:0 0 12px">O que tem no painel</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${item("Quem trabalha em cada turno e dia. Arraste um nome para trocar turno ou dia, ou clique para ajustar o horário.")}
      ${item("Alertas de lei com o artigo citado (jornada, folgas, descanso de 11 h, domingo).")}
      ${item("Quanto custa cobrir as horas que faltam: contratar, hora extra ou reduzir horário.")}
      ${item("Baixar a planilha e o PDF para imprimir e fixar na parede.")}
      ${item("Ajuste com IA: descreva a mudança em português e veja o antes e depois antes de aplicar.")}
    </table>
    ${notas.length ? `<div style="${SANS}font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.ouro};margin:18px 0 12px">Sobre a sua escala</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${notas.map(n => item(esc(n))).join("")}</table>` : ""}
  </td></tr>
  <tr><td style="padding:22px 8px 0;${SANS}font-size:12px;line-height:1.7;color:${C.suave};text-align:center">
    Dúvidas ou quer ajustar algo? É só responder esta mensagem.<br>
    <a href="${SITE}" style="color:${C.suave}">jornada40h.com.br</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function textoAcesso(nome: string, email: string, notas: string[] = []): string {
  return [
    nome ? `Olá, ${nome}! Sua escala está pronta.` : "Olá! Sua escala está pronta.",
    "",
    "A escala 5x2 da sua equipe já está no painel, nas versões de 42 h (a partir de dez/2026) e 40 h (a partir de dez/2027), com as semanas A e B.",
    "",
    "Como entrar (sem senha):",
    `1. Abra ${SITE}/painel/login`,
    `2. Digite este e-mail: ${email}`,
    "3. Chega um código de 6 dígitos neste e-mail. Digite na tela (vale 15 minutos).",
    ...(notas.length ? ["", "Sobre a sua escala:", ...notas.map(n => `- ${n}`)] : []),
    "",
    "Dúvidas ou quer ajustar algo? É só responder esta mensagem.",
  ].join("\n");
}

async function enviar(email: string, assunto: string, html: string, text: string): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    if (process.env.NODE_ENV !== "production" || process.env.EMAIL_DEV_LOG === "1") {
      console.log(`[email] ${email} ${assunto}`);
      return;
    }
    throw new Error("RESEND_API_KEY não configurada");
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Jornada 40h <acesso@jornada40h.com.br>",
      to: [email],
      reply_to: "calculadora40h@gmail.com",
      subject: assunto,
      html,
      text,
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

export async function enviarAcesso(email: string, nome: string, notas: string[] = []): Promise<void> {
  await enviar(email, "Sua escala 5x2 está pronta · Jornada 40h", htmlAcesso(nome, email, notas), textoAcesso(nome, email, notas));
}

/**
 * Envia o código de acesso pelo Resend (RESEND_API_KEY + EMAIL_FROM).
 * Sem chave: em desenvolvimento ou com EMAIL_DEV_LOG=1 só escreve no log (usado nos testes);
 * em produção falha, para o login não fingir que mandou.
 */
export async function enviarCodigo(email: string, codigo: string): Promise<void> {
  if (!process.env.RESEND_API_KEY && (process.env.NODE_ENV !== "production" || process.env.EMAIL_DEV_LOG === "1")) {
    console.log(`[codigo] ${email} ${codigo}`);
    return;
  }
  await enviar(email, `${codigo} é o seu código de acesso · Jornada 40h`, htmlCodigo(codigo),
    `Seu código para entrar no painel da Jornada 40h: ${codigo}\nVale por ${CODIGO_MIN} minutos e só uma vez.\nAbrir o painel: ${SITE}/painel/login\n\nNão pediu este código? Pode ignorar este e-mail.`);
}
