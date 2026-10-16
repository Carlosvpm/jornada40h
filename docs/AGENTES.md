# Time de agentes

Cada agente é uma tarefa agendada (sessão nova a cada execução). Todos leem `docs/REGRAS.md` e `docs/ESTADO.md` antes de agir e registram o que fizeram em `docs/ESTADO.md` (commit na `main`). Quem precisa de algo de outro agente escreve um **pedido** na seção "Pedidos abertos".

| Agente | Tarefa agendada | Horário (America/Fortaleza) | Faz | Pode mexer em |
|---|---|---|---|---|
| **Gestor de tráfego** | trig_01RfxNojvherH5MV1HxyXSGv | diário 07:52 | lê Meta + planilha; pausa anúncios ruins, redistribui dentro do teto; abre pedidos | Meta Ads (Windsor) |
| **Conteúdo/Designer** | trig_01KZZbsxx1Cbmxjm2JHmMei7 | diário 09:08 | publica o item do dia de `docs/FILA.md` no @jornada40h; domingo redige a semana seguinte e pede OK; cria criativos sob pedido | Instagram (Windsor), `remotion/`, `site/posts/`, `criativos/` |
| **Orquestrador / Analista / Dev** | trig_01QHchXShWC4KkQbVVvCYaeP | domingo 18:10 | consolida funil (Meta + IG + planilha), avalia os agentes, fecha/abre pedidos, implementa pedidos ao Dev com teste Playwright, manda resumo com decisões para o Carlos | `docs/`, `site/`, `apps-script/` (só repo) |

Todas rodam em sessão nova, com aprovação automática, notificação push + e-mail. O repo é a memória: cada uma clona, lê REGRAS/ESTADO, age, registra e faz push.

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
