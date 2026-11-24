/** Reprodução passo a passo: ⏮ ◀ ▶/❚❚ ▶ ⏭, barra de progresso, velocidade e atalhos de teclado. */
import { useEffect, useState } from 'react';
import { IconeAnterior, IconeFim, IconeInicio, IconePausar, IconeProximo, IconeTocar } from './icones';

const VELOCIDADES = [
  { rotulo: 'Lenta', ms: 1300 },
  { rotulo: 'Normal', ms: 700 },
  { rotulo: 'Rápida', ms: 280 },
  { rotulo: 'Turbo', ms: 50 },
];

export interface Reproducao {
  passo: number;
  total: number;
  tocando: boolean;
  irPara: (p: number) => void;
  alternar: () => void;
  velocidade: number;
  setVelocidade: (v: number) => void;
}

/**
 * @param total quantidade de configurações (passos + 1)
 * @param chave muda a cada nova execução → volta ao início e começa a tocar
 * @param ativo a página está visível? (pausa quando não está)
 */
export function useReproducao(total: number, chave: number, ativo: boolean): Reproducao {
  const [passo, setPasso] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [velocidade, setVelocidade] = useState(1);

  useEffect(() => {
    setPasso(0);
    setTocando(chave > 0 && total > 1);
  }, [chave, total]);

  useEffect(() => {
    if (!ativo) setTocando(false);
  }, [ativo]);

  useEffect(() => {
    if (!tocando) return;
    if (passo >= total - 1) {
      setTocando(false);
      return;
    }
    const t = setTimeout(() => setPasso((p) => Math.min(p + 1, total - 1)), VELOCIDADES[velocidade].ms);
    return () => clearTimeout(t);
  }, [tocando, passo, total, velocidade]);

  const irPara = (p: number) => {
    setTocando(false);
    setPasso(Math.max(0, Math.min(total - 1, p)));
  };
  const alternar = () => {
    if (tocando) setTocando(false);
    else {
      if (passo >= total - 1) setPasso(0);
      setTocando(true);
    }
  };
  return { passo, total, tocando, irPara, alternar, velocidade, setVelocidade };
}

export function Controles({ r, ativo, rotulo = 'Passo' }: { r: Reproducao; ativo: boolean; rotulo?: string }) {
  useEffect(() => {
    if (!ativo) return;
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      if (alvo.closest('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'ArrowRight') r.irPara(r.passo + 1);
      else if (e.key === 'ArrowLeft') r.irPara(r.passo - 1);
      else if (e.key === 'Home') r.irPara(0);
      else if (e.key === 'End') r.irPara(r.total - 1);
      else if (e.key === ' ' && !alvo.closest('button')) r.alternar();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ativo, r]);

  const ultimo = r.total - 1;
  return (
    <div className="controles" role="group" aria-label="Controles de reprodução">
      <div className="grupo">
        <button type="button" className="icone" onClick={() => r.irPara(0)} disabled={r.passo === 0} title="Início (Home)" aria-label="Ir para o início">
          <IconeInicio />
        </button>
        <button type="button" className="icone" onClick={() => r.irPara(r.passo - 1)} disabled={r.passo === 0} title="Passo anterior (←)" aria-label="Passo anterior">
          <IconeAnterior />
        </button>
        <button type="button" className="icone tocar" onClick={r.alternar} disabled={r.total <= 1} title={r.tocando ? 'Pausar (espaço)' : 'Reproduzir (espaço)'} aria-label={r.tocando ? 'Pausar' : 'Reproduzir'}>
          {r.tocando ? <IconePausar /> : <IconeTocar />}
        </button>
        <button type="button" className="icone" onClick={() => r.irPara(r.passo + 1)} disabled={r.passo >= ultimo} title="Próximo passo (→)" aria-label="Próximo passo">
          <IconeProximo />
        </button>
        <button type="button" className="icone" onClick={() => r.irPara(ultimo)} disabled={r.passo >= ultimo} title="Fim (End)" aria-label="Ir para o fim">
          <IconeFim />
        </button>
      </div>
      <input type="range" min={0} max={Math.max(0, ultimo)} value={r.passo} onChange={(e) => r.irPara(Number(e.target.value))} aria-label="Posição na execução" />
      <span className="contador" aria-live="polite">
        {rotulo} {r.passo} de {ultimo}
      </span>
      <label className="contador">
        <span className="so-leitor">Velocidade</span>
        <select value={r.velocidade} onChange={(e) => r.setVelocidade(Number(e.target.value))} aria-label="Velocidade">
          {VELOCIDADES.map((v, i) => (
            <option key={v.rotulo} value={i}>
              {v.rotulo}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
