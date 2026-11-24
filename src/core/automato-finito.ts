/**
 * Módulo 2 — Autômatos Finitos (AFD e AFN, com ou sem transições λ).
 *
 * Formalmente M = (Q, Σ, δ, q0, F):
 *   AFD: δ : Q × Σ → Q              (função parcial aceita: ausência = rejeição)
 *   AFN: δ : Q × (Σ ∪ {λ}) → P(Q)
 *
 * Algoritmos:
 *   - Simulação por conjuntos de estados (fecho-λ + movimento): funciona para
 *     AFD (conjunto sempre unitário) e AFN.
 *   - Busca em largura no grafo de configurações (estado, posição) para
 *     encontrar um caminho de aceitação testemunha (útil na exibição).
 *   - Construção de subconjuntos (AFN → AFD equivalente), usada nos testes para conferir o AFN.
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
  validarNomesEstados,
  validarSimbolo,
  type Veredito,
} from './comum.js';

export interface TransicaoAF {
  de: string;
  /** "" representa λ */
  simbolo: string;
  para: string;
}

export interface DefinicaoAF {
  tipo: 'AFD' | 'AFN';
  nome?: string;
  descricao?: string;
  alfabeto: string[];
  estados: string[];
  estadoInicial: string;
  estadosFinais: string[];
  transicoes: TransicaoAF[];
}

export interface PassoAF {
  /** número do passo (1 = primeiro símbolo lido) */
  indice: number;
  /** símbolo lido neste passo */
  simbolo: string;
  /** estados ativos antes de ler o símbolo */
  antes: string[];
  /** estados ativos depois (já com fecho-λ) */
  depois: string[];
  /** transições efetivamente disparadas */
  transicoes: TransicaoAF[];
}

export interface ExecucaoAF {
  cadeia: string;
  simbolos: string[];
  veredito: Veredito;
  motivo: string;
  /** Mensagem quando a cadeia contém símbolos fora de Σ. */
  erroEntrada?: string;
  /** Estados ativos iniciais (fecho-λ de q0). */
  iniciais: string[];
  passos: PassoAF[];
  /** Caminho testemunha (sequência de estados) – de aceitação, ou o mais longo possível. */
  caminho: string[];
  /** Transições do caminho testemunha (inclui movimentos λ). */
  caminhoTransicoes: TransicaoAF[];
  /** Operações elementares (consultas a δ) – análise empírica. */
  operacoes: number;
}

// ---------------------------------------------------------------------------
// Leitura / validação
// ---------------------------------------------------------------------------

/** Converte JSON (texto ou objeto) em definição validada. Lança ErroDefinicao. */
export function lerDefinicaoAF(entrada: string | unknown): { definicao: DefinicaoAF; avisos: string[] } {
  const bruto = typeof entrada === 'string' ? lerJSON(entrada) : entrada;
  const obj = exigirObjeto(bruto, 'A definição do autômato');
  const erros: string[] = [];
  const avisos: string[] = [];

  const tipoBruto = campo(obj, 'tipo', 'type');
  let tipoDeclarado: 'AFD' | 'AFN' | undefined;
  if (tipoBruto !== undefined) {
    const t = String(tipoBruto).toUpperCase();
    if (t === 'AFD' || t === 'DFA') tipoDeclarado = 'AFD';
    else if (t === 'AFN' || t === 'NFA' || t === 'AFN-Λ' || t === 'AFNλ' || t === 'AFN-LAMBDA') tipoDeclarado = 'AFN';
    else erros.push(`Campo "tipo" deve ser "AFD" ou "AFN", recebido ${JSON.stringify(tipoBruto)}.`);
  }

  let alfabeto = listaDeTextos(campo(obj, 'alfabeto', 'sigma', 'alphabet'), 'alfabeto', erros);
  alfabeto = semDuplicatas(alfabeto, 'alfabeto', avisos);
  alfabeto.forEach((s, i) => validarSimbolo(s, `alfabeto[${i}]`, erros));
  if (alfabeto.length === 0 && !erros.some((e) => e.includes('alfabeto'))) erros.push('O alfabeto Σ não pode ser vazio.');

  let estados = listaDeTextos(campo(obj, 'estados', 'states', 'Q'), 'estados', erros);
  estados = semDuplicatas(estados, 'estados', avisos);
  validarNomesEstados(estados, 'estados', erros);
  const conjEstados = new Set(estados);

  const inicialBruto = campo(obj, 'estadoInicial', 'inicial', 'initial', 'q0');
  let estadoInicial = '';
  if (typeof inicialBruto !== 'string' || inicialBruto.trim() === '') erros.push('Campo obrigatório ausente: estadoInicial.');
  else {
    estadoInicial = inicialBruto.trim();
    if (!conjEstados.has(estadoInicial)) erros.push(`Estado inicial "${estadoInicial}" não pertence ao conjunto de estados.`);
  }

  let finais = listaDeTextos(campo(obj, 'estadosFinais', 'finais', 'final', 'finals', 'F') ?? [], 'estadosFinais', erros);
  finais = semDuplicatas(finais, 'estadosFinais', avisos);
  finais.forEach((f) => {
    if (!conjEstados.has(f)) erros.push(`Estado final "${f}" não pertence ao conjunto de estados.`);
  });
  if (finais.length === 0) avisos.push('Nenhum estado final: o autômato não aceita nenhuma cadeia (L = ∅).');

  const transicoes = lerTransicoes(campo(obj, 'transicoes', 'transicao', 'delta', 'transitions'), erros);
  const conjAlfabeto = new Set(alfabeto);

  // valida cada transição
  const chaves = new Set<string>();
  const unicas: TransicaoAF[] = [];
  transicoes.forEach((t, i) => {
    const ctx = `transição ${i + 1} (${t.de} --${exibir(t.simbolo)}--> ${t.para})`;
    if (!conjEstados.has(t.de)) erros.push(`${ctx}: estado de origem "${t.de}" não existe.`);
    if (!conjEstados.has(t.para)) erros.push(`${ctx}: estado de destino "${t.para}" não existe.`);
    if (t.simbolo !== '' && !conjAlfabeto.has(t.simbolo)) erros.push(`${ctx}: símbolo "${t.simbolo}" não pertence a Σ.`);
    const k = `${t.de}\u0000${t.simbolo}\u0000${t.para}`;
    if (chaves.has(k)) avisos.push(`${ctx}: transição repetida ignorada.`);
    else {
      chaves.add(k);
      unicas.push(t);
    }
  });

  // determinismo
  const porOrigemSimbolo = new Map<string, string[]>();
  for (const t of unicas) {
    const k = `${t.de}\u0000${t.simbolo}`;
    const l = porOrigemSimbolo.get(k) ?? [];
    l.push(t.para);
    porOrigemSimbolo.set(k, l);
  }
  const temLambda = unicas.some((t) => t.simbolo === '');
  const conflitos = [...porOrigemSimbolo.entries()].filter(([k, l]) => l.length > 1 && !k.endsWith('\u0000'));
  const ehDeterministico = !temLambda && conflitos.length === 0;

  if (tipoDeclarado === 'AFD') {
    if (temLambda) erros.push('Um AFD não pode ter transições λ. Declare "tipo": "AFN".');
    for (const [k, l] of conflitos) {
      const [de, s] = k.split('\u0000');
      erros.push(`AFD não determinístico: δ(${de}, ${s}) tem ${l.length} destinos (${l.join(', ')}). Declare "tipo": "AFN".`);
    }
  }
  const tipo: 'AFD' | 'AFN' = tipoDeclarado ?? (ehDeterministico ? 'AFD' : 'AFN');

  if (erros.length) throw new ErroDefinicao(erros, avisos);

  // avisos semânticos
  if (tipo === 'AFD') {
    const faltando: string[] = [];
    for (const q of estados) for (const a of alfabeto) if (!porOrigemSimbolo.has(`${q}\u0000${a}`)) faltando.push(`δ(${q}, ${a})`);
    if (faltando.length) {
      avisos.push(
        `AFD parcial: ${faltando.length} transição(ões) indefinida(s) (${faltando.slice(0, 6).join(', ')}${faltando.length > 6 ? ', …' : ''}). ` +
          'Ler um símbolo sem transição leva à rejeição (estado de erro implícito).',
      );
    }
  }
  const alcancaveis = new Set<string>([estadoInicial]);
  const pilha = [estadoInicial];
  while (pilha.length) {
    const q = pilha.pop()!;
    for (const t of unicas) if (t.de === q && !alcancaveis.has(t.para)) {
      alcancaveis.add(t.para);
      pilha.push(t.para);
    }
  }
  const inalcancaveis = estados.filter((q) => !alcancaveis.has(q));
  if (inalcancaveis.length) avisos.push(`Estados inalcançáveis a partir de ${estadoInicial}: ${inalcancaveis.join(', ')}.`);
  if (finais.length && !finais.some((f) => alcancaveis.has(f))) avisos.push('Nenhum estado final é alcançável: L(M) = ∅.');

  const nome = campo(obj, 'nome', 'name');
  const descricao = campo(obj, 'descricao', 'description');
  return {
    definicao: {
      tipo,
      nome: typeof nome === 'string' ? nome : undefined,
      descricao: typeof descricao === 'string' ? descricao : undefined,
      alfabeto,
      estados,
      estadoInicial,
      estadosFinais: finais,
      transicoes: unicas,
    },
    avisos,
  };
}

/**
 * Aceita dois formatos:
 *  1) lista: [{ "de": "q0", "simbolo": "a", "para": "q1" }, ...]  ("para" pode ser lista)
 *  2) mapa:  { "q0": { "a": "q1", "λ": ["q2", "q3"] }, ... }
 */
function lerTransicoes(valor: unknown, erros: string[]): TransicaoAF[] {
  const out: TransicaoAF[] = [];
  if (valor === undefined || valor === null) {
    erros.push('Campo obrigatório ausente: transicoes.');
    return out;
  }
  const addDestinos = (de: string, simbolo: string, para: unknown, ctx: string) => {
    const lista = Array.isArray(para) ? para : [para];
    if (lista.length === 0) erros.push(`${ctx}: lista de destinos vazia.`);
    for (const p of lista) {
      if (typeof p !== 'string' || p.trim() === '') erros.push(`${ctx}: destino inválido ${JSON.stringify(p)}.`);
      else out.push({ de, simbolo, para: p.trim() });
    }
  };
  if (Array.isArray(valor)) {
    valor.forEach((t, i) => {
      const ctx = `transicoes[${i}]`;
      if (typeof t !== 'object' || t === null) {
        erros.push(`${ctx} deve ser um objeto { de, simbolo, para }.`);
        return;
      }
      const o = t as Record<string, unknown>;
      const de = campo(o, 'de', 'origem', 'from');
      const s = campo(o, 'simbolo', 'símbolo', 'le', 'symbol', 'read');
      const para = campo(o, 'para', 'destino', 'to');
      if (typeof de !== 'string' || de.trim() === '') erros.push(`${ctx}: campo "de" ausente ou inválido.`);
      if (typeof s !== 'string') erros.push(`${ctx}: campo "simbolo" ausente (use "λ" para transição vazia).`);
      if (para === undefined) erros.push(`${ctx}: campo "para" ausente.`);
      if (typeof de === 'string' && de.trim() !== '' && typeof s === 'string' && para !== undefined) {
        addDestinos(de.trim(), ehLambda(s) ? '' : s, para, ctx);
      }
    });
  } else if (typeof valor === 'object') {
    for (const [de, mapa] of Object.entries(valor as Record<string, unknown>)) {
      if (typeof mapa !== 'object' || mapa === null || Array.isArray(mapa)) {
        erros.push(`transicoes["${de}"] deve ser um objeto { símbolo: destino }.`);
        continue;
      }
      for (const [s, para] of Object.entries(mapa as Record<string, unknown>)) {
        addDestinos(de.trim(), ehLambda(s) ? '' : s, para, `transicoes["${de}"]["${s}"]`);
      }
    }
  } else {
    erros.push('Campo "transicoes" deve ser uma lista ou um objeto.');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Autômato
// ---------------------------------------------------------------------------

export class AutomatoFinito {
  readonly definicao: DefinicaoAF;
  readonly avisos: string[];
  private readonly finais: Set<string>;
  private readonly alfabeto: Set<string>;
  /** δ indexada: estado → símbolo ("" = λ) → transições */
  private readonly delta = new Map<string, Map<string, TransicaoAF[]>>();
  private readonly ordem: Map<string, number>;

  constructor(definicao: DefinicaoAF, avisos: string[] = []) {
    this.definicao = definicao;
    this.avisos = avisos;
    this.finais = new Set(definicao.estadosFinais);
    this.alfabeto = new Set(definicao.alfabeto);
    this.ordem = new Map(definicao.estados.map((q, i) => [q, i]));
    for (const t of definicao.transicoes) {
      let m = this.delta.get(t.de);
      if (!m) this.delta.set(t.de, (m = new Map()));
      const l = m.get(t.simbolo) ?? [];
      l.push(t);
      m.set(t.simbolo, l);
    }
  }

  /** Cria a partir de JSON (texto ou objeto já lido). Lança ErroDefinicao. */
  static deJSON(entrada: string | unknown): AutomatoFinito {
    const { definicao, avisos } = lerDefinicaoAF(entrada);
    return new AutomatoFinito(definicao, avisos);
  }

  get ehDeterministico(): boolean {
    for (const m of this.delta.values()) {
      if (m.has('')) return false;
      for (const l of m.values()) if (l.length > 1) return false;
    }
    return true;
  }

  ehFinal(q: string): boolean {
    return this.finais.has(q);
  }

  private ordenar(estados: Iterable<string>): string[] {
    return [...estados].sort((a, b) => (this.ordem.get(a) ?? 0) - (this.ordem.get(b) ?? 0));
  }

  /** Fecho-λ de um conjunto de estados (busca em profundidade). */
  fechoLambda(estados: Iterable<string>, cont?: Contador): Set<string> {
    const fecho = new Set(estados);
    const pilha = [...fecho];
    while (pilha.length) {
      const q = pilha.pop()!;
      cont?.inc();
      for (const t of this.delta.get(q)?.get('') ?? []) {
        if (!fecho.has(t.para)) {
          fecho.add(t.para);
          pilha.push(t.para);
        }
      }
    }
    return fecho;
  }

  /** Executa a cadeia e devolve o passo a passo completo. */
  executar(entrada: string): ExecucaoAF {
    const cadeia = normalizarCadeia(entrada);
    const simbolos = simbolosDe(cadeia);
    const cont = new Contador();
    const q0 = this.definicao.estadoInicial;

    const invalidos = simbolos.map((s, i) => ({ s, i })).filter(({ s }) => !this.alfabeto.has(s));
    if (invalidos.length) {
      const lista = invalidos.map(({ s, i }) => `"${s}" (posição ${i + 1})`).join(', ');
      return {
        cadeia,
        simbolos,
        veredito: 'REJEITADA',
        motivo: `A cadeia contém símbolo(s) fora de Σ = {${this.definicao.alfabeto.join(', ')}}: ${lista}.`,
        erroEntrada: `Símbolo(s) fora do alfabeto: ${lista}`,
        iniciais: [q0],
        passos: [],
        caminho: [q0],
        caminhoTransicoes: [],
        operacoes: 0,
      };
    }

    // ---- simulação por conjuntos ----
    let ativos = this.fechoLambda([q0], cont);
    const iniciais = this.ordenar(ativos);
    const passos: PassoAF[] = [];
    let morreuEm = -1;
    for (let i = 0; i < simbolos.length; i++) {
      const a = simbolos[i];
      const disparadas: TransicaoAF[] = [];
      const destino = new Set<string>();
      for (const q of ativos) {
        cont.inc();
        for (const t of this.delta.get(q)?.get(a) ?? []) {
          disparadas.push(t);
          destino.add(t.para);
        }
      }
      const depois = this.fechoLambda(destino, cont);
      for (const q of depois) if (!destino.has(q)) {
        // registra transições λ usadas no fecho (para destacar na interface)
        for (const origem of depois) for (const t of this.delta.get(origem)?.get('') ?? []) if (t.para === q) disparadas.push(t);
      }
      passos.push({ indice: i + 1, simbolo: a, antes: this.ordenar(ativos), depois: this.ordenar(depois), transicoes: disparadas });
      ativos = depois;
      if (ativos.size === 0) {
        morreuEm = i;
        break;
      }
    }

    const aceitou = [...ativos].some((q) => this.finais.has(q));
    const { caminho, transicoes: caminhoTransicoes } = this.caminhoTestemunha(simbolos, aceitou, cont);

    let motivo: string;
    if (aceitou) {
      const finaisAtivos = this.ordenar([...ativos].filter((q) => this.finais.has(q)));
      motivo =
        this.ehDeterministico
          ? `Cadeia consumida por completo terminando no estado final ${finaisAtivos[0]}.`
          : `Cadeia consumida; o conjunto de estados ativos {${this.ordenar(ativos).join(', ')}} contém estado(s) final(is) {${finaisAtivos.join(', ')}}.`;
    } else if (morreuEm >= 0) {
      const p = passos[morreuEm];
      motivo =
        p.antes.length === 1
          ? `δ(${p.antes[0]}, ${p.simbolo}) não está definida — o autômato trava ao ler o ${morreuEm + 1}º símbolo.`
          : `Nenhum dos estados {${p.antes.join(', ')}} tem transição com "${p.simbolo}" — todas as computações morrem no ${morreuEm + 1}º símbolo.`;
    } else {
      const fim = this.ordenar(ativos);
      motivo =
        fim.length === 1
          ? `Cadeia consumida, mas o estado ${fim[0]} não é final.`
          : `Cadeia consumida, mas nenhum dos estados ativos {${fim.join(', ')}} é final.`;
    }

    return {
      cadeia,
      simbolos,
      veredito: aceitou ? 'ACEITA' : 'REJEITADA',
      motivo,
      iniciais,
      passos,
      caminho,
      caminhoTransicoes,
      operacoes: cont.valor,
    };
  }

  /**
   * BFS no grafo de configurações (estado, posição). Se a cadeia foi aceita,
   * devolve um caminho de aceitação; senão, o caminho que mais avança na cadeia.
   */
  private caminhoTestemunha(simbolos: string[], aceitou: boolean, cont: Contador): { caminho: string[]; transicoes: TransicaoAF[] } {
    const n = simbolos.length;
    const q0 = this.definicao.estadoInicial;
    type No = { q: string; pos: number; pai: number; t: TransicaoAF | null };
    const nos: No[] = [{ q: q0, pos: 0, pai: -1, t: null }];
    const visitado = new Set<string>([`${q0}\u0000${0}`]);
    let alvo = -1;
    let melhor = 0;
    for (let k = 0; k < nos.length; k++) {
      const { q, pos } = nos[k];
      cont.inc();
      if (pos === n && aceitou && this.finais.has(q)) {
        alvo = k;
        break;
      }
      if (pos > nos[melhor].pos) melhor = k;
      const m = this.delta.get(q);
      if (!m) continue;
      const vizinhos: [TransicaoAF, number][] = [];
      for (const t of m.get('') ?? []) vizinhos.push([t, pos]);
      if (pos < n) for (const t of m.get(simbolos[pos]) ?? []) vizinhos.push([t, pos + 1]);
      for (const [t, p] of vizinhos) {
        const chave = `${t.para}\u0000${p}`;
        if (!visitado.has(chave)) {
          visitado.add(chave);
          nos.push({ q: t.para, pos: p, pai: k, t });
        }
      }
    }
    let k = alvo >= 0 ? alvo : melhor;
    const caminho: string[] = [];
    const transicoes: TransicaoAF[] = [];
    while (k >= 0) {
      caminho.push(nos[k].q);
      if (nos[k].t) transicoes.push(nos[k].t!);
      k = nos[k].pai;
    }
    return { caminho: caminho.reverse(), transicoes: transicoes.reverse() };
  }

  /** Atalho: a cadeia é aceita? */
  aceita(cadeia: string): boolean {
    return this.executar(cadeia).veredito === 'ACEITA';
  }

  /**
   * Construção de subconjuntos (Rabin–Scott): devolve um AFD COMPLETO equivalente.
   * Só gera os subconjuntos alcançáveis. O subconjunto vazio vira o estado "∅" (armadilha).
   */
  paraAFD(): AutomatoFinito {
    const nomeDe = (c: Set<string>) => (c.size === 0 ? '∅' : `{${this.ordenar(c).join(',')}}`);
    const inicial = this.fechoLambda([this.definicao.estadoInicial]);
    const fila: Set<string>[] = [inicial];
    const vistos = new Map<string, Set<string>>([[nomeDe(inicial), inicial]]);
    const transicoes: TransicaoAF[] = [];
    while (fila.length) {
      const S = fila.shift()!;
      const nomeS = nomeDe(S);
      for (const a of this.definicao.alfabeto) {
        const mov = new Set<string>();
        for (const q of S) for (const t of this.delta.get(q)?.get(a) ?? []) mov.add(t.para);
        const T = this.fechoLambda(mov);
        const nomeT = nomeDe(T);
        if (!vistos.has(nomeT)) {
          vistos.set(nomeT, T);
          fila.push(T);
        }
        transicoes.push({ de: nomeS, simbolo: a, para: nomeT });
      }
    }
    const estados = [...vistos.keys()];
    const finais = estados.filter((nome) => [...vistos.get(nome)!].some((q) => this.finais.has(q)));
    return new AutomatoFinito({
      tipo: 'AFD',
      nome: `AFD equivalente${this.definicao.nome ? ` a "${this.definicao.nome}"` : ''}`,
      descricao: 'Gerado pela construção de subconjuntos.',
      alfabeto: [...this.definicao.alfabeto],
      estados,
      estadoInicial: nomeDe(inicial),
      estadosFinais: finais,
      transicoes,
    });
  }
}

/** Formata uma transição: "q0 --a--> q1". */
export function formatarTransicaoAF(t: TransicaoAF): string {
  return `${t.de} --${t.simbolo === '' ? LAMBDA : t.simbolo}--> ${t.para}`;
}
