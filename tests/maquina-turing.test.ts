import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ErroDefinicao, EXEMPLOS_MT, interpretarSomaUnaria, MaquinaTuring } from '../src/core/index.js';
import { todasCadeias } from './util.js';

const ex = (id: string) => MaquinaTuring.deJSON(EXEMPLOS_MT.find((e) => e.id === id)!.json);

describe('Opção A — L = { w#w }', () => {
  test('igual ao oráculo para todas as cadeias sobre {0,1,#} até tamanho 9', () => {
    const mt = ex('mt-w-hash-w');
    for (const w of todasCadeias(['0', '1', '#'], 9)) {
      const partes = w.split('#');
      const esperado = partes.length === 2 && partes[0] === partes[1];
      const r = mt.executar(w, 100_000, false);
      assert.equal(r.veredito, esperado ? 'ACEITA' : 'REJEITADA', w);
    }
  });

  test('histórico de passos: a cabeça e a fita evoluem coerentemente', () => {
    const r = ex('mt-w-hash-w').executar('01#01');
    assert.equal(r.veredito, 'ACEITA');
    assert.equal(r.passos.length, r.numeroPassos + 1);
    for (let i = 0; i + 1 < r.passos.length; i++) {
      const p = r.passos[i], q = r.passos[i + 1];
      const t = p.transicao!;
      assert.equal(p.fita[p.cabeca - p.inicio], t.le);
      assert.equal(q.fita[p.cabeca - q.inicio], t.escreve);
      assert.equal(q.cabeca - p.cabeca, t.move === 'L' ? -1 : t.move === 'R' ? 1 : 0);
      assert.equal(q.estado, t.para);
    }
  });
});

describe('Opção B — soma unária', () => {
  test('exemplo do enunciado: 000100 (3+2) → 00000', () => {
    const r = ex('mt-soma-unaria').executar('000100');
    assert.equal(r.veredito, 'ACEITA');
    assert.equal(r.saida, '00000');
    assert.deepEqual(interpretarSomaUnaria('000100'), [3, 2]);
  });

  test('m + n correto para m, n ∈ [0, 15]', () => {
    const mt = ex('mt-soma-unaria');
    for (let m = 0; m <= 15; m++)
      for (let n = 0; n <= 15; n++) {
        const r = mt.executar('0'.repeat(m) + '1' + '0'.repeat(n));
        assert.equal(r.veredito, 'ACEITA');
        assert.equal(r.saida, '0'.repeat(m + n), `${m}+${n}`);
        assert.equal(r.numeroPassos, m + n + 3);
      }
  });

  test('formatos inválidos são rejeitados', () => {
    const mt = ex('mt-soma-unaria');
    for (const w of ['', '00', '0101', '11']) assert.equal(mt.executar(w).veredito, 'REJEITADA', w);
    assert.equal(interpretarSomaUnaria('0101'), null);
  });
});

describe('Robustez', () => {
  test('símbolo fora de Σ', () => {
    const r = ex('mt-soma-unaria').executar('0a1');
    assert.equal(r.veredito, 'REJEITADA');
    assert.ok(r.erroEntrada);
  });

  test('laço infinito é detectado pelo limite de passos (INDETERMINADA)', () => {
    const mt = MaquinaTuring.deJSON({
      estados: ['q', 'qa'],
      alfabetoEntrada: ['0'],
      estadoInicial: 'q',
      estadoAceita: 'qa',
      transicoes: [
        { de: 'q', le: '_', escreve: '_', move: 'R', para: 'q' },
        { de: 'q', le: '0', escreve: '0', move: 'R', para: 'q' },
      ],
    });
    const r = mt.executar('00', 500);
    assert.equal(r.veredito, 'INDETERMINADA');
    assert.equal(r.atingiuLimite, true);
  });

  test('fita infinita para a esquerda', () => {
    const mt = MaquinaTuring.deJSON({
      estados: ['q', 'p', 'qa'],
      alfabetoEntrada: ['0'],
      alfabetoFita: ['0', 'y', '_'],
      estadoInicial: 'q',
      estadoAceita: 'qa',
      transicoes: [
        { de: 'q', le: '0', escreve: '0', move: 'L', para: 'p' },
        { de: 'p', le: '_', escreve: 'y', move: 'S', para: 'qa' },
      ],
    });
    const r = mt.executar('0');
    assert.equal(r.veredito, 'ACEITA');
    assert.equal(r.saida, 'y0');
  });

  test('estado de rejeição explícito', () => {
    const mt = MaquinaTuring.deJSON({
      estados: ['q', 'qa', 'qr'],
      alfabetoEntrada: ['0'],
      estadoInicial: 'q',
      estadoAceita: 'qa',
      estadoRejeita: 'qr',
      transicoes: [{ de: 'q', le: '0', escreve: '0', move: 'R', para: 'qr' }],
    });
    assert.match(mt.executar('0').motivo, /estado de rejeição qr/);
  });

  test('validação do JSON', () => {
    const base = EXEMPLOS_MT[1].json;
    const erro = (mudanca: Record<string, unknown>, re: RegExp) =>
      assert.throws(() => MaquinaTuring.deJSON({ ...base, ...mudanca }), (e: unknown) => e instanceof ErroDefinicao && e.erros.some((m) => re.test(m)), String(re));
    erro({ estadoAceita: 'zz' }, /aceitação "zz"/);
    erro({ estadoRejeita: 'qf' }, /devem ser diferentes/);
    erro({ alfabetoEntrada: ['0', '1', '_'] }, /branco/);
    erro({ transicoes: [{ de: 'q0', le: '0', escreve: '0', move: 'X', para: 'q0' }] }, /movimento/);
    erro({ transicoes: [{ de: 'q0', le: '9', escreve: '0', move: 'R', para: 'q0' }] }, /"9"/);
    erro(
      {
        transicoes: [
          { de: 'q0', le: '0', escreve: '0', move: 'R', para: 'q0' },
          { de: 'q0', le: '0', escreve: '1', move: 'R', para: 'q1' },
        ],
      },
      /não determinística/,
    );
  });

  test('movimentos em português (E/D/P) são aceitos', () => {
    const mt = MaquinaTuring.deJSON({
      estados: ['q', 'qa'],
      alfabetoEntrada: ['0'],
      estadoInicial: 'q',
      estadoAceita: 'qa',
      transicoes: [{ de: 'q', le: '0', escreve: '0', move: 'D', para: 'qa' }],
    });
    assert.equal(mt.definicao.transicoes[0].move, 'R');
  });
});
