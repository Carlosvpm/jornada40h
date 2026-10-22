import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { usuarioAtual } from "@/lib/auth";

const LIMITE = 300_000; // bytes do estado serializado

export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Entre de novo." }, { status: 401 });
  const row = getDb().prepare("SELECT estado, atualizado_em FROM escalas WHERE usuario_id = ?").get(u.id) as
    | { estado: string; atualizado_em: string }
    | undefined;
  return NextResponse.json({ estado: row ? JSON.parse(row.estado) : null, atualizadoEm: row?.atualizado_em ?? null });
}

export async function PUT(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Entre de novo." }, { status: 401 });
  const texto = await req.text();
  if (texto.length > LIMITE) return NextResponse.json({ erro: "Escala grande demais." }, { status: 413 });
  let corpo: { estado?: unknown };
  try { corpo = JSON.parse(texto); } catch { return NextResponse.json({ erro: "JSON inválido." }, { status: 400 }); }
  const e = corpo.estado as Record<string, unknown> | undefined;
  if (!e || typeof e !== "object" || Array.isArray(e) || !Array.isArray(e.equipe) || typeof e.funcionamento !== "object") {
    return NextResponse.json({ erro: "Estado inválido." }, { status: 400 });
  }
  getDb()
    .prepare("INSERT INTO escalas (usuario_id, estado, atualizado_em) VALUES (?, ?, datetime('now')) ON CONFLICT(usuario_id) DO UPDATE SET estado = excluded.estado, atualizado_em = excluded.atualizado_em")
    .run(u.id, JSON.stringify(e));
  return NextResponse.json({ ok: true });
}
