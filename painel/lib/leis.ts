// Trechos de lei que o "Ajuste com IA" usa para fundamentar avisos e explicações. Texto copiado da
// compilação do Planalto mantida em github.com/ctresb/leis (consulta de out/2026). Não substitui o
// Diário Oficial; a convenção coletiva de cada categoria pode ter regras próprias.

export const LEIS = [
  {
    ref: "CF, art. 7º, XIII",
    texto: "duração do trabalho normal não superior a 8 (oito) horas diárias e 40 (quarenta) horas semanais, facultada a compensação de horários e a redução da jornada, mediante acordo ou convenção coletiva de trabalho (redação da EC 141/2026, com implementação gradual da jornada semanal pelo art. 6º da emenda)",
  },
  {
    ref: "CF, art. 7º, XV",
    texto: "repouso semanal remunerado, preferencialmente aos domingos (a EC 141/2026 altera este inciso com vigência diferida)",
  },
  {
    ref: "CF, art. 7º, XVI",
    texto: "remuneração do serviço extraordinário superior, no mínimo, em cinquenta por cento à do normal",
  },
  {
    ref: "CLT, art. 58",
    texto: "A duração normal do trabalho, para os empregados em qualquer atividade privada, não excederá de 8 (oito) horas diárias, desde que não seja fixado expressamente outro limite.",
  },
  {
    ref: "CLT, art. 59, caput e § 1º",
    texto: "A duração diária do trabalho poderá ser acrescida de horas extras, em número não excedente de duas, por acordo individual, convenção coletiva ou acordo coletivo de trabalho. A remuneração da hora extra será, pelo menos, 50% superior à da hora normal.",
  },
  {
    ref: "CLT, art. 59, § 2º",
    texto: "Banco de horas por acordo ou convenção coletiva: o excesso de um dia compensado pela diminuição em outro, sem ultrapassar 10 horas diárias (por acordo individual escrito, compensação em até 6 meses, § 5º; no mesmo mês, § 6º).",
  },
  {
    ref: "CLT, art. 66",
    texto: "Entre 2 (duas) jornadas de trabalho haverá um período mínimo de 11 (onze) horas consecutivas para descanso.",
  },
  {
    ref: "CLT, art. 67",
    texto: "Será assegurado a todo empregado um descanso semanal de 24 (vinte e quatro) horas consecutivas, o qual, salvo motivo de conveniência pública ou necessidade imperiosa do serviço, deverá coincidir com o domingo, no todo ou em parte. Parágrafo único: nos serviços que exijam trabalho aos domingos, será estabelecida escala de revezamento, mensalmente organizada e constando do quadro sujeito à fiscalização.",
  },
  {
    ref: "CLT, art. 71",
    texto: "Em trabalho contínuo de mais de 6 horas, é obrigatório intervalo para repouso ou alimentação de no mínimo 1 hora e, salvo acordo escrito ou contrato coletivo, no máximo 2 horas. Entre 4 e 6 horas, intervalo de 15 minutos (§ 1º). Os intervalos não são computados na duração do trabalho (§ 2º).",
  },
  {
    ref: "CLT, art. 386",
    texto: "Havendo trabalho aos domingos, será organizada uma escala de revezamento quinzenal, que favoreça o repouso dominical (capítulo da proteção do trabalho da mulher).",
  },
  {
    ref: "Lei 605/1949, art. 1º",
    texto: "Todo empregado tem direito ao repouso semanal remunerado, de vinte e quatro horas consecutivas, preferentemente aos domingos.",
  },
  {
    ref: "Lei 10.101/2000, art. 6º",
    texto: "Fica autorizado o trabalho aos domingos nas atividades do comércio em geral, observada a legislação municipal. Parágrafo único: o repouso semanal remunerado deverá coincidir, pelo menos 1 vez no período máximo de 3 semanas, com o domingo.",
  },
] as const;

export const BASE_LEGAL = LEIS.map(l => `- ${l.ref}: ${l.texto}`).join("\n");
