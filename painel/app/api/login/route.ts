import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { bloqueado, confereSenha, criarSessao, limpaFalhas, normalizaEmail, registraFalha } from "@/lib/auth";

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => ({}));
  const email = normalizaEmail(corpo.email);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (bloqueado("ip:" + ip) || (email && bloqueado("email:" + email))) {
    return NextResponse.json({ erro: "Muitas tentativas. Espere 15 minutos e tente de novo." }, { status: 429 });
  }
  const u = email
    ? (getDb().prepare("SELECT id, senha_hash FROM usuarios WHERE email = ?").get(email) as { id: number; senha_hash: string } | undefined)
    : undefined;
  if (!u || typeof corpo.senha !== "string" || !confereSenha(corpo.senha, u.senha_hash)) {
    registraFalha("ip:" + ip);
    if (email) registraFalha("email:" + email);
    return NextResponse.json({ erro: "E-mail ou senha incorretos." }, { status: 401 });
  }
  limpaFalhas("email:" + email);
  await criarSessao(u.id);
  return NextResponse.json({ ok: true });
}
