/** Fita com cabeça de leitura centralizada (usada pela MT e como fita de entrada do AF/AP). */

interface Props {
  /** símbolos das células, a partir da posição absoluta `inicio` */
  celulas: string[];
  inicio?: number;
  /** posição absoluta da cabeça */
  cabeca: number;
  estado?: string;
  rotulo?: string;
  grande?: boolean;
  branco?: string;
  /** fita de entrada: células antes da cabeça aparecem como já lidas */
  entrada?: boolean;
  /** posição absoluta da célula recém-escrita (destaque rápido) */
  escrita?: number | null;
  mostrarIndices?: boolean;
}

export function Fita({ celulas, inicio = 0, cabeca, estado, rotulo, grande, branco, entrada, escrita, mostrarIndices }: Props) {
  // fita de entrada ganha uma célula extra (⊣) para a cabeça poder ficar depois do último símbolo
  const cels = entrada ? [...celulas, '⊣'] : celulas;
  const idx = cabeca - inicio;
  return (
    <div className={`fita${grande ? ' grande' : ''}`} role="img" aria-label={`${rotulo ?? 'Fita'}: ${celulas.join(' ')}; cabeça na posição ${cabeca + 1}${estado ? `, estado ${estado}` : ''}`}>
      {rotulo && <span className="rotulo-fita">{rotulo}</span>}
      <div className="cabeca">
        {estado && <span className="estado-cabeca">{estado}</span>}
        <svg viewBox="0 0 14 9" aria-hidden="true">
          <path d="M0 0h14L7 9z" fill="currentColor" />
        </svg>
      </div>
      <div className="faixa" style={{ marginLeft: '50%', transform: `translateX(calc(${-(idx + 0.5)} * var(--cel)))` }}>
        {cels.map((s, i) => {
          const abs = inicio + i;
          const classes = ['celula'];
          if (entrada && i === cels.length - 1) classes.push('fim');
          else if (branco !== undefined && s === branco) classes.push('branco');
          if (entrada && i < idx) classes.push('consumida');
          if (i === idx && !(entrada && i === cels.length - 1)) classes.push('sob-cabeca');
          if (escrita === abs) classes.push('escrita');
          return (
            <div key={abs} className={classes.join(' ')}>
              {s}
              {mostrarIndices && <small className="indice">{abs}</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
