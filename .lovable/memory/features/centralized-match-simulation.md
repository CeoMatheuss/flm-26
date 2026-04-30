---
name: Centralized Match Simulation
description: Engine única de partida — start-match dedupa por shared_match_id, autosim respeita engine central, fallback offline só para BOT
type: feature
---

## Fonte única de verdade

A simulação de cada partida online roda **exclusivamente** no servidor (`start-match`):
- `live_matches.shared_match_id` (UNIQUE parcial) garante 1 linha por jogo.
- PRNG mulberry32 seedado pelo `matchId` → simulação determinística.
- RLS `is_match_participant` permite que ambos os jogadores leiam a MESMA linha.
- `start-match` resolve mandante autoritativo (`resolve_home_user_for_match`) e inverte inputs do visitante antes de simular.

## Regras anti-divergência

1. **Cliente NUNCA simula PvP**: `useMatchSimulation.runOfflineMatch` só dispara para amistosos vs BOT (matchId sem prefixo `friendly-`). Qualquer `matchId.startsWith('friendly-')` ou competição não-amistosa força erro em vez de fallback local.

2. **AutoSimulator respeita a engine central**: `useAutoSimulator.process{League,Friendly,Tournament}Match` checa `hasCentralLiveMatch(sharedMatchId)` antes de simular. Se já existe `live_matches` (live ou finished) com aquele `shared_match_id`, pula — evita placar duplicado e a notificação errada "Partida simulada automaticamente" durante partidas ao vivo.

3. **Propagação automática do resultado**: trigger `trg_propagate_live_match_result` em `live_matches` (AFTER UPDATE OF status) copia gols/eventos para a tabela origem (`friendly_invites.match_result`, `league_matches`, `custom_tournament_matches`) assim que `status='finished'`. Garante que a partida origem fica com o placar autoritativo da engine central.

## Convenção de matchId

- Amistoso PvP: `friendly-<friendly_invites.id>`
- Amistoso vs BOT: gerado por `instantFriendly.ts` (sem prefixo)
- Liga: `<league_matches.id>` (uuid)
- Torneio custom: `<custom_tournament_matches.id>` (uuid)

## Pontos de atenção

- Cliente deriva `isHome` localmente comparando `auth.user.id` ao `live_matches.user_id` — nunca confia no `is_home` da linha.
- Mensagem "Partida simulada automaticamente" só aparece via `notify()` no autosim, que agora não roda para partidas ativas no engine central.
