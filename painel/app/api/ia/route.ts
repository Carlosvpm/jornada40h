import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { usuarioAtual, ipDe } from "@/lib/auth";
import { limitar } from "@/lib/limite";
import { ErroIA, iaAtiva, pedirAjuste } from "@/lib/ia";

export const maxDuration = 120;

const LIMITE = 120_000; // bytes do corpo (pedido + dados da escala)

// Ajuste com IA. Corpo: { pedido, contexto, anterior?, conferir? }. Devolve a proposta; quem aplica é o navegador.
// Cada pedido do dono faz até 2 chamadas: a proposta e a conferência sobre a escala montada.
export async function POST(req: Request) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.json({ erro: "Entre de novo." }, { status: 401 });
  if (!iaAtiva()) return NextResponse.json({ erro: "O ajuste com IA ainda não está ligado." }, { status: 503 });
  // Cada pedido custa uma chamada ao modelo: limite por pessoa e por IP.
  const bloqueio = limitar([
    { chave: "ia:u10:" + u.id, max: 16, janelaMin: 10 },
    { chave: "ia:dia:" + u.id, max: 80, janelaMin: 24 * 60 },
    { chave: "ia:ip:" + ipDe(req), max: 60, janelaMin: 60 },
  ]);
  if (bloqueio) return bloqueio;

  const texto = await req.text();
  if (texto.length > LIMITE) return NextResponse.json({ erro: "Escala grande demais para a IA." }, { status: 413 });
  let corpo: { pedido?: unknown; contexto?: unknown; anterior?: unknown; conferir?: unknown };
  try { corpo = JSON.parse(texto); } catch { return NextResponse.json({ erro: "JSON inválido." }, { status: 400 }); }
  const pedido = typeof corpo.pedido === "string" ? corpo.pedido.trim().slice(0, 1000) : "";
  if (!pedido) return NextResponse.json({ erro: "Escreva o que você quer mudar." }, { status: 400 });
  if (!corpo.contexto || typeof corpo.contexto !== "object") return NextResponse.json({ erro: "Escala inválida." }, { status: 400 });

  try {
    const { resultado, uso } = await pedirAjuste({ pedido, contexto: corpo.contexto, anterior: corpo.anterior, conferir: corpo.conferir });
    if (uso) console.log("[ia] uso", JSON.stringify({ ...uso, conferencia: !!corpo.conferir }));
    return NextResponse.json({ resultado });
  } catch (e) {
    if (e instanceof ErroIA) return NextResponse.json({ erro: e.message }, { status: 422 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ erro: "A IA está ocupada agora. Tente de novo em 1 minuto." }, { status: 503 });
    if (e instanceof Anthropic.APIError) {
      console.error("[ia]", e.status, e.message);
      return NextResponse.json({ erro: "A IA não respondeu. Tente de novo em instantes." }, { status: 502 });
    }
    console.error("[ia]", e);
    return NextResponse.json({ erro: "Erro ao falar com a IA." }, { status: 500 });
  }
}
