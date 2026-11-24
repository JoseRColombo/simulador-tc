/**
 * Módulo 1 — Linguagens Formais.
 *
 *  - Alfabeto Σ: conjunto finito e não vazio de símbolos.
 *  - Σ^k, Σ* (fecho de Kleene) e Σ⁺ (fecho positivo). Como Σ* é infinito,
 *    listamos as cadeias até um tamanho máximo k (ordem por tamanho e depois
 *    lexicográfica, na ordem em que os símbolos foram declarados).
 *  - Operações sobre cadeias: tamanho |w|, concatenação, potência wⁿ, reverso.
 *  - Linguagem L ⊆ Σ*, definida por enumeração (finita), por expressão regular
 *    ou por uma propriedade pré-definida (ex.: { aⁿbⁿ | n ≥ 0 }).
 */
import { AutomatoFinito } from './automato-finito.js';
import { ErroDefinicao, exibir, LAMBDA, normalizarCadeia, semDuplicatas, simbolosDe, validarSimbolo } from './comum.js';
import { erParaTexto, parseER, thompson, type NoER } from './expressao-regular.js';

export interface SimboloAnalisado {
  simbolo: string;
  posicao: number; // 1-based
  valido: boolean;
}

export interface ValidacaoCadeia {
  cadeia: string;
  valida: boolean;
  tamanho: number;
  simbolos: SimboloAnalisado[];
  invalidos: SimboloAnalisado[];
  mensagem: string;
}

export interface Enumeracao {
  cadeias: string[];
  /** Quantidade teórica de cadeias (pode ser enorme — por isso é bigint). */
  total: bigint;
  truncado: boolean;
}

export class Alfabeto {
  readonly simbolos: readonly string[];
  readonly avisos: string[];
  private readonly conjunto: ReadonlySet<string>;

  constructor(simbolos: Iterable<string>) {
    const erros: string[] = [];
    const avisos: string[] = [];
    const lista = semDuplicatas([...simbolos].map((s) => s.trim()), 'Σ', avisos);
    lista.forEach((s, i) => validarSimbolo(s, `Σ, símbolo ${i + 1}`, erros));
    if (lista.length === 0) erros.push('O alfabeto Σ deve ser um conjunto finito NÃO VAZIO de símbolos.');
    if (erros.length) throw new ErroDefinicao(erros, avisos);
    this.simbolos = lista;
    this.conjunto = new Set(lista);
    this.avisos = avisos;
  }

  /**
   * Lê "{a, b}", "a,b" ou "a b". Símbolos devem ser separados por vírgula ou espaço.
   * "ab" sem separador é rejeitado (seria um símbolo de 2 caracteres).
   */
  static deTexto(texto: string): Alfabeto {
    const t = texto.trim().replace(/^\{/, '').replace(/\}$/, '').trim();
    if (t === '') throw new ErroDefinicao(['O alfabeto Σ deve ser um conjunto finito NÃO VAZIO de símbolos.']);
    const partes = t.includes(',') ? t.split(',') : t.split(/\s+/);
    const vazias = partes.filter((p) => p.trim() === '').length;
    if (vazias) throw new ErroDefinicao([`Σ: há ${vazias} símbolo(s) vazio(s) — verifique vírgulas sobrando (ex.: "{a,,b}").`]);
    const multi = partes.map((p) => p.trim()).filter((p) => Array.from(p).length > 1);
    if (multi.length && !t.includes(',') && partes.length === 1) {
      throw new ErroDefinicao([`Σ: "${t}" tem mais de um caractere. Separe os símbolos por vírgula, ex.: {${Array.from(t).join(', ')}}.`]);
    }
    return new Alfabeto(partes);
  }

  get tamanho(): number {
    return this.simbolos.length;
  }

  contem(s: string): boolean {
    return this.conjunto.has(s);
  }

  toString(): string {
    return `{${this.simbolos.join(', ')}}`;
  }

  /** Verifica se w ∈ Σ*. Percorre toda a cadeia para reportar TODOS os símbolos inválidos. Θ(n). */
  validar(entrada: string): ValidacaoCadeia {
    const cadeia = normalizarCadeia(entrada);
    const simbolos: SimboloAnalisado[] = simbolosDe(cadeia).map((s, i) => ({ simbolo: s, posicao: i + 1, valido: this.conjunto.has(s) }));
    const invalidos = simbolos.filter((s) => !s.valido);
    const valida = invalidos.length === 0;
    const mensagem = valida
      ? `Cadeia válida para Σ = ${this}`
      : `Cadeia inválida para Σ = ${this}: ${invalidos.map((s) => `"${s.simbolo}" na posição ${s.posicao}`).join(', ')}`;
    return { cadeia, valida, tamanho: simbolos.length, simbolos, invalidos, mensagem };
  }

  /** Σ^k: todas as cadeias de tamanho exatamente k. */
  potencia(k: number, limite = 5000): Enumeracao {
    if (!Number.isInteger(k) || k < 0) throw new ErroDefinicao([`k deve ser inteiro ≥ 0 (recebido ${k}).`]);
    const total = BigInt(this.tamanho) ** BigInt(k);
    const cadeias: string[] = [];
    let truncado = false;
    // contador em base |Σ| — gera em ordem lexicográfica
    const idx = new Array<number>(k).fill(0);
    while (true) {
      if (cadeias.length >= limite) {
        truncado = true;
        break;
      }
      cadeias.push(idx.map((i) => this.simbolos[i]).join(''));
      let p = k - 1;
      while (p >= 0 && idx[p] === this.tamanho - 1) idx[p--] = 0;
      if (p < 0) break;
      idx[p]++;
    }
    return { cadeias, total, truncado };
  }

  /** Σ* restrito a cadeias de tamanho ≤ maxK (Σ⁰ ∪ Σ¹ ∪ … ∪ Σ^maxK). */
  estrela(maxK: number, limite = 5000): Enumeracao {
    return this.uniaoDePotencias(0, maxK, limite);
  }

  /** Σ⁺ = Σ* − {λ}, restrito a cadeias de tamanho 1..maxK. */
  positivo(maxK: number, limite = 5000): Enumeracao {
    return this.uniaoDePotencias(1, maxK, limite);
  }

  private uniaoDePotencias(de: number, ate: number, limite: number): Enumeracao {
    if (!Number.isInteger(ate) || ate < 0) throw new ErroDefinicao([`O tamanho máximo deve ser inteiro ≥ 0 (recebido ${ate}).`]);
    const cadeias: string[] = [];
    let total = 0n;
    let truncado = false;
    for (let k = de; k <= ate; k++) {
      total += BigInt(this.tamanho) ** BigInt(k);
      if (!truncado) {
        const p = this.potencia(k, limite - cadeias.length);
        cadeias.push(...p.cadeias);
        if (p.truncado || cadeias.length >= limite) truncado = p.truncado || k < ate;
      }
    }
    return { cadeias, total, truncado };
  }
}

// ---------------------------------------------------------------------------
// Operações sobre cadeias
// ---------------------------------------------------------------------------

/** |w| — número de símbolos (λ tem tamanho 0). */
export function tamanho(w: string): number {
  return simbolosDe(normalizarCadeia(w)).length;
}

/** u·v — concatenação. λ é o elemento neutro: λ·w = w·λ = w. */
export function concatenar(u: string, v: string): string {
  return normalizarCadeia(u) + normalizarCadeia(v);
}

/** wⁿ — w concatenada consigo mesma n vezes (w⁰ = λ). */
export function potenciaCadeia(w: string, n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new ErroDefinicao([`O expoente deve ser inteiro ≥ 0 (recebido ${n}).`]);
  return normalizarCadeia(w).repeat(n);
}

/** wᴿ — reverso da cadeia. */
export function reverso(w: string): string {
  return simbolosDe(normalizarCadeia(w)).reverse().join('');
}

/** L1·L2 = { xy | x ∈ L1, y ∈ L2 } para linguagens finitas. */
export function concatenarLinguagens(l1: readonly string[], l2: readonly string[]): string[] {
  const out = new Set<string>();
  for (const x of l1) for (const y of l2) out.add(normalizarCadeia(x) + normalizarCadeia(y));
  return [...out].sort((a, b) => tamanho(a) - tamanho(b) || (a < b ? -1 : a > b ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Linguagem L ⊆ Σ*
// ---------------------------------------------------------------------------

export type IdPropriedade = 'anbn' | 'anbn1' | 'palindromo' | 'ww' | 'mesmoNumeroAB' | 'anbncn';

interface Propriedade {
  id: IdPropriedade;
  notacao: string;
  descricao: string;
  requer?: string[];
  teste: (s: string[]) => boolean;
}

export const PROPRIEDADES: readonly Propriedade[] = [
  {
    id: 'anbn',
    notacao: 'L = { aⁿbⁿ | n ≥ 0 }',
    descricao: 'n símbolos a seguidos de n símbolos b (inclui λ).',
    requer: ['a', 'b'],
    teste: (s) => s.length % 2 === 0 && s.every((c, i) => c === (i < s.length / 2 ? 'a' : 'b')),
  },
  {
    id: 'anbn1',
    notacao: 'L = { aⁿbⁿ | n ≥ 1 }',
    descricao: 'n ≥ 1 símbolos a seguidos do mesmo número de b.',
    requer: ['a', 'b'],
    teste: (s) => s.length >= 2 && s.length % 2 === 0 && s.every((c, i) => c === (i < s.length / 2 ? 'a' : 'b')),
  },
  {
    id: 'palindromo',
    notacao: 'L = { w ∈ Σ* | w = wᴿ }',
    descricao: 'Palíndromos: cadeias iguais ao seu reverso.',
    teste: (s) => s.every((c, i) => c === s[s.length - 1 - i]),
  },
  {
    id: 'ww',
    notacao: 'L = { ww | w ∈ Σ* }',
    descricao: 'Cadeias formadas por uma metade repetida.',
    teste: (s) => s.length % 2 === 0 && s.slice(0, s.length / 2).join('') === s.slice(s.length / 2).join(''),
  },
  {
    id: 'mesmoNumeroAB',
    notacao: 'L = { w ∈ {a,b}* | #a(w) = #b(w) }',
    descricao: 'Mesmo número de a e de b, em qualquer ordem.',
    requer: ['a', 'b'],
    teste: (s) => s.filter((c) => c === 'a').length === s.filter((c) => c === 'b').length,
  },
  {
    id: 'anbncn',
    notacao: 'L = { aⁿbⁿcⁿ | n ≥ 0 }',
    descricao: 'Linguagem sensível ao contexto (não é livre de contexto).',
    requer: ['a', 'b', 'c'],
    teste: (s) => {
      const n = s.length / 3;
      return Number.isInteger(n) && s.every((c, i) => c === (i < n ? 'a' : i < 2 * n ? 'b' : 'c'));
    },
  },
];

export type DefinicaoLinguagem =
  | { tipo: 'finita'; cadeias: string[] }
  | { tipo: 'regular'; expressao: string }
  | { tipo: 'propriedade'; id: IdPropriedade };

export interface Pertinencia {
  cadeia: string;
  pertence: boolean;
  motivo: string;
}

export class Linguagem {
  readonly alfabeto: Alfabeto;
  readonly definicao: DefinicaoLinguagem;
  readonly notacao: string;
  readonly avisos: string[] = [];
  /** Para linguagens regulares: o AFN-λ obtido por Thompson. */
  readonly automato?: AutomatoFinito;
  readonly er?: NoER;
  private readonly finita?: Set<string>;
  private readonly propriedade?: Propriedade;

  constructor(alfabeto: Alfabeto, definicao: DefinicaoLinguagem) {
    this.alfabeto = alfabeto;
    this.definicao = definicao;
    switch (definicao.tipo) {
      case 'finita': {
        const erros: string[] = [];
        const cadeias = semDuplicatas(definicao.cadeias.map(normalizarCadeia), 'L', this.avisos);
        for (const w of cadeias) {
          const v = alfabeto.validar(w);
          if (!v.valida) erros.push(`"${w}" não pertence a Σ*: ${v.invalidos.map((s) => `"${s.simbolo}"`).join(', ')} fora de Σ.`);
        }
        if (erros.length) throw new ErroDefinicao(erros);
        this.finita = new Set(cadeias);
        const ordenadas = [...this.finita].sort((a, b) => tamanho(a) - tamanho(b) || (a < b ? -1 : 1));
        this.notacao = ordenadas.length ? `L = { ${ordenadas.map(exibir).join(', ')} }` : 'L = ∅';
        break;
      }
      case 'regular': {
        this.er = parseER(definicao.expressao, alfabeto.simbolos);
        this.automato = new AutomatoFinito(thompson(this.er, alfabeto.simbolos));
        this.notacao = `L = L(${erParaTexto(this.er)})`;
        break;
      }
      case 'propriedade': {
        const p = PROPRIEDADES.find((x) => x.id === definicao.id);
        if (!p) throw new ErroDefinicao([`Propriedade desconhecida: ${definicao.id}.`]);
        const faltando = (p.requer ?? []).filter((s) => !alfabeto.contem(s));
        if (faltando.length) throw new ErroDefinicao([`${p.notacao} exige os símbolos ${faltando.join(', ')} em Σ.`]);
        this.propriedade = p;
        this.notacao = p.notacao;
        break;
      }
    }
  }

  /** w ∈ L ? Primeiro verifica w ∈ Σ*, depois a definição de L. */
  pertence(entrada: string): Pertinencia {
    const v = this.alfabeto.validar(entrada);
    const w = v.cadeia;
    if (!v.valida) return { cadeia: w, pertence: false, motivo: `${exibir(w)} ∉ Σ*, logo ${exibir(w)} ∉ L. ${v.mensagem}.` };
    let pertence: boolean;
    let como: string;
    if (this.finita) {
      pertence = this.finita.has(w);
      como = pertence ? 'está listada em L' : 'não está listada em L';
    } else if (this.automato) {
      const ex = this.automato.executar(w);
      pertence = ex.veredito === 'ACEITA';
      como = pertence ? 'é aceita pelo AFN-λ da expressão regular' : 'é rejeitada pelo AFN-λ da expressão regular';
    } else {
      pertence = this.propriedade!.teste(simbolosDe(w));
      como = pertence ? 'satisfaz a propriedade' : 'não satisfaz a propriedade';
    }
    return { cadeia: w, pertence, motivo: `${exibir(w)} ${como}, logo ${exibir(w)} ${pertence ? '∈' : '∉'} L.` };
  }

  /** Cadeias de L com tamanho ≤ maxK (filtra Σ* ≤ maxK). */
  enumerar(maxK: number, limite = 2000): { cadeias: string[]; truncado: boolean } {
    if (this.finita) {
      const c = [...this.finita].filter((w) => tamanho(w) <= maxK).sort((a, b) => tamanho(a) - tamanho(b) || (a < b ? -1 : 1));
      return { cadeias: c.slice(0, limite), truncado: c.length > limite };
    }
    const candidatos = this.alfabeto.estrela(maxK, 200_000);
    const cadeias: string[] = [];
    for (const w of candidatos.cadeias) {
      if (this.pertence(w).pertence) {
        if (cadeias.length >= limite) return { cadeias, truncado: true };
        cadeias.push(w);
      }
    }
    return { cadeias, truncado: candidatos.truncado };
  }
}

export { LAMBDA };
