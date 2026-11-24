#!/usr/bin/env node
/**
 * Interface de console do simulador.
 *
 *   npm run cli                          menu interativo
 *   npm run demo                         demonstração de todos os módulos (exemplos do enunciado)
 *   npm run cli -- af  <arquivo.json> <cadeia...>
 *   npm run cli -- glc <arquivo.json|produções> <cadeia...>
 *   npm run cli -- ap  <arquivo.json> <cadeia...>
 *   npm run cli -- mt  <arquivo.json> <cadeia...>
 *   npm run cli -- linguagem "{a,b}" <cadeia...>
 *   npm run cli -- complexidade
 */
import { existsSync, readFileSync } from 'node:fs';
import { createInterface, type Interface } from 'node:readline';
import {
  Alfabeto,
  AutomatoFinito,
  AutomatoPilha,
  concatenar,
  ErroDefinicao,
  exibir,
  EXEMPLOS_AF,
  EXEMPLOS_AP,
  EXEMPLOS_GLC,
  EXEMPLOS_MT,
  GramaticaLC,
  Linguagem,
  MaquinaTuring,
  PROPRIEDADES,
  tamanho,
  type Exemplo,
} from '../core/index.js';
import { avisos, c, erros, titulo } from './formatacao.js';
import * as R from './relatorios.js';

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
class Saida extends Error {}

// Fila de linhas: funciona tanto no terminal quanto com entrada redirecionada
// (ex.: `npm run cli < roteiro.txt`), em que várias linhas chegam de uma vez.
let rl: Interface | null = null;
const fila: string[] = [];
let esperando: ((linha: string | null) => void) | null = null;
let fechado = false;
function iniciarLeitura(): Interface {
  if (rl) return rl;
  rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  rl.on('line', (l) => {
    if (esperando) {
      const f = esperando;
      esperando = null;
      f(l);
    } else fila.push(l);
  });
  rl.on('close', () => {
    fechado = true;
    if (esperando) esperando(null);
  });
  return rl;
}
async function perguntar(texto: string): Promise<string> {
  const leitor = iniciarLeitura();
  leitor.setPrompt(texto);
  leitor.prompt();
  const linha = fila.length ? fila.shift()! : fechado ? null : await new Promise<string | null>((ok) => (esperando = ok));
  if (linha === null) throw new Saida();
  if (!process.stdin.isTTY) console.log(linha); // eco quando a entrada vem de arquivo
  return linha.trim();
}

/** Executa `f` mostrando ErroDefinicao de forma amigável. Retorna undefined se deu erro. */
function seguro<T>(f: () => T): T | undefined {
  try {
    return f();
  } catch (e) {
    if (e instanceof ErroDefinicao) {
      console.log(erros(e.erros));
      if (e.avisos.length) console.log(avisos(e.avisos));
      return undefined;
    }
    throw e;
  }
}

function lerArquivo(caminho: string): string {
  if (!existsSync(caminho)) throw new ErroDefinicao([`Arquivo não encontrado: ${caminho}`]);
  return readFileSync(caminho, 'utf8');
}

async function escolherOuCarregar<T>(nome: string, exemplos: Exemplo[], criar: (json: unknown) => T, extra?: string): Promise<T | undefined> {
  console.log(`\n${c.negrito(`Escolha ${nome}:`)}`);
  exemplos.forEach((e, i) => console.log(`  ${c.ciano(String(i + 1))}) ${e.titulo}`));
  console.log(`  ${c.ciano('j')}) Carregar arquivo JSON`);
  if (extra) console.log(`  ${c.ciano('d')}) ${extra}`);
  console.log(`  ${c.ciano('0')}) Voltar`);
  const op = await perguntar(c.negrito('> '));
  if (op === '0' || op === '') return undefined;
  if (op.toLowerCase() === 'j') {
    const caminho = await perguntar('Caminho do arquivo .json: ');
    return seguro(() => criar(lerArquivo(caminho.replace(/^["']|["']$/g, ''))));
  }
  if (op.toLowerCase() === 'd' && extra) return 'digitar' as unknown as T;
  const i = Number(op) - 1;
  if (!Number.isInteger(i) || !exemplos[i]) {
    console.log(c.vermelho('Opção inválida.'));
    return undefined;
  }
  return seguro(() => criar(exemplos[i].json));
}

/** Laço "digite uma cadeia": Enter vazio volta; λ/ε = cadeia vazia. */
async function lacoCadeias(sugestoes: string[], executar: (w: string) => void, comandos: Record<string, () => void | Promise<void>> = {}): Promise<void> {
  const extras = Object.keys(comandos);
  console.log(
    c.cinza(`\nDigite cadeias para testar (λ ou ε = cadeia vazia; Enter vazio = voltar${extras.length ? `; comandos: ${extras.join(', ')}` : ''}).`),
    sugestoes.length ? c.cinza(`Sugestões: ${sugestoes.join(', ')}`) : '',
  );
  while (true) {
    const w = await perguntar(c.negrito('cadeia> '));
    if (w === '') return;
    if (comandos[w]) {
      await comandos[w]();
      continue;
    }
    seguro(() => executar(w));
  }
}

// ---------------------------------------------------------------------------
// Módulos interativos
// ---------------------------------------------------------------------------
async function moduloLinguagens(): Promise<void> {
  console.log(titulo('Módulo 1 — Linguagens Formais'));
  let sigma: Alfabeto | undefined;
  while (!sigma) {
    const t = await perguntar('Defina o alfabeto Σ (ex.: {a,b}) ou Enter para voltar: ');
    if (t === '') return;
    sigma = seguro(() => Alfabeto.deTexto(t));
    if (sigma?.avisos.length) console.log(avisos(sigma.avisos));
  }
  let L: Linguagem | undefined;
  while (true) {
    console.log(`\nΣ = ${c.negrito(sigma.toString())}${L ? `   ${L.notacao}` : ''}`);
    console.log(
      [
        '  1) Validar cadeia (pertence a Σ*? tamanho)',
        '  2) Calcular Σ* (até tamanho k)',
        '  3) Calcular Σ⁺ (até tamanho k)',
        '  4) Tamanho de uma cadeia',
        '  5) Concatenação de duas cadeias',
        '  6) Definir linguagem L',
        '  7) Testar se w ∈ L',
        '  8) Listar cadeias de L até tamanho k',
        '  9) Redefinir Σ',
        '  0) Voltar',
      ].join('\n'),
    );
    const op = await perguntar(c.negrito('> '));
    if (op === '0' || op === '') return;
    if (op === '1') R.relatorioValidacao(sigma, await perguntar('w = '));
    else if (op === '2' || op === '3') {
      const k = Number(await perguntar('tamanho máximo k = '));
      seguro(() => R.relatorioEstrela(sigma!, k, op === '3'));
    } else if (op === '4') {
      const w = await perguntar('w = ');
      console.log(`|${exibir(w.trim())}| = ${tamanho(w)}`);
    } else if (op === '5') {
      const u = await perguntar('u = ');
      const v = await perguntar('v = ');
      const uv = concatenar(u, v);
      console.log(`u·v = ${c.negrito(exibir(uv))}   |u·v| = ${tamanho(uv)} = |u| + |v| = ${tamanho(u)} + ${tamanho(v)}`);
      const val = sigma.validar(uv);
      if (!val.valida) console.log(c.amarelo(`Atenção: ${val.mensagem}`));
    } else if (op === '6') {
      console.log('  a) Enumerar as cadeias (linguagem finita)\n  b) Expressão regular\n  c) Propriedade pré-definida');
      const t = (await perguntar('> ')).toLowerCase();
      if (t === 'a') {
        const lista = await perguntar('Cadeias separadas por vírgula (ex.: ab, ba, λ): ');
        L = seguro(() => new Linguagem(sigma!, { tipo: 'finita', cadeias: lista.split(',') })) ?? L;
      } else if (t === 'b') {
        console.log(c.cinza('Sintaxe: + ou | (união), * (fecho), ⁺ (positivo), ? (opcional), () e λ. Ex.: (a+b)*abb'));
        const er = await perguntar('ER = ');
        L = seguro(() => new Linguagem(sigma!, { tipo: 'regular', expressao: er })) ?? L;
      } else if (t === 'c') {
        PROPRIEDADES.forEach((p, i) => console.log(`  ${i + 1}) ${p.notacao} — ${c.cinza(p.descricao)}`));
        const i = Number(await perguntar('> ')) - 1;
        if (PROPRIEDADES[i]) L = seguro(() => new Linguagem(sigma!, { tipo: 'propriedade', id: PROPRIEDADES[i].id })) ?? L;
      }
      if (L) console.log(c.verde(`Definida: ${L.notacao}`));
    } else if (op === '7' || op === '8') {
      if (!L) {
        console.log(c.amarelo('Defina L primeiro (opção 6).'));
        continue;
      }
      if (op === '7') R.relatorioLinguagem(L, await perguntar('w = '));
      else {
        const k = Number(await perguntar('tamanho máximo k = '));
        const r = seguro(() => L!.enumerar(k));
        if (r) console.log(`{ ${r.cadeias.map(exibir).join(', ')}${r.truncado ? ', …' : ''} }`);
      }
    } else if (op === '9') {
      const t = await perguntar('Σ = ');
      const novo = seguro(() => Alfabeto.deTexto(t));
      if (novo) {
        sigma = novo;
        L = undefined;
      }
    } else console.log(c.vermelho('Opção inválida.'));
  }
}

async function moduloAF(): Promise<void> {
  console.log(titulo('Módulo 2 — Autômato Finito (AFD / AFN)'));
  const a = await escolherOuCarregar('um autômato', EXEMPLOS_AF, (j) => AutomatoFinito.deJSON(j));
  if (!a) return;
  R.resumoAF(a);
  const ex = EXEMPLOS_AF.find((e) => e.json.nome === a.definicao.nome);
  await lacoCadeias(ex?.entradas ?? [], (w) => R.relatorioAF(a, w), { ':info': () => R.resumoAF(a) });
}

async function moduloGLC(): Promise<void> {
  console.log(titulo('Módulo 3 — Gramática Livre de Contexto'));
  let g = await escolherOuCarregar<GramaticaLC | 'digitar'>('uma gramática', EXEMPLOS_GLC, (j) => GramaticaLC.deJSON(j), 'Digitar as produções');
  if (g === 'digitar') {
    console.log(c.cinza('Uma linha por variável, ex.: S -> aSb | λ   (linha vazia termina). Maiúsculas = variáveis.'));
    const linhas: string[] = [];
    while (true) {
      const l = await perguntar('  ');
      if (l === '') break;
      linhas.push(l);
    }
    g = seguro(() => GramaticaLC.deJSON(linhas.join('\n')));
  }
  if (!g) return;
  const gram = g;
  R.resumoGLC(gram);
  const ex = EXEMPLOS_GLC.find((e) => e.json.nome === gram.definicao.nome);
  await lacoCadeias(ex?.entradas ?? [], (w) => R.relatorioGLC(gram, w), { ':info': () => R.resumoGLC(gram) });
}

async function moduloAP(): Promise<void> {
  console.log(titulo('Módulo 4 — Autômato com Pilha'));
  const ap = await escolherOuCarregar('um AP', EXEMPLOS_AP, (j) => AutomatoPilha.deJSON(j));
  if (!ap) return;
  R.resumoAP(ap);
  const ex = EXEMPLOS_AP.find((e) => e.json.nome === ap.definicao.nome);
  await lacoCadeias(ex?.entradas ?? [], (w) => R.relatorioAP(ap, w), { ':info': () => R.resumoAP(ap) });
}

async function moduloMT(): Promise<void> {
  console.log(titulo('Módulo 5 — Máquina de Turing'));
  const mt = await escolherOuCarregar('uma máquina', EXEMPLOS_MT, (j) => MaquinaTuring.deJSON(j));
  if (!mt) return;
  R.resumoMT(mt);
  const ex = EXEMPLOS_MT.find((e) => e.json.nome === mt.definicao.nome);
  await lacoCadeias(ex?.entradas ?? [], (w) => R.relatorioMT(mt, w), { ':info': () => R.resumoMT(mt) });
}

// ---------------------------------------------------------------------------
// Demonstração (roteiro da apresentação)
// ---------------------------------------------------------------------------
function demo(): void {
  const af = (id: string) => AutomatoFinito.deJSON(EXEMPLOS_AF.find((e) => e.id === id)!.json);
  const glc = (id: string) => GramaticaLC.deJSON(EXEMPLOS_GLC.find((e) => e.id === id)!.json);
  const ap = (id: string) => AutomatoPilha.deJSON(EXEMPLOS_AP.find((e) => e.id === id)!.json);
  const mt = (id: string) => MaquinaTuring.deJSON(EXEMPLOS_MT.find((e) => e.id === id)!.json);

  console.log(titulo('1. Linguagem Formal'));
  const sigma = Alfabeto.deTexto('{a,b}');
  R.relatorioValidacao(sigma, 'abba');
  console.log();
  R.relatorioValidacao(sigma, 'abca');
  console.log();
  R.relatorioEstrela(sigma, 2, false);
  R.relatorioEstrela(sigma, 2, true);
  console.log(`Concatenação: "ab" · "ba" = ${concatenar('ab', 'ba')}   |abba| = ${tamanho('abba')}`);
  R.relatorioLinguagem(new Linguagem(sigma, { tipo: 'regular', expressao: '(a+b)*abb' }), 'babb');

  console.log(titulo('2. Autômato Finito'));
  const afd = af('afd-enunciado');
  R.resumoAF(afd);
  R.relatorioAF(afd, 'ab');
  console.log();
  R.relatorioAF(afd, 'aba');
  const afn = af('afn-contem-aba');
  R.resumoAF(afn);
  R.relatorioAF(afn, 'babab');

  console.log(titulo('3. Gramática Livre de Contexto'));
  const g = glc('glc-anbn');
  R.resumoGLC(g);
  R.relatorioGLC(g, 'aaabbb');
  R.relatorioGLC(g, 'aabbb');

  console.log(titulo('4. Autômato com Pilha'));
  const p = ap('ap-anbn');
  R.resumoAP(p);
  R.relatorioAP(p, 'aaabbb');
  R.relatorioAP(p, 'aabbb');

  console.log(titulo('5. Máquina de Turing'));
  const ma = mt('mt-w-hash-w');
  R.resumoMT(ma);
  R.relatorioMT(ma, '01#01', 80);
  R.relatorioMT(ma, '01#10');
  const mb = mt('mt-soma-unaria');
  R.resumoMT(mb);
  R.relatorioMT(mb, '000100');

  console.log(titulo('6. Complexidade Computacional'));
  R.relatorioComplexidade(true);
}

// ---------------------------------------------------------------------------
// Comandos diretos
// ---------------------------------------------------------------------------
function comandoDireto(args: string[]): boolean {
  const [cmd, fonte, ...cadeias] = args;
  const lista = cadeias.length ? cadeias : [''];
  const carregar = (f: string) => (existsSync(f) ? lerArquivo(f) : f);
  switch (cmd) {
    case 'af':
    case 'afd':
    case 'afn': {
      const a = seguro(() => AutomatoFinito.deJSON(carregar(fonte)));
      if (!a) return (process.exitCode = 1), true;
      R.resumoAF(a);
      for (const w of lista) seguro(() => R.relatorioAF(a, w));
      return true;
    }
    case 'glc': {
      const g = seguro(() => GramaticaLC.deJSON(carregar(fonte)));
      if (!g) return (process.exitCode = 1), true;
      R.resumoGLC(g);
      for (const w of lista) seguro(() => R.relatorioGLC(g, w));
      return true;
    }
    case 'ap': {
      const a = seguro(() => AutomatoPilha.deJSON(carregar(fonte)));
      if (!a) return (process.exitCode = 1), true;
      R.resumoAP(a);
      for (const w of lista) seguro(() => R.relatorioAP(a, w));
      return true;
    }
    case 'mt': {
      const m = seguro(() => MaquinaTuring.deJSON(carregar(fonte)));
      if (!m) return (process.exitCode = 1), true;
      R.resumoMT(m);
      for (const w of lista) seguro(() => R.relatorioMT(m, w));
      return true;
    }
    case 'linguagem': {
      const s = seguro(() => Alfabeto.deTexto(fonte ?? ''));
      if (!s) return (process.exitCode = 1), true;
      for (const w of lista) R.relatorioValidacao(s, w);
      return true;
    }
    case 'complexidade':
      R.relatorioComplexidade(true);
      return true;
    default:
      return false;
  }
}

function ajuda(): void {
  console.log(`${c.negrito('Simulador de Linguagens Formais e Modelos Computacionais')}

Uso:
  npm run cli                              menu interativo
  npm run demo                             demonstração completa (roteiro da apresentação)
  npm run cli -- af  exemplos/afd-enunciado.json ab aba
  npm run cli -- af  exemplos/afn-contem-aba.json babab
  npm run cli -- glc exemplos/glc-anbn.json aaabbb
  npm run cli -- glc "S -> aSb | λ" aaabbb
  npm run cli -- ap  exemplos/ap-anbn.json aaabbb
  npm run cli -- mt  exemplos/mt-soma-unaria.json 000100
  npm run cli -- linguagem "{a,b}" abba
  npm run cli -- complexidade

Use λ ou ε para a cadeia vazia.`);
}

async function menu(): Promise<void> {
  console.log(titulo('Simulador de Linguagens Formais e Modelos Computacionais'));
  console.log(c.cinza('Aspectos Teóricos da Computação — projeto prático'));
  const opcoes: [string, string, () => Promise<void> | void][] = [
    ['1', 'Linguagens Formais', moduloLinguagens],
    ['2', 'Autômato Finito (AFD/AFN)', moduloAF],
    ['3', 'Gramática Livre de Contexto', moduloGLC],
    ['4', 'Autômato com Pilha', moduloAP],
    ['5', 'Máquina de Turing', moduloMT],
    ['6', 'Complexidade Computacional', () => R.relatorioComplexidade(true)],
    ['7', 'Demonstração completa (exemplos do enunciado)', demo],
  ];
  while (true) {
    console.log();
    for (const [k, nome] of opcoes) console.log(`  ${c.ciano(k)}) ${nome}`);
    console.log(`  ${c.ciano('0')}) Sair`);
    const op = await perguntar(c.negrito('> '));
    if (op === '0' || op.toLowerCase() === 'sair') return;
    const escolhida = opcoes.find(([k]) => k === op);
    if (escolhida) await escolhida[2]();
    else if (op !== '') console.log(c.vermelho('Opção inválida.'));
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return ajuda();
  if (args.includes('--demo')) return demo();
  if (args.length && comandoDireto(args)) return;
  if (args.length) {
    console.log(c.vermelho(`Comando desconhecido: ${args[0]}\n`));
    ajuda();
    process.exitCode = 1;
    return;
  }
  try {
    await menu();
  } catch (e) {
    if (!(e instanceof Saida)) throw e;
  } finally {
    rl?.close();
  }
  console.log(c.cinza('\nAté mais!'));
}

main();
