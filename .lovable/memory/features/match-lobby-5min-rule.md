---
name: Match Lobby 5-Min Rule
description: Auto-sim só se ninguém entrou; basta 1 jogador para iniciar (vs IA do ausente). auto_sim_at = kickoff+5min.
type: feature
---

Regra de início das partidas online (amistoso/liga/torneio):

- `auto_sim_at` é calculado a partir do **horário oficial** (`match_date`/`scheduled_at`/`kickoff_at`) + 5min, NUNCA do primeiro join. Setado por `match-lobby-join` apenas se ainda nulo.
- `legacy-auto-sim` só auto-simula quando: `home_joined IS NOT TRUE AND away_joined IS NOT TRUE` AND tempo (kickoff+5min) já passou.
- Se ao menos 1 jogador entra → partida segue normal, IA controla o ausente, sem auto-sim.
- Lobby retorna 4 estados: `waiting_other` | `one_ready` | `both_ready` | `start_with_ai`.
- UI (`MatchLobbyScreen`) mostra badges: Aguardando jogadores / Jogador conectado / Partida iniciando / Simulação automática.
- `useAutoSimulator` também chama `legacy-auto-sim` (além de cron) a cada 2min para garantir processamento mesmo sem cron.
