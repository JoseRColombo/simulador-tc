import { Fragment, useEffect, useState } from 'react';
import { ANALISES, medirComplexidade, type Caso, type Experimento } from '../../../src/core/index';
import { Grafico } from '../componentes/Grafico';
import { IconeMedir } from '../componentes/icones';
import { Cabecalho } from './comum';

function Notacoes({ c }: { c: Caso }) {
  return (
    <div className="notacoes">
      <span className="sim">O</span>
      <span>{c.O.slice(1)}</span>
      <span className="sim">Ω</span>
      <span>{c.Omega.slice(1)}</span>
      <span className="sim">Θ</span>
      <span className={c.Theta ? 'theta' : 'apagado'}>{c.Theta ? c.Theta.slice(1) : 'sem limite justo único'}</span>
      <span className="quando">{c.quando}</span>
    </div>
  );
}

export function PaginaComplexidade({ ativo }: { ativo: boolean }) {
  const [medicoes, setMedicoes] = useState<Experimento[] | null>(null);
  const [medindo, setMedindo] = useState(false);
  const medir = () => {
    setMedindo(true);
    // deixa o navegador pintar o estado "medindo" antes do trabalho pesado
    setTimeout(() => {
      setMedicoes(medirComplexidade());
      setMedindo(false);
    }, 30);
  };
  useEffect(() => {
    if (ativo && !medicoes && !medindo) medir();
  }, [ativo]); // eslint-disable-line react-hooks/exhaustive-deps

  const modulos = [...new Set(ANALISES.map((a) => a.modulo))];

  return (
    <>
      <Cabecalho titulo="Complexidade computacional" tupla={<>O( ) limite superior, Ω( ) limite inferior, Θ( ) limite justo</>} />
      <div className="folha-larga" style={{ maxWidth: 1240 }}>
        <section className="bloco">
          <p className="dica" style={{ fontSize: 'var(--t-15)', maxWidth: '72ch' }}>
            Para cada algoritmo implementado, o melhor caso, o caso médio e o pior caso. Quando O e Ω coincidem, o limite é justo (Θ). As variáveis de cada linha estão descritas abaixo do nome do algoritmo.
          </p>
          <div className="tabela-rolagem">
            <table className="tabela tabela-cx">
              <thead>
                <tr>
                  <th>Algoritmo</th>
                  <th>Melhor caso</th>
                  <th>Caso médio</th>
                  <th>Pior caso</th>
                </tr>
              </thead>
              <tbody>
                {modulos.map((m) => (
                  <Fragment key={m}>
                    <tr className="modulo-linha">
                      <td colSpan={4}>Módulo {m.replace(' · ', ' — ')}</td>
                    </tr>
                    {ANALISES.filter((a) => a.modulo === m).map((a) => (
                      <tr key={a.id}>
                        <td className="alg">
                          <strong>{a.algoritmo}</strong>
                          <span>{a.descricao}</span>
                          <span className="mono">{a.variaveis}</span>
                        </td>
                        <td>
                          <Notacoes c={a.melhor} />
                        </td>
                        <td>
                          <Notacoes c={a.medio} />
                        </td>
                        <td>
                          <Notacoes c={a.pior} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bloco">
          <header>
            <h2 style={{ fontSize: 'var(--t-22)' }}>Verificação empírica</h2>
            <button type="button" className="botao" onClick={medir} disabled={medindo}>
              <IconeMedir /> {medindo ? 'Medindo…' : 'Medir de novo'}
            </button>
          </header>
          <p className="dica" style={{ fontSize: 'var(--t-15)', maxWidth: '72ch' }}>
            Os próprios simuladores contam as operações elementares que executam (consultas a δ, células da tabela, passos da máquina). Se a análise estiver certa, operações ÷ f(n) se estabiliza numa constante c, e a curva medida acompanha c·f(n) tracejada.
          </p>
          {medicoes ? (
            <>
              <div className="graficos">
                {medicoes.map((e) => (
                  <Grafico key={e.id} e={e} />
                ))}
              </div>
              <details className="saiba">
                <summary>Tabela com os valores medidos</summary>
                <div className="tabela-rolagem" style={{ marginTop: '0.5rem', maxHeight: 420 }}>
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Experimento</th>
                        <th>Tamanho</th>
                        <th>Operações</th>
                        <th>Operações ÷ f(n)</th>
                        <th>Tempo (ms)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicoes.flatMap((e) =>
                        e.pontos.map((p, i) => (
                          <tr key={`${e.id}-${p.n}`}>
                            <td>{i === 0 ? `${e.titulo} — ${e.esperado}` : ''}</td>
                            <td className="mono">{p.n}</td>
                            <td className="mono">{p.operacoes.toLocaleString('pt-BR')}</td>
                            <td className="mono">{p.razao.toFixed(3)}</td>
                            <td className="mono">{p.ms.toFixed(2)}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <div className="vazio-execucao">Medindo…</div>
          )}
        </section>
      </div>
    </>
  );
}
