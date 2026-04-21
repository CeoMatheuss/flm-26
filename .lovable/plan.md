

# Plano: Editor de Escudos Avançado (Crest Builder Pro)

Substituir o painel atual de escudo (formas/padrões/ícones em listas planas) por um **editor visual modular** estilo FIFA/Football Manager, com preview ao vivo, controles de transformação e mais opções.

## 1. Novo componente: `CrestBuilder.tsx`

**Arquivo**: `src/components/game/CrestBuilder.tsx` (NOVO)

Editor standalone, reutilizável tanto na criação de clube (`ClubCreation`) quanto em ajustes (`ClubSettingsTab`).

### Layout (responsivo)

```
┌──────────────────────────────────────────────────────────┐
│  [Preview Grande 240x240]   │  [Painel de abas]          │
│  - Escudo renderizado       │  ┌──────────────────────┐  │
│  - Fundo xadrez claro       │  │ 🛡 Forma | 🎨 Cores  │  │
│  - Sombra suave             │  │ 🐺 Símbolo | ✨ Extras│  │
│                              │  │ 🧩 Layout | 🔧 Ajuste │  │
│  [🎲 Aleatório][💾 Salvar]   │  └──────────────────────┘  │
│                              │  [Conteúdo da aba ativa] │
└──────────────────────────────────────────────────────────┘
```

Mobile: empilha (preview no topo, abas abaixo).

### Abas

| Aba | Conteúdo |
|---|---|
| 🛡 **Forma** | Grid 5×2 com 10 formas (`shieldShapes` já existe). Hover destaca, click seleciona. |
| 🎨 **Cores** | 4 color pickers (Primária, Secundária, Símbolo, Borda) + paleta rápida (12 swatches comuns: vermelho, azul, verde, preto, branco, dourado, etc). |
| 🐺 **Símbolo** | Tabs internas: **Animais** / **Símbolos** / **Letras**. Grid de ícones (~30 itens). Botão "↔ Espelhar". |
| ✨ **Extras** | Sub-elementos opcionais: estrelas no topo, coroa, louros laterais, faixa com texto. Cada item tem toggle on/off. |
| 🧩 **Layout** | 6 cards visuais: Sólido, Dividido ao meio, Listrado, Diagonal, Faixa horizontal, Quadrantes. Reaproveita `shieldPatterns`. |
| 🔧 **Ajustes** | Sliders: Tamanho do símbolo (0.5x–1.5x), Posição X (-30 a +30), Posição Y (-30 a +30), Rotação (-180° a 180°), Opacidade (20%–100%), Espessura da borda (0–8px). |

## 2. Expansão do `ShieldCrest.tsx`

**Arquivo**: `src/components/game/ShieldCrest.tsx`

### 2.1 Novos ícones (animais conforme imagem de referência)
Adicionar à lista `shieldIcons`:
- **Animais novos**: `tiger`, `bear`, `phoenix`, `snake`, `elephant`, `rhino`, `panther`, `deer`, `bull`, `griffin`, `unicorn`, `pegasus`
- **Símbolos extras**: `lightning`, `castle`, `axe`, `bow`, `fleur-de-lis`, `cross-pattee`, `crescent-moon`, `sun-burst`

Cada ícone desenhado em SVG vetorial preto/branco (estilo flat heráldico, igual ao padrão atual). Cerca de **20 novos ícones**.

### 2.2 Novas props de transformação

```typescript
interface ShieldProps {
  // existentes...
  iconScale?: number;        // 0.5 - 1.5 (default 1)
  iconOffsetX?: number;      // -30 a 30
  iconOffsetY?: number;      // -30 a 30
  iconRotation?: number;     // graus
  iconOpacity?: number;      // 0-1
  iconMirror?: boolean;      // espelhar horizontalmente
  borderColor?: string;
  borderWidth?: number;      // 0-8
  // Camadas extras
  topStars?: 0 | 1 | 2 | 3;  // estrelinhas no topo
  showLaurels?: boolean;     // louros laterais
  showCrown?: boolean;       // coroa no topo
  bannerText?: string;       // texto na faixa inferior
  bannerColor?: string;
}
```

Aplicadas via `<g transform="translate(x,y) scale(s) rotate(r)">` envolvendo o `renderIcon()`.

### 2.3 Camada de decoração externa

Renderizar camadas adicionais (coroa, louros, faixa) **fora do clip do escudo**, sobrepondo bordas para efeito heráldico premium.

## 3. Integração

### 3.1 `ClubCreation.tsx`
- Substituir o bloco atual de escudo (linhas ~480-540) por `<CrestBuilder value={...} onChange={...} />`.
- Manter o resto do fluxo (nome, estádio, país) inalterado.

### 3.2 `ClubSettingsTab.tsx`
- Adicionar botão "🎨 Editar Escudo" abre o `CrestBuilder` em modal/sheet, salva ao confirmar.

### 3.3 Persistência
Adicionar ao tipo `Club` em `src/types/game.ts`:
```typescript
shieldConfig?: {
  shape: ShieldShape;
  pattern: ShieldPattern;
  icon: ShieldIcon;
  primaryColor: string;
  secondaryColor: string;
  detailColor: string;
  borderColor: string;
  borderWidth: number;
  iconScale: number;
  iconOffsetX: number;
  iconOffsetY: number;
  iconRotation: number;
  iconOpacity: number;
  iconMirror: boolean;
  topStars: number;
  showLaurels: boolean;
  showCrown: boolean;
  bannerText?: string;
};
```
Salvo dentro de `game_saves.club_data` (JSONB existente, sem migração).

Compatibilidade: se `shieldConfig` ausente, usa os campos antigos (`shieldPattern`, `shieldShape`, `shieldIcon`) como fallback.

## 4. Botão "🎲 Aleatório"

Função `randomizeShield()`:
- Sorteia forma, padrão, ícone das listas
- Sorteia 2 cores complementares de uma paleta curada (evita combinações feias tipo amarelo + branco)
- Reseta transformações para defaults
- Anima preview com fade rápido (200ms)

## 5. Preview ao Vivo + Animação

- Preview reage instantaneamente a qualquer mudança (controlado por estado React)
- Transições CSS suaves (`transition: all 200ms ease`) no SVG ao trocar cores/escala
- Card de preview com fundo xadrez sutil (`bg-[url('checkerboard')]`) para mostrar opacidade

## Arquivos Modificados / Criados

| Arquivo | Mudança |
|---|---|
| `src/components/game/CrestBuilder.tsx` | **NOVO** — editor com 6 abas, preview, sliders |
| `src/components/game/ShieldCrest.tsx` | +20 ícones, props de transformação, camadas extras (coroa/louros/faixa) |
| `src/components/game/ClubCreation.tsx` | Substitui painel de escudo por `<CrestBuilder>` |
| `src/components/game/ClubSettingsTab.tsx` | Botão "Editar Escudo" abre `CrestBuilder` em sheet |
| `src/types/game.ts` | Adiciona `shieldConfig` opcional ao Club |

## Compatibilidade

- Clubes existentes sem `shieldConfig` continuam usando `shieldShape`/`shieldPattern`/`shieldIcon` (fallback)
- Nenhuma migração de banco — tudo persistido em `game_saves.club_data` JSONB
- `ShieldCrest` mantém props antigas funcionando (todos os novos parâmetros são opcionais com defaults)

