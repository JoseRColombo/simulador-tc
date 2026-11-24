import { useEffect, useMemo, useRef, useState } from 'react';
import { EXEMPLOS_MT, exibir, interpretarSomaUnaria, MaquinaTuring, rotuloTransicaoMT, type ExecucaoMT, type PassoMT, type TransicaoMT } from '../../../src/core/index';
import { Controles, useReproducao } from '../componentes/Controles';
import { Diagrama } from '../componentes/Diagrama';
import { Editor, useDefinicao } from '../componentes/Editor';
import { Fita } from '../componentes/Fita';
import { LinhaExecucao, Veredito } from '../componentes/Veredito';
import { Cabecalho, paraJSON, SeletorExemplo, SemExecucao, useLayoutDoJSON, useRolarAtual } from './comum';

export function PaginaMT({ ativo }: { ativo: boolean }) {
  const [exemploId, setExemploId] = useState(EXEMPLOS_MT[0].id);
  const [texto, setTexto] = useState(() => paraJSON(EXEMPLOS_MT[0].json));
  const def = useDefinicao(texto, (t) => MaquinaTuring.deJSON(t));
  const mt = def.modelo;
  const [entrada, setEntrada] = useState(EXEMPLOS_MT[0].entradas[0]);
  const [limite, setLimite] = useState(10000);
  const [exec, setExec] = useState<{ r: ExecucaoMT; chave: number } | null>(null);
  const contador = useRef(0);
  const layoutFixo = useLayoutDoJSON(texto);
  useEffect(() => setExec(null), [mt]);

  const executar = (w = entrada) => {
    if (!mt) return;
    contador.current++;
    setExec({ r: mt.executar(w, Math.max(1, limite || 10000)), chave: contador.current });
  };
  const r = exec?.r;
  const total = r && !r.erroEntrada ? r.passos.length : 1;
  const rep = useReproducao(total, exec?.chave ?? 0, ativo);
  const k = Math.min(rep.passo, total - 1);
  const historicoRef = useRolarAtual<HTMLDivElement>(`${k}-${exec?.chave}`);
  const ids = useMemo(() => new Map<TransicaoMT, string>(mt?.definicao.transicoes.map((t, i) => [t, `t${i}`]) ?? []), [mt]);

  // trecho da fita que cobre toda a execução (as células não "pulam" de um passo para outro)
  const faixa = useMemo(() => {
    if (!r || r.erroEntrada) return null;
    const ini = Math.min(...r.passos.map((p) => p.inicio)) - 2;
    const fim = Math.max(...r.passos.map((p) => p.inicio + p.fita.length - 1)) + 2;
    return { ini, fim };
  }, [r]);
  const exemplo = EXEMPLOS_MT.find((e) => e.id === exemploId);

  if (!mt) {
    return (
      <>
        <Cabecalho titulo="Máquina de Turing" tupla="M = (Q, Σ, Γ, δ, q₀, □, q_aceita, q_rejeita)" />
        <Editor rotulo="Definição" valor={texto} aoMudar={setTexto} erros={def.erros} avisos={[]} nomeArquivo="maquina-turing.json" />
      </>
    );
  }
  const d = mt.definicao;
  const p = r && !r.erroEntrada ? r.passos[k] : null;
  const anterior = r && k > 0 ? r.passos[k - 1] : null;
  const celulas =
    p && faixa ? Array.from({ length: faixa.fim - faixa.ini + 1 }, (_, i) => p.fita[faixa.ini + i - p.inicio] ?? d.branco) : [];
  const noFim = r && k === total - 1;
  const soma = r && d.modo === 'transdutor' ? interpretarSomaUnaria(r.cadeia) : null;
  const chaveLayout = `${d.estadoInicial}|${d.estados.join(',')}|${d.transicoes.map((t) => `${t.de}>${t.para}`).join(',')}`;
  const linhaFita = (q: PassoMT) =>
    q.fita.map((s, i) => (q.inicio + i === q.cabeca ? <span key={i} className="cab">{s}</span> : <span key={i}>{s}</span>));

  return (
    <>
      <Cabecalho
        titulo="Máquina de Turing"
        tupla={
          <>
            M = (Q, Σ, Γ, δ, q₀, □, q_aceita, q_rejeita) — <em>{d.modo === 'transdutor' ? 'calcula uma função (a saída fica na fita)' : 'reconhece uma linguagem'}</em>
          </>
        }
      />
      <div className="bancada">
        <aside className="definicao" aria-label="Definição da máquina">
          <SeletorExemplo
            exemplos={EXEMPLOS_MT}
            valor={exemploId}
            rotulo="Máquina"
            aoEscolher={(e) => {
              setExemploId(e.id);
              setTexto(paraJSON(e.json));
              setEntrada(e.entradas[0]);
            }}
          />
          {d.descricao && <p className="dica">{d.descricao}</p>}
          <Editor
            rotulo="Definição"
            valor={texto}
            aoMudar={(v) => {
              setTexto(v);
              setExemploId('');
            }}
            erros={def.erros}
            avisos={def.avisos}
            desatualizado
            nomeArquivo="maquina-turing.json"
          />
          <p className="dica">
            Cada transição <code>{'{ de, le, escreve, move, para }'}</code> é δ(de, le) = (para, escreve, move), com move <code>L</code>, <code>R</code> ou <code>S</code> (parado). Sem transição definida, a máquina para e rejeita.
          </p>
          <section className="bloco">
            <h2>Componentes</h2>
            <dl className="ficha">
              <dt>Σ (entrada)</dt>
              <dd>{`{${d.alfabetoEntrada.join(', ')}}`}</dd>
              <dt>Γ (fita)</dt>
              <dd>{`{${d.alfabetoFita.join(', ')}}`}</dd>
              <dt>Branco</dt>
              <dd>{d.branco}</dd>
              <dt>Parada</dt>
              <dd>
                aceita em {d.estadoAceita}
                {d.estadoRejeita ? `, rejeita em ${d.estadoRejeita}` : ''}
              </dd>
            </dl>
          </section>
          <label className="opcoes-linha">
            Limite de passos (proteção contra laço infinito)
            <input className="entrada mono" type="number" min={1} step={1000} value={limite} onChange={(e) => setLimite(Number(e.target.value))} />
          </label>
        </aside>

        <section className="execucao" aria-label="Execução">
          <LinhaExecucao valor={entrada} aoMudar={setEntrada} aoExecutar={executar} sugestoes={exemplo?.entradas ?? []} rotulo="Conteúdo inicial da fita" />
          {r && <Veredito veredito={r.veredito} motivo={r.motivo} chave={exec!.chave} />}
          {r && d.modo === 'transdutor' && r.veredito === 'ACEITA' && (
            <div className="saida-mt">
              <span className="grafite">Saída na fita</span>
              <span className="valor">{exibir(r.saida)}</span>
              {soma && (
                <span className="conta">
                  {soma[0]} + {soma[1]} = {Array.from(r.saida).filter((c) => c === '0').length}
                </span>
              )}
            </div>
          )}
          {p && faixa ? (
            <>
              <Fita grande rotulo="Fita" celulas={celulas} inicio={faixa.ini} cabeca={p.cabeca} estado={p.estado} branco={d.branco} escrita={anterior ? anterior.cabeca : null} />
              <Controles r={rep} ativo={ativo} />
              <p className="transicao-atual">
                {p.transicao ? (
                  <>
                    Próximo: δ({p.estado}, {p.transicao.le}) = <b>({p.transicao.para}, {p.transicao.escreve}, {p.transicao.move})</b> — escreve {p.transicao.escreve}, move para{' '}
                    {p.transicao.move === 'L' ? 'a esquerda' : p.transicao.move === 'R' ? 'a direita' : 'lugar nenhum (fica parada)'}
                  </>
                ) : (
                  <>Parou no estado {p.estado}.</>
                )}
              </p>
            </>
          ) : (
            !r && <SemExecucao>Escreva o conteúdo inicial da fita e clique em Executar para ver a cabeça ler, escrever e se mover.</SemExecucao>
          )}
          <Diagrama
            chave={chaveLayout}
            posicoes={layoutFixo}
            estados={d.estados}
            inicial={d.estadoInicial}
            finais={[d.estadoAceita]}
            arestas={d.transicoes.map((t, i) => ({ id: `t${i}`, de: t.de, para: t.para, rotulo: rotuloTransicaoMT(t) }))}
            ativos={p ? [p.estado] : []}
            arestasAtivas={anterior?.transicao ? [ids.get(anterior.transicao)!] : []}
            mortos={noFim && r.veredito !== 'ACEITA' && p ? [p.estado] : []}
            descricao={`Diagrama da máquina de Turing com ${d.estados.length} estados`}
            carimbo={{
              titulo: d.nome ?? 'Máquina de Turing',
              linhas: [
                ['Estados', String(d.estados.length)],
                ['Transições', String(d.transicoes.length)],
                ['Passos', r && !r.erroEntrada ? String(r.numeroPassos) : '—'],
              ],
            }}
          />
          {r && !r.erroEntrada && (
            <details className="saiba">
              <summary>Histórico de configurações ({r.passos.length})</summary>
              <div className="tabela-rolagem historico-mt" style={{ marginTop: '0.5rem' }} ref={historicoRef}>
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Passo</th>
                      <th>Estado</th>
                      <th>Fita (cabeça destacada)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.passos.slice(0, 2000).map((q, i) => (
                      <tr key={i} className={i === k ? 'atual' : ''} data-clicavel onClick={() => rep.irPara(i)}>
                        <td>{q.indice}</td>
                        <td>{q.estado}</td>
                        <td className="fita-txt">{linhaFita(q)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </section>
      </div>
    </>
  );
}
