import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AutomatoFinito, ErroDefinicao, EXEMPLOS_AF, type ExecucaoAF } from '../src/core/index.js';
import { EXTRAS_AF } from './exemplos-extras.js';
import { todasCadeias } from './util.js';

const ex = (id: string) => AutomatoFinito.deJSON([...EXEMPLOS_AF, ...EXTRAS_AF].find((e) => e.id === id)!.json);

/** Verifica, de forma independente, que o caminho testemunha é uma computação válida. */
function conferirCaminho(a: AutomatoFinito, r: ExecucaoAF): void {
  const d = a.definicao;
  assert.equal(r.caminho[0], d.estadoInicial);
  assert.equal(r.caminho.length, r.caminhoTransicoes.length + 1);
  let lidos = '';
  r.caminhoTransicoes.forEach((t, i) => {
    assert.equal(t.de, r.caminho[i]);
    assert.equal(t.para, r.caminho[i + 1]);
    assert.ok(d.transicoes.some((x) => x.de === t.de && x.para === t.para && x.simbolo === t.simbolo), 'transição existe em δ');
    lidos += t.simbolo;
  });
  if (r.veredito === 'ACEITA') {
    assert.equal(lidos, r.cadeia, 'o caminho consome a cadeia inteira');
    assert.ok(d.estadosFinais.includes(r.caminho.at(-1)!), 'termina em estado final');
  } else {
    assert.ok(r.cadeia.startsWith(lidos), 'caminho de falha lê um prefixo da cadeia');
  }
}

describe('AFD — exemplo do enunciado', () => {
  test('"ab": q0 -> q1 -> q2, ACEITA', () => {
    const r = ex('afd-enunciado').executar('ab');
    assert.equal(r.veredito, 'ACEITA');
    assert.deepEqual(r.caminho, ['q0', 'q1', 'q2']);
    assert.deepEqual(r.passos.map((p) => [p.antes[0], p.simbolo, p.depois[0]]), [['q0', 'a', 'q1'], ['q1', 'b', 'q2']]);
  });

  test('rejeições com motivo correto', () => {
    const a = ex('afd-enunciado');
    assert.match(a.executar('a').motivo, /não é final/);
    assert.match(a.executar('ba').motivo, /δ\(q0, b\) não está definida/);
    assert.match(a.executar('abb').motivo, /δ\(q2, b\)/);
    assert.equal(a.executar('λ').veredito, 'REJEITADA');
  });

  test('símbolo fora de Σ é rejeitado com erro de entrada (sem exceção)', () => {
    const r = ex('afd-enunciado').executar('abc');
    assert.equal(r.veredito, 'REJEITADA');
    assert.ok(r.erroEntrada?.includes('"c" (posição 3)'));
  });

  test('aviso de AFD parcial', () => {
    assert.ok(ex('afd-enunciado').avisos.some((a) => a.includes('AFD parcial')));
  });
});

describe('Linguagens dos exemplos conferidas com força bruta (sem falso positivo/negativo)', () => {
  const casos: [string, (w: string) => boolean][] = [
    ['afd-enunciado', (w) => w === 'ab'],
    ['afd-termina-ab', (w) => w.endsWith('ab')],
    ['afd-par-a', (w) => [...w].filter((c) => c === 'a').length % 2 === 0],
    ['afn-contem-aba', (w) => w.includes('aba')],
    ['afn-terceiro-do-fim', (w) => w.length >= 3 && w[w.length - 3] === 'a'],
    ['afn-lambda', (w) => /^(a*|(ab)*)$/.test(w)],
  ];
  for (const [id, oraculo] of casos) {
    test(id, () => {
      const a = ex(id);
      for (const w of todasCadeias(['a', 'b'], 10)) {
        const r = a.executar(w);
        assert.equal(r.veredito === 'ACEITA', oraculo(w), `${id} com "${w}"`);
        conferirCaminho(a, r);
      }
    });
  }
  test('afd-mult3', () => {
    const a = ex('afd-mult3');
    for (const w of todasCadeias(['0', '1'], 10)) assert.equal(a.aceita(w), (w === '' ? 0 : parseInt(w, 2)) % 3 === 0, w);
  });
});

describe('AFN → AFD (construção de subconjuntos)', () => {
  for (const e of [...EXEMPLOS_AF, ...EXTRAS_AF]) {
    test(`equivalência: ${e.id}`, () => {
      const afn = AutomatoFinito.deJSON(e.json);
      const afd = afn.paraAFD();
      assert.equal(afd.ehDeterministico, true);
      assert.equal(afd.definicao.tipo, 'AFD');
      // AFD completo: exatamente |Q|·|Σ| transições
      assert.equal(afd.definicao.transicoes.length, afd.definicao.estados.length * afd.definicao.alfabeto.length);
      for (const w of todasCadeias(afn.definicao.alfabeto, 9)) assert.equal(afd.aceita(w), afn.aceita(w), `${e.id} com "${w}"`);
    });
  }
  test('3º símbolo do fim: o AFD equivalente tem 2³ = 8 estados', () => {
    assert.equal(ex('afn-terceiro-do-fim').paraAFD().definicao.estados.length, 8);
  });
});

describe('Carregamento e validação de JSON', () => {
  const base = {
    alfabeto: ['a', 'b'],
    estados: ['q0', 'q1'],
    estadoInicial: 'q0',
    estadosFinais: ['q1'],
    transicoes: [{ de: 'q0', simbolo: 'a', para: 'q1' }],
  };
  const erroCom = (obj: unknown, trecho: RegExp) => {
    try {
      AutomatoFinito.deJSON(obj);
      assert.fail('deveria lançar ErroDefinicao');
    } catch (e) {
      assert.ok(e instanceof ErroDefinicao, String(e));
      assert.ok(e.erros.some((m) => trecho.test(m)), `esperado ${trecho} em ${JSON.stringify(e.erros)}`);
    }
  };

  test('aceita objeto e texto', () => {
    assert.equal(AutomatoFinito.deJSON(base).aceita('a'), true);
    assert.equal(AutomatoFinito.deJSON(JSON.stringify(base)).aceita('a'), true);
  });

  test('JSON com erro de sintaxe informa linha e coluna', () => {
    assert.throws(() => AutomatoFinito.deJSON('{\n  "estados": [\n}'), (e: unknown) => e instanceof ErroDefinicao && /linha \d+, coluna \d+/.test(e.message));
  });

  test('erros semânticos', () => {
    erroCom({ ...base, estadoInicial: 'qx' }, /Estado inicial "qx"/);
    erroCom({ ...base, estadoInicial: undefined }, /estadoInicial/);
    erroCom({ ...base, estadosFinais: ['q9'] }, /Estado final "q9"/);
    erroCom({ ...base, transicoes: [{ de: 'q0', simbolo: 'c', para: 'q1' }] }, /"c" não pertence a Σ/);
    erroCom({ ...base, transicoes: [{ de: 'q0', simbolo: 'a', para: 'q7' }] }, /destino "q7" não existe/);
    erroCom({ ...base, transicoes: [{ de: 'q0', para: 'q1' }] }, /simbolo/);
    erroCom({ ...base, alfabeto: [] }, /alfabeto/);
    erroCom({ ...base, alfabeto: ['ab'] }, /exatamente 1/);
    erroCom({ ...base, estados: [] }, /não pode ser vazio/);
    erroCom({ ...base, tipo: 'XYZ' }, /tipo/);
    erroCom({ ...base, tipo: 'AFD', transicoes: [{ de: 'q0', simbolo: 'λ', para: 'q1' }] }, /AFD não pode ter transições λ/);
    erroCom({ ...base, tipo: 'AFD', transicoes: [{ de: 'q0', simbolo: 'a', para: ['q0', 'q1'] }] }, /AFD não determinístico/);
    assert.throws(() => AutomatoFinito.deJSON('[1,2]'), ErroDefinicao);
  });

  test('tipo inferido (AFN quando há λ ou não determinismo)', () => {
    assert.equal(AutomatoFinito.deJSON(base).definicao.tipo, 'AFD');
    assert.equal(AutomatoFinito.deJSON({ ...base, transicoes: [{ de: 'q0', simbolo: 'ε', para: 'q1' }] }).definicao.tipo, 'AFN');
  });

  test('avisos: transição repetida, estado inalcançável, sem finais', () => {
    const a = AutomatoFinito.deJSON({ ...base, estados: ['q0', 'q1', 'q2'], transicoes: [base.transicoes[0], base.transicoes[0]] });
    assert.ok(a.avisos.some((x) => x.includes('repetida')));
    assert.ok(a.avisos.some((x) => x.includes('inalcançáveis') && x.includes('q2')));
    assert.ok(AutomatoFinito.deJSON({ ...base, estadosFinais: [] }).avisos.some((x) => x.includes('L = ∅')));
  });

  test('ciclo de transições λ não trava a simulação', () => {
    const a = AutomatoFinito.deJSON({
      alfabeto: ['a'],
      estados: ['p', 'q', 'r'],
      estadoInicial: 'p',
      estadosFinais: ['r'],
      transicoes: [
        { de: 'p', simbolo: 'λ', para: 'q' },
        { de: 'q', simbolo: 'λ', para: 'p' },
        { de: 'q', simbolo: 'a', para: 'r' },
        { de: 'r', simbolo: 'λ', para: 'p' },
      ],
    });
    assert.equal(a.aceita('aaa'), true);
    assert.equal(a.aceita(''), false);
  });
});
