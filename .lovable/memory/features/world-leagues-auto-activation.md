---
name: World Leagues Auto Activation
description: Sistema de prévia + ativação automática mensal das ligas mundiais (00:00 BRT dia 1)
type: feature
---
# Sistema de Pré-Criação e Ativação Automática das Ligas Mundiais

## Visão Geral
- 42 países × 1 liga D1 = 42 ligas oficiais por temporada (extensível para D2-D4 futuramente).
- Cada liga: 20 times, 30 rodadas (turno+parte do returno), 300 jogos.
- Horário fixo BRT por divisão: D1=17h, D2=16h, D3=18h, D4=19h.

## Edge Functions
- `world-leagues-preview` — retorna BLUEPRINT sem persistir. Lista nomes,
  países, divisões, slots, formato, horários. Detecta duplicatas e ligas que
  já existem para a próxima season. Usado pelo painel admin para conferência.
- `world-leagues-activate` — cria `world_leagues` + `world_league_teams`
  (20 bots por liga) e invoca `world-season-planner` para gerar calendário
  (`world_matches`). Idempotente: pula ligas existentes (`force=true` para
  recriar). Validações: nomes únicos, 20/20 times, 300 matches/liga.
  `dry_run=true` simula sem persistir.

## Cron Job (pg_cron)
- `world-leagues-activate-monthly` → `0 3 1 * *` (UTC) = **00:00 BRT dia 1**.
- Chama `world-leagues-activate` via `net.http_post` com body
  `{"source": "pg_cron"}`. Idempotente — seguro re-disparar.

## UI Admin
- `LeaguesPreviewTab` em `SystemPanel` (aba "Prévia Ligas").
- Exibe blueprint agrupado por janela de horário, com badges
  "A criar" / "Existe", botões "Ativar agora" e "Forçar recriação".
- Mostra resultado: created/skipped/error counts + warnings detalhados.

## Validações Automáticas
- Duplicatas (mesmo country+division+season >1x)
- Ligas incompletas (≠20 times)
- Calendário não gerado (0 matches)
- Rollback parcial em caso de erro durante criação
