import { CODIGO_MIN } from "./auth";

/**
 * Envia o código de acesso pelo Resend (RESEND_API_KEY + EMAIL_FROM).
 * Sem chave: em desenvolvimento ou com EMAIL_DEV_LOG=1 só escreve no log (usado nos testes);
 * em produção falha, para o login não fingir que mandou.
 */
export async function enviarCodigo(email: string, codigo: string): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    if (process.env.NODE_ENV !== "production" || process.env.EMAIL_DEV_LOG === "1") {
      console.log(`[codigo] ${email} ${codigo}`);
      return;
    }
    throw new Error("RESEND_API_KEY não configurada");
  }
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const html =
    `<!doctype html><html><body style="margin:0;background:#F3F5F9"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">` +
    `<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fff;border-radius:16px;overflow:hidden">` +
    `<tr><td style="background:#0B0D12;padding:20px 28px;${font}"><span style="display:inline-block;background:#E6B84A;color:#1B1405;font-weight:bold;font-size:13px;padding:5px 10px;border-radius:8px">40h</span><span style="color:#fff;font-size:16px;font-weight:bold;margin-left:10px">Jornada 40h</span></td></tr>` +
    `<tr><td style="padding:28px;${font}color:#14213D"><div style="font-size:15px">Seu código para entrar no painel:</div>` +
    `<div style="font-size:34px;font-weight:bold;letter-spacing:8px;margin:14px 0;color:#0B0D12">${codigo}</div>` +
    `<div style="font-size:13px;color:#5B6478;line-height:1.6">Vale por ${CODIGO_MIN} minutos e só uma vez. Se não foi você que pediu, ignore este e-mail.</div></td></tr>` +
    `</table></td></tr></table></body></html>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Jornada 40h <acesso@jornada40h.com.br>",
      to: [email],
      reply_to: "calculadora40h@gmail.com",
      subject: `${codigo} é o seu código de acesso · Jornada 40h`,
      html,
      text: `Seu código para entrar no painel da Jornada 40h: ${codigo}\nVale por ${CODIGO_MIN} minutos e só uma vez. Se não foi você que pediu, ignore este e-mail.`,
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}
