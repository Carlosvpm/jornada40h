import postsJson from "../data/posts.json";
import type { Tema } from "./theme";

export type Cor = "verde" | "vermelho" | "ouro";

export type Numeros = {
  funcionarios?: number;
  horasAbertoSemana?: number;
  pessoasAoMesmoTempo?: number;
  salarioMedio?: number;
  funcionariosAMais: number;
  custoContratarMes: number;
  custoContratarAno?: number;
  custoHoraExtraMes: number;
  horasReduzir: number;
};

export type NumeroAnimado = {
  prefixo?: string;
  valor: number;
  sufixo?: string;
  rotulo?: string;
  decimais?: number;
};

export type Destaque = {
  rotulo: string;
  valor: string | number;
  formato?: "moeda" | "numero";
  sufixo?: string;
  sub?: string;
};

export type Slide = {
  layout: "capa" | "texto" | "conta" | "saidas" | "erro" | "cta";
  kicker?: string;
  titulo: string;
  corpo?: string;
  bullets?: string[];
  linhas?: { rotulo: string; valor: string; cor?: Cor }[];
  numero?: NumeroAnimado;
  destaque?: Destaque;
  opcoes?: { titulo: string; valor: string; nota: string; cor: Cor }[];
  numeroErro?: number;
  solucao?: string;
  botao?: string;
  rodape?: string;
};

export type Cena = {
  tipo:
    | "manchete"
    | "stats"
    | "texto"
    | "numero"
    | "grade"
    | "grade-solucao"
    | "enquete"
    | "cta";
  duracao: number; // segundos
  kicker?: string;
  titulo?: string;
  corpo?: string;
  legenda?: string;
  itens?: { de?: number; para?: number; valor?: number; texto?: string; rotulo: string }[];
  numero?: NumeroAnimado;
  destaque?: Destaque;
  opcoes?: string[];
  botao?: string;
  rodape?: string;
};

export type Escala = {
  dias: string[];
  funcionarios: { nome: string; folgas: number[] }[];
  minimo: number[];
  solucao?: { nome: string; trabalha: number[] };
};

export type Post = {
  id: string;
  semana: number;
  dia: string;
  type: "carrossel" | "reel" | "story";
  setor: string;
  tema: Tema;
  titulo: string;
  numeros: Numeros;
  slides?: Slide[];
  cenas?: Cena[];
  escala?: Escala;
  cta: string;
  legenda: string;
  hashtags: string[];
};

export const posts = postsJson as Post[];

export const FPS = 30;

export const duracaoCenas = (cenas: Cena[]) =>
  cenas.reduce((acc, c) => acc + Math.round(c.duracao * FPS), 0);

export const getPost = (id: string): Post => {
  const p = posts.find((x) => x.id === id);
  if (!p) throw new Error(`Post não encontrado: ${id}`);
  return p;
};
