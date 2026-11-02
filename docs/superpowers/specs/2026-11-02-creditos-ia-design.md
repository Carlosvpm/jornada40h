# Créditos para o Ajuste com IA — design

> **Projeto 1 de 3** (ordem combinada em 02/11): 1. créditos + recarga (este documento) → 2. nova estrutura da IA (triagem, especialistas, regras checáveis, validação no servidor com até 3 tentativas, perguntas de esclarecimento) → 3. motor com turnos (0–50 funcionários, pessoas por turno, funcionário fixo ou rodando). Os projetos 2 e 3 têm design próprio; este não depende deles e não deve antecipá-los, além do que está em "Preparar para o projeto 2".

_2026-11-02 · Carlos Moraes (decisões) + Claude (desenho)_

## Por que

Hoje o "Ajuste com IA" do painel (`/painel`) é ilimitado, só com freio de abuso (16 pedidos/10 min, 80/dia por pessoa, `painel/app/api/ia/route.ts`). O produto é venda única (R$ 47,90 ou R$ 77,90 na Kiwify). No pior caso, um cliente usando no teto custa ~R$ 25/dia de API (~R$ 700/mês), muito acima do que pagou. Queremos:

1. limitar o uso com **créditos**;
2. vender **recarga** com margem que cubra o custo com folga;
3. baratear cada pedido sem perder acerto.

A próxima etapa (fora deste escopo) é uma base de conhecimento maior para deixar a IA mais certeira; este trabalho prepara o terreno (uso medido por cliente, saída enxuta, conferência em código).

## Decisões do Carlos

- **Modelo continua Sonnet 5.5** (`claude-sonnet-5-5`), sem trocar.
- **Cobrança só pela interação do usuário**: 1 crédito = 1 pedido que o dono escreve e envia. Chamadas internas (conferência, nova tentativa automática) não são cobradas do cliente.
- **10 pedidos inclusos** na compra da escala.
- **Pacote de recarga: +10 pedidos por R$ 19,90** (um produto novo na Kiwify).
- Implementar também as **alavancas de custo** (abaixo).
- Multi-agentes: **não agora**.

## Números de referência

- Preço Sonnet 5.5 (confirmado na doc da API, 02/11): US$ 2/MTok entrada, US$ 10/MTok saída, US$ 0,20/MTok cache lido, gravação de cache 1,25× a entrada.
- Avaliação de 22/10 (`tests/ia-modelos.mjs`): ~US$ 0,02 pela 1ª chamada. Pedido completo (proposta + conferência) estimado em US$ 0,04–0,06 ≈ **R$ 0,25–0,35**.
- Recarga: R$ 1,99 por pedido → ~6× o custo antes da taxa da Kiwify. Inclusos: ~R$ 3 por cliente no pior caso.

## Como funciona para o dono

1. Botão "Ajuste com IA" passa a mostrar o saldo ("8 pedidos restantes").
2. Ao enviar um pedido, gasta 1 crédito. Só volta sozinho quando a IA **não entrega nada** (fora do ar, recusa, resposta ilegível, cortada por tamanho) — e a mensagem diz isso. Resposta entregue com problema não estorna: decisão do Carlos (02/11), rodar assim e devolver à mão pelo admin se precisar.
3. "Melhorar a proposta" (botão que já existe, refaz o mesmo pedido com os problemas medidos) **não gasta crédito, uma vez por pedido**. A partir da 2ª, gasta. (Chamada minha: cobrar por consertar erro da IA soa injusto; limitar a 1 evita uso infinito de graça.)
4. Com saldo 0, ao clicar no botão ou ao tentar enviar: modal **"Seus pedidos à IA acabaram"** — texto no espírito de: "Você usou todos os pedidos de ajuste com IA. Recarregue para continuar usando o assistente. A sua escala e os ajustes à mão continuam funcionando normalmente." Botão **"Recarregar +10 pedidos por R$ 19,90"** abre o checkout da Kiwify em nova aba.
5. Depois de pagar, o saldo aparece sozinho quando ele volta ao painel (o painel consulta o saldo ao ganhar foco / a cada abertura do diálogo). Sem necessidade de recarregar a página, idealmente.
6. Com saldo baixo (≤ 2), aviso discreto no diálogo da IA ("Restam 2 pedidos · Recarregar").

O resto do painel (escala, edição à mão, exportar) nunca depende de crédito.

## Cobrança no servidor

**Unidade:** inteiro, 1 crédito = 1 pedido. Sem tokens visíveis ao cliente.

**Banco (SQLite, `painel/lib/db.ts`):**

- `creditos_mov` — livro-razão, só INSERT:
  `id, usuario_id, criado_em, delta INTEGER (±), tipo TEXT ('inclusos'|'recarga'|'uso'|'estorno'|'reembolso'|'ajuste'), ref TEXT, obs TEXT`.
  Índice **único** em `(tipo, ref)` quando `ref` não é vazio — garante que o mesmo pedido Kiwify não credita duas vezes e que o mesmo pedido de IA não é cobrado/estornado duas vezes.
- Saldo = `SUM(delta)` do usuário (volume é minúsculo; sem tabela de saldo). Se ficar lento um dia, vira coluna.
- `uso_ia` — telemetria de custo por chamada: `id, usuario_id, criado_em, pedido_id (pedidos_ia.id), etapa ('proposta'|'conferencia'|'melhorar'), modelo, entrada, saida, cache_lido, cache_gravado, ms, ok, conferida INTEGER DEFAULT 0`. Substitui o `console.log("[ia] uso")`. Serve para revisar o preço e os 10 inclusos depois de ~30 dias de dados (os inclusos são uma vez só, não há cota mensal).
- `pedidos_ia` ganha `melhorias INTEGER DEFAULT 0`. Cada "rodada" (uma proposta ou uma melhoria) é uma linha de `uso_ia` com `etapa` 'proposta' ou 'melhorar'; a conferência aponta para essa linha (`rodada` = `uso_ia.id`) e só vale uma vez por rodada (`uso_ia.conferida`).

**Fluxo de `/api/ia`:**

- **Proposta (pedido novo, sem `conferir`, sem `anterior`):** numa transação, confere saldo ≥ 1 e grava `uso` (−1, `ref = "ia:<pedidos_ia.id>"`). Saldo 0 → **HTTP 402** `{ erro, semCredito: true, saldo: 0, recarga: <url> }`. Se a chamada à IA falhar, grava `estorno` (+1, mesma ref). Reserva antes, estorna se falha: o Skip cobra só depois e deixa sair de graça quando falta saldo — não repetir.
- **Conferência (`conferir` + `rodada`):** grátis, mas só se `rodada` é uma proposta/melhoria deste usuário, que deu certo, ainda não conferida, de < 15 min. Senão 409. Marca a rodada como conferida. A resposta da proposta/melhoria devolve `rodada` para o front mandar na conferência. (Chamada minha, para fechar o buraco de conferência infinita de graça.)
- **Conferência que falha não devolve crédito**: o dono já recebeu uma proposta utilizável, com o aviso "confira a grade antes de aplicar" que já existe. (Chamada minha.)
- **Melhorar (`anterior` + `historico` do pedido original):** não cria linha nova em `pedidos_ia` (é o mesmo pedido; o resumo final sobrescreve o dele). Primeira melhoria grátis (`melhorias` 0→1); da 2ª em diante cobra 1 crédito com `ref = "ia:<id>:m<n>"` e estorna com a mesma ref se falhar. Cada melhoria tem direito à sua conferência grátis.
- Resposta de sucesso passa a trazer `saldo`.
- Os limites de abuso atuais continuam.

**Inclusos:** ao liberar o acesso (`liberarAcesso` / `POST /api/admin/convites`), grava `inclusos` +10 com `ref = "conta:<usuario_id>"` (idempotente). **Clientes que já existem** (4 hoje) recebem os mesmos 10 na migração. (Chamada minha.)

**Créditos não expiram.** (Chamada minha.)

**Endpoint de saldo:** `GET /api/ia/saldo` → `{ saldo, recarga }` para o front.

**Admin:** `POST /api/admin/creditos` `{ email, delta, tipo: 'recarga'|'reembolso'|'ajuste', ref, obs }` com a `x-admin-key` de sempre. Idempotente por `(tipo, ref)`. Também é o jeito de dar crédito à mão no suporte.

## Recarga pela Kiwify

- Produto novo na Kiwify: "+10 pedidos ao assistente de IA", R$ 19,90. O Carlos cria no painel da Kiwify e passa o link do checkout e o nome/id do produto.
- O webhook da Kiwify já chega no Apps Script (`apps-script/Code.gs`, `registrarVendaKiwify`). Hoje **toda** venda aprovada manda o e-mail do briefing — precisa separar por produto:
  - produto = recarga e status aprovado → chama `POST /api/admin/creditos` com `email` do comprador, `delta: 10`, `tipo: 'recarga'`, `ref: order_id`. Não manda briefing. Manda e-mail curto "Recarga confirmada: +10 pedidos" (opcional, chamada do builder) e o aviso de venda ao Carlos.
  - status reembolsado/chargeback de recarga → `tipo: 'reembolso'`, `delta: -10`, `ref: order_id`. Saldo pode ficar negativo (bloqueia até recarregar). (Chamada minha.)
  - Continua gravando na aba Vendas como hoje.
  - A recarga é vendida **só como checkout próprio**, não como order bump do produto principal (um pedido Kiwify = um produto). (Chamada minha; se um dia virar order bump, o webhook precisa olhar os itens do pedido.)
  - Reembolso do produto principal não mexe nos créditos inclusos (acesso já é tratado à mão hoje). (Chamada minha.)
- Identificação do produto: pelo id do produto no payload (`Product.product_id`), configurado numa constante; nome como plano B.
- **E-mail diferente no checkout:** o crédito vai para o e-mail que comprou. Se não existe conta com esse e-mail, o painel guarda o crédito pendente pelo e-mail (`creditos_pendentes(email, delta, tipo, ref)`) e aplica quando a conta for criada; o aviso ao Carlos diz "recarga sem conta: <email>" para ele resolver à mão com o endpoint admin. Não achei na doc da Kiwify se o link aceita e-mail pré-preenchido (`?email=`); o builder testa. Se aceitar, o botão da modal manda o e-mail do usuário logado no link.
- Deploy do Apps Script é manual (o Carlos cola a nova versão e publica a implantação), como hoje.

## Segurança

O crédito vira dinheiro: tudo que mexe em saldo é tratado como pagamento.

- **Saldo só no servidor.** O front só mostra; toda cobrança, checagem e estorno acontece na rota, numa transação SQLite. Nada vindo do navegador (saldo, rodada, "grátis") é confiado sem conferir no banco que pertence ao usuário da sessão.
- **Webhook da Kiwify autenticado (obrigatório antes de ligar a recarga).** Hoje o `doPost` do Apps Script aceita qualquer POST com `order_id` + `order_status`: qualquer um que descubra a URL pode forjar uma venda "paid" — hoje isso já libera o painel; com recarga, criaria créditos. Antes de creditar, o Apps Script tem de provar que a venda é real: conferir a assinatura que a Kiwify manda no webhook (token do webhook, a confirmar na doc da Kiwify) e/ou consultar o pedido na API da Kiwify pelo `order_id`. Aplicar a mesma checagem à venda principal. Sem isso, a recarga não vai ao ar.
- **Painel ← Apps Script** continua pela `x-admin-key` (comparação em tempo constante, limite de tentativas já existem em `lib/admin.ts`). O endpoint de créditos valida `delta` (inteiro, faixa curta, ex.: −50..+50), `tipo` de uma lista fechada e `ref` obrigatório.
- **Idempotência** por `(tipo, ref)` no banco (índice único), não só no código: reenvio do webhook, duplo clique ou corrida de duas abas não duplicam crédito nem cobrança.
- **Corrida no débito:** checagem de saldo e INSERT do `uso` na mesma transação (SQLite serializa escritas); duas abas com saldo 1 → só uma passa.
- **Sem dados sensíveis no log:** `uso_ia` guarda só números; e-mail e texto do pedido não vão para `console.log`.
- **Revisão de segurança** (`/security-review`) no fim da implementação.

## Preparar para o projeto 2

Só o necessário para o projeto 2 encaixar sem refazer a cobrança: a cobrança fica em `lib/creditos.ts` com uma função "cobrar 1 pedido / estornar" independente de quantas chamadas à IA o pedido faça por dentro. O projeto 2 troca a conferência no navegador pelo loop no servidor, e as perguntas de esclarecimento (grátis, até 2 por pedido) — nada disso é construído aqui.

## Alavancas de custo

**Atualização 02/11:** as alavancas 1–3 (saída enxuta, proposta só com o que muda, conferência condicional) passam para o **projeto 2**, que redesenha a proposta e a conferência; fazê-las aqui seria retrabalho. Neste projeto entra só a 4 (`max_tokens` medido) e o registro em `uso_ia`, que dá a linha de base do projeto 2.

Medir antes e depois com `tests/ia-modelos.mjs` (custa ~US$ 0,30 só com Sonnet; rodar com OK do Carlos). Critério: **continuar 8/8** na intenção, e o custo médio por pedido cair.

1. **Conferência com saída enxuta.** Na conferência a IA hoje repete funcionamento, equipe e custos, que são ignorados. Usar um schema próprio para a conferência só com `entendeu, resumo, mudancas, avisos, celulas`. Maior ganho em tokens de saída (os mais caros).
2. **Proposta só com o que muda.** No schema da proposta, `funcionamento`, `equipe` e `custos` passam a aceitar `null` = "não muda". O front mescla com os dados atuais. Pedido que só troca uma folga deixa de devolver a escala inteira.
3. **Conferência só quando precisa.** Hoje roda sempre que a proposta mexe na grade. Passa a rodar quando: `remontar: true`, ou o painel mediu piora (mais buraco, mais pontos fora da lei) com a proposta. Troca pontual de células sem piora medida vai direto para a prévia. É a ideia do Skip: conferir em código e chamar a IA de novo só se a checagem falha. Se o eval mostrar perda de acerto, volta a ser sempre que `remontar` ou `celulas`.
4. **`max_tokens` mais justo.** Hoje 16.000. Baixar para o necessário medido em `uso_ia` (ex.: 6.000 na proposta, 3.000 na conferência), mantendo o tratamento de `max_tokens` que já existe (devolve erro e **estorna** o crédito).
5. **Cache** já está nas instruções + leis; manter o prefixo estável (nada variável no `system`).
6. **Limite de entrada** já existe (pedido 1.000 caracteres, corpo 120 KB). Manter.

## Acerto (o que trazemos do Skip, versão pequena)

O Skip (`~/adapta/curling-products/skip-backend`, `skip-artifact-api`) acerta por: validar a saída em código e refazer uma vez com a lista de problemas; tratar fatos medidos pelo sistema como verdade acima do que o modelo diz; roteamento fixo em código, não "agente chefe". Para nós, neste escopo:

- A conferência condicional (alavanca 3) é a versão nossa de "valida em código, refaz uma vez".
- A conferência já recebe a grade e as métricas reais como verdade. Manter.
- Base de conhecimento por tema, multi-agentes e evals maiores ficam para a próxima etapa.

## Front (site/app/app.js, copiado para painel/public/escala no build)

- Saldo no botão e no diálogo; aviso de saldo baixo; modal de sem crédito (nova `<dialog>`, no estilo dos diálogos atuais); botão de recarga com o link da Kiwify vindo da config (`window.J40H_PAINEL.recarga`).
- Tratar 402 em `enviarIA` abrindo a modal (sem perder o texto do pedido).
- Mandar `historico` também no "melhorar".
- Mesclar proposta com `null` = sem mudança.
- Rodar a conferência só nas condições da alavanca 3.
- O mesmo `app.js` roda no site público (sem conta, `PAINEL.ia` nulo): nada disso aparece lá.

## Futuro: revenda por contadores (não construir agora)

Ideia em estudo: contadores vendem/oferecem o sistema aos clientes (mensalidade ou pagamento único para o contador). Decisão do Carlos (02/11): **cada cliente continua com a sua carteira** de créditos; mais tarde, opção do contador **absorver** o custo dos clientes dele ou **deixar para o cliente**. Neste escopo nada disso é construído; só não fechar a porta: toda leitura e escrita de saldo passa por funções de `lib/creditos.ts` (ex.: `saldoDe(usuarioId)`, `debitar(...)`), para que um dia "quem paga" possa ser outra conta sem mexer nas rotas.

## Fora do escopo

Base de conhecimento nova, multi-agentes, troca de modelo, assinatura mensal, pacotes de tamanhos diferentes, página de histórico de consumo para o cliente.

## Antiobjetivos

- Cliente perder crédito por erro nosso (IA fora, resposta ilegível).
- Recarga paga que não credita, ou que credita duas vezes.
- Recarga disparando o e-mail de briefing.
- Escala e edição à mão travadas por falta de crédito.
- Cair o acerto da IA para economizar.

## Fica para o builder

Textos exatos da modal e dos avisos (português simples, sem jargão, no tom do painel); visual da modal; e-mail de recarga confirmada; valores finais de `max_tokens` a partir do uso medido; como o front percebe o novo saldo após a compra; testes (`node --test` no painel + e2e existentes).

## Pendências do Carlos

- Criar o produto de recarga na Kiwify e passar link + id do produto.
- Publicar a nova versão do Apps Script.
- OK para rodar `tests/ia-modelos.mjs` antes/depois (gasta API real).
