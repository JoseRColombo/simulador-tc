/** Cores ANSI e tabelas para o console (sem dependências externas). */

const usarCor = process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb';
const cor = (codigo: string) => (s: string | number) => (usarCor ? `\x1b[${codigo}m${s}\x1b[0m` : String(s));

export const c = {
  negrito: cor('1'),
  fraco: cor('2'),
  italico: cor('3'),
  vermelho: cor('31'),
  verde: cor('32'),
  amarelo: cor('33'),
  azul: cor('34'),
  magenta: cor('35'),
  ciano: cor('36'),
  cinza: cor('90'),
  fundoVerde: cor('30;42'),
  fundoVermelho: cor('97;41'),
  fundoAmarelo: cor('30;43'),
  fundoCiano: cor('30;46'),
};

/** Largura visível (ignora códigos ANSI). */
export function largura(s: string): number {
  // eslint-disable-next-line no-control-regex
  return Array.from(s.replace(/\x1b\[[0-9;]*m/g, '')).length;
}

export function preencher(s: string, n: number): string {
  return s + ' '.repeat(Math.max(0, n - largura(s)));
}

export function tabela(cabecalho: string[], linhas: string[][]): string {
  const larguras = cabecalho.map((h, i) => Math.max(largura(h), ...linhas.map((l) => largura(l[i] ?? ''))));
  const sep = (e: string, m: string, d: string) => e + larguras.map((w) => '─'.repeat(w + 2)).join(m) + d;
  const linha = (cel: string[]) => '│' + cel.map((x, i) => ` ${preencher(x ?? '', larguras[i])} `).join('│') + '│';
  return [sep('┌', '┬', '┐'), linha(cabecalho.map((h) => c.negrito(h))), sep('├', '┼', '┤'), ...linhas.map(linha), sep('└', '┴', '┘')].join('\n');
}

export function titulo(texto: string): string {
  const w = largura(texto) + 4;
  return `\n${c.ciano('╭' + '─'.repeat(w) + '╮')}\n${c.ciano('│')}  ${c.negrito(texto)}  ${c.ciano('│')}\n${c.ciano('╰' + '─'.repeat(w) + '╯')}`;
}

export function secao(texto: string): string {
  return `\n${c.magenta('▸')} ${c.negrito(texto)}`;
}

export function veredito(v: 'ACEITA' | 'REJEITADA' | 'INDETERMINADA'): string {
  return v === 'ACEITA' ? c.fundoVerde(' ACEITA ') : v === 'REJEITADA' ? c.fundoVermelho(' REJEITADA ') : c.fundoAmarelo(' INDETERMINADA ');
}

export function avisos(lista: string[]): string {
  return lista.map((a) => `${c.amarelo('⚠')} ${c.amarelo(a)}`).join('\n');
}

export function erros(lista: string[]): string {
  return lista.map((a) => `${c.vermelho('✖')} ${c.vermelho(a)}`).join('\n');
}
