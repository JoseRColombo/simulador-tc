import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { ErroDefinicao, EXEMPLOS_GLC, GramaticaLC, TAMANHO_MAXIMO_CADEIA_GLC, type NoArvore, type ResultadoGLC } from '../src/core/index.js';
import { EXTRAS_GLC } from './exemplos-extras.js';
import { rng, todasCadeias } from './util.js';

const ex = (id: string) => GramaticaLC.deJSON([...EXEMPLOS_GLC, ...EXTRAS_GLC].find((e) => e.id === id)!.json);

/** Conferência independente da derivação e da árvore produzidas. */
function conferir(g: GramaticaLC, r: ResultadoGLC): void {
  assert.equal(r.veredito, 'ACEITA');
  const d = g.definicao;
  const V = new Set(d.variaveis);
  const prods = new Set(d.producoes.map((p) => `${p.cabeca}→${p.corpo.join('')}`));
  // fronteira da árvore = cadeia
  const fronteira = (n: NoArvore): string => (n.tipo === 'terminal' ? n.simbolo : n.filhos.map(fronteira).join(''));
  assert.equal(fronteira(r.arvore!), r.cadeia);
  // cada nó interno usa uma produção existente
  const visitar = (n: NoArvore) => {
    if (n.tipo !== 'variavel') return;
    const corpo = n.filhos.filter((f) => f.tipo !== 'lambda').map((f) => f.simbolo).join('');
    assert.ok(prods.has(`${n.simbolo}→${corpo}`), `produção ${n.simbolo}→${corpo} existe`);
    n.filhos.forEach(visitar);
  };
  visitar(r.arvore!);
  // derivação mais à esquerda válida
  const passos = r.derivacao!;
  if (passos.length === 0) return;
  assert.deepEqual(passos[0].forma, [d.inicial]);
  for (let i = 0; i < passos.length; i++) {
    const p = passos[i];
    const primeiraVar = p.forma.findIndex((s) => V.has(s));
    assert.equal(p.posicao, primeiraVar, 'expande a variável mais à esquerda');
    const [cab, corpo] = p.producao.split(' → ');
    assert.equal(p.forma[p.posicao], cab);
    const corpoSimb = corpo === 'λ' ? [] : Array.from(corpo);
    assert.deepEqual(p.resultado, [...p.forma.slice(0, p.posicao), ...corpoSimb, ...p.forma.slice(p.posicao + 1)]);
    if (i + 1 < passos.length) assert.deepEqual(passos[i + 1].forma, p.resultado);
  }
  assert.equal(passos.at(-1)!.resultado.join(''), r.cadeia);
}

describe('GLC — exemplo do enunciado (S → aSb | λ)', () => {
  test('"aaabbb" é aceita com derivação S ⇒ aSb ⇒ aaSbb ⇒ aaaSbbb ⇒ aaabbb', () => {
    const g = ex('glc-anbn');
    const r = g.reconhecer('aaabbb');
    conferir(g, r);
    assert.deepEqual(r.derivacao!.map((p) => p.resultado.join('')), ['aSb', 'aaSbb', 'aaaSbbb', 'aaabbb']);
  });
  test('λ é aceita (S → λ)', () => {
    const r = ex('glc-anbn').reconhecer('λ');
    assert.equal(r.veredito, 'ACEITA');
    assert.equal(r.derivacao!.length, 1);
  });
  test('símbolo fora de T', () => {
    const r = ex('glc-anbn').reconhecer('aXb');
    assert.equal(r.veredito, 'REJEITADA');
    assert.ok(r.erroEntrada);
  });
  test('gerar cadeias até tamanho 6', () => {
    assert.deepEqual(ex('glc-anbn').gerar(6).cadeias, ['', 'ab', 'aabb', 'aaabbb']);
  });
});

describe('Exemplos conferidos com força bruta', () => {
  const balanceada = (w: string) => {
    let h = 0;
    for (const c of w) {
      h += c === '(' ? 1 : -1;
      if (h < 0) return false;
    }
    return h === 0;
  };
  // reconhecedor independente para expressões (descendente recursivo)
  const expressao = (w: string) => {
    let i = 0;
    const E = (): boolean => T() && (w[i] === '+' ? (i++, E()) : true);
    const T = (): boolean => F() && (w[i] === '*' ? (i++, T()) : true);
    const F = (): boolean => {
      if (w[i] === 'a') return i++, true;
      if (w[i] === '(') {
        i++;
        if (!E() || w[i] !== ')') return false;
        i++;
        return true;
      }
      return false;
    };
    return E() && i === w.length;
  };
  const casos: [string, string[], number, (w: string) => boolean][] = [
    ['glc-anbn', ['a', 'b'], 10, (w) => w === 'a'.repeat(w.length / 2) + 'b'.repeat(w.length / 2)],
    ['glc-parenteses', ['(', ')'], 10, balanceada],
    ['glc-palindromos', ['a', 'b'], 10, (w) => w === [...w].reverse().join('')],
    ['glc-mesmo-ab', ['a', 'b'], 10, (w) => [...w].filter((c) => c === 'a').length * 2 === w.length],
    ['glc-expressoes', ['a', '+', '*', '(', ')'], 6, expressao],
  ];
  for (const [id, T, k, oraculo] of casos) {
    test(id, () => {
      const g = ex(id);
      for (const w of todasCadeias(T, k)) {
        const r = g.reconhecer(w);
        assert.equal(r.veredito === 'ACEITA', oraculo(w), `${id} com "${w}"`);
        if (r.veredito === 'ACEITA') conferir(g, r);
      }
    });
  }
});

describe('Gramáticas difíceis (λ, ciclos, recursão à esquerda, corpos longos)', () => {
  const casos: [string, string, (w: string) => boolean, string[]][] = [
    ['ciclo unitário', 'S -> A | b\nA -> S | a', (w) => w === 'a' || w === 'b', ['a', 'b']],
    ['λ com S → SS', 'S -> SS | a | λ', (w) => /^a*$/.test(w), ['a', 'b']],
    ['recursão à esquerda', 'S -> Sa | a', (w) => /^a+$/.test(w), ['a', 'b']],
    ['linguagem vazia', 'S -> aS', () => false, ['a']],
    ['corpo longo', 'S -> abcS | λ', (w) => /^(abc)*$/.test(w), ['a', 'b', 'c']],
    ['variável anulável no meio', 'S -> aBb\nB -> λ | B', (w) => w === 'ab', ['a', 'b']],
    ['ambígua', 'E -> E+E | E*E | a', (w) => /^a([+*]a)*$/.test(w), ['a', '+', '*']],
    ['λ só via cadeia de unitárias', 'S -> A\nA -> B\nB -> λ | c', (w) => w === '' || w === 'c', ['c']],
  ];
  for (const [nome, prods, oraculo, T] of casos) {
    test(nome, () => {
      const g = GramaticaLC.deJSON(prods);
      for (const w of todasCadeias(T, 7)) {
        const r = g.reconhecer(w);
        assert.equal(r.veredito === 'ACEITA', oraculo(w), `${nome} com "${w}"`);
        if (r.veredito === 'ACEITA') conferir(g, r);
      }
    });
  }

  test('gramáticas aleatórias × oráculo de ponto fixo (300 gramáticas)', () => {
    const rand = rng(2024);
    const VARS = ['S', 'A', 'B'];
    const T = ['a', 'b'];
    const K = 6;
    for (let caso = 0; caso < 300; caso++) {
      const linhas: string[] = [];
      for (const v of VARS) {
        const corpos: string[] = [];
        const qtd = 1 + Math.floor(rand() * 3);
        for (let i = 0; i < qtd; i++) {
          const tam = Math.floor(rand() * 4);
          let c = '';
          for (let j = 0; j < tam; j++) c += rand() < 0.5 ? T[Math.floor(rand() * 2)] : VARS[Math.floor(rand() * 3)];
          corpos.push(c || 'λ');
        }
        linhas.push(`${v} -> ${corpos.join(' | ')}`);
      }
      const texto = linhas.join('\n');
      const g = GramaticaLC.deJSON(JSON.stringify({ variaveis: VARS, terminais: T, inicial: 'S', producoes: linhas }));
      // oráculo: L_X ∩ T^≤K por iteração de Kleene até o ponto fixo
      const L = new Map(VARS.map((v) => [v, new Set<string>()]));
      let mudou = true;
      while (mudou) {
        mudou = false;
        for (const p of g.definicao.producoes) {
          let atual = new Set(['']);
          for (const s of p.corpo) {
            const prox = new Set<string>();
            const conj = L.has(s) ? L.get(s)! : new Set([s]);
            for (const x of atual) for (const y of conj) if (x.length + y.length <= K) prox.add(x + y);
            atual = prox;
          }
          const alvo = L.get(p.cabeca)!;
          for (const x of atual) if (!alvo.has(x)) {
            alvo.add(x);
            mudou = true;
          }
        }
      }
      for (const w of todasCadeias(T, K)) {
        const r = g.reconhecer(w);
        assert.equal(r.veredito === 'ACEITA', L.get('S')!.has(w), `gramática:\n${texto}\ncadeia "${w}"`);
        if (r.veredito === 'ACEITA') conferir(g, r);
      }
    }
  });
});

describe('Leitura e validação', () => {
  test('formatos aceitos: texto, JSON com lista, JSON com objeto', () => {
    for (const def of [
      'S -> aSb | λ',
      'S → aSb\nS → ε',
      { producoes: ['S -> aSb', 'S -> λ'] },
      { producoes: { S: ['aSb', 'λ'] } },
      { producoes: [{ cabeca: 'S', corpo: 'aSb | λ' }] },
    ]) {
      assert.equal(GramaticaLC.deJSON(def).aceita('aabb'), true, JSON.stringify(def));
    }
  });

  test('inferência de V e T', () => {
    const g = GramaticaLC.deJSON('E -> E+T | T\nT -> a');
    assert.deepEqual(g.definicao.variaveis, ['E', 'T']);
    assert.deepEqual(g.definicao.terminais.sort(), ['+', 'a']);
    assert.equal(g.definicao.inicial, 'E');
  });

  test('erros', () => {
    const erro = (def: unknown, re: RegExp) =>
      assert.throws(() => GramaticaLC.deJSON(def), (e: unknown) => e instanceof ErroDefinicao && e.erros.some((m) => re.test(m)), String(re));
    erro('S -> aλb', /λ só pode aparecer sozinho/);
    erro('AB -> a', /UMA variável/);
    erro('S aSb', /formato/);
    erro({ variaveis: ['S'], terminais: ['a', 'S'], producoes: ['S -> a'] }, /V ∩ T/);
    erro({ variaveis: ['S'], terminais: ['a'], inicial: 'X', producoes: ['S -> a'] }, /símbolo inicial "X"/);
    erro({ variaveis: ['S'], terminais: ['a'], producoes: ['S -> ab'] }, /"b" não é variável nem terminal/);
    erro({ producoes: [] }, /pelo menos uma produção/);
    erro('', /pelo menos uma produção|producoes/);
  });

  test('avisos: improdutiva, inalcançável, sem produções', () => {
    const g = GramaticaLC.deJSON('S -> a | B\nB -> bB\nC -> c\nS -> D');
    const t = g.avisos.join(' | ');
    assert.match(t, /improdutiva.*B/);
    assert.match(t, /inalcançável.*C/);
    assert.match(t, /sem produções: D/);
  });

  test('classificação de Chomsky', () => {
    assert.match(GramaticaLC.deJSON('S -> aS | b').classificar(), /linear à direita/);
    assert.match(GramaticaLC.deJSON('S -> Sa | b').classificar(), /linear à esquerda/);
    assert.match(GramaticaLC.deJSON('S -> aSb | λ').classificar(), /Tipo 2/);
  });

  test('cadeia longa demais gera erro claro', () => {
    assert.throws(() => ex('glc-anbn').reconhecer('a'.repeat(TAMANHO_MAXIMO_CADEIA_GLC + 1)), ErroDefinicao);
  });

  test('cadeia de 100 símbolos é decidida rapidamente', () => {
    const t0 = Date.now();
    assert.equal(ex('glc-anbn').aceita('a'.repeat(50) + 'b'.repeat(50)), true);
    assert.ok(Date.now() - t0 < 2000);
  });
});
