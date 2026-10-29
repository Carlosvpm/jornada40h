import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { marcarAplicado } from "@/lib/memoria";

// O dono aplicou a proposta de um pedido à IA. Corpo: { id } (o historico devolvido por /api/ia).
// Fica na memória do caso: a IA sabe o que está valendo e o que foi descartado.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Entre de novo." }, { status: 401 });
  const corpo = await req.json().catch(() => ({}));
  if (!Number.isInteger(corpo.id)) return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  return NextResponse.json({ ok: marcarAplicado(u.id, corpo.id) });
}
