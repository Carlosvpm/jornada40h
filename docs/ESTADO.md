# Estado do projeto

_Atualizado: 2026-10-17 01:05 (America/Fortaleza)_

## Resumo
- Campanha Meta Ads no ar desde 16/10 ~12:20, CBO R$ 50/dia, 5 anúncios. **Dia 1 (16/10): R$ 31,78 gastos, 2.135 impr., 49 cliques, 39 visitas, 4 leads (CPL R$ 7,95), 0 checkout, 0 vendas.** N2 concentra a entrega (R$ 28,91, 3 leads); N2B aprovou ~18h (R$ 2,39, 3 visitas, 1 lead); N3/B/C quase sem entrega (R$ 0,48). Planilha: 4 pessoas reais (1 duplicada), todas restaurante/lanchonete ou outro, 3–10 funcionários; 1 lead sem UTM (provável bio IG).
- Funil validado ponta a ponta (lead → planilha → e-mail; Kiwify → webhook → Vendas → e-mail de briefing → obrigado.html → Pedidos).
- Teste A/B de LP no ar: anúncio **N2B - Capa de jornal (LP B)** (id 120253295409460421) publicado 16/10 17:53 no mesmo conjunto, destino `/b/`, `utm_content=n2-capa-jornal-b`, `utm_term=lp-b`. Mesmo criativo do N2 → compara só a página. Campanha agora com 5 anúncios, CBO R$ 50/dia inalterado.
- Instagram @jornada40h conectado no Windsor; semana 1 renderizada em `site/posts/semana-1/`. Primeiro Reel (`noticia`) publicado 16/10 17:05, media_id 18123326782908294. Fila em `docs/FILA.md`.
- Repo + Netlify ligados (push na `main` publica).

## Semana atual · fila de conteúdo
| Dia | Post | Status |
|---|---|---|
| 16/10 | Reel `noticia` | publicado |
| ter | Carrossel `a-conta` | aprovado |
| qua | Story `enquete` | aprovado |
| qui | Carrossel `setor-restaurante` | aprovado |
| sex | Reel `escala-se-montando` | aprovado |
| sáb | Carrossel `3-erros` | aprovado |
| dom | Story `resultado` | aprovado |

## Pedidos abertos
### Pedido #3 · Analista → Dev · 2026-10-17 · prioridade ALTA
3 dos 4 leads reais viram resultado "+0", "+0,2" ou "+0,5 funcionário" (um viu custo R$ 0). A página/e-mail dizem a eles que o impacto é pequeno → 0 cliques no checkout. Quando `funcionarios_a_mais` < 1, mudar o ângulo do resultado e da oferta para as **horas descobertas** e o **custo de hora extra** (ex.: "8 h/semana descobertas = R$ 637/mês em hora extra; a escala 5x2 resolve sem contratar") e, quando for 0 horas descobertas, mostrar o que muda mesmo assim (folgas, revezamento de sábado, risco trabalhista). Aplicar em index.html, b/index.html e no e-mail do Apps Script (enviarRelatorio). Testar com os 4 cenários reais da planilha.
Status: aberto

### Pedido #4 · Analista → Gestor · 2026-10-17
UTMs divergem: N2/N3/B/C usam utm_medium=cpc, utm_campaign=teste-criativos, utm_term=<adset_id>; N2B usa utm_medium=paid, utm_campaign=leads-calculadora-40h, utm_term=lp-b. Para a análise, agrupar por utm_content (criativo) e tratar utm_term=lp-b como LP B e o resto como LP A. Não alterar os anúncios ativos (reinicia aprendizado).
Status: aberto (informativo)

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
- 17/10 01:05 · Analista: fechamento do dia 1 (4 leads, CPL R$ 7,95); pedidos #3 e #4 abertos.
- 16/10 17:53 · Anúncio N2B (LP B) publicado; teste A/B de página iniciado.
- 16/10 17:05 · Reel `noticia` publicado no @jornada40h.
- 16/10 · setup: site, Pixel, Apps Script v5, Kiwify (página de obrigado, webhook), campanha publicada, LP B, posts semana 1, repo.
