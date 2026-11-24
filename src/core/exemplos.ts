/**
 * Exemplos prontos (no MESMO formato JSON aceito pelo carregador).
 * Os arquivos em /exemplos/*.json têm o mesmo conteúdo (um teste confere).
 * O campo opcional "layout" ({ estado: [x, y] }) só é usado pela interface gráfica
 * para posicionar os estados no diagrama; os simuladores o ignoram.
 */

export interface Exemplo {
  id: string;
  titulo: string;
  /** objeto no formato JSON de entrada */
  json: Record<string, unknown>;
  /** cadeias sugeridas para testar */
  entradas: string[];
}

// ---------------------------------------------------------------------------
// Autômatos finitos
// ---------------------------------------------------------------------------
export const EXEMPLOS_AF: Exemplo[] = [
  {
    id: 'afd-enunciado',
    titulo: 'AFD do enunciado (q0 –a→ q1 –b→ q2)',
    json: {
      tipo: 'AFD',
      nome: 'AFD do enunciado',
      descricao: 'Exemplo do PDF: aceita exatamente a cadeia "ab".',
      alfabeto: ['a', 'b'],
      estados: ['q0', 'q1', 'q2'],
      estadoInicial: 'q0',
      estadosFinais: ['q2'],
      transicoes: [
        { de: 'q0', simbolo: 'a', para: 'q1' },
        { de: 'q1', simbolo: 'b', para: 'q2' },
      ],
    },
    entradas: ['ab', 'a', 'abb', 'ba', 'λ'],
  },
  {
    id: 'afd-termina-ab',
    titulo: 'AFD: cadeias terminadas em "ab"',
    json: {
      tipo: 'AFD',
      nome: 'Termina em ab',
      descricao: 'L = { w ∈ {a,b}* | w termina em ab }. AFD completo.',
      alfabeto: ['a', 'b'],
      estados: ['q0', 'q1', 'q2'],
      estadoInicial: 'q0',
      estadosFinais: ['q2'],
      transicoes: {
        q0: { a: 'q1', b: 'q0' },
        q1: { a: 'q1', b: 'q2' },
        q2: { a: 'q1', b: 'q0' },
      },
    },
    entradas: ['aab', 'abab', 'aba', 'b', 'λ'],
  },
  {
    id: 'afn-contem-aba',
    titulo: 'AFN: contém "aba"',
    json: {
      tipo: 'AFN',
      nome: 'Contém aba',
      descricao: 'L = { w ∈ {a,b}* | aba é subcadeia de w }. O AFN "adivinha" onde aba começa.',
      alfabeto: ['a', 'b'],
      estados: ['q0', 'q1', 'q2', 'q3'],
      estadoInicial: 'q0',
      estadosFinais: ['q3'],
      transicoes: [
        { de: 'q0', simbolo: 'a', para: ['q0', 'q1'] },
        { de: 'q0', simbolo: 'b', para: 'q0' },
        { de: 'q1', simbolo: 'b', para: 'q2' },
        { de: 'q2', simbolo: 'a', para: 'q3' },
        { de: 'q3', simbolo: 'a', para: 'q3' },
        { de: 'q3', simbolo: 'b', para: 'q3' },
      ],
    },
    entradas: ['bbabab', 'abba', 'aba', 'ab'],
  },
];

// ---------------------------------------------------------------------------
// Gramáticas livres de contexto
// ---------------------------------------------------------------------------
export const EXEMPLOS_GLC: Exemplo[] = [
  {
    id: 'glc-anbn',
    titulo: 'S → aSb | λ (enunciado)',
    json: {
      nome: 'aⁿbⁿ',
      descricao: 'Exemplo do PDF: L(G) = { aⁿbⁿ | n ≥ 0 }.',
      variaveis: ['S'],
      terminais: ['a', 'b'],
      inicial: 'S',
      producoes: ['S -> aSb | λ'],
    },
    entradas: ['aaabbb', 'ab', 'λ', 'aabbb', 'abab'],
  },
  {
    id: 'glc-parenteses',
    titulo: 'Parênteses balanceados',
    json: {
      nome: 'Parênteses balanceados',
      descricao: 'S → (S)S | λ — gera todas as sequências bem formadas de parênteses.',
      variaveis: ['S'],
      terminais: ['(', ')'],
      inicial: 'S',
      producoes: ['S -> (S)S | λ'],
    },
    entradas: ['(()())', '()()', '(()', ')('],
  },
];

// ---------------------------------------------------------------------------
// Autômatos com pilha
// ---------------------------------------------------------------------------
export const EXEMPLOS_AP: Exemplo[] = [
  {
    id: 'ap-anbn',
    titulo: 'AP para aⁿbⁿ (n ≥ 1) — enunciado',
    json: {
      nome: 'aⁿbⁿ, n ≥ 1',
      descricao: 'Empilha um A para cada a, desempilha um A para cada b. Aceita por estado final quando volta ao fundo Z.',
      estados: ['q0', 'q1', 'q2', 'q3'],
      alfabetoEntrada: ['a', 'b'],
      alfabetoPilha: ['A', 'Z'],
      estadoInicial: 'q0',
      simboloInicialPilha: 'Z',
      estadosFinais: ['q3'],
      aceitacao: 'estadoFinal',
      transicoes: [
        { de: 'q0', le: 'a', desempilha: 'Z', empilha: 'AZ', para: 'q1' },
        { de: 'q1', le: 'a', desempilha: 'A', empilha: 'AA', para: 'q1' },
        { de: 'q1', le: 'b', desempilha: 'A', empilha: 'λ', para: 'q2' },
        { de: 'q2', le: 'b', desempilha: 'A', empilha: 'λ', para: 'q2' },
        { de: 'q2', le: 'λ', desempilha: 'Z', empilha: 'Z', para: 'q3' },
      ],
    },
    entradas: ['aaabbb', 'ab', 'aabbb', 'aaabb', 'abab', 'λ'],
  },
  {
    id: 'ap-parenteses',
    titulo: 'Parênteses balanceados (pilha vazia)',
    json: {
      nome: 'Parênteses balanceados',
      descricao: 'Aceitação por PILHA VAZIA: ao final, desempilha o fundo Z.',
      estados: ['q'],
      alfabetoEntrada: ['(', ')'],
      alfabetoPilha: ['X', 'Z'],
      estadoInicial: 'q',
      simboloInicialPilha: 'Z',
      estadosFinais: [],
      aceitacao: 'pilhaVazia',
      transicoes: [
        { de: 'q', le: '(', desempilha: 'Z', empilha: 'XZ', para: 'q' },
        { de: 'q', le: '(', desempilha: 'X', empilha: 'XX', para: 'q' },
        { de: 'q', le: ')', desempilha: 'X', empilha: 'λ', para: 'q' },
        { de: 'q', le: 'λ', desempilha: 'Z', empilha: 'λ', para: 'q' },
      ],
    },
    entradas: ['(())()', '(()', '())(', 'λ'],
  },
];

// ---------------------------------------------------------------------------
// Máquinas de Turing
// ---------------------------------------------------------------------------
export const EXEMPLOS_MT: Exemplo[] = [
  {
    id: 'mt-w-hash-w',
    titulo: 'Opção A — reconhece { w#w }',
    json: {
      nome: 'L = { w#w | w ∈ {0,1}* }',
      descricao:
        'Ziguezague: marca o 1º símbolo não marcado de w com x, cruza o #, confere o símbolo correspondente e o marca; ao final verifica que só restaram x.',
      modo: 'reconhecedor',
      estados: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'qa'],
      alfabetoEntrada: ['0', '1', '#'],
      alfabetoFita: ['0', '1', '#', 'x', '_'],
      branco: '_',
      estadoInicial: 'q1',
      estadoAceita: 'qa',
      transicoes: [
        { de: 'q1', le: '0', escreve: 'x', move: 'R', para: 'q2' },
        { de: 'q1', le: '1', escreve: 'x', move: 'R', para: 'q3' },
        { de: 'q1', le: '#', escreve: '#', move: 'R', para: 'q8' },
        { de: 'q2', le: '0', escreve: '0', move: 'R', para: 'q2' },
        { de: 'q2', le: '1', escreve: '1', move: 'R', para: 'q2' },
        { de: 'q2', le: '#', escreve: '#', move: 'R', para: 'q4' },
        { de: 'q3', le: '0', escreve: '0', move: 'R', para: 'q3' },
        { de: 'q3', le: '1', escreve: '1', move: 'R', para: 'q3' },
        { de: 'q3', le: '#', escreve: '#', move: 'R', para: 'q5' },
        { de: 'q4', le: 'x', escreve: 'x', move: 'R', para: 'q4' },
        { de: 'q4', le: '0', escreve: 'x', move: 'L', para: 'q6' },
        { de: 'q5', le: 'x', escreve: 'x', move: 'R', para: 'q5' },
        { de: 'q5', le: '1', escreve: 'x', move: 'L', para: 'q6' },
        { de: 'q6', le: '0', escreve: '0', move: 'L', para: 'q6' },
        { de: 'q6', le: '1', escreve: '1', move: 'L', para: 'q6' },
        { de: 'q6', le: 'x', escreve: 'x', move: 'L', para: 'q6' },
        { de: 'q6', le: '#', escreve: '#', move: 'L', para: 'q7' },
        { de: 'q7', le: '0', escreve: '0', move: 'L', para: 'q7' },
        { de: 'q7', le: '1', escreve: '1', move: 'L', para: 'q7' },
        { de: 'q7', le: 'x', escreve: 'x', move: 'R', para: 'q1' },
        { de: 'q8', le: 'x', escreve: 'x', move: 'R', para: 'q8' },
        { de: 'q8', le: '_', escreve: '_', move: 'S', para: 'qa' },
      ],
      layout: {
        q1: [0, 0],
        q2: [170, -150],
        q4: [380, -150],
        q3: [170, 150],
        q5: [380, 150],
        q6: [580, 0],
        q7: [300, 0],
        q8: [0, 290],
        qa: [210, 290],
      },
    },
    entradas: ['011#011', '01#10', '#', '0#00', '01#01#01'],
  },
  {
    id: 'mt-soma-unaria',
    titulo: 'Opção B — soma unária',
    json: {
      nome: 'Soma em unário',
      descricao: 'Entrada 0ᵐ10ⁿ (ex.: 000100 = 3+2). Troca o separador 1 por 0 e apaga o último 0. Saída: 0ᵐ⁺ⁿ.',
      modo: 'transdutor',
      estados: ['q0', 'q1', 'q2', 'qf'],
      alfabetoEntrada: ['0', '1'],
      alfabetoFita: ['0', '1', '_'],
      branco: '_',
      estadoInicial: 'q0',
      estadoAceita: 'qf',
      transicoes: [
        { de: 'q0', le: '0', escreve: '0', move: 'R', para: 'q0' },
        { de: 'q0', le: '1', escreve: '0', move: 'R', para: 'q1' },
        { de: 'q1', le: '0', escreve: '0', move: 'R', para: 'q1' },
        { de: 'q1', le: '_', escreve: '_', move: 'L', para: 'q2' },
        { de: 'q2', le: '0', escreve: '_', move: 'S', para: 'qf' },
      ],
    },
    entradas: ['000100', '01', '1', '0000010000', '0101'],
  },
];
