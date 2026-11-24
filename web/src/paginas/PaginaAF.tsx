import { useEffect, useMemo, useRef, useState } from 'react';
import { AutomatoFinito, EXEMPLOS_AF, LAMBDA, type ExecucaoAF, type TransicaoAF } from '../../../src/core/index';
import { Controles, useReproducao } from '../componentes/Controles';
import { Diagrama } from '../componentes/Diagrama';
import { Editor, useDefinicao } from '../componentes/Editor';
import { Fita } from '../componentes/Fita';
import { LinhaExecucao, Veredito } from '../componentes/Veredito';
import { Cabecalho, conjunto, paraJSON, SeletorExemplo, SemExecucao, useLayoutDoJSON, useRolarAtual } from './comum';

export function PaginaAF({ ativo }: { ativo: boolean }) {
  const [exemploId, setExemploId] = useState(EXEMPLOS_AF[0].id);
  const [texto, setTexto] = useState(() => paraJSON(EXEMPLOS_AF[0].json));
  const def = useDefinicao(texto, (t) => AutomatoFinito.deJSON(t));
  const af = def.modelo;
  const [entrada, setEntrada] = useState(EXEMPLOS_AF[0].entradas[0]);
  const [exec, setExec] = useState<{ r: ExecucaoAF; chave: number } | null>(null);
  const contador = useRef(0);
  const layoutFixo = useLayoutDoJSON(texto);

  useEffect(() => setExec(null), [af]);

  const executar = (w = entrada) => {
    if (!af) return;
    contador.current++;
    setExec({ r: af.executar(w), chave: contador.current });
  };

  const r = exec?.r;
  const total = r && !r.erroEntrada ? r.passos.length + 1 : 1;
  const rep = useReproducao(total, exec?.chave ?? 0, ativo);
  const k = Math.min(rep.passo, total - 1);
  const tabelaRef = useRolarAtual<HTMLDivElement>(`${k}-${exec?.chave}`);

  const ids = useMemo(() => new Map<TransicaoAF, string>(af?.definicao.transicoes.map((t, i) => [t, `t${i}`]) ?? []), [af]);
  const exemplo = EXEMPLOS_AF.find((e) => e.id === exemploId);

  if (!af) {
    return (
      <>
        <Cabecalho titulo="Autômato finito" tupla="M = (Q, Σ, δ, q₀, F)" />
        <Editor rotulo="Definição" valor={texto} aoMudar={setTexto} erros={def.erros} avisos={[]} nomeArquivo="automato.json" />
      </>
    );
  }
  const d = af.definicao;
  const det = af.ehDeterministico;
  const ativos = r && !r.erroEntrada ? (k === 0 ? r.iniciais : r.passos[k - 1].depois) : [d.estadoInicial];
  const arestasAtivas = r && k > 0 ? r.passos[k - 1].transicoes.map((t) => ids.get(t)!).filter(Boolean) : [];
  const noFim = r && k === total - 1;
  const mortos = noFim && r.veredito === 'REJEITADA' && !r.erroEntrada ? (ativos.length ? ativos : r.passos[k - 1]?.antes ?? []) : [];
  const chaveLayout = `${d.estadoInicial}|${d.estados.join(',')}|${d.transicoes.map((t) => `${t.de}>${t.para}`).join(',')}`;
  const simbolosTabela = d.transicoes.some((t) => t.simbolo === '') ? [...d.alfabeto, ''] : d.alfabeto;

  const caminhoTexto = (ex: ExecucaoAF) =>
    det ? ex.caminho.join(' → ') : ex.caminho.map((q, i) => (i === 0 ? q : ` –${ex.caminhoTransicoes[i - 1].simbolo || LAMBDA}→ ${q}`)).join('');

  return (
    <>
      <Cabecalho titulo="Autômato finito" tupla={<>M = (Q, Σ, δ, q₀, F) — {det ? <em>determinístico (AFD)</em> : <em>não determinístico (AFN{d.transicoes.some((t) => !t.simbolo) ? '-λ' : ''})</em>}</>} />
      <div className="bancada">
        <aside className="definicao" aria-label="Definição do autômato">
          <SeletorExemplo
            exemplos={EXEMPLOS_AF}
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
            nomeArquivo="automato.json"
          />
          <section className="bloco">
            <h2>Função de transição δ</h2>
            <div className="tabela-rolagem">
              <table className="tabela delta">
                <thead>
                  <tr>
                    <th>δ</th>
                    {simbolosTabela.map((s) => (
                      <th key={s} className="mono">
                        {s || LAMBDA}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.estados.map((q) => (
                    <tr key={q} className={ativos.includes(q) && r ? 'atual' : ''}>
                      <th className="estado">
                        {q === d.estadoInicial ? '→' : ' '}
                        {d.estadosFinais.includes(q) ? '*' : ' '}
                        {q}
                      </th>
                      {simbolosTabela.map((s) => {
                        const dest = d.transicoes.filter((t) => t.de === q && t.simbolo === s).map((t) => t.para);
                        return <td key={s}>{dest.length === 0 ? <span className="vazio">—</span> : det ? dest[0] : conjunto(dest)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="dica">→ estado inicial, * estado final. {det && d.transicoes.length < d.estados.length * d.alfabeto.length ? 'Célula vazia = transição indefinida (rejeita).' : ''}</p>
          </section>
        </aside>

        <section className="execucao" aria-label="Execução">
          <LinhaExecucao valor={entrada} aoMudar={setEntrada} aoExecutar={executar} sugestoes={exemplo?.entradas ?? []} />
          {r && (
            <Veredito veredito={r.veredito} motivo={r.motivo} chave={exec!.chave}>
              {!r.erroEntrada && (
                <>
                  <span className="grafite">{r.veredito === 'ACEITA' ? 'Caminho de aceitação: ' : 'Caminho até parar: '}</span>
                  <span className="caminho">{caminhoTexto(r)}</span>
                </>
              )}
            </Veredito>
          )}
          <Diagrama
            chave={chaveLayout}
            posicoes={layoutFixo}
            estados={d.estados}
            inicial={d.estadoInicial}
            finais={d.estadosFinais}
            arestas={d.transicoes.map((t, i) => ({ id: `t${i}`, de: t.de, para: t.para, rotulo: t.simbolo || LAMBDA }))}
            ativos={r ? ativos : []}
            arestasAtivas={arestasAtivas}
            mortos={mortos}
            juntarRotulos
            descricao={`Diagrama de estados do ${d.tipo} com ${d.estados.length} estados`}
            carimbo={{
              titulo: d.nome ?? d.tipo,
              linhas: [
                ['Tipo', det ? 'AFD' : 'AFN'],
                ['Estados', String(d.estados.length)],
                ['Transições', String(d.transicoes.length)],
                ['Σ', `{${d.alfabeto.join(', ')}}`],
              ],
            }}
          />
          {r && !r.erroEntrada ? (
            <>
              <Fita rotulo="Fita de entrada" celulas={r.simbolos} cabeca={k} estado={det ? ativos[0] ?? '∅' : conjunto(ativos)} entrada />
              <Controles r={rep} ativo={ativo} />
              <div className="tabela-rolagem" style={{ maxHeight: 300 }} ref={tabelaRef}>
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Passo</th>
                      <th>Lê</th>
                      <th>{det ? 'Transição' : 'Estados ativos'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={k === 0 ? 'atual' : ''} data-clicavel onClick={() => rep.irPara(0)}>
                      <td className="mono">0</td>
                      <td className="apagado">—</td>
                      <td className="mono">{det ? `início em ${d.estadoInicial}` : `fecho-λ({${d.estadoInicial}}) = ${conjunto(r.iniciais)}`}</td>
                    </tr>
                    {r.passos.map((p, i) => (
                      <tr key={i} className={i + 1 === k ? 'atual' : i + 1 > k ? 'futuro' : ''} data-clicavel onClick={() => rep.irPara(i + 1)}>
                        <td className="mono">{p.indice}</td>
                        <td className="mono">{p.simbolo}</td>
                        <td className="mono">
                          {det ? `δ(${p.antes[0]}, ${p.simbolo}) = ${p.depois[0] ?? 'indefinida'}` : `${conjunto(p.antes)} → ${conjunto(p.depois)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            !r && <SemExecucao>Digite uma cadeia e clique em Executar para ver o autômato processá-la símbolo a símbolo.</SemExecucao>
          )}
        </section>
      </div>
    </>
  );
}
