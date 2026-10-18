// Monta o quadro semanal da escala. Uso: <div class="board" data-escala="padaria5x2"></div>
const ESCALAS = {
  // Padaria, seg-sex 6h-18h, sáb 7h-14h, domingo fechado. 5x2: 2 folgas para cada um.
  padaria5x2: {
    rows: [
      { n: "Ana", s: "Balcão", c: "M M F M M U F" },
      { n: "Bruno", s: "Forno", c: "T T M F T U F" },
      { n: "Carla", s: "Caixa", c: "M F T M M U F" },
      { n: "Diego", s: "Balcão", c: "F T T T T U F" },
      { n: "+1 nova", s: "contratação", c: "T M M T F U F", novo: true }
    ]
  },
  // Mesma padaria hoje, 6x1: só o domingo de folga.
  padaria6x1: {
    rows: [
      { n: "Ana", s: "Balcão", c: "M M M M M U F" },
      { n: "Bruno", s: "Forno", c: "T T T T T U F" },
      { n: "Carla", s: "Caixa", c: "M M M M M U F" },
      { n: "Diego", s: "Balcão", c: "T T T T T U F" }
    ]
  },
  // Mesma equipe de 4 tentando a 5x2 no improviso: buracos.
  padariaBuraco: {
    rows: [
      { n: "Ana", s: "Balcão", c: "M M F M M U F" },
      { n: "Bruno", s: "Forno", c: "T T T F T U F" },
      { n: "Carla", s: "Caixa", c: "M F M M M X F" },
      { n: "Diego", s: "Balcão", c: "F T T T X U F" }
    ]
  }
};
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const CEL = {
  M: ['k-m', 'M', '6h–14h'], T: ['k-t', 'T', '10h–18h'], U: ['k-i', 'U', '7h–14h'],
  F: ['k-f', 'F', 'folga'], X: ['k-x', '?', 'sem gente'], C: ['k-c', '–', '']
};
document.querySelectorAll('.board[data-escala]').forEach(el => {
  const e = ESCALAS[el.dataset.escala];
  const compact = el.dataset.compact !== undefined;
  let h = '<div class="b-row b-head"><span></span>' + DIAS.map(d => '<span>' + d + '</span>').join('') + '</div>';
  e.rows.forEach(r => {
    h += '<div class="b-row' + (r.novo ? ' new' : '') + '"><span class="b-name"><b>' + r.n + '</b><small>' + r.s + '</small></span>' +
      r.c.split(' ').map(k => { const c = CEL[k]; return '<span class="b-cell ' + c[0] + '">' + c[1] + (compact || !c[2] ? '' : '<small>' + c[2] + '</small>') + '</span>'; }).join('') + '</div>';
  });
  // pessoas trabalhando no dia
  const cols = [0,1,2,3,4,5,6].map(i => e.rows.filter(r => 'MTU'.includes(r.c.split(' ')[i])).length);
  const alvo = el.dataset.min ? +el.dataset.min : 0;
  h += '<div class="b-row b-foot"><span class="b-name"><small>No dia</small></span>' + cols.map((n, i) => '<span class="b-cell' + (i < 6 && alvo && n < alvo ? ' lo' : '') + '">' + (i === 6 ? '–' : n) + '</span>').join('') + '</div>';
  el.innerHTML = h;
});
