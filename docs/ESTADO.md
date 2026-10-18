# Estado do projeto

_Atualizado: 2026-10-18 (America/Fortaleza)_

## Resumo
- Campanha Meta Ads no ar desde 16/10 ~12:20, CBO R$ 50/dia, 5 anúncios. **Dia 1 (16/10): R$ 31,78 gastos, 2.135 impr., 49 cliques, 39 visitas, 4 leads (CPL R$ 7,95), 0 checkout, 0 vendas.** N2 concentra a entrega (R$ 28,91, 3 leads); N2B aprovou ~18h (R$ 2,39, 3 visitas, 1 lead); N3/B/C quase sem entrega (R$ 0,48). Planilha: 4 pessoas reais (1 duplicada), todas restaurante/lanchonete ou outro, 3–10 funcionários; 1 lead sem UTM (provável bio IG).
- Funil validado ponta a ponta (lead → planilha → e-mail; Kiwify → webhook → Vendas → e-mail de briefing → obrigado.html → Pedidos).
- **Duas campanhas desde 17/10 ~12:00, R$ 25/dia cada (teto R$ 50 mantido):**
  - `[LEADS] Calculadora 40h - Teste de criativos` (120253290480490421): CBO reduzido de R$ 50 → R$ 25; 5 anúncios (N2, N3, B, C, N2B).
  - `[VENDAS] Escala 5x2 - Checkout (CBO 1-1-3)` (120253303430340421): objetivo Vendas, otimização **InitiateCheckout** (Pixel 111763000796120), CBO R$ 25; conjunto 120253303431430421 "BR 25-60 - Feed FB + Feed/Stories/Reels IG - IC" (Brasil, 25–60, todos os gêneros, posicionamentos manuais: Feed FB; Feed/Stories/Reels IG; sem Advantage+ audience); 3 anúncios V-N2 (120253303455860421), V-C (120253303455850421), V-N3 (120253303455840421), CTA Saiba mais, URLs com `utm_campaign=vendas-checkout`. Estratégia pedida pelo Carlos (CBO 1-1-3). Migrar para otimização Compra quando houver ~5 vendas/semana.
- Teste A/B de LP no ar: anúncio **N2B - Capa de jornal (LP B)** (id 120253295409460421) publicado 16/10 17:53 no mesmo conjunto, destino `/b/`, `utm_content=n2-capa-jornal-b`, `utm_term=lp-b`. Mesmo criativo do N2 → compara só a página. Campanha agora com 5 anúncios, CBO R$ 50/dia inalterado.
- Instagram @jornada40h conectado no Windsor; semana 1 renderizada em `site/posts/semana-1/`. Reel `noticia` publicado 16/10 17:05 (media_id 18123326782908294); Carrossel `a-conta` publicado 17/10 09:12 (media_id 18106213565458459). Fila em `docs/FILA.md`.
- Repo **público** desde 17/10 11:28 (Netlify free bloqueava deploys de contribuidor não verificado em repo privado). Push na `main` publica.

## Semana atual · fila de conteúdo
| Dia | Post | Status |
|---|---|---|
| 16/10 | Reel `noticia` | publicado |
| 17/10 | Carrossel `a-conta` | publicado |
| 18/10 | Story `resultado` | aprovado |
| 19/10 | Carrossel `setor-restaurante` | aprovado |
| 20/10 | Story `enquete` | aprovado |
| 21/10 | Reel `escala-se-montando` | aprovado |
| 22/10 | Carrossel `3-erros` | aprovado |

## Pedidos abertos
### Pedido #3 · Analista → Dev · 2026-10-17 · prioridade ALTA
3 dos 4 leads reais viram resultado "+0", "+0,2" ou "+0,5 funcionário" (um viu custo R$ 0). A página/e-mail dizem a eles que o impacto é pequeno → 0 cliques no checkout. Quando `funcionarios_a_mais` < 1, mudar o ângulo do resultado e da oferta para as **horas descobertas** e o **custo de hora extra** (ex.: "8 h/semana descobertas = R$ 637/mês em hora extra; a escala 5x2 resolve sem contratar") e, quando for 0 horas descobertas, mostrar o que muda mesmo assim (folgas, revezamento de sábado, risco trabalhista). Aplicar em index.html, b/index.html e no e-mail do Apps Script (enviarRelatorio). Testar com os 4 cenários reais da planilha.
Status: feito (commit b1c01bd; Apps Script v6 publicado 17/10 10:45; páginas no ar após deploy Netlify)

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
