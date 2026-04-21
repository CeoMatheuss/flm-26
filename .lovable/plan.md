

# Plano: Refinar UI da Partida + Sistema de Treinamento V3 (Progresso %)

## Parte 1 — UI da Página de Partida (Simulação ao Lado, Stats Maiores)

**Arquivo**: `src/pages/MatchPage.tsx`

Reorganizar o layout para colocar o **canvas/simulação 2D ao lado direito** e os **stats principais maiores ao lado esquerdo**, removendo os widgets pequenos atuais do topo.

### Layout novo (≥ md / desktop)

```
┌─────────────────────────────────┬─────────────────────────┐
│  PLACAR + COMPETIÇÃO            │                         │
│  TIME A  2 — 1  TIME B          │                         │
│  45'  ⏸️                        │       SIMULAÇÃO 2D      │
├─────────────────────────────────┤        (canvas)         │
│  📊 ESTATÍSTICAS GRANDES        │       full-height       │
│  Posse 54% — 46%                │                         │
│  Finalizações 17 — 13           │                         │
│  Passes 77% — 70%               │                         │
│  xG / Faltas / Escanteios       │                         │
├─────────────────────────────────┴─────────────────────────┤
│  📰 NARRAÇÃO (rolagem inversa)                            │
└───────────────────────────────────────────────────────────┘
↓ Logo abaixo, seções inline empilhadas:
[ ESCALAÇÕES ] [ ESTILO DE JOGO ] [ SUBSTITUIÇÕES ]
```

### Layout mobile (< md)

Mantém vertical: Placar → Stats compactos → Simulação 2D (height 280px) → Narração → Seções.

### Mudanças concretas

- **Remover** os 4 mini-widgets de navegação atuais (Tática/Elenco/Stats/Técnico) — viram apenas links/abas no header.
- **Stats principais** (Posse, Finalizações, Passes) ficam num card grande do lado esquerdo: números grandes (`text-3xl`), barras visuais centralizadas estilo `── 54% — Posse — 46% ──`.
- **Simulação** (`HighlightMiniCanvas`) ocupa coluna direita full-height (sticky) em desktop.
- **Narração** abaixo dos dois, full-width.
- Seções inline já existentes (Escalações, Estilo, Subs, Stats Detalhados) continuam abaixo, mas como cards menores (`max-w-4xl mx-auto`).

---

## Parte 2 — Sistema de Treinamento V3 (Progresso %)

### 2.1 Modelo de Dados

**Arquivo**: `src/types/game.ts` + `src/training/TrainingTypes.ts`

Adicionar ao `Player`:
```typescript
trainingProgress?: number;        // 0-100, sobe semanalmente; ao chegar 100 → +1 OVR e reseta
trainingStatus?: 'evoluindo' | 'normal' | 'lento' | 'travado';
lastTrainedAttr?: keyof PlayerAttributes;
```

Novos focos de treino (substituem os atuais em `TrainingTypes.ts`):
- **Grupos** (evolução equilibrada): `finalizacao_grupo`, `tecnico_grupo`, `defensivo_grupo`, `fisico_grupo`, `mental_grupo`
- **Específicos** (foco em 1 atributo): mapear cada atributo individualmente

Cada grupo distribui o ganho entre múltiplos atributos com pesos (alto/médio/baixo conforme spec).

### 2.2 Eficiência do CT (1–30)

**Arquivo**: `src/types/infrastructure.ts`

Tabela `ctEfficiencyByLevel` (% por semana) conforme spec:
```
Lv 1: 1.0% | Lv 5: 2.2% | Lv 10: 4.5% | Lv 15: 7.0%
Lv 20: 9.5% | Lv 25: 12.0% | Lv 30: 15.0%
```

**Custos do CT rebalanceados** (`getUpgradeCost` ou nova tabela):
```
Lv 1→5:  0.3M, 0.6M, 1M, 1.5M, 2M
Lv 6→10: 2.5M, 3.5M, 5M, 6.5M, 8M
Lv 11→15: 10M, 13M, 16M, 20M, 25M
Lv 16→20: 30M, 38M, 46M, 55M, 65M
Lv 21→25: 75M, 90M, 110M, 130M, 150M
Lv 26→30: 180M, 210M, 250M, 300M, 350M
```

### 2.3 Lógica de Progresso

**Arquivo**: `src/training/PlayerDevelopmentEngine.ts`

Substituir lógica atual ("chance de +1") por:
```
1. Calcula gain semanal = ctEfficiency × intensityMult × ageFactor × personalityFactor × moraleFactor
2. Treino Específico: 100% no atributo escolhido
3. Treino Grupo: 60% atr_alto, 30% atr_medio, 10% atr_baixo
4. trainingProgress += gain
5. Se progress ≥ 100 → +1 no atributo principal, recalcula OVR, reseta progress
6. Bônus por jogos: +0.5% por minuto jogado na semana (jogar acelera)
```

**Status visual** (calculado a partir do gain semanal médio):
- Gain ≥ 8% → 🔥 Evoluindo rápido
- Gain 4–8% → ⚖️ Normal
- Gain 1–4% → 🐢 Lento
- Gain < 1% (idade > 33 ou cap atingido) → ❌ Travado

### 2.4 Intensidade

Mantém `leve` / `moderado` / `pesado` com multiplicadores existentes; pesado aumenta risco de lesão (já existe em `InjuryRiskSystem`).

### 2.5 UI da Aba de Treinamento

**Arquivo**: `src/components/game/TrainingTab.tsx`

- **Header**: card grande do CT com nível, eficiência semanal (%), botão "Melhorar CT" mostrando próximo custo
- **Lista de jogadores** (cards verticais):
  - Nome • Idade • OVR grande
  - **Barra de progresso (0–100%)** colorida por status
  - Status (🔥/⚖️/🐢/❌) com label
  - Dropdown 1: Tipo de treino (Grupo / Específico)
  - Dropdown 2: Foco (depende do tipo — 5 grupos OU lista de atributos)
  - Toggle de intensidade (3 botões: 🟢 Leve / 🟡 Médio / 🔴 Pesado)
- **Ícone ❓** ao lado de cada label clicável (Treino, Tipo, Intensidade, Progresso) abre o popup de ajuda

### 2.6 Popup de Ajuda

**Novo arquivo**: `src/components/game/TrainingHelpPopup.tsx`

Modal único reaproveitável com seções:
- 🧠 Como funciona o Treinamento
- 🏟️ Centro de Treinamento
- 👥 Treino por Grupo / 🎯 Treino Específico
- ⚙️ Intensidade
- ⚽ Partidas aceleram evolução

Botão "Entendi" fecha. Aceita prop `section` opcional para abrir já no tópico clicado.

### 2.7 Notificações

Aproveitar sistema existente (`toast.success`):
- ✨ "Jogador evoluiu! (+1 Finalização)" quando progress completa
- ⚠️ "Jogador fatigado" se stamina < 30%
- 🔥 "Evolução acelerada" se gain semanal > 12%

---

## Arquivos Modificados / Criados

| Arquivo | Mudança |
|---|---|
| `src/pages/MatchPage.tsx` | Layout 2 colunas (stats grandes + simulação ao lado), remove mini-widgets do topo |
| `src/types/game.ts` | Adiciona `trainingProgress`, `trainingStatus`, `lastTrainedAttr` ao Player |
| `src/types/infrastructure.ts` | Nova tabela de custos CT (1–30) e `ctEfficiencyByLevel` |
| `src/training/TrainingTypes.ts` | Novos focos (grupos + específicos), pesos por atributo |
| `src/training/PlayerDevelopmentEngine.ts` | Lógica de progresso % em vez de chance |
| `src/training/TrainingManager.ts` | Atualiza para usar gain % e calcular status |
| `src/components/game/TrainingTab.tsx` | UI nova: cards com barra %, dropdowns, intensidade, status |
| `src/components/game/TrainingHelpPopup.tsx` | **NOVO** — modal de ajuda reutilizável |
| `src/components/game/InfrastructureTab.tsx` | Mostrar eficiência semanal do CT no card |

## Compatibilidade

- Saves antigos sem `trainingProgress` → assumido `0`, status `normal`
- Custos antigos do CT (em `getUpgradeCost`) substituídos pela nova tabela; saves com nível ≥ 1 continuam válidos
- Focos de treino antigos (ex: `physical`, `shooting`) mapeados automaticamente para os novos grupos equivalentes
- Sem mudança de schema no banco (tudo client-side em `game_saves.club_data`)

