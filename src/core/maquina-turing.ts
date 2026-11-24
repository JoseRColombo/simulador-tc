/**
 * Módulo 5 — Máquina de Turing (determinística, fita infinita nos dois sentidos).
 *
 * M = (Q, Σ, Γ, δ, q0, □, q_aceita, q_rejeita),  δ : Q × Γ → Q × Γ × {L, R, S}
 *
 * - A máquina para ao entrar em q_aceita (ACEITA) ou q_rejeita (REJEITADA), ou
 *   quando não há transição definida para (estado, símbolo) — rejeição implícita.
 * - Como o problema da parada é indecidível, a simulação tem um limite de
 *   passos; se ele for atingido o veredito é INDETERMINADA (possível laço).
 * - Para máquinas transdutoras (ex.: soma unária) a SAÍDA é o conteúdo final da fita.
 */
import {
  campo,
  ehLambda,
  ErroDefinicao,
  exibir,
  exigirObjeto,
  lerJSON,
  listaDeTextos,
  normalizarCadeia,
  semDuplicatas,
  simbolosDe,
  validarNomesEstados,
  validarSimbolo,
  type Veredito,
} from './comum.js';

export type Movimento = 'L' | 'R' | 'S';

export interface TransicaoMT {
  de: string;
  le: string;
  escreve: string;
  move: Movimento;
  para: string;
}

export interface DefinicaoMT {
  nome?: string;
  descricao?: string;
  /** "reconhecedor" (aceita/rejeita) ou "transdutor" (calcula uma saída na fita) */
  modo: 'reconhecedor' | 'transdutor';
  estados: string[];
  alfabetoEntrada: string[];
  alfabetoFita: string[];
  branco: string;
  estadoInicial: string;
  estadoAceita: string;
  estadoRejeita?: string;
  transicoes: TransicaoMT[];
}

export interface PassoMT {
  indice: number;
  estado: string;
  /** posição absoluta da cabeça */
  cabeca: number;
  /** conteúdo da fita no trecho [inicio, inicio + fita.length) */
  fita: string[];
  inicio: number;
  /** transição que será aplicada a partir desta configuração (undefined = parou) */
  transicao?: TransicaoMT;
}

export interface ExecucaoMT {
  cadeia: string;
  veredito: Veredito;
  motivo: string;
  erroEntrada?: string;
  passos: PassoMT[];
  numeroPassos: number;
  /** conteúdo final da fita sem os brancos das bordas */
  saida: string;
  atingiuLimite: boolean;
}

const MOV: Record<string, Movimento> = {
  L: 'L', E: 'L', '<': 'L', '←': 'L', '-1': 'L', ESQ: 'L', ESQUERDA: 'L', LEFT: 'L',
  R: 'R', D: 'R', '>': 'R', '→': 'R', '+1': 'R', '1': 'R', DIR: 'R', DIREITA: 'R', RIGHT: 'R',
  S: 'S', P: 'S', N: 'S', '-': 'S', '0': 'S', PARADO: 'S', FICA: 'S', STAY: 'S',
};

export function lerDefinicaoMT(entrada: string | unknown): { definicao: DefinicaoMT; avisos: string[] } {
  const obj = exigirObjeto(typeof entrada === 'string' ? lerJSON(entrada) : entrada, 'A definição da Máquina de Turing');
  const erros: string[] = [];
  const avisos: string[] = [];

  const estados = semDuplicatas(listaDeTextos(campo(obj, 'estados', 'states', 'Q'), 'estados', erros), 'estados', avisos);
  validarNomesEstados(estados, 'estados', erros);
  const Q = new Set(estados);

  const brancoB = campo(obj, 'branco', 'blank', 'simboloBranco');
  const branco = typeof brancoB === 'string' && brancoB !== '' ? brancoB : '_';
  if (Array.from(branco).length !== 1) erros.push(`O símbolo branco deve ter 1 caractere (recebido "${branco}").`);

  const sigma = semDuplicatas(listaDeTextos(campo(obj, 'alfabetoEntrada', 'alfabeto', 'sigma', 'Σ'), 'alfabetoEntrada', erros), 'alfabetoEntrada', avisos);
  sigma.forEach((s, i) => validarSimbolo(s, `alfabetoEntrada[${i}]`, erros));
  if (sigma.includes(branco)) erros.push(`O branco "${branco}" não pode pertencer ao alfabeto de entrada Σ.`);

  let gama = semDuplicatas(listaDeTextos(campo(obj, 'alfabetoFita', 'gama', 'Γ') ?? [], 'alfabetoFita', erros), 'alfabetoFita', avisos);
  gama.forEach((s, i) => validarSimbolo(s, `alfabetoFita[${i}]`, erros));
  const faltaEmGama = sigma.filter((s) => !gama.includes(s));
  if (faltaEmGama.length) {
    avisos.push(`Σ ⊆ Γ: símbolos de entrada adicionados ao alfabeto da fita (${faltaEmGama.join(', ')}).`);
    gama = [...gama, ...faltaEmGama];
  }
  if (!gama.includes(branco)) gama = [...gama, branco];
  const G = new Set(gama);

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const estadoInicial = str(campo(obj, 'estadoInicial', 'inicial', 'q0'));
  const estadoAceita = str(campo(obj, 'estadoAceita', 'aceita', 'estadoAceitacao', 'qAceita', 'accept'));
  const rej = str(campo(obj, 'estadoRejeita', 'rejeita', 'estadoRejeicao', 'qRejeita', 'reject'));
  const estadoRejeita = rej || undefined;
  if (!estadoInicial) erros.push('Campo obrigatório ausente: estadoInicial.');
  else if (!Q.has(estadoInicial)) erros.push(`Estado inicial "${estadoInicial}" não pertence ao conjunto de estados.`);
  if (!estadoAceita) erros.push('Campo obrigatório ausente: estadoAceita.');
  else if (!Q.has(estadoAceita)) erros.push(`Estado de aceitação "${estadoAceita}" não pertence ao conjunto de estados.`);
  if (estadoRejeita && !Q.has(estadoRejeita)) erros.push(`Estado de rejeição "${estadoRejeita}" não pertence ao conjunto de estados.`);
  if (estadoRejeita && estadoRejeita === estadoAceita) erros.push('Os estados de aceitação e de rejeição devem ser diferentes.');

  const modoB = campo(obj, 'modo', 'tipo');
  const modo: 'reconhecedor' | 'transdutor' = typeof modoB === 'string' && /transd|calc|fun/i.test(modoB) ? 'transdutor' : 'reconhecedor';

  const tb = campo(obj, 'transicoes', 'delta', 'transitions');
  const transicoes: TransicaoMT[] = [];
  const chaves = new Map<string, number>();
  if (!Array.isArray(tb)) erros.push('Campo "transicoes" deve ser uma lista de objetos { de, le, escreve, move, para }.');
  else {
    tb.forEach((t, i) => {
      const ctx = `transicoes[${i}]`;
      if (typeof t !== 'object' || t === null) return void erros.push(`${ctx} deve ser um objeto.`);
      const o = t as Record<string, unknown>;
      const de = str(campo(o, 'de', 'origem', 'from'));
      const para = str(campo(o, 'para', 'destino', 'to'));
      const leB = campo(o, 'le', 'lê', 'leitura', 'read');
      const esB = campo(o, 'escreve', 'escrita', 'write');
      const mvB = campo(o, 'move', 'movimento', 'direcao', 'direção', 'move');
      const sim = (v: unknown, nomeCampo: string): string | null => {
        if (typeof v !== 'string' || v === '') {
          erros.push(`${ctx}: campo "${nomeCampo}" ausente.`);
          return null;
        }
        const s = ehLambda(v) || v === '□' || v === '␣' || v === ' ' ? branco : v;
        if (!G.has(s)) {
          erros.push(`${ctx}: símbolo "${s}" em "${nomeCampo}" não pertence a Γ = {${gama.join(', ')}}.`);
          return null;
        }
        return s;
      };
      if (!Q.has(de)) return void erros.push(`${ctx}: estado de origem ${JSON.stringify(de)} inexistente.`);
      if (!Q.has(para)) return void erros.push(`${ctx}: estado de destino ${JSON.stringify(para)} inexistente.`);
      const le = sim(leB, 'le');
      const escreve = esB === undefined ? le : sim(esB, 'escreve');
      const move = typeof mvB === 'string' ? MOV[mvB.trim().toUpperCase()] : typeof mvB === 'number' ? MOV[String(mvB)] : undefined;
      if (!move) erros.push(`${ctx}: movimento ${JSON.stringify(mvB)} inválido (use "L", "R" ou "S").`);
      if (le === null || escreve === null || !move) return;
      const k = `${de}\u0000${le}`;
      if (chaves.has(k)) {
        const j = chaves.get(k)!;
        const a = transicoes[j];
        if (a.escreve === escreve && a.move === move && a.para === para) avisos.push(`${ctx}: transição repetida ignorada.`);
        else erros.push(`${ctx}: máquina não determinística — δ(${de}, ${le}) já foi definida em transicoes[${j}].`);
        return;
      }
      if (de === estadoAceita || de === estadoRejeita) avisos.push(`${ctx}: transição saindo de estado de parada (${de}) nunca é usada.`);
      chaves.set(k, transicoes.length);
      transicoes.push({ de, le, escreve, move, para });
    });
  }
  if (erros.length) throw new ErroDefinicao(erros, avisos);

  const nome = campo(obj, 'nome', 'name');
  const descricao = campo(obj, 'descricao', 'description');
  return {
    definicao: {
      nome: typeof nome === 'string' ? nome : undefined,
      descricao: typeof descricao === 'string' ? descricao : undefined,
      modo,
      estados,
      alfabetoEntrada: sigma,
      alfabetoFita: gama,
      branco,
      estadoInicial,
      estadoAceita,
      estadoRejeita,
      transicoes,
    },
    avisos,
  };
}

export function formatarTransicaoMT(t: TransicaoMT): string {
  return `δ(${t.de}, ${t.le}) = (${t.para}, ${t.escreve}, ${t.move})`;
}

/** Rótulo curto para arestas: "0 → x, R". */
export function rotuloTransicaoMT(t: TransicaoMT): string {
  return `${t.le} → ${t.escreve}, ${t.move}`;
}

/** Fita infinita nos dois sentidos, implementada com dois vetores (índices ≥ 0 e < 0). */
class Fita {
  private dir: string[] = [];
  private esq: string[] = [];
  min = 0;
  max = -1;
  constructor(private readonly branco: string) {}
  ler(i: number): string {
    return (i >= 0 ? this.dir[i] : this.esq[-i - 1]) ?? this.branco;
  }
  escrever(i: number, s: string): void {
    if (i >= 0) this.dir[i] = s;
    else this.esq[-i - 1] = s;
    if (i < this.min) this.min = i;
    if (i > this.max) this.max = i;
  }
  trecho(a: number, b: number): string[] {
    const out: string[] = [];
    for (let i = a; i <= b; i++) out.push(this.ler(i));
    return out;
  }
}

export class MaquinaTuring {
  readonly definicao: DefinicaoMT;
  readonly avisos: string[];
  private readonly delta = new Map<string, TransicaoMT>();
  private readonly sigma: Set<string>;

  constructor(definicao: DefinicaoMT, avisos: string[] = []) {
    this.definicao = definicao;
    this.avisos = avisos;
    this.sigma = new Set(definicao.alfabetoEntrada);
    for (const t of definicao.transicoes) this.delta.set(`${t.de}\u0000${t.le}`, t);
  }

  static deJSON(entrada: string | unknown): MaquinaTuring {
    const { definicao, avisos } = lerDefinicaoMT(entrada);
    return new MaquinaTuring(definicao, avisos);
  }

  /**
   * Executa a máquina.
   * @param maxPassos limite de passos (proteção contra laço infinito)
   * @param guardarPassos se falso, não guarda o histórico (mais rápido para medições)
   */
  executar(entrada: string, maxPassos = 10_000, guardarPassos = true): ExecucaoMT {
    const def = this.definicao;
    const cadeia = normalizarCadeia(entrada);
    const w = simbolosDe(cadeia);
    const fita = new Fita(def.branco);
    w.forEach((s, i) => fita.escrever(i, s));

    const invalidos = w.map((s, i) => ({ s, i })).filter(({ s }) => !this.sigma.has(s));
    if (invalidos.length) {
      const lista = invalidos.map(({ s, i }) => `"${s}" (posição ${i + 1})`).join(', ');
      return {
        cadeia,
        veredito: 'REJEITADA',
        motivo: `A entrada contém símbolo(s) fora de Σ = {${def.alfabetoEntrada.join(', ')}}: ${lista}.`,
        erroEntrada: `Símbolo(s) fora do alfabeto: ${lista}`,
        passos: [{ indice: 0, estado: def.estadoInicial, cabeca: 0, fita: w.length ? w : [def.branco], inicio: 0 }],
        numeroPassos: 0,
        saida: cadeia,
        atingiuLimite: false,
      };
    }

    let q = def.estadoInicial;
    let cabeca = 0;
    let n = 0;
    const passos: PassoMT[] = [];
    const foto = (t?: TransicaoMT): PassoMT => {
      const a = Math.min(fita.min, cabeca);
      const b = Math.max(fita.max, cabeca);
      return { indice: n, estado: q, cabeca, fita: fita.trecho(a, b), inicio: a, transicao: t };
    };

    let veredito: Veredito;
    let motivo: string;
    let atingiuLimite = false;
    while (true) {
      if (q === def.estadoAceita) {
        veredito = 'ACEITA';
        motivo = `A máquina parou no estado de aceitação ${q} após ${n} passo(s).`;
        if (guardarPassos) passos.push(foto());
        break;
      }
      if (q === def.estadoRejeita) {
        veredito = 'REJEITADA';
        motivo = `A máquina parou no estado de rejeição ${q} após ${n} passo(s).`;
        if (guardarPassos) passos.push(foto());
        break;
      }
      const s = fita.ler(cabeca);
      const t = this.delta.get(`${q}\u0000${s}`);
      if (!t) {
        veredito = 'REJEITADA';
        motivo = `Não há transição para δ(${q}, ${s}) — a máquina para em um estado não final (rejeição implícita) após ${n} passo(s).`;
        if (guardarPassos) passos.push(foto());
        break;
      }
      if (n >= maxPassos) {
        veredito = 'INDETERMINADA';
        atingiuLimite = true;
        motivo = `A máquina não parou em ${maxPassos} passos. Pode estar em laço infinito (o problema da parada é indecidível) — aumente o limite se a entrada for grande.`;
        if (guardarPassos) passos.push(foto());
        break;
      }
      if (guardarPassos) passos.push(foto(t));
      fita.escrever(cabeca, t.escreve);
      cabeca += t.move === 'L' ? -1 : t.move === 'R' ? 1 : 0;
      q = t.para;
      n++;
    }

    const conteudo = fita.trecho(fita.min, fita.max);
    let ini = 0;
    let fim = conteudo.length - 1;
    while (ini <= fim && conteudo[ini] === def.branco) ini++;
    while (fim >= ini && conteudo[fim] === def.branco) fim--;
    const saida = conteudo.slice(ini, fim + 1).join('');
    return { cadeia, veredito, motivo, passos, numeroPassos: n, saida, atingiuLimite };
  }

  aceita(cadeia: string, maxPassos?: number): boolean {
    return this.executar(cadeia, maxPassos, false).veredito === 'ACEITA';
  }
}

/** Interpreta a entrada da soma unária: "000100" → [3, 2]. Null se o formato for inválido. */
export function interpretarSomaUnaria(cadeia: string): [number, number] | null {
  const m = /^(0*)1(0*)$/.exec(normalizarCadeia(cadeia));
  return m ? [m[1].length, m[2].length] : null;
}

export { exibir };
