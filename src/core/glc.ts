/**
 * Módulo 3 — Gramáticas Livres de Contexto.
 *
 * G = (V, T, P, S), com produções A → α, A ∈ V, α ∈ (V ∪ T)*.
 *
 * Reconhecimento: CYK GENERALIZADO (programação dinâmica sobre subcadeias).
 *   - Não exige converter a gramática para a Forma Normal de Chomsky, então a
 *     árvore e a derivação mostradas usam as produções ORIGINAIS do usuário.
 *   - Internamente cada corpo com mais de 2 símbolos é "binarizado"
 *     (A → X1 X2 X3  vira  A → X1 ⟨1⟩, ⟨1⟩ → X2 X3), o que mantém o custo em O(n³).
 *   - Produções λ e unitárias (A → B) são tratadas com um ponto fixo por subcadeia,
 *     então ciclos como A → B, B → A não causam laço infinito.
 *   - É um algoritmo de DECISÃO exato: nunca gera falso positivo nem falso negativo.
 *
 * Saída: árvore de derivação e derivação mais à esquerda passo a passo.
 */
import {
  campo,
  Contador,
  ehLambda,
  ErroDefinicao,
  exibir,
  exigirObjeto,
  LAMBDA,
  lerJSON,
  listaDeTextos,
  normalizarCadeia,
  semDuplicatas,
  simbolosDe,
  validarSimbolo,
  type Veredito,
} from './comum.js';

export interface Producao {
  cabeca: string;
  /** símbolos do corpo; [] = λ */
  corpo: string[];
}

export interface DefinicaoGLC {
  nome?: string;
  descricao?: string;
  variaveis: string[];
  terminais: string[];
  inicial: string;
  producoes: Producao[];
}

export interface NoArvore {
  id: number;
  simbolo: string;
  tipo: 'variavel' | 'terminal' | 'lambda';
  filhos: NoArvore[];
  /** produção aplicada neste nó (só variáveis) */
  producao?: string;
}

export interface PassoDerivacao {
  /** forma sentencial ANTES de aplicar a produção (símbolos) */
  forma: string[];
  /** índice, em `forma`, da variável expandida (a mais à esquerda) */
  posicao: number;
  producao: string;
  /** forma sentencial resultante */
  resultado: string[];
  /** id do nó da árvore expandido neste passo */
  noId: number;
}

export interface ResultadoGLC {
  cadeia: string;
  veredito: Veredito;
  motivo: string;
  erroEntrada?: string;
  arvore?: NoArvore;
  derivacao?: PassoDerivacao[];
  operacoes: number;
}

export type ClasseChomsky = 'Tipo 3 (regular — linear à direita)' | 'Tipo 3 (regular — linear à esquerda)' | 'Tipo 2 (livre de contexto)';

export const TAMANHO_MAXIMO_CADEIA_GLC = 150;

export function formatarProducao(p: Producao): string {
  return `${p.cabeca} → ${p.corpo.length ? p.corpo.join('') : LAMBDA}`;
}

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

const SETA = /->|→|::=/;

/** Lê produções em texto: "S -> aSb | λ" (uma ou mais linhas). */
export function lerProducoesTexto(texto: string, erros: string[]): Producao[] {
  const out: Producao[] = [];
  texto.split(/\r?\n/).forEach((linhaBruta, i) => {
    const linha = linhaBruta.trim();
    if (linha === '' || linha.startsWith('#') || linha.startsWith('//')) return;
    const partes = linha.split(SETA);
    if (partes.length !== 2) {
      erros.push(`Linha ${i + 1} ("${linha}"): use o formato "A -> corpo1 | corpo2".`);
      return;
    }
    const cabeca = partes[0].trim();
    if (Array.from(cabeca).length !== 1) {
      erros.push(
        cabeca === ''
          ? `Linha ${i + 1}: lado esquerdo vazio.`
          : `Linha ${i + 1}: lado esquerdo "${cabeca}" deve ser UMA variável (em GLC o lado esquerdo tem exatamente 1 variável).`,
      );
      return;
    }
    for (const alt of partes[1].split('|')) out.push({ cabeca, corpo: lerCorpo(alt, `Linha ${i + 1}`, erros) });
  });
  return out;
}

function lerCorpo(texto: string, ctx: string, erros: string[]): string[] {
  const t = texto.replace(/\s+/g, '');
  if (ehLambda(t)) return [];
  const simbolos = Array.from(t);
  if (simbolos.some((s) => s === 'λ' || s === 'ε')) {
    erros.push(`${ctx}: λ só pode aparecer sozinho em um corpo (ex.: "S -> λ"), não junto de outros símbolos ("${texto.trim()}").`);
    return simbolos.filter((s) => s !== 'λ' && s !== 'ε');
  }
  return simbolos;
}

/**
 * Lê uma GLC de JSON (texto/objeto) ou de texto puro com produções.
 * Se "variaveis"/"terminais" forem omitidos, são inferidos:
 *   variáveis = lados esquerdos ∪ letras maiúsculas nos corpos; terminais = o resto.
 */
export function lerDefinicaoGLC(entrada: string | unknown): { definicao: DefinicaoGLC; avisos: string[] } {
  const erros: string[] = [];
  const avisos: string[] = [];
  let obj: Record<string, unknown>;
  if (typeof entrada === 'string' && !entrada.trim().startsWith('{')) obj = { producoes: entrada };
  else obj = exigirObjeto(typeof entrada === 'string' ? lerJSON(entrada) : entrada, 'A definição da gramática');

  const prodBruto = campo(obj, 'producoes', 'produções', 'regras', 'productions', 'P');
  let producoes: Producao[] = [];
  if (prodBruto === undefined) erros.push('Campo obrigatório ausente: producoes.');
  else if (typeof prodBruto === 'string') producoes = lerProducoesTexto(prodBruto, erros);
  else if (Array.isArray(prodBruto)) {
    prodBruto.forEach((p, i) => {
      if (typeof p === 'string') producoes.push(...lerProducoesTexto(p, erros));
      else if (typeof p === 'object' && p !== null) {
        const o = p as Record<string, unknown>;
        const cab = campo(o, 'cabeca', 'esquerda', 'lhs', 'de');
        const corpo = campo(o, 'corpo', 'direita', 'rhs', 'para');
        if (typeof cab !== 'string' || Array.from(cab.trim()).length !== 1) erros.push(`producoes[${i}]: "cabeca" deve ser uma variável de 1 caractere.`);
        else if (typeof corpo !== 'string') erros.push(`producoes[${i}]: "corpo" deve ser texto (use "λ" para vazio).`);
        else for (const alt of corpo.split('|')) producoes.push({ cabeca: cab.trim(), corpo: lerCorpo(alt, `producoes[${i}]`, erros) });
      } else erros.push(`producoes[${i}] inválida.`);
    });
  } else if (typeof prodBruto === 'object' && prodBruto !== null) {
    for (const [cab, corpos] of Object.entries(prodBruto as Record<string, unknown>)) {
      if (Array.from(cab.trim()).length !== 1) {
        erros.push(`producoes: lado esquerdo "${cab}" deve ser uma variável de 1 caractere.`);
        continue;
      }
      const lista = Array.isArray(corpos) ? corpos : typeof corpos === 'string' ? corpos.split('|') : null;
      if (!lista) {
        erros.push(`producoes["${cab}"] deve ser uma lista de corpos.`);
        continue;
      }
      for (const c of lista) {
        if (typeof c !== 'string') erros.push(`producoes["${cab}"]: corpo inválido ${JSON.stringify(c)}.`);
        else producoes.push({ cabeca: cab.trim(), corpo: lerCorpo(c, `producoes["${cab}"]`, erros) });
      }
    }
  } else erros.push('Campo "producoes" deve ser texto, lista ou objeto.');

  if (producoes.length === 0 && erros.length === 0) erros.push('A gramática precisa de pelo menos uma produção.');

  // variáveis e terminais (declarados ou inferidos)
  const vBruto = campo(obj, 'variaveis', 'variáveis', 'V', 'naoTerminais');
  const tBruto = campo(obj, 'terminais', 'T', 'alfabeto');
  let variaveis: string[];
  let terminais: string[];
  const cabecas = producoes.map((p) => p.cabeca);
  if (vBruto !== undefined) variaveis = semDuplicatas(listaDeTextos(vBruto, 'variaveis', erros), 'variaveis', avisos);
  else {
    const maiusculas = producoes.flatMap((p) => p.corpo).filter((s) => /\p{Lu}/u.test(s));
    variaveis = semDuplicatas([...cabecas, ...maiusculas], 'variaveis', []);
  }
  const conjV = new Set(variaveis);
  if (tBruto !== undefined) terminais = semDuplicatas(listaDeTextos(tBruto, 'terminais', erros), 'terminais', avisos);
  else terminais = semDuplicatas(producoes.flatMap((p) => p.corpo).filter((s) => !conjV.has(s)), 'terminais', []);
  const conjT = new Set(terminais);

  variaveis.forEach((v, i) => validarSimbolo(v, `variaveis[${i}]`, erros));
  terminais.forEach((t, i) => validarSimbolo(t, `terminais[${i}]`, erros));
  for (const v of variaveis) if (conjT.has(v)) erros.push(`"${v}" foi declarado como variável E como terminal (V ∩ T deve ser ∅).`);

  const inicialBruto = campo(obj, 'inicial', 'simboloInicial', 'S', 'start');
  const inicial = typeof inicialBruto === 'string' && inicialBruto.trim() !== '' ? inicialBruto.trim() : cabecas[0] ?? '';
  if (inicial === '') erros.push('Símbolo inicial não definido.');
  else if (!conjV.has(inicial)) erros.push(`O símbolo inicial "${inicial}" não é uma variável.`);

  for (const p of producoes) {
    if (!conjV.has(p.cabeca)) erros.push(`Produção ${formatarProducao(p)}: "${p.cabeca}" não é variável (adicione-a em "variaveis").`);
    for (const s of p.corpo) {
      if (!conjV.has(s) && !conjT.has(s)) erros.push(`Produção ${formatarProducao(p)}: símbolo "${s}" não é variável nem terminal.`);
    }
  }

  // remove produções duplicadas
  const vistas = new Set<string>();
  const unicas: Producao[] = [];
  for (const p of producoes) {
    const k = formatarProducao(p);
    if (vistas.has(k)) avisos.push(`Produção repetida ignorada: ${k}.`);
    else {
      vistas.add(k);
      unicas.push(p);
    }
  }

  if (erros.length) throw new ErroDefinicao(erros, avisos);

  const nome = campo(obj, 'nome', 'name');
  const descricao = campo(obj, 'descricao', 'description');
  const definicao: DefinicaoGLC = {
    nome: typeof nome === 'string' ? nome : undefined,
    descricao: typeof descricao === 'string' ? descricao : undefined,
    variaveis,
    terminais,
    inicial,
    producoes: unicas,
  };
  avisos.push(...analisarSimbolosInuteis(definicao));
  return { definicao, avisos };
}

/** Variáveis improdutivas / inalcançáveis — avisos (não impedem a simulação). */
function analisarSimbolosInuteis(g: DefinicaoGLC): string[] {
  const avisos: string[] = [];
  const V = new Set(g.variaveis);
  const semProducao = g.variaveis.filter((v) => !g.producoes.some((p) => p.cabeca === v));
  if (semProducao.length) avisos.push(`Variável(is) sem produções: ${semProducao.join(', ')}.`);
  // produtivas: ponto fixo
  const produtivas = new Set<string>();
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const p of g.producoes) {
      if (!produtivas.has(p.cabeca) && p.corpo.every((s) => !V.has(s) || produtivas.has(s))) {
        produtivas.add(p.cabeca);
        mudou = true;
      }
    }
  }
  const improdutivas = g.variaveis.filter((v) => !produtivas.has(v) && !semProducao.includes(v));
  if (improdutivas.length) avisos.push(`Variável(is) improdutiva(s) (nunca geram cadeia só de terminais): ${improdutivas.join(', ')}.`);
  if (!produtivas.has(g.inicial)) avisos.push(`O símbolo inicial ${g.inicial} é improdutivo: L(G) = ∅.`);
  // alcançáveis
  const alc = new Set([g.inicial]);
  const pilha = [g.inicial];
  while (pilha.length) {
    const a = pilha.pop()!;
    for (const p of g.producoes) if (p.cabeca === a) for (const s of p.corpo) if (V.has(s) && !alc.has(s)) {
      alc.add(s);
      pilha.push(s);
    }
  }
  const inalc = g.variaveis.filter((v) => !alc.has(v));
  if (inalc.length) avisos.push(`Variável(is) inalcançável(is) a partir de ${g.inicial}: ${inalc.join(', ')}.`);
  return avisos;
}

// ---------------------------------------------------------------------------
// Gramática
// ---------------------------------------------------------------------------

type Sim = { t: true; c: string } | { t: false; v: number };

interface ProdBin {
  cabeca: number;
  corpo: Sim[]; // tamanho ≤ 2
  origem: number; // índice da produção original
}

export class GramaticaLC {
  readonly definicao: DefinicaoGLC;
  readonly avisos: string[];
  private readonly idVar = new Map<string, number>();
  /** nomes das variáveis (originais + auxiliares da binarização) */
  private readonly nomes: string[] = [];
  private readonly nOriginais: number;
  private readonly bin: ProdBin[] = [];
  private readonly terminais: Set<string>;

  constructor(definicao: DefinicaoGLC, avisos: string[] = []) {
    this.definicao = definicao;
    this.avisos = avisos;
    this.terminais = new Set(definicao.terminais);
    definicao.variaveis.forEach((v) => {
      this.idVar.set(v, this.nomes.length);
      this.nomes.push(v);
    });
    this.nOriginais = this.nomes.length;
    const sim = (s: string): Sim => (this.idVar.has(s) ? { t: false, v: this.idVar.get(s)! } : { t: true, c: s });
    definicao.producoes.forEach((p, k) => {
      const corpo = p.corpo.map(sim);
      let cab = this.idVar.get(p.cabeca)!;
      let i = 0;
      // A → X1 X2 … Xm (m > 2)  ⇒  A → X1 N1, N1 → X2 N2, …, N(m-2) → X(m-1) Xm
      while (corpo.length - i > 2) {
        const aux = this.nomes.length;
        this.nomes.push(`⟨${k + 1}.${i + 1}⟩`);
        this.bin.push({ cabeca: cab, corpo: [corpo[i], { t: false, v: aux }], origem: k });
        cab = aux;
        i++;
      }
      this.bin.push({ cabeca: cab, corpo: corpo.slice(i), origem: k });
    });
  }

  static deJSON(entrada: string | unknown): GramaticaLC {
    const { definicao, avisos } = lerDefinicaoGLC(entrada);
    return new GramaticaLC(definicao, avisos);
  }

  /** Classificação na hierarquia de Chomsky (tipo 3 se linear à direita ou à esquerda). */
  classificar(): ClasseChomsky {
    const V = new Set(this.definicao.variaveis);
    const ehDireita = this.definicao.producoes.every((p) => {
      const vs = p.corpo.filter((s) => V.has(s)).length;
      return vs === 0 || (vs === 1 && V.has(p.corpo[p.corpo.length - 1]));
    });
    if (ehDireita) return 'Tipo 3 (regular — linear à direita)';
    const ehEsquerda = this.definicao.producoes.every((p) => {
      const vs = p.corpo.filter((s) => V.has(s)).length;
      return vs === 0 || (vs === 1 && V.has(p.corpo[0]));
    });
    if (ehEsquerda) return 'Tipo 3 (regular — linear à esquerda)';
    return 'Tipo 2 (livre de contexto)';
  }

  /** Reconhece a cadeia e, se aceita, constrói a árvore e a derivação mais à esquerda. */
  reconhecer(entrada: string): ResultadoGLC {
    const cadeia = normalizarCadeia(entrada);
    const w = simbolosDe(cadeia);
    const n = w.length;
    const invalidos = w.map((s, i) => ({ s, i })).filter(({ s }) => !this.terminais.has(s));
    if (invalidos.length) {
      const lista = invalidos.map(({ s, i }) => `"${s}" (posição ${i + 1})`).join(', ');
      return {
        cadeia,
        veredito: 'REJEITADA',
        motivo: `A cadeia contém símbolo(s) que não são terminais da gramática (T = {${this.definicao.terminais.join(', ')}}): ${lista}.`,
        erroEntrada: `Símbolo(s) fora de T: ${lista}`,
        operacoes: 0,
      };
    }
    if (n > TAMANHO_MAXIMO_CADEIA_GLC) {
      throw new ErroDefinicao([`Cadeia muito longa (${n} símbolos). O simulador de GLC aceita até ${TAMANHO_MAXIMO_CADEIA_GLC}.`]);
    }

    const cont = new Contador();
    const NV = this.nomes.length;
    const N1 = n + 1;
    const idx = (v: number, i: number, j: number) => (v * N1 + i) * N1 + j;
    const D = new Uint8Array(NV * N1 * N1); // D[v,i,j] = 1  ⇔  v ⇒* w[i..j)
    const usada = new Int32Array(NV * N1 * N1).fill(-1); // produção binarizada que justificou
    const corte = new Int32Array(NV * N1 * N1).fill(-1); // ponto de divisão (corpos de tamanho 2)

    const deriva = (s: Sim, i: number, j: number): boolean => (s.t ? j === i + 1 && w[i] === s.c : D[idx(s.v, i, j)] === 1);

    // spans em ordem crescente de tamanho; ponto fixo dentro de cada span
    for (let L = 0; L <= n; L++) {
      for (let i = 0; i + L <= n; i++) {
        const j = i + L;
        let mudou = true;
        while (mudou) {
          mudou = false;
          for (let k = 0; k < this.bin.length; k++) {
            const p = this.bin[k];
            const id = idx(p.cabeca, i, j);
            if (D[id]) continue;
            cont.inc();
            let ok = false;
            let c = -1;
            if (p.corpo.length === 0) ok = i === j;
            else if (p.corpo.length === 1) ok = deriva(p.corpo[0], i, j);
            else {
              for (let m = i; m <= j && !ok; m++) {
                cont.inc();
                if (deriva(p.corpo[0], i, m) && deriva(p.corpo[1], m, j)) {
                  ok = true;
                  c = m;
                }
              }
            }
            if (ok) {
              D[id] = 1;
              usada[id] = k;
              corte[id] = c;
              mudou = true;
            }
          }
        }
      }
    }

    const S = this.idVar.get(this.definicao.inicial)!;
    if (!D[idx(S, 0, n)]) {
      return {
        cadeia,
        veredito: 'REJEITADA',
        motivo: `Não existe derivação ${this.definicao.inicial} ⇒* ${exibir(cadeia)}: a tabela de programação dinâmica não contém ${this.definicao.inicial} para a cadeia inteira.`,
        operacoes: cont.valor,
      };
    }

    // ---- reconstrução da árvore ----
    let proxId = 0;
    const construir = (v: number, i: number, j: number): NoArvore => {
      const no: NoArvore = { id: proxId++, simbolo: this.nomes[v], tipo: 'variavel', filhos: [] };
      const k = usada[idx(v, i, j)];
      no.producao = formatarProducao(this.definicao.producoes[this.bin[k].origem]);
      no.filhos = expandir(v, i, j);
      if (no.filhos.length === 0) no.filhos = [{ id: proxId++, simbolo: LAMBDA, tipo: 'lambda', filhos: [] }];
      return no;
    };
    const expandir = (v: number, i: number, j: number): NoArvore[] => {
      const id = idx(v, i, j);
      const p = this.bin[usada[id]];
      const partes: [Sim, number, number][] =
        p.corpo.length === 0 ? [] : p.corpo.length === 1 ? [[p.corpo[0], i, j]] : [[p.corpo[0], i, corte[id]], [p.corpo[1], corte[id], j]];
      const out: NoArvore[] = [];
      for (const [s, a, b] of partes) {
        if (s.t) out.push({ id: proxId++, simbolo: s.c, tipo: 'terminal', filhos: [] });
        else if (s.v >= this.nOriginais) out.push(...expandir(s.v, a, b)); // auxiliar: "achata"
        else out.push(construir(s.v, a, b));
      }
      return out;
    };
    const arvore = construir(S, 0, n);
    const derivacao = derivacaoMaisAEsquerda(arvore);
    return {
      cadeia,
      veredito: 'ACEITA',
      motivo: `${this.definicao.inicial} ⇒* ${exibir(cadeia)} em ${derivacao.length} passo(s) de derivação.`,
      arvore,
      derivacao,
      operacoes: cont.valor,
    };
  }

  aceita(cadeia: string): boolean {
    return this.reconhecer(cadeia).veredito === 'ACEITA';
  }

  /** Cadeias geradas por G com tamanho ≤ maxK (teste exaustivo de T* ≤ maxK). */
  gerar(maxK: number, limiteCandidatos = 20_000): { cadeias: string[]; truncado: boolean } {
    const T = this.definicao.terminais;
    const cadeias: string[] = [];
    let candidatos = 0;
    if (T.length === 0) return { cadeias: this.aceita('') ? [''] : [], truncado: false };
    for (let k = 0; k <= maxK; k++) {
      const idx = new Array<number>(k).fill(0);
      while (true) {
        if (++candidatos > limiteCandidatos) return { cadeias, truncado: true };
        const w = idx.map((i) => T[i]).join('');
        if (this.aceita(w)) cadeias.push(w);
        let p = k - 1;
        while (p >= 0 && idx[p] === T.length - 1) idx[p--] = 0;
        if (p < 0) break;
        idx[p]++;
      }
    }
    return { cadeias, truncado: false };
  }
}

/** A partir da árvore, gera a derivação mais à esquerda (sempre expande a 1ª variável). */
export function derivacaoMaisAEsquerda(raiz: NoArvore): PassoDerivacao[] {
  const passos: PassoDerivacao[] = [];
  let forma: NoArvore[] = [raiz];
  while (true) {
    const pos = forma.findIndex((n) => n.tipo === 'variavel');
    if (pos < 0) break;
    const no = forma[pos];
    const filhos = no.filhos.filter((f) => f.tipo !== 'lambda');
    const nova = [...forma.slice(0, pos), ...filhos, ...forma.slice(pos + 1)];
    passos.push({
      forma: forma.map((n) => n.simbolo),
      posicao: pos,
      producao: no.producao ?? '',
      resultado: nova.map((n) => n.simbolo),
      noId: no.id,
    });
    forma = nova;
  }
  return passos;
}

/** Desenho textual da árvore (para o console). */
export function arvoreParaTexto(raiz: NoArvore): string {
  const linhas: string[] = [];
  const visitar = (no: NoArvore, prefixo: string, ultimo: boolean, raizNo: boolean) => {
    linhas.push(raizNo ? no.simbolo : `${prefixo}${ultimo ? '└── ' : '├── '}${no.simbolo}`);
    const novoPrefixo = raizNo ? '' : prefixo + (ultimo ? '    ' : '│   ');
    no.filhos.forEach((f, i) => visitar(f, novoPrefixo, i === no.filhos.length - 1, false));
  };
  visitar(raiz, '', true, true);
  return linhas.join('\n');
}

/** Forma sentencial como texto (λ se vazia). */
export function formaParaTexto(forma: string[]): string {
  return forma.length ? forma.join('') : LAMBDA;
}
