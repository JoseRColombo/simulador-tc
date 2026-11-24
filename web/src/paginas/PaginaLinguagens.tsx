import { useMemo, useRef, useState } from 'react';
import {
  Alfabeto,
  concatenar,
  ErroDefinicao,
  exibir,
  LAMBDA,
  Linguagem,
  normalizarCadeia,
  PROPRIEDADES,
  tamanho,
  type IdPropriedade,
} from '../../../src/core/index';
import { Mensagens } from '../componentes/Editor';
import { Cabecalho } from './comum';

function tentar<T>(f: () => T): { valor: T | null; erros: string[] } {
  try {
    return { valor: f(), erros: [] };
  } catch (e) {
    return { valor: null, erros: e instanceof ErroDefinicao ? e.erros : [String(e)] };
  }
}

const SOBRESCRITO: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sobrescrito = (n: number) => String(n).split('').map((c) => SOBRESCRITO[c]).join('');

function Celulas({ cadeia, invalidas = new Set<number>() }: { cadeia: string; invalidas?: Set<number> }) {
  const s = Array.from(cadeia);
  if (s.length === 0)
    return (
      <div className="cadeia-celulas vazia">
        <span className="c">{LAMBDA}</span>
      </div>
    );
  return (
    <div className="cadeia-celulas" style={{ marginBottom: '1rem' }}>
      {s.map((c, i) => (
        <span key={i} className={`c${invalidas.has(i + 1) ? ' invalido' : ''}`}>
          {c}
          <small>{i + 1}</small>
        </span>
      ))}
    </div>
  );
}

export function PaginaLinguagens() {
  const [textoSigma, setTextoSigma] = useState('{a, b}');
  const sigmaR = useMemo(() => tentar(() => Alfabeto.deTexto(textoSigma)), [textoSigma]);
  // enquanto o usuário digita um Σ inválido, continua usando o último válido
  const ultimo = useRef<Alfabeto>(Alfabeto.deTexto('{a, b}'));
  if (sigmaR.valor) ultimo.current = sigmaR.valor;
  const sigma = sigmaR.valor ?? ultimo.current;
  const ultimoSigma = ultimo.current;

  const [w, setW] = useState('abba');
  const val = sigma.validar(w);

  const [modoEstrela, setModoEstrela] = useState<'estrela' | 'positivo'>('estrela');
  const maxK = Math.max(1, Math.floor(Math.log(3000) / Math.log(Math.max(2, sigma.tamanho))));
  const [k, setK] = useState(3);
  const kEf = Math.min(k, maxK);
  const potencias = useMemo(() => {
    const de = modoEstrela === 'estrela' ? 0 : 1;
    return Array.from({ length: kEf - de + 1 }, (_, i) => ({ i: i + de, ...sigma.potencia(i + de, 400) }));
  }, [sigma, kEf, modoEstrela]);
  const totalEstrela = modoEstrela === 'estrela' ? sigma.estrela(kEf, 1).total : sigma.positivo(kEf, 1).total;

  const [u, setU] = useState('ab');
  const [v, setV] = useState('ba');
  const uv = concatenar(u, v);
  const foraDeSigma = [u, v].filter((x) => !sigma.validar(x).valida).map((x) => `"${normalizarCadeia(x)}"`);

  const [tipoL, setTipoL] = useState<'finita' | 'regular' | 'propriedade'>('regular');
  const [textoFinita, setTextoFinita] = useState('ab, ba, aab, λ');
  const [textoER, setTextoER] = useState('(a + b)*abb');
  const [prop, setProp] = useState<IdPropriedade>('anbn');
  const LR = useMemo(
    () =>
      tentar(() =>
        new Linguagem(
          sigma,
          tipoL === 'finita' ? { tipo: 'finita', cadeias: textoFinita.split(',') } : tipoL === 'regular' ? { tipo: 'regular', expressao: textoER } : { tipo: 'propriedade', id: prop },
        ),
      ),
    [sigma, tipoL, textoFinita, textoER, prop],
  );
  const [wL, setWL] = useState('babb');
  const [kL, setKL] = useState(4);
  const L = LR.valor;
  const pert = L?.pertence(wL);
  const membros = useMemo(() => (L ? L.enumerar(Math.min(kL, maxK + 2), 300) : null), [L, kL, maxK]);

  return (
    <>
      <Cabecalho titulo="Linguagens formais" tupla={<>Σ alfabeto, w ∈ Σ* cadeia, L ⊆ Σ* linguagem</>} />
      <div className="folha-larga">
        <section className="secao-ling" aria-labelledby="t-sigma">
          <header>
            <h2 id="t-sigma">Alfabeto Σ</h2>
            <p>Conjunto finito e não vazio de símbolos. Cada símbolo tem um caractere.</p>
          </header>
          <div>
            <label className="campo">
              <span>Σ =</span>
              <input className="entrada mono" value={textoSigma} onChange={(e) => setTextoSigma(e.target.value)} aria-invalid={sigmaR.erros.length > 0} spellCheck={false} />
            </label>
            <Mensagens erros={sigmaR.erros} avisos={sigmaR.valor?.avisos ?? []} infos={sigmaR.erros.length ? [`Continuando com Σ = ${ultimoSigma}.`] : []} />
            <div className="fichas-simbolos" aria-label="Símbolos de Σ">
              {sigma.simbolos.map((s) => (
                <span key={s} className="ficha-simbolo">
                  {s}
                </span>
              ))}
            </div>
            <p className="dica">|Σ| = {sigma.tamanho}</p>
          </div>
        </section>

        <section className="secao-ling" aria-labelledby="t-cadeia">
          <header>
            <h2 id="t-cadeia">Validar cadeia</h2>
            <p>Verifica se w ∈ Σ*, ou seja, se todos os símbolos de w pertencem a Σ, e calcula |w|.</p>
          </header>
          <div>
            <label className="campo">
              <span>w =</span>
              <input className="entrada mono" value={w} onChange={(e) => setW(e.target.value)} spellCheck={false} placeholder="λ para a cadeia vazia" />
            </label>
            <Celulas cadeia={val.cadeia} invalidas={new Set(val.invalidos.map((s) => s.posicao))} />
            <p className="resultado-linha">
              <strong className={val.valida ? 'ok' : 'erro'}>{val.valida ? 'Cadeia válida para Σ' : 'Cadeia inválida para Σ'}</strong>
              <br />
              Tamanho = {val.tamanho}
            </p>
            {!val.valida && <Mensagens erros={[val.invalidos.map((s) => `"${s.simbolo}" na posição ${s.posicao} não pertence a Σ = ${sigma}`).join('; ')]} />}
          </div>
        </section>

        <section className="secao-ling" aria-labelledby="t-estrela">
          <header>
            <h2 id="t-estrela">Fecho de Kleene</h2>
            <p>Σ* = Σ⁰ ∪ Σ¹ ∪ Σ² ∪ … inclui λ. Σ⁺ = Σ* − {'{λ}'}. Ambos são infinitos, então listamos até um tamanho k.</p>
          </header>
          <div>
            <div className="linha-campos">
              <div className="segmentado" role="group" aria-label="Escolha Σ* ou Σ⁺">
                <button type="button" aria-pressed={modoEstrela === 'estrela'} onClick={() => setModoEstrela('estrela')}>
                  Σ*
                </button>
                <button type="button" aria-pressed={modoEstrela === 'positivo'} onClick={() => setModoEstrela('positivo')}>
                  Σ⁺
                </button>
              </div>
              <label className="opcoes-linha">
                até tamanho k =
                <select className="entrada" style={{ width: '4.5rem', minHeight: '2rem', padding: '0.1rem 1.6rem 0.1rem 0.5rem' }} value={kEf} onChange={(e) => setK(Number(e.target.value))}>
                  {Array.from({ length: maxK + 1 }, (_, i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="potencias">
              {potencias.map((p) => (
                <div key={p.i} className="linha-pot">
                  <span className="rotulo-pot">Σ{sobrescrito(p.i)}</span>
                  <span className="palavras">
                    {p.cadeias.map((c) => (
                      <span key={c}>{exibir(c)}</span>
                    ))}
                    {p.truncado && <span className="apagado">…</span>}
                  </span>
                  <span className="qtd">
                    {p.total.toString()} cadeia{p.total === 1n ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
            <p className="dica">
              Total com tamanho ≤ {kEf}: <b className="mono">{totalEstrela.toString()}</b> = {modoEstrela === 'estrela' ? `Σᵢ₌₀ᵏ |Σ|ⁱ` : `Σᵢ₌₁ᵏ |Σ|ⁱ`}. Cresce como |Σ|ᵏ: exponencial em k.
            </p>
          </div>
        </section>

        <section className="secao-ling" aria-labelledby="t-op">
          <header>
            <h2 id="t-op">Operações com cadeias</h2>
            <p>Concatenação e tamanho. λ é o elemento neutro da concatenação.</p>
          </header>
          <div>
            <div className="linha-campos">
              <label className="campo">
                <span>u =</span>
                <input className="entrada mono" value={u} onChange={(e) => setU(e.target.value)} spellCheck={false} />
              </label>
              <label className="campo">
                <span>v =</span>
                <input className="entrada mono" value={v} onChange={(e) => setV(e.target.value)} spellCheck={false} />
              </label>
            </div>
            <div className="operacoes-grade">
              <div className="equacao">
                <small>Concatenação u·v</small>
                {exibir(uv)}
              </div>
              <div className="equacao">
                <small>Concatenação v·u</small>
                {exibir(concatenar(v, u))}
              </div>
              <div className="equacao">
                <small>Tamanhos</small>|u| = {tamanho(u)}, |v| = {tamanho(v)}, |uv| = {tamanho(uv)}
              </div>
            </div>
            {foraDeSigma.length > 0 && <Mensagens avisos={[`${foraDeSigma.join(' e ')} não pertence(m) a Σ*; as operações funcionam, mas o resultado também fica fora de Σ*.`]} />}
          </div>
        </section>

        <section className="secao-ling" aria-labelledby="t-l">
          <header>
            <h2 id="t-l">Linguagem L</h2>
            <p>Um subconjunto de Σ*. Defina L listando cadeias, por expressão regular ou por uma propriedade.</p>
          </header>
          <div>
            <div className="segmentado" role="group" aria-label="Como definir L">
              {(
                [
                  ['finita', 'Listar cadeias'],
                  ['regular', 'Expressão regular'],
                  ['propriedade', 'Propriedade'],
                ] as const
              ).map(([id, nome]) => (
                <button key={id} type="button" aria-pressed={tipoL === id} onClick={() => setTipoL(id)}>
                  {nome}
                </button>
              ))}
            </div>
            {tipoL === 'finita' && (
              <label className="campo">
                <span>Cadeias de L, separadas por vírgula</span>
                <input className="entrada mono" value={textoFinita} onChange={(e) => setTextoFinita(e.target.value)} spellCheck={false} />
              </label>
            )}
            {tipoL === 'regular' && (
              <>
                <label className="campo">
                  <span>Expressão regular</span>
                  <input className="entrada mono" value={textoER} onChange={(e) => setTextoER(e.target.value)} spellCheck={false} aria-invalid={LR.erros.length > 0} />
                </label>
                <p className="dica">
                  <code>+</code> ou <code>|</code> união, <code>*</code> fecho de Kleene, <code>⁺</code> fecho positivo, <code>?</code> opcional, <code>λ</code> cadeia vazia, <code>∅</code> vazia, parênteses para agrupar.
                </p>
              </>
            )}
            {tipoL === 'propriedade' && (
              <label className="campo">
                <span>Propriedade</span>
                <select className="entrada" value={prop} onChange={(e) => setProp(e.target.value as IdPropriedade)}>
                  {PROPRIEDADES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.notacao} — {p.descricao}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Mensagens erros={LR.erros} avisos={L?.avisos ?? []} />
            {L && (
              <>
                <div className="notacao-l">{L.notacao}</div>
                <div className="linha-campos">
                  <label className="campo">
                    <span>Testar w ∈ L</span>
                    <input className="entrada mono" value={wL} onChange={(e) => setWL(e.target.value)} spellCheck={false} />
                  </label>
                </div>
                {pert && (
                  <p className="resultado-linha">
                    <strong className={pert.pertence ? 'ok' : 'erro'}>
                      {exibir(pert.cadeia)} {pert.pertence ? '∈' : '∉'} L
                    </strong>
                    <br />
                    <span className="grafite" style={{ fontSize: 'var(--t-14)' }}>
                      {pert.motivo}
                    </span>
                  </p>
                )}
                <div className="linha-campos">
                  <label className="opcoes-linha">
                    Cadeias de L com tamanho até
                    <select className="entrada" style={{ width: '4.5rem', minHeight: '2rem', padding: '0.1rem 1.6rem 0.1rem 0.5rem' }} value={kL} onChange={(e) => setKL(Number(e.target.value))}>
                      {[2, 3, 4, 5, 6, 7, 8].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </label>
                </div>
                {membros && (
                  <p className="mono" style={{ margin: 0, overflowWrap: 'anywhere' }}>
                    {membros.cadeias.length ? `{ ${membros.cadeias.map(exibir).join(', ')}${membros.truncado ? ', …' : ''} }` : '∅'}
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
