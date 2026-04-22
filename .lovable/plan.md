

# Plano: Sistema de auto-simulação 100% client-side baseado em tempo

## Contexto atual
Hoje a auto-simulação depende de:
1. **Edge function `auto-simulate-expired-matches`** rodando via cron (servidor)
2. **Lobby de 5 minutos** controlado pela edge `match-lobby-join` (servidor)
3. Painel ADM com botões manuais

O usuário quer remover toda essa dependência e fazer **tudo no cliente**, baseado puramente em tempo decorrido desde a criação da partida.

## Mudanças

### 1. Novo hook `src/hooks/useAutoSimulator.ts` (CORE)
Hook global que roda em background no `Index.tsx`:

**Lógica:**
- A cada **30 segundos**, varre 2 tabelas:
  - `friendly_invites` com `status='accepted'` e `match_result IS NULL`
  - `league_matches` com `status='scheduled'`
- Para cada partida, calcula `idade = now - created_at`
- **Se `idade >= 5 min` E `home_joined=false` E `away_joined=false`**:
  - Simula localmente (Poisson simples baseado em força dos times)
  - Grava resultado direto via Supabase client (`update` na linha + `insert` em `match_history` para os 2 users)
  - Marca `status='auto_simulated'`
- Lock anti-corrida: usa `localStorage` flag `autosim_lock_{matchId}` com TTL de 60s para evitar duplo-processo entre abas/tabs

**Engine de simulação client-side** (inline no hook, ~80 linhas):
- Carrega força média do elenco de cada lado (`get-all-clubs` cache OU calcula on-the-fly por `league_squads`)
- Poisson com λ baseado em diferença de força + fator casa (1.15)
- Gera 0-4 eventos básicos (gols com minuto e jogador aleatório do squad salvo)
- Retorna `{ home_goals, away_goals, events[] }`

### 2. Wire em `src/pages/Index.tsx`
- Importar `useAutoSimulator(userId)` ao lado do `usePendingMatchFlush(userId)`
- Roda sempre que o app está aberto — qualquer cliente online ajuda a "limpar" a fila

### 3. Remover dependência de servidor

**Edge functions a deletar:**
- `supabase/functions/auto-simulate-expired-matches/` → **DELETAR** (com `delete_edge_functions`)
- `supabase/functions/match-lobby-join/` → **MANTER** (ainda útil para sinalizar `home_joined`/`away_joined` quando user entra de fato; só não dispara mais auto-sim do servidor)

**Cron a remover:** A edge `auto-simulate-expired-matches` provavelmente está agendada via pg_cron. Vou listar o cron atual com `supabase--read_query` em `cron.job` e gerar migration para `cron.unschedule(...)` se existir.

### 4. Painel ADM
- Em `src/components/game/admin/SystemPanel.tsx` (ou onde estiverem os botões de "Simular partidas pendentes"): **remover** o botão que chamava `auto-simulate-expired-matches`. Manter só o painel informativo.

### 5. Lobby (`MatchLobbyScreen.tsx`)
Continua igual — só é a UI que o usuário vê **quando entra**. O timer de 5 min do lobby agora é apenas visual; quem realmente decide é o `useAutoSimulator` rodando em background em qualquer cliente online.

### 6. `useGame` / aplicação do resultado
Quando o `useAutoSimulator` grava resultado, o realtime listener existente (`live_matches` / `friendly_invites`) já notifica o user. Adicionar listener leve em `useGame` para `friendly_invites` e `league_matches` com `status='auto_simulated'` → mostrar toast "🤖 Sua partida foi simulada automaticamente" + atualizar `club.matches`.

## Anti-bug
- ✅ Lock por `localStorage` evita 2 abas do mesmo user simulando a mesma partida
- ✅ `update().eq('status', 'scheduled')` (where) — se outro cliente já simulou, não sobrescreve
- ✅ Funciona offline-tolerant: se nenhum user online, partida fica esperando; assim que QUALQUER um abrir o jogo, fila é processada
- ✅ Não depende de admin nem cron
- ✅ Mantém `match-lobby-join` para fluxo "ambos entraram → joga ao vivo" (não muda)

## Validação
- ✅ Criar amistoso, esperar 5 min sem entrar → partida some da lista de pendentes e aparece em histórico com placar
- ✅ Entrar antes dos 5 min → lobby normal funciona
- ✅ Painel ADM não tem mais botão de simulação manual
- ✅ Edge function `auto-simulate-expired-matches` removida
- ✅ Cron antigo desagendado (se existia)

