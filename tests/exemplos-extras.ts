/**
 * Exemplos usados só pelos testes (não aparecem na interface nem no menu).
 * Cobrem casos que os exemplos da interface não cobrem: AFN com λ, AFN cujo AFD
 * cresce exponencialmente, gramáticas ambíguas e AP não determinístico.
 */
import type { Exemplo } from '../src/core/exemplos.js';

export const EXTRAS_AF: Exemplo[] = [
  {
    id: 'afd-mult3',
    titulo: 'AFD: binário múltiplo de 3',
    json: {
      tipo: 'AFD',
      nome: 'Múltiplo de 3 (binário)',
      descricao: 'Aceita números binários divisíveis por 3 (o estado guarda o resto da divisão). λ é lido como 0.',
      alfabeto: ['0', '1'],
      estados: ['r0', 'r1', 'r2'],
      estadoInicial: 'r0',
      estadosFinais: ['r0'],
      transicoes: {
        r0: { '0': 'r0', '1': 'r1' },
        r1: { '0': 'r2', '1': 'r0' },
        r2: { '0': 'r1', '1': 'r2' },
      },
    },
    entradas: ['110', '1001', '111', '10'],
  },
  {
    id: 'afd-par-a',
    titulo: 'AFD: número par de a',
    json: {
      tipo: 'AFD',
      nome: 'Número par de a',
      descricao: 'L = { w ∈ {a,b}* | #a(w) é par }.',
      alfabeto: ['a', 'b'],
      estados: ['par', 'impar'],
      estadoInicial: 'par',
      estadosFinais: ['par'],
      transicoes: {
        par: { a: 'impar', b: 'par' },
        impar: { a: 'par', b: 'impar' },
      },
    },
    entradas: ['abba', 'aaa', 'bbb', 'λ'],
  },
  {
    id: 'afn-lambda',
    titulo: 'AFN-λ: a* ∪ (ab)*',
    json: {
      tipo: 'AFN',
      nome: 'a* ∪ (ab)*',
      descricao: 'Usa transições λ para escolher, sem ler nada, qual das duas linguagens reconhecer.',
      alfabeto: ['a', 'b'],
      estados: ['q0', 'q1', 'q2', 'q3'],
      estadoInicial: 'q0',
      estadosFinais: ['q1', 'q2'],
      transicoes: [
        { de: 'q0', simbolo: 'λ', para: ['q1', 'q2'] },
        { de: 'q1', simbolo: 'a', para: 'q1' },
        { de: 'q2', simbolo: 'a', para: 'q3' },
        { de: 'q3', simbolo: 'b', para: 'q2' },
      ],
    },
    entradas: ['aaa', 'abab', 'aab', 'λ'],
  },
  {
    id: 'afn-terceiro-do-fim',
    titulo: 'AFN: 3º símbolo a partir do fim é a',
    json: {
      tipo: 'AFN',
      nome: '3º do fim é a',
      descricao: 'Clássico da explosão de estados: o AFN tem 4 estados e o AFD equivalente tem 8 (2³).',
      alfabeto: ['a', 'b'],
      estados: ['q0', 'q1', 'q2', 'q3'],
      estadoInicial: 'q0',
      estadosFinais: ['q3'],
      transicoes: [
        { de: 'q0', simbolo: 'a', para: ['q0', 'q1'] },
        { de: 'q0', simbolo: 'b', para: 'q0' },
        { de: 'q1', simbolo: 'a', para: 'q2' },
        { de: 'q1', simbolo: 'b', para: 'q2' },
        { de: 'q2', simbolo: 'a', para: 'q3' },
        { de: 'q2', simbolo: 'b', para: 'q3' },
      ],
    },
    entradas: ['abb', 'babab', 'aab', 'bba'],
  },
];

export const EXTRAS_GLC: Exemplo[] = [
  {
    id: 'glc-expressoes',
    titulo: 'Expressões aritméticas',
    json: {
      nome: 'Expressões aritméticas',
      descricao: 'Gramática não ambígua com precedência: * antes de +.',
      variaveis: ['E', 'T', 'F'],
      terminais: ['+', '*', '(', ')', 'a'],
      inicial: 'E',
      producoes: ['E -> E+T | T', 'T -> T*F | F', 'F -> (E) | a'],
    },
    entradas: ['a+a*a', '(a+a)*a', 'a+*a', 'a'],
  },
  {
    id: 'glc-mesmo-ab',
    titulo: 'Mesmo número de a e b',
    json: {
      nome: '#a = #b',
      descricao: 'S → aSbS | bSaS | λ — mesmo número de a e de b, em qualquer ordem.',
      variaveis: ['S'],
      terminais: ['a', 'b'],
      inicial: 'S',
      producoes: ['S -> aSbS | bSaS | λ'],
    },
    entradas: ['abba', 'baab', 'aab', 'λ'],
  },
  {
    id: 'glc-palindromos',
    titulo: 'Palíndromos sobre {a, b}',
    json: {
      nome: 'Palíndromos',
      descricao: 'L(G) = { w ∈ {a,b}* | w = wᴿ }.',
      variaveis: ['S'],
      terminais: ['a', 'b'],
      inicial: 'S',
      producoes: ['S -> aSa | bSb | a | b | λ'],
    },
    entradas: ['abba', 'ababa', 'ab', 'λ'],
  },
];

export const EXTRAS_AP: Exemplo[] = [
  {
    id: 'ap-wwr',
    titulo: 'AP não determinístico: wwᴿ',
    json: {
      nome: 'Palíndromos de tamanho par (wwᴿ)',
      descricao: 'Não determinístico: o AP "adivinha" o meio da cadeia com uma transição λ.',
      estados: ['q0', 'q1', 'q2'],
      alfabetoEntrada: ['a', 'b'],
      alfabetoPilha: ['a', 'b', 'Z'],
      estadoInicial: 'q0',
      simboloInicialPilha: 'Z',
      estadosFinais: ['q2'],
      aceitacao: 'estadoFinal',
      transicoes: [
        { de: 'q0', le: 'a', desempilha: 'λ', empilha: 'a', para: 'q0' },
        { de: 'q0', le: 'b', desempilha: 'λ', empilha: 'b', para: 'q0' },
        { de: 'q0', le: 'λ', desempilha: 'λ', empilha: 'λ', para: 'q1' },
        { de: 'q1', le: 'a', desempilha: 'a', empilha: 'λ', para: 'q1' },
        { de: 'q1', le: 'b', desempilha: 'b', empilha: 'λ', para: 'q1' },
        { de: 'q1', le: 'λ', desempilha: 'Z', empilha: 'Z', para: 'q2' },
      ],
    },
    entradas: ['abba', 'aabbaa', 'abab', 'λ'],
  },
];
