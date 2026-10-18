# Plano: primeira venda com o orçamento atual

_Criado em 18/10/2026. Teto de mídia: R$ 50/dia (docs/REGRAS.md, regra 1). Meta: 1ª venda da Escala 5x2 Pronta (R$ 77) até 31/10, data do fim do preço de fundador._

## 1. Onde estamos (dados reais da conta)

| Etapa | Números até 17/10 | Leitura |
|---|---|---|
| Gasto total | R$ 82 em 2 dias | Amostra pequena |
| Visitas na página (LPV) | 139 | CPC ~R$ 0,60, abaixo da faixa brasileira (R$ 0,80–2,50) |
| Leads (calculadora) | 5 (CPL ~R$ 10) | Funciona |
| Cliques no checkout | 0 | **O gargalo**: ninguém chegou à Kiwify |
| Vendas | 0 | — |

Desde 18/10: página nova (prévia da escala, datas da EC 141, oferta 42h + 40h + app), anúncios V4-01 e V4-03 na [VENDAS] e os antigos V-N2, V-C e V-N3 pausados.

## 2. O que as fontes dizem (resumo)

1. **Fase de aprendizado.** A Meta precisa de ~50 eventos de otimização por conjunto em ~7 dias para estabilizar. Com R$ 25/dia, "Compra" nunca chega lá; o certo é otimizar por um evento mais frequente (InitiateCheckout, ou Lead). Mudanças grandes de orçamento (>20%), criativo ou público reiniciam o aprendizado.
2. **Criativo é a segmentação.** Desde o Andromeda, a entrega é guiada pelo criativo: poucos conjuntos, público amplo e **conceitos realmente diferentes**, não variações do mesmo. Com orçamento baixo: 1 conjunto, 2–4 conceitos.
3. **Benchmarks Brasil 2026** (blogs de agência, usar como ordem de grandeza): CPM no feed R$ 15–35, Stories/Reels R$ 8–20; CPC R$ 0,80–2,50; CTR de campanhas de conversão 0,95%–1,6%.
4. **Página.** Produtos baratos convertem 3%–5% das visitas. A maior alavanca é a **oferta**, antes do design.
5. **Velocidade de contato.** Quem responde o lead em até 1 hora tem ~7x mais chance de qualificar do que quem demora (Lead Response Management Study). Números específicos de WhatsApp são de fornecedores e não confiáveis, mas a direção é a mesma.
6. **Anúncio para WhatsApp.** Fornecedores dizem que converte várias vezes mais que landing page para ofertas que pedem conversa. Sem estudo independente: vale como teste controlado, não como certeza.

## 3. A conta da primeira venda

Com página a 3% (visita → checkout) e checkout a 40% (checkout → compra), cada venda pede ~85 visitas. A R$ 0,60–1,00 por visita, são **R$ 50–85 de mídia por venda**, se a oferta convencer. As 139 visitas sem nenhum clique no checkout mostram que a página antiga não convencia; a nova precisa provar isso em ~100 visitas (~R$ 60–100).

Em paralelo, o caminho mais curto para a 1ª venda é **humano**: lead quente + WhatsApp + prévia da escala dele.

## 4. Plano por fases

### Fase 0 · hoje e amanhã (18–19/10): medir certo
- [ ] Conferir no Gerenciador de Eventos que PageView, Lead, CalculouResultado e **InitiateCheckout** disparam na página nova (Testar eventos) e que o Purchase da Kiwify chega no mesmo Pixel.
- [ ] [LEADS]: está com status WITH_ISSUES e anúncios com o texto antigo "44 para 40". Autenticar no Ads Manager e trocar os criativos pelos v4 (ângulo calculadora + produto visível) ou pausar.
- [ ] Definir o número de WhatsApp e ligar o botão da página (`CONFIG.whatsappUrl`).

### Fase 1 · 18–24/10: deixar a Meta aprender
- Orçamento (dentro do teto de R$ 50):
  - **[VENDAS] R$ 30/dia**, otimizando InitiateCheckout, com V4-01 e V4-03 (+1 conceito novo na quarta, ex.: 04 padaria ou vídeo de uma pessoa falando).
  - **[LEADS] R$ 20/dia**, com criativos novos. Lead custa ~R$ 10 e é a matéria-prima do WhatsApp.
  - Subir orçamento no máximo 20% por vez.
- Não mexer nos conjuntos por 3–4 dias (só pausar o que estiver claramente ruim, ver regras de corte).

### Fase 2 · desde já: converter leads em venda (maior alavanca)
- [ ] **Todo lead recebe WhatsApp em até 1 hora** (horário comercial), com o nome, o resultado da calculadora e a **imagem da prévia da escala dele**. Roteiro abaixo.
- [ ] Os 5 leads antigos: mesma mensagem, hoje.
- [ ] Sequência de e-mail D+1/D+3/D+7 (já existe no Apps Script) com o prazo de dezembro e o fim do preço de fundador em 31/10.
- [ ] Toda objeção ouvida vira resposta na página ou no FAQ.

**Roteiro de WhatsApp (1ª mensagem):**
> Oi, {nome}! Aqui é o Carlos, da Jornada 40h. Vi que você fez a conta da {tipo}: com as 2 folgas que entram em dezembro, faltam {X} na sua escala. Montei uma prévia de como ficaria a semana da sua equipe (imagem). Quer que eu monte a escala completa, pessoa por pessoa, pronta para imprimir? Fica R$ 77, uma vez só, e se não servir eu devolvo.

Se a resposta for "vou ver", mandar 1 dúvida comum respondida (ex.: "posso abrir sábado e domingo?") e retomar em 2 dias. Nunca mais de 3 contatos.

### Fase 3 · checkpoints e regras de decisão

| Quando | Se… | Então… |
|---|---|---|
| Criativo com R$ 30–40 gastos | CTR do link < 0,8% | Pausar e trocar por conceito novo |
| Clique → visita (LPV/clique) | < 70% | Página lenta ou link errado: investigar |
| 100 visitas na página nova | 0 cliques no checkout | O problema é a oferta: testar (a) botão "Falar no WhatsApp" como CTA principal, (b) preço de lançamento R$ 47, (c) garantia mais forte ("pague só se aprovar a prévia") |
| 3+ cliques no checkout | 0 compras | Atrito na Kiwify: testar o checkout, Pix, campos; mandar WhatsApp para quem abandonou |
| 24/10 (7 dias) | Nenhuma venda | Testar campanha **Clique para WhatsApp** com R$ 20/dia (tirados da [LEADS]) e venda 100% na conversa |
| 1ª venda | — | Entregar em 48h com excelência, pedir depoimento e print (com autorização), usar como prova social |

## 5. Fora da mídia (custo zero)
- Responder todo comentário em até 1 dia, técnico e com convite (já em curso).
- Postar o guia do fim da escala 6x1 nos stories/bio e em grupos de comerciantes e de contadores.
- Parceria com contadores: eles têm a carteira de pequenos negócios; oferecer comissão por indicação (decisão do Carlos).

## 6. Métricas para acompanhar todo dia

| Métrica | Fonte | Meta |
|---|---|---|
| CPM, CTR do link, CPC | Ads Manager | CTR ≥ 1%, CPC ≤ R$ 1 |
| Visitas (LPV) | Ads Manager | — |
| Taxa visita → lead | Planilha / Pixel | ≥ 5% |
| Taxa visita → clique no checkout | Pixel (InitiateCheckout) | ≥ 3% |
| Tempo até o 1º WhatsApp | Planilha | ≤ 1 h |
| Vendas | Kiwify | 1 até 31/10 |

## Fontes
- Fase de aprendizado e ~50 eventos: [Cometly](https://www.cometly.com/post/facebook-ads-learning-phase-optimization), [Marin Software](https://marinsoftware.helpjuice.com/en_US/facebook/facebook-learning-stage), [BrowserMedia](https://browsermedia.agency/blog/what-is-the-facebook-ads-learning-phase/), artigo oficial da Meta citado por eles: facebook.com/business/help/1738164643098669
- Orçamento mínimo e evento proxy: [Vizup](https://www.tryvizup.com/blog/meta-ads-minimum-budget-requirements-2026), [Extuitive](https://extuitive.com/articles/meta-ads-minimum-budget-for-testing), [Internet Retailing](https://internetretailing.com.au/the-meta-ads-mistakes-too-many-smes-make/)
- Andromeda e diversidade de criativos: [Chatterbuzz](https://www.chatterbuzzmedia.com/blog/meta-andromeda-creative-targeting/), [PPC Hero](https://ppchero.com/?p=31064), [Ecommerce Fastlane](https://ecommercefastlane.com/meta-andromeda-shopify-ads/)
- Benchmarks Brasil: [Trafius CPM](https://trafius.com.br/blog/cpm-medio-facebook-ads-brasil-2026), [Trafius CPC](https://trafius.com.br/blog/cpc-medio-meta-ads-brasil-2026), [Trafius CTR](https://trafius.com.br/blog/ctr-medio-no-meta-ads-por-objetivo-em-2026), [ViniEnsina](https://viniensina.com.br/estatisticas-meta-ads-brasil-2026/), [ContentStudio](https://contentstudio.io/blog/meta-ads-benchmarks)
- Conversão de página: [Shopify](https://www.shopify.com/blog/landing-page-conversion-rate), [ClickMinded](https://www.clickminded.com/landing-page-conversion-benchmark/), [WordStream](https://wordstream.com/conversion-rate)
- Velocidade de resposta: [Aurora Inbox](https://www.aurorainbox.com/pt/2026/05/28/tempo-de-resposta-de-conversao-do-whatsapp-em-2026/) (cita o Lead Response Management Study, Oldroyd et al., 2011)
- Clique para WhatsApp: [AsisteClick](https://asisteclick.com/en/blog/click-to-whatsapp-ads-ctwa-conversion-2026), [Message Central](https://www.messagecentral.com/blog/click-to-whatsapp-ads-brasil), [caso Braip](https://whatsappbusiness.com/resources/success-stories/braip/)
- Orçamento inicial no Brasil: [Trafius](https://trafius.com.br/blog/como-comecar-trafego-pago-do-zero), [ViniEnsina](https://viniensina.com.br/?p=2692)

Ressalva: quase todos os números vêm de blogs de agências e ferramentas, não de estudos independentes. Valem como ordem de grandeza; a decisão final é sempre pelos dados da nossa conta.
