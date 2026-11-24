/** Editor de definição (JSON ou texto) com números de linha, abrir/baixar arquivo e validação ao vivo. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ErroDefinicao } from '../../../src/core/index';
import { IconeAbrir, IconeAlerta, IconeBaixar, IconeErro, IconeFormatar, IconeInfo } from './icones';

export function useDefinicao<T extends { avisos: string[] }>(texto: string, criar: (t: string) => T) {
  const calcular = (t: string) => {
    try {
      return { modelo: criar(t), erros: [] as string[] };
    } catch (e) {
      if (e instanceof ErroDefinicao) return { modelo: null, erros: e.erros };
      return { modelo: null, erros: [e instanceof Error ? e.message : String(e)] };
    }
  };
  const [estado, setEstado] = useState(() => calcular(texto));
  const [ultimoValido, setUltimoValido] = useState<T | null>(estado.modelo);
  const primeira = useRef(true);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const t = setTimeout(() => {
      const r = calcular(texto);
      setEstado(r);
      if (r.modelo) setUltimoValido(r.modelo);
    }, 260);
    return () => clearTimeout(t);
  }, [texto]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    modelo: ultimoValido,
    valido: estado.modelo !== null,
    erros: estado.erros,
    avisos: estado.modelo?.avisos ?? [],
  };
}

export function Mensagens({ erros = [], avisos = [], infos = [] }: { erros?: string[]; avisos?: string[]; infos?: ReactNode[] }) {
  if (!erros.length && !avisos.length && !infos.length) return null;
  return (
    <ul className="mensagens" aria-live="polite">
      {erros.map((m, i) => (
        <li key={`e${i}`} className="erro">
          <IconeErro />
          <span>{m}</span>
        </li>
      ))}
      {avisos.map((m, i) => (
        <li key={`a${i}`} className="aviso">
          <IconeAlerta />
          <span>{m}</span>
        </li>
      ))}
      {infos.map((m, i) => (
        <li key={`i${i}`} className="info">
          <IconeInfo />
          <span>{m}</span>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  valor: string;
  aoMudar: (v: string) => void;
  erros: string[];
  avisos: string[];
  /** usando a última versão válida? */
  desatualizado?: boolean;
  nomeArquivo: string;
  linhas?: number;
  rotulo: string;
  formatoJSON?: boolean;
}

export function Editor({ valor, aoMudar, erros, avisos, desatualizado, nomeArquivo, linhas = 16, rotulo, formatoJSON = true }: Props) {
  const [rolagem, setRolagem] = useState(0);
  const arquivo = useRef<HTMLInputElement>(null);
  const qtdLinhas = valor.split('\n').length;

  const abrir = async (f: File | undefined) => {
    if (!f) return;
    aoMudar(await f.text());
    if (arquivo.current) arquivo.current.value = '';
  };
  const baixar = () => {
    const blob = new Blob([valor], { type: formatoJSON ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const formatar = () => {
    try {
      aoMudar(JSON.stringify(JSON.parse(valor), null, 2));
    } catch {
      /* o erro de sintaxe já aparece na lista */
    }
  };

  return (
    <div className="bloco">
      <header>
        <h2>{rotulo}</h2>
        <div className="grupo-botoes">
          <button type="button" className="botao pequeno fantasma" onClick={() => arquivo.current?.click()} title="Carregar arquivo do computador">
            <IconeAbrir /> Abrir
          </button>
          <button type="button" className="botao pequeno fantasma" onClick={baixar} title="Salvar como arquivo">
            <IconeBaixar /> Baixar
          </button>
          {formatoJSON && (
            <button type="button" className="botao pequeno fantasma" onClick={formatar} title="Reindentar o JSON">
              <IconeFormatar /> Formatar
            </button>
          )}
        </div>
        <input ref={arquivo} type="file" accept={formatoJSON ? '.json,application/json' : '.txt,.json,text/plain'} hidden onChange={(e) => abrir(e.target.files?.[0])} />
      </header>
      <div className={`editor${erros.length ? ' com-erro' : ''}`}>
        <pre className="numeros" aria-hidden="true" style={{ width: `calc(${String(qtdLinhas).length}ch + 1.3rem)` }}>
          <div style={{ transform: `translateY(${-rolagem}px)` }}>{Array.from({ length: qtdLinhas }, (_, i) => i + 1).join('\n')}</div>
        </pre>
        <textarea
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          onScroll={(e) => setRolagem(e.currentTarget.scrollTop)}
          spellCheck={false}
          rows={linhas}
          aria-label={rotulo}
          aria-invalid={erros.length > 0}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: a, selectionEnd: b } = el;
              aoMudar(valor.slice(0, a) + '  ' + valor.slice(b));
              requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
            }
          }}
        />
      </div>
      <Mensagens erros={erros} avisos={avisos} infos={desatualizado && erros.length ? ['A visualização continua usando a última versão válida até o erro ser corrigido.'] : []} />
    </div>
  );
}
