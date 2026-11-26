# Parte 2 — Jornada própria por pessoa + intervalo de 1 h ou 2 h · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O dono escolhe intervalo de refeição de 1 h ou 2 h para a empresa, e cada pessoa pode ter jornada própria (horas por dia e por semana menores que as da empresa), com a escala montada respeitando as duas coisas.

**Architecture:** O motor (`site/js/escala.js`) passa a receber `regras.intervaloMin` (60 ou 120) e, por funcionário, `horasDia`/`horasSemana`; turnos de quem tem jornada própria saem do mesmo gerador de turnos (abertura/meio/fechamento) com o tamanho da pessoa. O app (`site/app/app.js`) troca os "60" fixos do almoço por `state.intervaloMin`, põe quem tem `horasDia` no motor (não em `encaixarParciais`), impede que os reparos (11 h, virada, reserva) passem turno grande para quem tem jornada menor, e ganha os campos na tela e na IA.

**Tech Stack:** JavaScript ES2019 sem dependências (motor e app), Next.js/TypeScript no painel, testes Node + playwright-core.

**Spec:** `docs/superpowers/specs/2026-11-26-ajustes-escala-design.md` (seções "Dados", "Motor" — último item, "Intervalo de 1 ou 2 h", "Telas", "Ajuste com IA"; entrega 2).

## Global Constraints

- `site/js/escala.js` e `site/app/app.js`: ES2019, sem `?.`, `??`, import/export, campos privados.
- Conta sem `intervaloMin` e sem `horasDia` gera **exatamente** a mesma escala de hoje: `node tests/escala.motor.mjs` e a seção 13 do `app.e2e` continuam ok **sem regravar fixture**.
- `intervaloMin` só vale para turno de mais de 6 h e só com `intervalo === "fora"`; `"dentro"` (escalas antigas) fica como está.
- Intervalo: 60 ou 120 min (CLT, art. 71: 1 a 2 h). Nada obrigado por causa de alimentação (pergunta do advogado).
- Jornada própria: só **menor ou igual** à da versão; sempre 2 folgas/semana. `horasDia` ≥ jornada diária da versão = sem jornada própria nessa versão. Só `horas` (sem `horasDia`) = meio período de hoje, sem mudança.
- Lei citada só a partir de `LEIS` (app) / `painel/lib/leis.ts` (IA). Art. 71 já existe nos dois.
- Rodar testes: `node tests/escala.motor.mjs`; `PW=/home/carlosvpm/febracis/barueri-frontend/node_modules/playwright-core node tests/app.e2e.mjs`; painel: `cd painel && npm run build` (se der `SecurityFatalError`, rodar de novo) e `PW=… node tests/painel.e2e.mjs`; `node --experimental-strip-types tests/painel.migracao.mjs`.

## Review Focus

1. Reparos que trocam turnos entre pessoas (`repararDescanso`, `repararGuloso`, `repararVirada`) passando um turno de 9h24 para quem tem jornada de 6 h. Esperado: nunca. Teste na Task 4.
2. `horasDia` 8 com a versão de 40 h (jornada diária 8 h): na de 40 h a pessoa é integral comum; na de 42 h tem jornada própria de 8 h. Sem erro. Teste na Task 4.
3. `horas` menor que `horasDia × 5` (ex.: 6 h/dia e 24 h/semana): último turno encurtado e aviso; `horas` maior (ex.: 6 h/dia, 40 h) fica limitado a 30 h. Teste na Task 2.
4. Intervalo 2 h com dia curto (domingo 07–12): turno único sem intervalo de 2 h (5 h de presença = 15 min). Teste na Task 1.
5. IA devolvendo a equipe: quem tem jornada própria não pode perder `horas` nem `horasDia` (hoje o contexto manda `horas: 0` para quem não é meio período). Teste na Task 5.

---

### Task 1: Motor — intervalo de 1 h ou 2 h

**Files:**
- Modify: `site/js/escala.js` (`intervaloDe` ~33, `montarDias` ~145–190, `escalarDia` ~429)
- Test: `tests/escala.motor.mjs` (seção 5)

**Interfaces:**
- Produces: `intervaloDe(presencaMin: number, intervaloMin?: number) -> number` (exportado; `intervaloMin` 120 ou qualquer outro valor = 60). Entrada `regras.intervaloMin` (já tem padrão 60 em `gerarEscala`).

- [ ] **Step 1: testes (falham)**, seção `5. intervalo de 2 h`, com `V42_2 = { ...V42, intervaloMin: 120 }`:
  - `intervaloDe`: `intervaloDe(600, 120) === 120`, `intervaloDe(540, 120) === 120`, `intervaloDe(470, 120) === 60` (com 2 h ficaria ≤ 6 h de trabalho, então cai para o mínimo de 1 h), `intervaloDe(300, 120) === 15`, `intervaloDe(564) === 60`, `intervaloDe(564, 60) === 60`.
  - `intervalo 2 h: turno na loja = jornada + 2 h` — Padaria Exemplo (`PADARIA`, `CINCO`), semana A, `V42_2`: todo turno de seg a sáb tem `fim − inicio` = 624 min (8h24 + 2 h) ou é "Turno único"; `horasSemana` de cada pessoa ≤ 42.
  - `intervalo 2 h: dia curto não ganha 2 h` — `MERCADO` com `V42_2`, semana A: os turnos de domingo (07–12) são "Turno único" de 300 min.
  - `intervalo 1 h explícito = padrão` — `JSON.stringify` da grade de `MERCADO` com `{ ...V42, intervaloMin: 60 }` igual à de `V42`.
  - `aviso cita 2 h` — algum aviso contém `"precisam de 2 h de intervalo"`.
- [ ] **Step 2:** `node tests/escala.motor.mjs` → falham os casos novos; regressão ok.
- [ ] **Step 3: implementar.**
  - `intervaloDe(pres, im)`: `im = im === 120 ? 120 : 60`; se `pres − 15 <= 360` devolve `pres > 240 ? 15 : 0` (igual hoje); senão `pres − im > 360 ? im : 60`.
  - `montarDias`: `im` de `regras.intervaloMin`; o acréscimo de `maxMin` com `fora` usa `im` no lugar de 60; `almocoH += pessoas * intervaloDe(t.fim − t.inicio, im) / 60` quando o intervalo ≥ 60; guardar `info[d].intervaloMin = im`.
  - `escalarDia`: horas do turno com `intervaloDe(pres, dia.intervaloMin)`.
- [ ] **Step 4:** `node tests/escala.motor.mjs` → `Tudo ok` (regressão sem regravar).
- [ ] **Step 5:** Commit: `Motor: intervalo de refeição de 1 h ou 2 h`.

### Task 2: Motor — jornada própria por pessoa

**Files:**
- Modify: `site/js/escala.js` (`montarDias`, `escalarDia`, limite semanal em `gerarEscala` ~583–600, doc da entrada, `module.exports`)
- Test: `tests/escala.motor.mjs` (seção 6)

**Interfaces:**
- Consumes: `intervaloDe(pres, im)` (Task 1).
- Produces:
  - `turnosDoDia(abre: number, fecha: number, maxMin: number) -> [{rotulo, inicio, fim}]` — a lógica de turnos que hoje está dentro de `montarDias` (Turno único / Abertura+Fechamento / Abertura+Meio+Fechamento), exportada; `montarDias` passa a chamá-la.
  - `presencaDe(trabMin: number, fora: boolean, im: number) -> number` — trabalho + intervalo (mesma regra do acréscimo de `montarDias`: `> 360` → `im`, `> 240` → 15).
  - Entrada por funcionário: `horasDia` (horas de trabalho por dia; vale só se `> 0` e `< regras.jornadaDiariaMax`) e `horasSemana` (limite semanal; vale só se `> 0`; limite efetivo = `min(horasSemana, regras.jornadaSemanal)`).

- [ ] **Step 1: testes (falham)**, seção `6. jornada própria`, Padaria Exemplo (`SETE`, 7 dias 06–19, 2 pessoas), V42, semanas A e B, Ana com `horasDia: 6`:
  - `jornada própria: turnos da Ana com 6 h de trabalho` — todo turno da Ana tem 420 min na loja (6 h + 1 h) e começa na abertura (06:00) ou termina no fechamento (19:00); 5 turnos; `horasSemana` 30.
  - `jornada própria: os outros seguem a jornada da empresa` — Bia..Edu com turnos de 564 min (8h24 + 1 h) ou reserva.
  - `jornada própria: horasSemana menor encurta com aviso` — Ana `horasDia: 6, horasSemana: 24`: `horasSemana` 24 e aviso `/Ana passaria de 24 h na semana/`.
  - `jornada própria: horasSemana maior fica em 5 × horasDia` — Ana `horasDia: 6, horasSemana: 40`: `horasSemana` 30, sem aviso de "passaria".
  - `jornada própria com 2 h de intervalo` — Ana `horasDia: 7`, `V42_2`: turnos da Ana de 540 min (7 h + 2 h).
  - `horasDia igual ou acima da jornada diária = integral` — Ana `horasDia: 8.4` em V42: grade igual à sem `horasDia`.
- [ ] **Step 2:** rodar → falham os novos; regressão ok.
- [ ] **Step 3: implementar.**
  - Em `gerarEscala`, ao montar `funcionarios`: se `horasDia` válido, `p.presMin = presencaDe(Math.round(horasDia * 60), fora, im)`; `p.limite = min(horasSemana válido ou Infinity, regras.jornadaSemanal)`.
  - `escalarDia`: turnos da pessoa = `p.presMin ? turnosDoDia(dia.abre, dia.fecha, p.presMin) : dia.turnos`; o contador de gente por turno passa de índice para rótulo (`porRotulo[t.rotulo]`), o que dá o mesmo resultado para quem usa `dia.turnos` (rótulos únicos no dia).
  - Limite semanal: usar `p.limite` no lugar de `regras.jornadaSemanal` (comparação, corte e `horas = …`); aviso `p.nome + " passaria de " + fmtHoras(p.limite) + " na semana; os últimos turnos foram encurtados para caber na jornada."` (`fmtHoras(42)` = `"42 h"`, texto de hoje preservado).
  - Comentário de entrada de `gerarEscala`: documentar `horasDia`, `horasSemana`, `regras.intervaloMin`.
- [ ] **Step 4:** `node tests/escala.motor.mjs` → `Tudo ok`.
- [ ] **Step 5:** Commit: `Motor: jornada própria por pessoa (horas por dia e por semana)`.

### Task 3: App — intervalo de 1 h ou 2 h

**Files:**
- Modify: `site/app/app.js` (`normalizar` ~138, `regrasMotor` 65, `pausaMin` 66, `almocoIni`/`presencas`/`textoAlmoco` 69–82, `entradaMotor` ~235, `encaixarParciais` ~273–297, `marcarAlmocos` ~328–350, texto ~1019, `#dlgDur` ~1216, padrão ~1202, `turnoDoGrupo` ~2252, `renderCfg`, listeners de configuração ~1390, `contextoIA` regras ~1679), `site/app/index.html` (cfg, depois da tabela de horário)
- Test: `tests/app.e2e.mjs` (seção 18)

**Interfaces:**
- Consumes: `intervaloDe(pres, im)` (Task 1, global no browser).
- Produces: `state.intervaloMin` (60|120); `imin(s) -> 60|120`; `pausaMin(c, s)` devolve até 120; `#fIntervalo` (select).

- [ ] **Step 1: testes (falham)**, seção `18. intervalo de 2 h`:
  - `normalizar` sem campo → `intervaloMin === 60`; com `120` → 120; com `90` → 60.
  - Padaria Exemplo (7 dias 06–19) com `intervalo: "fora", intervaloMin: 120` e `gerarTudo`: todo turno de quem é integral tem duração = jornada + 2 h ou é turno único; `calcular(s,"42",w).pessoas[i].horas ≤ 42`; carregado na tela, cada célula de turno com almoço mostra `alm. Xh–Yh` com Y − X = 2.
  - `intervalo "dentro"` com `intervaloMin: 120`: `gerarTudo` igual ao mesmo estado com `intervaloMin: 60`.
  - Tela: abrir a configuração, trocar `#fIntervalo` para 2 h → `state.intervaloMin === 120`, escala remontada (turnos de 624 min na 42 h), dica com botão Desfazer; clicar Desfazer → `intervaloMin === 60` e escala de antes.
  - Com `intervalo: "dentro"`, `#fIntervalo` fica `disabled`.
- [ ] **Step 2:** rodar `app.e2e` → falham os novos; seção 13 ok.
- [ ] **Step 3: implementar.**
  - `normalizar`: `s.intervaloMin = Number(s.intervaloMin) === 120 ? 120 : 60`.
  - `imin(s)`; `regrasMotor` e `entradaMotor.regras` ganham `intervaloMin: imin(s)`; `pausaMin` usa `intervaloDe(…, imin(s))`.
  - `almocoIni`, `presencas`, `textoAlmoco`, `marcarAlmocos`: o tamanho do almoço é `L = pausaMin(c, s)` (no lugar dos `60` literais); a condição "tem almoço" continua `pausaMin(c, s) >= 60`; em `marcarAlmocos` a janela vai de 1h30 depois da entrada a 1h30 antes da saída com almoço de `L`, e o almoço desconta `L/30` blocos do contador (hoje desconta 2).
  - `encaixarParciais`: `liq` com `intervaloDe(pres, imin(s))` e `limPres` com `imin(s)` no lugar de 60. `turnoDoGrupo` e o turno padrão do diálogo de célula: acréscimo com `imin(s)`.
  - Textos: "(… na loja, com 1 h de almoço)" → `hm(R.jornadaDiariaMax + imin/60)` e `hm(imin/60)`; `#dlgDur` mostra `hm(p/60)` de almoço.
  - `contextoIA.regras` ganha `intervaloMin`.
  - Tela: em `index.html`, depois de `#tblHorario`, `<label class="cfg-int">Intervalo para refeição <select id="fIntervalo"><option value="60">1 h</option><option value="120">2 h</option></select><small>Turno de mais de 6 h tem de 1 a 2 h de intervalo, que não conta como hora trabalhada (CLT, art. 71).</small></label>`. `renderCfg` preenche o valor e põe `disabled` (com `title` "vale quando o almoço fica fora do turno") se `state.intervalo === "dentro"`. No `change`: `snap = JSON.stringify(state)`, `state.intervaloMin = …`, `gerarTudo(state)`, `state.pendente = false`, `salvar(); render();`, `desfazerSnap = snap`, `dica("Intervalo de " + hm(…) + ": escala montada de novo.", botão Desfazer)` no padrão de `aplicarPlano`.
- [ ] **Step 4:** `app.e2e` → `Tudo ok` (seção 13 sem regravar).
- [ ] **Step 5:** Commit: `Painel: intervalo de refeição de 1 h ou 2 h`.

### Task 4: App — jornada própria

**Files:**
- Modify: `site/app/app.js` (`normalizar`, `parcial`/`limiteSemana` ~208, nova `jornadaPropria`, `entradaMotor`, `gerar` ~240–257, `repararDescanso`/`repararGuloso` chamada, `repararVirada` trocas ~600, `cobrirComReserva` ~357–410, `custoPessoa` ~745, `calcular` diário ~674, chip ~990, `renderCfg` tabela equipe, listener `data-e` ~1362, `abrirPessoa`/`salvarPessoa`, `turnoDoGrupo` + chamadas ~2250–2290), `site/app/index.html` (`dlgP`), `window.__j40h` (exportar `jornadaPropria`)
- Test: `tests/app.e2e.mjs` (seção 19)

**Interfaces:**
- Consumes: entrada `horasDia`/`horasSemana` e `turnosDoDia`, `presencaDe` (Task 2); `imin(s)` (Task 3).
- Produces:
  - `pessoa.horasDia: number|null` (0 < x ≤ 8.4, arredondado a 0,1; `normalizar` e IA).
  - `jornadaPropria(p, v) -> boolean` = `horasDia > 0 && horasDia < VERSOES[v].jornadaDiariaMax − 1e-9`.
  - `parcial(p, v)` = `!jornadaPropria(p, v) && (regra de hoje)`.
  - `limiteSemana(p, v)` = parcial → `horas`; jornada própria → `min(horas > 0 ? horas : ∞, horasDia × 5, jornadaSemanal)`; senão `jornadaSemanal`.
  - `diaMax(p, v) -> horas` = jornada própria → `horasDia`; senão `jornadaDiariaMax`.

- [ ] **Step 1: testes (falham)**, seção `19. jornada própria`, Padaria Exemplo 7 dias 06–19, 2 pessoas, 5 pessoas, Ana `horasDia: 6`:
  - `normalizar`: `horasDia: "6"` → 6; `9` → 8.4; `0`/vazio → null; conta sem o campo → null.
  - Depois de `gerarTudo`, nas versões 42 e 40 e semanas A e B: todo turno da Ana tem `trab ≤ 6` (via `calcular(...).pessoas[0].horas ≤ 30` e cada célula de turno com duração 7 h), Ana tem 2 folgas, nenhuma célula de outra pessoa com 7 h (reparos não trocaram turnos entre tamanhos).
  - `limiteSemana`: Ana `horasDia 6, horas 24` → `calcular(...).pessoas[0].limite === 24` e horas ≤ 24.
  - `horasDia: 8` → `jornadaPropria(p,"40") === false`, `jornadaPropria(p,"42") === true`; `gerarTudo` sem erro de JS.
  - Custo: Ana sem salário com `horasDia 6` → `custoPessoa` = média × encargos × 30/42 (via `metricas(s).folha` comparado à mesma equipe sem `horasDia`, diferença = média × encargos × (1 − 30/42)).
  - Tela: abrir a pessoa, preencher `#pHorasDia` = 6, salvar → `state.equipe[0].horasDia === 6`, `state.pendente === true`, chip da pessoa com "6 h/dia".
  - Alerta diário: célula da Ana editada para 9 h de trabalho → `calcular` tem aviso `/Ana faz .* acima da jornada própria de 6 h por dia/`.
- [ ] **Step 2:** rodar → falham os novos.
- [ ] **Step 3: implementar.**
  - `normalizar`: `horasDia` como na Interfaces.
  - `entradaMotor`: para `jornadaPropria(p, v)`, `f.horasDia = Number(p.horasDia)` e `f.horasSemana = limiteSemana(p, v)`.
  - `gerar`: `repararDescanso` roda **por grupo de tamanho** — agrupar `integrais` por `diaMax(p, v)` e chamar `repararDescanso(g, ids)` para cada grupo (um grupo só quando ninguém tem jornada própria → mesma chamada de hoje).
  - `repararVirada`: só considera trocar entre `a` e `b` com o mesmo `diaMax`.
  - `cobrirComReserva`: limite semanal `limiteSemana(p, v)` no lugar de `R.jornadaSemanal`; para quem tem jornada própria, candidatos = `turnosDoDia(dia.abre, dia.fecha, presencaDe(horasDia×60, fora, imin))` + o sob medida com esse tamanho.
  - `custoPessoa`: proporção `limiteSemana(p, v) / jornadaSemanal` quando parcial **ou** jornada própria.
  - `calcular`: se `jornadaPropria` e `du > horasDia + 1e-9` (e não passou do máximo legal), aviso `nome + " faz " + horas(du) + " " + prep(d) + ": acima da jornada própria de " + horas(horasDia) + " por dia."` (sem citar lei). Texto do limite semanal: quando `lim < jornadaSemanal` e é jornada própria, "das X da jornada própria" no lugar de "do contrato de meio período".
  - Chip: tag `horasDia + " h/dia"` (e `limite + " h"` se `horas` encurtou) para jornada própria.
  - `dlgP`: o campo atual vira `Horas por semana` (`#pHoras`) + `Horas por dia` (`#pHorasDia`, `type=number min=1 max=8.4 step=0.1`); nota única abaixo: "Vazio = jornada da empresa. Só horas por semana: meio período, nos horários que faltam. Com horas por dia: turno desse tamanho, 5 dias por semana." `salvarPessoa` grava e `marcarPendente()` se mudou.
  - Tabela da configuração: coluna `Horas/dia` (`data-e="horasDia"`), tratada no listener como `horas`.
  - `turnoDoGrupo(g, d, faixa, p)`: tamanho `J` = presença de `diaMax(p)`; chamadas passam a pessoa arrastada.
  - Exportar `jornadaPropria` e `custoPessoa` em `window.__j40h` se o teste usar.
- [ ] **Step 4:** `app.e2e` → `Tudo ok` (seção 13 sem regravar).
- [ ] **Step 5:** Commit: `Painel: jornada própria por pessoa`.

### Task 5: Ajuste com IA

**Files:**
- Modify: `painel/lib/ia.ts` (schema `proposta` e `equipe`, regras do prompt ~105 e ~126, tipos dos mocks), `site/app/app.js` (`contextoIA` equipe ~1682, `aplicarProposta` ~1725)
- Test: `tests/app.e2e.mjs` (seção 20), `tests/painel.e2e.mjs` (rodar)

**Interfaces:**
- Consumes: `horasDia`, `intervaloMin`, `jornadaPropria`, `limiteSemana` (Tasks 3–4).

- [ ] **Step 1: testes (falham)**, seção `20. IA: jornada e intervalo`:
  - `contextoIA()` com Ana `horasDia 6, horas 24`: equipe[0] tem `horasDia: 6` e `horas: 24`; `regras.intervaloMin` presente.
  - `aplicarProposta` devolvendo o contexto sem mudança (equipe e `intervaloMin` iguais) → Ana continua `horasDia 6, horas 24`; proposta sem `horasDia` → mantém o antigo; proposta com `intervaloMin: 120` → estado com 120 e escala remontada.
- [ ] **Step 2:** rodar → falham.
- [ ] **Step 3: implementar.**
  - Schema `equipe`: `required` ganha `"horasDia"`; `horasDia: { type: "number", description: "horas de trabalho por dia de quem tem jornada própria menor que a da empresa (ex.: 6); 0 = jornada da empresa" }`. `proposta.required` ganha `"intervaloMin"`: `{ type: "integer", enum: [60, 120], description: "intervalo de refeição em minutos para turno de mais de 6 h (CLT, art. 71: 1 a 2 h); repita o atual se o pedido não falar disso" }`.
  - Prompt: na linha do almoço fora da jornada, "faça o turno na loja com a jornada + o intervalo (regras.intervaloMin)"; nova regra "Jornada própria (ex.: \"a Ana só pode 6 h por dia\"): preencha horasDia (e horas, se o dono der a semana) e use remontar: true; a pessoa trabalha 5 dias com turno desse tamanho. Só pode ser menor que a jornada da empresa." Intervalo: "Se o dono pedir intervalo de 2 h (ou 1 h), mude intervaloMin e use remontar: true."
  - `contextoIA.equipe`: `horas` = `parcial || jornadaPropria ? Number(p.horas) || 0 : 0`; `horasDia: jornadaPropria(p, s.versao) ? Number(p.horasDia) : 0` — para a de 40 h, `horasDia` guardado ≥ 8 também vai (usar `Number(p.horasDia) || 0`, a IA não decide versão).
  - `aplicarProposta`: copia `horasDia` (0 → null; ausente → antigo; mesmo arredondamento de `normalizar`); `intervaloMin` 60|120 → `s.intervaloMin`; `antesEstr` inclui `s.intervaloMin`.
  - Mocks: tipos aceitam `horasDia`; `proposta.intervaloMin` = o do contexto (ou 60).
- [ ] **Step 4:** `app.e2e` → `Tudo ok`; `cd painel && npx tsc --noEmit` sem erro; `npm run build`; `PW=… node tests/painel.e2e.mjs` → `Tudo ok`.
- [ ] **Step 5:** Commit: `IA: jornada própria e intervalo de 1 h ou 2 h`.

### Task 6: Publicar e registrar

- [ ] **Step 1:** Todos os testes (motor, app, painel, migração) → ok.
- [ ] **Step 2:** `git push`; deploy de `kNdTSocrJr7R4pnaMCHYp` (site) e `3pIYhzuukWAjezYlwAKyp` (painel) via `application.deploy`; `deployment.all` até `done`.
- [ ] **Step 3:** Produção: `/app/` e `/painel/login` 200; `/app/` com estado de teste (Ana 6 h/dia, intervalo 2 h): turnos certos e 0 erro de JS; conta do Gustavo intacta.
- [ ] **Step 4:** `docs/ESTADO.md`: entrega da parte 2. Commit e push.
