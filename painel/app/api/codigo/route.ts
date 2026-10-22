import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { esperaReenvio, ipDe, normalizaEmail, novoCodigo } from "@/lib/auth";
import { enviarCodigo } from "@/lib/email";
import { limitar } from "@/lib/limite";

// Mesma resposta exista a conta ou não: não revela quem é cliente.
const ENVIADO = { ok: true, mensagem: "Se este e-mail tem acesso, o código chega em instantes." };

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => ({}));
  const email = normalizaEmail(corpo.email);
  if (!email) return NextResponse.json({ erro: "Digite um e-mail válido." }, { status: 400 });
  const bloqueio = limitar([
    { chave: "codigo:ip:" + ipDe(req), max: 10, janelaMin: 15 },
    { chave: "codigo:email:" + email, max: 3, janelaMin: 15 },
  ]);
  if (bloqueio) return bloqueio;

  const espera = esperaReenvio(email);
  if (espera) return NextResponse.json({ erro: `Aguarde ${espera}s para pedir outro código.` }, { status: 429, headers: { "Retry-After": String(espera) } });

  const existe = getDb().prepare("SELECT 1 FROM usuarios WHERE email = ?").get(email);
  if (!existe) return NextResponse.json(ENVIADO);
  try {
    await enviarCodigo(email, novoCodigo(email));
  } catch (e) {
    console.error("[codigo] falha no envio:", (e as Error).message);
    return NextResponse.json({ erro: "Não conseguimos mandar o e-mail agora. Tente de novo em alguns minutos." }, { status: 503 });
  }
  return NextResponse.json(ENVIADO);
}
