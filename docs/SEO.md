# SEO — hub "Fim da escala 6x1"

Objetivo: ranquear no Google para "fim da escala 6x1" e variações, sempre associando a marca **Jornada 40h** e a calculadora (`/#card`) à frase "fim da escala 6x1".

Criado em 18/10/2026. Fatos conferidos nessa data (ver Fontes).

## Keywords alvo

| Prioridade | Keyword | Página alvo |
|---|---|---|
| Principal | fim da escala 6x1 | `/fim-da-escala-6x1/` |
| Alta | fim da escala 6x1 quando começa / data / quando acaba a escala 6x1 | `/quando-comeca/` |
| Alta | fim da escala 6x1 empresas / o que muda para o empregador / pequenas empresas | `/o-que-muda-para-empresas/` |
| Alta | fim da escala 6x1 hora extra / banco de horas | `/riscos-hora-extra/` |
| Média | fim da escala 6x1 padaria / escala 5x2 padaria | `/padaria/` |
| Média | fim da escala 6x1 restaurante / escala 5x2 restaurante | `/restaurante/` |
| Média | fim da escala 6x1 comércio / varejo / mercado / farmácia / salão de beleza | `/comercio-varejo/` |
| Alta | escala 6x1 acabou / e agora / perguntas e respostas; fim da escala 6x1 MEI, PJ, 12x36, empregada doméstica | `/perguntas-e-respostas/` |
| Apoio | PEC 6x1, PEC 221/2019, Emenda Constitucional 141, jornada 40 horas, jornada 42 horas, escala 5x2, redução da jornada sem redução salarial | pilar + satélites |

## Mapa das páginas

Todas em `site/fim-da-escala-6x1/`, CSS compartilhado em `guia.css`. Cada página tem `<title>` ≤ 60 car., meta description ≤ 155, canonical, Open Graph, JSON-LD (`Article` + `BreadcrumbList` + `FAQPage`), FAQ visível, CTA "Calcule quanto o fim da escala 6x1 vai custar para o seu negócio" → `/#card`, bloco "Leia também" e lista de fontes com data de acesso, e Pixel Meta só com PageView (ID igual ao de `CONFIG.metaPixelId`).

```
/fim-da-escala-6x1/                          pilar (~2.000 palavras): o que é, o que foi aprovado, fases, exceções, setores, riscos, checklist, FAQ
├── quando-comeca/                           datas e fases (42h → 40h), o que já vale
├── o-que-muda-para-empresas/                5 mudanças, exceções, MEI/ME/EPP, decisões, documentos
├── riscos-hora-extra/                       limite 2h/dia, hora mais cara, habitual, banco de horas, passivo
├── padaria/                                 exemplo de cálculo (fictício), escala, descansos, noturno
├── restaurante/                             picos, turno dividido, intervalos, exemplo (fictício)
├── comercio-varejo/                         domingo no comércio (Lei 10.101), loja, mercado, farmácia, salão-parceiro
└── perguntas-e-respostas/                   FAQ prático (12 perguntas): reversão, seg–sex, meio período, MEI sozinho, doméstica, PJ, novo salário, 12x36, contrato público, HE, fiscalização
```

Links: pilar → todas as satélites; cada satélite → pilar + 3 irmãs + calculadora. A LP (`/index.html`, redesign) já linka `fim-da-escala-6x1/` no menu.

`site/sitemap.xml`: `/` + as 8 páginas do guia. Fora do sitemap: `/b/` (já tem `noindex, follow`), `/obrigado.html` e `/privacidade.html` (já têm `noindex`).
`site/robots.txt`: libera tudo, bloqueia `/obrigado.html` (recebe nome/e-mail na query string) e aponta o sitemap.

Geração: as páginas foram geradas por um script Python fora do repo; são HTML estático e podem ser editadas à mão. Ao editar uma FAQ, edite também o JSON-LD `FAQPage` da mesma página.

## Fontes usadas (acesso em 18/10/2026)

| Fonte | URL | O que confirma |
|---|---|---|
| Planalto — texto da EC 141/2026 | https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm | Texto integral: art. 7º XIII (8h/40h) e XV (2 dias de repouso, um preferencialmente domingo), §2º (regime compensatório por convenção: média de 2 folgas no mês, 1 por semana), art. 2º (sem redução salarial, inclusive pisos), art. 3º (cláusulas coletivas incompatíveis perdem efeito em 2 meses), art. 4º (≤ 40h não reduz), art. 5º (LC opcional p/ MEI/ME/EPP), art. 6º (42h em 2 meses; 40h 1 ano depois), art. 7º (CCT pode ampliar jornada diária na fase de 42h), art. 8º (nível superior + ≥ 2,5× teto RGPS), art. 9º (contratos públicos), art. 10 (vigência). Publicação: DOU 16/10/2026, edição extra |
| Agência Senado (16/10) | https://www12.senado.leg.br/noticias/materias/2026/10/16/congresso-promulga-o-fim-da-escala-6x1-e-aposentadoria-de-agentes-de-saude | Promulgação em 16/10/2026; transição 60 dias / 42h / 40h; exceções |
| Agência Senado (14/10) | https://www12.senado.leg.br/noticias/materias/2026/10/14/senado-aprova-fim-da-escala-6x1-1 | Aprovação 75 × 1 nos dois turnos |
| Agência Câmara (maio) | https://www.camara.leg.br/noticias/1277141-camara-aprova-em-dois-turnos-fim-da-escala-6x1-com-jornada-maxima-de-40-horas-semanais | Câmara: 472 × 22 (1º turno) e 461 × 19 (2º) em maio/2026 |
| Agência Câmara (16/10) | https://www.camara.leg.br/noticias/1311742-congresso-promulga-o-fim-da-escala-6x1-e-aposentadoria-especial-para-agentes-de-saude | Promulgação em sessão solene 16/10 |
| Agência Brasil (14/10) | https://agenciabrasil.ebc.com.br/politica/noticia/2026-10/senado-aprova-fim-da-escala-6x1-e-reducao-da-jornada-de-trabalho | Votação e transição de 14 meses |
| O POVO / Agência Brasil (16/10) | https://www.opovo.com.br/noticias/politica/2026/10/16/amp/congresso-promulga-emenda-do-fim-da-6x1-escala-5x2-comeca-em-60-dias.html | 5x2 em ~60 dias (~15/12); 8h24/dia na fase de 42h; exceção ~R$ 21.188,87 |
| Migalhas | https://www.migalhas.com.br/quentes/466606/fim-da-escala-6x1-quando-comeca-a-valer-e-o-que-muda | Divisor 220 → 210 → 200; banco de horas segue permitido; quem já faz 40h |
| Planalto — CLT | https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm | Art. 58 (8h), 59 caput (até 2 HE/dia), §1º (≥ 50%), §2º (banco anual por CCT, 10h/dia), §3º (rescisão), §5º (banco 6 meses por acordo individual escrito), §6º (compensação no mês, acordo tácito/escrito), 59-B (HE habitual não descaracteriza), 66 (11h), 67 (DSR, revezamento), 71 (intervalo 1–2h), 73 (noturno 20%, 52'30"), 74 §2º (ponto > 20 trabalhadores) |
| INSS / gov.br | https://www.gov.br/inss/pt-br/assuntos/com-reajuste-de-3-9-teto-do-inss-chega-a-r-8-475-55-em-2026 | Teto RGPS 2026 = R$ 8.475,55 → 2,5× ≈ R$ 21.188,88 |
| Planalto — Lei 10.101/2000 | https://www.planalto.gov.br/ccivil_03/leis/l10101.htm | Art. 6º: domingo no comércio, folga no domingo ≥ 1 vez a cada 3 semanas; 6º-A: feriado só com CCT |
| Planalto — Lei 13.021/2014 | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l13021.htm | Farmacêutico presente durante todo o horário |
| Planalto — Lei 13.352/2016 | https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13352.htm | Salão-parceiro; vínculo se não houver contrato formalizado |
| Planalto — Lei 605/1949 | https://www.planalto.gov.br/ccivil_03/leis/l0605.htm | Repouso semanal remunerado |
| TST — livro de jurisprudência | https://www.tst.jus.br/en/livro-de-jurisprudencia-indice | Súmulas 85, 172, 291, 376 |
| Planalto — Constituição | https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm | Art. 7º § 1º (domésticos têm XIII e XV), art. 60 § 2º (emenda: 3/5, dois turnos) |
| Planalto — LC 123/2006 | https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm | Art. 18-C: MEI com um único empregado |
| Planalto — LC 150/2015 | https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp150.htm | Art. 2º: doméstico ainda escrito como 44h (Constituição prevalece) |
| g1 (17/10) — perguntas e respostas | https://g1.globo.com/trabalho-e-carreira/noticia/2026/10/17/escala-6x1-acabou-e-agora-perguntas-respostas.ghtml | Pauta da página `/perguntas-e-respostas/` (texto não copiado; fatos conferidos no Planalto). Ver divergências abaixo |
| TST — hora extra tema campeão | https://www.tst.jus.br/en/-/hora-extra-%C3%A9-o-tema-campe%C3%A3o-na-justi%C3%A7a-do-trabalho-no-primeiro-semestre-de-2023 | Hora extra entre os temas mais frequentes |

## Pendências e incertezas

1. **Data exata de corte**: texto diz "2 meses após a publicação" (16/10/2026) → usamos **~16/12/2026** (42h + 2 folgas) e **~16/12/2027** (40h). Agência Brasil fala em "60 dias" (~15/12). As páginas dizem "por volta de" e mandam confirmar com contador.
2. **Fase de 42h vs. limite de 8h/dia**: com 2 folgas e 8h/dia, 5 dias = 40h. Usar 42h exige ~8h24/dia, permitido pela EC (art. 7º) via convenção/acordo coletivo; sem isso, depende das regras de compensação da CLT. Ponto interpretativo — não há orientação oficial do MTE encontrada.
3. **Lei 10.101 × segunda folga**: como a regra de "domingo a cada 3 semanas" do comércio convive com 2 folgas semanais não está definido; páginas orientam olhar a convenção.
4. **Valor da exceção**: 2,5 × R$ 8.475,55 = R$ 21.188,88; imprensa cita R$ 21.188,87 / R$ 21.188,00. Páginas usam "cerca de R$ 21.188". Muda quando o teto for reajustado (jan/2027).
5. **Lei complementar MEI/ME/EPP** (art. 5º): não existe ainda. Acompanhar e atualizar as páginas quando sair.
6. **Orientação do MTE**: nenhuma nota técnica/fiscalização encontrada até 18/10/2026. Atualizar quando publicarem.
7. **Site do TST** retornou 504 durante a checagem; textos das súmulas conferidos em fontes secundárias (Conjur, Estratégia, Modelo Inicial). Reconferir links do TST.
8. **Súmula 85 × art. 59-B**: conflito pós-Reforma (tema em recurso repetitivo no TST). Página cita os dois e recomenda especialista.
9. Votação no Senado: 14/10/2026 foi **quarta-feira** (Agência Câmara diz "quinta"; seguimos Agência Senado/Agência Brasil).
10. Exemplos de cálculo (padaria, restaurante, minimercado, farmácia, salário R$ 2.000/R$ 2.200) são **fictícios** e rotulados como exemplo (regra 7).

## Divergências g1 (17/10/2026) × texto oficial da EC 141

Conferido em 18/10/2026. Nas páginas, seguimos o texto do Planalto.

1. **Exceção de nível superior**: g1 diz remuneração "superior a" 2,5× o teto e que o empregado não fica sujeito "ao limite de 40 horas". Texto oficial (art. 8º): "igual ou superior"; afasta **todas** as regras de duração e controle de jornada, salvo liberalidade do empregador ou previsão em ACT/CCT; mantém o inciso XV e o § 2º; não vale para empregados públicos.
2. **"Serviços essenciais" / 12x36**: g1 lista hospitais, segurança, transporte etc. como exceção que pode manter 12x36. A EC não cita setores nem a 12x36: só prevê regime compensatório por convenção (art. 7º § 2º, média de 2 folgas no mês) e lei futura sobre regimes diferenciados (§ 3º). A 12x36 segue no art. 59-A da CLT; média ≈ 42h/semana, compatibilidade com 40h (dez/2027) em aberto. Página trata como ponto em aberto.
3. **Lei complementar MEI/ME/EPP**: g1 diz que o texto "prevê a criação". Texto oficial (art. 5º): lei complementar **poderá** (opcional), condicionada à manutenção de empregos.
4. **Folgas em "dois períodos de 24 horas"**: g1 afirma; o texto da EC só diz "2 dias" de repouso, um preferencialmente no domingo. Não repetimos a afirmação das 24h.
5. Datas (16/12/2026 e 16/12/2027), placares (472×22, 461×19, 75×1) e "sem redução salarial" batem com as fontes oficiais.

## Sugestões

- **Domínio próprio** (ex.: jornada40h.com.br): o subdomínio Netlify aleatório dificulta autoridade e confiança. Decisão do Carlos (regra 14: mudar domínio não é automático). Se mudar, trocar canonical/OG/sitemap/robots e configurar redirect 301.
- **Google Search Console**: verificar a propriedade, enviar `sitemap.xml`, pedir indexação do pilar e acompanhar consultas "fim da escala 6x1". (Windsor tem conector `searchconsole` para ler os dados depois.)
- **Imagem OG** 1200×630 para o guia (hoje sem `og:image`; o JSON-LD `Article` também ficaria melhor com `image`).
- **/b/** já tem `noindex, follow` — manter enquanto for variante de teste (evita conteúdo duplicado com `/`). `/obrigado.html` e `/privacidade.html` já têm `noindex`.
- **Menu da LP**: já linka o guia; considerar link no rodapé da LP também para as satélites mais fortes (quando começa, empresas).
- **Atualização**: revisar `dateModified` e o texto quando sair LC de MEI/ME/EPP, orientação do MTE, ou em 16/12/2026 (virada para 42h).
- **Novas satélites** possíveis: salão de beleza (página própria), farmácia, supermercado, escala 12x36, "escala 5x2 modelo", "como calcular hora extra com 40 horas".
- **Instagram/anúncios**: usar as páginas do guia como destino de posts orgânicos informativos (UTM `utm_medium=organico`).
- **Teste Playwright** (regra 8): incluir smoke test das páginas do guia (status 200, link para `/#card`) no `tests/lp.e2e.mjs` antes do push.
