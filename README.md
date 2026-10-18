# Jornada 40h

Micro-SaaS para pequenos negócios se adaptarem ao fim da escala 6x1 (jornada 44h → 40h, 5x2).

- **Produto gratuito:** calculadora de carga horária (captura de lead)
- **Produto pago:** "Escala 5x2 Pronta", R$ 77 (Kiwify, pagamento único)
- **Site:** https://incandescent-profiterole-dfec92.netlify.app/ (deploy automático: push na `main` → Netlify publica `site/`)

## Estrutura

```
site/              → o que a Netlify publica (raiz do site)
  index.html       → LP variante A (calculadora + oferta)
  b/index.html     → LP variante B ("estilo startup"), utm_term=lp-b
  obrigado.html    → briefing pós-compra (recebe ?name&email&phone&order_id)
  privacidade.html → política LGPD
  js/escala.js     → cópia de engine/escala.js usada pela prévia da LP A (atualize junto)
  posts/semana-N/  → JPG/MP4 públicos usados pela API do Instagram (Windsor)
remotion/          → gerador de carrosséis/reels/stories a partir de data/posts.json
apps-script/       → Code.gs do Google Apps Script (leads, pedidos, vendas, e-mails)
criativos/         → criativos dos anúncios Meta (v2/v3, stories, vídeo demo)
marca/             → identidade visual
docs/
  REGRAS.md        → guardrails que nenhum agente pode alterar
  ESTADO.md        → "reunião de equipe": diagnóstico, decisões e pedidos entre agentes
  AGENTES.md       → papéis, horários e permissões de cada agente
  LEIA-ME-original.md → guia de setup manual (histórico)
```

## Integrações

| Sistema | Como | Acesso |
|---|---|---|
| Netlify | push na `main` | automático |
| Meta Ads (conta 237236181356571) | Windsor.ai MCP, conector `facebook` | ler, pausar, orçamento, criar anúncio |
| Instagram @jornada40h (17841457085842780) | Windsor.ai MCP, conector `instagram` | publicar reel/carrossel/story (mídia via URL pública em `site/posts/`) |
| Google Sheets + e-mails | Apps Script web app (`/exec`) | editar código via editor Apps Script (clasp: pendente) |
| Kiwify | webhook → Apps Script (compra aprovada, reembolso, chargeback) | somente recebe eventos |

## Fluxo

```
Anúncio / post IG → LP (A ou B) → calculadora → lead (Sheets + e-mail relatório)
   → checkout Kiwify (R$ 77) → webhook → aba Vendas → e-mail com link do briefing
   → obrigado.html → aba Pedidos → entrega manual da escala (até automatizar)
```

## Testes

`node tests/lp.e2e.mjs` (precisa de `playwright-core`; aponte com `PW=/caminho/playwright-core`). Roda calculadora → lead → checkout em `/` e `/b/` com webhook e Kiwify interceptados.

## Convenções

- UTMs: `utm_source` (meta/instagram), `utm_medium` (paid/organico), `utm_content` (id do criativo/post), `utm_term` (`lp-b` quando variante B).
- Eventos Pixel: PageView, IniciouCalculadora, CalculouResultado, Lead, InitiateCheckout, BriefingEnviado.
- Nunca commitar segredos. Chaves ficam em conectores (Windsor) ou em GitHub Secrets.
