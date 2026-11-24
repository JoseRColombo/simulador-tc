/**
 * Módulo 4 — Autômato com Pilha (AP).
 *
 * M = (Q, Σ, Γ, δ, q0, Z0, F),   δ : Q × (Σ ∪ {λ}) × (Γ ∪ {λ}) → P(Q × Γ*)
 *
 * Uma transição  (q, a, X) → (p, γ)  significa: no estado q, lendo a (ou λ) com X
 * no topo (ou λ = não olha a pilha), DESEMPILHA X, EMPILHA γ (o 1º símbolo de γ
 * fica no topo) e vai para p.
 *
 * Simulação: busca em largura no espaço de configurações (estado, posição, pilha),
 * o que cobre também APs NÃO determinísticos. A pilha é uma lista encadeada
 * PERSISTENTE com hash-consing: empilhar/desempilhar custam O(1), ramos da
 * busca compartilham a mesma memória e configurações iguais são detectadas em O(1).
 *
 * Como um AP pode ter laços λ que empilham para sempre, a busca tem limites
 * (configurações e altura da pilha). Se um limite cortar a busca sem achar
 * aceitação, o veredito é INDETERMINADA — nunca um falso "REJEITADA".
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

export interface TransicaoAP {
  de: string;
  /** símbolo lido; "" = λ */
  le: string;
  /** símbolo desempilhado; "" = λ (não consulta a pilha) */
  desempilha: string;
  /** símbolos empilhados, o 1º fica no topo; [] = λ */
  empilha: string[];
  para: string;
}

export type ModoAceitacao = 'estadoFinal' | 'pilhaVazia';

export interface DefinicaoAP {
  nome?: string;
  descricao?: string;
  estados: string[];
  alfabetoEntrada: string[];
  alfabetoPilha: string[];
  estadoInicial: string;
  /** símbolo inicial da pilha (Z0); se ausente, a pilha começa vazia */
  simboloInicialPilha?: string;
  estadosFinais: string[];
  aceitacao: ModoAceitacao;
  transicoes: TransicaoAP[];
}

export interface PassoAP {
  indice: number;
  estado: string;
  /** símbolo lido para chegar aqui (λ se nenhum) — vazio no passo 0 */
  leitura: string;
  /** posição da cabeça de leitura (quantos símbolos já foram lidos) */
  posicao: number;
  restante: string;
  /** conteúdo da pilha, topo primeiro */
  pilha: string[];
  transicao?: TransicaoAP;
  /** descrição da operação de pilha ("empilha AZ", "desempilha A", …) */
  operacao: string;
}

export interface OpcoesAP {
  maxConfiguracoes?: number;
  maxAlturaPilha?: number;
}

export interface ExecucaoAP {
  cadeia: string;
  veredito: Veredito;
  motivo: string;
  erroEntrada?: string;
  /** caminho de aceitação, ou o caminho que mais avançou na entrada */
  passos: PassoAP[];
  configuracoesExploradas: number;
  deterministico: boolean;
  operacoes: number;
}

// ---------------------------------------------------------------------------
// Leitura / validação
// ---------------------------------------------------------------------------

function lerPilhaTexto(v: unknown, ctx: string, erros: string[]): string[] {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) {
    const out: string[] = [];
    for (const s of v) {
      if (typeof s !== 'string') erros.push(`${ctx}: símbolo inválido ${JSON.stringify(s)}.`);
      else if (!ehLambda(s)) out.push(s);
    }
    return out;
  }
  if (typeof v !== 'string') {
    erros.push(`${ctx}: deve ser texto (ex.: "AZ") ou lista.`);
    return [];
  }
  return ehLambda(v) ? [] : simbolosDe(v.replace(/\s+/g, ''));
}

export function lerDefinicaoAP(entrada: string | unknown): { definicao: DefinicaoAP; avisos: string[] } {
  const obj = exigirObjeto(typeof entrada === 'string' ? lerJSON(entrada) : entrada, 'A definição do AP');
  const erros: string[] = [];
  const avisos: string[] = [];

  const estados = semDuplicatas(listaDeTextos(campo(obj, 'estados', 'states', 'Q'), 'estados', erros), 'estados', avisos);
  validarNomesEstados(estados, 'estados', erros);
  const Q = new Set(estados);
  const sigma = semDuplicatas(listaDeTextos(campo(obj, 'alfabetoEntrada', 'alfabeto', 'sigma', 'Σ'), 'alfabetoEntrada', erros), 'alfabetoEntrada', avisos);
  sigma.forEach((s, i) => validarSimbolo(s, `alfabetoEntrada[${i}]`, erros));
  const gama = semDuplicatas(listaDeTextos(campo(obj, 'alfabetoPilha', 'gama', 'Γ'), 'alfabetoPilha', erros), 'alfabetoPilha', avisos);
  gama.forEach((s, i) => validarSimbolo(s, `alfabetoPilha[${i}]`, erros));
  const S = new Set(sigma);
  const G = new Set(gama);

  const ini = campo(obj, 'estadoInicial', 'inicial', 'q0');
  const estadoInicial = typeof ini === 'string' ? ini.trim() : '';
  if (!estadoInicial) erros.push('Campo obrigatório ausente: estadoInicial.');
  else if (!Q.has(estadoInicial)) erros.push(`Estado inicial "${estadoInicial}" não pertence ao conjunto de estados.`);

  const z0b = campo(obj, 'simboloInicialPilha', 'Z0', 'z0', 'inicialPilha');
  let simboloInicialPilha: string | undefined;
  if (z0b !== undefined && z0b !== null && !(typeof z0b === 'string' && ehLambda(z0b))) {
    if (typeof z0b !== 'string' || !validarSimbolo(z0b, 'simboloInicialPilha', erros)) {
      /* erro já registrado */
    } else if (!G.has(z0b)) erros.push(`O símbolo inicial da pilha "${z0b}" não pertence a Γ.`);
    else simboloInicialPilha = z0b;
  }

  const finais = semDuplicatas(listaDeTextos(campo(obj, 'estadosFinais', 'finais', 'F') ?? [], 'estadosFinais', erros), 'estadosFinais', avisos);
  finais.forEach((f) => !Q.has(f) && erros.push(`Estado final "${f}" não pertence ao conjunto de estados.`));

  const ac = campo(obj, 'aceitacao', 'aceitação', 'criterio');
  let aceitacao: ModoAceitacao = 'estadoFinal';
  if (ac !== undefined) {
    const a = String(ac).toLowerCase().replace(/[\s_-]/g, '');
    if (a === 'estadofinal' || a === 'final') aceitacao = 'estadoFinal';
    else if (a === 'pilhavazia' || a === 'vazia') aceitacao = 'pilhaVazia';
    else erros.push(`"aceitacao" deve ser "estadoFinal" ou "pilhaVazia", recebido ${JSON.stringify(ac)}.`);
  }
  if (aceitacao === 'estadoFinal' && finais.length === 0) avisos.push('Aceitação por estado final, mas não há estados finais: L(M) = ∅.');

  const tb = campo(obj, 'transicoes', 'delta', 'transitions');
  const transicoes: TransicaoAP[] = [];
  if (!Array.isArray(tb)) erros.push('Campo "transicoes" deve ser uma lista de objetos { de, le, desempilha, empilha, para }.');
  else {
    tb.forEach((t, i) => {
      const ctx = `transicoes[${i}]`;
      if (typeof t !== 'object' || t === null) return void erros.push(`${ctx} deve ser um objeto.`);
      const o = t as Record<string, unknown>;
      const de = campo(o, 'de', 'origem', 'from');
      const para = campo(o, 'para', 'destino', 'to');
      const le = campo(o, 'le', 'lê', 'simbolo', 'entrada', 'read');
      const desemp = campo(o, 'desempilha', 'topo', 'pop');
      const emp = campo(o, 'empilha', 'push');
      if (typeof de !== 'string' || !Q.has(de.trim())) return void erros.push(`${ctx}: estado de origem ${JSON.stringify(de)} inexistente.`);
      if (typeof para !== 'string' || !Q.has(para.trim())) return void erros.push(`${ctx}: estado de destino ${JSON.stringify(para)} inexistente.`);
      if (le !== undefined && typeof le !== 'string') return void erros.push(`${ctx}: "le" deve ser texto (use "λ").`);
      if (desemp !== undefined && typeof desemp !== 'string') return void erros.push(`${ctx}: "desempilha" deve ser texto (use "λ").`);
      const leS = le === undefined || ehLambda(le as string) ? '' : (le as string).trim();
      const dS = desemp === undefined || ehLambda(desemp as string) ? '' : (desemp as string).trim();
      if (leS && !S.has(leS)) erros.push(`${ctx}: símbolo de entrada "${leS}" não pertence a Σ.`);
      if (dS && !G.has(dS)) erros.push(`${ctx}: símbolo desempilhado "${dS}" não pertence a Γ.`);
      const empilha = lerPilhaTexto(emp, `${ctx}.empilha`, erros);
      for (const x of empilha) if (!G.has(x)) erros.push(`${ctx}: símbolo empilhado "${x}" não pertence a Γ.`);
      transicoes.push({ de: de.trim(), le: leS, desempilha: dS, empilha, para: para.trim() });
    });
  }
  if (erros.length) throw new ErroDefinicao(erros, avisos);

  // duplicatas
  const vistos = new Set<string>();
  const unicas = transicoes.filter((t) => {
    const k = formatarTransicaoAP(t);
    if (vistos.has(k)) {
      avisos.push(`Transição repetida ignorada: ${k}.`);
      return false;
    }
    vistos.add(k);
    return true;
  });

  const nome = campo(obj, 'nome', 'name');
  const descricao = campo(obj, 'descricao', 'description');
  return {
    definicao: {
      nome: typeof nome === 'string' ? nome : undefined,
      descricao: typeof descricao === 'string' ? descricao : undefined,
      estados,
      alfabetoEntrada: sigma,
      alfabetoPilha: gama,
      estadoInicial,
      simboloInicialPilha,
      estadosFinais: finais,
      aceitacao,
      transicoes: unicas,
    },
    avisos,
  };
}

export function formatarTransicaoAP(t: TransicaoAP): string {
  return `δ(${t.de}, ${t.le || LAMBDA}, ${t.desempilha || LAMBDA}) = (${t.para}, ${t.empilha.length ? t.empilha.join('') : LAMBDA})`;
}

/** Rótulo curto para arestas do diagrama: "a, Z / AZ". */
export function rotuloTransicaoAP(t: TransicaoAP): string {
  return `${t.le || LAMBDA}, ${t.desempilha || LAMBDA} / ${t.empilha.length ? t.empilha.join('') : LAMBDA}`;
}

// ---------------------------------------------------------------------------
// Pilha persistente com hash-consing
// ---------------------------------------------------------------------------

interface NoPilha {
  readonly topo: string;
  readonly resto: NoPilha | null;
  readonly id: number;
  readonly altura: number;
}

class FabricaPilha {
  private readonly tabela = new Map<string, NoPilha>();
  private proximo = 1; // id 0 = pilha vazia
  empilhar(simbolo: string, resto: NoPilha | null): NoPilha {
    const k = `${simbolo}\u0000${resto ? resto.id : 0}`;
    let no = this.tabela.get(k);
    if (!no) {
      no = { topo: simbolo, resto, id: this.proximo++, altura: (resto?.altura ?? 0) + 1 };
      this.tabela.set(k, no);
    }
    return no;
  }
}

function pilhaParaLista(p: NoPilha | null): string[] {
  const out: string[] = [];
  for (let n = p; n; n = n.resto) out.push(n.topo);
  return out;
}

// ---------------------------------------------------------------------------
// Autômato com pilha
// ---------------------------------------------------------------------------

export class AutomatoPilha {
  readonly definicao: DefinicaoAP;
  readonly avisos: string[];
  private readonly porEstado = new Map<string, TransicaoAP[]>();
  private readonly finais: Set<string>;
  private readonly sigma: Set<string>;

  constructor(definicao: DefinicaoAP, avisos: string[] = []) {
    this.definicao = definicao;
    this.avisos = avisos;
    this.finais = new Set(definicao.estadosFinais);
    this.sigma = new Set(definicao.alfabetoEntrada);
    for (const t of definicao.transicoes) {
      const l = this.porEstado.get(t.de) ?? [];
      l.push(t);
      this.porEstado.set(t.de, l);
    }
  }

  static deJSON(entrada: string | unknown): AutomatoPilha {
    const { definicao, avisos } = lerDefinicaoAP(entrada);
    return new AutomatoPilha(definicao, avisos);
  }

  /**
   * AP determinístico (APD): para todo (q, a, X) no máximo uma transição aplicável,
   * considerando que "λ" na leitura ou no topo pode conflitar com símbolos concretos.
   */
  get ehDeterministico(): boolean {
    return this.conflitosDeterminismo().length === 0;
  }

  conflitosDeterminismo(): string[] {
    const out: string[] = [];
    for (const lista of this.porEstado.values()) {
      for (let i = 0; i < lista.length; i++) {
        for (let j = i + 1; j < lista.length; j++) {
          const a = lista[i], b = lista[j];
          const leConflita = a.le === '' || b.le === '' || a.le === b.le;
          const topoConflita = a.desempilha === '' || b.desempilha === '' || a.desempilha === b.desempilha;
          if (leConflita && topoConflita) out.push(`${formatarTransicaoAP(a)} × ${formatarTransicaoAP(b)}`);
        }
      }
    }
    return out;
  }

  executar(entrada: string, opcoes: OpcoesAP = {}): ExecucaoAP {
    const cadeia = normalizarCadeia(entrada);
    const w = simbolosDe(cadeia);
    const n = w.length;
    const deterministico = this.ehDeterministico;
    const cont = new Contador();
    const invalidos = w.map((s, i) => ({ s, i })).filter(({ s }) => !this.sigma.has(s));
    const fab = new FabricaPilha();
    const pilha0 = this.definicao.simboloInicialPilha ? fab.empilhar(this.definicao.simboloInicialPilha, null) : null;

    if (invalidos.length) {
      const lista = invalidos.map(({ s, i }) => `"${s}" (posição ${i + 1})`).join(', ');
      return {
        cadeia,
        veredito: 'REJEITADA',
        motivo: `A cadeia contém símbolo(s) fora de Σ = {${this.definicao.alfabetoEntrada.join(', ')}}: ${lista}.`,
        erroEntrada: `Símbolo(s) fora do alfabeto: ${lista}`,
        passos: [{ indice: 0, estado: this.definicao.estadoInicial, leitura: '', posicao: 0, restante: exibir(cadeia), pilha: pilhaParaLista(pilha0), operacao: 'configuração inicial' }],
        configuracoesExploradas: 0,
        deterministico,
        operacoes: 0,
      };
    }

    const maxConf = opcoes.maxConfiguracoes ?? 200_000;
    const maxAltura = opcoes.maxAlturaPilha ?? Math.max(64, 8 * (n + 1));

    interface Config {
      q: string;
      pos: number;
      pilha: NoPilha | null;
      pai: number;
      t: TransicaoAP | null;
    }
    const confs: Config[] = [{ q: this.definicao.estadoInicial, pos: 0, pilha: pilha0, pai: -1, t: null }];
    const visitado = new Set<string>([`${confs[0].q}\u0000${0}\u0000${pilha0?.id ?? 0}`]);
    let aceita = -1;
    let melhor = 0;
    let podado = false;
    let estourou = false;

    for (let k = 0; k < confs.length; k++) {
      const c = confs[k];
      cont.inc();
      if (c.pos === n && (this.definicao.aceitacao === 'estadoFinal' ? this.finais.has(c.q) : c.pilha === null)) {
        aceita = k;
        break;
      }
      // a "melhor" falha é a configuração mais profunda entre as que mais avançaram na entrada
      if (c.pos >= confs[melhor].pos) melhor = k;
      for (const t of this.porEstado.get(c.q) ?? []) {
        cont.inc();
        if (t.le !== '' && (c.pos >= n || w[c.pos] !== t.le)) continue;
        if (t.desempilha !== '' && (c.pilha === null || c.pilha.topo !== t.desempilha)) continue;
        let p = t.desempilha !== '' ? c.pilha!.resto : c.pilha;
        for (let i = t.empilha.length - 1; i >= 0; i--) p = fab.empilhar(t.empilha[i], p);
        if ((p?.altura ?? 0) > maxAltura) {
          podado = true;
          continue;
        }
        const pos = t.le !== '' ? c.pos + 1 : c.pos;
        const chave = `${t.para}\u0000${pos}\u0000${p?.id ?? 0}`;
        if (visitado.has(chave)) continue;
        if (confs.length >= maxConf) {
          estourou = true;
          break;
        }
        visitado.add(chave);
        confs.push({ q: t.para, pos, pilha: p, pai: k, t });
      }
      if (estourou) break;
    }

    // reconstrói o caminho
    let k = aceita >= 0 ? aceita : melhor;
    const cadeiaConfs: Config[] = [];
    while (k >= 0) {
      cadeiaConfs.push(confs[k]);
      k = confs[k].pai;
    }
    cadeiaConfs.reverse();
    const passos: PassoAP[] = cadeiaConfs.map((c, i) => ({
      indice: i,
      estado: c.q,
      leitura: c.t ? c.t.le || LAMBDA : '',
      posicao: c.pos,
      restante: exibir(w.slice(c.pos).join('')),
      pilha: pilhaParaLista(c.pilha),
      transicao: c.t ?? undefined,
      operacao: c.t ? descreverOperacao(c.t) : 'configuração inicial',
    }));

    let veredito: Veredito;
    let motivo: string;
    const crit = this.definicao.aceitacao === 'estadoFinal' ? 'estado final' : 'pilha vazia';
    if (aceita >= 0) {
      veredito = 'ACEITA';
      const fim = passos[passos.length - 1];
      motivo =
        this.definicao.aceitacao === 'estadoFinal'
          ? `Entrada consumida e o AP está no estado final ${fim.estado} (aceitação por estado final).`
          : 'Entrada consumida com a pilha vazia (aceitação por pilha vazia).';
    } else if (podado || estourou) {
      veredito = 'INDETERMINADA';
      motivo = estourou
        ? `Limite de ${maxConf} configurações atingido sem encontrar aceitação. O AP pode ter laços λ — aumente o limite para continuar.`
        : `Algumas computações ultrapassaram a altura máxima de pilha (${maxAltura}) e foram cortadas; nenhuma das restantes aceitou. Não é possível afirmar rejeição.`;
    } else {
      veredito = 'REJEITADA';
      const ult = cadeiaConfs[cadeiaConfs.length - 1];
      const topo = ult.pilha ? ult.pilha.topo : LAMBDA;
      if (deterministico) {
        motivo =
          ult.pos < n
            ? `Nenhuma transição para (${ult.q}, "${w[ult.pos]}", topo ${topo}) — o AP trava após ler ${ult.pos} de ${n} símbolo(s).`
            : `A entrada foi consumida, mas o AP parou em ${ult.q} ${this.definicao.aceitacao === 'estadoFinal' ? '(não é final)' : `com a pilha não vazia (topo ${topo})`}.`;
      } else {
        motivo = `Todas as ${confs.length} configurações alcançáveis foram exploradas e nenhuma satisfaz o critério de aceitação (${crit}). Mostrando a computação que mais avançou.`;
      }
    }

    return { cadeia, veredito, motivo, passos, configuracoesExploradas: confs.length, deterministico, operacoes: cont.valor };
  }

  aceita(cadeia: string, opcoes?: OpcoesAP): boolean {
    return this.executar(cadeia, opcoes).veredito === 'ACEITA';
  }
}

function descreverOperacao(t: TransicaoAP): string {
  const partes: string[] = [];
  if (t.desempilha) partes.push(`desempilha ${t.desempilha}`);
  if (t.empilha.length) partes.push(`empilha ${t.empilha.join('')}`);
  if (partes.length === 0) partes.push('pilha inalterada');
  return partes.join(', ');
}
