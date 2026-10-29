import { NextResponse } from "next/server";
import { getDb, liberarAcesso } from "@/lib/db";
import { normalizaEmail } from "@/lib/auth";
import { autorizado, negar } from "@/lib/admin";
import { enviarAcesso } from "@/lib/email";

// Confere a chave sem efeito colateral (usado por testarPainel() no Apps Script).
export async function GET(req: Request) {
  if (!autorizado(req)) return negar(req);
  return NextResponse.json({ ok: true });
}

// Libera o acesso de um cliente (cria a conta) e grava a escala inicial, se vier.
// Corpo: { email, nome?, estado?, substituir?, enviarEmail?, notas?, caso? }. O cliente entra em /painel/login com o e-mail e recebe um código.
export async function POST(req: Request) {
  if (!autorizado(req)) return negar(req);
  const corpo = await req.json().catch(() => ({}));
  const email = normalizaEmail(corpo.email);
  if (!email) return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  const nome = typeof corpo.nome === "string" ? corpo.nome.trim().slice(0, 80) : "";
  const estado = corpo.estado && typeof corpo.estado === "object" ? JSON.stringify(corpo.estado) : null;
  // caso: o que se sabe do negócio fora da escala (observações do briefing, notas do suporte). Vai para a memória da IA.
  const caso = typeof corpo.caso === "string" ? corpo.caso.trim().slice(0, 2000) : "";
  const db = getDb();
  db.transaction(() => {
    const id = liberarAcesso(db, email, nome, estado);
    if (caso) db.prepare("UPDATE usuarios SET caso = ? WHERE id = ?").run(caso, id);
    // substituir: true troca a escala que a conta já tem (ex.: copiar a escala de um cliente para conferir).
    if (estado && corpo.substituir === true) {
      db.prepare("INSERT INTO escalas (usuario_id, estado, atualizado_em) VALUES (?, ?, datetime('now')) ON CONFLICT(usuario_id) DO UPDATE SET estado = excluded.estado, atualizado_em = excluded.atualizado_em").run(id, estado);
    }
  })();
  // enviarEmail: true manda o e-mail de "acesso liberado" (link, como entrar e as notas do caso).
  let enviado = false;
  if (corpo.enviarEmail === true) {
    const notas = Array.isArray(corpo.notas) ? corpo.notas.filter((n: unknown) => typeof n === "string").map((n: string) => n.slice(0, 300)).slice(0, 8) : [];
    try { await enviarAcesso(email, nome, notas); enviado = true; }
    catch (e) { return NextResponse.json({ erro: "Conta liberada, mas o e-mail falhou: " + (e as Error).message }, { status: 502 }); }
  }
  const base = process.env.PUBLIC_URL || new URL(req.url).origin;
  return NextResponse.json({ link: `${base}/painel/login`, email, enviado });
}
