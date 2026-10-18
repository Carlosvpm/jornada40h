# Fila de publicação · Instagram @jornada40h

Conta Windsor: connector `instagram`, account `17841457085842780`. Mídias públicas em `https://incandescent-profiterole-dfec92.netlify.app/posts/semana-1/`.
Legendas completas em `remotion/out/semana-1/legendas.md` (pasta `out/` não está no repo; a fonte é `remotion/data/posts.json` — campo `legenda` + `hashtags`, mesmo texto que o script `legendas.mjs` gera). O agente de conteúdo publica tudo com `data ≤ hoje` e `status: pendente`, um por dia, e troca o status para `publicado (media_id …)`.

| Data | Formato | Ação Windsor | Arquivos | Legenda (resumo) | Status |
|---|---|---|---|---|---|
| 2026-10-16 | Reel | create_video_post | noticia.mp4 · capa noticia-cena-01.jpg | Senado aprovou fim da 6x1… | publicado (media_id 18123326782908294) |
| 2026-10-17 | Carrossel | create_carousel_post | a-conta-slide-01..06.jpg | A conta da jornada de 40h para uma padaria com 4 funcionários | publicado (media_id 18106213565458459) 2026-10-17 09:12 |
| 2026-10-18 | Story | create_story | resultado.mp4 | (sem legenda) | publicado (media_id 18107798306524764) 2026-10-18 09:16 |
| 2026-10-19 | Carrossel | create_carousel_post | setor-restaurante-slide-01..06.jpg | A conta para um restaurante com 3 funcionários | pendente |
| 2026-10-20 | Story | create_story | enquete.mp4 | (sem legenda) | pendente |
| 2026-10-21 | Reel | create_video_post | escala-se-montando.mp4 · capa escala-se-montando-cena-01.jpg | Com a 5x2, quem fica no sábado? | pendente |
| 2026-10-22 | Carrossel | create_carousel_post | 3-erros-slide-01..05.jpg | 3 erros que vão encarecer a sua folha | pendente |

## Semana 2 · pendente de aprovação (Pedido #5 no ESTADO.md)

Redigida e renderizada em 18/10 (`remotion/data/posts.json`, `semana: 2`, `status: "pendente de aprovação"`). Mídias já no site em `https://incandescent-profiterole-dfec92.netlify.app/posts/semana-2/`; legendas no campo `legenda` + `hashtags` de cada post (`out/` não é versionado; `node remotion/scripts/legendas.mjs --week 2` regenera o legendas.md). **Só entra na tabela acima após OK do Carlos.** Datas sugeridas (continuação da fila):

| Data sugerida | Formato | Ação Windsor | Arquivos | Título |
|---|---|---|---|---|
| 2026-10-23 | Reel | create_video_post | calendario.mp4 · capa calendario-cena-01.jpg | O fim da 6x1 tem data. Anote. |
| 2026-10-24 | Carrossel | create_carousel_post | setor-farmacia-slide-01..06.jpg | A conta para uma farmácia com 7 funcionários |
| 2026-10-25 | Story | create_story | hora-extra-limite.mp4 | Hora extra tem limite: 2 h por pessoa por dia |
| 2026-10-26 | Carrossel | create_carousel_post | setor-loja-slide-01..06.jpg | A conta para uma loja com 3 funcionários |
| 2026-10-27 | Reel | create_video_post | escala-oficina.mp4 · capa escala-oficina-cena-01.jpg | Oficina aberta 10 horas por dia: a escala 5x2 fecha? |
| 2026-10-28 | Carrossel | create_carousel_post | setor-salao-slide-01..06.jpg | A conta para um salão com 4 funcionários |
| 2026-10-29 | Story | create_story | resultado-clinica.mp4 | Clínica com 4 funcionários: +1 meio período com 40h |
