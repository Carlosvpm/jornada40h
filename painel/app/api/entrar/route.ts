import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { confereCodigo, criarSessao, ipDe, normalizaEmail } from "@/lib/auth";
import { limitar } from "@/lib/limite";

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => ({}));
  const email = normalizaEmail(corpo.email);
  const codigo = String(corpo.codigo ?? "").replace(/\D/g, "");
  if (!email || codigo.length !== 6) return NextResponse.json({ erro: "Digite o código de 6 números." }, { status: 400 });
  const bloqueio = limitar([
    { chave: "entrar:ip:" + ipDe(req), max: 30, janelaMin: 15 },
    { chave: "entrar:email:" + email, max: 10, janelaMin: 15 },
  ]);
  if (bloqueio) return bloqueio;

  if (!confereCodigo(email, codigo)) {
    return NextResponse.json({ erro: "Código errado ou vencido. Confira o e-mail ou peça um novo." }, { status: 401 });
  }
  const u = getDb().prepare("SELECT id FROM usuarios WHERE email = ?").get(email) as { id: number } | undefined;
  if (!u) return NextResponse.json({ erro: "Código errado ou vencido." }, { status: 401 });
  await criarSessao(u.id);
  return NextResponse.json({ ok: true });
}
