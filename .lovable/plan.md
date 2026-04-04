

# Plano: Refatoração e Melhoria Geral do FLM 26

## Diagnóstico

O Index.tsx tem ~900 linhas monolíticas. O useGame.ts tem ~1200 linhas. Muitas tabs são raramente usadas. O sistema de campeonato ainda tem bugs de simulação automática. A responsividade precisa de ajustes em várias telas.

## Fases de Implementação (por prioridade)

### Fase 1 — Refatorar Index.tsx e Navegação
- Extrair o header para `GameHeader.tsx` (escudo, stats, ações)
- Extrair o menu dropdown para `GameMenu.tsx`
- Extrair a barra de tabs para `GameNavBar.tsx`
- Extrair o roteamento de tabs para `GameTabRouter.tsx`
- Index.tsx fica com ~100 linhas: auth check → GameApp → GameUI com componentes limpos
- Melhorar responsividade do header: compactar stats no mobile, expandir no desktop

### Fase 2 — Corrigir Sistema de Campeonato
- Reescrever `process-tournament-matches` para garantir:
  - Partidas humanas NUNCA são auto-simuladas (ficam "scheduled" até o jogador clicar "Jogar")
  - Partidas bot-vs-bot geram eventos completos para replay
  - Timeout de 48h com notificação antes de auto-resolver
- Corrigir `TournamentDashboardCard`: ocultar horário de jogos finalizados, mostrar placar
- Corrigir countdown do widget: usar timestamp do servidor, não local
- Garantir que o botão "⚽ Jogar" redireciona corretamente para `/match` com dados do torneio

### Fase 3 — Limpar Código Legado
- Remover referências a localStorage para saves (manter apenas tema/versão)
- Remover código offline/solo não utilizado em `useGame.ts`
- Consolidar tabs duplicadas (journal/newspaper apontam para o mesmo componente)
- Remover imports não utilizados em todos os componentes
- Limpar `SeasonTab` e `MatchCalendarTab` de lógica offline

### Fase 4 — Melhorar Responsividade Global
- Dashboard: cards em grid responsivo (1 col mobile, 2 col tablet, 3 col desktop)
- AdminTab: formulários em grid compacto, scrollable no mobile
- SquadTab: tabela horizontal scrollable com sticky first column no mobile
- TacticsTab: formação responsiva com drag-and-drop adaptável
- Todas as modais: max-height com scroll interno, padding reduzido no mobile

### Fase 5 — Melhorar useGame.ts
- Dividir em hooks menores:
  - `useClubState` — estado do clube, jogadores, budget
  - `useSeasonState` — temporada, semanas, calendário
  - `useFinanceState` — finanças, patrocínios
  - `useInfraState` — infraestrutura, CT, estádio
- useGame.ts vira um compositor que combina os hooks menores
- Cada hook tem ~200-300 linhas em vez de 1200

## Detalhes Técnicos

```text
Antes:
  Index.tsx (898 linhas) → useGame.ts (1217 linhas)

Depois:
  Index.tsx (~100)
  ├── GameHeader.tsx (~80)
  ├── GameMenu.tsx (~100)
  ├── GameNavBar.tsx (~30)
  └── GameTabRouter.tsx (~200)
  
  useGame.ts (~150 compositor)
  ├── useClubState.ts (~300)
  ├── useSeasonState.ts (~200)
  ├── useFinanceState.ts (~200)
  └── useInfraState.ts (~200)
```

## Arquivos Modificados
- `src/pages/Index.tsx` — refatorar para ~100 linhas
- `src/components/game/GameHeader.tsx` — novo
- `src/components/game/GameMenu.tsx` — novo
- `src/components/game/GameNavBar.tsx` — novo
- `src/components/game/GameTabRouter.tsx` — novo
- `src/hooks/useClubState.ts` — novo
- `src/hooks/useSeasonState.ts` — novo
- `src/hooks/useFinanceState.ts` — novo
- `src/hooks/useInfraState.ts` — novo
- `src/hooks/useGame.ts` — simplificar como compositor
- `supabase/functions/process-tournament-matches/index.ts` — corrigir lógica
- `src/components/game/TournamentDashboardCard.tsx` — corrigir bugs
- `src/components/game/DashboardTab.tsx` — responsividade
- `src/components/game/AdminTab.tsx` — responsividade
- `src/components/game/SquadTab.tsx` — responsividade mobile

## Ordem de Execução
Fase 1 → Fase 3 → Fase 5 → Fase 2 → Fase 4

Começamos pela refatoração estrutural (1, 3, 5) para ter uma base limpa, depois corrigimos funcionalidades (2) e finalizamos com polish visual (4).

