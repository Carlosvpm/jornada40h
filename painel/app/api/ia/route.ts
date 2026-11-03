import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { usuarioAtual, ipDe } from "@/lib/auth";
import { limitar } from "@/lib/limite";
import { ErroIA, iaAtiva, pedirAjuste } from "@/lib/ia";
import { getDb } from "@/lib/db";
import { abrirRodada, estornarRodada, fecharRodada, marcarPergunta, PERGUNTAS_DIA, perguntasHoje, RECARGA_URL, reservarConferencia, saldoDe, usarMelhoriaGratis, type Etapa } from "@/lib/creditos";
import { atualizarCaso, atualizarResumo, memoriaDe, registrarPedido } from "@/lib/memoria";

export const maxDuration = 120;

const LIMITE = 120_000; // bytes do corpo (pedido + dados da escala)

// Ajuste com IA. Corpo: { pedido, contexto, anterior?, conferir?, historico?, rodada? }. Devolve a proposta (+ rodada e saldo); quem aplica é o navegador.
// Cada pedido do dono custa 1 crédito (lib/creditos.ts); a conferência é grátis, uma por rodada.
// Pergunta (a IA responde tipo "resposta", sem propor mudança): grátis até PERGUNTAS_DIA por dia, mesmo sem saldo.
// Cada pedido do dono faz até 2 chamadas: a proposta e a conferência sobre a escala montada.
// A 1ª leva a memória do caso, grava o pedido (devolve historico, o id) e o que a IA anotou sobre o negócio;
// a conferência atualiza o resumo desse id. Conferência e melhoria usam o texto gravado desse pedido (o "pedido" do corpo
// só vale na proposta nova).
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
  let corpo: { pedido?: unknown; contexto?: unknown; anterior?: unknown; conferir?: unknown; historico?: unknown; rodada?: unknown };
  try { corpo = JSON.parse(texto); } catch { return NextResponse.json({ erro: "JSON inválido." }, { status: 400 }); }
  const pedidoCorpo = typeof corpo.pedido === "string" ? corpo.pedido.trim().slice(0, 1000) : "";
  if (!corpo.contexto || typeof corpo.contexto !== "object") return NextResponse.json({ erro: "Escala inválida." }, { status: 400 });

  const conferir = !!corpo.conferir;
  const rodadaPedida = Number.isInteger(corpo.rodada) ? (corpo.rodada as number) : 0;
  const historicoPedido = Number.isInteger(corpo.historico) ? (corpo.historico as number) : 0;

  // Conferência: grátis, 1 por rodada entregue ao próprio usuário nos últimos 15 min. Não chama a IA se não valer.
  // Proposta/melhoria: abre a rodada (checa o saldo e cobra 1 crédito na mesma transação). Melhoria: a 1ª de cada pedido é grátis.
  // As chamadas grátis (conferência, 1ª melhoria) e a melhoria paga usam o texto do pedido gravado no banco,
  // nunca o "pedido" do corpo: um crédito compra um pedido, não várias chamadas com textos à escolha do navegador.
  let pedido = pedidoCorpo;
  let pedidoId = 0; // o pedido gravado (pedidos_ia) a que esta chamada pertence, quando já existe
  let rodada: number; // a rodada que o navegador recebe de volta (na conferência, a da proposta conferida)
  let rodadaUso: number; // a linha de uso_ia desta chamada (telemetria)
  let etapa: Etapa = "proposta";
  let melhoriaGratis = false;
  let soPergunta = false;
  let conferirCorpo: unknown = corpo.conferir;
  if (conferir) {
    const gravado = rodadaPedida
      ? (getDb().prepare("SELECT p.id, p.pedido, p.resumo FROM uso_ia r JOIN pedidos_ia p ON p.id = r.pedido_id AND p.usuario_id = r.usuario_id WHERE r.id = ? AND r.usuario_id = ?").get(rodadaPedida, u.id) as { id: number; pedido: string; resumo: string } | undefined)
      : undefined;
    if (!gravado || !reservarConferencia(u.id, rodadaPedida)) return NextResponse.json({ erro: "Conferência inválida." }, { status: 409 });
    pedido = gravado.pedido;
    pedidoId = gravado.id;
    conferirCorpo = conferirDoServidor(corpo.conferir, gravado.resumo);
    rodada = rodadaPedida;
    etapa = "conferencia";
    rodadaUso = (abrirRodada(u.id, "conferencia", false) as { rodada: number }).rodada;
  } else {
    // "anterior" sem um pedido válido do próprio usuário cobra como proposta nova.
    const pedidoAnterior = corpo.anterior && historicoPedido
      ? (getDb().prepare("SELECT id, pedido FROM pedidos_ia WHERE id = ? AND usuario_id = ?").get(historicoPedido, u.id) as { id: number; pedido: string } | undefined)
      : undefined;
    const melhorar = !!pedidoAnterior;
    if (pedidoAnterior) { pedido = pedidoAnterior.pedido; pedidoId = pedidoAnterior.id; }
    if (!pedido) return NextResponse.json({ erro: "Escreva o que você quer mudar." }, { status: 400 });
    etapa = melhorar ? "melhorar" : "proposta";
    melhoriaGratis = melhorar && usarMelhoriaGratis(u.id, pedidoId);
    let aberta = abrirRodada(u.id, etapa, !melhoriaGratis);
    // Sem saldo, um pedido novo ainda pode ser pergunta (grátis): vai sem cobrar enquanto houver cota no dia.
    // Se a IA devolver uma proposta, a resposta é descartada e o dono recebe o 402 (ver soPergunta abaixo).
    if ("semCredito" in aberta && etapa === "proposta" && perguntasHoje(u.id) < PERGUNTAS_DIA) {
      soPergunta = true;
      aberta = abrirRodada(u.id, etapa, false);
    }
    if ("semCredito" in aberta) {
      return NextResponse.json({ erro: "Seus pedidos à IA acabaram.", semCredito: true, saldo: aberta.saldo, recarga: RECARGA_URL, perguntas: cotaPerguntas(u.id) }, { status: 402 });
    }
    rodada = rodadaUso = aberta.rodada;
  }

  const t0 = Date.now();
  try {
    const memoria = conferir ? undefined : memoriaDe(u.id);
    const { resultado, uso } = await pedirAjuste({ pedido, contexto: corpo.contexto, anterior: corpo.anterior, conferir: conferirCorpo, memoria });
    const resumo = String((resultado as { resumo?: unknown })?.resumo || "");
    // Pergunta: só vale numa proposta nova (na conferência e na melhoria o tipo é sempre proposta).
    const ehPergunta = etapa === "proposta" && (resultado as { tipo?: unknown })?.tipo === "resposta";
    if (soPergunta && !ehPergunta) {
      // A chamada já custou: conta na cota de perguntas do dia, senão quem está sem saldo chamaria a IA sem limite.
      marcarPergunta(u.id, rodadaUso);
      fecharRodada(rodadaUso, uso, Date.now() - t0);
      return NextResponse.json({ erro: "Seus pedidos à IA acabaram.", semCredito: true, saldo: saldoDe(u.id), recarga: RECARGA_URL, perguntas: cotaPerguntas(u.id) }, { status: 402 });
    }
    let pergunta: { gratis: boolean } | undefined;
    if (ehPergunta) pergunta = marcarPergunta(u.id, rodadaUso);
    let historico: number | undefined, anotou = false;
    if (conferir) {
      atualizarResumo(u.id, pedidoId, resumo); // o pedido da rodada conferida, não o "historico" do corpo
    } else if (etapa === "melhorar") {
      historico = pedidoId;
      atualizarResumo(u.id, historico, resumo);
      anotou = atualizarCaso(u.id, String((resultado as { sobreONegocio?: unknown })?.sobreONegocio || ""));
    } else {
      historico = registrarPedido(u.id, pedido, resumo);
      anotou = atualizarCaso(u.id, String((resultado as { sobreONegocio?: unknown })?.sobreONegocio || ""));
    }
    fecharRodada(rodadaUso, uso, Date.now() - t0, historico);
    return NextResponse.json({ resultado, historico, anotou, rodada, saldo: saldoDe(u.id), perguntas: cotaPerguntas(u.id), ...(pergunta ? { pergunta } : {}) });
  } catch (e) {
    // A IA não entregou nada: devolve o crédito cobrado e não gasta a conferência nem a melhoria grátis.
    if (conferir) getDb().prepare("UPDATE uso_ia SET conferida = 0 WHERE id = ? AND usuario_id = ?").run(rodada, u.id);
    else if (melhoriaGratis) getDb().prepare("UPDATE pedidos_ia SET melhorias = MAX(melhorias - 1, 0) WHERE id = ? AND usuario_id = ?").run(pedidoId, u.id);
    else estornarRodada(u.id, rodada);
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

// O que a conferência leva do navegador: a escala montada (grade, equipe e métricas das semanas A e B), que é a
// do próprio dono. O resumo da proposta conferida vem do banco; mudanças e avisos (eco da resposta da IA) só
// como listas curtas de frases.
function conferirDoServidor(conferir: unknown, resumoGravado: string): unknown {
  if (!conferir || typeof conferir !== "object") return conferir;
  const c = conferir as { suaPropostaAnterior?: { mudancas?: unknown; avisos?: unknown } };
  const frases = (v: unknown) => (Array.isArray(v) ? v.filter(x => typeof x === "string").slice(0, 20).map(x => (x as string).slice(0, 300)) : []);
  const ant = c.suaPropostaAnterior && typeof c.suaPropostaAnterior === "object" ? c.suaPropostaAnterior : {};
  return { ...c, suaPropostaAnterior: { resumo: resumoGravado, mudancas: frases(ant.mudancas), avisos: frases(ant.avisos) } };
}

// Perguntas grátis do dia: quantas já foram e o limite (o navegador mostra quantas restam).
function cotaPerguntas(usuarioId: number) {
  return { usadas: perguntasHoje(usuarioId), limite: PERGUNTAS_DIA };
}
