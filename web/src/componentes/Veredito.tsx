import type { ReactNode } from 'react';
import type { Veredito as TipoVeredito } from '../../../src/core/index';
import { IconeAlerta, IconeErro, IconeOk } from './icones';

const CLASSE: Record<TipoVeredito, string> = { ACEITA: 'aceita', REJEITADA: 'rejeita', INDETERMINADA: 'indet' };
const TEXTO: Record<TipoVeredito, string> = { ACEITA: 'Aceita', REJEITADA: 'Rejeitada', INDETERMINADA: 'Indeterminada' };

export function Veredito({ veredito, motivo, children, chave }: { veredito: TipoVeredito; motivo: string; children?: ReactNode; chave: number }) {
  return (
    <div key={chave} className={`veredito surgir ${CLASSE[veredito]}`} role="status">
      <span className="selo">
        {veredito === 'ACEITA' ? <IconeOk /> : veredito === 'REJEITADA' ? <IconeErro /> : <IconeAlerta />}
        {TEXTO[veredito]}
      </span>
      <p>{motivo}</p>
      {children && <div className="detalhe">{children}</div>}
    </div>
  );
}

/** Campo de cadeia + botão Executar + sugestões. */
export function LinhaExecucao({
  valor,
  aoMudar,
  aoExecutar,
  sugestoes,
  desabilitado,
  rotulo = 'Cadeia de entrada',
}: {
  valor: string;
  aoMudar: (v: string) => void;
  aoExecutar: (w?: string) => void;
  sugestoes: string[];
  desabilitado?: boolean;
  rotulo?: string;
}) {
  return (
    <div className="bloco">
      <form
        className="linha-execucao"
        onSubmit={(e) => {
          e.preventDefault();
          aoExecutar();
        }}
      >
        <label className="campo">
          <span>{rotulo}</span>
          <input className="entrada mono" value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder="digite a cadeia — λ ou ε para a vazia" spellCheck={false} autoComplete="off" />
        </label>
        <button className="botao primario" type="submit" disabled={desabilitado}>
          Executar
        </button>
      </form>
      {sugestoes.length > 0 && (
        <div className="sugestoes">
          <span>Experimente:</span>
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                aoMudar(s);
                aoExecutar(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
