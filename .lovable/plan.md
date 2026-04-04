

# Plano: Melhorias Gerais, Correções e Redesign do Sininho

## 1 — Redesign completo do sistema de Notificações

**Problema**: O sininho atual mistura notificações dinâmicas (convites, vendas) com mensagens estáticas fixas ("Bem-vindo", "Guia Completo", "Auto-Save") que poluem a lista. Layout funcional mas pode ser mais limpo.

**Solução**:
- Remover notificações estáticas fixas (welcome, welcome_tips, welcome_online, welcome_save) — mostrar apenas na primeira vez via flag
- Remover `localStorage` para readIds — usar apenas banco de dados
- Redesign visual: header mais compacto com ícone branco, cards com visual mais limpo
- Adicionar timestamps ("há 2 min", "ontem") em cada notificação
- Agrupar por tempo (Hoje, Ontem, Anteriores) em vez de por tipo
- Adicionar botão "Limpar tudo" para notificações lidas
- Remover notificações redundantes (ct_tip, physio_tip, topscorer, best) que são informações do Dashboard

**Arquivos**: `NotificationBell.tsx`, `NotificationFullPage.tsx`

## 2 — Corrigir campeonato: partidas humanas com simulação 2D

**Problema**: 22 partidas scheduled no MUNDIAL, partidas humanas ficam esperando mas quando o horário chega, não há caminho claro para jogar com simulação 2D.

**Correções**:
- No `TournamentDashboardCard`: quando uma partida do jogador tem status "scheduled" e `scheduled_at <= now`, mostrar botão "⚽ Jogar Agora" que navega direto para `/match` com os dados corretos
- No `process-tournament-matches`: verificar que partidas com humanos nunca são auto-simuladas (já implementado, validar que funciona)
- Garantir que o resultado da partida jogada manualmente é salvo de volta no `custom_tournament_matches` com status `played`
- Corrigir avanço de fases: quando todas as partidas da rodada estão "played", gerar próxima rodada automaticamente

**Arquivos**: `TournamentDashboardCard.tsx`, `MatchDashboardCard.tsx`, `process-tournament-matches/index.ts`

## 3 — Corrigir sistema financeiro da Base

**Problema**: O `youthInvestment` é cobrado "a cada 4 jogos" mas não há registro financeiro automático quando a cobrança acontece. O valor padrão é R$100k.

**Correções**:
- No `useInfraState` ou `useGame`: quando jovens são gerados (a cada 4 rodadas), registrar a despesa financeira automaticamente via `addFinance('despesa', 'Base', youthInvestment, 'Investimento em Base')`
- Na `FinanceTab`: mostrar "Investimento Base" como custo recorrente com o valor real configurado pelo jogador
- Validar que o jogador tem budget suficiente antes de cobrar

**Arquivos**: `useInfraState.ts`, `useGame.ts`, `FinanceTab.tsx`

## 4 — Remover imports e componentes desnecessários

**Remoções**:
- `FinanceTab.tsx`: remover imports não usados (`Heart`, `Dumbbell`, `ShoppingCart`, `Package`)
- `NotificationBell.tsx`: limpar notificações estáticas fixas (5 notificações hardcoded)
- `DashboardTab.tsx`: remover card de infraestrutura duplicado (já existe na linha 294 "Nível do estádio" que é redundante)
- Remover `LeagueTab.tsx` e `LeaguesOverview.tsx` se não são usados no modo online
- Remover `SeasonTab.tsx` referências offline

**Arquivos**: Vários componentes

## 5 — Melhorar SeasonStartWidget

**Problema**: Widget funcional mas pode ter mais informações úteis.

**Melhorias**:
- Adicionar contagem de jogadores inscritos em campeonatos
- Mostrar próxima partida agendada dentro do widget
- Após 01/05/2026, mostrar resumo da temporada (posição no ranking, jogos disputados)

**Arquivo**: `SeasonStartWidget.tsx`

## Ordem de execução
1. Redesign Notificações (maior impacto visual)
2. Correções financeiras da Base
3. Correções do campeonato
4. Limpeza de imports
5. Melhorar SeasonStartWidget

## Arquivos modificados
| Arquivo | Ação |
|---------|------|
| `NotificationBell.tsx` | Reescrever — remover estáticas, limpar lógica |
| `NotificationFullPage.tsx` | Redesign — agrupar por tempo, visual limpo |
| `useInfraState.ts` | Adicionar cobrança financeira ao gerar jovens |
| `useGame.ts` | Conectar addFinance ao fluxo de base |
| `FinanceTab.tsx` | Limpar imports, ajustar custo base |
| `TournamentDashboardCard.tsx` | Corrigir botão jogar + avanço fases |
| `SeasonStartWidget.tsx` | Enriquecer com dados do jogador |
| `DashboardTab.tsx` | Remover redundâncias |

