/**
 * Funções que imprimem o resultado de cada módulo no console.
 * São usadas pelo menu interativo, pelo modo --demo e pelos comandos diretos.
 */
import {
  ANALISES,
  arvoreParaTexto,
  AutomatoFinito,
  AutomatoPilha,
  exibir,
  formaParaTexto,
  GramaticaLC,
  interpretarSomaUnaria,
  LAMBDA,
  MaquinaTuring,
  medirComplexidade,
  rotuloTransicaoAP,
  type Alfabeto,
  type Linguagem,
} from '../core/index.js';
import { avisos, c, secao, tabela, veredito } from './formatacao.js';

const out = (...l: string[]) => console.log(l.filter((x) => x !== '').join('\n'));

// ---------------------------------------------------------------------------
// Módulo 1
// ---------------------------------------------------------------------------
export function relatorioValidacao(sigma: Alfabeto, w: string): void {
  const v = sigma.validar(w);
  out(`Σ = ${sigma}`, `Entrada: ${exibir(v.cadeia)}`);
  const marcada = v.simbolos.map((s) => (s.valido ? c.verde(s.simbolo) : c.fundoVermelho(s.simbolo))).join('');
  if (!v.valida) out(`         ${marcada}`);
  out(v.valida ? c.verde(v.mensagem) : c.vermelho(v.mensagem), `Tamanho = ${v.tamanho}`);
}

export function relatorioEstrela(sigma: Alfabeto, k: number, positivo: boolean): void {
  const e = positivo ? sigma.positivo(k, 300) : sigma.estrela(k, 300);
  const nome = positivo ? 'Σ⁺' : 'Σ*';
  out(
    `${nome} (cadeias de tamanho ${positivo ? 1 : 0} a ${k}) — ${e.total} cadeia(s)${e.truncado ? `, mostrando ${e.cadeias.length}` : ''}:`,
    `{ ${e.cadeias.map(exibir).join(', ')}${e.truncado ? ', …' : ''} }`,
  );
  out(c.cinza(`${nome} é infinito; listamos só até o tamanho ${k}.`));
}

export function relatorioLinguagem(L: Linguagem, w: string): void {
  const p = L.pertence(w);
  out(`${L.notacao}`, `${p.pertence ? c.verde('✔') : c.vermelho('✘')} ${p.motivo}`);
}

// ---------------------------------------------------------------------------
// Módulo 2
// ---------------------------------------------------------------------------
export function resumoAF(a: AutomatoFinito): void {
  const d = a.definicao;
  out(
    secao(`${d.tipo}${d.nome ? ` — ${d.nome}` : ''}`),
    d.descricao ? c.cinza(d.descricao) : '',
    `Q = {${d.estados.join(', ')}}   Σ = {${d.alfabeto.join(', ')}}   inicial = ${d.estadoInicial}   F = {${d.estadosFinais.join(', ')}}`,
  );
  const simbolos = d.tipo === 'AFN' && d.transicoes.some((t) => t.simbolo === '') ? [...d.alfabeto, ''] : d.alfabeto;
  const linhas = d.estados.map((q) => [
    `${q === d.estadoInicial ? '→' : ' '}${d.estadosFinais.includes(q) ? '*' : ' '}${q}`,
    ...simbolos.map((s) => {
      const destinos = d.transicoes.filter((t) => t.de === q && t.simbolo === s).map((t) => t.para);
      return destinos.length === 0 ? c.cinza('—') : d.tipo === 'AFD' ? destinos[0] : `{${destinos.join(',')}}`;
    }),
  ]);
  out(tabela(['δ', ...simbolos.map((s) => s || LAMBDA)], linhas), c.cinza('→ estado inicial   * estado final'));
  if (a.avisos.length) out(avisos(a.avisos));
}

export function relatorioAF(a: AutomatoFinito, w: string): void {
  const r = a.executar(w);
  out(`Entrada: ${exibir(r.cadeia)}`);
  if (r.erroEntrada) {
    out(c.vermelho(r.erroEntrada), veredito(r.veredito));
    return;
  }
  if (a.ehDeterministico) {
    r.passos.forEach((p) => out(`  Passo ${p.indice}: δ(${p.antes[0]}, ${p.simbolo}) = ${p.depois[0] ?? c.vermelho('indefinida')}`));
  } else {
    out(`  Início: fecho-λ({${a.definicao.estadoInicial}}) = {${r.iniciais.join(', ')}}`);
    r.passos.forEach((p) => out(`  Passo ${p.indice}: lê ${p.simbolo}: {${p.antes.join(', ')}} → {${p.depois.join(', ')}}`));
  }
  const caminho = a.ehDeterministico
    ? r.caminho.join(' -> ')
    : r.caminho.map((q, i) => (i === 0 ? q : `-${r.caminhoTransicoes[i - 1].simbolo || LAMBDA}-> ${q}`)).join(' ');
  out(`${r.veredito === 'ACEITA' ? 'Caminho' : 'Caminho até parar'}: ${c.negrito(caminho)}`, veredito(r.veredito), c.cinza(r.motivo));
}

// ---------------------------------------------------------------------------
// Módulo 3
// ---------------------------------------------------------------------------
export function resumoGLC(g: GramaticaLC): void {
  const d = g.definicao;
  const porCabeca = new Map<string, string[]>();
  for (const p of d.producoes) porCabeca.set(p.cabeca, [...(porCabeca.get(p.cabeca) ?? []), p.corpo.length ? p.corpo.join('') : LAMBDA]);
  out(
    secao(`GLC${d.nome ? ` — ${d.nome}` : ''}`),
    d.descricao ? c.cinza(d.descricao) : '',
    `V = {${d.variaveis.join(', ')}}   T = {${d.terminais.join(', ')}}   símbolo inicial = ${d.inicial}`,
    ...[...porCabeca].map(([cab, corpos]) => `  ${c.negrito(cab)} → ${corpos.join(' | ')}`),
    c.cinza(`Classificação: ${g.classificar()}`),
  );
  if (g.avisos.length) out(avisos(g.avisos));
}

export function relatorioGLC(g: GramaticaLC, w: string): void {
  const r = g.reconhecer(w);
  out(`Entrada: ${exibir(r.cadeia)}`);
  if (r.veredito === 'ACEITA') {
    out(secao('Derivação mais à esquerda'));
    r.derivacao!.forEach((p, i) => {
      const forma = p.forma.map((s, k) => (k === p.posicao ? c.amarelo(c.negrito(s)) : s)).join('') || LAMBDA;
      out(`  ${String(i + 1).padStart(2)}. ${forma}  ⇒  ${formaParaTexto(p.resultado)}   ${c.cinza(`[${p.producao}]`)}`);
    });
    out(`  ${c.negrito([g.definicao.inicial, ...r.derivacao!.map((p) => formaParaTexto(p.resultado))].join(' ⇒ '))}`);
    out(secao('Árvore de derivação'), arvoreParaTexto(r.arvore!).split('\n').map((l) => '  ' + l).join('\n'));
  }
  out(veredito(r.veredito), c.cinza(r.motivo));
}

// ---------------------------------------------------------------------------
// Módulo 4
// ---------------------------------------------------------------------------
export function resumoAP(ap: AutomatoPilha): void {
  const d = ap.definicao;
  out(
    secao(`AP${d.nome ? ` — ${d.nome}` : ''}`),
    d.descricao ? c.cinza(d.descricao) : '',
    `Q = {${d.estados.join(', ')}}  Σ = {${d.alfabetoEntrada.join(', ')}}  Γ = {${d.alfabetoPilha.join(', ')}}  inicial = ${d.estadoInicial}  Z0 = ${d.simboloInicialPilha ?? LAMBDA}  F = {${d.estadosFinais.join(', ')}}`,
    `Aceitação por ${d.aceitacao === 'estadoFinal' ? 'estado final' : 'pilha vazia'} · ${ap.ehDeterministico ? 'determinístico' : 'NÃO determinístico'}`,
    ...d.transicoes.map((t) => `  ${t.de} --[${rotuloTransicaoAP(t)}]--> ${t.para}`),
  );
  if (ap.avisos.length) out(avisos(ap.avisos));
}

export function relatorioAP(ap: AutomatoPilha, w: string): void {
  const r = ap.executar(w);
  out(`Entrada: ${exibir(r.cadeia)}`);
  if (r.erroEntrada) {
    out(c.vermelho(r.erroEntrada), veredito(r.veredito));
    return;
  }
  out(
    tabela(
      ['Passo', 'Leitura', 'Estado', 'Entrada restante', 'Pilha (topo → base)', 'Operação'],
      r.passos.map((p) => [String(p.indice), p.leitura || '—', p.estado, p.restante, p.pilha.length ? p.pilha.join(' ') : LAMBDA, c.cinza(p.operacao)]),
    ),
  );
  if (!r.deterministico) out(c.cinza(`AP não determinístico: ${r.configuracoesExploradas} configuração(ões) exploradas por busca em largura.`));
  out(veredito(r.veredito), c.cinza(r.motivo));
}

// ---------------------------------------------------------------------------
// Módulo 5
// ---------------------------------------------------------------------------
export function resumoMT(mt: MaquinaTuring): void {
  const d = mt.definicao;
  out(
    secao(`Máquina de Turing${d.nome ? ` — ${d.nome}` : ''}`),
    d.descricao ? c.cinza(d.descricao) : '',
    `Q = {${d.estados.join(', ')}}  Σ = {${d.alfabetoEntrada.join(', ')}}  Γ = {${d.alfabetoFita.join(', ')}}  branco = ${d.branco}`,
    `inicial = ${d.estadoInicial}  q_aceita = ${d.estadoAceita}${d.estadoRejeita ? `  q_rejeita = ${d.estadoRejeita}` : ''}  (${d.modo})`,
  );
  if (mt.avisos.length) out(avisos(mt.avisos));
}

export function relatorioMT(mt: MaquinaTuring, w: string, maxLinhas = 60): void {
  const r = mt.executar(w);
  out(`Entrada: ${exibir(r.cadeia)}`);
  if (r.erroEntrada) {
    out(c.vermelho(r.erroEntrada), veredito(r.veredito));
    return;
  }
  const linha = (i: number) => {
    const p = r.passos[i];
    const fita = p.fita.map((s, k) => (p.inicio + k === p.cabeca ? c.fundoCiano(`[${s}]`) : ` ${s} `)).join('');
    const t = p.transicao ? c.cinza(`  δ(${p.transicao.de}, ${p.transicao.le}) = (${p.transicao.para}, ${p.transicao.escreve}, ${p.transicao.move})`) : '';
    return `  ${String(p.indice).padStart(4)}  ${c.negrito(p.estado.padEnd(4))} ${fita}${t}`;
  };
  const total = r.passos.length;
  if (total <= maxLinhas) for (let i = 0; i < total; i++) out(linha(i));
  else {
    for (let i = 0; i < maxLinhas / 2; i++) out(linha(i));
    out(c.cinza(`  … ${total - maxLinhas} passos omitidos …`));
    for (let i = total - maxLinhas / 2; i < total; i++) out(linha(i));
  }
  out(veredito(r.veredito), c.cinza(r.motivo));
  if (mt.definicao.modo === 'transdutor' && r.veredito === 'ACEITA') {
    const soma = interpretarSomaUnaria(r.cadeia);
    out(`Resultado (fita): ${c.negrito(exibir(r.saida))}${soma ? c.cinza(`   →  ${soma[0]} + ${soma[1]} = ${Array.from(r.saida).filter((x) => x === '0').length}`) : ''}`);
  }
}

// ---------------------------------------------------------------------------
// Módulo 6
// ---------------------------------------------------------------------------
export function relatorioComplexidade(empirico = true): void {
  out(secao('Análise assintótica dos algoritmos implementados'));
  out(
    tabela(
      ['Módulo', 'Algoritmo', 'Melhor caso', 'Caso médio', 'Pior caso'],
      ANALISES.map((a) => [a.modulo, a.algoritmo, a.melhor.notacao, a.medio.notacao, a.pior.notacao]),
    ),
  );
  out(c.cinza('O = limite superior · Ω = limite inferior · Θ = limite justo (O e Ω coincidem).'));
  out(secao('Detalhamento (O / Ω / Θ)'));
  for (const a of ANALISES) {
    out(`${c.negrito(a.algoritmo)} ${c.cinza(`(${a.variaveis})`)}`, c.cinza(`  ${a.descricao}`));
    for (const [nome, caso] of [['melhor', a.melhor], ['médio ', a.medio], ['pior  ', a.pior]] as const) {
      out(`  ${nome}: ${caso.O.padEnd(26)} ${caso.Omega.padEnd(16)} ${(caso.Theta ?? '—').padEnd(26)} ${c.cinza(caso.quando)}`);
    }
  }
  if (!empirico) return;
  out(secao('Verificação empírica (operações contadas pelos próprios simuladores)'));
  for (const e of medirComplexidade()) {
    out(`${c.negrito(e.titulo)} — esperado ${c.ciano(e.esperado)}`);
    out(tabela([e.eixoX, 'operações', 'operações / f(n)', 'tempo (ms)'], e.pontos.map((p) => [String(p.n), String(p.operacoes), p.razao.toFixed(3), p.ms.toFixed(2)])));
  }
  out(c.cinza('A razão operações/f(n) se estabiliza numa constante, confirmando a ordem de crescimento.'));
}

