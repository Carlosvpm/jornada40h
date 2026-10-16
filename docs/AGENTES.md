# Time de agentes

Cada agente é uma tarefa agendada (sessão nova a cada execução). Todos leem `docs/REGRAS.md` e `docs/ESTADO.md` antes de agir e registram o que fizeram em `docs/ESTADO.md` (commit na `main`). Quem precisa de algo de outro agente escreve um **pedido** na seção "Pedidos abertos".

| Agente | Horário (America/Fortaleza) | Lê | Faz | Pode mexer em |
|---|---|---|---|---|
| **Gestor de tráfego** | diário 07:52 | Meta Ads (Windsor), planilha Leads/Vendas, ESTADO | pausa anúncios ruins, redistribui orçamento dentro do teto, cria variação como **pausada** quando o Analista pedir | Meta Ads |
| **Analista** | diário 08:30 | Meta Ads, Leads, Vendas, Pedidos, Netlify analytics (se houver) | consolida funil por criativo e por variante de LP (CPC, CTR, visita→lead, CPL, lead→venda, CAC), escreve diagnóstico e pedidos | `docs/ESTADO.md` |
| **Conteúdo/Designer** | diário 09:00 + domingo 17:00 | fila em `remotion/data/posts.json`, ESTADO | publica o post do dia no @jornada40h via Windsor; domingo gera a semana seguinte (Remotion) e deixa como `pendente` para OK; cria criativos de anúncio quando pedido | Instagram, `remotion/`, `site/posts/`, `criativos/` |
| **Dev** | sob demanda (disparado por pedido no ESTADO; checagem diária 10:00) | ESTADO, código | ajusta LP/variantes/copy/Apps Script, roda testes Playwright, faz push | `site/`, `apps-script/` |
| **Orquestrador** | domingo 18:00 | tudo | revisa a semana, fecha pedidos, propõe mudanças que exigem OK (teto, preço, oferta, novo produto) e manda resumo ao Carlos | `docs/ESTADO.md`, mensagens |

## Métricas de referência (iniciais, revisar após 7 dias)
- CTR link ≥ 1,5% (bom ≥ 3%)
- Visita → lead ≥ 15%
- CPL ≤ R$ 8 (alerta > R$ 15)
- Lead → venda ≥ 3% (produto R$ 77 → CAC alvo ≤ R$ 40)
- Gasto sem lead: > R$ 20 em um anúncio → pausar; > R$ 40 no dia sem lead → reduzir campanha para o mínimo (R$ 10/dia) e abrir pedido para o Analista.

## Como um pedido funciona
```
### Pedido #7 · Analista → Dev · 2026-10-17
Variante B tem 2× a taxa visita→lead de A com n=120 visitas. Pedido: apontar o anúncio N2 para /b/ e manter A só no orgânico. Prioridade: alta.
Status: aberto
```
O agente que atende muda `Status` para `feito (commit abc123)` ou `recusado (motivo)`.
