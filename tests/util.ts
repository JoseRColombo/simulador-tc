/** Todas as cadeias sobre `alfabeto` com tamanho 0..maxK (oráculo de força bruta). */
export function todasCadeias(alfabeto: string[], maxK: number): string[] {
  const out: string[] = [''];
  let nivel = [''];
  for (let k = 1; k <= maxK; k++) {
    const prox: string[] = [];
    for (const w of nivel) for (const a of alfabeto) prox.push(w + a);
    out.push(...prox);
    nivel = prox;
  }
  return out;
}

/** Gerador pseudoaleatório determinístico (testes reprodutíveis). */
export function rng(semente: number): () => number {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
