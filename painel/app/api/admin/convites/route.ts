import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { hashToken, normalizaEmail, novoToken } from "@/lib/auth";

const DIAS = 14;

function autorizado(req: Request): boolean {
  const chave = process.env.ADMIN_KEY || "";
  const enviada = req.headers.get("x-admin-key") || "";
  if (chave.length < 24 || enviada.length !== chave.length) return false;
  return timingSafeEqual(Buffer.from(enviada), Buffer.from(chave));
}

// Confere a chave sem efeito colateral (usado por testarPainel() no Apps Script).
export async function GET(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  return NextResponse.json({ ok: true });
}

// Cria um convite (conta nova ou troca de senha). Usado pelo Carlos/agentes, não pelo cliente.
// Corpo: { email, nome?, estado? } — estado é a escala inicial (mesmo formato do dashboard).
export async function POST(req: Request) {
  if (!autorizado(req)) return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  const corpo = await req.json().catch(() => ({}));
  const email = normalizaEmail(corpo.email);
  if (!email) return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  const nome = typeof corpo.nome === "string" ? corpo.nome.trim().slice(0, 80) : "";
  const estado = corpo.estado && typeof corpo.estado === "object" ? JSON.stringify(corpo.estado) : null;
  const token = novoToken();
  getDb()
    .prepare("INSERT INTO convites (token_hash, email, nome, estado, expira_em) VALUES (?, ?, ?, ?, ?)")
    .run(hashToken(token), email, nome, estado, Date.now() + DIAS * 864e5);
  const base = process.env.PUBLIC_URL || new URL(req.url).origin;
  return NextResponse.json({ link: `${base}/painel/convite/${token}`, expiraEmDias: DIAS });
}
