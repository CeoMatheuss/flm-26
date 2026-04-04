

# Fase 3 + 5 — Limpeza de Código Legado e Divisão do useGame.ts

## Contexto
A Fase 1 (refatoração do Index.tsx) está concluída. Agora atacamos as Fases 3 e 5 juntas: limpar código offline/legado e dividir o useGame.ts (1217 linhas) em hooks menores e focados.

## O que será feito

### Parte A — Limpeza de Código Offline (Fase 3)

1. **useGame.ts**: Remover `simulateMatch` (lógica offline de simulação local com bots), `leagueTeams` local (tabela offline), `endSeason` offline, `resetLeagueTeams`, `applySeasonDevelopment` do topo, e todo o código de liga local (`initialLeagueTeams`, etc.)
2. **Remover imports não usados**: `generateSeasonMatches`, `initialLeagueTeams`, `LeagueTeam`, `generateRandomEvents`, etc.
3. **Simplificar `generateFriendly`**: Manter apenas a geração de amistoso BOT FC (já simplificado)
4. **SeasonTab/MatchCalendarTab**: Remover qualquer referência a liga offline local

### Parte B — Dividir useGame.ts em Hooks (Fase 5)

Estrutura final:

```text
useGame.ts (~200 linhas — compositor)
├── useClubState.ts (~350) — club, players, scouts, rename, sell, buy, sign
├── useFinanceState.ts (~100) — finances, addFinance, sponsors, sponsorOffers
├── useInfraState.ts (~150) — infrastructure, ctRooms, youth, upgrades
└── useMatchState.ts (~200) — applyServerResult, generateFriendly, ranking
```

**useClubState.ts** — Estado do clube, jogadores, compra/venda/empréstimo, olheiros, contratos, perfil
**useFinanceState.ts** — Finanças, patrocínios, histórico financeiro
**useInfraState.ts** — Infraestrutura (estádio, CT, base), salas do CT, jovens da base
**useMatchState.ts** — Aplicação de resultados do servidor, geração de amistosos, ranking, friendlies
**useGame.ts** — Compositor que combina os 4 hooks e expõe a mesma interface atual (sem quebrar nada)

### Parte C — Limpeza Final

- Remover `applySeasonDevelopment` (lógica offline de evolução de jogador entre temporadas — deve ser servidor)
- Remover `endSeason` local (temporada é gerenciada pelo servidor via campeonato online)
- Manter `getFullState` no compositor para salvar no banco
- Remover `leagueTeams` do GameState (não é usado no modo online)

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/hooks/useClubState.ts` | Criar |
| `src/hooks/useFinanceState.ts` | Criar |
| `src/hooks/useInfraState.ts` | Criar |
| `src/hooks/useMatchState.ts` | Criar |
| `src/hooks/useGame.ts` | Reescrever como compositor (~200 linhas) |
| `src/pages/Index.tsx` | Ajustar imports se necessário |
| `src/components/game/SeasonTab.tsx` | Limpar referências offline |

## Detalhes Técnicos

- A interface de retorno do `useGame()` permanece **idêntica** para não quebrar nenhum componente consumidor
- O `GameState` será simplificado removendo `leagueTeams` (substituído por dados do servidor)
- `simulateMatch` será removido — todas as partidas usam `applyServerResult` (resultado vem do servidor)
- `endSeason` será removido — temporada é controlada pelo servidor via `process_season_transition`

