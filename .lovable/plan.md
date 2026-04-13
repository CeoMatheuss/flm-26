

# Plano: Corrigir Auto-Simulação de Partidas de Campeonato

## Problema

A Edge Function `process-tournament-matches` está simulando automaticamente partidas que envolvem jogadores humanos, em vez de esperar que o jogador jogue lance por lance. Existem dois bugs:

1. **`processLeagueMatches` (ligas multiplayer)**: NÃO tem nenhuma verificação de jogador humano. Quando as ligas começarem, TODAS as partidas serão simuladas automaticamente após `match_time + 5 minutos`, incluindo partidas de jogadores reais.

2. **Torneios custom**: Tem a verificação de 48h, que funciona corretamente, mas após 48h simula automaticamente sem dar opção ao jogador. O ideal é manter isso mas usar a squad real do jogador quando disponível.

## Solução

### 1 — Corrigir `processLeagueMatches` para pular partidas com humanos

Adicionar verificação: se `home_user_id` ou `away_user_id` pertence a um jogador humano (tem `game_saves`), pular a partida e aguardar até 48h após o horário agendado. Após 48h, auto-simular usando a squad salva do jogador.

```
Para cada league_match agendada:
  - Se ambos os user_ids são bots → simular imediatamente após match_time + 5min
  - Se um deles é humano → aguardar 48h desde match_time
  - Após 48h → simular usando squad_data do league_squads
```

### 2 — Usar squad real do jogador na auto-simulação

Quando a auto-simulação forçada acontecer (timeout de 48h), buscar `league_squads` e `game_saves` para obter a força real do elenco do jogador em vez de usar `bot_strength: 0`.

### 3 — Identificar jogadores humanos corretamente

Consultar `game_saves` para verificar quais `user_id` são jogadores reais (têm save) vs bots preenchidos pelo sistema.

## Arquivo Modificado

| Arquivo | Mudança |
|---|---|
| `supabase/functions/process-tournament-matches/index.ts` | Adicionar verificação de humanos em `processLeagueMatches`, usar squad real na auto-simulação |

## Detalhes Técnicos

Na função `processLeagueMatches`:
- Antes do loop de matches, buscar todos os `user_id` que têm `game_saves` → `humanUserIds` Set
- Para cada match, checar se `home_user_id` ou `away_user_id` está no Set
- Se sim, calcular horas desde `todayMatchTime` e só simular se > 48h
- Na simulação forçada, usar `squad_data` do `league_squads` para calcular `bot_strength` real (média dos OVR dos jogadores)

