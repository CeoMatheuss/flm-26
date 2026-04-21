

# Plano: Refinar Crest Builder Conforme Imagem de Referência

Reorganizar o editor para espelhar exatamente o layout da imagem (3 seções empilhadas: **MODELOS DE ESCUDOS / ANIMAIS / SÍMBOLOS**) e melhorar a responsividade trocando a aba "Forma" por um **botão seletor compacto**.

## 1. Remover aba "Forma" — virar botão seletor compacto

**Arquivo**: `src/components/game/CrestBuilder.tsx`

- Remover `TabsTrigger value="shape"` e `TabsContent value="shape"` (5 abas → 4 abas).
- Acima do preview, adicionar um **botão "Trocar Formato"** que abre um `Popover` (ou `Sheet` no mobile) com o grid de 10 formatos em silhueta preta.
- O botão mostra a forma atual (mini-escudo + label "Clássico", "Gótico", etc.) e ícone de seta.
- Ao selecionar uma forma, o popover fecha automaticamente.
- Ganho: -1 aba, mais espaço para outras opções, layout cabe melhor em telas estreitas.

## 2. Nova aba principal "Modelos" estilo imagem de referência

Substituir a antiga aba "Forma" por uma nova primeira aba **"Modelos"** que reproduz a tela da imagem:

```
─────── MODELOS DE ESCUDOS ───────
[grid 3 cols mobile / 5 cols desktop com 10 escudos prontos
 — combinações curadas: forma + padrão + ícone + cores heráldicas]

─────── ANIMAIS ───────
[grid 4/6 cols com silhuetas pretas dos 15 animais]

─────── SÍMBOLOS ───────
[grid 4/6 cols com 25 símbolos (cruzes, coroas, espadas, etc.)]
```

- **MODELOS DE ESCUDOS** = catálogo de **10 presets curados** (estilo da imagem: leão+escudo gótico vermelho/dourado, cruz templária, águia bizantina, fleur-de-lis royal, castelo medieval, etc.). Clicar aplica o preset completo.
- **ANIMAIS** = grid mono p/b dos 15 animais; clicar troca apenas o `icon`.
- **SÍMBOLOS** = grid mono p/b dos 25 símbolos; clicar troca apenas o `icon`.

Tudo numa única `ScrollArea` vertical (como na imagem), não 3 sub-abas.

## 3. Nova estrutura de abas (4 abas em vez de 5)

```
[ Modelos ] [ Divisão ] [ Cores ] [ Extras ]
```

- "Modelos" = nova aba principal (item 2)
- "Divisão" = mantém atual (layout patterns)
- "Cores" = mantém atual
- "Extras" = mantém atual (coroa, louros, estrelas, faixa, ajustes)
- A aba "Símbolo" antiga é absorvida pela "Modelos" (animais + símbolos no mesmo lugar).

## 4. Botão "Trocar Formato" no painel de preview

```
┌─────────────────────────┐
│       PREVIEW           │
│   [escudo grande]       │
│                         │
│ [ 🛡️ Clássico  ▾ ]      │ ← novo botão (abre popover com 10 formas)
│ [Aleatório] [Resetar]   │
│ [   Salvar Escudo   ]   │
└─────────────────────────┘
```

- Mobile: ocupa 100% da largura
- Desktop: ocupa a coluna do preview (260px)

## 5. Presets de "Modelos de Escudos" (combinações curadas)

Definir constante `SHIELD_PRESETS` com 10 combinações inspiradas na imagem:

```typescript
const SHIELD_PRESETS: Array<Partial<ShieldConfig> & { name: string }> = [
  { name: 'Cruz Templária',   shape: 'gothic',  pattern: 'cross',    icon: 'cross-pattee', primaryColor: '#000000', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF' },
  { name: 'Lis Real',         shape: 'classic', pattern: 'per-pale', icon: 'fleur-de-lis', primaryColor: '#000080', secondaryColor: '#FFFFFF', detailColor: '#FFD700' },
  { name: 'Leão Rampante',    shape: 'gothic',  pattern: 'solid',    icon: 'lion',         primaryColor: '#1A1A1A', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF' },
  { name: 'Águia Imperial',   shape: 'classic', pattern: 'solid',    icon: 'eagle-icon',   primaryColor: '#000000', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF' },
  { name: 'Quartelado Lis',   shape: 'classic', pattern: 'quartered',icon: 'fleur-de-lis', primaryColor: '#0D47A1', secondaryColor: '#FFFFFF', detailColor: '#FFD700' },
  { name: 'Banda Diagonal',   shape: 'classic', pattern: 'per-bend', icon: 'none',         primaryColor: '#1A1A1A', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF' },
  { name: 'Cruz Pattée',      shape: 'pointed', pattern: 'solid',    icon: 'cross-pattee', primaryColor: '#1A1A1A', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF' },
  { name: 'Pala Vertical',    shape: 'classic', pattern: 'per-pale', icon: 'none',         primaryColor: '#1A1A1A', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF' },
  { name: 'Castelo Medieval', shape: 'classic', pattern: 'solid',    icon: 'castle',       primaryColor: '#1A1A1A', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF' },
  { name: 'Coroa Listrada',   shape: 'classic', pattern: 'stripes',  icon: 'crown-icon',   primaryColor: '#1A1A1A', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF' },
];
```

Renderizados em mini-escudos (52×52) preto sobre branco (igual à imagem). Clicar aplica o preset completo via `onChange({ ...value, ...preset })`.

## 6. Melhorias de responsividade

- Layout principal: mobile empilha (preview em cima, abas embaixo); desktop usa grid `[260px_1fr]` como hoje, mas com `lg:grid-cols-[280px_1fr]` para mais respiro em telas grandes.
- Tabs: ícones pequenos + labels curtos, já compactos.
- Reduzir altura mínima do `ScrollArea` em mobile (`h-[280px]` em vez de `h-[340px]`) para evitar scroll duplo.
- Grids dos catálogos:
  - Modelos: `grid-cols-3 sm:grid-cols-4 lg:grid-cols-5`
  - Animais/Símbolos: `grid-cols-4 sm:grid-cols-5 lg:grid-cols-6`
- Botão "Trocar Formato" colapsa para `w-full` em mobile.

## Arquivo Modificado

| Arquivo | Mudança |
|---|---|
| `src/components/game/CrestBuilder.tsx` | Remove aba "Forma"; adiciona botão "Trocar Formato" no preview com Popover; nova aba "Modelos" agrupando presets + animais + símbolos em layout vertical estilo da imagem; importa `Popover`/`PopoverTrigger`/`PopoverContent` do shadcn; define `SHIELD_PRESETS`; ajusta grids para melhor responsividade |

## Compatibilidade

- `ShieldConfig` não muda
- Saves antigos continuam funcionando
- Nenhuma mudança em outros arquivos, DB ou Edge Functions

