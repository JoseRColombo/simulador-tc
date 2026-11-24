# Simulador de Linguagens Formais e Modelos Computacionais

Projeto prático da disciplina **Aspectos Teóricos da Computação** (AV3).

Simulador em **TypeScript** que permite definir e executar, passo a passo:

| Módulo | O que faz |
|---|---|
| 1. Linguagens formais | Define Σ, valida w ∈ Σ*, calcula Σ*, Σ⁺, \|w\|, concatenação; define L (por enumeração, expressão regular ou propriedade) e testa w ∈ L |
| 2. Autômato finito | AFD e AFN (com transições λ) carregados por JSON, execução com passo a passo e caminho de aceitação |
| 3. Gramática livre de contexto | Variáveis, terminais, produções e símbolo inicial; derivação mais à esquerda passo a passo e árvore de derivação |
| 4. Autômato com pilha | Pilha com empilhar/desempilhar; mostra leitura, estado e conteúdo da pilha a cada passo (aⁿbⁿ, n ≥ 1, e parênteses balanceados) |
| 5. Máquina de Turing | Opção A: reconhece { w#w }. Opção B: soma em unário (`000100` → `00000`). Fizemos as duas. |
| 6. Complexidade | Melhor, médio e pior caso em O, Ω e Θ de cada algoritmo, com gráficos medidos na prática |

Dá para usar pelo **terminal** (menu) ou pela **interface gráfica** no navegador (React), que mostra os estados dos autômatos, a pilha e a fita da Máquina de Turing.

---

## Como executar

Pré-requisito: [Node.js](https://nodejs.org) **20.19 ou mais recente** (recomendado: 22 LTS).

```bash
npm install          # instala as dependências (uma vez só)

npm run dev          # interface gráfica em http://localhost:5173
npm run cli          # menu interativo no console
npm run demo         # roda os exemplos do enunciado em todos os módulos (roteiro da apresentação)
npm test             # 112 testes automatizados
npm run build        # gera dist/index.html, que abre com dois cliques no navegador
```

### Comandos diretos no console

```bash
npm run cli -- linguagem "{a,b}" abba
npm run cli -- af  exemplos/afd-enunciado.json ab aba
npm run cli -- af  exemplos/afn-contem-aba.json babab
npm run cli -- glc exemplos/glc-anbn.json aaabbb
npm run cli -- glc "S -> aSb | λ" aaabbb
npm run cli -- ap  exemplos/ap-anbn.json aaabbb
npm run cli -- mt  exemplos/mt-w-hash-w.json 01#01
npm run cli -- mt  exemplos/mt-soma-unaria.json 000100
npm run cli -- complexidade
```

Use `λ` ou `ε` para a cadeia vazia.

---

## Exemplos de entrada e saída

### Módulo 1 — Linguagens formais

```
$ npm run cli -- linguagem "{a,b}" abba abca
Σ = {a, b}
Entrada: abba
Cadeia válida para Σ = {a, b}
Tamanho = 4

Σ = {a, b}
Entrada: abca
Cadeia inválida para Σ = {a, b}: "c" na posição 3
Tamanho = 4
```

Σ* e Σ⁺ até tamanho 2: `{ λ, a, b, aa, ab, ba, bb }` e `{ a, b, aa, ab, ba, bb }`.

### Módulo 2 — Autômato finito (exemplo do enunciado)

Entrada `exemplos/afd-enunciado.json` (q0 –a→ q1, q1 –b→ q2, F = {q2}):

```
Entrada: ab
  Passo 1: δ(q0, a) = q1
  Passo 2: δ(q1, b) = q2
Caminho: q0 -> q1 -> q2
 ACEITA
```

### Módulo 3 — Gramática livre de contexto (S → aSb | λ)

```
Entrada: aaabbb
   1. S  ⇒  aSb        [S → aSb]
   2. aSb  ⇒  aaSbb    [S → aSb]
   3. aaSbb  ⇒  aaaSbbb   [S → aSb]
   4. aaaSbbb  ⇒  aaabbb  [S → λ]

Árvore de derivação
  S
  ├── a
  ├── S
  │   ├── a
  │   ├── S
  │   │   ├── a
  │   │   ├── S
  │   │   │   └── λ
  │   │   └── b
  │   └── b
  └── b
 ACEITA
```

### Módulo 4 — Autômato com pilha (aⁿbⁿ, n ≥ 1)

```
┌───────┬─────────┬────────┬──────────────────┬─────────────────────┬──────────────────────────┐
│ Passo │ Leitura │ Estado │ Entrada restante │ Pilha (topo → base) │ Operação                 │
├───────┼─────────┼────────┼──────────────────┼─────────────────────┼──────────────────────────┤
│ 0     │ —       │ q0     │ aaabbb           │ Z                   │ configuração inicial     │
│ 1     │ a       │ q1     │ aabbb            │ A Z                 │ desempilha Z, empilha AZ │
│ 2     │ a       │ q1     │ abbb             │ A A Z               │ desempilha A, empilha AA │
│ 3     │ a       │ q1     │ bbb              │ A A A Z             │ desempilha A, empilha AA │
│ 4     │ b       │ q2     │ bb               │ A A Z               │ desempilha A             │
│ 5     │ b       │ q2     │ b                │ A Z                 │ desempilha A             │
│ 6     │ b       │ q2     │ λ                │ Z                   │ desempilha A             │
│ 7     │ λ       │ q3     │ λ                │ Z                   │ desempilha Z, empilha Z  │
└───────┴─────────┴────────┴──────────────────┴─────────────────────┴──────────────────────────┘
 ACEITA
```

### Módulo 5 — Máquina de Turing

Opção B, soma unária (`000100` representa 3 + 2):

```
     0  q0   [0] 0  0  1  0  0   δ(q0, 0) = (q0, 0, R)
     3  q0    0  0  0 [1] 0  0   δ(q0, 1) = (q1, 0, R)
     6  q1    0  0  0  0  0  0 [_]  δ(q1, _) = (q2, _, L)
     7  q2    0  0  0  0  0 [0] _   δ(q2, 0) = (qf, _, S)
     8  qf    0  0  0  0  0 [_] _
 ACEITA
Resultado (fita): 00000   →  3 + 2 = 5
```

Opção A, { w#w }: `01#01` → ACEITA em 18 passos; `01#10` → REJEITADA (não há transição para δ(q4, 1)).

### Módulo 6 — Complexidade

`npm run cli -- complexidade` imprime a tabela O/Ω/Θ e mede as operações de cada simulador para entradas crescentes. Resumo:

| Algoritmo | Melhor | Médio | Pior |
|---|---|---|---|
| Validar w ∈ Σ* | Θ(n) | Θ(n) | Θ(n) |
| Gerar Σ* até tamanho k | Θ(k·mᵏ) | Θ(k·mᵏ) | Θ(k·mᵏ) |
| Simulação de AFD | Θ(1) | Θ(n) | Θ(n) |
| Simulação de AFN | Θ(1) | Θ(n·s̄) | Θ(n·(\|Q\|+\|δ\|)) |
| GLC — CYK generalizado | Θ(\|G\|·n³) | Θ(\|G\|·n³) | Θ(\|V\|·\|G\|·n³) |
| AP determinístico | Θ(1) | Θ(n) | Θ(n) |
| MT w#w | Θ(1) | Θ(n) | Θ(n²) |
| MT soma unária | Θ(1) | Θ(n) | Θ(n) |

---

## Formato dos arquivos JSON

Os exemplos prontos ficam na pasta [`exemplos/`](exemplos). Todo símbolo tem **1 caractere** e `λ` (ou `ε`) é a cadeia vazia. Um autômato finito fica assim:

```json
{
  "tipo": "AFD",
  "alfabeto": ["a", "b"],
  "estados": ["q0", "q1", "q2"],
  "estadoInicial": "q0",
  "estadosFinais": ["q2"],
  "transicoes": [
    { "de": "q0", "simbolo": "a", "para": "q1" },
    { "de": "q1", "simbolo": "b", "para": "q2" }
  ]
}
```

A gramática, o autômato com pilha e a Máquina de Turing seguem a mesma ideia; veja os arquivos da pasta `exemplos/`. A gramática também pode ser digitada direto, uma regra por linha (`S -> aSb | λ`).

---

## Validações e casos de erro

- **JSON com erro**: mostra a linha, a coluna e o motivo.
- **Definição inconsistente** (estado que não existe, símbolo fora do alfabeto, AFD com duas saídas para o mesmo símbolo etc.): lista todos os erros encontrados.
- **Cadeia com símbolo fora de Σ**: rejeitada, mostrando a posição do símbolo.
- **Laço infinito** (Máquina de Turing que não para, autômato com pilha com laço λ): o simulador para no limite de passos e responde **INDETERMINADA**, em vez de dar uma resposta errada.

Os testes (`npm test`) comparam cada exemplo com uma verificação por força bruta em todas as cadeias até um certo tamanho, para pegar falso positivo e falso negativo.

---

## Estrutura do projeto

```
src/core/     lógica de cada módulo (linguagens, autômato finito, gramática, pilha, Máquina de Turing, complexidade)
src/cli/      menu no terminal
web/          interface gráfica (React + Vite)
tests/        testes automatizados
exemplos/     autômatos e gramáticas em JSON
```

## Integrantes

- José Ricardo
- Igor Romero
- Thiago Elias

Professor: Ildo Ramos
