import type Database from "better-sqlite3";
import { getDb } from "./db.ts";

// Livro-razão dos créditos do Ajuste com IA: cada pedido do dono custa 1 crédito. O saldo é sempre a
// soma dos lançamentos (nunca um número guardado) e (tipo, ref) único torna qualquer lançamento idempotente.
export const INCLUSOS = 10;

export type TipoMov = "inclusos" | "recarga" | "uso" | "estorno" | "reembolso" | "ajuste";

export function saldoDe(usuarioId: number): number {
  const r = getDb().prepare("SELECT COALESCE(SUM(delta), 0) AS s FROM creditos_mov WHERE usuario_id = ?").get(usuarioId) as { s: number };
  return r.s;
}

/** Grava um lançamento. false se (tipo, ref) já existia (repetição, nada muda). */
export function lancar(d: Database.Database, usuarioId: number, delta: number, tipo: TipoMov, ref: string, obs = ""): boolean {
  return d.prepare("INSERT OR IGNORE INTO creditos_mov (usuario_id, delta, tipo, ref, obs) VALUES (?, ?, ?, ?, ?)").run(usuarioId, delta, tipo, ref, obs).changes > 0;
}

/** Credita pelo e-mail (venda, reembolso, ajuste). Sem conta ainda, guarda como pendente até o acesso ser liberado. */
export function creditarPorEmail(email: string, delta: number, tipo: "recarga" | "reembolso" | "ajuste", ref: string, obs = ""): { saldo: number | null; pendente: boolean; duplicado: boolean } {
  const d = getDb();
  return d.transaction(() => {
    const u = d.prepare("SELECT id FROM usuarios WHERE email = ?").get(email) as { id: number } | undefined;
    if (!u) {
      const gravou = d.prepare("INSERT OR IGNORE INTO creditos_pendentes (email, delta, tipo, ref, obs) VALUES (?, ?, ?, ?, ?)").run(email, delta, tipo, ref, obs).changes > 0;
      return { saldo: null, pendente: true, duplicado: !gravou };
    }
    const gravou = lancar(d, u.id, delta, tipo, ref, obs);
    return { saldo: saldoDe(u.id), pendente: false, duplicado: !gravou };
  })();
}

/** Passa para a conta recém-criada os créditos que esperavam pelo e-mail. */
export function aplicarPendentes(d: Database.Database, usuarioId: number, email: string): void {
  const ps = d.prepare("SELECT delta, tipo, ref, obs FROM creditos_pendentes WHERE email = ?").all(email) as { delta: number; tipo: TipoMov; ref: string; obs: string }[];
  for (const p of ps) lancar(d, usuarioId, p.delta, p.tipo, p.ref, p.obs);
  if (ps.length) d.prepare("DELETE FROM creditos_pendentes WHERE email = ?").run(email);
}
