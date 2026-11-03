import { NextResponse } from "next/server";
import { normalizaEmail } from "@/lib/auth";
import { autorizado, negar } from "@/lib/admin";
import { creditarPorEmail } from "@/lib/creditos";

// Credita (ou debita) créditos da IA de um cliente: recarga vendida, reembolso, ajuste manual.
// Corpo: { email, delta, tipo: "recarga" | "reembolso" | "ajuste", ref, obs? }. A ref (ex.: id da venda) evita lançar duas vezes.
// Sem conta com esse e-mail, fica pendente e entra quando o acesso for liberado.
export async function POST(req: Request) {
  if (!autorizado(req)) return negar(req);
  const corpo = await req.json().catch(() => ({}));
  const email = normalizaEmail(corpo.email);
  if (!email) return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  const { delta, tipo, ref } = corpo;
  if (!Number.isInteger(delta) || delta === 0 || delta < -50 || delta > 50) return NextResponse.json({ erro: "delta deve ser inteiro de -50 a 50, fora o zero." }, { status: 400 });
  if (tipo !== "recarga" && tipo !== "reembolso" && tipo !== "ajuste") return NextResponse.json({ erro: "tipo inválido." }, { status: 400 });
  if (typeof ref !== "string" || !ref.trim() || ref.length > 100) return NextResponse.json({ erro: "ref obrigatória (até 100 caracteres)." }, { status: 400 });
  const obs = typeof corpo.obs === "string" ? corpo.obs.slice(0, 200) : "";
  return NextResponse.json(creditarPorEmail(email, delta, tipo, ref, obs));
}
