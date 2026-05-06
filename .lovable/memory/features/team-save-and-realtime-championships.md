---
name: Team Save Persistence + Realtime Championships
description: UNIQUE constraint em game_saves.user_id + upsert; Realtime em world_matches/world_league_table; replace_bot prefere mesmo país
type: feature
---
# Persistência de Time e Tempo Real

## game_saves
- Constraint `game_saves_user_id_unique UNIQUE (user_id)` — impede duplicatas (havia user com 2 saves).
- Toda escrita usa `.upsert(..., { onConflict: 'user_id' })` em `Index.tsx` (criação + auto-save).
- Erros de save são logados e mostrados em toast — antes falhas silenciosas faziam o time "sumir" no refresh.

## Realtime Campeonatos
- `world_matches` e `world_league_table` adicionados a `supabase_realtime` (REPLICA IDENTITY FULL).
- `ChampionshipsTab` assina canal `championship-${leagueId}` filtrado por `league_id` e refaz fetch a cada UPDATE/INSERT.

## replace_bot_with_player (atualizado)
- Prefere bot do MESMO país do jogador (resolve país via `game_saves.club_data->'club'->>'country'`), fallback `bot_strength ASC`.
- Tratamento `EXCEPTION WHEN undefined_column` se `league_members.country` ainda não existir.
