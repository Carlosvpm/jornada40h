# Ajustes da escala: funções, picos, regras por pessoa, intervalo — design

Data: 26/11/2026 · Pedido do Carlos, a partir de relatos de empresários e de um advogado.

## Por quê

Empresários que testaram o painel relataram casos que a escala não sabe representar: um caixa que precisa estar no almoço, uma pessoa com jornada diferente da empresa, duas pessoas que não podem folgar no mesmo dia, a folga de domingo das mulheres e o intervalo de 2 h. Hoje esses casos só saem pedindo à IA (que confere depois e às vezes falha) ou não saem. O objetivo é virar regra do painel o que tem base clara, para a escala sair certa sem depender da IA.

Diretriz do Carlos: fazer o que tem base certa; o que for incerto não entra e vira pergunta para o advogado.

## Como está hoje (resumo do código)

- Estado da conta (`site/app/app.js`, `normalizar`): `funcionamento[dia] = { abre, fecha, pessoas }`, `equipe[] = { id, nome, funcao (texto livre), salario, horas (meio período), folgaFixa, naoPode[] }`, `intervalo: "fora"|"dentro"`, `versao: "42"|"40"`, `escalas` (grade A/B por versão).
- Motor `site/js/escala.js` (`gerarEscala`): folgas (`distribuirFolgas`: dias fechados → folga fixa/naoPode → rodízio de fim de semana por metade da equipe em A/B → resto pelo menor custo) e turnos em blocos de 30 min com **um único número de pessoas por dia**. Turnos têm forma fixa (abertura/meio/fechamento) do tamanho da jornada diária da versão.
- `app.js` completa depois do motor: `repararDescanso` (11 h), `marcarAlmocos` (almoço de **1 h** escalonado), `cobrirComReserva`, `encaixarParciais` (meio período nos buracos), `repararVirada` (A→B), alertas (`renderAlertas`, `problemasLei`, `trabalhaTodoDomingo`), edição manual de célula e arrastar, e o Ajuste com IA (`painel/lib/ia.ts`, schema com `funcionamento`, `equipe`, `celulas`).
- A "necessidade" de gente (`f.pessoas`) é lida em ~30 lugares de `app.js`.
- `engine/escala.js` é uma cópia antiga usada pelo Apps Script (PDF do lead). **Fica fora deste trabalho.**

## Objetivos

1. **Funções cadastradas** (tabela de funções da empresa) e **horários de pico por função** (abordagem A, escolhida pelo Carlos).
2. **Não folgar junto**: pares de pessoas que nunca folgam no mesmo dia.
3. **Jornada própria por pessoa**: horas por semana e por dia diferentes das da empresa.
4. **Sexo do funcionário**: mulher folga no domingo pelo menos 1 vez a cada 2 semanas (CLT, art. 386).
5. **Intervalo de 1 h ou 2 h**, escolhido pelo dono (CLT, art. 71: mínimo 1 h, máximo 2 h).

## Fora do escopo

- Regra "sem alimentação, intervalo obrigatório de 2 h": sem base que eu consiga citar → pergunta ao advogado (abaixo). O painel não obriga nada por causa de alimentação.
- "Horário de abertura e encerramento": já existe por dia. Volta como pergunta aos empresários (o que não acharam).
- Grade completa de demanda por meia hora (abordagem B) e só-alerta (C).
- `engine/escala.js`, PDF do lead e formulário de briefing do Apps Script.
- Jornada acima da versão (ex.: 44 h): as versões do painel são 42 h e 40 h (fim da 6x1); jornada própria só pode ser **menor ou igual** à da versão.
- Folgas por semana diferentes de 2 (6x1 para alguém): não entra; o produto é 5x2.

## Anti-objetivos (falhou mesmo funcionando)

- Escala antiga de cliente mudando sozinha ao abrir o painel. Contas existentes sem os campos novos precisam gerar exatamente a mesma escala que hoje.
- Painel afirmar regra de lei que não está nos trechos de `painel/lib/leis.ts`.
- Formulário que o dono de padaria não consegue preencher: tudo novo é opcional, com padrão que reproduz o comportamento atual.
- Regra nova que o motor "esquece" quando a IA ou a edição manual mexe na grade: toda regra nova também vira alerta conferido na grade final.

## Abordagens (funções + pico)

- **A. Picos por faixa (escolhida).** Funções cadastradas; picos como linhas "dias + faixa horária + função + quantidade". O motor cobre primeiro esses mínimos. Simples de preencher, resolve "preciso de caixa no almoço".
- B. Grade por meia hora e por função: precisa demais, ninguém preenche.
- C. Só alerta de pico descoberto: rápido, mas aponta o buraco sem resolver.

## Design

### Dados (novos campos, todos opcionais)

```js
state.funcoes = [{ id, nome }]               // catálogo da empresa
state.picos = [{ id, dias: ["seg",...], inicio: "11:00", fim: "14:00", funcao: "<id da função>" | "", pessoas: 1 }]
state.intervaloMin = 60 | 120                // padrão 60
pessoa.funcao  = "<nome da função>"          // continua texto (compatível), escolhido do catálogo
pessoa.sexo    = "F" | "M" | ""              // "" = não informado
pessoa.horas   = número | null               // já existe: horas/semana (≤ versão)
pessoa.horasDia = número | null              // novo: horas/dia (≤ jornada diária da versão)
pessoa.naoFolgaCom = ["<id>", ...]           // simétrico: normalizar garante os dois lados
```

Migração em `normalizar`: `funcoes` nasce das funções distintas que a equipe já tem; `picos = []`; `intervaloMin = 60`; `naoFolgaCom` limpo de ids que não existem e simetrizado. Sem os campos novos preenchidos, a escala gerada é idêntica à de hoje (teste de regressão com as escalas de exemplo e as de `tests/`).

### Necessidade por bloco (núcleo do pico)

Uma função única `necessidade(s, dia, t)` → `{ total, porFuncao: { nome: n } }` substitui as leituras diretas de `f.pessoas`:
- `porFuncao[f]` = soma dos picos daquela função que cobrem o bloco `t` naquele dia.
- `total` = máximo entre `pessoas` do dia e a soma de **todos** os picos que cobrem o bloco (picos sem função contam só no total).

Assim "2 pessoas o dia todo" + "11h–14h: 1 caixa + 2 atendentes" vira 3 pessoas das 11h às 14h, com 1 caixa e 2 atendentes, e 2 no resto do dia.

Todos os lugares que leem `f.pessoas` passam a usar `necessidade`, **inclusive** a sugestão de contratação e os custos: se o pico pede mais gente, "Contratar" sugere mais gente (a contratação sai sem função definida; o alerta de pico diz qual função falta). Sem picos, os números ficam iguais aos de hoje.

### Motor (`site/js/escala.js`)

- `criarBlocos`: cada bloco ganha `necessario` (total) e `porFuncao`; o motor recebe os picos na entrada.
- `escalarDia`: o ganho de um turno para uma pessoa conta os blocos onde falta gente no total **e** os blocos onde falta a função dela (peso maior para a função faltante), para o caixa ir para o turno que cobre o pico de caixa.
- `distribuirFolgas`:
  - **não folgar junto**: um dia só é candidato à folga de uma pessoa se nenhum parceiro dela folga nesse dia (vale no rodízio do fim de semana e nas folgas restantes). Se não houver dia possível, aviso com os nomes.
  - **mulher**: com domingo aberto, ela entra no rodízio de fim de semana da semana do grupo dela com a folga **no domingo** (não no sábado). Se a folga fixa ou o "não pode" impedirem, aviso.
  - **pico por função**: o custo da folga num dia considera se tirar a pessoa deixa a função dela abaixo do pico daquele dia.
- Turnos com jornada própria (`horasDia` preenchido): a pessoa **fica no motor** (não vai para `encaixarParciais`), trabalha 5 dias com turno de exatamente `horasDia` (+ intervalo, se passar de 6 h) e entra no rodízio de fim de semana, nas regras de par e de domingo e em `repararVirada` como qualquer integral. O motor gera, para ela, turnos de abertura/fechamento do tamanho dela (abertura começa na abertura; fechamento termina no fechamento). Horas/semana = `min(horas, horasDia × 5)`; se `horas` < `horasDia × 5`, o último turno da semana é encurtado (como o motor já faz) e há aviso. Só `horas` preenchido (sem `horasDia`) = meio período de hoje, sem mudança.

### Ordem de prioridade quando as regras brigam

1. Lei: folga de domingo da mulher (a cada 2 semanas) e 11 h entre jornadas.
2. 2 folgas por semana.
3. Folga fixa e "não pode".
4. Não folgar junto.
5. Cobertura (total e picos por função).

Quem perde gera aviso com nomes e dia. Ex.: duas pessoas do par com a mesma folga fixa → folgam juntas (folga fixa vence) e aparece o alerta do par. Mulher sem domingo possível sem zerar o domingo → ela folga no domingo mesmo assim e o alerta de cobertura mostra o buraco.

### Grupos do rodízio com mulheres

Quando há mulheres com `sexo: "F"` e domingo aberto, os grupos A/B do fim de semana deixam de ser "primeira metade / segunda metade" e passam a alternar as mulheres entre A e B (depois completam com os demais). Sem nenhum `sexo` preenchido, os grupos ficam exatamente como hoje (regressão).

### Intervalo de 1 ou 2 h

- `intervaloDe` e todos os "60" de almoço em `app.js` (`marcarAlmocos`, `pausaMin`, `almocoIni`, `montarDias`) passam a usar `state.intervaloMin` quando o turno tem mais de 6 h. Turno na loja = jornada + intervalo (8 h → 10 h com 2 h).
- Configuração: pergunta "Intervalo para refeição: 1 h ou 2 h", explicando a CLT, art. 71 (1 a 2 h). Ao trocar, a escala é remontada (com Desfazer), como já acontece com o almoço.
- Escala com `intervalo: "dentro"` (antigas mantidas pelo dono) continua como está.

### Alertas (conferidos na grade final, depois de IA e edição manual)

- Pico descoberto: "Segunda 11h–14h: falta 1 caixa".
- Par que folga junto: "Ana e Bia folgam juntas na quinta (semana A)".
- Mulher sem domingo de folga nas semanas A e B: com a lei (CLT, art. 386) citada de `leis.ts`.
- Os três entram em `problemas`/`totalProblemas` para a revisão e o antes/depois.

### Telas

- **Cadastro da pessoa** (`dlgP`): função vira lista do catálogo (com "+ nova função"); campo Sexo (Feminino / Masculino / Não informar), com nota curta "mulher folga no domingo a cada 2 semanas"; "Jornada própria" (horas/semana e horas/dia, vazio = a da empresa), substituindo o atual campo de meio período; "Não pode folgar junto com" (chips com os colegas).
- **Configuração**: seção "Funções" (lista editável: renomear atualiza as pessoas; remover só se ninguém usa) e seção "Horários de pico" (linhas: dias, das, às, função ou "qualquer", quantas pessoas; adicionar/remover). Intervalo 1 h/2 h junto do horário.
- Detalhe visual (layout, textos finais) fica com o builder, seguindo o estilo atual do painel.

### Ajuste com IA (`painel/lib/ia.ts`)

- Schema e contexto passam a incluir `funcoes`, `picos`, `intervaloMin` e, na equipe, `sexo`, `horasDia`, `naoFolgaCom`. Pedidos como "Ana e Bia não podem folgar juntas" passam a gravar a regra (`naoFolgaCom` + `remontar: true`) em vez de editar células.
- Trechos de lei: art. 71 (já existe) e art. 386 (já existe) citados nos alertas novos.

### Testes

- Regressão: estado sem campos novos gera a mesma grade que antes (comparar com a saída atual em cenários de `tests/`).
- Motor: par não folga junto (A e B, inclusive fim de semana); mulher folga domingo em A ou B; pico de função coberto quando a equipe permite e alertado quando não; jornada própria respeita horas/dia e horas/semana; intervalo 2 h alonga o turno e recalcula cobertura.
- `tests/painel.migracao.mjs`: contas antigas normalizam sem mudar a escala.
- e2e do painel: cadastrar função, pico, sexo, par; alertas aparecem.

## Ordem de entrega (cada uma com deploy próprio)

1. Não folgar junto + mulher no domingo (regras de folga, alertas, IA).
2. Jornada própria por pessoa + intervalo 1 h/2 h.
3. Funções + horários de pico.

## Perguntas para o advogado (não implementadas)

1. Intervalo obrigatório de 2 h quando a empresa não fornece alimentação: qual o fundamento (artigo, súmula, convenção coletiva)? Vale para todas as categorias ou só para algumas?
2. A folga de domingo a cada 2 semanas para mulheres (CLT, art. 386) vale em qualquer ramo ou só no comércio? Há convenções que mudam isso?

## Pergunta para os empresários

- O horário de abertura e encerramento já existe por dia ("Horário de segunda" etc.). O que faltou: não acharam, ou querem algo diferente (ex.: horário da empresa diferente do horário de atendimento)?

## Decisões tomadas por mim (Claude), para o Carlos conferir

- Jornada própria só para menos (≤ versão) e sempre 2 folgas/semana.
- Sexo com opção "não informar"; sem informação, nenhuma regra de domingo extra.
- Pico sem função conta só no total de pessoas.
- Cargo continua texto na pessoa (compatível com contas e IA atuais); o catálogo é a fonte das opções.
- Entrega em 3 etapas, nesta ordem.
- Regra da mulher no domingo entra já como regra (o Carlos disse "acho que é o que a lei diz mesmo"); a pergunta ao advogado sobre o ramo fica aberta e, se ele disser que é só no comércio, restringimos depois.
- Jornada própria com `horasDia` = turno fixo de 5 dias dentro do motor; só `horas` = meio período de hoje.
- Prioridade: lei > 2 folgas > folga fixa/não pode > par > cobertura.
- Mulheres alternadas entre os grupos A/B do rodízio (só quando o sexo está preenchido).
- Picos contam na sugestão de contratação e nos custos.
