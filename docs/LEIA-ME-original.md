# Calculadora 40h: como colocar no ar

São 3 arquivos:

- `index.html`: a página inteira (calculadora, cadastro, relatório e oferta)
- `apps-script.gs`: o código que grava os leads numa planilha Google e envia o relatório por e-mail
- este guia

Tempo total: cerca de 1 hora.

---

## Passo 1. Planilha de leads (15 min)

1. Crie uma planilha nova no Google Sheets, por exemplo "Leads Calculadora 40h".
2. Menu **Extensões > Apps Script**.
3. Apague o que estiver no editor e cole todo o conteúdo de `apps-script.gs`. Salve.
4. No seletor de funções, escolha **testar** e clique em **Executar**. O Google vai pedir autorização (planilha e envio de e-mail): aceite. Confira se apareceu a aba **Leads** com uma linha de teste e se chegou um e-mail para você.
5. Clique em **Implantar > Nova implantação**:
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
6. Copie a **URL do app da Web** (termina em `/exec`).

Se alterar o código depois, use **Implantar > Gerenciar implantações > Editar > Nova versão**, senão a URL continua rodando a versão antiga.

Limite de e-mail: uma conta Gmail gratuita envia cerca de 100 e-mails por dia pelo Apps Script. Se passar disso, mude `ENVIAR_EMAIL` para `false` e envie o relatório por uma ferramenta como o Brevo.

## Passo 2. Produto e link de pagamento (15 min)

1. Na Kiwify, Hotmart ou Mercado Pago, crie o produto "Escala 5x2 pronta" com o preço de fundador (padrão na página: R$ 77).
2. Configure o order bump (kit de transição) e o upsell (escala com revisões), se a plataforma permitir.
3. Na página de obrigado, coloque o link do formulário pós-compra (Google Forms) que coleta os dados para montar a escala: funções, pessoas mínimas por turno e por função, horários de pico, restrições individuais, dias que não pode fechar e a categoria (para conferir a convenção coletiva).
4. Copie o link de checkout.

## Passo 3. Ajustar a página (5 min)

Abra `index.html` num editor de texto e procure o bloco `CONFIG` perto do fim do arquivo:

| Campo | O que colocar |
| --- | --- |
| `webhookUrl` | a URL `/exec` do passo 1 |
| `checkoutUrl` | o link de pagamento do passo 2 |
| `privacyUrl` | o link da sua política de privacidade (obrigatória pela LGPD; existem geradores gratuitos) |
| `metaPixelId` | o ID do seu Pixel do Meta |
| `precoCheio`, `precoFundador` | seus preços |
| `fatorCustoFuncionario` | **confirme com um contador.** É o custo total do funcionário dividido pelo salário (encargos, férias, 13º, benefícios). O valor 1,7 é provisório. |

O texto da página (títulos, oferta, garantia) fica no HTML e pode ser editado direto.

## Passo 4. Publicar (10 min)

Opção mais simples, sem programação:

1. Crie uma pasta no computador com o `index.html` dentro.
2. Entre em **app.netlify.com/drop** e arraste a pasta.
3. Em segundos você recebe um endereço público. Depois, em **Domain settings**, conecte seu domínio próprio.

A Vercel também funciona (crie um projeto e envie a pasta).

## Passo 5. Testar antes de anunciar (10 min)

- [ ] Abrir a página no celular e preencher a calculadora
- [ ] Fazer um cadastro com seu próprio e-mail: a linha aparece na planilha e o e-mail chega
- [ ] Clicar em "Quero minha escala pronta" e chegar ao checkout
- [ ] Fazer uma compra de teste (ou usar o modo de teste da plataforma) e ver a página de obrigado
- [ ] No **Gerenciador de Eventos** do Meta, conferir que aparecem os eventos `PageView`, `IniciouCalculadora`, `CalculouResultado`, `Lead` e `InitiateCheckout`

## Um título por anúncio (message match)

A página troca o título e já marca o tipo de negócio conforme o link do anúncio. Use um link por conjunto de anúncios:

| Público do anúncio | Final do link |
| --- | --- |
| Padarias | `?setor=padaria` |
| Restaurantes | `?setor=restaurante` |
| Lanchonetes | `?setor=lanchonete` |
| Lojas | `?setor=loja` |
| Mercados | `?setor=mercado` |
| Farmácias | `?setor=farmacia` |
| Salões | `?setor=salao` |
| Barbearias | `?setor=barbearia` |

Exemplo completo: `https://seudominio.com.br/?setor=padaria&utm_source=meta&utm_content=video-padaria`. Sem `setor`, aparece o título genérico.

## Eventos para a campanha

Otimize a campanha pelo evento **Lead** (cadastro). Os outros servem para ver onde as pessoas desistem:

| Evento | Quando dispara |
| --- | --- |
| `IniciouCalculadora` | a pessoa começa a preencher |
| `CalculouResultado` | vê o resultado parcial |
| `Lead` | faz o cadastro |
| `InitiateCheckout` | clica na oferta |

Use parâmetros UTM nos links dos anúncios (por exemplo `?utm_source=meta&utm_campaign=lancamento&utm_content=video-padaria`). Eles ficam gravados em cada lead na planilha e seguem para o checkout, para você saber qual criativo vende.

## Como o cálculo funciona

- Horas de cobertura por semana = horas abertas × pessoas ao mesmo tempo
- Funcionários necessários = cobertura ÷ 40
- Contratar = funcionários a mais (arredondado para cima) × salário × fator de custo
- Hora extra = horas descobertas × 4,33 semanas × (salário ÷ 200) × 1,5
- Reduzir horário = horas descobertas ÷ pessoas ao mesmo tempo

Todos os limites (40h, 44h, adicional de 50%, divisor 200, limite de 2h extras por dia) estão no `CONFIG` e podem ser ajustados se o texto final da emenda ou a convenção da categoria exigirem.
