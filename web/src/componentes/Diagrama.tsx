/**
 * Diagrama de estados em SVG, usado por AFD/AFN, AP e MT.
 * - Layout automático em camadas (BFS a partir do estado inicial) com redução de cruzamentos.
 * - Estados podem ser arrastados com o mouse/dedo.
 * - O estado atual recebe o "marca-texto" amarelo; a transição recém-disparada fica em azul.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { IconeReorganizar } from './icones';

export interface ArestaD {
  id: string;
  de: string;
  para: string;
  rotulo: string;
}

interface Props {
  estados: string[];
  inicial: string;
  finais: string[];
  arestas: ArestaD[];
  ativos?: string[];
  arestasAtivas?: string[];
  /** estados onde a computação morreu (contorno vermelho tracejado) */
  mortos?: string[];
  /** junta rótulos de mesma origem/destino numa linha ("a, b") em vez de empilhar */
  juntarRotulos?: boolean;
  carimbo?: { titulo: string; linhas: [string, string][] };
  /** muda quando a definição muda → refaz o layout */
  chave: string;
  descricao: string;
  /** posições escolhidas à mão (campo "layout" do JSON), em unidades do desenho */
  posicoes?: Record<string, [number, number]>;
}

interface Ponto {
  x: number;
  y: number;
}

const ALTURA_NO = 25;
const larguraTexto = (s: string, px = 8.3) => Array.from(s).length * px;
const raioX = (nome: string) => Math.max(ALTURA_NO, larguraTexto(nome, 8.2) / 2 + 13);

function calcularLayout(estados: string[], inicial: string, arestas: ArestaD[], dx: number, fixas?: Record<string, [number, number]>): Map<string, Ponto> {
  if (fixas && estados.every((e) => Array.isArray(fixas[e]) && fixas[e].length === 2 && fixas[e].every(Number.isFinite))) {
    return new Map(estados.map((e) => [e, { x: fixas[e][0], y: fixas[e][1] }]));
  }
  const vizinhos = new Map<string, string[]>(estados.map((e) => [e, []]));
  for (const a of arestas) if (a.de !== a.para) vizinhos.get(a.de)?.push(a.para);
  const camada = new Map<string, number>();
  const ordem: string[] = [];
  if (estados.includes(inicial)) {
    camada.set(inicial, 0);
    ordem.push(inicial);
  }
  for (let k = 0; k < ordem.length; k++) {
    for (const v of vizinhos.get(ordem[k]) ?? []) {
      if (!camada.has(v)) {
        camada.set(v, camada.get(ordem[k])! + 1);
        ordem.push(v);
      }
    }
  }
  const maxC = Math.max(0, ...camada.values());
  for (const e of estados) if (!camada.has(e)) {
    camada.set(e, maxC + 1);
    ordem.push(e);
  }
  const camadas: string[][] = [];
  for (const e of ordem) (camadas[camada.get(e)!] ??= []).push(e);

  // heurística do baricentro (duas passadas) para reduzir cruzamentos
  const pos = new Map<string, number>();
  const fixar = () => camadas.forEach((c) => c?.forEach((e, i) => pos.set(e, i - (c.length - 1) / 2)));
  fixar();
  const predecessores = new Map<string, string[]>(estados.map((e) => [e, []]));
  for (const a of arestas) if (a.de !== a.para) predecessores.get(a.para)?.push(a.de);
  for (let passada = 0; passada < 2; passada++) {
    for (let c = 1; c < camadas.length; c++) {
      const lista = camadas[c];
      if (!lista) continue;
      const bari = new Map(
        lista.map((e) => {
          const ps = (predecessores.get(e) ?? []).filter((p) => (camada.get(p) ?? 0) < c);
          return [e, ps.length ? ps.reduce((s, p) => s + (pos.get(p) ?? 0), 0) / ps.length : pos.get(e) ?? 0];
        }),
      );
      lista.sort((a, b) => bari.get(a)! - bari.get(b)!);
    }
    fixar();
  }

  // mais espaço vertical quando há laços com vários rótulos empilhados
  const linhasLaco = new Map<string, number>();
  for (const a of arestas) if (a.de === a.para) linhasLaco.set(a.de, (linhasLaco.get(a.de) ?? 0) + 1);
  const maxLaco = Math.max(0, ...linhasLaco.values());
  const DY = 118 + (maxLaco ? 12 + (maxLaco - 1) * 15 : 0);
  const out = new Map<string, Ponto>();
  let x = 0;
  camadas.forEach((c, i) => {
    if (!c) return;
    const largura = Math.max(...c.map(raioX));
    if (i > 0) x += dx + largura;
    c.forEach((e, k) => out.set(e, { x, y: (k - (c.length - 1) / 2) * DY }));
    x += largura;
  });
  return out;
}

function limitesDe(pos: Map<string, Ponto>) {
  const xs = [...pos.values()].map((p) => p.x);
  const ys = [...pos.values()].map((p) => p.y);
  const margemX = 110;
  const minX = Math.min(...xs) - margemX - 30;
  const maxX = Math.max(...xs) + margemX;
  const minY = Math.min(...ys) - 120;
  const maxY = Math.max(...ys) + 110;
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

/** ponto na borda da elipse (rx, ry) centrada em c, na direção de `alvo` */
function borda(c: Ponto, alvo: Ponto, rx: number, ry: number, folga = 0): Ponto {
  const dx = alvo.x - c.x;
  const dy = alvo.y - c.y;
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const r = 1 / Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2) + folga;
  return { x: c.x + ux * r, y: c.y + uy * r };
}

export function Diagrama({ estados, inicial, finais, arestas, ativos = [], arestasAtivas = [], mortos = [], juntarRotulos, carimbo, chave, descricao, posicoes }: Props) {
  const uid = useId().replace(/:/g, '');
  const maiorRotulo = useMemo(() => Math.max(0, ...arestas.map((a) => larguraTexto(a.rotulo))), [arestas]);
  const dx = Math.max(95, Math.min(220, maiorRotulo + 50));
  const layoutInicial = useMemo(() => calcularLayout(estados, inicial, arestas, dx, posicoes), [chave, JSON.stringify(posicoes ?? null)]); // eslint-disable-line react-hooks/exhaustive-deps
  const [pos, setPos] = useState(layoutInicial);
  const [limites, setLimites] = useState(() => limitesDe(layoutInicial));
  const [versao, setVersao] = useState(0);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const conteudoRef = useRef<SVGGElement>(null);
  const desloc = useRef<Ponto>({ x: 0, y: 0 });

  useEffect(() => {
    setPos(layoutInicial);
    setVersao((v) => v + 1);
  }, [layoutInicial]);

  // enquadra o desenho pela caixa real de tudo o que foi desenhado (nós, laços, rótulos)
  const enquadrar = () => {
    const g = conteudoRef.current;
    if (!g) return;
    const b = g.getBBox();
    if (b.width === 0 || b.height === 0) return; // página oculta: mede de novo quando aparecer
    const m = 18;
    const novo = { minX: b.x - m, minY: b.y - m, w: b.width + 2 * m, h: b.height + 2 * m };
    setLimites((ant) => (Math.abs(ant.minX - novo.minX) + Math.abs(ant.minY - novo.minY) + Math.abs(ant.w - novo.w) + Math.abs(ant.h - novo.h) < 0.5 ? ant : novo));
  };
  useLayoutEffect(enquadrar, [versao]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => enquadrar());
    ro.observe(svg);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const conjAtivos = new Set(ativos);
  const conjArestasAtivas = new Set(arestasAtivas);
  const conjFinais = new Set(finais);
  const conjMortos = new Set(mortos);

  // agrupa arestas por (origem, destino)
  const grupos = useMemo(() => {
    const m = new Map<string, { de: string; para: string; itens: ArestaD[] }>();
    for (const a of arestas) {
      const k = `${a.de}\u0000${a.para}`;
      const g = m.get(k) ?? { de: a.de, para: a.para, itens: [] };
      g.itens.push(a);
      m.set(k, g);
    }
    return [...m.values()];
  }, [arestas]);
  const temReversa = useMemo(() => new Set(grupos.map((g) => `${g.de}\u0000${g.para}`)), [grupos]);

  const centroY = useMemo(() => {
    const ys = [...pos.values()].map((p) => p.y);
    return ys.reduce((s, y) => s + y, 0) / (ys.length || 1);
  }, [pos]);

  /** a reta p1→p2 passaria por cima de outro estado? */
  const atravessaOutroNo = (p1: Ponto, p2: Ponto, a: string, b: string) => {
    const vx = p2.x - p1.x;
    const vy = p2.y - p1.y;
    const L2 = vx * vx + vy * vy || 1;
    for (const [nome, p] of pos) {
      if (nome === a || nome === b) continue;
      const t = Math.max(0, Math.min(1, ((p.x - p1.x) * vx + (p.y - p1.y) * vy) / L2));
      const d = Math.hypot(p1.x + t * vx - p.x, p1.y + t * vy - p.y);
      if (d < ALTURA_NO + 10 + Math.max(0, raioX(nome) - ALTURA_NO) * Math.abs(vy) / Math.sqrt(L2)) return true;
    }
    return false;
  };

  const paraSvg = (e: RPointerEvent): Ponto => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const iniciarArrasto = (e: RPointerEvent, nome: string) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const p = paraSvg(e);
    const atual = pos.get(nome)!;
    desloc.current = { x: atual.x - p.x, y: atual.y - p.y };
    setArrastando(nome);
  };
  const mover = (e: RPointerEvent) => {
    if (!arrastando) return;
    const p = paraSvg(e);
    setPos((ant) => new Map(ant).set(arrastando, { x: p.x + desloc.current.x, y: p.y + desloc.current.y }));
  };
  const soltar = () => {
    if (!arrastando) return;
    setArrastando(null);
    setVersao((v) => v + 1);
  };

  const elementosArestas = grupos.map((g) => {
    const p1 = pos.get(g.de);
    const p2 = pos.get(g.para);
    if (!p1 || !p2) return null;
    const ativa = g.itens.some((i) => conjArestasAtivas.has(i.id));
    const linhas = juntarRotulos ? [{ texto: g.itens.map((i) => i.rotulo).join(', '), ativo: ativa }] : g.itens.map((i) => ({ texto: i.rotulo, ativo: conjArestasAtivas.has(i.id) }));
    const rx1 = raioX(g.de);
    const rx2 = raioX(g.para);
    const marcador = `url(#seta-${ativa ? 'ativa' : 'normal'}-${uid})`;
    const k = `${g.de}\u0000${g.para}`;

    if (g.de === g.para) {
      const sinal = p1.y > centroY + 1 ? 1 : -1; // laço para cima (ou para baixo, se o nó está abaixo do centro)
      const a = { x: p1.x - 13, y: p1.y + sinal * (ALTURA_NO - 2) };
      const b = { x: p1.x + 13, y: p1.y + sinal * (ALTURA_NO - 2) };
      const alt = ALTURA_NO + 46;
      const c1 = { x: p1.x - 38, y: p1.y + sinal * alt };
      const c2 = { x: p1.x + 38, y: p1.y + sinal * alt };
      const yRot = p1.y + sinal * (alt - 2);
      return (
        <g key={k}>
          <path className={`aresta${ativa ? ' ativa' : ''}`} d={`M${a.x},${a.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y + sinal * 2}`} markerEnd={marcador} />
          {linhas.map((l, i) => (
            <text key={i} className={`rotulo-aresta${l.ativo ? ' ativo' : ''}`} x={p1.x} y={yRot + sinal * (7 + i * 16)}>
              {l.texto}
            </text>
          ))}
        </g>
      );
    }

    const dxv = p2.x - p1.x;
    const dyv = p2.y - p1.y;
    const L = Math.hypot(dxv, dyv) || 1;
    let nx = -dyv / L;
    let ny = dxv / L;
    const reversa = temReversa.has(`${g.para}\u0000${g.de}`);
    let curv = 0;
    if (reversa) curv = 26; // ida e volta: cada sentido curva para um lado
    else if (atravessaOutroNo(p1, p2, g.de, g.para)) {
      // arestas para trás curvam para baixo; verticais e longas (que pulariam estados) para cima
      curv = 34 + L * 0.12;
      const paraBaixo = dxv < -1;
      if (ny > 0 !== paraBaixo) {
        nx = -nx;
        ny = -ny;
      }
    }
    const meio = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const ctrl = { x: meio.x + nx * curv * 2, y: meio.y + ny * curv * 2 };
    const ini = borda(p1, curv ? ctrl : p2, rx1, ALTURA_NO);
    const fim = borda(p2, curv ? ctrl : p1, rx2, ALTURA_NO, 3);
    const pico = { x: 0.25 * ini.x + 0.5 * ctrl.x + 0.25 * fim.x, y: 0.25 * ini.y + 0.5 * ctrl.y + 0.25 * fim.y };
    // rótulo do lado de fora da curva (ou acima da reta)
    let lx = nx;
    let ly = ny;
    if (!curv && ly > 0) {
      lx = -lx;
      ly = -ly;
    }
    const n = linhas.length;
    const afast = 11 + (n - 1) * 7.5 + Math.abs(lx) * Math.max(...linhas.map((l) => larguraTexto(l.texto))) * 0.5;
    const cx = pico.x + lx * afast;
    const cy = pico.y + ly * afast;
    return (
      <g key={k}>
        <path className={`aresta${ativa ? ' ativa' : ''}`} d={curv ? `M${ini.x},${ini.y} Q${ctrl.x},${ctrl.y} ${fim.x},${fim.y}` : `M${ini.x},${ini.y} L${fim.x},${fim.y}`} markerEnd={marcador} />
        {linhas.map((l, i) => (
          <text key={i} className={`rotulo-aresta${l.ativo ? ' ativo' : ''}`} x={cx} y={cy + (i - (n - 1) / 2) * 16}>
            {l.texto}
          </text>
        ))}
      </g>
    );
  });

  const pIni = pos.get(inicial);
  const { minX, minY, w, h } = limites;

  return (
    <div className="prancheta">
      <svg
        ref={svgRef}
        className="diagrama"
        viewBox={`${minX} ${minY} ${w} ${h}`}
        style={{ aspectRatio: `${w} / ${h}`, width: `min(100%, ${Math.round(w * 1.6)}px)`, maxHeight: 540, margin: '0 auto' }}
        role="img"
        aria-label={descricao}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <defs>
          {(['normal', 'ativa'] as const).map((t) => (
            <marker key={t} id={`seta-${t}-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth={t === 'ativa' ? 6.5 : 8} markerHeight={t === 'ativa' ? 6.5 : 8} orient="auto-start-reverse">
              <path d="M0,0.8 L9.5,5 L0,9.2 z" fill={t === 'ativa' ? 'var(--caneta)' : 'var(--grafite)'} />
            </marker>
          ))}
          <marker id={`seta-inicial-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0,0.8 L9.5,5 L0,9.2 z" fill="var(--tinta)" />
          </marker>
          <filter id={`marca-texto-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="ruido" />
            <feDisplacementMap in="SourceGraphic" in2="ruido" scale="10" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g ref={conteudoRef}>
          {/* marca-texto atrás de tudo */}
          {estados.map((e) => {
            const p = pos.get(e);
            if (!p) return null;
            return (
              <g key={`m-${e}`} className={conjAtivos.has(e) ? 'no ativo' : 'no'} style={{ pointerEvents: 'none' }}>
                <ellipse className="marcador" cx={p.x} cy={p.y} rx={raioX(e) + 13} ry={ALTURA_NO + 11} filter={`url(#marca-texto-${uid})`} transform={`rotate(-6 ${p.x} ${p.y})`} />
              </g>
            );
          })}

          {pIni && (
            <g>
              <line className="seta-inicial" x1={pIni.x - raioX(inicial) - 42} y1={pIni.y} x2={pIni.x - raioX(inicial) - 2} y2={pIni.y} markerEnd={`url(#seta-inicial-${uid})`} />
              <text className="texto-inicial" x={pIni.x - raioX(inicial) - 46} y={pIni.y}>
                início
              </text>
            </g>
          )}

          {elementosArestas}

          {estados.map((e) => {
            const p = pos.get(e);
            if (!p) return null;
            const rx = raioX(e);
            const classes = ['no', conjAtivos.has(e) && 'ativo', conjMortos.has(e) && 'morto', arrastando === e && 'arrastando'].filter(Boolean).join(' ');
            return (
              <g key={e} className={classes} onPointerDown={(ev) => iniciarArrasto(ev, e)}>
                <ellipse className="no-forma" cx={p.x} cy={p.y} rx={rx} ry={ALTURA_NO} />
                {conjFinais.has(e) && <ellipse className="no-final" cx={p.x} cy={p.y} rx={rx - 4.5} ry={ALTURA_NO - 4.5} />}
                <text className="no-rotulo" x={p.x} y={p.y}>
                  {e}
                </text>
                <title>
                  {e}
                  {e === inicial ? ' (inicial)' : ''}
                  {conjFinais.has(e) ? ' (final)' : ''}
                </title>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="prancheta-rodape">
        <div className="acoes-prancheta">
          <button
            type="button"
            className="botao pequeno fantasma"
            title="Voltar à disposição original (os estados podem ser arrastados)"
            onClick={() => {
              setPos(layoutInicial);
              setVersao((v) => v + 1);
            }}
          >
            <IconeReorganizar /> Reorganizar
          </button>
        </div>
        {carimbo && (
          <div className="carimbo" aria-hidden="true">
            <span className="titulo-carimbo">{carimbo.titulo}</span>
            {carimbo.linhas.map(([a, b]) => (
              <span key={a} className="campo-carimbo">
                <small>{a}</small>
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
