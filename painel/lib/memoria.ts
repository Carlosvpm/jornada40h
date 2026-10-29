import { getDb } from "@/lib/db";

// Memória do caso para o Ajuste com IA: cada pedido começa do zero no modelo, então o servidor guarda
// o que o dono já pediu (e se aplicou) e o que se sabe do negócio fora da escala, e manda junto.

const ULTIMOS = 8;

export type Memoria = {
  sobreONegocio: string;
  pedidosAnteriores: { quando: string; pedido: string; resposta: string; aplicado: boolean }[];
};

export function memoriaDe(usuarioId: number): Memoria {
  const db = getDb();
  const u = db.prepare("SELECT caso FROM usuarios WHERE id = ?").get(usuarioId) as { caso: string } | undefined;
  const linhas = db
    .prepare("SELECT criado_em, pedido, resumo, aplicado FROM pedidos_ia WHERE usuario_id = ? ORDER BY id DESC LIMIT ?")
    .all(usuarioId, ULTIMOS) as { criado_em: string; pedido: string; resumo: string; aplicado: number }[];
  return {
    sobreONegocio: u?.caso || "",
    pedidosAnteriores: linhas.reverse().map(l => ({ quando: l.criado_em.slice(0, 10), pedido: l.pedido, resposta: l.resumo, aplicado: !!l.aplicado })),
  };
}

export function registrarPedido(usuarioId: number, pedido: string, resumo: string): number {
  const r = getDb().prepare("INSERT INTO pedidos_ia (usuario_id, pedido, resumo) VALUES (?, ?, ?)").run(usuarioId, pedido.slice(0, 1000), resumo.slice(0, 600));
  return Number(r.lastInsertRowid);
}

// A conferência (2ª chamada) reescreve o resumo do mesmo pedido: o que vale é o resultado final.
export function atualizarResumo(usuarioId: number, id: number, resumo: string) {
  getDb().prepare("UPDATE pedidos_ia SET resumo = ? WHERE id = ? AND usuario_id = ?").run(resumo.slice(0, 600), id, usuarioId);
}

export function marcarAplicado(usuarioId: number, id: number): boolean {
  return getDb().prepare("UPDATE pedidos_ia SET aplicado = 1 WHERE id = ? AND usuario_id = ?").run(id, usuarioId).changes > 0;
}

// A IA reescreve o texto inteiro quando o dono conta algo novo e duradouro (ver "Memória do caso" em lib/ia.ts).
export function atualizarCaso(usuarioId: number, texto: string): boolean {
  const t = texto.trim().slice(0, 2000);
  if (!t) return false;
  return getDb().prepare("UPDATE usuarios SET caso = ? WHERE id = ? AND caso <> ?").run(t, usuarioId, t).changes > 0;
}
