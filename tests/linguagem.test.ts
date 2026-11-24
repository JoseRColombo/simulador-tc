import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Alfabeto,
  concatenar,
  concatenarLinguagens,
  ErroDefinicao,
  Linguagem,
  potenciaCadeia,
  reverso,
  tamanho,
} from '../src/core/index.js';
import { parseER, erParaTexto } from '../src/core/expressao-regular.js';
import { todasCadeias } from './util.js';

describe('Alfabeto Σ', () => {
  test('exemplo do enunciado: Σ = {a,b}, "abba" é válida e tem tamanho 4', () => {
    const v = Alfabeto.deTexto('{a,b}').validar('abba');
    assert.equal(v.valida, true);
    assert.equal(v.tamanho, 4);
    assert.match(v.mensagem, /Cadeia válida para Σ/);
  });

  test('aceita vários formatos de entrada', () => {
    for (const t of ['{a,b}', 'a,b', 'a b', '{ a , b }', '  {a,b}  ']) {
      assert.deepEqual([...Alfabeto.deTexto(t).simbolos], ['a', 'b'], t);
    }
  });

  test('rejeita alfabetos inválidos', () => {
    for (const t of ['{}', '', 'ab', '{a,,b}', '{a,λ}', '{ab,c}', 'a,']) {
      assert.throws(() => Alfabeto.deTexto(t), ErroDefinicao, t);
    }
  });

  test('símbolos repetidos geram aviso e são ignorados', () => {
    const s = Alfabeto.deTexto('{a,a,b}');
    assert.deepEqual([...s.simbolos], ['a', 'b']);
    assert.equal(s.avisos.length, 1);
  });

  test('lista TODOS os símbolos inválidos com posição', () => {
    const v = Alfabeto.deTexto('{a,b}').validar('acbd');
    assert.equal(v.valida, false);
    assert.deepEqual(v.invalidos.map((s) => [s.simbolo, s.posicao]), [['c', 2], ['d', 4]]);
  });

  test('λ, ε e "" representam a cadeia vazia (válida, tamanho 0)', () => {
    const sigma = Alfabeto.deTexto('{0,1}');
    for (const w of ['λ', 'ε', '', '  ']) {
      const v = sigma.validar(w);
      assert.equal(v.valida, true);
      assert.equal(v.tamanho, 0);
    }
  });

  test('espaço no meio da cadeia NÃO é ignorado (não pertence a Σ)', () => {
    assert.equal(Alfabeto.deTexto('{a,b}').validar('a b').valida, false);
  });

  test('Σ* e Σ⁺ até k: contagem, ordem e presença de λ', () => {
    const s = Alfabeto.deTexto('{a,b}');
    const estrela = s.estrela(3);
    assert.equal(estrela.cadeias.length, 1 + 2 + 4 + 8);
    assert.equal(estrela.total, 15n);
    assert.equal(estrela.cadeias[0], '');
    assert.deepEqual(estrela.cadeias.slice(0, 7), ['', 'a', 'b', 'aa', 'ab', 'ba', 'bb']);
    const mais = s.positivo(3);
    assert.equal(mais.cadeias.length, 14);
    assert.ok(!mais.cadeias.includes(''));
    assert.deepEqual(s.potencia(0).cadeias, ['']);
  });

  test('Σ* grande é truncado, mas o total teórico é exato (bigint)', () => {
    const e = Alfabeto.deTexto('{a,b}').estrela(40, 100);
    assert.equal(e.truncado, true);
    assert.equal(e.cadeias.length, 100);
    assert.equal(e.total, 2n ** 41n - 1n);
  });

  test('Σ* sem truncamento quando o limite coincide exatamente', () => {
    const e = Alfabeto.deTexto('{a,b}').estrela(2, 7);
    assert.equal(e.cadeias.length, 7);
    assert.equal(e.truncado, false);
  });
});

describe('Operações com cadeias', () => {
  test('tamanho, concatenação com λ, potência e reverso', () => {
    assert.equal(tamanho('abba'), 4);
    assert.equal(tamanho('λ'), 0);
    assert.equal(tamanho('😀a'), 2, 'conta pontos de código, não unidades UTF-16');
    assert.equal(concatenar('ab', 'ba'), 'abba');
    assert.equal(concatenar('λ', 'ab'), 'ab');
    assert.equal(concatenar('ab', 'ε'), 'ab');
    assert.equal(concatenar('λ', 'λ'), '');
    assert.equal(potenciaCadeia('ab', 3), 'ababab');
    assert.equal(potenciaCadeia('ab', 0), '');
    assert.equal(reverso('abc'), 'cba');
    assert.throws(() => potenciaCadeia('a', -1), ErroDefinicao);
  });

  test('concatenação de linguagens finitas', () => {
    assert.deepEqual(concatenarLinguagens(['a', 'λ'], ['b', 'bb']), ['b', 'ab', 'bb', 'abb']);
  });
});

describe('Linguagem L', () => {
  const sigma = Alfabeto.deTexto('{a,b}');

  test('finita', () => {
    const L = new Linguagem(sigma, { tipo: 'finita', cadeias: ['ab', 'λ', 'ba'] });
    assert.equal(L.pertence('ab').pertence, true);
    assert.equal(L.pertence('').pertence, true);
    assert.equal(L.pertence('aa').pertence, false);
    assert.throws(() => new Linguagem(sigma, { tipo: 'finita', cadeias: ['abc'] }), ErroDefinicao);
  });

  test('cadeia fora de Σ* nunca pertence a L', () => {
    const L = new Linguagem(sigma, { tipo: 'regular', expressao: '(a+b)*' });
    const p = L.pertence('abc');
    assert.equal(p.pertence, false);
    assert.match(p.motivo, /∉ Σ\*/);
  });

  test('propriedades pré-definidas batem com a definição', () => {
    const anbn = new Linguagem(sigma, { tipo: 'propriedade', id: 'anbn' });
    for (const w of todasCadeias(['a', 'b'], 8)) {
      const n = w.length / 2;
      assert.equal(anbn.pertence(w).pertence, w === 'a'.repeat(n) + 'b'.repeat(n), w);
    }
    assert.throws(() => new Linguagem(Alfabeto.deTexto('{0,1}'), { tipo: 'propriedade', id: 'anbn' }), ErroDefinicao);
  });
});

describe('Expressões regulares (parser + Thompson)', () => {
  const sigma = Alfabeto.deTexto('{a,b}');

  test('erros de sintaxe são detectados com posição', () => {
    for (const er of ['', 'a|', '+a', '*a', '(a', 'a)', '()', 'a(', 'a||b', 'c']) {
      assert.throws(() => parseER(er, ['a', 'b']), ErroDefinicao, er);
    }
  });

  test('impressão canônica', () => {
    assert.equal(erParaTexto(parseER('(a|b)*abb')), '(a + b)*abb');
    assert.equal(erParaTexto(parseER('a(b+λ)')), 'a(b + λ)');
  });

  // Teste diferencial: nossa ER (Thompson + AFN) × RegExp do JavaScript
  const pares: [string, string][] = [
    ['(a+b)*abb', '(a|b)*abb'],
    ['a*b*', 'a*b*'],
    ['(ab)*', '(ab)*'],
    ['a⁺b?', 'a+b?'],
    ['(a+λ)(b+λ)', 'a?b?'],
    ['((a*)*)*', 'a*'],
    ['(a|b)(a∪b)', '[ab][ab]'],
    ['∅', '(?!)'],
    ['∅*', ''],
    ['λ', ''],
    ['a∅+b', 'b'],
    ['(aa+b)*(a+bb)', '(aa|b)*(a|bb)'],
    ['(a*ba*ba*)*a*', '(a*ba*ba*)*a*'],
    ['(ab+ba)⁺', '(ab|ba)+'],
  ];
  for (const [nossa, js] of pares) {
    test(`L(${nossa}) = L(/${js}/) para todas as cadeias até tamanho 8`, () => {
      const L = new Linguagem(sigma, { tipo: 'regular', expressao: nossa });
      const re = new RegExp(`^(?:${js})$`);
      for (const w of todasCadeias(['a', 'b'], 8)) assert.equal(L.pertence(w).pertence, re.test(w), `${nossa} com "${w}"`);
    });
  }
});
