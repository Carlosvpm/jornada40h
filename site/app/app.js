/*
 * Jornada 40h — dashboard da escala 5x2 (entregável pago).
 * Roda inteiro no navegador em cima de ../js/escala.js (gerarEscala, montarDias, DIAS…).
 * Os dados do cliente ficam no aparelho (localStorage) e no link pessoal (#d=…, o fragmento
 * não vai ao servidor). Nada é enviado para fora.
 */
(function () {
  "use strict";

  var VERSOES = {
    "42": { jornadaSemanal: 42, jornadaDiariaMax: 8.4, rotulo: "42 h", quando: "a partir de dez/2026" },
    "40": { jornadaSemanal: 40, jornadaDiariaMax: 8, rotulo: "40 h", quando: "a partir de dez/2027" }
  };
  var SEMANAS = ["A", "B"];
  var SEM_POR_MES = 4.33;
  var INTERJORNADA_MIN = 11 * 60;
  var LS_KEY = "j40h:escala:v1";
  var XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  // Modo conta (/painel): o estado vem do banco e é salvo nele. Sem isso, fica no aparelho e no link.
  var PAINEL = window.J40H_PAINEL || null;

  var $ = function (s) { return document.querySelector(s); };
  var state = null;
  var hashOrigem = "";

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                         */
  /* ------------------------------------------------------------------ */

  function min(hhmm) { var p = String(hhmm || "0:0").split(":"); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
  function hhmm(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; var h = Math.floor(m / 60), r = m % 60; return (h < 10 ? "0" : "") + h + ":" + (r < 10 ? "0" : "") + r; }
  function falada(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; var h = Math.floor(m / 60), r = m % 60; return r ? h + "h" + (r < 10 ? "0" : "") + r : h + "h"; }
  function horas(h) { var v = Math.round(h * 10) / 10; return String(v).replace(".", ",") + " h"; }
  function brl(v) { return "R$ " + Math.round(v).toLocaleString("pt-BR"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function dur(c) { var a = min(c.inicio), b = min(c.fim); if (b <= a) b += 1440; return (b - a) / 60; }
  function slug(s) { return String(s || "escala").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "escala"; }

  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "=";
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("on"); }, 2600);
  }

  /* ------------------------------------------------------------------ */
  /* Estado e persistência                                              */
  /* ------------------------------------------------------------------ */

  function estadoExemplo() {
    var f = {};
    DIAS.forEach(function (d) { f[d] = d === "dom" ? null : { abre: "06:00", fecha: d === "sab" ? "14:00" : "19:00", pessoas: 2 }; });
    var s = {
      v: 1,
      negocio: { nome: "Meu negócio", tipo: "Padaria" },
      funcionamento: f,
      equipe: exemploEquipe(4, "Padaria").map(function (p) { return { id: uid(), nome: p.nome, funcao: p.funcao, salario: null, folgaFixa: "" }; }),
      custos: { salario: 1800, encargos: 1.7, he: 50 },
      versao: "42", semana: "A", escalas: {}
    };
    gerarTudo(s);
    return s;
  }

  // Formato do link pessoal: o mesmo estado, sem nada além do necessário.
  function normalizar(s) {
    s.v = 1;
    s.negocio = s.negocio || { nome: "", tipo: "" };
    s.custos = s.custos || { salario: 1800, encargos: 1.7, he: 50 };
    s.versao = VERSOES[s.versao] ? s.versao : "42";
    s.semana = s.semana === "B" ? "B" : "A";
    s.equipe = (s.equipe || []).map(function (p) { return { id: p.id || uid(), nome: p.nome || "", funcao: p.funcao || "", salario: p.salario || null, folgaFixa: p.folgaFixa || "" }; });
    if (!s.escalas || !s.escalas["42"] || !s.escalas["40"]) gerarTudo(s);
    return s;
  }

  var salvarTimer = null;
  function salvar() {
    if (PAINEL) {
      $("#tSalvo").textContent = "salvando…";
      clearTimeout(salvarTimer);
      salvarTimer = setTimeout(salvarNaConta, 600);
      return;
    }
    try { localStorage.setItem(LS_KEY, JSON.stringify({ hash: hashOrigem, state: state })); $("#tSalvo").textContent = "salvo neste aparelho"; }
    catch (e) { $("#tSalvo").textContent = "não foi possível salvar neste aparelho: use Copiar link"; }
  }

  function salvarNaConta() {
    fetch(PAINEL.api, { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: state }) })
      .then(function (r) {
        if (r.status === 401) { location.href = PAINEL.login; return; }
        $("#tSalvo").textContent = r.ok ? "salvo na sua conta" : "erro ao salvar: tente de novo";
      })
      .catch(function () { $("#tSalvo").textContent = "sem conexão: alterações não salvas"; });
  }

  function carregar() {
    var salvo = null;
    try { salvo = JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch (e) { salvo = null; }
    var m = location.hash.match(/[#&]d=([A-Za-z0-9_-]+)/);
    if (m) {
      hashOrigem = m[1];
      // Mesmo link aberto de novo: vale o que foi editado neste aparelho.
      if (salvo && salvo.hash === hashOrigem && salvo.state) return normalizar(salvo.state);
      try { return normalizar(JSON.parse(b64urlDecode(m[1]))); }
      catch (e) { toast("Link inválido ou incompleto. Abrindo a última escala salva."); }
    }
    if (salvo && salvo.state) { hashOrigem = salvo.hash || ""; return normalizar(salvo.state); }
    return null;
  }

  function linkPessoal() {
    var h = b64urlEncode(JSON.stringify(state));
    hashOrigem = h;
    salvar();
    var url = location.origin + location.pathname + "#d=" + h;
    try { history.replaceState(null, "", "#d=" + h); } catch (e) {}
    return url;
  }

  /* ------------------------------------------------------------------ */
  /* Geração (motor) e cálculo                                          */
  /* ------------------------------------------------------------------ */

  function entradaMotor(s, v, sem) {
    var vistos = {};
    var funcionarios = s.equipe.map(function (p, i) {
      var nome = (p.nome || "Pessoa " + (i + 1)).trim();
      while (vistos[nome]) nome = nome + " ·";
      vistos[nome] = true;
      var f = { nome: nome, funcao: p.funcao };
      if (p.folgaFixa) f.folgaFixa = p.folgaFixa;
      return f;
    });
    return {
      negocio: { nome: s.negocio.nome, tipo: s.negocio.tipo },
      funcionamento: s.funcionamento,
      funcionarios: funcionarios,
      salarioMedio: s.custos.salario,
      semana: sem,
      regras: { jornadaSemanal: VERSOES[v].jornadaSemanal, jornadaDiariaMax: VERSOES[v].jornadaDiariaMax }
    };
  }

  function gerar(s, v, sem) {
    var saida = gerarEscala(entradaMotor(s, v, sem));
    var g = {};
    s.equipe.forEach(function (p, i) {
      var linha = saida.grade[i];
      g[p.id] = {};
      DIAS.forEach(function (d) {
        var c = linha ? linha.dias[d] : { tipo: "livre" };
        g[p.id][d] = c.tipo === "turno" ? { tipo: "turno", inicio: c.inicio, fim: c.fim, rotulo: c.rotulo } : { tipo: c.tipo };
      });
    });
    repararDescanso(g, s.equipe.map(function (p) { return p.id; }));
    return g;
  }

  // Descanso entre o fim de um turno e o início do turno do dia seguinte (minutos).
  function descanso(c1, c2) {
    if (!c1 || !c2 || c1.tipo !== "turno" || c2.tipo !== "turno") return Infinity;
    var fim = min(c1.fim); if (fim <= min(c1.inicio)) fim += 1440;
    return min(c2.inicio) + 1440 - fim;
  }

  // Nota da grade: menos violações é melhor; com o mesmo número, violação mais adiante na semana
  // é melhor (permite empurrar o problema em cadeia até o domingo, onde não há dia seguinte).
  function notaDescanso(g, ids) {
    var total = 0, primeira = DIAS.length;
    for (var i = 0; i < DIAS.length - 1; i++) {
      ids.forEach(function (id) {
        if (descanso(g[id][DIAS[i]], g[id][DIAS[i + 1]]) < INTERJORNADA_MIN) { total++; primeira = Math.min(primeira, i); }
      });
    }
    return total * 100 - primeira;
  }

  // O motor pode pôr quem fecha num dia para abrir no outro (19h → 5h30 = 10,5 h).
  // Busca exata: em cada dia mantém os mesmos turnos (cobertura igual) e só muda quem pega qual,
  // tentando primeiro a atribuição original. Memoriza becos sem saída; se estourar o limite,
  // cai no ajuste guloso.
  function repararDescanso(g, ids) {
    if (notaDescanso(g, ids) <= -DIAS.length) return;
    var dias = DIAS.map(function (d) {
      var quem = ids.filter(function (id) { return g[id][d] && g[id][d].tipo === "turno"; });
      var tipos = {}, ordem = [];
      quem.forEach(function (id) {
        var c = g[id][d], k = c.inicio + "-" + c.fim;
        if (!tipos[k]) { tipos[k] = { cell: c, n: 0 }; ordem.push(k); }
        tipos[k].n++;
      });
      return { d: d, quem: quem, tipos: tipos, ordem: ordem };
    });
    var falhou = {}, nos = 0, LIMITE = 200000;

    function dfs(i, prev) {
      if (i === DIAS.length) return [];
      if (++nos > LIMITE) return null;
      var D = dias[i];
      var chave = i + "|" + D.quem.map(function (id) { return prev[id] ? prev[id].inicio + prev[id].fim : ""; }).join(",");
      if (falhou[chave]) return null;
      var atual = {}, resto = {}, achou = null;
      D.ordem.forEach(function (k) { resto[k] = D.tipos[k].n; });
      (function atribui(j) {
        if (achou || nos > LIMITE) return;
        if (j === D.quem.length) {
          var r = dfs(i + 1, atual);
          if (r) achou = [clone(atual)].concat(r);
          return;
        }
        var id = D.quem[j], o = g[id][D.d], ko = o.inicio + "-" + o.fim;
        var ks = [ko].concat(D.ordem.filter(function (k) { return k !== ko; }));
        for (var x = 0; x < ks.length && !achou; x++) {
          var k = ks[x];
          if (!resto[k] || descanso(prev[id], D.tipos[k].cell) < INTERJORNADA_MIN) continue;
          resto[k]--; atual[id] = D.tipos[k].cell;
          atribui(j + 1);
          resto[k]++; delete atual[id];
        }
      })(0);
      if (!achou) falhou[chave] = true;
      return achou;
    }

    var sol = dfs(0, {});
    if (sol) {
      sol.forEach(function (a, i) { Object.keys(a).forEach(function (id) { g[id][DIAS[i]] = clone(a[id]); }); });
      return;
    }
    repararGuloso(g, ids);
  }

  // 1) Dia a dia, mantém os turnos do dia e redistribui quem pega qual: os turnos mais tarde vão
  //    primeiro para quem não pode entrar cedo (fechou ontem) e, no empate, para quem folga antes
  //    (fechar compromete o dia seguinte). 2) Ajuste fino com trocas enquanto a nota melhorar.
  function repararGuloso(g, ids) {
    DIAS.forEach(function (d, i) {
      var quem = ids.filter(function (id) { return g[id][d] && g[id][d].tipo === "turno"; });
      var turnos = quem.map(function (id) { return g[id][d]; })
        .sort(function (a, b) { return min(b.inicio) - min(a.inicio); });
      function cedo(id) { // primeira hora em que pode entrar (minutos do dia), pelo turno de ontem
        var ont = i > 0 ? g[id][DIAS[i - 1]] : null;
        if (!ont || ont.tipo !== "turno") return -Infinity;
        var fim = min(ont.fim); if (fim <= min(ont.inicio)) fim += 1440;
        return fim + INTERJORNADA_MIN - 1440;
      }
      function sequencia(id) { var n = 0; for (var j = i + 1; j < DIAS.length && g[id][DIAS[j]] && g[id][DIAS[j]].tipo === "turno"; j++) n++; return n; }
      var livres = quem.slice(), novo = {};
      turnos.forEach(function (t) {
        var podem = livres.filter(function (id) { return min(t.inicio) >= cedo(id); });
        var lista = podem.length ? podem : livres;
        lista.sort(function (a, b) { return (cedo(b) - cedo(a)) || (sequencia(a) - sequencia(b)); });
        var id = lista[0];
        novo[id] = t;
        livres.splice(livres.indexOf(id), 1);
      });
      quem.forEach(function (id) { g[id][d] = novo[id]; });
    });

    var nota = notaDescanso(g, ids);
    while (nota > 0 - DIAS.length) {
      var melhor = null;
      DIAS.forEach(function (dia) {
        ids.forEach(function (a, ia) {
          ids.forEach(function (b, ib) {
            if (ib <= ia) return;
            var ca = g[a][dia], cb = g[b][dia];
            if (!ca || !cb || ca.tipo !== "turno" || cb.tipo !== "turno" || (ca.inicio === cb.inicio && ca.fim === cb.fim)) return;
            g[a][dia] = cb; g[b][dia] = ca;
            var n = notaDescanso(g, ids);
            if (n < nota && (!melhor || n < melhor.n)) melhor = { n: n, dia: dia, a: a, b: b };
            g[a][dia] = ca; g[b][dia] = cb;
          });
        });
      });
      if (!melhor) break;
      var t = g[melhor.a][melhor.dia]; g[melhor.a][melhor.dia] = g[melhor.b][melhor.dia]; g[melhor.b][melhor.dia] = t;
      nota = melhor.n;
    }
  }

  function gerarTudo(s) {
    s.escalas = {};
    Object.keys(VERSOES).forEach(function (v) {
      s.escalas[v] = {};
      SEMANAS.forEach(function (sem) { s.escalas[v][sem] = gerar(s, v, sem); });
    });
  }

  function celula(s, v, sem, id, d) {
    var f = s.funcionamento[d];
    if (!f) return { tipo: "fechado" };
    var g = s.escalas[v][sem][id];
    var c = g && g[d];
    if (!c || c.tipo === "fechado") return { tipo: "livre" };
    return c;
  }

  // Cobertura em blocos de 30 min, horas por pessoa e alertas legais.
  function calcular(s, v, sem) {
    var R = VERSOES[v];
    var res = { dias: {}, pessoas: [], falta: 0, sobra: 0, erros: [], avisos: [], trabalhandoNoDia: {} };
    DIAS.forEach(function (d) {
      var f = s.funcionamento[d];
      if (!f) { res.dias[d] = { aberto: false }; return; }
      var a = min(f.abre), b = min(f.fecha); if (b <= a) b += 1440;
      var need = Math.max(1, Number(f.pessoas) || 1);
      var turnos = s.equipe.map(function (p) { return celula(s, v, sem, p.id, d); }).filter(function (c) { return c.tipo === "turno"; })
        .map(function (c) { var i = min(c.inicio), e = min(c.fim); if (i < a - 120) { i += 1440; e += 1440; } if (e <= i) e += 1440; return [i, e]; });
      var blocos = [], falta = 0, sobra = 0;
      for (var t = a; t < b; t += 30) {
        var n = 0; turnos.forEach(function (x) { if (x[0] <= t && t < x[1]) n++; });
        blocos.push({ t: t, n: n, need: need });
        falta += Math.max(0, need - n) * 0.5; sobra += Math.max(0, n - need) * 0.5;
      }
      var faixas = [], cur = null;
      blocos.forEach(function (bl) {
        var def = Math.max(0, bl.need - bl.n);
        if (def > 0) {
          if (cur && cur.def === def && cur.fim === bl.t) cur.fim = bl.t + 30;
          else { cur = { def: def, ini: bl.t, fim: bl.t + 30 }; faixas.push(cur); }
        } else cur = null;
      });
      res.dias[d] = { aberto: true, abre: a, fecha: b, need: need, blocos: blocos, falta: falta, sobra: sobra, faixas: faixas };
      res.trabalhandoNoDia[d] = turnos.length;
      res.falta += falta; res.sobra += sobra;
    });

    s.equipe.forEach(function (p, idx) {
      var nome = p.nome || "Pessoa " + (idx + 1);
      var h = 0, folgas = 0, erros = {};
      DIAS.forEach(function (d, i) {
        var c = celula(s, v, sem, p.id, d);
        if (c.tipo !== "turno") { folgas++; return; }
        var du = dur(c); h += du;
        if (du > R.jornadaDiariaMax + 2 + 1e-9) { erros[d] = 1; res.erros.push(nome + " faz " + horas(du) + " " + prep(d) + ": passa do máximo de " + horas(R.jornadaDiariaMax + 2) + " por dia (jornada + 2 h extras)."); }
        else if (du > R.jornadaDiariaMax + 1e-9) res.avisos.push(nome + " faz " + horas(du) + " " + prep(d) + ": " + horas(du - R.jornadaDiariaMax) + " de hora extra.");
        var prox = DIAS[i + 1];
        if (prox) {
          var c2 = celula(s, v, sem, p.id, prox);
          if (c2.tipo === "turno") {
            var fim = min(c.fim); if (fim <= min(c.inicio)) fim += 1440;
            var desc = min(c2.inicio) + 1440 - fim;
            if (desc < INTERJORNADA_MIN) { erros[prox] = 1; res.erros.push(nome + " descansa só " + horas(desc / 60) + " entre " + NOME_DIA[d].toLowerCase() + " e " + NOME_DIA[prox].toLowerCase() + " (mínimo de 11 h entre um dia e outro)."); }
          }
        }
      });
      if (h > R.jornadaSemanal + 1e-9) res.erros.push(nome + " soma " + horas(h) + " na semana, " + horas(h - R.jornadaSemanal) + " acima da jornada de " + R.rotulo + " (vira hora extra).");
      if (folgas < 2) res.erros.push(nome + " tem " + (folgas === 1 ? "só 1 folga" : "nenhuma folga") + " na semana. Na escala 5x2 são 2.");
      res.pessoas.push({ id: p.id, nome: nome, horas: h, folgas: folgas, erros: erros, extra: Math.max(0, h - R.jornadaSemanal) });
    });
    return res;
  }

  function prep(d) { return d === "sab" ? "no sábado" : d === "dom" ? "no domingo" : "na " + NOME_DIA[d].toLowerCase(); }

  function textoFaixa(fx) {
    return fx.map(function (f) { return (f.def === 1 ? "falta 1" : "faltam " + f.def) + " das " + falada(f.ini) + " às " + falada(f.fim); }).join(", ");
  }

  // Saídas para cobrir as horas descobertas, com custo mensal.
  function custos(s, v, calc) {
    var R = VERSOES[v], C = s.custos;
    var sal = Number(C.salario) || 0, enc = Number(C.encargos) || 1, adic = (Number(C.he) || 50) / 100;
    var valorHora = sal / (R.jornadaSemanal * 5);
    var folha = s.equipe.reduce(function (t, p) { return t + (Number(p.salario) || sal) * enc; }, 0);
    var extraGrade = calc.pessoas.reduce(function (t, p) { return t + p.extra; }, 0);
    var D = calc.falta;
    var ops = [];

    if (D > 0.01) {
      // Hora extra: limite legal de 2 h por pessoa por dia
      var maxDia = 0, inviavel = [];
      DIAS.forEach(function (d) {
        var dia = calc.dias[d]; if (!dia.aberto || !dia.falta) return;
        var cap = 2 * (calc.trabalhandoNoDia[d] || 0);
        if (dia.falta > cap + 1e-9) inviavel.push(NOME_DIA[d].toLowerCase());
        maxDia = Math.max(maxDia, dia.falta / Math.max(1, calc.trabalhandoNoDia[d] || 0));
      });
      ops.push({
        id: "he", titulo: "Pagar hora extra", custo: (D + extraGrade) * SEM_POR_MES * valorHora * (1 + adic),
        viavel: !inviavel.length,
        txt: inviavel.length
          ? "Não resolve sozinha: em " + inviavel.join(", ") + " seriam mais de 2 h extras por pessoa, acima do limite legal."
          : horas(D) + " extras por semana divididas na equipe (até 2 h por pessoa por dia), com " + Math.round(adic * 100) + "% de adicional. Hora: " + brl(valorHora) + "."
      });

      var hContrato, custoContr, txtContr;
      if (D <= 30) {
        hContrato = Math.min(30, Math.ceil(D / 2) * 2);
        custoContr = sal * (hContrato / R.jornadaSemanal) * enc;
        txtContr = "1 pessoa em contrato parcial de " + hContrato + " h por semana (salário proporcional × " + String(enc).replace(".", ",") + " de encargos), cobrindo os horários descobertos.";
      } else {
        // Tempo integral para o grosso; o que sobra vira contrato parcial (até 30 h) ou mais 1 integral.
        var n = Math.floor(D / R.jornadaSemanal), resto = D - n * R.jornadaSemanal;
        var hParcial = resto > 0.01 && resto <= 30 ? Math.min(30, Math.ceil(resto / 2) * 2) : 0;
        if (resto > 30) n++;
        custoContr = n * sal * enc + (hParcial ? sal * (hParcial / R.jornadaSemanal) * enc : 0);
        txtContr = n + (n === 1 ? " pessoa" : " pessoas") + " em tempo integral (" + R.rotulo + ")" +
          (hParcial ? " e 1 em contrato parcial de " + hParcial + " h" : "") +
          ", com salário de " + brl(sal) + (hParcial ? " (proporcional no parcial)" : "") + " × " + String(enc).replace(".", ",") + " de encargos.";
      }
      ops.push({ id: "contratar", titulo: "Contratar", custo: custoContr + extraGrade * SEM_POR_MES * valorHora * (1 + adic), viavel: true, txt: txtContr, acao: "Colocar 1 pessoa nova na escala" });

      var piores = DIAS.filter(function (d) { return calc.dias[d].aberto && calc.dias[d].falta; });
      ops.push({
        id: "reduzir", titulo: "Reduzir horário ou atender com menos gente", custo: extraGrade * SEM_POR_MES * valorHora * (1 + adic), viavel: true, semFolha: true,
        txt: "Sem custo extra de folha, mas são " + horas(D) + " por semana de atendimento a menos (" + piores.map(function (d) { return NOME_DIA_CURTO[d]; }).join(", ") + "). Vale para horários de pouco movimento."
      });
      var melhores = ops.filter(function (o) { return o.viavel && !o.semFolha; }).sort(function (a, b) { return a.custo - b.custo; });
      if (melhores[0]) melhores[0].best = true;
    }
    return { folha: folha, valorHora: valorHora, D: D, extraGrade: extraGrade, ops: ops };
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */

  function render() {
    var v = state.versao, sem = state.semana, R = VERSOES[v];
    var calc = calcular(state, v, sem);
    var cus = custos(state, v, calc);

    document.title = "Escala 5x2 · " + (state.negocio.nome || "Jornada 40h") + " · " + R.rotulo;
    $("#tNegocio").textContent = state.negocio.nome || "Minha escala";
    $("#tSemana").textContent = "· " + R.rotulo + " · semana " + sem;
    $("#tSub").textContent = "Escala 5x2 da equipe na jornada de " + R.rotulo + " (" + R.quando + "), semana " + sem + " do rodízio.";
    $("#sbNegocio").textContent = state.negocio.nome || "Meu negócio";
    $("#sbTipo").textContent = [state.negocio.tipo, state.equipe.length + (state.equipe.length === 1 ? " pessoa" : " pessoas")].filter(Boolean).join(" · ");
    var hr = new Date().getHours();
    $("#tSaud").textContent = (hr < 12 ? "Bom dia" : hr < 18 ? "Boa tarde" : "Boa noite") + (state.negocio.nome ? ", " + state.negocio.nome : "");
    $("#tData").textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    $("#sbAlertas").hidden = !calc.erros.length;
    $("#sbAlertas").textContent = calc.erros.length;
    $("#phInfo").textContent = (state.negocio.nome || "") + " · " + R.rotulo + " (" + R.quando + ") · semana " + sem + " · " + new Date().toLocaleDateString("pt-BR");
    document.querySelectorAll("[data-v]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.v === v ? "true" : "false"); });
    document.querySelectorAll("[data-s]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.s === sem ? "true" : "false"); });

    // KPIs
    var best = cus.ops.filter(function (o) { return o.best; })[0];
    $("#kpis").innerHTML =
      kpi(cus.D > 0.01 ? "red" : "green", "i-clock", "Horas sem cobertura", horas(cus.D), "por semana, na versão de " + R.rotulo) +
      kpi("blue", "i-users", "Equipe", state.equipe.length + (state.equipe.length === 1 ? " pessoa" : " pessoas"), "folha de ~" + brl(cus.folha) + "/mês") +
      kpi("gold", "i-money", "Saída mais barata", best ? brl(best.custo) + "/mês" : cus.D > 0.01 ? "—" : "R$ 0", best ? best.titulo.toLowerCase() : cus.D > 0.01 ? "sem saída dentro da lei só com hora extra" : "horário todo coberto") +
      kpi(calc.erros.length ? "red" : "green", "i-shield", "Pontos fora da lei", String(calc.erros.length), calc.erros.length ? "veja os alertas" : "jornada, folgas e descanso ok");

    renderGrade(calc);
    renderCustos(cus);
    renderAlertas(calc, cus);
  }

  function kpi(cls, icone, rot, val, sub) {
    return '<div class="kpi ' + cls + '"><div><span>' + esc(rot) + "</span><b>" + esc(val) + "</b><small>" + esc(sub) + "</small></div>" +
      '<div class="kic"><svg class="ic"><use href="#' + icone + '"/></svg></div></div>';
  }

  function renderGrade(calc) {
    var v = state.versao, sem = state.semana, R = VERSOES[v];
    var h = '<thead><tr><th class="p">Pessoa</th>';
    DIAS.forEach(function (d) {
      var f = state.funcionamento[d];
      h += "<th><b>" + NOME_DIA[d] + "</b>" + (f ? falada(min(f.abre)) + "–" + falada(min(f.fecha)) + " · " + f.pessoas + (Number(f.pessoas) === 1 ? " pessoa" : " pessoas") : "fechado") + "</th>";
    });
    h += '<th style="text-align:right">Horas</th></tr></thead><tbody>';
    state.equipe.forEach(function (p, i) {
      var pc = calc.pessoas[i];
      h += '<tr><td class="p"><b>' + esc(pc.nome) + "</b><small>" + esc(p.funcao || "") + "</small></td>";
      DIAS.forEach(function (d) {
        var c = celula(state, v, sem, p.id, d), err = pc.erros[d] ? " erro" : "";
        if (c.tipo === "fechado") h += '<td><span class="cell fechado">fechado</span></td>';
        else if (c.tipo === "turno") h += '<td><button type="button" class="cell turno' + err + '" data-p="' + p.id + '" data-d="' + d + '">' + falada(min(c.inicio)) + "–" + falada(min(c.fim)) + "<small>" + horas(dur(c)) + (c.rotulo ? " · " + esc(c.rotulo.toLowerCase()) : "") + "</small></button></td>";
        else if (c.tipo === "folga") h += '<td><button type="button" class="cell folga" data-p="' + p.id + '" data-d="' + d + '">Folga</button></td>';
        else h += '<td><button type="button" class="cell livre" data-p="' + p.id + '" data-d="' + d + '">Reserva<small>sem turno</small></button></td>';
      });
      h += '<td class="h' + (pc.horas > R.jornadaSemanal + 1e-9 ? " over" : "") + '">' + horas(pc.horas) + "</td></tr>";
    });
    h += '</tbody><tfoot><tr class="cob"><td class="lbl">Cobertura</td>';
    DIAS.forEach(function (d) {
      var dia = calc.dias[d];
      if (!dia.aberto) { h += "<td></td>"; return; }
      h += '<td><div class="bars">' + dia.blocos.map(function (b) { return "<i" + (b.n < b.need ? ' class="f"' : b.n > b.need ? ' class="s"' : "") + ' title="' + hhmm(b.t) + ": " + b.n + " de " + b.need + '"></i>'; }).join("") + "</div>";
      h += '<div class="cobtxt' + (dia.falta ? " f" : "") + '">' + (dia.falta ? horas(dia.falta) + " descobertas: " + textoFaixa(dia.faixas) : "coberto") + "</div></td>";
    });
    h += "<td></td></tr></tfoot>";
    $("#grid").innerHTML = h;
    $("#gradeNota").textContent = "Semana " + sem + ": quem folga no fim de semana alterna entre as semanas A e B. Intervalo de refeição (1 h para turnos acima de 6 h) fica dentro do turno e não conta como trabalho: combine o horário para não esvaziar o balcão.";
  }

  function renderCustos(cus) {
    $("#cSal").value = state.custos.salario;
    $("#cEnc").value = state.custos.encargos;
    $("#cHe").value = state.custos.he;
    var h = '<div class="op base"><b>Folha atual da equipe</b><span class="v">' + brl(cus.folha) + '/mês</span><p>' + state.equipe.length + " pessoas × salário × " + String(state.custos.encargos).replace(".", ",") + " de encargos.</p></div>";
    if (!cus.ops.length) h += '<div class="op best"><b>Nenhum custo extra<span class="tag">tudo coberto</span></b><span class="v">R$ 0</span><p>A equipe atual cobre todo o horário nesta versão.' + (cus.extraGrade ? " Atenção: há " + horas(cus.extraGrade) + " de hora extra na grade." : "") + "</p></div>";
    cus.ops.forEach(function (o) {
      h += '<div class="op' + (o.best ? " best" : "") + (o.viavel ? "" : " inv") + '"><b>' + esc(o.titulo) +
        (o.best ? '<span class="tag">mais barata</span>' : "") + (!o.viavel ? '<span class="tag">não resolve</span>' : "") +
        '</b><span class="v">' + (o.semFolha && !o.custo ? "R$ 0" : brl(o.custo)) + "/mês</span><p>" + esc(o.txt) + "</p>" +
        (o.acao ? '<button type="button" class="b ghost sm acao" data-acao="' + o.id + '">' + esc(o.acao) + "</button>" : "") + "</div>";
    });
    $("#opcoes").innerHTML = h;
  }

  function renderAlertas(calc, cus) {
    var li = [];
    calc.erros.forEach(function (e) { li.push('<li class="erro">' + esc(e) + "</li>"); });
    if (!calc.erros.length) li.push('<li class="ok">Jornada, folgas e descanso de 11 h entre um dia e outro estão dentro da lei nesta semana.</li>');
    DIAS.forEach(function (d) {
      var dia = calc.dias[d];
      if (dia.aberto && dia.falta) li.push("<li>" + NOME_DIA[d] + ": " + esc(textoFaixa(dia.faixas)) + " (" + horas(dia.falta) + ").</li>");
    });
    calc.avisos.forEach(function (a) { li.push("<li>" + esc(a) + "</li>"); });
    // Domingo: no comércio, o descanso precisa cair no domingo ao menos 1 vez a cada 3 semanas.
    if (state.funcionamento.dom) {
      var semDomingo = state.equipe.filter(function (p) {
        return SEMANAS.every(function (s) { return celula(state, state.versao, s, p.id, "dom").tipo === "turno"; });
      }).map(function (p) { return p.nome; });
      if (semDomingo.length) li.push("<li>" + esc(semDomingo.join(", ")) + (semDomingo.length === 1 ? " trabalha" : " trabalham") + " no domingo nas semanas A e B. No comércio, a folga precisa cair no domingo pelo menos 1 vez a cada 3 semanas: ajuste numa das semanas.</li>");
    }
    if (calc.sobra > 0.01) li.push("<li>Há " + horas(calc.sobra) + " por semana com gente a mais que o necessário: serve de reserva para faltas, férias e atestados.</li>");
    $("#alertas").innerHTML = li.join("");
  }

  /* ------------------------------------------------------------------ */
  /* Configuração (horário e equipe)                                    */
  /* ------------------------------------------------------------------ */

  function renderCfg() {
    $("#fNome").value = state.negocio.nome || "";
    $("#fTipo").value = state.negocio.tipo || "";
    var h = "<thead><tr><th>Dia</th><th>Abre?</th><th>Abre</th><th>Fecha</th><th>Pessoas ao mesmo tempo</th></tr></thead><tbody>";
    DIAS.forEach(function (d) {
      var f = state.funcionamento[d];
      h += "<tr><td><b>" + NOME_DIA[d] + '</b></td><td><label class="chk"><input type="checkbox" data-h="aberto" data-d="' + d + '"' + (f ? " checked" : "") + "> aberto</label></td>" +
        '<td><input type="time" step="60" data-h="abre" data-d="' + d + '" value="' + (f ? f.abre : "08:00") + '"' + (f ? "" : " disabled") + "></td>" +
        '<td><input type="time" step="60" data-h="fecha" data-d="' + d + '" value="' + (f ? f.fecha : "18:00") + '"' + (f ? "" : " disabled") + "></td>" +
        '<td><input type="number" min="1" max="50" data-h="pessoas" data-d="' + d + '" value="' + (f ? f.pessoas : 1) + '"' + (f ? "" : " disabled") + "></td></tr>";
    });
    $("#tblHorario").innerHTML = h + "</tbody>";

    var e = "<thead><tr><th>Nome</th><th>Função</th><th>Salário (opcional)</th><th>Folga fixa</th><th></th></tr></thead><tbody>";
    state.equipe.forEach(function (p) {
      e += '<tr data-id="' + p.id + '"><td><input type="text" maxlength="40" data-e="nome" value="' + esc(p.nome) + '"></td>' +
        '<td><input type="text" maxlength="40" data-e="funcao" value="' + esc(p.funcao) + '"></td>' +
        '<td><input type="number" min="0" step="10" data-e="salario" placeholder="média" value="' + (p.salario || "") + '"></td>' +
        '<td><select data-e="folgaFixa"><option value="">rodízio</option>' + DIAS.map(function (d) { return '<option value="' + d + '"' + (p.folgaFixa === d ? " selected" : "") + ">" + NOME_DIA[d] + "</option>"; }).join("") + "</select></td>" +
        '<td><button type="button" class="x" data-del="' + p.id + '" title="Remover">×</button></td></tr>';
    });
    $("#tblEquipe").innerHTML = e + "</tbody>";
  }

  /* ------------------------------------------------------------------ */
  /* Edição de uma célula                                               */
  /* ------------------------------------------------------------------ */

  var editando = null;

  function abrirCelula(id, d) {
    var p = state.equipe.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var c = celula(state, state.versao, state.semana, id, d);
    var R = VERSOES[state.versao];
    var f = state.funcionamento[d];
    editando = { id: id, d: d };
    $("#dlgTitulo").textContent = p.nome + " · " + NOME_DIA[d];
    document.querySelectorAll('#dlgForm input[name=tipo]').forEach(function (r) { r.checked = r.value === c.tipo; });
    var turnos = montarDias(state.funcionamento, { jornadaDiariaMax: R.jornadaDiariaMax })[d].turnos || [];
    $("#dlgPresets").innerHTML = turnos.map(function (t) {
      return '<button type="button" data-ini="' + hhmm(t.inicio) + '" data-fim="' + hhmm(t.fim) + '" data-rot="' + esc(t.rotulo) + '">' + esc(t.rotulo) + " " + falada(t.inicio) + "–" + falada(t.fim) + "</button>";
    }).join("");
    var padrao = turnos[0] || { inicio: min(f.abre), fim: min(f.abre) + R.jornadaDiariaMax * 60 };
    $("#dlgIni").value = c.tipo === "turno" ? c.inicio : hhmm(padrao.inicio);
    $("#dlgFim").value = c.tipo === "turno" ? c.fim : hhmm(padrao.fim);
    $("#dlgIni").dataset.rot = c.rotulo || "";
    atualizaDlg();
    $("#dlg").showModal();
  }

  function atualizaDlg() {
    var tipo = (document.querySelector("#dlgForm input[name=tipo]:checked") || {}).value;
    $("#dlgTurno").style.display = tipo === "turno" ? "" : "none";
    var c = { inicio: $("#dlgIni").value, fim: $("#dlgFim").value };
    var R = VERSOES[state.versao];
    var d = dur(c);
    $("#dlgDur").textContent = horas(d) + (d > R.jornadaDiariaMax + 2 + 1e-9 ? " · acima do limite de " + horas(R.jornadaDiariaMax + 2) + " por dia" : d > R.jornadaDiariaMax + 1e-9 ? " · " + horas(d - R.jornadaDiariaMax) + " de hora extra" : "") + (d > 6 ? " · inclui 1 h de intervalo a combinar" : "");
  }

  function salvarCelula() {
    if (!editando) return;
    var tipo = (document.querySelector("#dlgForm input[name=tipo]:checked") || {}).value || "livre";
    var g = state.escalas[state.versao][state.semana];
    g[editando.id] = g[editando.id] || {};
    if (tipo === "turno") {
      var ini = $("#dlgIni").value, fim = $("#dlgFim").value;
      if (!ini || !fim || ini === fim) { toast("Informe a hora de entrada e de saída."); return false; }
      g[editando.id][editando.d] = { tipo: "turno", inicio: ini, fim: fim, rotulo: $("#dlgIni").dataset.rot || "" };
    } else g[editando.id][editando.d] = { tipo: tipo };
    editando = null;
    salvar(); render();
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Exportação                                                         */
  /* ------------------------------------------------------------------ */

  function textoCelula(c) {
    if (c.tipo === "turno") return c.inicio + " às " + c.fim;
    return { folga: "Folga", livre: "Reserva", fechado: "Fechado" }[c.tipo] || "";
  }

  function carregarXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (ok, erro) {
      var s = document.createElement("script");
      s.src = XLSX_URL; s.onload = function () { ok(window.XLSX); }; s.onerror = erro;
      document.head.appendChild(s);
    });
  }

  function baixarPlanilha() {
    toast("Gerando a planilha…");
    carregarXlsx().then(function (X) {
      var wb = X.utils.book_new();
      Object.keys(VERSOES).forEach(function (v) {
        SEMANAS.forEach(function (sem) {
          var calc = calcular(state, v, sem);
          var linhas = [["Escala 5x2 · " + (state.negocio.nome || "") + " · " + VERSOES[v].rotulo + " (" + VERSOES[v].quando + ") · semana " + sem], []];
          linhas.push(["Pessoa", "Função"].concat(DIAS.map(function (d) { return NOME_DIA[d]; })).concat(["Horas na semana"]));
          state.equipe.forEach(function (p, i) {
            linhas.push([calc.pessoas[i].nome, p.funcao || ""].concat(DIAS.map(function (d) { return textoCelula(celula(state, v, sem, p.id, d)); })).concat([Math.round(calc.pessoas[i].horas * 10) / 10]));
          });
          linhas.push([]);
          linhas.push(["Horário", ""].concat(DIAS.map(function (d) { var f = state.funcionamento[d]; return f ? f.abre + " às " + f.fecha : "Fechado"; })));
          linhas.push(["Pessoas necessárias", ""].concat(DIAS.map(function (d) { var f = state.funcionamento[d]; return f ? Number(f.pessoas) : 0; })));
          linhas.push(["Pessoas trabalhando", ""].concat(DIAS.map(function (d) { return calc.trabalhandoNoDia[d] || 0; })));
          linhas.push(["Horas descobertas", ""].concat(DIAS.map(function (d) { return calc.dias[d].aberto ? calc.dias[d].falta : 0; })).concat([calc.falta]));
          linhas.push(["Onde falta gente", ""].concat(DIAS.map(function (d) { return calc.dias[d].aberto && calc.dias[d].falta ? textoFaixa(calc.dias[d].faixas) : ""; })));
          var ws = X.utils.aoa_to_sheet(linhas);
          ws["!cols"] = [{ wch: 18 }, { wch: 14 }].concat(DIAS.map(function () { return { wch: 16 }; })).concat([{ wch: 16 }]);
          X.utils.book_append_sheet(wb, ws, VERSOES[v].rotulo.replace(" ", "") + " semana " + sem);
        });
      });

      var lc = [["Custos mensais estimados · " + (state.negocio.nome || "")], [],
        ["Salário médio", Number(state.custos.salario)], ["Custo total do funcionário (× salário)", Number(state.custos.encargos)], ["Adicional de hora extra (%)", Number(state.custos.he)], []];
      Object.keys(VERSOES).forEach(function (v) {
        var calc = calcular(state, v, "A"), cus = custos(state, v, calc);
        lc.push(["Versão " + VERSOES[v].rotulo + " (" + VERSOES[v].quando + "), semana A"]);
        lc.push(["Folha atual da equipe", Math.round(cus.folha)]);
        lc.push(["Horas descobertas por semana", calc.falta]);
        lc.push(["Valor da hora normal", Math.round(cus.valorHora * 100) / 100]);
        if (!cus.ops.length) lc.push(["Custo extra", 0, "tudo coberto"]);
        cus.ops.forEach(function (o) { lc.push([o.titulo + (o.best ? " (mais barata)" : "") + (o.viavel ? "" : " (não resolve)"), Math.round(o.custo), o.txt]); });
        lc.push([]);
      });
      lc.push(["Valores mensais com 4,33 semanas por mês. Exemplo de cálculo; confirme com o seu contador."]);
      var wc = X.utils.aoa_to_sheet(lc);
      wc["!cols"] = [{ wch: 44 }, { wch: 14 }, { wch: 90 }];
      X.utils.book_append_sheet(wb, wc, "Custos");

      X.writeFile(wb, "escala-5x2-" + slug(state.negocio.nome) + ".xlsx");
      toast("Planilha baixada.");
    }).catch(function () { toast("Não foi possível gerar a planilha agora. Tente de novo."); });
  }

  /* ------------------------------------------------------------------ */
  /* Eventos                                                            */
  /* ------------------------------------------------------------------ */

  function ligar() {
    document.querySelectorAll("[data-v]").forEach(function (b) { b.addEventListener("click", function () { state.versao = b.dataset.v; salvar(); render(); }); });
    document.querySelectorAll("[data-s]").forEach(function (b) { b.addEventListener("click", function () { state.semana = b.dataset.s; salvar(); render(); }); });

    $("#grid").addEventListener("click", function (e) {
      var b = e.target.closest("button.cell"); if (b) abrirCelula(b.dataset.p, b.dataset.d);
    });
    $("#dlgForm").addEventListener("change", atualizaDlg);
    $("#dlgForm").addEventListener("input", function (e) { if (e.target.type === "time") $("#dlgIni").dataset.rot = ""; atualizaDlg(); });
    $("#dlgPresets").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $("#dlgIni").value = b.dataset.ini; $("#dlgFim").value = b.dataset.fim; $("#dlgIni").dataset.rot = b.dataset.rot;
      document.querySelector('#dlgForm input[value=turno]').checked = true;
      atualizaDlg();
    });
    $("#dlgForm").addEventListener("submit", function (e) {
      if (e.submitter && e.submitter.value === "ok" && salvarCelula() === false) e.preventDefault();
    });

    ["cSal", "cEnc", "cHe"].forEach(function (id) {
      $("#" + id).addEventListener("change", function () {
        var k = { cSal: "salario", cEnc: "encargos", cHe: "he" }[id];
        var val = Number($("#" + id).value);
        if (!(val > 0)) return render();
        state.custos[k] = val; salvar(); render();
      });
    });
    $("#opcoes").addEventListener("click", function (e) {
      var b = e.target.closest("[data-acao]"); if (!b) return;
      state.equipe.push({ id: uid(), nome: "Nova contratação", funcao: "a contratar", salario: null, folgaFixa: "" });
      gerarTudo(state); salvar(); renderCfg(); render();
      toast("Pessoa nova colocada na escala. Veja como fica a cobertura.");
    });

    $("#fNome").addEventListener("change", function () { state.negocio.nome = $("#fNome").value.trim(); salvar(); render(); });
    $("#fTipo").addEventListener("change", function () { state.negocio.tipo = $("#fTipo").value.trim(); salvar(); });
    $("#tblHorario").addEventListener("change", function (e) {
      var el = e.target, d = el.dataset.d; if (!d) return;
      if (el.dataset.h === "aberto") {
        var tr = el.closest("tr");
        state.funcionamento[d] = el.checked ? { abre: tr.querySelector('[data-h=abre]').value || "08:00", fecha: tr.querySelector('[data-h=fecha]').value || "18:00", pessoas: Number(tr.querySelector('[data-h=pessoas]').value) || 1 } : null;
        renderCfg();
      } else if (state.funcionamento[d]) {
        state.funcionamento[d][el.dataset.h] = el.dataset.h === "pessoas" ? Math.max(1, Number(el.value) || 1) : el.value;
      }
      marcarPendente(); salvar(); render();
    });
    $("#tblEquipe").addEventListener("change", function (e) {
      var tr = e.target.closest("tr[data-id]"); if (!tr) return;
      var p = state.equipe.filter(function (x) { return x.id === tr.dataset.id; })[0]; if (!p) return;
      var k = e.target.dataset.e;
      p[k] = k === "salario" ? (Number(e.target.value) || null) : e.target.value.trim();
      if (k === "folgaFixa") marcarPendente();
      salvar(); render();
    });
    $("#tblEquipe").addEventListener("click", function (e) {
      var b = e.target.closest("[data-del]"); if (!b) return;
      if (state.equipe.length <= 1) return toast("A escala precisa de pelo menos 1 pessoa.");
      state.equipe = state.equipe.filter(function (p) { return p.id !== b.dataset.del; });
      salvar(); renderCfg(); render();
    });
    $("#btnAddPessoa").addEventListener("click", function () {
      var p = { id: uid(), nome: "Pessoa " + (state.equipe.length + 1), funcao: "", salario: null, folgaFixa: "" };
      state.equipe.push(p);
      marcarPendente(); salvar(); renderCfg(); render();
    });

    var confirmando = false;
    $("#btnRegen").addEventListener("click", function () {
      var b = $("#btnRegen");
      if (!confirmando) {
        confirmando = true; b.textContent = "Clique de novo para confirmar"; b.classList.add("danger");
        setTimeout(function () { confirmando = false; b.textContent = "Montar a escala de novo com estes dados"; b.classList.remove("danger"); }, 4000);
        return;
      }
      confirmando = false; b.textContent = "Montar a escala de novo com estes dados"; b.classList.remove("danger");
      gerarTudo(state); salvar(); render();
      $("#regenAviso").textContent = "Refaz as escalas de 42 h e 40 h. As mudanças feitas à mão na grade se perdem.";
      toast("Escalas de 42 h e 40 h montadas de novo.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    function pdf() { fecharMenu(); toast("Na janela de impressão, escolha “Salvar como PDF”."); setTimeout(function () { window.print(); }, 400); }
    $("#btnPdf").addEventListener("click", pdf);
    $("#btnPdf2").addEventListener("click", pdf);
    $("#btnXlsx").addEventListener("click", baixarPlanilha);
    $("#btnXlsx2").addEventListener("click", function () { fecharMenu(); baixarPlanilha(); });

    // Menu lateral (gaveta no celular)
    function fecharMenu() { $("#side").classList.remove("open"); $("#backdrop").classList.remove("on"); }
    $("#menuBtn").addEventListener("click", function () { $("#side").classList.add("open"); $("#backdrop").classList.add("on"); });
    $("#sideClose").addEventListener("click", fecharMenu);
    $("#backdrop").addEventListener("click", fecharMenu);
    document.querySelectorAll(".side-nav a, .side-nav [data-v]").forEach(function (a) { a.addEventListener("click", fecharMenu); });
    $("#navCfg").addEventListener("click", function () { $("#cfg").open = true; });
    if (PAINEL) {
      $("#btnLink").innerHTML = '<svg class="ic"><use href="#i-x"/></svg>Sair (' + esc(PAINEL.usuario.email) + ")";
      $("#btnLink").addEventListener("click", function () {
        fetch(PAINEL.sair, { method: "POST", credentials: "same-origin" }).finally(function () { location.href = PAINEL.login; });
      });
      return;
    }
    $("#btnLink").addEventListener("click", function () {
      var url = linkPessoal();
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast("Link copiado. Guarde: ele abre a sua escala em qualquer aparelho."); }, function () { toast("Copie o endereço da barra do navegador."); });
      else toast("Copie o endereço da barra do navegador.");
    });
  }

  function marcarPendente() {
    $("#regenAviso").textContent = "Você mudou horário ou equipe. A grade atual foi mantida; clique para montar de novo com os dados novos (as mudanças feitas à mão na grade se perdem).";
  }

  /* ------------------------------------------------------------------ */

  function iniciar(s, novo) {
    state = s;
    ligar();
    renderCfg();
    render();
    if (novo || !PAINEL) salvar();
    else $("#tSalvo").textContent = "salvo na sua conta";
    if (novo) { $("#cfg").open = true; toast("Exemplo carregado. Troque pelos dados do seu negócio no fim da página."); }
  }

  if (PAINEL) {
    fetch(PAINEL.api, { credentials: "same-origin" })
      .then(function (r) {
        if (r.status === 401) { location.href = PAINEL.login; throw new Error("sessão"); }
        return r.json();
      })
      .then(function (d) { iniciar(d.estado ? normalizar(d.estado) : estadoExemplo(), !d.estado); })
      .catch(function (e) { if (e.message !== "sessão") toast("Não foi possível abrir sua escala. Recarregue a página."); });
  } else {
    state = carregar();
    iniciar(state || estadoExemplo(), !state);
  }

  // Usado pelo teste automatizado.
  window.__j40h = { get state() { return state; }, calcular: calcular, custos: custos, linkPessoal: linkPessoal };
})();
