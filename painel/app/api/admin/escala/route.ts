import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { normalizaEmail } from "@/lib/auth";
import { autorizado, negar } from "@/lib/admin";

// Lê a escala de um cliente para suporte e revisão (GET ?email=). Só leitura; não toca na sessão dele.
export async function GET(req: Request) {
  if (!autorizado(req)) return negar(req);
  const email = normalizaEmail(new URL(req.url).searchParams.get("email"));
  if (!email) return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  const row = getDb()
    .prepare("SELECT e.estado, e.atualizado_em FROM escalas e JOIN usuarios u ON u.id = e.usuario_id WHERE u.email = ?")
    .get(email) as { estado: string; atualizado_em: string } | undefined;
  if (!row) return NextResponse.json({ erro: "Sem escala para esse e-mail." }, { status: 404 });
  return NextResponse.json({ estado: JSON.parse(row.estado), atualizadoEm: row.atualizado_em });
}
