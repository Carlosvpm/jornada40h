# Estado do projeto

_Atualizado: 2026-10-18 (America/Fortaleza)_

## Resumo
- Campanha Meta Ads no ar desde 16/10 ~12:20, CBO R$ 50/dia, 5 anúncios. **Dia 1 (16/10): R$ 31,78 gastos, 2.135 impr., 49 cliques, 39 visitas, 4 leads (CPL R$ 7,95), 0 checkout, 0 vendas.** N2 concentra a entrega (R$ 28,91, 3 leads); N2B aprovou ~18h (R$ 2,39, 3 visitas, 1 lead); N3/B/C quase sem entrega (R$ 0,48). Planilha: 4 pessoas reais (1 duplicada), todas restaurante/lanchonete ou outro, 3–10 funcionários; 1 lead sem UTM (provável bio IG).
- Funil validado ponta a ponta (lead → planilha → e-mail; Kiwify → webhook → Vendas → e-mail de briefing → obrigado.html → Pedidos).
- **Duas campanhas desde 17/10 ~12:00, R$ 25/dia cada (teto R$ 50 mantido):**
  - `[LEADS] Calculadora 40h - Teste de criativos` (120253290480490421): CBO reduzido de R$ 50 → R$ 25; 5 anúncios (N2, N3, B, C, N2B).
  - `[VENDAS] Escala 5x2 - Checkout (CBO 1-1-3)` (120253303430340421): objetivo Vendas, otimização **InitiateCheckout** (Pixel 111763000796120), CBO R$ 25; conjunto 120253303431430421 "BR 25-60 - Feed FB + Feed/Stories/Reels IG - IC" (Brasil, 25–60, todos os gêneros, posicionamentos manuais: Feed FB; Feed/Stories/Reels IG; sem Advantage+ audience); 3 anúncios V-N2 (120253303455860421), V-C (120253303455850421), V-N3 (120253303455840421), CTA Saiba mais, URLs com `utm_campaign=vendas-checkout`. Estratégia pedida pelo Carlos (CBO 1-1-3). Migrar para otimização Compra quando houver ~5 vendas/semana.
- Teste A/B de LP no ar: anúncio **N2B - Capa de jornal (LP B)** (id 120253295409460421) publicado 16/10 17:53 no mesmo conjunto, destino `/b/`, `utm_content=n2-capa-jornal-b`, `utm_term=lp-b`. Mesmo criativo do N2 → compara só a página. Campanha agora com 5 anúncios, CBO R$ 50/dia inalterado.
- Instagram @jornada40h conectado no Windsor; semana 1 renderizada em `site/posts/semana-1/`. Reel `noticia` publicado 16/10 17:05 (media_id 18123326782908294); Carrossel `a-conta` publicado 17/10 09:12 (media_id 18106213565458459); Story `resultado` publicado 18/10 09:16 (media_id 18107798306524764). Fila em `docs/FILA.md`. **Semana 2 aprovada pelo Carlos em 18/10 e na FILA de 23 a 29/10 (`site/posts/semana-2/`).**
- Repo **público** desde 17/10 11:28 (Netlify free bloqueava deploys de contribuidor não verificado em repo privado). Push na `main` publica.

## Semana atual · fila de conteúdo
| Dia | Post | Status |
|---|---|---|
| 16/10 | Reel `noticia` | publicado |
| 17/10 | Carrossel `a-conta` | publicado |
| 18/10 | Story `resultado` | publicado |
| 19/10 | Carrossel `setor-restaurante` | aprovado |
| 20/10 | Story `enquete` | aprovado |
| 21/10 | Reel `escala-se-montando` | aprovado |
| 22/10 | Carrossel `3-erros` | aprovado |

## Pedidos abertos
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
