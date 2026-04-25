# Centralização da simulação de partidas (FLM 26)

## Diagnóstico — o bug real

A divergência entre Time 1 e Time 2 não é "duas engines diferentes". É um problema arquitetural confirmado em produção:

- A função `start-match` insere uma linha em `live_matches` para CADA usuário (`user_id` é parte da chave lógica). Quando ambos os jogadores entram na partida, dois POST `start-match` são feitos e cada um roda `simulateFullMatch()` com `Math.random()`. Resultado: **dois placares e dois conjuntos de eventos diferentes para o mesmo `match_id`**.
- Confirmado no banco: para `match_id = a27e573d-…`, há duas linhas — uma com `1×3` e outra com `3×1`.
- O caminho automático (`useAutoSimulator` → `match_result` em `friendly_invites`/`league_matches`) já é a fonte única e funciona. O problema está só no caminho interativo.

Os clientes já usam o mesmo `matchId` (ex.: `friendly-<inviteId>`, `league_matches.id`, `custom_tournament_matches.id`), então a chave para deduplicar existe.

## Objetivo

Uma única simulação central por partida, determinística, gravada uma única vez no banco. Ambos os clientes leem **a mesma linha** e renderizam a mesma timeline.

## Mudanças

### 1. Banco

- Coluna nova: `live_matches.shared_match_id text` (preenchida com o `match_id` lógico — mesmo valor para ambos os lados).
- Constraint única: `UNIQUE (shared_match_id)` (somente onde `shared_match_id IS NOT NULL`) para impedir duas linhas para o mesmo jogo.
- Backfill: `UPDATE live_matches SET shared_match_id = match_id WHERE shared_match_id IS NULL`.
- Política RLS de SELECT estendida: além do dono, permitir SELECT a quem é parte do jogo (sender/receiver de `friendly_invites`, home/away de `league_matches`, dono de `custom_tournament_teams` no `custom_tournament_matches`). Isso é o que permite o "Time 2" ler a linha criada pelo "Time 1".
  - Implementado via função `SECURITY DEFINER` `is_match_participant(_user_id, _shared_match_id)` para evitar recursão.

### 2. Edge Function `start-match`

- Adicionar **PRNG seedado** (mulberry32 + hash do `matchId`) e substituir todas as chamadas `Math.random()` / `rng()` por esse PRNG. A simulação passa a ser 100% determinística por `matchId`.
- Antes de simular, fazer `SELECT … WHERE shared_match_id = matchId LIMIT 1`:
  - Se já existe → retornar `{ matchDbId: existing.id, alreadySimulated: true }`. Nada mais é simulado nem inserido.
  - Se não existe → simular e tentar inserir com `shared_match_id = matchId`. Se o `INSERT` falhar por violação da `UNIQUE` (corrida entre os dois lados), buscar a linha vencedora e devolvê-la. Apenas a primeira inserção sobrevive.
- Remover o caminho que cria uma segunda linha por `user_id`. O `user_id` da linha passa a ser apenas "quem disparou primeiro" (informativo); não dá mais a posse exclusiva da partida.

### 3. Hook `useActiveMatch` e `useMatchSimulation`

- `useActiveMatch.checkActive()`: parar de filtrar por `user_id`. Buscar a partida pelo `shared_match_id` recém-criado/recebido via realtime do `live_matches` ou via lookup pelo `match_id` que o cliente conhece.
- `useMatchSimulation.startMatch()`: depois do `invoke('start-match')`, sempre chamar `loadMatch(matchDbId)` (mesmo no caso `alreadySimulated`) — o "Time 2" naturalmente vai cair nesse ramo.
- `loadMatch()`: passar a aceitar uma linha de `live_matches` que não pertence ao usuário (graças à nova RLS). A timeline (events, stats, ratings) é renderizada localmente do mesmo array — eliminando qualquer recálculo client-side.
- `buildOfflineMatch` (fallback offline) **continua** existindo, mas só é usado se o servidor falhar **e** não há linha existente. Já é determinístico via `mulberry32(hashString(matchId))`, então mesmo nesse caso ambos os lados convergem.

### 4. Realtime

- Canal `live_matches` filtrado por `shared_match_id=eq.<matchId>` para que ambos os clientes recebam updates da mesma linha (placar incremental, fim de jogo). Já existe publicação realtime na tabela.

### 5. Limpeza

- Migration de saneamento: para registros antigos com `shared_match_id` duplicado, manter o de `created_at` mais antigo, marcar os outros como `status='superseded'` (não deletar para preservar histórico).
- `useAutoSimulator` continua intocado (já é canônico).

## Validação

1. Inspecionar `live_matches`: para qualquer `shared_match_id`, deve existir no máximo uma linha ativa.
2. Abrir a mesma partida amistosa em duas contas (ou duas abas) e confirmar:
   - Mesmo placar final.
   - Mesma sequência de eventos (gols, cartões) nos mesmos minutos.
   - Mesmas estatísticas (posse, chutes, faltas).
3. Reexecutar `start-match` com o mesmo `matchId` em sequência: deve devolver sempre o mesmo `matchDbId` sem nova simulação.
4. Teste de corrida: disparar dois `invoke('start-match')` em paralelo com o mesmo `matchId` e verificar que apenas uma linha foi inserida (a outra cai no caminho `alreadySimulated`).

## Arquivos afetados

- `supabase/migrations/<novo>.sql` — coluna `shared_match_id`, índice único parcial, função `is_match_participant`, política RLS de SELECT, saneamento de duplicatas.
- `supabase/functions/start-match/index.ts` — PRNG seedado, deduplicação por `shared_match_id`, tratamento de UNIQUE.
- `src/hooks/useActiveMatch.ts` — busca por `shared_match_id` em vez de `user_id`.
- `src/match/useMatchSimulation.ts` — fluxo `alreadySimulated`, `loadMatch` aceita linha alheia, canal realtime por `shared_match_id`.
- `mem://features/centralized-match-simulation.md` (novo) e `mem://index.md` (referência).
