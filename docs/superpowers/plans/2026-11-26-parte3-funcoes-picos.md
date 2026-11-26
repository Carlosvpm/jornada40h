# Parte 3 — Funções cadastradas + horários de pico · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O dono cadastra as funções da empresa e horários de pico ("seg a sex, 11h–14h, 1 caixa"); a escala cobre esses mínimos quando a equipe permite e alerta quando não.

**Architecture:** Picos viram uma necessidade por bloco de 30 min (`total` = máximo entre as pessoas do dia e a soma dos picos; `porFuncao`). O motor recebe os picos e prioriza a função faltante ao escolher turnos e folgas; o app troca as leituras de `f.pessoas` nas contas de cobertura por `necessidade(s, d, t)`, confere picos por função na grade final, e ganha telas e IA.

**Tech Stack:** JavaScript ES2019 (motor e app), Next.js/TypeScript no painel, testes Node + playwright-core.

**Spec:** `docs/superpowers/specs/2026-11-26-ajustes-escala-design.md` (seções "Dados", "Necessidade por bloco", "Motor", "Alertas", "Telas", "Ajuste com IA"; entrega 3).

## Global Constraints

- ES2019 em `site/js/escala.js` e `site/app/app.js` (sem `?.`, `??`).
- Sem picos, a escala é **idêntica** à de hoje (fixtures `tests/fixtures/*.json` sem regravar).
- `state.funcoes = [{ id, nome }]`; `state.picos = [{ id, dias: ["seg",…], inicio: "HH:MM", fim: "HH:MM", funcao: "<id>" | "", pessoas: 1..50 }]`. `pessoa.funcao` continua texto; função da pessoa = função do catálogo com o mesmo nome (sem diferenciar maiúsculas e espaços nas pontas).
- `total` do bloco = `max(pessoas do dia, soma de todos os picos que cobrem o bloco)`; pico sem função conta só no total.
- Picos contam na sugestão de contratação e nos custos; a contratação sai sem função; o alerta diz qual função falta.
- Alerta de pico: `"<Dia> <ini>–<fim>: falta <n> <função>"` (ex.: "Segunda 11h–14h: falta 1 caixa").
- Prioridade: lei > 2 folgas > folga fixa/não pode > par > cobertura (total e picos).
- Testes: `node tests/escala.motor.mjs`; `PW=/home/carlosvpm/febracis/barueri-frontend/node_modules/playwright-core node tests/app.e2e.mjs`; painel `cd painel && npm run build` (repetir se `SecurityFatalError`) + `PW=… node tests/painel.e2e.mjs`; `node --experimental-strip-types tests/painel.migracao.mjs`.

## Decisões deste plano

- Pico de função descoberto entra em alertas, `metricas`/`problemas` (antes/depois), mas **não** em `problemasLei`/`totalProblemas` (revisão ao entrar é de lei; `corrigirLei` não resolve pico).
- Função na tela da pessoa e na tabela: campo de texto com `datalist` do catálogo (escolher ou digitar nova); nome novo entra no catálogo ao salvar.
- Na IA, `picos[].funcao` vai e volta pelo **nome** da função (o app converte para id).
- Remover função do catálogo só se nenhuma pessoa nem pico usa.

## Review Focus

1. Almoço do único caixa caindo dentro do pico de caixa: o almoço deve ir para fora do pico quando o turno permite. Teste na Task 3.
2. Pico que passa do horário de funcionamento (ex.: 18h–20h com fecha 19h): conta só dentro do aberto, sem erro. Teste na Task 2.
3. Função renomeada no catálogo: pessoas com o nome antigo passam ao novo, e o pico continua apontando para ela. Teste na Task 4.
4. Pico com função que ninguém tem: alerta do pico, sem travar a montagem. Teste na Task 3.
5. Simulação de contratação e "Contratar" com picos: a falta medida inclui o pico. Teste na Task 3.

---

### Task 1: Motor — picos

**Files:** Modify `site/js/escala.js` (`montarDias`, `criarBlocos`, `ganhoTurno`/`aplicarTurno`, `escalarDia`, `distribuirFolgas` passo 3, `gerarEscala` entrada/cobertura). Test `tests/escala.motor.mjs` (seção 8).

**Interfaces:**
- Produces: entrada `input.picos = [{ dias, inicio, fim, funcao: "<nome>"|"", pessoas }]`; bloco ganha `porFuncao: { <nome normalizado>: n }` e `necessario` = total; `normFuncao(nome) -> string` (trim + minúsculas), exportada.

- [ ] **Step 1: testes (falham)**, seção `8. picos`:
  - `pico total`: `SEG_SAB` 06–19, 2 pessoas, pico `{ dias: SEG_SEX, inicio: "11:00", fim: "14:00", funcao: "", pessoas: 3 }`, 7 pessoas: em seg, `cobertura.seg.blocos` das 11:00 às 13:30 com `necessario === 3` e os outros com 2; `escalado >= 3` nesses blocos.
  - `pico por função`: 7 dias 06–19, 2 pessoas, Ana e Bia `funcao: "Caixa"`, Caio/Duda/Edu/Fabio "atendente"; pico `{ dias: SEG_SEX, 11:00–14:00, funcao: "caixa", pessoas: 1 }`. Semanas A e B: em cada dia seg–sex há uma das caixas com turno cobrindo 11:00–14:00 (`inicio <= 11:00` e `fim >= 14:00`).
  - `pico fora do horário`: pico 18:00–20:00 com fecha 19:00 → só blocos 18:00 e 18:30 sobem; sem erro.
- [ ] **Step 2:** rodar → falham os novos; regressão ok.
- [ ] **Step 3: implementar.**
  - `criarBlocos(dia, picos, d)`: para cada bloco, soma dos picos de `d` cujo intervalo `[inicio, fim)` (no eixo do dia: início antes de `abre − 120` soma 1440; fim ≤ início soma 1440) contém o bloco; `necessario = max(dia.pessoas, soma)`; `porFuncao[norm] += pessoas` dos picos com função; `escFuncao = {}`.
  - `montarDias`: com picos no dia, `demanda` usa a soma de `necessario × 0,5` dos blocos (+ `almocoH`); sem picos, como hoje.
  - `escalarDia`: ganho do turno para `p` = blocos com falta no total + 2 × blocos onde `escFuncao[f] < porFuncao[f]` (f = função de p); `aplicarTurno(blocos, turno, f)` soma em `escFuncao[f]`. Sem picos o termo extra é zero.
  - `distribuirFolgas` passo 3: custo da folga de `p` no dia `d` soma 1000 quando as pessoas disponíveis com a função de `p` no dia, menos ela, ficam abaixo do maior `porFuncao` daquela função no dia.
  - Cobertura pública (`cobertura[d].blocos`) leva `necessario` por bloco (já leva).
- [ ] **Step 4:** `node tests/escala.motor.mjs` → `Tudo ok`.
- [ ] **Step 5:** Commit `Motor: horários de pico por função`.

### Task 2: App — dados e necessidade

**Files:** Modify `site/app/app.js` (`normalizar`, nova `necessidade`, `entradaMotor`, `encaixarParciais` ~337, `cobrirComReserva` ~419, `calcular` ~705, `contaTurnos` ~780, "pede" ~1089/~2569, `simularContratacao`, `window.__j40h`). Test `tests/app.e2e.mjs` (seção 22).

**Interfaces:**
- Produces: `funcaoDe(s, p) -> {id,nome}|null`; `necessidade(s, d, t) -> { total, porFuncao: { <id>: n } }` (t em minutos no eixo do dia); `calcular(...).picos = [{ d, funcao: <nome>, def, ini, fim }]` (faixas por função); `normalizar` garante `funcoes` e `picos`.

- [ ] **Step 1: testes (falham)**, seção `22. funções e picos (dados)`:
  - `normalizar` do `estado` do topo: `funcoes` = atendente e caixa (2 itens, ids únicos); pico com `funcao: "zz"` vira `""`; pico com `inicio === fim` ou hora inválida some; `pessoas` 0 vira 1.
  - `necessidade(s, "seg", 12*60)` com pico total 3 → `total 3`; com pico caixa 1 → `porFuncao[idCaixa] === 1`; fora do pico → `total` = pessoas do dia.
  - Pico total de 4 das 11h às 14h em seg com equipe de 5: `calcular(s,"42","A").falta` maior que sem pico.
  - Pico 18:00–20:00 com fecha 19:00: sem erro de JS, `calcular` ok.
- [ ] **Step 2:** rodar → falham.
- [ ] **Step 3: implementar.**
  - `normalizar`: `funcoes` válidas (nome não vazio, dedup por nome normalizado) + uma para cada `pessoa.funcao` sem correspondente; `picos` validados como nas Global Constraints (ids com `uid()` se faltar).
  - `entradaMotor`: `picos` com `funcao` = nome da função (ou "").
  - `necessidade`: mesmo cálculo da Task 1, com `porFuncao` por id; trocar `need` por bloco em `encaixarParciais`, `cobrirComReserva`, `calcular` (blocos e faixas usam `total`).
  - `calcular`: além da cobertura total, por bloco conta quem está presente de cada função com pico (`presencas` + `funcaoDe`) e gera `res.picos` em faixas contínuas com o mesmo déficit.
  - `contaTurnos`: `n = turnos × pessoas + max(0, maior total do dia − pessoas)`.
  - "pede" (texto de horas pedidas): soma `total × 0,5` dos blocos.
  - `simularContratacao`: `s2` leva `funcoes` e `picos`; chave do cache inclui `picos`.
  - Exportar `necessidade` em `__j40h`.
- [ ] **Step 4:** `app.e2e` → `Tudo ok` (seção 13 sem regravar).
- [ ] **Step 5:** Commit `Painel: funções e horários de pico nos dados e na cobertura`.

### Task 3: App — almoço, alertas e antes/depois

**Files:** Modify `site/app/app.js` (`marcarAlmocos`, `renderAlertas`, `metricas`, `problemas`). Test seção 22 (continua).

**Interfaces:** Consumes `necessidade`, `funcaoDe`, `calcular().picos` (Task 2). Produces `metricas(s).picos` (horas de pico por função descobertas na semana da tela) e `textoPico(x) -> string`.

- [ ] **Step 1: testes (falham):**
  - Almoço: equipe do topo (Duda e Edu caixas), pico caixa 1 pessoa seg–sex 11–14: em todo dia em que um caixa cobre o pico sozinho, o almoço dele não cai dentro de 11:00–14:00.
  - Alerta: pico caixa 3 pessoas seg 11–14 (só há 2 caixas) → `#alertas` contém `/Segunda 11h–14h: faltam? \d caixa/`.
  - Pico com função que ninguém tem ("padeiro", 1) → alerta "falta 1 padeiro", sem erro de JS.
  - `metricas(s).picos > 0` no caso acima; `problemas(antes, depois)` com mais pico descoberto contém `"pico"`.
  - Contratar: com pico total alto, `opContratar(s)` existe (a falta inclui o pico).
- [ ] **Step 2:** rodar → falham.
- [ ] **Step 3: implementar.**
  - `marcarAlmocos`: a sobra de um horário de almoço = mínimo entre a sobra total (`n − total`) e, se a pessoa tem função com pico no bloco, a sobra da função (presentes da função − `porFuncao`). Sem picos, igual a hoje.
  - `textoPico`: `NOME_DIA[d] + " " + falada(ini) + "–" + falada(fim) + ": " + (def === 1 ? "falta 1 " : "faltam " + def + " ") + funcao`.
  - `renderAlertas`: um `<li>` por faixa de `calc.picos`.
  - `metricas.picos` (soma `def × horas`); `problemas`: `"mais X h de pico sem a função pedida"` quando sobe.
- [ ] **Step 4:** `app.e2e` → `Tudo ok`.
- [ ] **Step 5:** Commit `Painel: almoço fora do pico e alerta de pico por função`.

### Task 4: Telas — funções e horários de pico

**Files:** Modify `site/app/index.html` (cfg: seções "Funções" e "Horários de pico"; `datalist#listaFuncoes`), `site/app/app.js` (`renderCfg`, listeners da configuração, `abrirPessoa`/`salvarPessoa`, tabela da equipe), `site/app/app.css` se preciso. Test seção 24.

- [ ] **Step 1: testes (falham)**, seção `24. telas de função e pico`:
  - Configuração: "+ Adicionar função" e escrever "Padeiro" → `state.funcoes` tem Padeiro.
  - Renomear "caixa" para "Operador de caixa" → Duda e Edu ficam com `funcao: "Operador de caixa"` e o pico de caixa continua com o mesmo id.
  - Remover função usada: botão desativado; função sem uso: some.
  - "+ Adicionar horário de pico": linha nova; marcar seg e ter, 11:00–14:00, função caixa, 2 pessoas → `state.picos[0]` igual a isso e `state.pendente === true`; remover a linha → `picos` vazio.
  - Ficha da pessoa: `#pFuncao` com `list="listaFuncoes"`; salvar com "Confeiteiro" → catálogo ganha Confeiteiro.
- [ ] **Step 2:** rodar → falham.
- [ ] **Step 3: implementar.** Seções depois da tabela de horário (o intervalo fica junto do horário). Funções: lista de inputs (renomear no `change`: atualiza pessoas com o nome antigo), `×` desativado com `title` "em uso" quando usada por pessoa ou pico. Picos: tabela com chips de dias (`chipsDias`), `time` das/às, `select` função ("qualquer função" + catálogo), `number` pessoas (1–50), `×`; mudanças chamam `marcarPendente()` e `salvar()`. Texto curto acima dos picos: "Horários em que precisa de mais gente ou de uma função (ex.: 1 caixa das 11h às 14h). Valem quando a escala é montada de novo." `datalist#listaFuncoes` atualizado em `renderCfg`.
- [ ] **Step 4:** `app.e2e` → `Tudo ok`; screenshot da configuração para conferir.
- [ ] **Step 5:** Commit `Painel: telas de funções e horários de pico`.

### Task 5: Ajuste com IA

**Files:** Modify `painel/lib/ia.ts` (schema `proposta.funcoes`, `proposta.picos`, prompt, mocks), `site/app/app.js` (`contextoIA`, `aplicarProposta`). Test seção 23 + painel.

- [ ] **Step 1: testes (falham)**, seção `23. IA: funções e picos`: `contextoIA` traz `funcoes` (nomes) e `picos` com `funcao` por nome; `aplicarProposta` com `picos: [{ dias: ["seg"], inicio: "11:00", fim: "14:00", funcao: "caixa", pessoas: 1 }]` → `state.picos[0].funcao` = id do caixa; com `funcao: "Gerente"` (não existe) → catálogo ganha Gerente; proposta sem `picos` mantém os atuais.
- [ ] **Step 2:** rodar → falham.
- [ ] **Step 3: implementar.** Schema: `funcoes: array de string` (nomes), `picos: array de { dias: array de dia, inicio: hora, fim: hora, funcao: string ("" = qualquer), pessoas: integer }`, ambos em `required`. Prompt: "Horário de pico (ex.: \"preciso de 1 caixa das 11h às 14h de segunda a sexta\"): grave em picos com funcao = nome da função (deixe vazio para qualquer função), mantenha os outros picos e use remontar: true. Função nova entra em funcoes. Repita funcoes e picos atuais se o pedido não mexer neles." Conferência: `semanasIA` ganha `picosDescobertos` (lista de `textoPico`). Mocks repetem `funcoes`/`picos` do contexto.
- [ ] **Step 4:** `app.e2e` ok; `npx tsc --noEmit`; build; `painel.e2e` → `Tudo ok`.
- [ ] **Step 5:** Commit `IA: funções e horários de pico`.

### Task 6: Publicar e registrar

- [ ] Todos os testes ok → revisão final → merge, push, deploy dos 2 apps (`application.deploy`, `deployment.all` até `done`) → produção: `/app/` com pico de caixa, alerta e 0 erro de JS → `docs/ESTADO.md`.
