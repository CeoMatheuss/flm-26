

# Plano: Crest Builder Heráldico Profissional (Estilo Europeu Tradicional)

Refinar o `CrestBuilder` existente para parecer com a imagem de referência: escudos heráldicos clássicos com silhuetas fortes em alto contraste, organização limpa por seções (MODELOS / ANIMAIS / SÍMBOLOS) e melhor responsividade.

## 1. Novos ícones heráldicos realistas

**Arquivo**: `src/components/game/ShieldCrest.tsx`

Refazer/melhorar as silhuetas para ficarem mais robustas e reconhecíveis (estilo brasão europeu tradicional, não cartoon):

- **Animais** (refinar os existentes + adicionar): `lion-rampant` (leão em pé heráldico), `lion-head` (juba dramática), `eagle-rampant` (águia de asas abertas estilo Roma), `eagle-head`, `wolf-howling`, `horse-rampant` (cavalo empinado), `bear-standing`, `bull-head`, `dragon-rampant`, `panther-leaping`, `falcon`, `phoenix-rising`
- **Símbolos heráldicos**: `cross-templar`, `cross-celtic`, `cross-orthodox`, `crown-royal` (3 níveis), `crown-imperial`, `fleur-de-lis-trio`, `fleur-de-lis-single`, `laurel-wreath` (grinalda completa), `crossed-axes`, `crossed-spears`, `arrows-three`, `castle-tower`, `castle-fortified`, `star-compass`, `crescent`, `sun-rays`, `wings-spread`, `letter-monogram` (S P Q R style)

Cada ícone redesenhado com:
- **Silhueta densa** (preenchimento sólido em `dc`, sem traços finos cartoon)
- **Proporção heráldica** ocupando 60–70% da área do escudo
- **Detalhes mínimos** em `sc` apenas onde necessário (olhos, contraste interno)

## 2. Nova divisão interna do escudo (heráldica clássica)

Adicionar 3 novos `shieldPatterns` que faltam para o look europeu:

- `quartered` — 4 quadrantes alternados (clássico brasão real)
- `per-pale` — meio a meio vertical com cores invertidas
- `per-bend` — divisão diagonal limpa (sem opacidade)
- `bordure` — escudo interno com borda colorida grossa
- `chief` — faixa horizontal sólida no topo (1/3 superior)

Reescrever os patterns existentes (`split`, `quarters`, `cross`) para usar **cores sólidas a 100%** (sem `opacity={0.6}`) e linhas de divisão pretas finas como divisórias heráldicas autênticas.

## 3. Redesign visual do CrestBuilder (organização tipo referência)

**Arquivo**: `src/components/game/CrestBuilder.tsx`

### 3.1 Layout geral responsivo

- Mobile (`<sm`): preview no topo (180px), abas embaixo, scroll vertical natural
- Tablet (`sm`–`md`): preview lateral fixa 220px, abas em coluna direita
- Desktop (`md+`): preview 280px com card elegante, abas com mais respiro
- Remover `aspect-square` rígido do preview → usar altura controlada para evitar corte

### 3.2 Aba "Símbolo" reformulada (estilo da imagem de referência)

Em vez de tabs internas (Animais / Símbolos / Letras), exibir **três seções empilhadas** com títulos centralizados estilo "MODELOS DE ESCUDOS / ANIMAIS / SÍMBOLOS" da imagem:

```
─────── ANIMAIS ───────
[grid 4 cols mobile / 6 cols desktop com silhuetas pretas]

─────── SÍMBOLOS ───────
[grid 4/6 cols com cruzes, coroas, espadas, etc.]

─────── LETRAS ───────
[grid 7 cols com letras estilizadas]
```

Cada item:
- Quadrado branco com borda fina cinza
- Silhueta preta (não usa as cores do escudo no preview do ícone — fica monocromático para clareza, igual à referência)
- Selecionado → borda primária + fundo levemente azulado
- Hover → leve zoom + sombra

### 3.3 Aba "Forma" reformulada

- Grid responsivo: 3 cols mobile, 5 cols desktop
- Cada forma renderizada em **alto contraste preto sobre branco** (silhueta limpa) — não usa as cores atuais, fica como catálogo de formatos
- Label maior (12px) abaixo
- Selecionado destacado com ring azul + scale leve

### 3.4 Aba "Layout" idem

- Mostra o padrão aplicado em cores neutras (cinza escuro / branco) para ficar claro o desenho da divisão
- Grid 3/5 cols responsivo

### 3.5 Painel de preview elegante

- Fundo limpo creme/off-white (`#FAF7F2`) — não mais xadrez cinza (que polui)
- Sombra dupla sutil no escudo (`drop-shadow-2xl` + leve glow do `primaryColor`)
- Pequeno título "PREVIEW" em caps tracking-widest acima
- Largura/altura adaptativos por viewport
- Preview maior em desktop (240px), menor em mobile (160px)

### 3.6 Botões aprimorados

- "🎲 Aleatório" — gera combinação heráldica curada (não totalmente random — pega de pools válidos: forma clássica + animal + cor escura + dourado)
- "💾 Salvar" — em destaque
- Adicionar "↺ Resetar" (volta ao default)

## 4. Paleta heráldica curada

Substituir `CURATED_PAIRS` por paletas inspiradas em clubes europeus tradicionais:

```typescript
const HERALDIC_PAIRS = [
  ['#8B0000', '#FFD700', '#FFFFFF'], // Vermelho/dourado (Roma/Bayern)
  ['#000080', '#FFFFFF', '#FFD700'], // Marinho/branco/dourado (Real)
  ['#000000', '#FFFFFF', '#C0392B'], // Preto/branco/vermelho (Juve)
  ['#1B5E20', '#FFFFFF', '#FFD700'], // Verde/branco (Sporting)
  ['#0D47A1', '#E53935', '#FFFFFF'], // Azul/vermelho (Barça)
  ['#4A148C', '#FFFFFF', '#FFD700'], // Roxo/branco
  ['#B71C1C', '#FFFFFF', '#000000'], // Vermelho/branco/preto
  ['#1A1A1A', '#FFD700', '#B8860B'], // Preto/dourado (premium)
];
```

## 5. Responsividade do bloco no ClubCreation

**Arquivo**: `src/components/game/ClubCreation.tsx`

- O `<CrestBuilder>` precisa caber bem em modal/page de criação. Garantir `max-w-3xl mx-auto` e padding adequado.
- Verificar overflow em telas pequenas (sem corte horizontal).

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/game/ShieldCrest.tsx` | +12 ícones heráldicos densos, refinar silhuetas existentes, +5 patterns clássicos (quartered, per-pale, per-bend, bordure, chief), divisões com cores sólidas |
| `src/components/game/CrestBuilder.tsx` | Aba Símbolo com 3 seções tituladas estilo referência, ícones em mono p/b, preview com fundo creme + título PREVIEW, paleta heráldica curada, layout totalmente responsivo, botão Resetar |
| `src/components/game/ClubCreation.tsx` | Container responsivo `max-w-3xl mx-auto` em volta do CrestBuilder |

## Compatibilidade

- Ícones e patterns antigos continuam funcionando (apenas adições + refinamentos visuais)
- `ShieldConfig` não muda de schema
- Saves antigos renderizam normalmente
- Sem alterações em DB/Edge Functions

