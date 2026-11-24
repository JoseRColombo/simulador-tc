/** Pilha do AP desenhada como um "poço": o topo fica em cima, destacado. */

interface Props {
  /** conteúdo, topo primeiro */
  conteudo: string[];
  maxVisivel?: number;
}

export function Pilha({ conteudo, maxVisivel = 8 }: Props) {
  const n = conteudo.length;
  const mostrar = n > maxVisivel ? conteudo.slice(0, maxVisivel - 1) : conteudo;
  const ocultos = n - mostrar.length;
  return (
    <div className="pilha" aria-label={`Pilha com ${n} símbolo(s): ${conteudo.join(' ') || 'vazia'} (topo à esquerda)`} role="img">
      <h3>Pilha</h3>
      <div className="poco">
        {n === 0 && <div className="vazia">vazia (λ)</div>}
        {mostrar.map((s, i) => (
          // chave pela posição a partir do fundo: só o que entra no topo é animado
          <div key={`${n - i}-${s}`} className={`item${i === 0 ? ' topo' : ''}`} title={i === 0 ? 'topo' : undefined}>
            {s}
          </div>
        ))}
        {ocultos > 0 && <div className="item oculto">+{ocultos} abaixo</div>}
      </div>
      <span className="legenda-pilha">
        {n} símbolo{n === 1 ? '' : 's'}, topo em cima
      </span>
    </div>
  );
}
