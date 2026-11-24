/**
 * Utilidades compartilhadas por todos os módulos do simulador.
 *
 * Convenções adotadas em todo o projeto:
 *  - Todo símbolo (de alfabeto, de pilha, de fita, variável ou terminal) tem
 *    EXATAMENTE 1 caractere. Isso elimina ambiguidades na leitura de cadeias
 *    (ex.: com Σ = {a, ab, b}, "ab" poderia ser lida de duas formas).
 *  - A cadeia vazia é representada internamente por "" e exibida como "λ".
 *    Na entrada, "λ", "ε", "lambda", "epsilon" ou "" significam cadeia vazia.
 */

export const LAMBDA = 'λ';

/** Resultado de qualquer simulação. INDETERMINADA = limite de recursos atingido. */
export type Veredito = 'ACEITA' | 'REJEITADA' | 'INDETERMINADA';

const ALIASES_LAMBDA = new Set(['λ', 'ε', 'lambda', 'epsilon', 'Λ']);

/** Verdadeiro se o texto representa a cadeia vazia (λ, ε, "lambda", "" ...). */
export function ehLambda(texto: string): boolean {
  const t = texto.trim();
  return t === '' || ALIASES_LAMBDA.has(t) || ALIASES_LAMBDA.has(t.toLowerCase());
}

/**
 * Normaliza uma cadeia digitada pelo usuário: remove espaços das bordas e
 * converte as representações da cadeia vazia em "".
 */
export function normalizarCadeia(texto: string): string {
  const t = texto.trim();
  return ehLambda(t) ? '' : t;
}

/** Quebra a cadeia em símbolos (pontos de código Unicode, não unidades UTF-16). */
export function simbolosDe(cadeia: string): string[] {
  return Array.from(cadeia);
}

/** Exibe a cadeia, usando λ para a cadeia vazia. */
export function exibir(cadeia: string): string {
  return cadeia === '' ? LAMBDA : cadeia;
}

/** Erro de definição (JSON malformado, estado inexistente, etc.) com lista de problemas. */
export class ErroDefinicao extends Error {
  readonly erros: string[];
  readonly avisos: string[];
  constructor(erros: string[], avisos: string[] = []) {
    super(erros.join('\n'));
    this.name = 'ErroDefinicao';
    this.erros = erros;
    this.avisos = avisos;
  }
}

/**
 * JSON.parse com mensagem amigável (linha e coluna do erro).
 */
export function lerJSON(texto: string): unknown {
  if (texto.trim() === '') throw new ErroDefinicao(['O JSON está vazio.']);
  try {
    return JSON.parse(texto);
  } catch (e) {
    // As mensagens do JSON.parse variam entre navegadores/versões do Node;
    // por isso localizamos o erro com um analisador próprio.
    const achado = localizarErroJSON(texto);
    if (achado) {
      const antes = texto.slice(0, achado.pos);
      const linha = antes.split('\n').length;
      const coluna = achado.pos - antes.lastIndexOf('\n');
      throw new ErroDefinicao([`JSON inválido na linha ${linha}, coluna ${coluna}: ${achado.msg}`]);
    }
    throw new ErroDefinicao([`JSON inválido: ${e instanceof Error ? e.message : String(e)}`]);
  }
}

/** Analisador sintático mínimo de JSON que devolve a posição e a causa do 1º erro. */
function localizarErroJSON(t: string): { pos: number; msg: string } | null {
  let i = 0;
  class Falha {
    constructor(readonly pos: number, readonly msg: string) {}
  }
  const falha = (msg: string, pos = i): never => {
    throw new Falha(pos, msg);
  };
  const ws = () => {
    while (i < t.length && ' \t\n\r'.includes(t[i])) i++;
  };
  const descrever = (c: string | undefined) => (c === undefined ? 'fim do texto' : `"${c}"`);
  const valor = (): void => {
    ws();
    const c = t[i];
    if (c === '{') return objeto();
    if (c === '[') return lista();
    if (c === '"') return texto();
    if (c === "'") falha('use aspas duplas (") em vez de aspas simples.');
    if (c === '-' || (c >= '0' && c <= '9')) return numero();
    for (const lit of ['true', 'false', 'null']) if (t.startsWith(lit, i)) return void (i += lit.length);
    falha(c === undefined ? 'o texto terminou antes do esperado (falta fechar "}" ou "]"?).' : `valor inesperado ${descrever(c)}.`);
  };
  const texto = () => {
    const ini = i++;
    while (i < t.length && t[i] !== '"') {
      if (t[i] === '\n') falha('texto (string) sem aspas de fechamento.', ini);
      i += t[i] === '\\' ? 2 : 1;
    }
    if (i >= t.length) falha('texto (string) sem aspas de fechamento.', ini);
    i++;
  };
  const numero = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(t.slice(i));
    if (!m) falha('número inválido.');
    i += m![0].length;
  };
  const objeto = () => {
    i++;
    ws();
    if (t[i] === '}') return void i++;
    while (true) {
      ws();
      if (t[i] === '}') falha('vírgula sobrando antes de "}".');
      if (t[i] !== '"') falha(t[i] === "'" ? 'use aspas duplas (") nas chaves.' : `esperada uma chave entre aspas, encontrado ${descrever(t[i])}.`);
      texto();
      ws();
      if (t[i] !== ':') falha(`esperado ":" após a chave, encontrado ${descrever(t[i])}.`);
      i++;
      valor();
      ws();
      if (t[i] === ',') {
        i++;
        continue;
      }
      if (t[i] === '}') return void i++;
      falha(`esperado "," ou "}", encontrado ${descrever(t[i])}${t[i] === '"' ? ' (falta uma vírgula?)' : ''}.`);
    }
  };
  const lista = () => {
    i++;
    ws();
    if (t[i] === ']') return void i++;
    while (true) {
      ws();
      if (t[i] === ']') falha('vírgula sobrando antes de "]".');
      valor();
      ws();
      if (t[i] === ',') {
        i++;
        continue;
      }
      if (t[i] === ']') return void i++;
      falha(`esperado "," ou "]", encontrado ${descrever(t[i])}${t[i] === '"' || t[i] === '{' ? ' (falta uma vírgula?)' : ''}.`);
    }
  };
  try {
    valor();
    ws();
    if (i < t.length) falha(`conteúdo extra após o fim do JSON: ${descrever(t[i])}.`);
    return null;
  } catch (e) {
    if (e instanceof Falha) return { pos: e.pos, msg: e.msg };
    throw e;
  }
}

/** Valida que `s` é um símbolo de 1 caractere, não-branco e diferente de λ. */
export function validarSimbolo(s: unknown, contexto: string, erros: string[]): s is string {
  if (typeof s !== 'string') {
    erros.push(`${contexto}: símbolo deve ser texto, recebido ${JSON.stringify(s)}.`);
    return false;
  }
  if (s.trim() === '' && s !== '') {
    erros.push(`${contexto}: espaço em branco não pode ser usado como símbolo.`);
    return false;
  }
  if (s === '') {
    erros.push(`${contexto}: símbolo vazio não é permitido.`);
    return false;
  }
  if (ALIASES_LAMBDA.has(s)) {
    erros.push(`${contexto}: "${s}" é reservado para a cadeia vazia e não pode ser símbolo.`);
    return false;
  }
  if (Array.from(s).length !== 1) {
    erros.push(`${contexto}: "${s}" tem ${Array.from(s).length} caracteres; cada símbolo deve ter exatamente 1.`);
    return false;
  }
  return true;
}

/** Lê um campo do objeto aceitando nomes alternativos (ex.: "estadoInicial" | "inicial"). */
export function campo(obj: Record<string, unknown>, ...nomes: string[]): unknown {
  for (const n of nomes) if (n in obj && obj[n] !== undefined) return obj[n];
  return undefined;
}

export function exigirObjeto(valor: unknown, contexto: string): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new ErroDefinicao([`${contexto} deve ser um objeto JSON ({ ... }).`]);
  }
  return valor as Record<string, unknown>;
}

/** Lê uma lista de textos. Aceita também um texto separado por vírgulas. */
export function listaDeTextos(valor: unknown, contexto: string, erros: string[]): string[] {
  if (valor === undefined || valor === null) {
    erros.push(`Campo obrigatório ausente: ${contexto}.`);
    return [];
  }
  if (typeof valor === 'string') {
    return valor
      .replace(/^\s*\{|\}\s*$/g, '')
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x !== '');
  }
  if (!Array.isArray(valor)) {
    erros.push(`${contexto} deve ser uma lista, recebido ${JSON.stringify(valor)}.`);
    return [];
  }
  const out: string[] = [];
  valor.forEach((v, i) => {
    if (typeof v !== 'string') erros.push(`${contexto}[${i}] deve ser texto, recebido ${JSON.stringify(v)}.`);
    else out.push(v.trim());
  });
  return out;
}

/** Remove duplicatas preservando a ordem; registra aviso se houver. */
export function semDuplicatas(itens: string[], contexto: string, avisos: string[]): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  const dup = new Set<string>();
  for (const x of itens) {
    if (vistos.has(x)) dup.add(x);
    else {
      vistos.add(x);
      out.push(x);
    }
  }
  if (dup.size) avisos.push(`${contexto}: itens repetidos ignorados (${[...dup].join(', ')}).`);
  return out;
}

/** Nomes de estado: texto não vazio, sem espaços nas bordas. */
export function validarNomesEstados(estados: string[], contexto: string, erros: string[]): void {
  if (estados.length === 0) erros.push(`${contexto}: o conjunto de estados não pode ser vazio.`);
  estados.forEach((e, i) => {
    if (e === '') erros.push(`${contexto}[${i}]: nome de estado vazio.`);
  });
}

/** Contador simples de operações elementares, usado na análise empírica de complexidade. */
export class Contador {
  valor = 0;
  inc(k = 1): void {
    this.valor += k;
  }
}
