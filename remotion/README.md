# Jornada 40h · conteúdo Instagram com Remotion

Projeto [Remotion](https://www.remotion.dev) que gera carrosséis (PNG), reels (MP4) e stories (MP4 + PNG por cena) da marca **Jornada 40h**, em português do Brasil, a partir de um único arquivo de dados: `data/posts.json`.

Tudo (copy, números, duração das cenas, CTA, legenda e hashtags) vem do JSON. Para fazer a semana 2, basta adicionar posts com `"semana": 2` e rodar o script.

## Estrutura

```
remotion/
├── data/posts.json          # fonte única de verdade: 1 objeto por post
├── src/
│   ├── index.ts             # registerRoot
│   ├── Root.tsx             # 1 composição por post (carrossel-*, reel-*, story-*)
│   ├── data.ts              # tipos + helpers (getPost, FPS)
│   ├── theme.ts             # paleta, fontes, zonas seguras, formatação pt-BR
│   ├── fonts.ts             # @font-face das fontes em public/fonts
│   ├── components/          # BrandBar, Headline/Kicker/Body, BigNumber, ScheduleGrid, CTACard, Caption
│   └── compositions/        # Carrossel.tsx (1080x1350) e Vertical.tsx (Reel/Story 1080x1920)
├── public/fonts/            # Lora (variável) + Inter; coloque PlayfairDisplay-Variable.ttf aqui
├── scripts/
│   ├── render-week.sh       # renderiza uma semana inteira + legendas.md + zip
│   ├── legendas.mjs         # gera out/semana-N/legendas.md (legenda, hashtags, link UTM)
│   └── fallback/            # renderizador de contingência (sem npm): esbuild + Chromium + ffmpeg
├── remotion.config.ts       # Chromium local, H.264, yuv420p
└── out/semana-1/            # saída da semana 1 (+ out/semana-1.zip)
```

## Instalação

```bash
cd remotion
npm install          # remotion 4.x, @remotion/cli, react 19
```

O `remotion.config.ts` aponta para o Chromium pré-instalado (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) para evitar o download do Chrome Headless Shell. Em outra máquina, defina `BROWSER_EXECUTABLE=/caminho/do/chrome` ou remova a linha `setBrowserExecutable` para o Remotion baixar o próprio navegador.

### Fontes

A marca usa **Playfair Display** (títulos) + **Inter** (texto). Os arquivos em `public/fonts` são carregados via `@font-face` em `src/fonts.ts`. Se `PlayfairDisplay-Variable.ttf` não estiver na pasta, o navegador usa **Lora** (incluída; mesma família editorial dos criativos v2/v3). Para ativar a Playfair, baixe a fonte variável do Google Fonts e salve como `public/fonts/PlayfairDisplay-Variable.ttf`. Alternativa online: instale `@remotion/google-fonts` e troque `src/fonts.ts` conforme o comentário no topo do arquivo.

## Render

```bash
# Semana inteira: PNGs, MP4s, legendas.md e zip
bash scripts/render-week.sh 1          # -> out/semana-1/ e out/semana-1.zip
bash scripts/render-week.sh 2          # semana 2 (depois de editar posts.json)
ONLY=a-conta bash scripts/render-week.sh 1   # só um post

# Peças avulsas com a CLI do Remotion
npx remotion still src/index.ts carrossel-a-conta slide3.png --frame=2
npx remotion render src/index.ts reel-noticia noticia.mp4
npm run studio                           # pré-visualização interativa
```

Saída por post em `out/semana-N/<id>/`:

| Tipo | Arquivos |
|---|---|
| carrossel | `<id>-slide-01.png` … `<id>-slide-06.png` (1080x1350) |
| reel | `<id>.mp4` (1080x1920, 30 fps, H.264, sem áudio) + `<id>-cena-NN.png` (frame final de cada cena, útil como capa) |
| story | `<id>.mp4` (3 cenas x ~4 s) + `<id>-cena-01..03.png` para publicar como stories estáticos |

### Renderizador de contingência

Se `node_modules/remotion` não existir (por exemplo, registro npm bloqueado), `render-week.sh` usa automaticamente `scripts/fallback/render.mjs`: ele empacota `src/` com esbuild redirecionando `remotion` para um shim mínimo (`scripts/fallback/remotion-shim.tsx`, que implementa `useCurrentFrame`, `interpolate`, `spring`, `Sequence`, `Composition` etc.), abre o Chromium via Playwright, tira um screenshot por frame e monta o MP4 com ffmpeg. A estrutura de saída é idêntica. Requer `esbuild`, `playwright` e `react` resolvíveis em `NPM_TOOLS` (padrão `/opt/npm-tools`) e `ffmpeg` no PATH. Foi assim que a semana 1 foi gerada neste ambiente.

## Como funciona o `posts.json`

Array de posts. Campos comuns:

```jsonc
{
  "id": "a-conta",            // usado em nomes de arquivo, id de composição e utm_content
  "semana": 1,                // filtro do render-week.sh
  "dia": "Terça",             // aparece na barra da marca do carrossel
  "type": "carrossel",        // "carrossel" | "reel" | "story"
  "setor": "padaria",
  "tema": "escuro",           // "escuro" (navy) | "papel" (bege editorial)
  "titulo": "...",
  "numeros": { "funcionariosAMais": 1, "custoContratarMes": 3060, "custoHoraExtraMes": 2397, "horasReduzir": 13.7 },
  "cta": "Calcular grátis",
  "legenda": "texto da legenda (\\n para quebrar linha)",
  "hashtags": ["#escala6x1", "..."]
}
```

### Carrossel → `slides[]` (1 frame por slide, 1080x1350)

Cada slide tem `layout`, `kicker` (texto pequeno em caixa alta dourada), `titulo` (Playfair) e campos opcionais:

| layout | campos |
|---|---|
| `capa` | `titulo`, `corpo` |
| `texto` | `titulo`, `corpo`, `bullets[]` |
| `conta` | `linhas[{rotulo, valor, cor}]`, `numero{prefixo, valor, sufixo, rotulo}`, `destaque{rotulo, valor, sub}` |
| `saidas` | `opcoes[{titulo, valor, nota, cor}]` (`cor`: `verde` / `vermelho` / `ouro`) |
| `erro` | `numeroErro`, `titulo`, `corpo`, `solucao` |
| `cta` | `titulo`, `botao`, `rodape` (último slide: botão + "link na bio", sem "→ arraste") |

### Reel / Story → `cenas[]` (1080x1920, 30 fps)

Cada cena tem `tipo`, `duracao` (segundos) e, no reel, `legenda` (texto queimado no vídeo, acima da zona segura inferior de 250 px).

| tipo | o que anima |
|---|---|
| `manchete` | kicker + título com palavras subindo uma a uma |
| `stats` | `itens[]` em cartões; `{de, para}` conta regressiva (44 → 40), `{valor}` conta, `{texto}` fixo |
| `texto` | título + corpo |
| `numero` | `numero{}` grande (+1 pessoa) + `destaque{valor numérico, formato:"moeda", sufixo}` contando em R$ |
| `grade` | `escala{}` do post preenchendo dia a dia; coluna com déficit vira "falta N" em vermelho |
| `grade-solucao` | mesma grade já pronta + linha `escala.solucao` em verde |
| `enquete` | título + botões Sim/Não (coloque o sticker de enquete do IG por cima) |
| `cta` | marca + título + botão + "link na bio" |

`escala` (usada pelas cenas de grade): `dias[]`, `funcionarios[{nome, folgas:[índices de dia]}]`, `minimo[]` (pessoas necessárias por dia; 0 = fechado) e `solucao{nome, trabalha:[índices]}`.

### Adicionar a semana 2

1. Copie um post parecido em `data/posts.json`, troque `id`, `semana: 2`, `dia`, textos e números.
2. `bash scripts/render-week.sh 2`.
3. Confira `out/semana-2/legendas.md` (links já vêm com `utm_content=<id>`) e `out/semana-2.zip`.

Não é preciso tocar em `src/`: as composições são criadas automaticamente a partir do JSON (`carrossel-<id>`, `reel-<id>`, `story-<id>`).

## Regras de layout embutidas

- 1080x1920: conteúdo entre 250 px do topo e 250 px da base (interface do IG); barra da marca em y = 260.
- Carrossel: margem de 64 px, barra da marca no topo, contador "n / total" e "→ arraste" no rodapé, exceto no último slide.
- Corpo de texto mínimo de 36 px em 1080 de largura; títulos em Playfair 700/800; números grandes em `tabular-nums`, formato pt-BR (`R$ 3.060`).
- Paleta: navy `#0B1428`/`#0F1B33`/`#22345E`, dourado `#D4A72C`, vermelho (custo) `#C8102E`, verde (bom) `#1F8A70`, papel `#F4F1EA`.
