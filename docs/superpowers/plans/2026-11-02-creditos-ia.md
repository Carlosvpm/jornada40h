# Créditos para o Ajuste com IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada pedido do dono ao Ajuste com IA gasta 1 crédito (10 inclusos, recarga +10 por R$ 19,90 na Kiwify), cobrado e validado só no servidor.

**Architecture:** Livro-razão `creditos_mov` no SQLite do painel, acessado só por `painel/lib/creditos.ts`. `/api/ia` reserva 1 crédito antes de chamar a IA e estorna só se nada foi entregue; conferência e 1ª melhoria são grátis, amarradas à rodada paga. O front mostra saldo e a modal de sem crédito. O Apps Script autentica o webhook da Kiwify e credita a recarga pelo endpoint admin.

**Tech Stack:** Next.js 16 + better-sqlite3 (painel), JS puro (site/app/app.js, copiado para painel/public/escala no build), Google Apps Script, Playwright e2e (`tests/painel.e2e.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-02-creditos-ia-design.md`

**Execução:** subagent-driven (escolha do Carlos, 02/11). Não iniciada; começar só quando o Carlos pedir.

## Global Constraints

- 1 crédito = 1 pedido do dono. Inteiro. Sem tokens visíveis ao cliente.
- 10 créditos inclusos por conta (uma vez, `ref = "conta:<usuario_id>"`), inclusive para as contas que já existem. Não expiram.
- Recarga: +10 por R$ 19,90. Reembolso/chargeback de recarga: −10 (saldo pode ficar negativo).
- Estorno automático **só** quando a IA não entrega nada: `ErroIA` (recusa, `max_tokens`, JSON ilegível) ou erro da API/rede. Resposta entregue não estorna.
- Conferência: grátis, 1 por rodada, rodada do próprio usuário, `ok = 1`, criada há < 15 min; senão 409.
- "Melhorar": 1ª grátis por pedido; da 2ª em diante cobra 1.
- Sem saldo: HTTP 402 `{ erro, semCredito: true, saldo, recarga }`.
- Idempotência por índice único `(tipo, ref)` no banco.
- Nada de saldo/rodada/"grátis" confiado do navegador. Nada de e-mail ou texto do pedido em log.
- Escala e edição à mão nunca dependem de crédito. Site público (sem `PAINEL.ia`) não muda.
- Recarga não vai ao ar sem o webhook autenticado.
- Copy da modal (exata): título "Seus pedidos à IA acabaram"; texto "Você usou todos os pedidos de ajuste com IA. Recarregue para continuar usando o assistente. A sua escala e os ajustes à mão continuam funcionando normalmente."; botão "Recarregar +10 pedidos por R$ 19,90"; secundário "Agora não".
- Fora deste plano: alavancas de custo e `max_tokens` (projeto 2, com a linha de base do `uso_ia`), contadores, estrutura de agentes.

## Review Focus

- Duas abas enviando com saldo 1 ao mesmo tempo → só uma passa (débito e checagem na mesma transação).
- Conferência repetida para a mesma rodada, de outra conta ou depois de 15 min → 409, sem chamar a IA.
- Webhook forjado (sem assinatura válida) com venda "paid" → não credita nem libera painel.
- Mesmo `order_id` de recarga reenviado → credita uma vez só.
- Recarga para e-mail sem conta → fica pendente e entra quando a conta é criada.

---

## Fase 1 — Créditos no servidor

### Task 1: Livro-razão, inclusos e endpoint admin

**Files:**
- Create: `painel/lib/creditos.ts`
- Create: `painel/app/api/admin/creditos/route.ts`
- Modify: `painel/lib/db.ts` (SCHEMA, `migrar`, `liberarAcesso`)
- Test: `tests/painel.e2e.mjs` (nova seção "4. créditos")

**Interfaces:**
- Produces (`lib/creditos.ts`, imports relativos `./db`):
  - `INCLUSOS = 10`
  - `saldoDe(usuarioId: number): number` — `COALESCE(SUM(delta),0)`
  - `lancar(d: Database, usuarioId: number, delta: number, tipo: TipoMov, ref: string, obs?: string): boolean` — `INSERT OR IGNORE`; `true` se gravou, `false` se `(tipo, ref)` já existia
  - `type TipoMov = "inclusos" | "recarga" | "uso" | "estorno" | "reembolso" | "ajuste"`
  - `creditarPorEmail(email: string, delta: number, tipo: "recarga" | "reembolso" | "ajuste", ref: string, obs?: string): { saldo: number | null; pendente: boolean; duplicado: boolean }`
  - `aplicarPendentes(d: Database, usuarioId: number, email: string): void`
- Schema:
  - `creditos_mov(id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em TEXT NOT NULL DEFAULT (datetime('now')), delta INTEGER NOT NULL, tipo TEXT NOT NULL, ref TEXT NOT NULL, obs TEXT NOT NULL DEFAULT '', UNIQUE(tipo, ref))` + índice `(usuario_id)`
  - `creditos_pendentes(email TEXT NOT NULL, delta INTEGER NOT NULL, tipo TEXT NOT NULL, ref TEXT NOT NULL, obs TEXT NOT NULL DEFAULT '', UNIQUE(tipo, ref))`
- Endpoint: `POST /api/admin/creditos` com `x-admin-key` (`autorizado`/`negar` de `lib/admin.ts`), corpo `{ email, delta, tipo, ref, obs? }` → 200 `{ saldo, pendente, duplicado }`; 400 se `delta` não é inteiro em −50..50 (≠ 0), `tipo` fora de `recarga|reembolso|ajuste`, `ref` vazio ou > 100 caracteres.

- [ ] **Step 1: Escrever os testes e2e** (seção nova, depois da 3c2, abrindo o banco com o `db` que o teste já usa):
  - conta liberada tem 1 linha `inclusos` +10 e `saldoDe` = 10 (consulta direta: `SELECT SUM(delta) ...`).
  - liberar a mesma conta de novo não duplica os inclusos.
  - admin sem chave → 401; `delta: 3.5` → 400; `tipo: "uso"` → 400; sem `ref` → 400.
  - recarga `{ email: cliente, delta: 10, tipo: "recarga", ref: "kiwi-1" }` → `saldo` sobe 10, `duplicado: false`; repetir → `duplicado: true`, saldo igual.
  - recarga para `novo@exemplo.com` (sem conta) → `pendente: true`; depois `liberar("novo@exemplo.com")` → saldo da conta nova = 20 (10 inclusos + 10 pendentes) e a pendência some.
- [ ] **Step 2: Rodar e ver falhar** — `(cd painel && npm run build) && node tests/painel.e2e.mjs` → FALHA nas linhas novas.
- [ ] **Step 3: Implementar** schema, `lib/creditos.ts` e a rota. Em `liberarAcesso`, depois de obter o `id`: `lancar(d, id, INCLUSOS, "inclusos", "conta:" + id)` e `aplicarPendentes(d, id, email)`. Em `migrar`: dar `inclusos` a toda conta que ainda não tem (`INSERT OR IGNORE ... SELECT id ... FROM usuarios`). `creditarPorEmail` roda numa transação.
- [ ] **Step 4: Rodar e ver passar** — mesmo comando → `0 falhas` (testes antigos incluídos).
- [ ] **Step 5: Commit** — `git add painel/lib/creditos.ts painel/lib/db.ts painel/app/api/admin/creditos tests/painel.e2e.mjs && git commit -m "Painel: livro-razão de créditos da IA, 10 inclusos e endpoint admin"`

### Task 2: Cobrança em `/api/ia`, rodadas e saldo

**Files:**
- Modify: `painel/app/api/ia/route.ts`
- Modify: `painel/lib/creditos.ts`, `painel/lib/db.ts` (tabela `uso_ia`, coluna `pedidos_ia.melhorias`)
- Modify: `painel/lib/ia.ts` (mock: pedido contendo `[falha]` lança `ErroIA`)
- Create: `painel/app/api/ia/saldo/route.ts`
- Test: `tests/painel.e2e.mjs`

**Interfaces:**
- Consumes: `saldoDe`, `lancar` (Task 1); `pedirAjuste`, `Uso` (`lib/ia.ts`); `registrarPedido`, `atualizarResumo` (`lib/memoria.ts`).
- Produces (`lib/creditos.ts`):
  - `abrirRodada(usuarioId: number, etapa: "proposta" | "melhorar" | "conferencia", cobrar: boolean): { rodada: number } | { semCredito: true; saldo: number }` — numa transação: se `cobrar` e saldo < 1 → semCredito; senão insere `uso_ia` (`ok = 0`) e, se `cobrar`, `lancar(..., -1, "uso", "ia:r" + rodada)`.
  - `fecharRodada(rodada: number, uso: Uso | null, ms: number, pedidoId?: number): void` — grava tokens, `ok = 1`.
  - `estornarRodada(usuarioId: number, rodada: number): void` — `lancar(..., +1, "estorno", "ia:r" + rodada)` só se houve `uso` dessa rodada.
  - `reservarConferencia(usuarioId: number, rodada: number): boolean` — `UPDATE uso_ia SET conferida = 1 WHERE id = ? AND usuario_id = ? AND ok = 1 AND conferida = 0 AND etapa IN ('proposta','melhorar') AND criado_em > datetime('now','-15 minutes')`; `true` se `changes = 1`.
  - `usarMelhoriaGratis(usuarioId: number, pedidoId: number): boolean` — `UPDATE pedidos_ia SET melhorias = melhorias + 1 WHERE id = ? AND usuario_id = ? AND melhorias = 0`.
  - `RECARGA_URL = process.env.RECARGA_URL || ""`
- Schema `uso_ia(id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, criado_em TEXT NOT NULL DEFAULT (datetime('now')), pedido_id INTEGER, etapa TEXT NOT NULL, modelo TEXT NOT NULL DEFAULT '', entrada INTEGER NOT NULL DEFAULT 0, saida INTEGER NOT NULL DEFAULT 0, cache_lido INTEGER NOT NULL DEFAULT 0, cache_gravado INTEGER NOT NULL DEFAULT 0, ms INTEGER NOT NULL DEFAULT 0, ok INTEGER NOT NULL DEFAULT 0, conferida INTEGER NOT NULL DEFAULT 0)` (AUTOINCREMENT: id nunca reaproveitado, a `ref` do livro-razão depende disso).
- Contrato da rota (corpo atual + `rodada?: number`):
  - sem `conferir` e sem `anterior` → proposta, cobra.
  - `anterior` + `historico` → melhorar; grátis se `usarMelhoriaGratis`, senão cobra; não cria `pedidos_ia` novo, atualiza o resumo do `historico`. `anterior` sem `historico` válido → cobra como proposta.
  - `conferir` + `rodada` → só se `reservarConferencia`, senão 409 `{ erro: "Conferência inválida." }`; nunca cobra.
  - Resposta de sucesso: o JSON atual + `rodada`, `saldo`.
  - `GET /api/ia/saldo` (sessão) → `{ saldo, recarga: RECARGA_URL }`; 401 sem sessão.
  - `console.log("[ia] uso", ...)` sai; telemetria vai para `uso_ia`.

- [ ] **Step 1: Escrever os testes e2e** (pela API com o cookie da sessão do cliente, `IA_MOCK=1`):
  - proposta → 200 com `rodada` e `saldo` = saldo anterior − 1; `uso_ia` tem a linha com `ok = 1`.
  - conferência com essa `rodada` → 200 e saldo igual; a mesma de novo → 409; `rodada` de outra conta → 409; `rodada` com `criado_em` recuado 16 min no banco → 409.
  - melhorar com `historico` → 1ª não muda o saldo; 2ª tira 1.
  - pedido com `[falha]` → 422 e saldo igual ao de antes (uso + estorno no livro-razão).
  - zerar o saldo (lançamento `ajuste` negativo pelo admin) → proposta 402 com `semCredito: true`, e nenhuma linha nova em `uso_ia`.
  - duas propostas em paralelo (`Promise.all`) com saldo 1 → uma 200 e uma 402.
  - `GET /painel/api/ia/saldo` sem sessão → 401; com sessão → saldo certo.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** as funções e a rota. Ordem na proposta: `abrirRodada` → `pedirAjuste` → sucesso: `registrarPedido`, `fecharRodada(rodada, uso, ms, pedidoId)`; `ErroIA`/`APIError`/outro erro: `estornarRodada` e a resposta de erro atual.
- [ ] **Step 4: Rodar.** A 3b (e2e pelo navegador) vai falhar na conferência até o front mandar `rodada`; isso é esperado e fecha na Task 3. Os testes novos passam.
- [ ] **Step 5: Commit** — `git commit -m "Painel: cobrança de 1 crédito por pedido à IA, rodadas e saldo"`

## Fase 2 — Front

### Task 3: Saldo, modal sem crédito e rodada na conferência

**Files:**
- Modify: `site/app/app.js` (`enviarIA`, `ligarIA`, `abrirIA`, `mostrarIA`)
- Modify: `site/app/index.html` (linha de saldo no `#dlgIA`, novo `<dialog id="dlgSemCredito">`)
- Modify: `site/app/app.css` (só o necessário, reaproveitando classes de diálogo existentes)
- Modify: `painel/app/route.ts` (config ganha `recarga: RECARGA_URL`)
- Test: `tests/painel.e2e.mjs`

**Interfaces:**
- Consumes: resposta de `/api/ia` com `rodada`, `saldo`; 402 `semCredito`; `GET {PAINEL.ia}/saldo`; `window.J40H_PAINEL.recarga`.
- Elementos: `#iaSaldo` (texto "N pedidos restantes"; com N ≤ 2 acrescenta link "Recarregar" se houver `recarga`), `#dlgSemCredito` com `[data-sc="recarregar"]` (link `target="_blank"` para `recarga`; escondido se vazio) e `[data-sc="fechar"]`.

- [ ] **Step 1: Escrever os testes e2e** (navegador):
  - abrir o diálogo da IA mostra `#iaSaldo` com o saldo do banco.
  - depois de um pedido, `#iaSaldo` cai 1 (conferência não desconta).
  - a 3b volta a passar (conferência com `rodada`).
  - saldo zerado pelo admin → enviar abre `#dlgSemCredito[open]` com o título exato, e `#iaPedido` mantém o texto.
  - com `RECARGA_URL` setado no servidor de teste, o botão aponta para ele.
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar.** `enviarIA`: 402 → abre `#dlgSemCredito`, volta ao passo 1; guarda `x.j.rodada` e manda `rodada` na conferência; no "melhorar" manda `historico: ia.historico`; atualiza `#iaSaldo` com `saldo` de cada resposta. `abrirIA` e o evento `focus` da janela (com `#dlgIA` aberto) chamam `/saldo`. Rodar `npm run sync-escala` acontece no build.
- [ ] **Step 4: Rodar e ver passar** — `(cd painel && npm run build) && node tests/painel.e2e.mjs` → `0 falhas`; `node tests/app.e2e.mjs` (site público) → sem regressão.
- [ ] **Step 5: Commit** — `git commit -m "Painel: saldo de pedidos à IA e modal de recarga"`

## Fase 3 — Recarga pela Kiwify

### Task 4: Webhook autenticado e recarga no Apps Script

**Files:**
- Modify: `apps-script/Code.gs` (`doPost`, `registrarVendaKiwify`, novas `assinaturaKiwifyOk_`, `creditarPainel_`)

**Interfaces:**
- Consumes: `POST {PAINEL_URL}/api/admin/creditos` (Task 1).
- Produces: constante `PRODUTO_RECARGA_ID = ""` (Carlos preenche); Script Properties `KIWIFY_TOKEN` (token do webhook na Kiwify) e `PAINEL_ADMIN_KEY` (já existe).

- [ ] **Step 1: Confirmar na doc da Kiwify como o webhook se autentica** (assinatura na query `signature` = HMAC-SHA1 do corpo com o token do webhook é a hipótese; se for outro mecanismo, usar o documentado). Registrar o achado num comentário acima de `assinaturaKiwifyOk_`.
- [ ] **Step 2: Implementar `assinaturaKiwifyOk_(e): boolean`** (`Utilities.computeHmacSignature` sobre `e.postData.contents`, comparação do hex). Em `doPost`, o ramo Kiwify (`order_id && order_status`) só segue se `assinaturaKiwifyOk_(e)`; sem token configurado ou assinatura errada → `resposta({ ok: false })` e `Logger.log` sem dados do cliente. Vale para a venda principal também.
- [ ] **Step 3: Implementar a recarga.** Em `registrarVendaKiwify`, se `String(prod.product_id) === PRODUTO_RECARGA_ID`: `paid`/`approved` → `creditarPainel_(email, 10, "recarga", order_id)`; `refunded`/`chargedback` → `creditarPainel_(email, -10, "reembolso", order_id)`; **não** chama `enviarLinkBriefing`; manda o aviso ao Carlos ("Recarga: <email> · +10 · saldo N", ou "recarga sem conta, ficou pendente"). Continua gravando na aba Vendas. `creditarPainel_` segue o padrão de `criarConvitePainel_`.
- [ ] **Step 4: Verificar à mão** (sem harness de teste para Apps Script): POST sem assinatura → `ok:false` e nada na aba Vendas; "Testar webhook" da Kiwify com o produto de recarga → +10 no painel (`GET /api/admin/escala?email=` ou consulta ao saldo) e sem e-mail de briefing; reenviar o mesmo → saldo igual; venda principal de teste → briefing continua saindo.
- [ ] **Step 5: Commit** — `git commit -m "Apps Script: webhook Kiwify autenticado e recarga de créditos da IA"`

## Fase 4 — Ir ao ar

### Task 5: Revisão de segurança e deploy

- [ ] **Step 1:** `/security-review` na branch; corrigir o que for real.
- [ ] **Step 2:** Carlos cria o produto de recarga na Kiwify (R$ 19,90) e passa link + `product_id`; preencher `PRODUTO_RECARGA_ID`; env `RECARGA_URL` no app `jornada40h-painel` do Dokploy.
- [ ] **Step 3:** Deploy dos dois apps no Dokploy (site e painel, ver memória de hosting) e conferir em produção: os 4 clientes com saldo 10; pedido real desconta 1.
- [ ] **Step 4:** Carlos configura `KIWIFY_TOKEN`, cola o novo `Code.gs` e publica a implantação; testar com o "Testar webhook" da Kiwify.
- [ ] **Step 5:** Registrar em `docs/ESTADO.md` (data, o que foi ao ar, pendências) e commit.
