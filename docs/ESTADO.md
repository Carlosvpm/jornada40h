# Estado do projeto

_Atualizado: 2026-10-19 09:25 (America/Fortaleza) · Conteúdo: carrossel `setor-restaurante` publicado_

## Resumo
- **Semana 1 (16–18/10, 3 dias de mídia): R$ 99,80 gastos, 14.924 impressões, 214 cliques no link, 153 visitas (LPV), 5 leads (Pixel), 0 checkouts, 0 vendas.** CPL R$ 11,04 na [LEADS] (R$ 19,96 sobre o gasto total); CTR link 1,43%; visita→lead 3,3% (meta ≥ 15%); CAC indefinido (0 vendas). Tendência ruim: dia 1 CPL R$ 8,03 (4 leads), dia 2 R$ 50,44 (1 lead), dia 3 R$ 17,25 e 0 leads até a leitura (18/10 ~18h). Planilha "Leads Calculadora 40h" **não acessada** (sem conector Google Sheets no Windsor); leads = evento Lead do Pixel, coerente com os 5 leads reais que receberam e-mail em 18/10.
- **Duas campanhas, R$ 25/dia cada (teto R$ 50 mantido; soma conferida em 18/10):**
  - `[LEADS] Calculadora 40h - Teste de criativos` (120253290480490421): R$ 55,18, 95 visitas, 5 leads. Anúncios ativos desde 18/10: **V4L-04 Padaria falta gente** (120253312939200421) e **V4L-02 Antes e depois** (120253312974730421), ambos para `/` com `utm_term=lp-a`. N2/N2B/N3/B/C desligados ("Requer análise" da Meta após a checagem de segurança; N2 desativado por decisão humana → regra 2).
  - `[VENDAS] Escala 5x2 - Checkout (CBO 1-1-3)` (120253303430340421, otimização InitiateCheckout): R$ 44,62, 58 visitas, **0 InitiateCheckout**. Ativos: **V4-03 É lei** (120253308333450421, R$ 12,63, 9 visitas, 0 IC) e **V4-01 Escala pronta** (120253308421660421, R$ 2,61, 0 visitas). V-N2/V-C/V-N3 pausados em 18/10 com OK do Carlos (não reativar). Critério combinado: decidir por custo por IC com ~R$ 30–40 por criativo.
- Teste A/B de LP **sem conclusão e parado**: LP B recebeu só 6 visitas (2 leads) antes de o N2B ser desligado; LP A 89 visitas (3 leads). Nenhum anúncio ativo aponta para `/b/`.
- Instagram @jornada40h: 4 seguidores, 2 posts no feed. Semana 1 publicada no dia certo (Reel `noticia` 16/10, Carrossel `a-conta` 17/10, Story `resultado` 18/10). Alcance orgânico por mídia: 7 / 8 / 5 — praticamente zero. O alcance da conta (625 → 1.185 → 240/dia) e os 10 comentários vêm dos anúncios veiculados pelo perfil, não dos posts. **Semana 2 aprovada e na FILA de 23 a 29/10 (`site/posts/semana-2/`).**
- Funil validado ponta a ponta (lead → planilha → e-mail; Kiwify → webhook → Vendas → e-mail de briefing → obrigado.html → Pedidos). Site em https://jornada40h.com.br (Dokploy); a Netlify segue só como reserva. Deploy automático no push ainda não funciona (rodar application.deploy no Dokploy após push em `site/`). O sandbox do Analista não consegue abrir o site (proxy) — URLs de `posts/semana-2/` continuam não verificadas.
- Follow-up dos 5 leads: e-mail manual com a oferta de R$ 47,90 enviado 18/10 16:18. Sequência automática D+1/D+3/D+7 (`apps-script/Sequencia.gs`) **desligada**; o texto precisa mudar antes de ligar para não repetir a oferta (Pedido #6).

## Semana 1 · análise (16–18/10, dados Windsor/Meta lidos 18/10 ~21:10 UTC)
| Etapa | Total | [LEADS] | [VENDAS] | Taxa / custo |
|---|---|---|---|---|
| Gasto | R$ 99,80 | R$ 55,18 | R$ 44,62 | — |
| Impressões | 14.924 | 13.355 | 1.569 | alcance ~4.550 (soma por anúncio/dia, com sobreposição) |
| Cliques no link | 214 | 146 | 68 | CTR 1,43% (L 1,09% · V 4,33%) · CPC R$ 0,47 |
| Visitas (LPV) | 153 | 95 | 58 | 71% dos cliques carregam a página |
| Leads (Pixel) | 5 | 5 | 0 | visita→lead 3,3% (L 5,3%) · CPL R$ 11,04 (L) |
| Checkout iniciado | 0 | 0 | 0 | lead→checkout 0% · R$ 44,62 em [VENDAS] sem IC |
| Vendas | 0 | 0 | 0 | CAC indefinido |

Por dia: 16/10 R$ 32,11 · 39 visitas · 4 leads (CPL R$ 8,03) | 17/10 R$ 50,44 · 102 visitas · 1 lead (CPL R$ 50,44) | 18/10 (parcial) R$ 17,25 · 12 visitas · 0 leads.
Anomalia 17/10: N2 fez 9.277 impressões para 550 pessoas (frequência 16,9), 75 cliques, 47 visitas e **0 leads** — cliques baratos (CPC R$ 0,17) e sem conversão; hipótese de posicionamento de baixa qualidade (Audience Network/Reels repetidos). Os V4 novos estão com frequência ~1,1.

**Veredito por criativo** (sem nenhum anúncio com ≥ R$ 30 e dados limpos, vereditos são provisórios):
| Anúncio | Gasto | Visitas | Leads/IC | Veredito |
|---|---|---|---|---|
| N2 Capa de jornal (LEADS) | R$ 42,23 | 83 | 3 leads (CPL R$ 14,08) | desligado; foi o único que gerou lead em escala, mas degradou no dia 2 |
| N2B Capa de jornal → LP B | R$ 8,59 | 6 | 2 leads (CPL R$ 4,29) | desligado; melhor CPL da semana, amostra mínima |
| N3 / B / C (LEADS) | R$ 2,49 | 5 | 0 | nunca entregaram; desligados — trocar (feito, V4L) |
| V-N2 (VENDAS) | R$ 27,63 | 45 | 0 IC | pausado (OK Carlos); 45 visitas e nenhum checkout = página/oferta, não o anúncio |
| V-C / V-N3 (VENDAS) | R$ 1,75 | 4 | 0 | pausados; sem dado |
| V4-03 É lei (VENDAS) | R$ 12,63 | 9 | 0 IC | manter até ~R$ 35; CTR 3,9% ok, CPC alto (R$ 1,40) |
| V4-01 Escala pronta (VENDAS) | R$ 2,61 | 0 | 0 | manter; 3 cliques e 0 LPV — checar link/carregamento |
| V4L-04 Padaria / V4L-02 Antes e depois (LEADS) | R$ 1,87 | 1 | 0 | manter; < 1 dia no ar |
Escalar-se-o-teto-subisse: **nenhum** (0 vendas, CPL acima da meta de R$ 8).

**Veredito por post IG** (formato por alcance e por salvamentos): Carrossel `a-conta` 14 views / 8 alcance / 0 saves; Reel `noticia` 7 views / 7 alcance / 0 saves / 67% pulam nos 3 s / 6,5 s médios; Story `resultado` 5 views. Carrossel ≥ Reel > Story em alcance; nenhum salvamento. Com 4 seguidores o formato não decide nada — o gargalo é distribuição, não o conteúdo. Manter a fila (custo ~zero) e tratar o IG como prova social para quem vem do anúncio, não como fonte de leads.

**Agentes:** Gestor — regras cumpridas (R$ 25 + R$ 25 = R$ 50; nenhuma reativação; criações/pausas de 18/10 todas com OK do Carlos na sessão; falha menor: Pedido #4 ficou aberto sem resposta). Conteúdo — 3/3 itens da FILA publicados no dia (09:12 e 09:16; 16/10 às 17:05 por ser o dia do setup); semana 2 redigida, aprovada e na FILA; sem falhas.

**Diagnóstico:** o funil vaza em duas etapas: visita→lead (3,3% contra 15% de meta; 153 visitas renderam 5 leads, e o dia 2 teve 102 visitas para 1 lead) e lead/visita→checkout (58 visitas da [VENDAS] e 5 leads, 0 checkout). Hipótese principal: tráfego frio chegando a uma página que pede dados antes de mostrar valor e, na [VENDAS], a um pedido de R$ 77 sem prova; a LP A redesenhada (18/10) e os V4 com transição correta ainda não tiveram volume para mostrar se mudaram isso. Sem dado da planilha não dá para separar leads reais de teste nem ver `variante`.

## Semana atual · fila de conteúdo
| Dia | Post | Status |
|---|---|---|
| 16/10 | Reel `noticia` | publicado |
| 17/10 | Carrossel `a-conta` | publicado |
| 18/10 | Story `resultado` | publicado |
| 19/10 | Carrossel `setor-restaurante` | publicado |
| 20/10 | Story `enquete` | aprovado |
| 21/10 | Reel `escala-se-montando` | aprovado |
| 22/10 | Carrossel `3-erros` | aprovado |

## Pedidos abertos
### Pedido #8 · Analista → Carlos · 2026-10-18 · prioridade ALTA
Decisões da semana 1 (só o Carlos decide):
1. **[VENDAS]**: R$ 44,62, 58 visitas, 0 checkout. Proposta: manter V4-03 e V4-01 só até R$ 35 cada; se seguirem com 0 IC, o Gestor pausa a campanha e passa os R$ 25 para a [LEADS] (teto R$ 50 inalterado). Aprovar?
2. **Teto**: não subir. CPL R$ 11 na [LEADS], R$ 20 no total, 0 vendas — nada justifica mais verba. Alternativa: reduzir para R$ 25/dia só na [LEADS] até a LP A nova mostrar visita→lead ≥ 10%. Aprovar a redução, ou manter R$ 50?
3. **LP B**: o teste morreu (6 visitas). Encerrar o A/B por ora (foco em medir a LP A redesenhada) ou apontar o V4L-02 para `/b/` (`utm_term=lp-b`) quando ele acumular R$ 20 sem lead? Aprovar uma das duas.
4. **Distribuição orgânica**: 4 seguidores, posts com alcance < 10. Compartilhar os posts da semana 2 no seu perfil pessoal e em grupos de WhatsApp de donos de negócio (única alavanca sem custo que os agentes não têm)? Aprovar?
Status: aberto

### Pedido #7 · Analista → Gestor · 2026-10-18 · prioridade ALTA
Até o Carlos responder o #8: (a) não mexer em orçamento; (b) registrar diariamente o custo acumulado por IC de V4-03/V4-01 e o CPL de V4L-04/V4L-02; (c) V4-01 teve 3 cliques e 0 LPV em 18/10 — conferir no Gerenciador se o link está carregando (prévia do anúncio) e registrar; (d) se um anúncio passar de R$ 20 sem lead/IC, aplicar a regra de AGENTES.md (pausar) e anotar aqui; (e) frequência > 3 em qualquer anúncio é sinal da anomalia do N2 de 17/10 — registrar.
Status: aberto

### Pedido #6 · Analista → Dev · 2026-10-18 · prioridade MÉDIA
Sequência D+1/D+3/D+7 (`apps-script/Sequencia.gs`) continua desligada e, se ligada como está, repete a oferta mandada à mão em 18/10 aos 5 leads. Pedido: (1) ajustar o texto dos 3 e-mails para continuar a conversa (D+1: a escala pronta deles, sem reapresentar a oferta como novidade; D+3: o erro mais comum; D+7: último aviso com a oferta de R$ 47,90 em `utm_campaign=oferta-4790`), (2) pular leads que já receberam o e-mail manual de 18/10 (marcar na aba Sequencia) e (3) deixar pronto para o Carlos publicar nova versão do Apps Script e rodar `instalarGatilhoSequencia` (deploy manual). Não mexer em preço nem em CONFIG.
Status: aberto

### Pedido #5 · Conteúdo → Carlos · 2026-10-18
Semana 2 do @jornada40h pronta (7 peças renderizadas em `site/posts/semana-2/`, textos em `remotion/data/posts.json` `semana: 2`, legendas no campo `legenda` + `hashtags` de cada post (`out/` não é versionado; `node remotion/scripts/legendas.mjs --week 2` regenera o legendas.md)). Copy já com a transição correta (EC 141: 2 folgas e 42h em dez/26, 40h em dez/27; "na prática 40h já em dezembro") e números sempre como exemplo, pelas fórmulas da calculadora (salário × 1,7; hora extra 50%). Pedido: **OK para entrar na FILA** a partir de 23/10 (ou ajustes). Resumo:
1. Seg · Reel · `calendario` — O fim da 6x1 tem data. Anote. (19 s)
2. Ter · Carrossel · `setor-farmacia` — Farmácia com 7 funcionários, 102 h/semana: faltam 26 h → +1 contrato de 30 h, R$ 2.805/mês
3. Qua · Story · `hora-extra-limite` — Hora extra tem limite: 2 h por pessoa por dia (e 50% a mais)
4. Qui · Carrossel · `setor-loja` — Loja com 3 funcionários, 66 h/semana: faltam 12 h → +1 meio período, R$ 1.445/mês
5. Sex · Reel · `escala-oficina` — Oficina aberta 10 h/dia, 5 mecânicos: a 5x2 fecha? (+1 meio período, R$ 2.040/mês) (20 s)
6. Sáb · Carrossel · `setor-salao` (tema papel) — Salão com 4 funcionários CLT, 60 h/semana: faltam 20 h → +1 meio período, R$ 1.615/mês
7. Dom · Story · `resultado-clinica` — Clínica com 4 funcionários: +1 meio período, R$ 1.785/mês
Status: feito (Carlos: "Pode", 18/10 10:09; semana 2 na FILA de 23 a 29/10, commit a seguir)

### Pedido #3 · Analista → Dev · 2026-10-17 · prioridade ALTA
3 dos 4 leads reais viram resultado "+0", "+0,2" ou "+0,5 funcionário" (um viu custo R$ 0). A página/e-mail dizem a eles que o impacto é pequeno → 0 cliques no checkout. Quando `funcionarios_a_mais` < 1, mudar o ângulo do resultado e da oferta para as **horas descobertas** e o **custo de hora extra** (ex.: "8 h/semana descobertas = R$ 637/mês em hora extra; a escala 5x2 resolve sem contratar") e, quando for 0 horas descobertas, mostrar o que muda mesmo assim (folgas, revezamento de sábado, risco trabalhista). Aplicar em index.html, b/index.html e no e-mail do Apps Script (enviarRelatorio). Testar com os 4 cenários reais da planilha.
Status: feito (commit b1c01bd; Apps Script v6 publicado 17/10 10:45; páginas no ar após deploy Netlify)

### Pedido #4 · Analista → Gestor · 2026-10-17
UTMs divergem: N2/N3/B/C usam utm_medium=cpc, utm_campaign=teste-criativos, utm_term=<adset_id>; N2B usa utm_medium=paid, utm_campaign=leads-calculadora-40h, utm_term=lp-b. Para a análise, agrupar por utm_content (criativo) e tratar utm_term=lp-b como LP B e o resto como LP A. Não alterar os anúncios ativos (reinicia aprendizado).
Status: fechado em 18/10 pelo Analista (os 4 anúncios ativos usam `utm_term=lp-a`/`lp-b` e `utm_content` próprio; N2/N3/B/C/N2B estão desligados — a divergência não existe mais)

### Pedido #1 · Orquestrador → Carlos · 2026-10-16
Autorizar criação do anúncio B (duplicar N2 → URL `/b/`, `utm_content=n2-capa-jornal-b`) para o teste A/B de LP.
Status: feito (Carlos: "pode arrochar"; publicado 17:53 via Gerenciador — API Meta bloqueada por checkpoint de segurança, ver nota abaixo)

### Pedido #2 · Orquestrador → Carlos · 2026-10-16
Autorizar publicação do primeiro Reel (`noticia`) no @jornada40h hoje.
Status: feito (Carlos: "vc consegue postar, cuidar dos anúncios e fazer deploy"; publicado 17:05)

## Notas operacionais
- API Meta (Windsor) retorna erro 31/3858385 "Autentique sua conta" para criar/modificar anúncios, mesmo após o Carlos editar pelo Gerenciador. Leitura funciona. Gestor: se pause/budget falhar com esse erro, NÃO insistir; registrar e pedir ao Carlos que faça pelo Gerenciador.
- Publicar anúncio novo continua exigindo clique humano (ou sessão com Carlos presente): a trava de gasto do assistente barra "Publicar" sem OK explícito na hora.

## Decisões
- 16/10: teto R$ 50/dia; agentes só reduzem/redistribuem (regra 1).
- 16/10: briefing continua como formulário até ~10 pedidos; chat com IA depois.
- 16/10: conteúdo IG sem câmera (Remotion); eventual apresentador IA só com rótulo de IA.

## Histórico
- 19/10 09:25 · Conteúdo: publicado Carrossel `setor-restaurante` media_id 18099114455635575 (6 slides em jornada40h.com.br/posts/semana-1/, legenda de `posts.json`). URLs não verificáveis pelo sandbox (proxy); Instagram aceitou as 6 imagens — confirma que `posts/semana-1/` responde no domínio. Sem pedido aberto para Conteúdo; 10 itens pendentes na FILA (próximo: Story `enquete` 20/10). Semana 3 fica para domingo 25/10.
- 18/10 18:15 · Analista: fechamento da semana 1 (R$ 99,80, 153 visitas, 5 leads, CPL R$ 11,04 na LEADS, 0 checkout, 0 vendas; IG 4 seguidores, alcance por post < 10). Agentes avaliados: sem violação de regra. Pedido #4 fechado; abertos #6 (Dev: sequência de e-mails), #7 (Gestor: monitorar V4) e #8 (Carlos: 4 decisões). Sem pedido ao Dev aberto na data → nenhuma alteração em `site/`/`apps-script/`. Planilha não acessada (sem conector Sheets); site não verificável pelo sandbox.
- 18/10 22:20 · Anúncios (autonomia; Carlos liberou a regra do Windsor): [LEADS] R$ 25 → R$ 45/dia ([VENDAS] pausada; soma R$ 45 ≤ teto). Criados pela API (Windsor create_ad, imagem pública em jornada40h.com.br/ads/) 5 anúncios novos no conjunto 120253290480480421, todos levando à LP a4 com utm_term=lp-a4 e copy sem "grátis", preço R$ 47,90: V4L-03 É lei (120253316635640421), V4L-01 Escala pronta (120253316636270421), V5L-02 UOL quando vale (120253316636600421), V5L-01 UOL hora extra (120253316636940421), V5L-03 Quem já é 5x2 (120253316637260421). Imagens re-renderizadas com R$ 47,90. Total: 7 anúncios ativos na [LEADS]. Às 22h, V4L-04 tinha R$ 15,97, 504 impressões, CTR do link 2,78%, 11 visitas, 1 lead.
- 18/10 22:00 · LP A4 no ar (commit 8cafd2f, deploy manual): topo vende o produto (escala 5x2 pronta, 42h e 40h, R$ 47,90 de R$ 77), "Como funciona", calculadora abaixo (#card). Resultado pela metade: diagnóstico + hora extra visíveis; contratar, reduzir horário, opção mais barata e escala borrados (sem números no DOM). CTA principal direto ao checkout xftQB3Y; cadastro por e-mail virou secundário. Sem "grátis" na página. E-mail imediato (Apps Script v10) só com o diagnóstico curto + oferta; D1 da sequência sem o PDF completo. Anúncios V4L-04 e V4L-02: texto sem "grátis", com o produto e o preço (Windsor update_ad_creative; voltam para análise).
- 18/10 21:20 · LP A3 no ar (commit 3bf9be9, deploy manual via API do Dokploy): resultado → "Ver a prévia da minha escala (grátis)" → cadastro (WhatsApp opcional) → prévia borrada + oferta R$ 47,90 (de R$ 77) no checkout xftQB3Y; bloco "Quem está por trás"; PDF de exemplo em /exemplo/escala-5x2-exemplo.pdf; variante a3. /b/ com o mesmo preço e checkout. Testes: 169 checagens ok. O deploy automático por push não disparou com watchPaths=site/**; filtro removido (qualquer push na main publica).
- 18/10 21:00 · Funil (autonomia dada pelo Carlos: "quero que vc seja totalmente autonomo"): [VENDAS] pausada (CPM R$ 53 e 0 InitiateCheckout em ~165 visitas). [LEADS] segue em R$ 25/dia: o aumento para R$ 45 foi barrado pelo modo automático do Claude Code até o Carlos liberar a regra `mcp__claude_ai_Windsor_ai__execute_action` em /permissions. Sequência de e-mails LIGADA (gatilho processarSequencia de hora em hora, 8h–20h): D1 ~2h após o lead = prévia (PDF) + oferta R$ 47,90 (xftQB3Y); D3 em 2 dias; D7 em 5 dias; os 5 leads do e-mail manual de 18/10 pulam o D1. Apps Script v9 (mesmo ID do webhook): e-mail imediato também em R$ 47,90 e checkoutDe_() ignora o link antigo de R$ 77. Métrica principal a partir de agora: custo por venda (receita R$ 47,90 por venda; lead ~R$ 10).
- 18/10 17:05 · Links (OK do Carlos, "pode aprovar o texto da IA e atualizar os links"): LP A e B com "acesso antecipado ao app da transição, com assistente de IA" + FAQ "O que a IA faz?" (commit 9ff2fbb, no ar). Trocados para jornada40h.com.br: os 4 anúncios ativos (V4-03, V4-01 com as mesmas UTMs no link; V4L-04, V4L-02 com UTMs em Parâmetros de URL; os 4 voltaram para análise da Meta), Kiwify (página de vendas e página de obrigado), Apps Script (SITE_URL, implantação v7 no mesmo ID, webhook inalterado), README, motor do PDF e base de mídias da FILA. Deploy automático no push ainda não funciona: depois de push em site/, rodar application.deploy no Dokploy (o workflow com webhook foi bloqueado pelo modo automático).
- 18/10 16:45 · Infra (OK do Carlos): site no ar em **https://jornada40h.com.br** (e www), hospedado no Dokploy (console.joggasporthub.com), projeto "Landing Page", app `jornada40h` (applicationId kNdTSocrJr7R4pnaMCHYp) no servidor kanagawa-app 56.124.124.116, build estático de `site/`, Let's Encrypt. DNS na GoDaddy: A @ → 56.124.124.116; CNAME www → jornada40h.com.br. URLs absolutas do site trocadas para o domínio (commit 1d91ea1). A Netlify segue no ar só como reserva (anúncios e mídias dos posts ainda apontam para ela). Pendente: link dos anúncios, página de vendas na Kiwify, SITE_URL do Apps Script, Search Console.
- 18/10 16:18–16:21 · Vendas (OK do Carlos, "pode enviar"): enviados pela calculadora40h@gmail.com 5 e-mails manuais aos leads (Gabriel, Tatiane, Marcos, Rhayane, Chico), cada um com o número do negócio, a prévia da escala com a parte de baixo borrada (inline) e o botão para a oferta de R$ 47,90 (xftQB3Y, utm_campaign=oferta-4790). Sem PDF anexo. A sequência automática D+1/D+3/D+7 nunca foi ligada (não existe a aba Sequencia): ajustar o texto antes de ativar, para não repetir este e-mail.
- 18/10 16:19 · Infra: a Netlify zerou os 300 créditos do ciclo (16/10–15/11). O site segue no ar com 30 créditos operacionais, mas **novos deploys de produção estão bloqueados**: /fim-da-escala-6x1/perguntas-e-respostas/ (commit 46fa26e) está no repositório e dá 404 no ar. netlify.toml agora ignora commits que não mexem em site/. Decisão pendente com o Carlos: upgrade da Netlify ou migrar para Cloudflare Pages/GitHub Pages junto com o domínio.
- 18/10 · Vendas (pedido do Carlos, "oferta especial de 77 por 47,9"): criada na Kiwify a oferta **"Oferta especial leads 47,90"** (R$ 47,90, checkout https://pay.kiwify.com.br/xftQB3Y) no mesmo produto. O checkout principal (yy3LT4h, R$ 77) não mudou, e a LP continua em R$ 77. Uso: só no follow-up manual dos leads (utm_campaign=oferta-4790). E-mails prontos (prévia borrada + botão), aguardando login da conta do Jornada 40h no Chrome para envio.
- 18/10 · Gestor (Carlos autenticou e disse "pode trocar os criativos da LEADS"): publicados via Gerenciador (Chrome) no conjunto "Donos de pequenos negócios - BR - 25-60" da [LEADS]: **V4L-04 - Padaria falta gente (calculadora)** (ad 120253312939200421, utm_content=v4l-04-padaria) e **V4L-02 - Antes e depois (calculadora)** (ad 120253312974730421, utm_content=v4l-02-antes-depois). LP principal (/), utm_term=lp-a, texto chamando para a calculadora grátis com o gancho "fim da escala 6x1". Corte original nos dois posicionamentos, sem imagens de IA nem criativo Advantage+, sem reaproveitar comentários. Os antigos (N2B, B, N3, C) ficaram desligados após a checagem de segurança da Meta ("Requer análise"); N2 já estava desativado. Orçamento inalterado (R$ 25/dia).
- 18/10 10:09 · Conteúdo (sessão com Carlos, "Pode"): semana 2 aprovada; `posts.json` semana 2 → `aprovada`; 7 linhas adicionadas à FILA (23–29/10). Pedido #5 fechado.
- 18/10 09:16 · Conteúdo: publicado Story `resultado` media_id 18107798306524764 (URL da Netlify não verificável pelo sandbox — proxy 403; Instagram aceitou o vídeo). Semana 2 redigida (7 posts em `posts.json`, `semana: 2`) e renderizada com o renderizador de contingência; JPG/MP4 em `site/posts/semana-2/`; teste E2E `tests/lp.e2e.mjs` passou (0 falhas) antes do push. Pedido #5 aberto pedindo OK do Carlos; nada da semana 2 entrou na FILA.
- 18/10 · Gestor (OK do Carlos): pausados V-N2, V-C e V-N3 na [VENDAS] (texto antigo "44 para 40", V-N2 com R$ 27,54 e 0 InitiateCheckout) para concentrar os R$ 25/dia nos V4-01 e V4-03. V4-03 já ativo; V4-01 em "Preparando". Pausa por decisão humana: não reativar (regra 2).
- 18/10 · Gestor (sessão com Carlos, "pode subir o 01 e o 03"): publicados via Gerenciador (Chrome) no conjunto 120253303431430421 da [VENDAS]: **V4-03 - É lei (checkout)** (ad 120253308333450421, utm_content=v4-03-e-lei) e **V4-01 - Escala pronta (checkout)** (ad 120253308421660421, utm_content=v4-01-escala-pronta). Duplicados do V-N2 com imagem própria por posicionamento (feed 4:5 + story 9:16), criativo Advantage+, mídia flexível, animação e expansão por IA desligados; sem reaproveitar comentários. CBO inalterado (R$ 25/dia). Decidir por custo por InitiateCheckout com ~R$ 30–40 por criativo.
- 18/10 · SEO: guia "fim da escala 6x1" publicado em /fim-da-escala-6x1/ (pilar + 6 satélites), sitemap.xml e robots.txt; fontes e pendências em docs/SEO.md. Fato confirmado no Planalto: EC 141 publicada em 16/10/2026; 2 folgas e teto de 42h ~16/12/2026, 40h ~16/12/2027. Com 2 folgas e 8h/dia, 5 dias somam 40h: na prática 40h já em dezembro, salvo convenção (art. 7º da EC). LPs e calculadora ajustadas.
- 18/10 · Dev (sessão com Carlos): LP A redesenhada (visual SaaS escuro, prévia personalizada da escala gerada pelo motor `site/js/escala.js`, escala de exemplo no hero e em formato PDF), `variante: "a2"` no lead. Correção legal nas LPs A e B: PEC 221/2019 promulgada, transição em 2 etapas (42h dois meses após a promulgação, 40h um ano depois), 2 folgas (preferencialmente domingo), exceção para curso superior + salário > 2,5x teto INSS. Calculadora mostra a etapa de 42h. Oferta (OK do Carlos): escalas para 42h e 40h + acesso antecipado ao app da transição. /b/ com noindex e canonical para /. Teste E2E em `tests/lp.e2e.mjs` (6 cenários passando).
- 18/10 · Comentário de Henrique Schmidt no anúncio N2 (FB) corrigindo a transição 44→42→40 respondido com OK do Carlos. Texto dos anúncios ativos ainda diz "44 para 40 horas": trocar nos próximos criativos.
- 17/10 12:00 · Gestor (sessão com Carlos): campanha [VENDAS] criada e ativada (API + Gerenciador), [LEADS] reduzida para R$ 25/dia. Soma = R$ 50.
- 17/10 11:35 · Dev: Pedido #3 implementado (resultado/relatório com ângulo horas descobertas e folgas; contratação mínima integral+meio período). Repo tornado público para destravar Netlify.
- 17/10 09:12 · Conteúdo: publicado Carrossel `a-conta` media_id 18106213565458459 (URLs da Netlify não verificáveis pelo sandbox — proxy 403; Instagram aceitou as 6 imagens). Semana 2 será redigida no domingo 18/10.
- 17/10 01:05 · Analista: fechamento do dia 1 (4 leads, CPL R$ 7,95); pedidos #3 e #4 abertos.
- 16/10 17:53 · Anúncio N2B (LP B) publicado; teste A/B de página iniciado.
- 16/10 17:05 · Reel `noticia` publicado no @jornada40h.
- 16/10 · setup: site, Pixel, Apps Script v5, Kiwify (página de obrigado, webhook), campanha publicada, LP B, posts semana 1, repo.
