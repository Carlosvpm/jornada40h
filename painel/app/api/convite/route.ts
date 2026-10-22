import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { criarSessao, hashSenha, hashToken, senhaValida } from "@/lib/auth";

type Convite = { token_hash: string; email: string; nome: string; estado: string | null };

// Aceita o convite: cria a conta (ou troca a senha, se o e-mail já existe) e entra.
export async function POST(req: Request) {
  const corpo = await req.json().catch(() => ({}));
  if (typeof corpo.token !== "string") return NextResponse.json({ erro: "Convite inválido." }, { status: 400 });
  if (!senhaValida(corpo.senha)) return NextResponse.json({ erro: "A senha precisa ter pelo menos 8 caracteres." }, { status: 400 });
  const db = getDb();
  const c = db
    .prepare("SELECT token_hash, email, nome, estado FROM convites WHERE token_hash = ? AND usado_em IS NULL AND expira_em > ?")
    .get(hashToken(corpo.token), Date.now()) as Convite | undefined;
  if (!c) return NextResponse.json({ erro: "Este convite expirou ou já foi usado. Peça um novo pelo calculadora40h@gmail.com." }, { status: 410 });

  const nome = typeof corpo.nome === "string" && corpo.nome.trim() ? corpo.nome.trim().slice(0, 80) : c.nome;
  const usuarioId = db.transaction(() => {
    const existente = db.prepare("SELECT id FROM usuarios WHERE email = ?").get(c.email) as { id: number } | undefined;
    let id: number;
    if (existente) {
      db.prepare("UPDATE usuarios SET senha_hash = ?, nome = ? WHERE id = ?").run(hashSenha(corpo.senha), nome, existente.id);
      db.prepare("DELETE FROM sessoes WHERE usuario_id = ?").run(existente.id);
      id = existente.id;
    } else {
      id = Number(db.prepare("INSERT INTO usuarios (email, nome, senha_hash) VALUES (?, ?, ?)").run(c.email, nome, hashSenha(corpo.senha)).lastInsertRowid);
    }
    if (c.estado) db.prepare("INSERT OR IGNORE INTO escalas (usuario_id, estado) VALUES (?, ?)").run(id, c.estado);
    db.prepare("UPDATE convites SET usado_em = datetime('now') WHERE token_hash = ?").run(c.token_hash);
    return id;
  })();

  await criarSessao(usuarioId);
  return NextResponse.json({ ok: true });
}
