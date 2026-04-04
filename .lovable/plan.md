
# Redesign do Sistema de Campeonatos Online

## Problema Principal
As partidas são simuladas automaticamente pela edge function `process-tournament-matches` sem interação do jogador. O jogador deveria poder assistir/jogar as partidas com simulação 2D.

## Solução em 4 Etapas

### Etapa 1: Fluxo de Partida do Jogador Humano
**Problema**: Quando o horário agendado chega, a partida é resolvida automaticamente sem que o jogador possa jogar.

**Mudança**:
- Partidas onde um jogador humano está envolvido NÃO devem ser simuladas automaticamente
- A edge function `process-tournament-matches` só simula partidas **bot vs bot**
- Partidas com jogador humano ficam como "scheduled" até o jogador clicar "Jogar" na interface
- O jogador usa o fluxo normal de `/match` (com simulação 2D e narração em tempo real)
- Após a partida, o resultado é gravado na tabela `custom_tournament_matches`

### Etapa 2: Replay para Partidas Bot vs Bot
- Manter a simulação automática APENAS para jogos bot vs bot
- Garantir que `match_data` tenha eventos ricos (já implementado)
- O replay via `/replay` já existe e será mantido

### Etapa 3: Interface do Calendário de Torneio
**Mudanças no `TournamentDashboardCard.tsx`**:
- Partidas com jogador humano: botão "⚽ Jogar" (redireciona para `/match` com dados do torneio)
- Partidas bot vs bot já jogadas: botão "📺 Replay"
- Partidas agendadas bot vs bot: mostrar horário e "⏳ Aguardando"
- Adicionar polling automático para atualizar quando partidas bot são concluídas

### Etapa 4: Edge Function - Filtrar Partidas de Humanos
**Mudança em `process-tournament-matches`**:
- Adicionar condição: só simular se AMBOS os times forem bots
- Partidas com pelo menos 1 jogador humano ficam pendentes
- Adicionar timeout: se jogador não jogar em 48h após agendamento, simular automaticamente (W.O. ou simulação)

## Arquivos Afetados
1. `supabase/functions/process-tournament-matches/index.ts` - filtrar humanos
2. `src/components/game/TournamentDashboardCard.tsx` - botão Jogar + polling
3. `src/pages/MatchPage.tsx` - aceitar context de torneio
4. `src/match/useMatchSimulation.ts` - callback para salvar resultado no torneio
