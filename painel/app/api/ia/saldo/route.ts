import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { RECARGA_URL, saldoDe } from "@/lib/creditos";

// Saldo de pedidos à IA da conta e o link para recarregar (vazio até a venda existir).
export async function GET() {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Entre de novo." }, { status: 401 });
  return NextResponse.json({ saldo: saldoDe(u.id), recarga: RECARGA_URL }, { headers: { "Cache-Control": "no-store" } });
}
