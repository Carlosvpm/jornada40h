import type Database from "better-sqlite3";
import { getDb } from "./db.ts";
import type { Uso } from "./ia.ts";

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

export const RECARGA_URL = process.env.RECARGA_URL || "";

export type Etapa = "proposta" | "melhorar" | "conferencia";

/**
 * Abre uma rodada de uso da IA. Com cobrança, a checagem do saldo e o débito de 1 crédito ficam na mesma
 * transação (duas abas com saldo 1: só uma passa). A ref do livro-razão é "ia:r<rodada>", o id nunca é reaproveitado.
 */
export function abrirRodada(usuarioId: number, etapa: Etapa, cobrar: boolean): { rodada: number } | { semCredito: true; saldo: number } {
  const d = getDb();
  return d.transaction(() => {
    if (cobrar) {
      const saldo = saldoDe(usuarioId);
      if (saldo < 1) return { semCredito: true as const, saldo };
    }
    const rodada = Number(d.prepare("INSERT INTO uso_ia (usuario_id, etapa) VALUES (?, ?)").run(usuarioId, etapa).lastInsertRowid);
    if (cobrar) lancar(d, usuarioId, -1, "uso", "ia:r" + rodada);
    return { rodada };
  }).immediate();
}

/** Grava a telemetria da rodada e a marca como entregue. */
export function fecharRodada(rodada: number, uso: Uso | null, ms: number, pedidoId?: number): void {
  getDb()
    .prepare("UPDATE uso_ia SET ok = 1, modelo = ?, entrada = ?, saida = ?, cache_lido = ?, cache_gravado = ?, ms = ?, pedido_id = ? WHERE id = ?")
    .run(uso?.modelo || "", uso?.entrada || 0, uso?.saida || 0, uso?.cacheLido || 0, uso?.cacheGravado || 0, Math.round(ms), pedidoId ?? null, rodada);
}

/** Devolve o crédito de uma rodada que não entregou nada. Só estorna o que foi cobrado (idempotente pela ref). */
export function estornarRodada(usuarioId: number, rodada: number): void {
  const d = getDb();
  d.transaction(() => {
    const cobrado = d.prepare("SELECT 1 FROM creditos_mov WHERE tipo = 'uso' AND ref = ? AND usuario_id = ?").get("ia:r" + rodada, usuarioId);
    if (cobrado) lancar(d, usuarioId, 1, "estorno", "ia:r" + rodada);
  })();
}

/** Reserva a conferência grátis de uma rodada: uma por rodada, do próprio usuário, entregue e com menos de 15 min. */
export function reservarConferencia(usuarioId: number, rodada: number): boolean {
  return getDb().prepare(
    "UPDATE uso_ia SET conferida = 1 WHERE id = ? AND usuario_id = ? AND ok = 1 AND conferida = 0 AND etapa IN ('proposta','melhorar') AND criado_em > datetime('now','-15 minutes')"
  ).run(rodada, usuarioId).changes === 1;
}

/** A 1ª melhoria de cada pedido é grátis: true se ainda não tinha usado. */
export function usarMelhoriaGratis(usuarioId: number, pedidoId: number): boolean {
  return getDb().prepare("UPDATE pedidos_ia SET melhorias = melhorias + 1 WHERE id = ? AND usuario_id = ? AND melhorias = 0").run(pedidoId, usuarioId).changes === 1;
}
