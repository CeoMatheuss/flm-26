

# Plano: Treino em Grupo (até 5) + Persistência + Sistema Stamina/Lesões V2

## Parte 1 — Treino em Grupo (Multi-seleção até 5 jogadores)

**Arquivo**: `src/components/game/TrainingTab.tsx`

- Adicionar **modo de seleção múltipla**: botão "👥 Treinar em Grupo" no topo da lista.
- Ao ativar: cada card de jogador ganha checkbox no canto. Limite de **5 jogadores**.
- Aparece **painel flutuante inferior** (sticky bottom) com:
  - Contador "X/5 selecionados"
  - Seletor de **Tipo** (Grupo / Específico)
  - Seletor de **Foco** (depende do tipo)
  - Botões de **Intensidade** (🟢 Leve / 🟡 Médio / 🔴 Pesado)
  - Botão "✅ Aplicar a todos" → grava o mesmo `PlayerTrainingConfig` para cada ID selecionado
- Sair do modo de seleção limpa as marcações.

## Parte 2 — Persistência das Ações de Treino e Base (BUG FIX)

**Arquivos**: `src/hooks/useGame.ts`, `src/hooks/useInfraState.ts`, `src/components/game/TrainingTab.tsx`

**Problema reportado**: ao atualizar a base, mudanças não persistem.

- Auditar o fluxo de salvamento: confirmar que toda mutação em `infrastructure` e em `trainingConfigs` dispara o auto-save em `game_saves.club_data` (debounce 2s).
- Adicionar `trainingConfigs: Record<playerId, PlayerTrainingConfig>` ao `club_data` salvo (hoje pode estar só em estado local).
- Garantir que `useInfraState.upgradeFacility` e o setter de `youthInvestment` chamem o `setClub()` que aciona o save reativo.
- Adicionar **toast visível** "💾 Treino salvo" / "🏗️ Base atualizada" para feedback imediato.
- Adicionar log em console `[Persist]` para depuração.

## Parte 3 — Sistema de Stamina V2

**Arquivo**: `src/types/infrastructure.ts` + `src/training/FatigueSystem.ts` + simulação de partida

### 3.1 Recuperação Diária
```
Base: +30/dia
Fisio: +1 por nível (Nv 1 = 31 ... Nv 20 = 50 máx)
```

### 3.2 Desgaste por Partida (baseado no atributo `physical`)
```
Físico 80–100 → -20
Físico 60–79  → -25
Físico 40–59  → -30
Físico 0–39   → -40
```

### 3.3 Modificadores de Recuperação
- Jogou partida no dia: -20%
- Stamina < 50: -30%
- Ambos: -50%

### 3.4 Zona de Risco (afeta desempenho na partida)
| Stamina | Desempenho | Risco lesão |
|---|---|---|
| 50–100 | Normal | Normal |
| 40–49  | -10%   | +20% |
| 20–39  | -25%   | +50% |
| 0–19   | -40%   | +80% |

## Parte 4 — Sistema de Lesões V2

**Arquivo**: `src/training/InjuryRiskSystem.ts` + novo `src/types/injury.ts`

### 4.1 Tipos por Severidade
- **Leve**: 1–5 dias | -5% a -10% desempenho
- **Moderada**: 5–15 dias | -15% a -25%
- **Grave**: 15–60 dias | bloqueia jogo
- **Crônica** (novo): recorrente, risco constante

### 4.2 Tipos Específicos (efeitos)
- Muscular → -velocidade
- Joelho → -mobilidade geral
- Ligamento → alto risco de piorar
- Tornozelo → -agilidade
- Fadiga extrema → lesão leve automática

### 4.3 Propensão a Lesão (novo campo `injuryProneness` 0-100 no Player)
- Baixa (0–30) → x1.0
- Média (31–70) → x1.3
- Alta (71–100) → x1.6

### 4.4 Recaída
- Base 30% → até 60% (alta propensão) → -20% com fisio alto
- Recaída dobra tempo, pode subir severidade

### 4.5 Histórico de Lesões
- Cada lesão soma +5 em `injuryProneness` (até 100)
- Acumular cria jogador "de vidro"

## Parte 5 — Bônus do Fisioterapeuta (Nv 1–20)

**Arquivo**: `src/types/infrastructure.ts`

| Nível | Recup. lesão | Risco | Recaída | Stamina baixa |
|---|---|---|---|---|
| 1–5   | normal | 0%   | 0%   | 0%   |
| 6–10  | +5%    | -5%  | -5%  | -5%  |
| 11–15 | +10%   | -10% | -10% | -10% |
| 16–20 | +15%   | -15% | -20% | -15% |

## Parte 6 — Custos Fisioterapia (Atualizados, Nv 1→20)

```
1→2: 300K   | 2→3: 500K   | 3→4: 800K   | 4→5: 1.2M   | 5→6: 1.8M
6→7: 2.5M   | 7→8: 3.5M   | 8→9: 4.8M   | 9→10: 6M
10→11: 8M   | 11→12: 10M  | 12→13: 13M  | 13→14: 16M  | 14→15: 20M
15→16: 25M  | 16→17: 32M  | 17→18: 40M  | 18→19: 50M  | 19→20: 65M
```
Reduzir `maxLevel` da fisioterapia de 30 → 20.

## Parte 7 — Treinar Lesionado (regras)
- Leve: permitido (-30% evolução, +30% risco, +10 fadiga)
- Moderada: alto risco de piorar (toast warning)
- Grave: bloqueado (botão de treino desabilitado no card)

## Parte 8 — Alertas no Jogo

Toasts/notificações automáticas:
- ⚠️ "Jogador cansado" (stamina < 40)
- 🚨 "Alto risco de lesão" (zona vermelha + propensão alta)
- 🩹 "Pode jogar com risco" (lesão leve, jogador escalado)
- 🔄 "Recuperado, mas instável" (saiu de lesão moderada+)

---

## Arquivos Modificados / Criados

| Arquivo | Mudança |
|---|---|
| `src/components/game/TrainingTab.tsx` | Modo grupo (até 5), painel flutuante, toast salvar |
| `src/hooks/useGame.ts` | Persistir `trainingConfigs` em `club_data` |
| `src/hooks/useInfraState.ts` | Garantir trigger de save em upgrades + youthInvestment |
| `src/types/infrastructure.ts` | Custos fisio Nv 1–20, bônus por nível, recuperação stamina |
| `src/types/game.ts` | Adicionar `injuryProneness` ao Player |
| `src/types/injury.ts` | **NOVO** — tipos específicos, severidade, recaída |
| `src/training/FatigueSystem.ts` | Nova lógica de recuperação +30 base + bônus fisio |
| `src/training/InjuryRiskSystem.ts` | Propensão, recaída, tipos específicos, bônus fisio |
| `src/components/game/InfrastructureTab.tsx` | Mostrar bônus fisio (recup, risco, recaída) |
| `src/pages/MatchPage.tsx` (e simulação) | Aplicar zona de risco no desempenho + alerta de lesão |

## Compatibilidade

- Saves antigos sem `injuryProneness` → assumido 30 (média-baixa)
- Saves com fisio nível > 20 → cap em 20 sem perda de progresso
- `trainingConfigs` ausente → assume `{}` ao carregar
- Sem alteração de schema no Supabase (tudo persiste em `game_saves.club_data` JSONB)

