import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AutomatoPilha, ErroDefinicao, EXEMPLOS_AP, GramaticaLC } from '../src/core/index.js';
import { EXTRAS_AP } from './exemplos-extras.js';
import { rng, todasCadeias } from './util.js';

const ex = (id: string) => AutomatoPilha.deJSON([...EXEMPLOS_AP, ...EXTRAS_AP].find((e) => e.id === id)!.json);

describe('AP aⁿbⁿ (n ≥ 1) — linguagem mínima do enunciado', () => {
  test('passo a passo de "aaabbb": leitura, estado e pilha', () => {
    const r = ex('ap-anbn').executar('aaabbb');
    assert.equal(r.veredito, 'ACEITA');
    assert.deepEqual(
      r.passos.map((p) => [p.leitura, p.estado, p.pilha.join('')]),
      [['', 'q0', 'Z'], ['a', 'q1', 'AZ'], ['a', 'q1', 'AAZ'], ['a', 'q1', 'AAAZ'], ['b', 'q2', 'AAZ'], ['b', 'q2', 'AZ'], ['b', 'q2', 'Z'], ['λ', 'q3', 'Z']],
    );
    assert.equal(r.deterministico, true);
  });

  test('igual ao oráculo para todas as cadeias até tamanho 12', () => {
    const ap = ex('ap-anbn');
    for (const w of todasCadeias(['a', 'b'], 12)) {
      const n = w.length / 2;
      const esperado = n >= 1 && w === 'a'.repeat(n) + 'b'.repeat(n);
      assert.equal(ap.executar(w).veredito, esperado ? 'ACEITA' : 'REJEITADA', w);
    }
  });

  test('λ é rejeitada (n ≥ 1) e motivos são informativos', () => {
    const ap = ex('ap-anbn');
    assert.equal(ap.executar('λ').veredito, 'REJEITADA');
    assert.match(ap.executar('aab').motivo, /parou em q2/);
    assert.match(ap.executar('ba').motivo, /Nenhuma transição/);
  });

  test('símbolo fora de Σ', () => {
    const r = ex('ap-anbn').executar('aXb');
    assert.equal(r.veredito, 'REJEITADA');
    assert.ok(r.erroEntrada);
  });
});

describe('APs não determinísticos e aceitação por pilha vazia', () => {
  test('wwᴿ', () => {
    const ap = ex('ap-wwr');
    assert.equal(ap.ehDeterministico, false);
    for (const w of todasCadeias(['a', 'b'], 10)) {
      const esperado = w.length % 2 === 0 && w === [...w].reverse().join('');
      assert.equal(ap.executar(w).veredito, esperado ? 'ACEITA' : 'REJEITADA', w);
    }
  });

  test('parênteses balanceados (pilha vazia)', () => {
    const ap = ex('ap-parenteses');
    for (const w of todasCadeias(['(', ')'], 10)) {
      let h = 0, ok = true;
      for (const c of w) if ((h += c === '(' ? 1 : -1) < 0) ok = false;
      assert.equal(ap.executar(w).veredito, ok && h === 0 ? 'ACEITA' : 'REJEITADA', w);
    }
  });

  test('o caminho de aceitação é uma computação válida', () => {
    const ap = ex('ap-wwr');
    const r = ap.executar('abbbba');
    assert.equal(r.veredito, 'ACEITA');
    for (let i = 1; i < r.passos.length; i++) {
      const t = r.passos[i].transicao!;
      const ant = r.passos[i - 1];
      assert.equal(t.de, ant.estado);
      assert.equal(t.para, r.passos[i].estado);
      const pilhaEsperada = [...t.empilha, ...(t.desempilha ? ant.pilha.slice(1) : ant.pilha)];
      assert.deepEqual(r.passos[i].pilha, pilhaEsperada);
    }
    assert.equal(r.passos.at(-1)!.posicao, 6);
  });
});

describe('Laços λ: nunca afirmar REJEITADA sem ter certeza', () => {
  const loop = {
    estados: ['q', 'f'],
    alfabetoEntrada: ['a'],
    alfabetoPilha: ['A', 'Z'],
    estadoInicial: 'q',
    simboloInicialPilha: 'Z',
    estadosFinais: ['f'],
    transicoes: [
      { de: 'q', le: 'λ', desempilha: 'λ', empilha: 'A', para: 'q' }, // empilha para sempre
      { de: 'q', le: 'a', desempilha: 'A', empilha: 'λ', para: 'f' },
    ],
  };
  test('aceita quando existe computação de aceitação', () => {
    assert.equal(AutomatoPilha.deJSON(loop).executar('a').veredito, 'ACEITA');
  });
  test('sem aceitação e com poda → INDETERMINADA (não REJEITADA)', () => {
    const r = AutomatoPilha.deJSON(loop).executar('aa');
    assert.equal(r.veredito, 'INDETERMINADA');
  });
  test('laço λ sem crescimento da pilha termina com REJEITADA exata', () => {
    const ap = AutomatoPilha.deJSON({ ...loop, transicoes: [{ de: 'q', le: 'λ', desempilha: 'λ', empilha: 'λ', para: 'q' }] });
    assert.equal(ap.executar('a').veredito, 'REJEITADA');
  });
  test('limite de configurações', () => {
    const r = AutomatoPilha.deJSON(loop).executar('aa', { maxConfiguracoes: 10, maxAlturaPilha: 1000 });
    assert.equal(r.veredito, 'INDETERMINADA');
    assert.match(r.motivo, /Limite de 10 configurações/);
  });
});

describe('GLC → AP (construção padrão) — consistência entre módulos', () => {
  test('S → aSb | λ: o AP nunca contradiz a gramática', () => {
    const g = GramaticaLC.deJSON('S -> aSb | λ');
    const ap = AutomatoPilha.deJSON({
      estados: ['q'],
      alfabetoEntrada: ['a', 'b'],
      alfabetoPilha: ['S', 'a', 'b'],
      estadoInicial: 'q',
      simboloInicialPilha: 'S',
      aceitacao: 'pilhaVazia',
      transicoes: [
        { de: 'q', le: 'λ', desempilha: 'S', empilha: 'aSb', para: 'q' },
        { de: 'q', le: 'λ', desempilha: 'S', empilha: 'λ', para: 'q' },
        { de: 'q', le: 'a', desempilha: 'a', empilha: 'λ', para: 'q' },
        { de: 'q', le: 'b', desempilha: 'b', empilha: 'λ', para: 'q' },
      ],
    });
    const rand = rng(7);
    for (const w of todasCadeias(['a', 'b'], 8)) {
      const naGramatica = g.aceita(w);
      const r = ap.executar(w, { maxAlturaPilha: 20 + Math.floor(rand() * 5) });
      if (r.veredito === 'ACEITA') assert.equal(naGramatica, true, `falso positivo: ${w}`);
      if (r.veredito === 'REJEITADA') assert.equal(naGramatica, false, `falso negativo: ${w}`);
      if (naGramatica) assert.equal(r.veredito, 'ACEITA', `deveria aceitar ${w}`);
    }
  });
});

describe('Validação do JSON do AP', () => {
  const base = EXEMPLOS_AP[0].json;
  const erro = (mudanca: Record<string, unknown>, re: RegExp) =>
    assert.throws(() => AutomatoPilha.deJSON({ ...base, ...mudanca }), (e: unknown) => e instanceof ErroDefinicao && e.erros.some((m) => re.test(m)), String(re));
  test('erros', () => {
    erro({ estadoInicial: 'x' }, /Estado inicial/);
    erro({ simboloInicialPilha: 'Q' }, /não pertence a Γ/);
    erro({ aceitacao: 'talvez' }, /aceitacao/);
    erro({ transicoes: [{ de: 'q0', le: 'c', desempilha: 'Z', empilha: 'Z', para: 'q1' }] }, /"c" não pertence a Σ/);
    erro({ transicoes: [{ de: 'q0', le: 'a', desempilha: 'Z', empilha: 'BZ', para: 'q1' }] }, /"B" não pertence a Γ/);
    erro({ transicoes: [{ de: 'q9', le: 'a', desempilha: 'Z', empilha: 'Z', para: 'q1' }] }, /origem/);
    erro({ transicoes: 'x' }, /transicoes/);
  });
  test('pilha inicialmente vazia (sem Z0) é permitida', () => {
    const ap = AutomatoPilha.deJSON({
      estados: ['q'],
      alfabetoEntrada: ['a'],
      alfabetoPilha: ['A'],
      estadoInicial: 'q',
      aceitacao: 'pilhaVazia',
      transicoes: [],
    });
    assert.equal(ap.executar('').veredito, 'ACEITA');
    assert.equal(ap.executar('a').veredito, 'REJEITADA');
  });
});
