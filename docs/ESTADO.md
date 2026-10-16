# Estado do projeto

_Atualizado: 2026-10-16 17:55 (America/Fortaleza)_

## Resumo
- Campanha Meta Ads "Leads · Calculadora 40h" no ar desde 16/10 ~12:20, CBO R$ 50/dia, 3 criativos (N2 capa-jornal, N3, C). Até 15:30: R$ 3,58 gastos, 180 impressões, 7 cliques (CTR 3,9%), 7 visitas, 0 leads. Entrega concentrada no N2.
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
- 16/10 17:53 · Anúncio N2B (LP B) publicado; teste A/B de página iniciado.
- 16/10 17:05 · Reel `noticia` publicado no @jornada40h.
- 16/10 · setup: site, Pixel, Apps Script v5, Kiwify (página de obrigado, webhook), campanha publicada, LP B, posts semana 1, repo.
