import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ipDe } from "@/lib/auth";
import { limitar } from "@/lib/limite";

// Funil da LP (site estático no mesmo domínio): cada visita manda os mesmos eventos do Pixel
// (PageView, ViuCalculadora, CalculouResultado, Lead, InitiateCheckout…) por sendBeacon.
// Sem dado pessoal: só um id aleatório da visita, a variante da página e as UTMs do anúncio.
const NOME = /^[A-Za-z0-9_-]{2,40}$/;
const texto = (v: unknown) => (typeof v === "string" ? v.slice(0, 80) : "");

export async function POST(req: Request) {
  const bloqueio = limitar([{ chave: "ev:ip:" + ipDe(req), max: 300, janelaMin: 15 }]);
  if (bloqueio) return bloqueio;
  const corpo = JSON.parse(await req.text().catch(() => "") || "{}");
  if (!NOME.test(corpo.ev) || !NOME.test(corpo.sid)) return NextResponse.json({ erro: "Evento inválido." }, { status: 400 });
  getDb()
    .prepare("INSERT INTO eventos (criado_em, sid, ev, variante, anuncio, termo) VALUES (?, ?, ?, ?, ?, ?)")
    .run(Date.now(), corpo.sid, corpo.ev, texto(corpo.variante), texto(corpo.anuncio), texto(corpo.termo));
  return new NextResponse(null, { status: 204 });
}
