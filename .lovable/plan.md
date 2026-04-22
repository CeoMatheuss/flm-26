

# Plano: Mais Estilos Táticos + 2 Mini-Widgets Permanentes + Subs Melhorada + Adversário Realista

## 1. Mais estilos táticos (com efeitos reais na partida)

### Adicionar 4 novos estilos em `src/types/tactics.ts`
Atualizar `PlayStyle` para incluir:
- `'tiki-taka'` — Posse curta e paciente, troca incessante de passes
- `'gegenpressing'` — Recuperação imediata após perda da bola
- `'parking-bus'` — Ultra-defensivo, todos atrás da linha
- `'long-ball'` — Bolas longas direto para o ataque

(Já existem: `ofensivo`, `equilibrado`, `defensivo`, `contra-ataque`, `posse` → total **9 estilos**)

### Como cada estilo afeta a simulação (Edge Function `start-match`)
Adicionar tabela de modificadores em `index.ts`:

| Estilo | Ataque | Defesa | Pressão extra | Stamina drain | Bônus chance |
|---|---|---|---|---|---|
| ofensivo | +20% | -15% | +10% | +10% | shooting +5 |
| equilibrado | 0% | 0% | 0% | 0% | — |
| defensivo | -15% | +20% | -10% | -5% | marking +5 |
| contra-ataque | +5% | +10% | -10% | -5% | speed +8 (transição) |
| posse | -10% | +5% | 0% | -5% | passing +5 |
| **tiki-taka** | -5% | +10% | +15% | +5% | passing +10, vision +5 |
| **gegenpressing** | +15% | -10% | +30% | +20% | aggression +8, workRate +5 |
| **parking-bus** | -25% | +35% | -25% | -10% | defending +10, marking +8 |
| **long-ball** | +10% | -5% | -5% | -5% | physical +5, longShots +8 |

### UI de explicação em `TacticsTab.tsx`
- Sub-aba "Estilo" passa a mostrar **card descritivo abaixo dos botões**:
  - Nome do estilo, ícone, 1 linha de filosofia, 3 bullets de efeito ("✅ +20% chances", "⚠️ -15% defesa", "🔥 stamina cai +10%")
- Texto compacto, `text-[11px]`, sem mexer no layout existente

## 2. 2 Mini-widgets permanentes no fundo da MatchPage

Hoje tem só **um** sistema de widget expansível. Vou adicionar **2 mini-widgets fixos** sempre visíveis abaixo do menu, lado a lado, em tamanho reduzido:

### Widget A — "Adversário" (sempre visível)
```
┌─────────────────────┐
│ 🤖 BOT FC    OVR 72 │
│ ATK 75 ▓▓▓▓▓▓░░     │
│ MID 70 ▓▓▓▓▓▓░░     │
│ DEF 68 ▓▓▓▓▓░░░     │
│ Estilo: Equilibrado │
└─────────────────────┘
```

### Widget B — "Pulso da Partida" (sempre visível)
```
┌─────────────────────┐
│ 📊 Momento          │
│ 🔥 Pressão Casa     │
│ Posse: 58% / 42%    │
│ xG: 1.4 - 0.8       │
│ Tiros: 8-3          │
└─────────────────────┘
```

- Renderizam em `grid grid-cols-2 gap-1.5` abaixo do menu de widgets expansíveis
- `text-[10px]`, `p-1.5`, altura ~110px — compactos
- Não interferem com os widgets expansíveis maiores

## 3. Substituições — design melhorado e mais fácil

Refatorar `ManagerSubstitutionView` (componente atual ocupa 200+ linhas):

### Mudanças visuais
- **Layout 2 colunas no desktop, 1 na mobile**: Esquerda = "Quem SAI" | Direita = "Quem ENTRA" (sempre visível, não mais 2 telas)
- **Cards do banco mostram "🟢 Sugerido"** automaticamente para a melhor opção (mesma posição + maior OVR + boa stamina)
- **Drag visual**: ao clicar em um titular, ele fica destacado em vermelho e o banco fica com glow verde (substitutos compatíveis)
- **Botão único "✅ Trocar"** grande no centro/baixo após selecionar 2 jogadores
- **Indicador top compacto**: barra com ⚡3/5 subs e 🪟2/3 janelas em uma linha só (reduz espaço em ~60px)
- **Filtros rápidos**: chips no topo "🥅 GOL · 🛡️ DEF · ⚙️ MID · ⚔️ ATK" para filtrar quem entra

## 4. Simulação realista baseada em adversário real

Hoje o adversário (`away`) é gerado com OVR genérico (`awayStrength + variance`) e atributos quase aleatórios via `genAwayAttrs`. Vou:

### Aceitar `awayPlayers` reais quando disponível
- Em multiplayer/torneios, já existe acesso a `league_squads.squad_data`
- **Mudança em `start-match/index.ts`**: aceitar parâmetro opcional `awayPlayers` (mesmo formato de `homePlayers`). Se vier, usa diretamente; senão, mantém geração atual
- **Mudança em `MatchPage.tsx`**: ao iniciar partida de liga/torneio, buscar squad real do adversário via `league_squads` ou `custom_tournament_teams.bot_squad` e passar para `startMatch()`

### Aceitar `awayTactics` do adversário
- Novo parâmetro `awayTactics` no edge function — usa os modificadores táticos do adversário no cálculo de `awayExpected` (ataque, defesa, pressão)
- Hoje o cálculo só usa `tactics` do home; vou adicionar `awayPressing`, `awayPlayStyle`, `awayTempo` afetando a outra metade da fórmula Poisson

### Resultado: simulação reflete OVR + atributos + táticas dos DOIS lados
- BOT genérico: continua igual (sem regressão)
- Adversário humano: usa OVR real, atributos reais, formação salva, estilo escolhido — partidas se tornam **previsivelmente justas** para o time mais forte/melhor montado

## 5. Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/types/tactics.ts` | +4 novos `PlayStyle`; tabela `playStyleEffects` com descrição+bullets |
| `src/components/game/TacticsTab.tsx` | Botões dos 9 estilos (grid 3x3); card explicativo abaixo |
| `src/pages/MatchPage.tsx` | 2 mini-widgets fixos abaixo do menu; refatorar `ManagerSubstitutionView` para layout 2-col + sugestão automática + filtros; passar `awayPlayers`/`awayTactics` para `startMatch` quando disponível |
| `src/match/useMatchSimulation.ts` | Aceitar `awayPlayers` e `awayTactics` no `startMatch()` e enviar ao edge function |
| `supabase/functions/start-match/index.ts` | Adicionar 4 novos `playStyle` no cálculo; aceitar `awayPlayers` (usar direto se vier) e `awayTactics` (modificar `awayExpected`); novo modifier table |

## Compatibilidade

- Estilos antigos continuam funcionando (defaults inalterados)
- Se `awayPlayers` não vier, fallback para geração atual
- Se `awayTactics` não vier, defaults `equilibrado`/`medio`/`normal`
- Mini-widgets fixos não interferem nos expansíveis (espaço extra ~120px abaixo)

## Anti-bug

- ✅ Tabela de modifiers normalizada (mesma estrutura para todos estilos)
- ✅ Cap de `awayExpected` mantido (0.2-3.0) para evitar goleadas absurdas
- ✅ Substituição: validações existentes preservadas (janelas, intervalo, 90min)
- ✅ Mini-widgets ler de `stats`, `matchState`, `awayStrength` já existentes — sem novas queries
- ✅ Sugestão "🟢 Sugerido" não força — só destaca; usuário decide
- ✅ Edge function: `awayPlayers` opcional, retrocompatível

