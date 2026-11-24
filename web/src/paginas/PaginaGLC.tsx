import { useEffect, useMemo, useRef, useState } from 'react';
import { EXEMPLOS_GLC, formaParaTexto, GramaticaLC, LAMBDA, type ResultadoGLC } from '../../../src/core/index';
import { Arvore } from '../componentes/Arvore';
import { Controles, useReproducao } from '../componentes/Controles';
import { Editor, Mensagens, useDefinicao } from '../componentes/Editor';
import { LinhaExecucao, Veredito } from '../componentes/Veredito';
import { Cabecalho, SeletorExemplo, SemExecucao, useRolarAtual } from './comum';

/** Exemplo (JSON) → texto de produções, que é mais fácil de editar. */
const textoDoExemplo = (json: Record<string, unknown>) => (json.producoes as string[]).join('\n');

export function PaginaGLC({ ativo }: { ativo: boolean }) {
  const [exemploId, setExemploId] = useState(EXEMPLOS_GLC[0].id);
  const [texto, setTexto] = useState(() => textoDoExemplo(EXEMPLOS_GLC[0].json));
  const def = useDefinicao(texto, (t) => GramaticaLC.deJSON(t));
  const g = def.modelo;
  const [entrada, setEntrada] = useState(EXEMPLOS_GLC[0].entradas[0]);
  const [exec, setExec] = useState<{ r: ResultadoGLC; chave: number } | null>(null);
  const [erroExec, setErroExec] = useState<string | null>(null);
  const contador = useRef(0);

  useEffect(() => setExec(null), [g]);

  const executar = (w = entrada) => {
    if (!g) return;
    try {
      contador.current++;
      setErroExec(null);
      setExec({ r: g.reconhecer(w), chave: contador.current });
    } catch (e) {
      setExec(null);
      setErroExec(e instanceof Error ? e.message : String(e));
    }
  };

  const r = exec?.r;
  const passos = r?.derivacao ?? [];
  const total = r?.veredito === 'ACEITA' ? passos.length + 1 : 1;
  const rep = useReproducao(total, exec?.chave ?? 0, ativo);
  const k = Math.min(rep.passo, total - 1);
  const listaRef = useRolarAtual<HTMLOListElement>(`${k}-${exec?.chave}`);

  const visiveis = useMemo(() => {
    const s = new Set<number>();
    if (!r?.arvore) return s;
    s.add(r.arvore.id);
    const porId = new Map<number, typeof r.arvore>();
    const indexar = (n: typeof r.arvore) => {
      porId.set(n.id, n);
      n.filhos.forEach(indexar);
    };
    indexar(r.arvore);
    for (let i = 0; i < k; i++) for (const f of porId.get(passos[i].noId)?.filhos ?? []) s.add(f.id);
    return s;
  }, [r, k, passos]);

  const exemplo = EXEMPLOS_GLC.find((e) => e.id === exemploId);

  if (!g) {
    return (
      <>
        <Cabecalho titulo="Gramática livre de contexto" tupla="G = (V, T, P, S)" />
        <Editor rotulo="Produções" valor={texto} aoMudar={setTexto} erros={def.erros} avisos={[]} nomeArquivo="gramatica.txt" formatoJSON={false} />
      </>
    );
  }
  const d = g.definicao;
  const porCabeca = new Map<string, string[]>();
  for (const p of d.producoes) porCabeca.set(p.cabeca, [...(porCabeca.get(p.cabeca) ?? []), p.corpo.length ? p.corpo.join('') : LAMBDA]);
  const formas = [[d.inicial], ...passos.map((p) => p.resultado)];

  return (
    <>
      <Cabecalho titulo="Gramática livre de contexto" tupla={<>G = (V, T, P, S) — <em>{g.classificar()}</em></>} />
      <div className="bancada">
        <aside className="definicao" aria-label="Definição da gramática">
          <SeletorExemplo
            exemplos={EXEMPLOS_GLC}
            valor={exemploId}
            aoEscolher={(e) => {
              setExemploId(e.id);
              setTexto(textoDoExemplo(e.json));
              setEntrada(e.entradas[0]);
            }}
          />
          <Editor
            rotulo="Produções"
            valor={texto}
            aoMudar={(v) => {
              setTexto(v);
              setExemploId('');
            }}
            erros={def.erros}
            avisos={def.avisos}
            desatualizado
            nomeArquivo="gramatica.txt"
            formatoJSON={false}
            linhas={7}
          />
          <p className="dica">
            Uma regra por linha, como <code>S -&gt; aSb | λ</code>. Letras maiúsculas são variáveis; os demais símbolos, terminais. O lado esquerdo da 1ª regra é o símbolo inicial. Também aceita JSON com <code>variaveis</code>, <code>terminais</code>, <code>inicial</code> e <code>producoes</code>.
          </p>
          <section className="bloco">
            <h2>Componentes de G</h2>
            <dl className="ficha">
              <dt>Variáveis V</dt>
              <dd>{`{${d.variaveis.join(', ')}}`}</dd>
              <dt>Terminais T</dt>
              <dd>{`{${d.terminais.join(', ')}}`}</dd>
              <dt>Inicial S</dt>
              <dd>{d.inicial}</dd>
              <dt>Produções P</dt>
              <dd>
                {[...porCabeca].map(([cab, corpos]) => (
                  <div key={cab}>
                    {cab} → {corpos.join(' | ')}
                  </div>
                ))}
              </dd>
            </dl>
          </section>
        </aside>

        <section className="execucao" aria-label="Derivação">
          <LinhaExecucao valor={entrada} aoMudar={setEntrada} aoExecutar={executar} sugestoes={exemplo?.entradas ?? []} />
          {erroExec && <Mensagens erros={[erroExec]} />}
          {r && (
            <Veredito veredito={r.veredito} motivo={r.motivo} chave={exec!.chave}>
              {r.veredito === 'ACEITA' && (
                <span className="caminho">
                  {formas.map((f, i) => (
                    <span key={i}>
                      {i > 0 && <span className="seta-der">⇒</span>}
                      {formaParaTexto(f)}
                    </span>
                  ))}
                </span>
              )}
            </Veredito>
          )}
          {r?.veredito === 'ACEITA' && r.arvore ? (
            <>
              <Controles r={rep} ativo={ativo} rotulo="Derivação" />
              <div className="dupla-igual">
                <div className="bloco">
                  <h2>Árvore de derivação</h2>
                  <div className="arvore-caixa">
                    <Arvore raiz={r.arvore} visiveis={visiveis} destaque={k > 0 ? passos[k - 1].noId : undefined} proximo={passos[k]?.noId} />
                  </div>
                </div>
                <div className="bloco">
                  <h2>Derivação mais à esquerda</h2>
                  <ol className="derivacao" ref={listaRef}>
                    {formas.map((f, i) => {
                      const pos = passos[i]?.posicao ?? -1;
                      return (
                        <li key={i} className={i === k ? 'atual' : i > k ? 'futuro' : ''} onClick={() => rep.irPara(i)}>
                          <span className="n">{i === 0 ? '' : '⇒'}</span>
                          <span className="forma">
                            {f.length === 0 ? LAMBDA : f.map((s, j) => (j === pos ? <mark key={j}>{s}</mark> : <span key={j}>{s}</span>))}
                          </span>
                          {i > 0 && <span className="prod">{passos[i - 1].producao}</span>}
                        </li>
                      );
                    })}
                  </ol>
                  <p className="dica">Em amarelo, a variável mais à esquerda — a próxima a ser substituída.</p>
                </div>
              </div>
            </>
          ) : (
            !r && !erroExec && <SemExecucao>Digite uma cadeia e clique em Executar para ver a derivação passo a passo e a árvore crescendo.</SemExecucao>
          )}
        </section>
      </div>
    </>
  );
}
