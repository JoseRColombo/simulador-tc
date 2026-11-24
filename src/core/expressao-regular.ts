/**
 * Expressões regulares (usadas para DEFINIR uma linguagem L no Módulo 1).
 *
 * Sintaxe (notação de livro-texto):
 *   r + s   ou  r | s  ou  r ∪ s    união
 *   rs                              concatenação (justaposição)
 *   r*                              fecho de Kleene
 *   r⁺                              fecho positivo (rr*)
 *   r?                              opcional (r + λ)
 *   ( r )                           agrupamento
 *   λ ou ε                          cadeia vazia
 *   ∅                               linguagem vazia
 *
 * Observação: como em Menezes/Hopcroft, "+" significa UNIÃO. Para "uma ou mais
 * vezes" use "⁺" (sobrescrito) ou escreva rr*.
 *
 * A ER é convertida em um AFN-λ pela construção de Thompson; o teste de
 * pertinência é então feito pelo simulador de autômato finito.
 */
import { ErroDefinicao, LAMBDA } from './comum.js';
import type { DefinicaoAF, TransicaoAF } from './automato-finito.js';

export type NoER =
  | { tipo: 'simbolo'; simbolo: string }
  | { tipo: 'lambda' }
  | { tipo: 'vazio' }
  | { tipo: 'uniao'; esq: NoER; dir: NoER }
  | { tipo: 'concat'; esq: NoER; dir: NoER }
  | { tipo: 'estrela'; filho: NoER }
  | { tipo: 'mais'; filho: NoER }
  | { tipo: 'opcional'; filho: NoER };

const UNIAO = new Set(['+', '|', '∪']);
const POSFIXOS = new Set(['*', '⁺', '?']);
const ESPECIAIS = new Set(['(', ')', ...UNIAO, ...POSFIXOS, 'λ', 'ε', '∅']);

interface Token {
  c: string;
  pos: number; // posição (1-based) na expressão original
}

/** Faz o parsing da ER. Se `alfabeto` for dado, valida os símbolos. */
export function parseER(expressao: string, alfabeto?: readonly string[]): NoER {
  const tokens: Token[] = [];
  Array.from(expressao).forEach((c, i) => {
    if (c.trim() !== '') tokens.push({ c, pos: i + 1 });
  });
  if (tokens.length === 0) throw new ErroDefinicao(['Expressão regular vazia. Use λ para representar a cadeia vazia.']);
  const sigma = alfabeto ? new Set(alfabeto) : null;
  let k = 0;
  const atual = () => tokens[k];
  const erro = (msg: string, t: Token | undefined = atual()): never => {
    throw new ErroDefinicao([t ? `ER, posição ${t.pos} ("${t.c}"): ${msg}` : `ER, fim da expressão: ${msg}`]);
  };

  const iniciaBase = (t: Token | undefined) => !!t && (t.c === '(' || !ESPECIAIS.has(t.c) || t.c === 'λ' || t.c === 'ε' || t.c === '∅');

  function expr(): NoER {
    let no = termo();
    while (atual() && UNIAO.has(atual().c)) {
      k++;
      if (!iniciaBase(atual())) erro('esperado um operando após a união.');
      no = { tipo: 'uniao', esq: no, dir: termo() };
    }
    return no;
  }
  function termo(): NoER {
    if (!iniciaBase(atual())) erro(atual() ? 'esperado símbolo, λ, ∅ ou "(".' : 'expressão incompleta.');
    let no = fator();
    while (iniciaBase(atual())) no = { tipo: 'concat', esq: no, dir: fator() };
    return no;
  }
  function fator(): NoER {
    let no = base();
    while (atual() && POSFIXOS.has(atual().c)) {
      const c = atual().c;
      k++;
      no = c === '*' ? { tipo: 'estrela', filho: no } : c === '⁺' ? { tipo: 'mais', filho: no } : { tipo: 'opcional', filho: no };
    }
    return no;
  }
  function base(): NoER {
    const t = atual();
    if (!t) return erro('expressão incompleta.');
    if (t.c === '(') {
      k++;
      if (atual()?.c === ')') erro('parênteses vazios "()". Use λ para a cadeia vazia.');
      const no = expr();
      if (!atual()) erro('este parêntese nunca é fechado — falta um ")".', t);
      if (atual().c !== ')') erro('parêntese ")" esperado.');
      k++;
      return no;
    }
    if (t.c === 'λ' || t.c === 'ε') {
      k++;
      return { tipo: 'lambda' };
    }
    if (t.c === '∅') {
      k++;
      return { tipo: 'vazio' };
    }
    if (ESPECIAIS.has(t.c)) return erro('operador sem operando.');
    if (sigma && !sigma.has(t.c)) erro(`símbolo "${t.c}" não pertence a Σ = {${[...sigma].join(', ')}}.`);
    k++;
    return { tipo: 'simbolo', simbolo: t.c };
  }

  const raiz = expr();
  if (k < tokens.length) {
    const t = tokens[k];
    erro(t.c === ')' ? 'parêntese ")" sem "(" correspondente.' : 'símbolo inesperado.', t);
  }
  return raiz;
}

/** Representação textual canônica (com parênteses mínimos). */
export function erParaTexto(no: NoER): string {
  const prec = (n: NoER) => (n.tipo === 'uniao' ? 1 : n.tipo === 'concat' ? 2 : 3);
  const emb = (n: NoER, min: number) => (prec(n) < min ? `(${erParaTexto(n)})` : erParaTexto(n));
  switch (no.tipo) {
    case 'simbolo':
      return no.simbolo;
    case 'lambda':
      return LAMBDA;
    case 'vazio':
      return '∅';
    case 'uniao':
      return `${emb(no.esq, 1)} + ${emb(no.dir, 1)}`;
    case 'concat':
      return `${emb(no.esq, 2)}${emb(no.dir, 2)}`;
    case 'estrela':
      return `${emb(no.filho, 3)}*`;
    case 'mais':
      return `${emb(no.filho, 3)}⁺`;
    case 'opcional':
      return `${emb(no.filho, 3)}?`;
  }
}

/**
 * Construção de Thompson: ER → AFN-λ com exatamente um estado inicial e um final.
 * Número de estados ≤ 2·|r| — tempo e espaço Θ(|r|).
 */
export function thompson(no: NoER, alfabeto: readonly string[], nome?: string): DefinicaoAF {
  let proximo = 0;
  const transicoes: TransicaoAF[] = [];
  const novo = () => `s${proximo++}`;
  const lig = (de: string, simbolo: string, para: string) => transicoes.push({ de, simbolo, para });

  function construir(n: NoER): { i: string; f: string } {
    switch (n.tipo) {
      case 'simbolo': {
        const i = novo(), f = novo();
        lig(i, n.simbolo, f);
        return { i, f };
      }
      case 'lambda': {
        const i = novo(), f = novo();
        lig(i, '', f);
        return { i, f };
      }
      case 'vazio': {
        const i = novo(), f = novo();
        return { i, f };
      }
      case 'concat': {
        const a = construir(n.esq), b = construir(n.dir);
        lig(a.f, '', b.i);
        return { i: a.i, f: b.f };
      }
      case 'uniao': {
        const i = novo();
        const a = construir(n.esq), b = construir(n.dir);
        const f = novo();
        lig(i, '', a.i); lig(i, '', b.i); lig(a.f, '', f); lig(b.f, '', f);
        return { i, f };
      }
      case 'estrela':
      case 'mais':
      case 'opcional': {
        const i = novo();
        const a = construir(n.filho);
        const f = novo();
        lig(i, '', a.i);
        lig(a.f, '', f);
        if (n.tipo !== 'mais') lig(i, '', f); // aceita λ
        if (n.tipo !== 'opcional') lig(a.f, '', a.i); // repete
        return { i, f };
      }
    }
  }
  const { i, f } = construir(no);
  const estados = Array.from({ length: proximo }, (_, k) => `s${k}`);
  return {
    tipo: 'AFN',
    nome: nome ?? `AFN-λ de ${erParaTexto(no)}`,
    descricao: 'Gerado pela construção de Thompson.',
    alfabeto: [...alfabeto],
    estados,
    estadoInicial: i,
    estadosFinais: [f],
    transicoes,
  };
}
