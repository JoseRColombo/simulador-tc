import { useEffect, useState } from 'react';
import { Logotipo } from './componentes/icones';
import { PaginaAF } from './paginas/PaginaAF';
import { PaginaAP } from './paginas/PaginaAP';
import { PaginaComplexidade } from './paginas/PaginaComplexidade';
import { PaginaGLC } from './paginas/PaginaGLC';
import { PaginaLinguagens } from './paginas/PaginaLinguagens';
import { PaginaMT } from './paginas/PaginaMT';

const MODULOS = [
  { id: 'linguagens', nome: 'Linguagens formais', detalhe: 'Σ, Σ*, Σ⁺, |w|, u·v' },
  { id: 'automato-finito', nome: 'Autômato finito', detalhe: 'AFD e AFN' },
  { id: 'gramatica', nome: 'Gramática livre de contexto', detalhe: 'derivação e árvore' },
  { id: 'automato-pilha', nome: 'Autômato com pilha', detalhe: 'aⁿbⁿ e outros' },
  { id: 'maquina-turing', nome: 'Máquina de Turing', detalhe: 'w#w e soma unária' },
  { id: 'complexidade', nome: 'Complexidade', detalhe: 'O, Ω, Θ e medições' },
] as const;
type IdModulo = (typeof MODULOS)[number]['id'];

const lerHash = (): IdModulo => {
  const h = window.location.hash.replace(/^#\/?/, '');
  return (MODULOS.find((m) => m.id === h)?.id ?? 'linguagens') as IdModulo;
};

const guardar = (chave: string, valor: string) => {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* armazenamento indisponível: ignora */
  }
};
const recuperar = (chave: string) => {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
};

export function App() {
  const [atual, setAtual] = useState<IdModulo>(lerHash);
  const [apresentacao, setApresentacao] = useState(() => recuperar('simulador-tc:apresentacao') === '1');

  useEffect(() => {
    const aoMudar = () => setAtual(lerHash());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('apresentacao', apresentacao);
    guardar('simulador-tc:apresentacao', apresentacao ? '1' : '0');
  }, [apresentacao]);
  useEffect(() => {
    const m = MODULOS.find((x) => x.id === atual)!;
    document.title = `${m.nome} — Simulador de Teoria da Computação`;
    window.scrollTo({ top: 0 });
  }, [atual]);

  return (
    <div className="app">
      <nav className="trilho" aria-label="Módulos">
        <a className="marca-app" href="#/linguagens">
          <Logotipo />
          <div>
            <strong>Simulador TC</strong>
            <span>Linguagens formais e modelos computacionais</span>
          </div>
        </a>
        <ol className="sumario">
          {MODULOS.map((m, i) => (
            <li key={m.id}>
              <a href={`#/${m.id}`} aria-current={atual === m.id ? 'page' : undefined}>
                <span className="num">{i + 1}</span>
                <span>
                  {m.nome}
                  <small>{m.detalhe}</small>
                </span>
              </a>
            </li>
          ))}
        </ol>
        <div className="rodape-trilho">
          <label className="chave">
            <input type="checkbox" checked={apresentacao} onChange={(e) => setApresentacao(e.target.checked)} />
            Modo apresentação (letras maiores)
          </label>
          <p className="atalhos">
            <kbd>←</kbd> <kbd>→</kbd> passo a passo
            <br />
            <kbd>espaço</kbd> reproduzir ou pausar
            <br />
            Arraste os estados para reorganizar o diagrama.
          </p>
        </div>
      </nav>
      <main className="principal" id="conteudo">
        {/* todas as páginas ficam montadas para preservar o que foi digitado em cada módulo */}
        <div hidden={atual !== 'linguagens'}>
          <PaginaLinguagens />
        </div>
        <div hidden={atual !== 'automato-finito'}>
          <PaginaAF ativo={atual === 'automato-finito'} />
        </div>
        <div hidden={atual !== 'gramatica'}>
          <PaginaGLC ativo={atual === 'gramatica'} />
        </div>
        <div hidden={atual !== 'automato-pilha'}>
          <PaginaAP ativo={atual === 'automato-pilha'} />
        </div>
        <div hidden={atual !== 'maquina-turing'}>
          <PaginaMT ativo={atual === 'maquina-turing'} />
        </div>
        <div hidden={atual !== 'complexidade'}>
          <PaginaComplexidade ativo={atual === 'complexidade'} />
        </div>
      </main>
    </div>
  );
}
