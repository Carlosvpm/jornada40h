import { NextResponse } from "next/server";
import { autorizado, negar } from "@/lib/admin";
import { ehModelo, pedirAjuste } from "@/lib/ia";

export const maxDuration = 120;

// Avaliação de modelos para o Ajuste com IA (só admin): roda o mesmo pedido no modelo escolhido e
// devolve a proposta, os tokens e o tempo. Corpo: { modelo, pedido, contexto }.
export async function POST(req: Request) {
  if (!autorizado(req)) return negar(req);
  const corpo = await req.json().catch(() => ({}));
  if (!ehModelo(corpo.modelo) || typeof corpo.pedido !== "string" || !corpo.contexto) return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  const t0 = Date.now();
  try {
    const { resultado, uso } = await pedirAjuste({ pedido: corpo.pedido, contexto: corpo.contexto, modelo: corpo.modelo });
    return NextResponse.json({ resultado, uso, ms: Date.now() - t0 });
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message, ms: Date.now() - t0 }, { status: 502 });
  }
}
