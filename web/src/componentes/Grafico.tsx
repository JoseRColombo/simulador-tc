/** Gráfico de linha: operações medidas × curva de referência c·f(n). */
import { useState } from 'react';
import type { Experimento } from '../../../src/core/index';

const W = 420;
const H = 210;
const M = { esq: 58, dir: 16, topo: 12, base: 34 };

function marcas(max: number, qtd = 4): number[] {
  if (max <= 0) return [0];
  const bruto = max / qtd;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map((m) => m * pot).find((p) => p >= bruto)!;
  const n = Math.ceil(max / passo - 1e-9);
  return Array.from({ length: n + 1 }, (_, i) => i * passo); // o último marcador é sempre ≥ max
}

const curto = (v: number) => (v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}k` : `${+v.toFixed(1)}`);

export function Grafico({ e }: { e: Experimento }) {
  const [foco, setFoco] = useState<number | null>(null);
  const c = e.pontos[e.pontos.length - 1].razao; // constante estimada pelo maior n
  const nMax = Math.max(...e.pontos.map((p) => p.n));
  const nMin = Math.min(...e.pontos.map((p) => p.n));
  const amostras = Array.from({ length: 60 }, (_, i) => nMin + ((nMax - nMin) * i) / 59);
  const ref = amostras.map((n) => ({ n, v: c * e.f(n) }));
  const yMax = Math.max(...e.pontos.map((p) => p.operacoes), ...ref.map((r) => r.v));
  const ticksY = marcas(yMax);
  const yTopo = ticksY[ticksY.length - 1];
  const ticksX = marcas(nMax, 4);
  const x = (n: number) => M.esq + (n / ticksX[ticksX.length - 1]) * (W - M.esq - M.dir);
  const y = (v: number) => H - M.base - (v / yTopo) * (H - M.base - M.topo);
  const linha = (pts: { n: number; v: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.n).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const pf = foco !== null ? e.pontos[foco] : null;

  return (
    <figure className="grafico" style={{ margin: 0 }}>
      <h3>{e.titulo}</h3>
      <p className="esperado">
        Esperado <b>{e.esperado}</b>, razão operações/f(n) final ≈ <b>{c.toFixed(3)}</b>
      </p>
      <div className="legenda-grafico" aria-hidden="true">
        <span>
          <i />
          medido
        </span>
        <span>
          <i className="ref" />
          {c.toFixed(2)}·f(n)
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${e.titulo}: operações em função de ${e.eixoX}. Esperado ${e.esperado}.`} onMouseLeave={() => setFoco(null)}>
          <g className="grade">
            {ticksY.map((t) => (
              <line key={t} x1={M.esq} x2={W - M.dir} y1={y(t)} y2={y(t)} />
            ))}
          </g>
          <g className="eixo">
            <line className="base" x1={M.esq} x2={W - M.dir} y1={H - M.base} y2={H - M.base} />
            {ticksY.map((t) => (
              <text key={t} x={M.esq - 8} y={y(t)} textAnchor="end" dominantBaseline="central">
                {curto(t)}
              </text>
            ))}
            {ticksX.map((t) => (
              <text key={t} x={x(t)} y={H - M.base + 15} textAnchor="middle">
                {curto(t)}
              </text>
            ))}
            <text x={(M.esq + W - M.dir) / 2} y={H - 3} textAnchor="middle">
              {e.eixoX}
            </text>
          </g>
          <path className="referencia" d={linha(ref)} />
          <path className="medido" d={linha(e.pontos.map((p) => ({ n: p.n, v: p.operacoes })))} />
          {e.pontos.map((p, i) => (
            <circle key={p.n} className={`ponto${foco === i ? ' foco' : ''}`} cx={x(p.n)} cy={y(p.operacoes)} r={foco === i ? 5.5 : 4.2} />
          ))}
          {e.pontos.map((p, i) => (
            <rect
              key={`a${p.n}`}
              className="alvo"
              x={x(p.n) - 14}
              y={M.topo}
              width={28}
              height={H - M.base - M.topo}
              onMouseEnter={() => setFoco(i)}
              onFocus={() => setFoco(i)}
              onBlur={() => setFoco(null)}
              tabIndex={0}
              aria-label={`n = ${p.n}: ${p.operacoes} operações`}
            />
          ))}
        </svg>
        {pf && (
          <div className="dica-grafico" style={{ left: `${(x(pf.n) / W) * 100}%`, top: `${(y(pf.operacoes) / H) * 100}%` }}>
            n = {pf.n}: {pf.operacoes.toLocaleString('pt-BR')} operações (razão {pf.razao.toFixed(3)})
          </div>
        )}
      </div>
    </figure>
  );
}
