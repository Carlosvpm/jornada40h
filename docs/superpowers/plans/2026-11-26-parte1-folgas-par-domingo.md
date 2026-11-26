# Parte 1 — Não folgar junto + mulher no domingo · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pares de pessoas que nunca folgam no mesmo dia e folga de domingo da mulher a cada 2 semanas viram regras do motor, com alertas conferidos na grade final, cadastro na tela da pessoa e suporte no Ajuste com IA.

**Architecture:** O motor (`site/js/escala.js`, `distribuirFolgas`) passa a receber `sexo` e `naoFolgaCom` (por nome) em cada funcionário e decide as folgas respeitando a prioridade lei > 2 folgas > folga fixa/não pode > par > cobertura. O app (`site/app/app.js`) guarda os campos por id, traduz para o motor, inclui as regras na nota de `repararVirada` e gera alertas a partir da grade final (vale para edição manual e IA). A IA (`painel/lib/ia.ts`) ganha os campos no schema.

**Tech Stack:** JavaScript ES2019 sem dependências (motor e app, roda também no Apps Script), Next.js/TypeScript no painel, testes Node + playwright-core.

**Spec:** `docs/superpowers/specs/2026-11-26-ajustes-escala-design.md` (seções "Motor", "Ordem de prioridade", "Grupos do rodízio com mulheres", "Alertas", "Telas", "Ajuste com IA"; entrega 1).

## Global Constraints

- `site/js/escala.js` e `site/app/app.js`: sintaxe ES2019, sem `?.`, `??`, import/export, campos privados.
- Conta sem `sexo` e sem `naoFolgaCom` gera **exatamente** a mesma escala de hoje (fixture de regressão).
- Prioridade quando as regras brigam: 1) domingo da mulher e 11 h entre jornadas; 2) 2 folgas/semana; 3) folga fixa e "não pode"; 4) não folgar junto; 5) cobertura. Quem perde vira aviso/alerta com nome e dia.
- Regra da mulher: com domingo aberto, folga no domingo em pelo menos uma das semanas A/B (CLT, art. 386). Sem `sexo: "F"`, nenhuma regra nova de domingo.
- Dia fechado não conta como "folgar junto".
- Textos sem gênero presumido ("folgam no mesmo dia"); IA nunca deduz sexo pelo nome.
- Lei citada só a partir de `LEIS` (app) / `painel/lib/leis.ts` (IA). Art. 386 já está em `leis.ts`.
- Rodar testes: `node tests/escala.motor.mjs`; `PW=/home/carlosvpm/febracis/barueri-frontend/node_modules/playwright-core node tests/app.e2e.mjs`; painel: `cd painel && npm run build` e depois `PW=… node tests/painel.e2e.mjs`.

## Review Focus

1. Par em que um dos dois é meio período (`horas` preenchido, vai por `encaixarParciais`): o motor não vê essa pessoa; espera-se só o alerta quando folgarem juntos, sem quebrar a montagem. Teste na Task 4.
2. Pessoa removida da equipe que ainda aparece em `naoFolgaCom` de outra: deve sumir da lista sem erro. Teste na Task 4 (normalizar) e Task 5 (remover pela tela).
3. Mulher com folga fixa no sábado e domingo aberto: precisa ganhar o domingo na semana do grupo dela ou aviso claro. Teste na Task 3.
4. Domingo fechado com mulheres na equipe: grupos A/B iguais aos de hoje e nenhum alerta de domingo. Teste na Task 3.
5. Nomes repetidos na equipe (o app acrescenta " ·" no nome para o motor): `naoFolgaCom` precisa apontar para o nome já desambiguado. Teste na Task 4.

---

### Task 1: Testes de regressão do motor e do app (antes de qualquer mudança)

**Files:**
- Create: `tests/escala.motor.mjs`, `tests/fixtures/motor-base.json`, `tests/fixtures/app-base.json`
- Modify: `tests/app.e2e.mjs` (nova seção 13 antes do teste "sem erro de JavaScript")

**Interfaces:**
- Produces: `tests/escala.motor.mjs` com `ok(cond, msg)` no padrão de `tests/app.e2e.mjs`, carregando o motor por `createRequire(import.meta.url)("../site/js/escala.js")`, e um helper `folgasDe(saida, nome) -> string[]` (dias com `tipo` diferente de `"turno"` e `"livre"`). Tasks 2 e 3 acrescentam casos nesse arquivo.

- [ ] **Step 1:** Em `tests/escala.motor.mjs`, seção "regressão": os 5 cenários de `engine/test.js` (copiar `func` e `CENARIOS`) + o estado da Padaria Exemplo (`seg–sáb 06–19, dom 07–13, 2 pessoas`, Ana/Bia/Caio/Duda/Edu) geram `gerarEscala` nas semanas A e B, com `regras: { jornadaSemanal: 42, jornadaDiariaMax: 8.4, intervaloFora: true }` e com `{ jornadaSemanal: 40, jornadaDiariaMax: 8, intervaloFora: true }`. Compara `JSON.stringify({grade, avisos})` de cada caso com `tests/fixtures/motor-base.json`; com `--gravar`, grava o arquivo em vez de comparar.
- [ ] **Step 2:** Em `tests/app.e2e.mjs`, seção `13. regressão da montagem`: no browser, `J.gerarTudo(s)` para (a) o `estado` do topo do arquivo, (b) o mercado de 9 pessoas da seção 12, (c) a Padaria Exemplo de 5 pessoas; ids fixos `p0…`. Compara `JSON.stringify(s.escalas)` com `tests/fixtures/app-base.json`; com `GRAVAR=1`, grava.
- [ ] **Step 3:** Gravar as fixtures com o código atual: `node tests/escala.motor.mjs --gravar` e `GRAVAR=1 PW=… node tests/app.e2e.mjs`. Depois rodar os dois sem gravar. Esperado: `Tudo ok` nos dois (prova que a montagem é determinística).
- [ ] **Step 4:** Commit: `Testes: regressão da montagem do motor e do app`.

### Task 2: Motor — não folgar junto

**Files:**
- Modify: `site/js/escala.js` (`distribuirFolgas`, ~206–310; doc da entrada no comentário de `gerarEscala`)
- Test: `tests/escala.motor.mjs`

**Interfaces:**
- Consumes: `folgasDe` (Task 1).
- Produces: entrada `funcionarios[i].naoFolgaCom: string[]` (nomes de outros funcionários da mesma entrada). Saída inalterada; avisos novos em `saida.avisos`.

- [ ] **Step 1: testes (falham):**
  - `par: Ana e Bia nunca folgam no mesmo dia aberto` — Padaria 5 pessoas, 7 dias abertos, Ana `naoFolgaCom: ["Bia"]`, Bia `["Ana"]`; nas semanas A e B, `folgasDe(Ana) ∩ folgasDe(Bia)` vazio; cada uma com 2 folgas.
  - `par: dia fechado não conta` — mesmo cenário com `dom: null`; as duas folgam no domingo (fechado) e não há aviso de par.
  - `par: folga fixa igual vence o par` — Ana e Bia com `folgaFixa: "qua"` e par; as duas folgam na quarta; `avisos` contém `/Ana e Bia folgam no mesmo dia \(quarta\)/`.
  - `par sem campo = regressão` — já coberto pela Task 1.
- [ ] **Step 2:** `node tests/escala.motor.mjs` → FALHA nos 3 casos novos.
- [ ] **Step 3: implementar em `distribuirFolgas`:**
  - helper interno `juntoCom(p, d)`: `true` se algum nome de `p.naoFolgaCom` tem `folgas[nome][d]` num dia **aberto**.
  - Passo 1 (fixa/naoPode): depois de marcar todas as folgas obrigatórias, para cada par com folga obrigatória no mesmo dia aberto, aviso `"<A> e <B> folgam no mesmo dia (<dia por extenso minúsculo>): a folga fixa ou o dia que não podem vale mais que a regra de não folgar junto."` (uma vez por par e dia).
  - Passo 2 (rodízio do fim de semana): candidato `d` exige também `!juntoCom(p, d)`.
  - Passo 3 (folgas restantes): primeiro tenta só dias sem `juntoCom`; se nenhum, repete permitindo (2 folgas vencem o par) e acrescenta aviso `"<A> e <B> folgam no mesmo dia (<dia>): não havia outro dia sem deixar o dia sem ninguém."`.
- [ ] **Step 4:** `node tests/escala.motor.mjs` → `Tudo ok` (inclui a regressão).
- [ ] **Step 5:** Commit: `Motor: pares que não folgam no mesmo dia`.

### Task 3: Motor — mulher folga no domingo a cada 2 semanas

**Files:**
- Modify: `site/js/escala.js` (`distribuirFolgas`: grupos do rodízio e passo da mulher)
- Test: `tests/escala.motor.mjs`

**Interfaces:**
- Produces: entrada `funcionarios[i].sexo: "F" | "M" | ""`.

- [ ] **Step 1: testes (falham):**
  - `mulher: folga no domingo em A ou B` — mercado fictício 7 dias, 9 pessoas, 4 ao mesmo tempo, 4 mulheres (`sexo: "F"`, índices 0, 1, 2, 3); para cada mulher, `folgasDe` da A **ou** da B contém `"dom"`.
  - `mulheres alternam entre A e B` — no mesmo cenário, as mulheres 0 e 2 folgam domingo na A e 1 e 3 na B.
  - `mulher com folga fixa no sábado` — Ana `sexo: "F"`, `folgaFixa: "sab"`: ganha o domingo na semana do grupo dela (folgas da semana = sáb + dom).
  - `domingo fechado: grupos de hoje` — `dom: null` com mulheres: grade igual à do mesmo cenário sem `sexo` (comparar JSON).
  - `só abre 5 dias com domingo` (seg–qui + dom, ninguém folga em dia aberto hoje): a mulher folga no domingo da semana dela e há aviso `/trabalha 4 dias nesta semana para folgar no domingo/`.
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3: implementar:**
  - Grupos do rodízio: se o domingo está aberto e há alguém com `sexo === "F"`, montar `grupoA`/`grupoB` assim: mulheres em ordem de equipe alternando A, B, A…; depois os demais em ordem completam A até `Math.ceil(n/2)`; o resto vai para B. Sem mulheres ou com domingo fechado, manter `slice(0, metade)` / `slice(metade)` de hoje. O grupo da semana é processado com as mulheres primeiro.
  - Passo da mulher (antes do rodízio, fora do `if (extrasPorPessoa > 0)`): para cada mulher do grupo da semana sem folga no domingo, marcar `folgas[nome].dom = true` e `disponiveis.dom--` **sem** checar `podeFolgar`/limite (lei vence cobertura); se `restantes > 0`, `restantes--`; senão aviso `"<nome> trabalha 4 dias nesta semana para folgar no domingo (CLT, art. 386)."` (com `diasTrabalho - 1` no lugar do 4 quando for outro número).
  - No passo 2, mulher já resolvida é pulada; no passo 3, dia `dom` não é tirado dela.
- [ ] **Step 4:** `node tests/escala.motor.mjs` → `Tudo ok`.
- [ ] **Step 5:** Commit: `Motor: folga de domingo da mulher a cada 2 semanas (CLT, art. 386)`.

### Task 4: App — dados, entrada do motor, virada e alertas

**Files:**
- Modify: `site/app/app.js`: `LEIS` (~26), `normalizar` (~121), `entradaMotor` (~194), `repararVirada.nota` (~533), `metricas`/`problemas` (~1550), `problemasLei` (~2319), `renderAlertas` (~1091), `contextoIA` (~1592), `window.__j40h` (~2444)
- Test: `tests/app.e2e.mjs` (seção 14)

**Interfaces:**
- Consumes: campos de entrada do motor das Tasks 2 e 3.
- Produces (usados pelas Tasks 5 e 6):
  - pessoa no estado: `sexo: "F" | "M" | ""`, `naoFolgaCom: string[]` (ids, simétrico).
  - `conflitosPar(s, v, w) -> [{ a: nome, b: nome, d: dia }]` (cada par/dia uma vez; só dias abertos; inclui meio período).
  - `mulheresSemDomingo(s, v) -> nome[]` (mulheres com turno no domingo nas semanas A e B; `[]` se domingo fechado).
  - `metricas(s).pares` = total de `conflitosPar` nas semanas A e B da versão atual.
  - `LEIS.mulher = { ref: "CLT, art. 386", fonte: "clt", regra: "Havendo trabalho aos domingos, a escala das mulheres é de revezamento quinzenal: a folga cai no domingo pelo menos 1 vez a cada 2 semanas." }`.
  - `window.__j40h` passa a expor também `normalizar`, `conflitosPar`, `mulheresSemDomingo`, `problemasLei`.

- [ ] **Step 1: testes (falham), seção `14. par e domingo da mulher`:**
  - `normalizar` simetriza: `{Ana: naoFolgaCom:["p1"]}` → Bia (`p1`) passa a ter `["p0"]`; id inexistente some; `sexo` inválido vira `""`.
  - `gerarTudo` com Ana/Bia par (estado da padaria, 7 dias): `conflitosPar` vazio em 42 e 40, A e B.
  - Nomes repetidos: duas "Ana" (p0, p1) e p0 par com p2: `conflitosPar` vazio e nenhum erro de JS.
  - Par com meio período (Bia `horas: 20`): monta sem erro; se `conflitosPar` não vazio, `#alertas` mostra `/folgam no mesmo dia/`.
  - Grade à mão com Ana e Bia de folga na quinta da A: `#alertas` contém `"Ana e Bia folgam no mesmo dia (quinta, semana A), mas foram marcadas para não folgar juntas."`; `metricas(s).pares === 1`.
  - Mulher com turno nos dois domingos (grade à mão): `problemasLei` tem item com `/CLT, art. 386/`; ela **não** aparece no alerta geral de domingo (Lei 10.101) e `trabalhaTodoDomingo` continua contando-a (métrica `domingo` inalterada).
  - `repararVirada`: grade montada com 4 mulheres no mercado de 9 → `mulheresSemDomingo` vazio em 42 e 40.
- [ ] **Step 2:** rodar `app.e2e` → FALHA nos novos.
- [ ] **Step 3: implementar:**
  - `normalizar`: `sexo` ∈ `["F","M"]` senão `""`; `naoFolgaCom` filtrado para ids existentes ≠ próprio, sem repetição, e simetrizado em segunda passada.
  - `entradaMotor`: primeiro calcula o nome desambiguado de cada id da `lista`; depois passa `sexo` quando preenchido e `naoFolgaCom` traduzido para esses nomes (ids fora da `lista`, como meio período, são ignorados).
  - `repararVirada.nota`: `+100` se a pessoa é `F`, domingo aberto e turno no domingo em A e B (no lugar do `+10` geral); `+10` por dia aberto, em cada semana, em que ela e um parceiro de `naoFolgaCom` estão sem turno.
  - `renderAlertas`: um `<li>` por conflito com o texto do teste; o alerta geral de domingo lista só quem não é `F`; mulheres em `<li class="erro">` com `"<nomes> trabalha(m) no domingo nas semanas A e B; a folga da mulher precisa cair no domingo pelo menos 1 vez a cada 2 semanas" + lei("mulher") + "."`.
  - `problemasLei`: mesma separação (mulheres com o texto acima, demais com o texto atual).
  - `problemas(a, b)`: se `b.pares > a.pares`, `"mais N folga(s) no mesmo dia de quem não pode folgar junto"`.
  - `contextoIA`: equipe com `sexo` e `naoFolgaCom`; métricas com `paresFolgandoJuntos` (lista de `conflitosPar` da semana atual) e `mulheresSemDomingoNasSemanasAeB`.
- [ ] **Step 4:** `app.e2e` → `Tudo ok` (inclui seção 13 de regressão) e `node tests/escala.motor.mjs` → `Tudo ok`.
- [ ] **Step 5:** Commit: `Painel: par que não folga junto e domingo da mulher nos alertas e na virada`.

### Task 5: App — cadastro da pessoa

**Files:**
- Modify: `site/app/index.html` (`#dlgPForm`, ~234–250), `site/app/app.js` (`abrirPessoa`, `salvarPessoa`, handler de `#pRemover`), `site/app/app.css` só se precisar
- Test: `tests/app.e2e.mjs` (seção 15)

**Interfaces:**
- Consumes: campos e `normalizar` da Task 4.

- [ ] **Step 1: testes (falham), seção `15. cadastro`:** abrir Ana, escolher `#pSexo` = `F`, marcar Bia em `#pJuntos`, salvar → `state` tem Ana `sexo: "F"`, Ana `naoFolgaCom: ["<id Bia>"]` e Bia com o id da Ana; aviso de remontar aparece (`state.pendente === true`). Reabrir Bia → Ana marcada. Remover Bia pela tela → Ana com `naoFolgaCom: []`.
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3: implementar:**
  - HTML: na linha da folga fixa, `<label>Sexo<select id="pSexo"><option value="">Não informar</option><option value="F">Feminino</option><option value="M">Masculino</option></select><small>mulher folga no domingo pelo menos a cada 2 semanas</small></label>`; abaixo dos dias que não pode, `<p class="lbl-dias">Não pode folgar no mesmo dia que</p><div class="dias-chk" id="pJuntos"></div>`; nota final passa a citar também o par.
  - `abrirPessoa`: chips `data-pj="<id>"` com os outros da equipe (rótulo = nome), marcados conforme `naoFolgaCom`; sem colegas, esconder o bloco.
  - `salvarPessoa`: grava `sexo`; atualiza `naoFolgaCom` dos dois lados (tira o id da pessoa de quem foi desmarcado, põe em quem foi marcado); `marcarPendente()` se sexo ou par mudou.
  - Remover pessoa: tirar o id dela de todos os `naoFolgaCom`.
- [ ] **Step 4:** `app.e2e` → `Tudo ok`.
- [ ] **Step 5:** Commit: `Painel: sexo e "não folga junto" no cadastro da pessoa`.

### Task 6: Ajuste com IA

**Files:**
- Modify: `painel/lib/ia.ts` (schema `equipe` ~53–70, regras do prompt ~112–145, `mockResposta` ~155), `site/app/app.js` (`aplicarProposta` ~1640)
- Test: `tests/painel.e2e.mjs` (rodar; acrescentar checagem do mock se houver caso de equipe), `tests/app.e2e.mjs` (seção 16)

**Interfaces:**
- Consumes: campos e `contextoIA` da Task 4.

- [ ] **Step 1: teste (falha), seção `16. proposta da IA`:** `aplicarProposta` com equipe trazendo `sexo: "F"` para Ana e `naoFolgaCom: ["p1"]` → estado com os dois lados do par; proposta **sem** os campos mantém os valores antigos.
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3: implementar:**
  - Schema: `required` ganha `"sexo", "naoFolgaCom"`; `sexo: { type: "string", enum: ["", "F", "M"], description: "F ou M só quando o dono disser; nunca deduza pelo nome; vazio = não informado" }`; `naoFolgaCom: { type: "array", items: { type: "string" }, description: "ids de quem não pode folgar no mesmo dia que esta pessoa (os dois lados)" }`.
  - Prompt ("Como decidir"): "Quem não pode folgar junto: grave em naoFolgaCom das duas pessoas e use remontar: true (não resolva só com celulas)." e "Mulher folga no domingo pelo menos 1 vez a cada 2 semanas (CLT, art. 386): confira mulheresSemDomingoNasSemanasAeB e paresFolgandoJuntos na conferência."
  - `aplicarProposta`: copia `sexo`/`naoFolgaCom` (ids) da proposta; ausentes = valor do `antigo`; depois `normalizar` garante simetria; mudança nesses campos conta em `antesEstr` (já usa `s.equipe`).
  - `mockResposta`: tipo da equipe aceita os campos novos.
- [ ] **Step 4:** `app.e2e` → `Tudo ok`; `cd painel && npx tsc --noEmit` sem erro; `npm run build` e `PW=… node tests/painel.e2e.mjs` → `Tudo ok`.
- [ ] **Step 5:** Commit: `IA: sexo e não folgar junto no Ajuste com IA`.

### Task 7: Publicar e registrar

- [ ] **Step 1:** Todos os testes: `node tests/escala.motor.mjs`, `app.e2e`, `painel.e2e`, `node --experimental-strip-types tests/painel.migracao.mjs` → ok.
- [ ] **Step 2:** `git push`; deploy dos apps `jornada40h` e `jornada40h-painel` pela API do Dokploy (`application.deploy`), conferir `deployment.all` até `done`.
- [ ] **Step 3:** Produção: `/painel/login` e `/app/` 200; abrir `/app/` com estado de teste (par + mulher) e conferir alertas; contas reais: ler escala de 1 cliente pela rota admin e conferir que `normalizar` não mudou a grade (sem campos novos).
- [ ] **Step 4:** `docs/ESTADO.md` (Histórico): entrega da parte 1 + perguntas abertas para o advogado e os empresários. Commit e push.
