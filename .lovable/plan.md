
# Diagnóstico Completo e Plano de Reorganização — Sistema de Partidas FLM

## Conflitos Identificados (Bugs Reais)

### Bug Crítico #1 — Dupla Simulação de Resultado (RAIZ DO PROBLEMA)
**Localização:** `src/pages/Index.tsx`, linhas 183-198

Ao retornar para o dashboard após uma partida, o código executa `checkFinished()`, que:
1. Busca partidas com `status = 'finished'` no banco
2. Chama `game.simulateMatch(fm.match_id)` — uma função da versão **OFFLINE** que recalcula gols aleatoriamente do zero
3. Deleta o registro da `live_matches`

Isso significa que **o placar exibido na MatchPage é descartado**. O jogo recalcula um resultado completamente diferente usando lógica offline. O usuário vê um placar durante a partida (ex: 2x1) e depois o dashboard exibe outro (ex: 0x0), porque `simulateMatch` gera novos números aleatórios.

### Bug Crítico #2 — Simulação Offline Ainda Ativa
**Localização:** `src/hooks/useGame.ts`, linhas 125-483

A função `simulateMatch()` é um motor completo da versão offline: calcula gols, atualiza placar, fan change, finanças, etc. Ela não usa nenhum dado do servidor. Ela é chamada tanto pela UI antiga (MatchesTab via `onSimulate`) quanto pelo bug #1 acima.

### Bug #3 — Singleton MatchManager com Estado Residual
**Localização:** `src/match/MatchManager.ts`, linha 260

O `getMatchManager()` retorna um singleton global. Se o usuário sair da partida e voltar, o singleton pode ter estado da partida anterior sem reset adequado, causando conflito de eventos e minutos.

### Bug #4 — MatchResultLocker persiste apenas `status: 'finished'` sem salvar o resultado real
**Localização:** `src/match/MatchResultLocker.ts`, linhas 55-62

O método `persist()` atualiza apenas `status` e `current_minute`, mas os gols já foram salvos pelo Edge Function na criação. O problema é que o `Index.tsx` (bug #1) lê a partida finished e recalcula, ignorando os gols corretos.

### Bug #5 — MatchDashboardCard calcula gols localmente
**Localização:** `src/components/game/MatchDashboardCard.tsx`, linhas 73-80

O card recalcula gols contando eventos por minuto local em vez de usar `home_goals`/`away_goals` do banco diretamente. Isso pode resultar em placares diferentes do real enquanto a partida está ao vivo.

### Bug #6 — `useMatchManager` usa singleton mas `destroy()` não reseta o singleton
**Localização:** `src/match/useMatchManager.ts`, linha 45

`destroy()` chama `manager.destroy()` que para o tick, mas o singleton `_instance` permanece com estado `RUNNING` ou `FINISHED`. Na próxima navegação para `/match`, o mesmo objeto é reutilizado sem reset.

---

## Arquitetura Atual (Diagnóstico Visual)

```text
VERSÃO OFFLINE (AINDA ATIVA)           VERSÃO ONLINE (NOVA)
+---------------------------+          +---------------------------+
| useGame.simulateMatch()   |          | Edge Function start-match |
| - Calcula gols aleatório  |          | - Simula no servidor      |
| - Atualiza club.matches   |          | - Salva em live_matches   |
| - Modifica budget/fans    |          | - Retorna events[]        |
+------------+--------------+          +-------------+-------------+
             |                                       |
             |   CONFLITO AQUI                       |
             v                                       v
+---------------------------+          +---------------------------+
| Index.tsx checkFinished() |<-------->| MatchPage / MatchManager  |
| - Chama simulateMatch()   |          | - Revela eventos em tempo |
| - DESCARTA placar online  |          | - MatchResultLocker       |
+---------------------------+          +---------------------------+
```

---

## Novo Fluxo Correto (Pós-Correção)

```text
SERVIDOR (Edge Function)              CLIENTE (React)
+---------------------------+         +---------------------------+
| start-match               |         | MatchPage                 |
| 1. Gera 90min de eventos  |-------->| 1. Revela eventos em tempo|
| 2. Calcula placar final   |         | 2. Exibe 2D visual        |
| 3. Salva tudo no DB       |         | 3. Ao fim: chama          |
|    (status='live',        |         |    applyServerResult()    |
|     home_goals,away_goals)|         |    com dados DO BANCO     |
+---------------------------+         +-------------+-------------+
                                                    |
                                                    v
                                      +---------------------------+
                                      | Index.tsx                 |
                                      | - NÃO chama simulateMatch |
                                      | - Aplica resultado server |
                                      | - Atualiza club.matches   |
                                      | - Atualiza budget/fans    |
                                      +---------------------------+
```

---

## Plano de Implementação — 6 Mudanças Cirúrgicas

### Mudança 1 — Novo método `applyServerResult` em `useGame.ts`
Criar um método separado que aplica o resultado de uma partida **já calculada pelo servidor**, recebendo os gols do banco de dados em vez de recalcular. Este método substitui chamadas de `simulateMatch` para partidas online.

**Parâmetros:** `{ matchId, homeGoals, awayGoals, playerRatings? }`
**O que faz:** atualiza `club.matches`, budget, fans, morale dos jogadores — mas usando os gols reais do servidor, não gerando novos.

### Mudança 2 — Corrigir `Index.tsx` — Eliminar `checkFinished()` mal implementado
Substituir o bloco `checkFinished()` (linhas 183-198) por uma lógica correta:
- Ao retornar de `/match`, verificar se há partidas `finished` com `match_id` pendente de processamento
- Chamar `game.applyServerResult()` com os gols reais do banco
- **Não** recalcular nada — apenas persistir o estado correto no save local
- Deletar o registro `live_matches` apenas após aplicar corretamente

### Mudança 3 — Corrigir `MatchDashboardCard.tsx` — Usar gols do banco
Substituir o cálculo local de gols (linhas 73-80) por `data.home_goals` e `data.away_goals` direto do banco para o placar ao vivo. Manter o cálculo de minuto por elapsed time (correto). Simplificar drasticamente o componente.

### Mudança 4 — Corrigir `useMatchManager.ts` — Reset do singleton ao entrar em nova partida
Ao iniciar um novo match ou carregar do DB, verificar se o singleton tem estado conflitante e fazer reset antes de inicializar. Adicionar método `hardReset()` no MatchManager que limpa o estado completamente.

### Mudança 5 — MatchResultLocker — Comunicar resultado ao Index via navigation state
Ao finalizar (persist), navegar de volta para `/` passando o resultado correto via `location.state` para que o Index processe sem precisar fazer polling. Isso elimina a janela de risco onde o `checkFinished()` pode ser chamado antes do resultado ser aplicado.

### Mudança 6 — Desabilitar `onSimulate` para partidas online no MatchesTab
O prop `onSimulate` em `MatchesTab` deve redirecionar para `/match` em vez de simular offline. Atualmente o código já faz isso via `goToMatch()`, mas o prop `onSimulate` ainda está presente como escape para a lógica offline. Remover essa rota alternativa.

---

## Estrutura Final dos Módulos (Após Correção)

```text
src/match/
  MatchManager.ts          — Orquestrador (corrigido: reset no singleton)
  MatchStateController.ts  — Estados PRE/RUNNING/FINISHED (sem mudança)
  SimulationEngine.ts      — Revelar eventos do servidor (sem mudança)
  MatchResultLocker.ts     — Trava resultado + navega com state correto
  useMatchManager.ts       — Hook React (corrigido: reset ao remontar)
  index.ts                 — Exports (sem mudança)

src/hooks/
  useGame.ts               — Adicionar applyServerResult()

src/pages/
  Index.tsx                — Corrigir checkFinished() 
  MatchPage.tsx            — Sem mudança estrutural (já correto)

src/components/game/
  MatchDashboardCard.tsx   — Usar gols direto do banco
```

---

## Garantias de Estabilidade

- **Placar único:** somente `home_goals`/`away_goals` do banco são usados
- **Sem dupla simulação:** `simulateMatch()` offline é preservado apenas para usos explícitos futuros fora do fluxo de partidas ao vivo
- **Sem loops infinitos:** `checkFinished()` só processa partidas com `match_id` presente no `club.matches` do save
- **Mobile:** MatchDashboardCard e MatchPage já são responsivos e não mudam estruturalmente
- **Escalabilidade:** `applyServerResult` é o ponto extensível para narração, replay e relatórios futuros (recebe `playerRatings` para notas individuais)
- **Debug:** Logs existentes no `MatchManager`, `SimulationEngine` e `MatchResultLocker` são mantidos

---

## Arquivos Modificados

1. `src/hooks/useGame.ts` — Adicionar `applyServerResult()`
2. `src/pages/Index.tsx` — Corrigir `checkFinished()` (linhas 183-198)
3. `src/components/game/MatchDashboardCard.tsx` — Simplificar cálculo de gols
4. `src/match/MatchManager.ts` — Adicionar `hardReset()` e corrigir singleton
5. `src/match/useMatchManager.ts` — Chamar reset no mount
6. `src/match/MatchResultLocker.ts` — Passar resultado via navigation state ao persistir

Nenhuma mudança de banco de dados. Nenhuma nova Edge Function. Apenas correções cirúrgicas nos pontos de conflito.
