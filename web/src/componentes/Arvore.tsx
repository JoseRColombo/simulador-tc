/** Árvore de derivação que "cresce" conforme a derivação avança. */
import { useMemo } from 'react';
import type { NoArvore } from '../../../src/core/index';

interface Posicionado {
  no: NoArvore;
  x: number;
  y: number;
  pai?: number;
}

const DX = 46;
const DY = 66;
const MARGEM = 30;

function posicionar(raiz: NoArvore) {
  const lista: Posicionado[] = [];
  let folha = 0;
  let prof = 0;
  const visitar = (no: NoArvore, d: number, pai?: number): number => {
    prof = Math.max(prof, d);
    const indice = lista.length;
    lista.push({ no, x: 0, y: d * DY + MARGEM, pai });
    if (no.filhos.length === 0) {
      lista[indice].x = folha++ * DX + MARGEM;
    } else {
      const xs = no.filhos.map((f) => lista[visitar(f, d + 1, indice)].x);
      lista[indice].x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    return indice;
  };
  visitar(raiz, 0);
  return { lista, largura: Math.max(1, folha) * DX - DX + 2 * MARGEM, altura: prof * DY + 2 * MARGEM };
}

/**
 * @param visiveis ids dos nós já revelados
 * @param destaque id do nó expandido no passo atual
 * @param proximo id do próximo nó a expandir
 */
export function Arvore({ raiz, visiveis, destaque, proximo }: { raiz: NoArvore; visiveis: Set<number>; destaque?: number; proximo?: number }) {
  const { lista, largura, altura } = useMemo(() => posicionar(raiz), [raiz]);
  return (
    <svg className="arvore" width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label="Árvore de derivação">
      {lista.map((p, i) =>
        p.pai === undefined ? null : (
          <line key={`r${i}`} className={`ramo${visiveis.has(p.no.id) ? '' : ' escondido'}`} x1={lista[p.pai].x} y1={lista[p.pai].y + 15} x2={p.x} y2={p.y - (p.no.tipo === 'variavel' ? 15 : 11)} />
        ),
      )}
      {lista.map((p) => {
        const classes = ['no-arv', visiveis.has(p.no.id) ? '' : 'escondido', p.no.id === destaque ? 'destaque' : '', p.no.id === proximo ? 'proximo' : ''].join(' ');
        return (
          <g key={p.no.id} className={classes}>
            {p.no.tipo === 'variavel' ? (
              <>
                <circle className="bola" cx={p.x} cy={p.y} r={15} />
                <text className="t-var" x={p.x} y={p.y}>
                  {p.no.simbolo}
                </text>
                {p.no.producao && <title>{p.no.producao}</title>}
              </>
            ) : (
              <text className={p.no.tipo === 'terminal' ? 't-term' : 't-lambda'} x={p.x} y={p.y}>
                {p.no.simbolo}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
