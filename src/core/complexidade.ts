/**
 * Módulo 6 — Complexidade Computacional.
 *
 * (1) Tabela teórica: para cada algoritmo implementado, melhor caso, caso médio e
 *     pior caso nas notações O (limite superior), Ω (limite inferior) e Θ (justo).
 * (2) Medição empírica: executa os simuladores com entradas de tamanho crescente,
 *     conta operações elementares e compara com a função de crescimento esperada
 *     (a razão operações / f(n) deve se estabilizar numa constante).
 */
import { AutomatoFinito } from './automato-finito.js';
import { AutomatoPilha } from './automato-pilha.js';
import { EXEMPLOS_AF, EXEMPLOS_AP, EXEMPLOS_GLC, EXEMPLOS_MT } from './exemplos.js';
import { GramaticaLC } from './glc.js';
import { Alfabeto } from './linguagem.js';
import { MaquinaTuring } from './maquina-turing.js';

export interface Caso {
  /** notação principal, ex.: "Θ(n)" */
  notacao: string;
  /** O, Ω e Θ explicitamente (Θ ausente quando não há limite justo único) */
  O: string;
  Omega: string;
  Theta?: string;
  quando: string;
}

export interface AnaliseAlgoritmo {
  id: string;
  modulo: string;
  algoritmo: string;
  descricao: string;
  variaveis: string;
  melhor: Caso;
  medio: Caso;
  pior: Caso;
}

const c = (O: string, Omega: string, Theta: string | undefined, quando: string): Caso => ({ notacao: Theta ?? O, O, Omega, Theta, quando });

export const ANALISES: AnaliseAlgoritmo[] = [
  {
    id: 'validar-cadeia',
    modulo: '1 · Linguagens',
    algoritmo: 'Validar w ∈ Σ*',
    descricao: 'Percorre a cadeia consultando cada símbolo num conjunto (hash) — O(1) por consulta. Percorre até o fim para listar todos os símbolos inválidos.',
    variaveis: 'n = |w|',
    melhor: c('O(n)', 'Ω(n)', 'Θ(n)', 'sempre lê os n símbolos'),
    medio: c('O(n)', 'Ω(n)', 'Θ(n)', 'idem'),
    pior: c('O(n)', 'Ω(n)', 'Θ(n)', 'idem'),
  },
  {
    id: 'tamanho-concatenacao',
    modulo: '1 · Linguagens',
    algoritmo: 'Tamanho |w| e concatenação u·v',
    descricao: '|w| conta os pontos de código; u·v copia as duas cadeias para uma nova.',
    variaveis: 'n = |w|, ou n = |u| + |v|',
    melhor: c('O(n)', 'Ω(n)', 'Θ(n)', 'copiar/contar exige visitar cada símbolo'),
    medio: c('O(n)', 'Ω(n)', 'Θ(n)', 'idem'),
    pior: c('O(n)', 'Ω(n)', 'Θ(n)', 'idem'),
  },
  {
    id: 'sigma-estrela',
    modulo: '1 · Linguagens',
    algoritmo: 'Gerar Σ* e Σ⁺ até tamanho k',
    descricao: 'Contador em base |Σ| para cada tamanho 0..k. A saída tem Σᵢ₌₀ᵏ mⁱ cadeias, então o custo é dominado pelo tamanho da saída.',
    variaveis: 'm = |Σ| ≥ 2, k = tamanho máximo',
    melhor: c('O(k·mᵏ)', 'Ω(k·mᵏ)', 'Θ(k·mᵏ)', 'toda cadeia precisa ser escrita'),
    medio: c('O(k·mᵏ)', 'Ω(k·mᵏ)', 'Θ(k·mᵏ)', 'idem'),
    pior: c('O(k·mᵏ)', 'Ω(k·mᵏ)', 'Θ(k·mᵏ)', 'idem — exponencial em k'),
  },
  {
    id: 'er-thompson',
    modulo: '1 · Linguagens',
    algoritmo: 'L por expressão regular (parser + Thompson)',
    descricao: 'Parser descendente recursivo e construção de Thompson: cada operador gera no máximo 2 estados e 4 transições λ.',
    variaveis: 'r = |expressão|',
    melhor: c('O(r)', 'Ω(r)', 'Θ(r)', 'cada token é visitado uma vez'),
    medio: c('O(r)', 'Ω(r)', 'Θ(r)', 'idem'),
    pior: c('O(r)', 'Ω(r)', 'Θ(r)', 'idem; o AFN resultante tem ≤ 2r estados'),
  },
  {
    id: 'afd',
    modulo: '2 · Autômato Finito',
    algoritmo: 'Simulação de AFD',
    descricao: 'δ fica num Map (estado → símbolo → destino): cada símbolo lido custa O(1).',
    variaveis: 'n = |w|',
    melhor: c('O(1)', 'Ω(1)', 'Θ(1)', 'AFD parcial: transição indefinida no 1º símbolo'),
    medio: c('O(n)', 'Ω(n)', 'Θ(n)', 'AFD completo sempre lê a cadeia inteira'),
    pior: c('O(n)', 'Ω(n)', 'Θ(n)', 'lê os n símbolos, 1 transição cada'),
  },
  {
    id: 'afn',
    modulo: '2 · Autômato Finito',
    algoritmo: 'Simulação de AFN (conjuntos + fecho-λ)',
    descricao: 'Mantém o conjunto S de estados ativos. A cada símbolo calcula mover(S, a) e o fecho-λ por DFS, visitando cada estado/transição no máximo uma vez.',
    variaveis: 'n = |w|, |Q| estados, |δ| transições',
    melhor: c('O(1)', 'Ω(1)', 'Θ(1)', 'o conjunto ativo fica vazio no 1º símbolo'),
    medio: c('O(n·s̄)', 'Ω(n)', 'Θ(n·s̄)', 's̄ = tamanho médio do conjunto ativo'),
    pior: c('O(n·(|Q| + |δ|))', 'Ω(n·|Q|)', 'Θ(n·(|Q| + |δ|))', 'todos os estados ativos em todo passo'),
  },
  {
    id: 'glc',
    modulo: '3 · Gramática',
    algoritmo: 'Reconhecimento por CYK generalizado',
    descricao:
      'Programação dinâmica: D[A,i,j] = 1 ⇔ A ⇒* w[i..j). Para cada uma das Θ(n²) subcadeias testa cada produção binarizada em O(n) pontos de corte. Produções λ/unitárias exigem um ponto fixo de até |V| rodadas.',
    variaveis: 'n = |w|, |G| = soma dos tamanhos das produções, |V| variáveis',
    melhor: c('O(|G|·n³)', 'Ω(|G|·n³)', 'Θ(|G|·n³)', 'sem cadeias de produções unitárias: 1 rodada por subcadeia'),
    medio: c('O(|G|·n³)', 'Ω(|G|·n³)', 'Θ(|G|·n³)', 'gramáticas usuais estabilizam em poucas rodadas'),
    pior: c('O(|V|·|G|·n³)', 'Ω(|G|·n³)', 'Θ(|V|·|G|·n³)', 'longas cadeias A→B→C… exigem |V| rodadas'),
  },
  {
    id: 'derivacao',
    modulo: '3 · Gramática',
    algoritmo: 'Árvore e derivação mais à esquerda',
    descricao: 'Reconstrói a árvore seguindo os ponteiros da tabela; a derivação expande a variável mais à esquerda a cada passo (reescrevendo a forma sentencial).',
    variaveis: 't = nº de nós da árvore (t = Θ(n) sem ciclos λ)',
    melhor: c('O(t)', 'Ω(t)', 'Θ(t)', 'construção da árvore'),
    medio: c('O(t²)', 'Ω(t)', 'Θ(t²)', 'cada passo copia a forma sentencial'),
    pior: c('O(t²)', 'Ω(t²)', 'Θ(t²)', 't passos × forma de tamanho O(t)'),
  },
  {
    id: 'ap-det',
    modulo: '4 · Autômato com Pilha',
    algoritmo: 'Simulação de AP determinístico (ex.: aⁿbⁿ)',
    descricao: 'Pilha persistente (lista encadeada com hash-consing): empilhar, desempilhar e comparar configurações custam O(1).',
    variaveis: 'n = |w|',
    melhor: c('O(1)', 'Ω(1)', 'Θ(1)', 'trava no 1º símbolo (ex.: "b…")'),
    medio: c('O(n)', 'Ω(n)', 'Θ(n)', 'uma transição por símbolo + poucas λ'),
    pior: c('O(n)', 'Ω(n)', 'Θ(n)', 'aⁿbⁿ: 2n + 1 transições'),
  },
  {
    id: 'ap-ndet',
    modulo: '4 · Autômato com Pilha',
    algoritmo: 'Simulação de AP não determinístico (BFS)',
    descricao: 'Busca em largura no grafo de configurações (estado, posição, pilha) com conjunto de visitados — cada configuração distinta é processada uma única vez.',
    variaveis: 'n = |w|, h = altura máxima da pilha, |Γ| símbolos de pilha',
    melhor: c('O(1)', 'Ω(1)', 'Θ(1)', 'todas as computações morrem no 1º símbolo'),
    medio: c('O(n²)', 'Ω(n)', undefined, 'não determinismo limitado: wwᴿ explora Θ(n²) configurações'),
    pior: c('O(|Q|·n·|Γ|ʰ)', 'Ω(|Γ|ʰ)', undefined, 'exponencial na altura da pilha — por isso há limites de busca'),
  },
  {
    id: 'mt-wcw',
    modulo: '5 · Máquina de Turing',
    algoritmo: 'MT para { w#w } (ziguezague)',
    descricao: 'Para cada um dos m símbolos de w a cabeça vai até o lado direito e volta: Θ(m) passos por símbolo.',
    variaveis: 'n = |entrada| = 2m + 1',
    melhor: c('O(1)', 'Ω(1)', 'Θ(1)', 'ex.: começa com "#" seguido de símbolo ≠ x'),
    medio: c('O(n)', 'Ω(n)', 'Θ(n)', 'entradas aleatórias divergem cedo: 1 ida e volta'),
    pior: c('O(n²)', 'Ω(n²)', 'Θ(n²)', 'w#w aceita: m idas e voltas de Θ(m) passos'),
  },
  {
    id: 'mt-soma',
    modulo: '5 · Máquina de Turing',
    algoritmo: 'MT de soma unária',
    descricao: 'Uma única varredura para a direita (troca o 1 por 0) e um passo para trás (apaga um 0).',
    variaveis: 'n = |0ᵐ10ⁿ|',
    melhor: c('O(1)', 'Ω(1)', 'Θ(1)', 'entrada vazia/formato inválido no início'),
    medio: c('O(n)', 'Ω(n)', 'Θ(n)', 'entrada válida: n + 2 passos'),
    pior: c('O(n)', 'Ω(n)', 'Θ(n)', 'idem'),
  },
];

// ---------------------------------------------------------------------------
// Medição empírica
// ---------------------------------------------------------------------------

export interface PontoMedido {
  n: number;
  operacoes: number;
  /** operações / f(n) — deve tender a uma constante se a análise estiver certa */
  razao: number;
  ms: number;
}

export interface Experimento {
  id: string;
  titulo: string;
  esperado: string;
  eixoX: string;
  /** função de crescimento esperada (sem a constante) */
  f: (n: number) => number;
  pontos: PontoMedido[];
}

interface DefExperimento {
  id: string;
  titulo: string;
  esperado: string;
  eixoX: string;
  tamanhos: number[];
  f: (n: number) => number;
  medir: (n: number) => number;
}

function definirExperimentos(): DefExperimento[] {
  const afd = AutomatoFinito.deJSON(EXEMPLOS_AF.find((e) => e.id === 'afd-termina-ab')!.json);
  const afn = AutomatoFinito.deJSON(EXEMPLOS_AF.find((e) => e.id === 'afn-contem-aba')!.json);
  const glc = GramaticaLC.deJSON(EXEMPLOS_GLC.find((e) => e.id === 'glc-anbn')!.json);
  const ap = AutomatoPilha.deJSON(EXEMPLOS_AP.find((e) => e.id === 'ap-anbn')!.json);
  const mtA = MaquinaTuring.deJSON(EXEMPLOS_MT.find((e) => e.id === 'mt-w-hash-w')!.json);
  const mtB = MaquinaTuring.deJSON(EXEMPLOS_MT.find((e) => e.id === 'mt-soma-unaria')!.json);
  const ab = (n: number) => Array.from({ length: n }, (_, i) => 'ab'[(i * 7 + (i >> 2)) % 2]).join('');
  const bits = (n: number) => Array.from({ length: n }, (_, i) => '01'[(i * 5 + (i >> 1)) % 2]).join('');
  return [
    { id: 'afd', titulo: 'AFD (termina em ab)', esperado: 'Θ(n)', eixoX: 'n = |w|', tamanhos: [8, 16, 32, 64, 128, 256, 512, 1024], f: (n) => n, medir: (n) => afd.executar(ab(n)).operacoes },
    { id: 'afn', titulo: 'AFN (contém aba)', esperado: 'Θ(n·|Q|)', eixoX: 'n = |w|', tamanhos: [8, 16, 32, 64, 128, 256, 512, 1024], f: (n) => n, medir: (n) => afn.executar(ab(n)).operacoes },
    { id: 'glc', titulo: 'CYK generalizado (S → aSb | λ)', esperado: 'Θ(n³)', eixoX: 'n = |aᵐbᵐ|', tamanhos: [4, 8, 16, 24, 32, 48, 64], f: (n) => n ** 3, medir: (n) => glc.reconhecer('a'.repeat(n / 2) + 'b'.repeat(n / 2)).operacoes },
    { id: 'ap', titulo: 'AP determinístico (aⁿbⁿ)', esperado: 'Θ(n)', eixoX: 'n = |aᵐbᵐ|', tamanhos: [8, 16, 32, 64, 128, 256, 512, 1024], f: (n) => n, medir: (n) => ap.executar('a'.repeat(n / 2) + 'b'.repeat(n / 2)).operacoes },
    {
      id: 'mt-wcw',
      titulo: 'MT w#w (pior caso: aceita)',
      esperado: 'Θ(n²)',
      eixoX: 'n = |w#w|',
      tamanhos: [9, 17, 33, 65, 129, 257],
      f: (n) => n * n,
      medir: (n) => {
        const w = bits((n - 1) / 2);
        return mtA.executar(`${w}#${w}`, 10_000_000, false).numeroPassos;
      },
    },
    {
      id: 'mt-soma',
      titulo: 'MT soma unária',
      esperado: 'Θ(n)',
      eixoX: 'n = |0ᵐ10ᵐ|',
      tamanhos: [9, 17, 33, 65, 129, 257, 513, 1025],
      f: (n) => n,
      medir: (n) => {
        const m = (n - 1) / 2;
        return mtB.executar(`${'0'.repeat(m)}1${'0'.repeat(m)}`, 10_000_000, false).numeroPassos;
      },
    },
    { id: 'sigma', titulo: 'Σᵏ com |Σ| = 2', esperado: 'Θ(2ᵏ) cadeias', eixoX: 'k', tamanhos: [2, 4, 6, 8, 10, 12, 14], f: (k) => 2 ** k, medir: (k) => Alfabeto.deTexto('{a,b}').potencia(k, 1 << 20).cadeias.length },
  ];
}

const agora = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Roda todos os experimentos (ou só os ids pedidos). */
export function medirComplexidade(ids?: string[]): Experimento[] {
  return definirExperimentos()
    .filter((d) => !ids || ids.includes(d.id))
    .map((d) => ({
      id: d.id,
      titulo: d.titulo,
      esperado: d.esperado,
      eixoX: d.eixoX,
      f: d.f,
      pontos: d.tamanhos.map((n) => {
        const t0 = agora();
        const operacoes = d.medir(n);
        const ms = agora() - t0;
        return { n, operacoes, razao: operacoes / d.f(n), ms };
      }),
    }));
}
