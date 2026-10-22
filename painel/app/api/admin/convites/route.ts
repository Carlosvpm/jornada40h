import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getDb, liberarAcesso } from "@/lib/db";
import { ipDe, normalizaEmail } from "@/lib/auth";
import { limitar } from "@/lib/limite";

function autorizado(req: Request): boolean {
  const chave = process.env.ADMIN_KEY || "";
  const enviada = req.headers.get("x-admin-key") || "";
  if (chave.length < 24 || enviada.length !== chave.length) return false;
  return timingSafeEqual(Buffer.from(enviada), Buffer.from(chave));
}

// Só falhas de chave contam para o limite (o Apps Script chama isto a cada venda).
function negar(req: Request) {
  return limitar([{ chave: "admin:ip:" + ipDe(req), max: 20, janelaMin: 15 }]) ||
    NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
}

// Confere a chave sem efeito colateral (usado por testarPainel() no Apps Script).
export async function GET(req: Request) {
  if (!autorizado(req)) return negar(req);
  return NextResponse.json({ ok: true });
}

// Libera o acesso de um cliente (cria a conta) e grava a escala inicial, se vier.
// Corpo: { email, nome?, estado? }. O cliente entra em /painel/login com o e-mail e recebe um código.
export async function POST(req: Request) {
  if (!autorizado(req)) return negar(req);
  const corpo = await req.json().catch(() => ({}));
  const email = normalizaEmail(corpo.email);
  if (!email) return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  const nome = typeof corpo.nome === "string" ? corpo.nome.trim().slice(0, 80) : "";
  const estado = corpo.estado && typeof corpo.estado === "object" ? JSON.stringify(corpo.estado) : null;
  const db = getDb();
  db.transaction(() => liberarAcesso(db, email, nome, estado))();
  const base = process.env.PUBLIC_URL || new URL(req.url).origin;
  return NextResponse.json({ link: `${base}/painel/login`, email });
}
