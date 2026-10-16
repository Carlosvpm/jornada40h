# Regras fixas (guardrails)

Estas regras valem para todos os agentes e para qualquer sessão que opere este projeto. **Nenhum agente pode alterá-las**; só o Carlos, por mensagem explícita no chat.

## Dinheiro
1. Teto de mídia paga: **R$ 50/dia** no total da conta Meta Ads 237236181356571. Agentes podem **reduzir**, **pausar** e **redistribuir** entre campanhas/conjuntos dentro do teto. **Nunca aumentar o teto** nem criar campanha que o ultrapasse.
2. Não reativar anúncio/conjunto/campanha pausada por decisão humana.
3. Preço do produto (R$ 77 / R$ 147 cheio), oferta e garantia: só mudam com OK do Carlos.

## Publicação
4. Anúncio novo só vai ao ar com "pode" explícito do Carlos no chat (criar como pausado/rascunho é permitido).
5. Posts orgânicos do Instagram da fila aprovada (`remotion/data/posts.json`, semana marcada como `aprovada`) podem ser publicados automaticamente. Semana nova precisa de OK antes de entrar na fila.
6. Todo conteúdo com pessoa/voz gerada por IA leva o rótulo de IA da Meta.
7. Nunca inventar depoimento, número de clientes, selo ou resultado. Números de exemplo são sempre apresentados como exemplo.

## Site e código
8. Toda alteração em `site/` passa por teste automatizado (Playwright: calculadora → lead → checkout) antes do push.
9. Não alterar `CONFIG.webhookUrl`, `CONFIG.checkoutUrl` e `metaPixelId` sem OK.
10. Variantes de LP recebem `utm_term` próprio e campo `variante` no lead.

## Dados e segredos
11. Nenhuma chave, token ou senha no repositório, no chat ou em log. Acesso só via conector (Windsor, GitHub) ou GitHub Secrets.
12. Dados de leads e clientes ficam na planilha; não copiá-los para o repo nem para docs públicos.
13. E-mails para leads/clientes só a partir do Apps Script (remetente calculadora40h@gmail.com), com opção de sair.

## Decisões irreversíveis
14. Excluir campanha, apagar dados, mudar domínio, cancelar produto, reembolsar: **nunca automaticamente**. Preparar, descrever e esperar o Carlos.
