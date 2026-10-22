import { NextResponse } from "next/server";
import { getDb } from "./db";

/**
 * Rate limit de janela fixa guardado no SQLite (vale entre reinícios; o painel roda numa instância só).
 * Conta 1 uso para cada chave e devolve uma resposta 429 se alguma passou do limite, ou null.
 */
export function limitar(regras: { chave: string; max: number; janelaMin: number }[]): NextResponse | null {
  const db = getDb();
  const agora = Date.now();
  let esperarSeg = 0;
  db.transaction(() => {
    for (const r of regras) {
      const janela = r.janelaMin * 60e3;
      const atual = db.prepare("SELECT inicio, n FROM limites WHERE chave = ?").get(r.chave) as { inicio: number; n: number } | undefined;
      if (!atual || atual.inicio + janela <= agora) {
        db.prepare("INSERT INTO limites (chave, inicio, n) VALUES (?, ?, 1) ON CONFLICT(chave) DO UPDATE SET inicio = excluded.inicio, n = 1").run(r.chave, agora);
        continue;
      }
      db.prepare("UPDATE limites SET n = n + 1 WHERE chave = ?").run(r.chave);
      if (atual.n + 1 > r.max) esperarSeg = Math.max(esperarSeg, Math.ceil((atual.inicio + janela - agora) / 1000));
    }
  })();
  if (!esperarSeg) return null;
  const min = Math.ceil(esperarSeg / 60);
  return NextResponse.json(
    { erro: `Muitas tentativas. Tente de novo em ${min} minuto${min === 1 ? "" : "s"}.` },
    { status: 429, headers: { "Retry-After": String(esperarSeg) } }
  );
}
