# Fila de publicação · Instagram @jornada40h

Conta Windsor: connector `instagram`, account `17841457085842780`. Mídias públicas em `https://incandescent-profiterole-dfec92.netlify.app/posts/semana-N/` (N = semana da linha).
Legendas: fonte é `remotion/data/posts.json` — campo `legenda` + `hashtags` (pasta `out/` não está no repo; `node remotion/scripts/legendas.mjs --week N` regenera o `legendas.md`). O agente de conteúdo publica tudo com `data ≤ hoje` e `status: pendente`, um por dia, e troca o status para `publicado (media_id …)`.

| Data | Semana | Formato | Ação Windsor | Arquivos | Legenda (resumo) | Status |
|---|---|---|---|---|---|---|
| 2026-10-16 | 1 | Reel | create_video_post | noticia.mp4 · capa noticia-cena-01.jpg | Senado aprovou fim da 6x1… | publicado (media_id 18123326782908294) |
| 2026-10-17 | 1 | Carrossel | create_carousel_post | a-conta-slide-01..06.jpg | A conta da jornada de 40h para uma padaria com 4 funcionários | publicado (media_id 18106213565458459) 2026-10-17 09:12 |
| 2026-10-18 | 1 | Story | create_story | resultado.mp4 | (sem legenda) | publicado (media_id 18107798306524764) 2026-10-18 09:16 |
| 2026-10-19 | 1 | Carrossel | create_carousel_post | setor-restaurante-slide-01..06.jpg | A conta para um restaurante com 3 funcionários | pendente |
| 2026-10-20 | 1 | Story | create_story | enquete.mp4 | (sem legenda) | pendente |
| 2026-10-21 | 1 | Reel | create_video_post | escala-se-montando.mp4 · capa escala-se-montando-cena-01.jpg | Com a 5x2, quem fica no sábado? | pendente |
| 2026-10-22 | 1 | Carrossel | create_carousel_post | 3-erros-slide-01..05.jpg | 3 erros que vão encarecer a sua folha | pendente |
| 2026-10-23 | 2 | Reel | create_video_post | calendario.mp4 · capa calendario-cena-01.jpg | O fim da 6x1 tem data. Anote. | pendente |
| 2026-10-24 | 2 | Carrossel | create_carousel_post | setor-farmacia-slide-01..06.jpg | A conta para uma farmácia com 7 funcionários | pendente |
| 2026-10-25 | 2 | Story | create_story | hora-extra-limite.mp4 | (sem legenda) | pendente |
| 2026-10-26 | 2 | Carrossel | create_carousel_post | setor-loja-slide-01..06.jpg | A conta para uma loja com 3 funcionários | pendente |
| 2026-10-27 | 2 | Reel | create_video_post | escala-oficina.mp4 · capa escala-oficina-cena-01.jpg | Oficina aberta 10 horas por dia: a escala 5x2 fecha? | pendente |
| 2026-10-28 | 2 | Carrossel | create_carousel_post | setor-salao-slide-01..06.jpg | A conta para um salão com 4 funcionários | pendente |
| 2026-10-29 | 2 | Story | create_story | resultado-clinica.mp4 | (sem legenda) | pendente |

Semana 2 aprovada pelo Carlos em 18/10 10:09 ("Pode"), Pedido #5. Antes da primeira publicação da semana 2 (23/10), conferir que uma URL de `posts/semana-2/` responde 200 (o deploy não pôde ser verificado pelo sandbox em 18/10).

Semana 3: a ser redigida pelo agente de conteúdo no domingo 25/10 (`remotion/data/posts.json`, `semana: 3`, status `pendente de aprovação`). Só entra nesta fila após OK do Carlos.
