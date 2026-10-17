# engine/ — motor de escala 5x2 e template do PDF

Duas peças em JavaScript puro, sem dependências, que rodam tanto no Node quanto
no Google Apps Script (sintaxe ES2019, sem módulos ES):

| Arquivo | O que faz |
|---|---|
| `escala.js` | `gerarEscala(input)` monta a escala semanal (folgas, turnos, cobertura hora a hora, avisos). `exemploEquipe(n, tipo)` cria uma equipe fictícia. `resumoEscala(saida)` resume em 3–4 frases. |
| `pdf-template.js` | `renderRelatorioHTML(dados)` devolve o HTML do relatório de 2 páginas A4 (diagnóstico + escala de exemplo + oferta). `renderExemploEscalaHTML(escala, opcoes)` devolve só a grade, para virar imagem da landing page. |
| `test.js` | 5 cenários de leads reais: `node engine/test.js` |
| `render.mjs` | Render de prova com Playwright: PDFs e PNGs em `engine/out/` e `site/img/exemplo-escala.png` |

## Como usar

**Node**

```js
const { gerarEscala, resumoEscala } = require("./engine/escala.js");
const { renderRelatorioHTML } = require("./engine/pdf-template.js");

const escala = gerarEscala({ /* ver entrada abaixo */ });
const html = renderRelatorioHTML({ lead, escala, oferta, marca, data });
```

**Apps Script**

1. No editor do Apps Script, crie dois arquivos de script (`escala.gs` e `pdf-template.gs`) e cole o conteúdo de `escala.js` e `pdf-template.js` sem alterar nada: a linha `if (typeof module !== "undefined") …` não faz nada lá e as funções ficam globais.
2. Para gerar o PDF:

```js
function gerarPdfDoLead(lead) {
  const escala = gerarEscala({
    negocio: { nome: lead.nome, tipo: lead.tipo },
    funcionamento: funcionamentoDoLead(lead),   // monte a partir dos campos da planilha
    funcionarios: lead.funcionarios,           // número → equipe de exemplo com nomes fictícios
    salarioMedio: lead.salario_medio,
    semana: "A"
  });
  const html = renderRelatorioHTML({ lead: {...}, escala, oferta: {...}, marca: {...}, data: "17/10/2026" });
  return HtmlService.createHtmlOutput(html).getBlob().setName("escala-5x2.pdf").getAs("application/pdf");
}
```

O HTML do relatório não usa JavaScript, fontes externas, flex ou grid: só `<table>`, cores, bordas e `border-radius`, que o conversor do Apps Script entende. Fontes: Georgia (títulos) e Arial (texto).

## Entrada de `gerarEscala`

```js
{
  negocio: { nome: "Padaria Pão Quente", tipo: "Padaria" },
  // horários por dia; null = fechado. pessoas = quantas precisam estar trabalhando ao mesmo tempo
  funcionamento: {
    seg: { abre: "06:00", fecha: "17:00", pessoas: 3 }, ter: {…}, qua: {…}, qui: {…}, sex: {…},
    sab: { abre: "06:00", fecha: "18:00", pessoas: 3 }, dom: null
  },
  // lista de pessoas OU um número N (gera "Ana, Bruno, Carla…" com funções do tipo de negócio)
  funcionarios: [
    { nome: "Ana", funcao: "caixa", folgaFixa: "dom", naoPode: ["sab"] }   // folgaFixa e naoPode são opcionais
  ],
  regras: { jornadaSemanal: 40, jornadaDiariaMax: 8, folgasPorSemana: 2, intervaloMin: 60 }, // opcional (estes são os padrões)
  salarioMedio: 1800,  // opcional: com ele, os avisos trazem o custo da hora extra
  semana: "A"          // "A" ou "B": rodízio de quem folga no fim de semana
}
```

## Saída

```js
{
  dias: ["seg", …, "dom"],
  grade: [ { nome, funcao, horasSemana,
             dias: { seg: { tipo: "turno", inicio: "06:00", fim: "14:00", rotulo: "Abertura" }
                        | { tipo: "folga" } | { tipo: "fechado" } | { tipo: "livre" } } } ],
  cobertura: { seg: { necessario: 3, blocos: [ { hora: "06:00", necessario: 3, escalado: 2 }, … ],
                      horasDescobertas: 9, horasSobrando: 0, faixas: [ { deficit: 1, inicio: 360, fim: 540, horas: 3 } ] }, … },
  resumo: { horasDescobertasSemana, horasSobrandoSemana, folgasPorDia: {…}, pessoasPorDia: {…}, semana: "A" },
  avisos: [ "Sábado fica com 1 pessoa a menos das 6h às 10h …", … ],
  ok: true   // false quando não há funcionários ou nenhum dia aberto
}
```

Rótulos de turno: `Turno único` (dia ≤ jornada diária), `Abertura` / `Fechamento` (dia até 2 jornadas, os dois se sobrepõem no meio do dia) e `Abertura` / `Meio` / `Fechamento` (dia acima de 2 jornadas). `livre` = pessoa disponível no dia, mas sem turno porque a cobertura já está completa (reserva para faltas e férias).

## Como o algoritmo decide

1. **Dias e turnos.** Para cada dia aberto: horas abertas, demanda (horas × pessoas) e turnos possíveis, limitados à jornada diária.
2. **Folgas.** Dias fechados contam como folga para todos. Cada pessoa trabalha `min(dias abertos, 7 − folgasPorSemana)` dias. Primeiro `folgaFixa` e `naoPode`; depois o rodízio do fim de semana (semana A: primeira metade da equipe, semana B: segunda metade, limitado para o fim de semana não ficar mais vazio que um dia comum); por fim as folgas restantes vão para o dia em que tirar mais uma pessoa pesa menos (demanda ÷ pessoas que sobram). Nenhum dia aberto fica com 0 pessoas.
3. **Turnos.** Em cada dia, quem fez menos turnos na semana escolhe primeiro o turno que cobre mais horas ainda descobertas; empate vai para o turno com menos gente no dia e depois para o turno que a pessoa fez menos vezes (ninguém só fecha).
4. **Cobertura.** Blocos de 30 min: necessário vs. escalado. Horas descobertas = soma dos déficits × 0,5 h. Se alguém passar da jornada semanal, os últimos turnos são encurtados e sai um aviso.
5. **Avisos** em linguagem de dono de negócio: onde falta gente e quanto custa cobrir (meio período / parcial / tempo integral, hora extra em R$ quando há `salarioMedio`), limite legal de 2 h extras por dia, intervalo de refeição, reservas e rodízio.

## Horas descobertas: motor × calculadora da página

A calculadora da landing page usa `D = C − F × 40` (C = horas abertas × pessoas ao mesmo tempo). Ela soma horas soltas, como se cada funcionário pudesse espalhar suas 40 h em qualquer hora da semana. O motor monta turnos de verdade, e por isso mostra **mais** horas descobertas em 4 dos 5 cenários:

| Cenário | Página | Motor | Por quê |
|---|---|---|---|
| Tatiane · seg–sáb 11–18 · 4 ao mesmo tempo · 4 pessoas | 8 h | 28 h | O dia tem 7 h; em 5 dias cada pessoa faz no máximo 35 h, não 40. Com 4 folgas em 6 dias, 4 dias ficam com 3 pessoas em vez de 4. |
| Marcos · seg–dom 08–18 · 2 · 3 pessoas | 20 h | 26 h | Dia de 10 h precisa de abertura + fechamento (8 h cada): com 2 pessoas sobram 2 h descobertas em cada ponta. |
| Rhayane · seg–sáb 11–18 · 4 · 3 pessoas | 48 h | 63 h | Mesmo caso da Tatiane: 7 h × 5 dias = 35 h por pessoa. |
| Gabriel · seg–sáb 08–19/20 · 4 · 10 pessoas | 0 h | 0 h | Sobra gente; 2 pessoas-dia ficam de reserva. |
| Padaria · seg–sex 06–17, sáb 06–18 · 3 · 4 pessoas | 41 h | 51 h | Dia de 11–12 h exige 6 pessoas para cobrir tudo (3 abrindo, 3 fechando); só há 3–4 por dia. |

**Qual é a mais correta?** A do motor. A da página é um piso otimista (vale se o horário pudesse ser coberto por "fatias" de qualquer tamanho, por exemplo com contratos intermitentes); a do motor é o que acontece ao escalar gente de carteira assinada em turnos inteiros com 2 folgas. Por isso o PDF mostra as duas e diz que a da escala "é a que vale na prática". Sugestão para o site: quando o dia aberto tiver menos de 8 h, a página também deveria usar `horas do dia × 5` como teto por pessoa em vez de 40 h — isso já aproximaria os casos da Tatiane e da Rhayane.

O `test.js` trata essa diferença como **divergência documentada** (imprime `DIVERGE`), não como falha; as checagens estruturais (≤ 40 h, ≥ 2 folgas, nenhum dia vazio, turno ≤ 8 h, rodízio A ≠ B) são asserts de verdade.

## Limites conhecidos

- Turnos só nas posições abertura / meio / fechamento, sempre com a duração da jornada diária (ou o dia inteiro, se menor). Não há turnos quebrados nem meio período: quando sobra gente e falta cobertura ao mesmo tempo (ex.: 3 pessoas num dia de 11 h), o motor prefere cobrir o máximo de horas em vez de inventar um horário de 4 h.
- `pessoas` é fixo ao longo do dia: não modela pico de almoço com mais gente.
- O rodízio A/B divide a equipe pela ordem da lista. Com equipes pequenas e fim de semana apertado, só uma parte do grupo consegue folgar no fim de semana em cada semana; quem não conseguiu em A deveria ter prioridade em B, o que exigiria guardar histórico (não implementado).
- Intervalo de refeição é só aviso; os turnos não são alongados em 1 h para incluí-lo.
- Virada de noite (fecha depois da meia-noite) é aceita, mas as horas são contadas no mesmo dia.
- O PDF cabe em 2 páginas A4 com até ~12 funcionários (acima de 7, a grade usa fonte menor). Com mais que isso a grade estoura a página.
- O conversor HTML→PDF do Apps Script não foi testado neste ambiente; o layout evita tudo que ele costuma não suportar (flex, grid, @font-face, transform, JS). Se as margens saírem diferentes, ajuste `padding` de `.page` em `cssRelatorio()`.
