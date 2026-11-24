import { useEffect, useMemo, useRef, useState } from 'react';
import { AutomatoPilha, EXEMPLOS_AP, LAMBDA, rotuloTransicaoAP, simbolosDe, type ExecucaoAP, type TransicaoAP } from '../../../src/core/index';
import { Controles, useReproducao } from '../componentes/Controles';
import { Diagrama } from '../componentes/Diagrama';
import { Editor, useDefinicao } from '../componentes/Editor';
import { Fita } from '../componentes/Fita';
import { Pilha } from '../componentes/Pilha';
import { LinhaExecucao, Veredito } from '../componentes/Veredito';
import { Cabecalho, paraJSON, SeletorExemplo, SemExecucao, useLayoutDoJSON, useRolarAtual } from './comum';

export function PaginaAP({ ativo }: { ativo: boolean }) {
  const [exemploId, setExemploId] = useState(EXEMPLOS_AP[0].id);
  const [texto, setTexto] = useState(() => paraJSON(EXEMPLOS_AP[0].json));
  const def = useDefinicao(texto, (t) => AutomatoPilha.deJSON(t));
  const ap = def.modelo;
  const [entrada, setEntrada] = useState(EXEMPLOS_AP[0].entradas[0]);
  const [limite, setLimite] = useState(200000);
  const [exec, setExec] = useState<{ r: ExecucaoAP; w: string[]; chave: number } | null>(null);
  const contador = useRef(0);
  const layoutFixo = useLayoutDoJSON(texto);
  useEffect(() => setExec(null), [ap]);

  const executar = (w = entrada) => {
    if (!ap) return;
    contador.current++;
    const r = ap.executar(w, { maxConfiguracoes: Math.max(10, limite || 200000) });
    setExec({ r, w: simbolosDe(r.cadeia), chave: contador.current });
  };
  const r = exec?.r;
  const total = r && !r.erroEntrada ? r.passos.length : 1;
  const rep = useReproducao(total, exec?.chave ?? 0, ativo);
  const k = Math.min(rep.passo, total - 1);
  const tabelaRef = useRolarAtual<HTMLDivElement>(`${k}-${exec?.chave}`);
  const ids = useMemo(() => new Map<TransicaoAP, string>(ap?.definicao.transicoes.map((t, i) => [t, `t${i}`]) ?? []), [ap]);
  const exemplo = EXEMPLOS_AP.find((e) => e.id === exemploId);

  if (!ap) {
    return (
      <>
        <Cabecalho titulo="Autômato com pilha" tupla="M = (Q, Σ, Γ, δ, q₀, Z₀, F)" />
        <Editor rotulo="Definição" valor={texto} aoMudar={setTexto} erros={def.erros} avisos={[]} nomeArquivo="automato-pilha.json" />
      </>
    );
  }
  const d = ap.definicao;
  const passo = r && !r.erroEntrada ? r.passos[k] : null;
  const noFim = r && k === total - 1;
  const chaveLayout = `${d.estadoInicial}|${d.estados.join(',')}|${d.transicoes.map((t) => `${t.de}>${t.para}`).join(',')}`;

  return (
    <>
      <Cabecalho
        titulo="Autômato com pilha"
        tupla={
          <>
            M = (Q, Σ, Γ, δ, q₀, Z₀, F) — <em>{ap.ehDeterministico ? 'determinístico' : 'não determinístico'}, aceita por {d.aceitacao === 'estadoFinal' ? 'estado final' : 'pilha vazia'}</em>
          </>
        }
      />
      <div className="bancada">
        <aside className="definicao" aria-label="Definição do autômato com pilha">
          <SeletorExemplo
            exemplos={EXEMPLOS_AP}
            valor={exemploId}
            aoEscolher={(e) => {
              setExemploId(e.id);
              setTexto(paraJSON(e.json));
              setEntrada(e.entradas[0]);
            }}
          />
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
            nomeArquivo="automato-pilha.json"
          />
          <p className="dica">
            Cada transição <code>{'{ de, le, desempilha, empilha, para }'}</code> significa δ(de, le, desempilha) = (para, empilha). Use <code>λ</code> para não ler / não desempilhar / não empilhar. Em <code>empilha</code>, o 1º símbolo fica no topo.
          </p>
          <section className="bloco">
            <h2>Componentes</h2>
            <dl className="ficha">
              <dt>Σ (entrada)</dt>
              <dd>{`{${d.alfabetoEntrada.join(', ')}}`}</dd>
              <dt>Γ (pilha)</dt>
              <dd>{`{${d.alfabetoPilha.join(', ')}}`}</dd>
              <dt>Z₀</dt>
              <dd>{d.simboloInicialPilha ?? 'pilha começa vazia'}</dd>
              <dt>F</dt>
              <dd>{`{${d.estadosFinais.join(', ')}}`}</dd>
            </dl>
          </section>
          <section className="bloco">
            <h2>Transições</h2>
            <div className="tabela-rolagem" style={{ maxHeight: 260 }}>
              <table className="tabela">
                <tbody>
                  {d.transicoes.map((t, i) => (
                    <tr key={i} className={passo?.transicao === t ? 'atual' : ''}>
                      <td className="mono">
                        δ({t.de}, {t.le || LAMBDA}, {t.desempilha || LAMBDA}) = ({t.para}, {t.empilha.length ? t.empilha.join('') : LAMBDA})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <label className="opcoes-linha">
            Limite de configurações exploradas
            <input className="entrada mono" type="number" min={10} step={1000} value={limite} onChange={(e) => setLimite(Number(e.target.value))} />
          </label>
        </aside>

        <section className="execucao" aria-label="Execução">
          <LinhaExecucao valor={entrada} aoMudar={setEntrada} aoExecutar={executar} sugestoes={exemplo?.entradas ?? []} />
          {r && (
            <Veredito veredito={r.veredito} motivo={r.motivo} chave={exec!.chave}>
              {!r.deterministico && !r.erroEntrada && (
                <span className="grafite">
                  Busca em largura explorou {r.configuracoesExploradas.toLocaleString('pt-BR')} configurações; abaixo, {r.veredito === 'ACEITA' ? 'a computação que aceita' : 'a que mais avançou'}.
                </span>
              )}
            </Veredito>
          )}
          <Diagrama
            chave={chaveLayout}
            posicoes={layoutFixo}
            estados={d.estados}
            inicial={d.estadoInicial}
            finais={d.aceitacao === 'estadoFinal' ? d.estadosFinais : []}
            arestas={d.transicoes.map((t, i) => ({ id: `t${i}`, de: t.de, para: t.para, rotulo: rotuloTransicaoAP(t) }))}
            ativos={passo ? [passo.estado] : []}
            arestasAtivas={passo?.transicao ? [ids.get(passo.transicao)!] : []}
            mortos={noFim && r.veredito !== 'ACEITA' && passo ? [passo.estado] : []}
            descricao={`Diagrama do autômato com pilha com ${d.estados.length} estados`}
            carimbo={{
              titulo: d.nome ?? 'AP',
              linhas: [
                ['Estados', String(d.estados.length)],
                ['Transições', String(d.transicoes.length)],
                ['Aceitação', d.aceitacao === 'estadoFinal' ? 'estado final' : 'pilha vazia'],
              ],
            }}
          />
          {r && !r.erroEntrada && passo ? (
            <>
              <div className="dupla">
                <div className="bloco" style={{ gap: '0.8rem' }}>
                  <Fita rotulo="Fita de entrada (leitura)" celulas={exec!.w} cabeca={passo.posicao} estado={passo.estado} entrada />
                  <Controles r={rep} ativo={ativo} />
                  <p className="transicao-atual">
                    {passo.transicao ? (
                      <>
                        Passo {k}: leu <b>{passo.leitura}</b>, {passo.operacao}, foi para <b>{passo.estado}</b>
                      </>
                    ) : (
                      <>Configuração inicial: estado {passo.estado}, pilha {passo.pilha.join('') || LAMBDA}</>
                    )}
                  </p>
                </div>
                <Pilha conteudo={passo.pilha} />
              </div>
              <div className="tabela-rolagem" style={{ maxHeight: 340 }} ref={tabelaRef}>
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Passo</th>
                      <th>Leitura</th>
                      <th>Estado</th>
                      <th>Entrada restante</th>
                      <th>Pilha (topo → base)</th>
                      <th>Operação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.passos.map((p, i) => (
                      <tr key={i} className={i === k ? 'atual' : i > k ? 'futuro' : ''} data-clicavel onClick={() => rep.irPara(i)}>
                        <td className="mono">{p.indice}</td>
                        <td className="mono">{p.leitura || '—'}</td>
                        <td className="mono">{p.estado}</td>
                        <td className="mono">{p.restante}</td>
                        <td className="mono">{p.pilha.length ? p.pilha.join(' ') : LAMBDA}</td>
                        <td className="grafite">{p.operacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            !r && <SemExecucao>Digite uma cadeia e clique em Executar para acompanhar leitura, estado e pilha a cada passo.</SemExecucao>
          )}
        </section>
      </div>
    </>
  );
}
