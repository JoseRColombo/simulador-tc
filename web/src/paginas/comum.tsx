/** Peças compartilhadas pelas páginas. */
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Exemplo } from '../../../src/core/index';

export const paraJSON = (o: unknown) => JSON.stringify(o, null, 2);

export function Cabecalho({ titulo, tupla, children }: { titulo: string; tupla: ReactNode; children?: ReactNode }) {
  return (
    <header className="cabecalho">
      <div>
        <h1>{titulo}</h1>
        <p className="tupla">{tupla}</p>
      </div>
      {children}
    </header>
  );
}

export function SeletorExemplo({ exemplos, valor, aoEscolher, rotulo = 'Exemplo' }: { exemplos: Exemplo[]; valor: string; aoEscolher: (e: Exemplo) => void; rotulo?: string }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <select
        className="entrada"
        value={valor}
        onChange={(e) => {
          const ex = exemplos.find((x) => x.id === e.target.value);
          if (ex) aoEscolher(ex);
        }}
      >
        {valor === '' && <option value="">Definição personalizada</option>}
        {exemplos.map((e) => (
          <option key={e.id} value={e.id}>
            {e.titulo}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SemExecucao({ children }: { children: ReactNode }) {
  return <div className="vazio-execucao">{children}</div>;
}

/** "{q0, q1}" ou "∅" */
export const conjunto = (xs: readonly string[]) => (xs.length ? `{${xs.join(', ')}}` : '∅');

/** Lê o campo opcional "layout" ({ estado: [x, y] }) do JSON para posicionar o diagrama. */
export function useLayoutDoJSON(texto: string): Record<string, [number, number]> | undefined {
  return useMemo(() => {
    try {
      const o = JSON.parse(texto);
      return o && typeof o === 'object' && o.layout && typeof o.layout === 'object' ? (o.layout as Record<string, [number, number]>) : undefined;
    } catch {
      return undefined;
    }
  }, [texto]);
}

/** Mantém a linha ".atual" visível dentro de uma área rolável (sem rolar a página inteira). */
export function useRolarAtual<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const c = ref.current;
    const el = c?.querySelector<HTMLElement>('.atual');
    if (!c || !el) return;
    const cab = c.querySelector('thead')?.getBoundingClientRect().height ?? 0;
    const cr = c.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (er.top < cr.top + cab) c.scrollTop -= cr.top + cab - er.top + 4;
    else if (er.bottom > cr.bottom) c.scrollTop += er.bottom - cr.bottom + 4;
  }, [dep]);
  return ref;
}
