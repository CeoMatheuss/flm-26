
# Plano de Correção da Simulação e Fluidez do FLM 26

## Diagnóstico dos Problemas Reais

### Problema 1 — Congelamento da Simulação (CRÍTICO)
**Localização:** `src/match/MatchManager.ts` — `_startTick()`

O tick loop usa `window.setInterval(tick, 1000)`, mas o `SimulationEngine.getSnapshot()` calcula o progresso pela fórmula:
```
progress = (Date.now() - startTime) / durationMs
```
Isso significa que a simulação é **baseada em tempo absoluto** — correta em teoria. Porém o problema real identificado nos logs é diferente: quando o `MatchResultLocker.persist()` navega para `/`, o `destroy()` para o tick mas não reseta o singleton. Na próxima visita ao `/match`, o singleton já está em estado `FINISHED` ou com `_startTime` do jogo anterior, causando o snapshot de 0x0 que o usuário vê ao entrar na partida.

### Problema 2 — Divergência de Placar (0x0 ao entrar)
**Localização:** `src/pages/MatchPage.tsx` linhas 40-74

Quando o usuário retorna à partida existente (via `loadFromDb`), o `SimulationEngine` é carregado com os dados corretos, mas o `resetAndGetMatchManager()` é chamado no mount do `useMatchManager`, que chama `hardReset()` e zera o engine antes de `loadFromDb` ser chamado. A sequência é:
1. Mount → `resetAndGetMatchManager()` → `hardReset()` → estado zerado
2. `init()` async → `loadFromDb()` → carrega dados do banco ✓

Este fluxo é correto, mas há uma race condition: o componente mostra `phase = 'loading'` e depois exibe o estado atualizado. O placar 0x0 visível ao entrar é o estado inicial correto antes do `loadFromDb` completar — porém o usuário vê isso como bug.

### Problema 3 — Toast de resultado baseado em gols calculados localmente
**Localização:** `src/hooks/useGame.ts` linha 202-204

O toast de `"Vitória! X x Y | Torcida +Z"` usa as variáveis `homeGoals` e `awayGoals` da função `applyServerResult`, que são os valores **corretos do servidor**. Mas há um segundo toast idêntico dentro do bloco `simulateMatch` (linhas 429-431) que usa variáveis locais calculadas offline. Este toast duplo pode aparecer quando o fluxo de fallback é ativado.

**Bug confirmado nos logs:**
```
[Index] serverMatchResult received: { matchDbId, homeGoals: 0, awayGoals: 1 }
[Index] checkFinished: found stale finished match (mesmo match_id!)
[applyServerResult] Applied server result for match knz6skno4: 0x1
```
O `checkFinished()` está rodando **depois** do `serverMatchResult` já ter sido processado, aplicando o resultado **duas vezes** para matches diferentes (match local `fte4yh2t6` e depois `knz6skno4`).

### Problema 4 — Amistosos: Oponente usa times reais (Flamengo, Santos, etc.)
**Localização:** `src/hooks/useGame.ts` — `generateFriendly()` linha 1140

```typescript
const opponents = leagueTeams.filter(t => t.name !== club.name);
const opp = opponents[Math.floor(Math.random() * opponents.length)];
```
O oponente vem de `leagueTeams` que contém times reais (Flamengo, Santos, etc.). O usuário exige que o adversário seja sempre **BOT FC** com força variável, sem usar nomes de clubes reais.

### Problema 5 — `simulateMatch` offline ainda aparece no fluxo legacy
**Localização:** `src/pages/Index.tsx` linhas 219-224

```typescript
if (st?.matchResult) {
  // Legacy offline path
  game.simulateMatch(st.matchResult.matchId);
```
Este caminho ainda existe e pode ser ativado caso algo envie `matchResult` no estado de navegação.

### Problema 6 — MatchesTab ainda mostra "Convidar Clube Específico" com times reais
Ao buscar clubes específicos para amistoso, o componente exibe clubes reais da liga do usuário. Esses clubes devem ser substituídos pelo BOT FC genérico.

### Problema 7 — Aplicação dupla de resultado no `checkFinished`
**Bug nos logs:** O resultado é aplicado via `serverMatchResult` (correto), E depois o `checkFinished` encontra o mesmo registro ainda no banco (pois o `supabase.delete()` é assíncrono e pode completar depois do `checkFinished` rodar) e aplica novamente.

---

## Arquivos a Modificar (6 mudanças)

### Mudança 1 — `src/hooks/useGame.ts`
**Objetivo:** Substituir oponente real por BOT FC; remover legacy `simulateMatch` do fluxo; corrigir toast duplo.

- `generateFriendly()`: oponente sempre `BOT FC` com força aleatória entre 55-80, sem usar `leagueTeams`
- `generateFriendlyVs()`: remover completamente ou desabilitar — não há mais "clube específico"  
- Toast de resultado no `applyServerResult`: garantir que só dispara **uma vez** (não há toast duplo no código atual da `applyServerResult` — o problema é o `checkFinished` duplo, tratado abaixo)

### Mudança 2 — `src/pages/Index.tsx`
**Objetivo:** Corrigir dupla aplicação de resultado; eliminar caminho legacy offline; proteger `checkFinished` contra re-execução.

- Remover o bloco `st?.matchResult` (caminho legacy offline) completamente
- No `checkFinished()`: adicionar guarda — após processar, salvar o `id` processado em um `Set` local `ref` para não processar duas vezes na mesma sessão
- Limpar o registro do banco **antes** de chamar `applyServerResult` para evitar race condition
- Não chamar `checkFinished` se `serverMatchResult` já foi processado no mesmo render

### Mudança 3 — `src/components/game/MatchesTab.tsx`  
**Objetivo:** Remover busca de "clube específico"; simplificar UI para só mostrar BOT FC.

- Remover estado `showInvite`, `searchTerm`, `filteredTeams`
- Remover botão "Convidar Clube Específico" e a lógica de busca
- Remover prop `onGenerateFriendlyVs` e `onSimulate` do componente
- Manter apenas: botão "Jogar Amistoso vs BOT FC" quando disponível, bloqueio quando já jogou

### Mudança 4 — `supabase/functions/start-match/index.ts`
**Objetivo:** Melhorar a narração — adicionar kickoff com estádio + público + tipo de partida; tornar substituições mais descritivas com nomes dos jogadores.

- Evento `kickoff`: incluir nome do estádio, capacidade estimada e tipo de competição
- Evento `substitution`: incluir nomes dos jogadores que entram e saem
- BOT FC: ajustar geração de nomes dos jogadores do away para usar nomes de `BOT FC #N`

### Mudança 5 — `src/pages/MatchPage.tsx`
**Objetivo:** Corrigir aviso de `ref` no `Pitch2DView`; garantir exibição de placar correto durante loading.

- Corrigir o `Pitch2DView` para usar `React.forwardRef` (elimina o warning no console)
- Durante `loading = true`: mostrar placar inicial zerado explicitamente (não causa confusão)
- Adicionar mensagem visual de kickoff que exibe o estádio ao início da partida

### Mudança 6 — `src/match/MatchManager.ts`
**Objetivo:** Garantir que o singleton não mantém estado de `startTime` de partidas anteriores após `hardReset`.

- No `hardReset()`: garantir que `this.engine.reset()` é chamado (já existe, mas verificar ordem)
- Adicionar log de debug confirmando o reset antes de `loadFromDb`

---

## Sequência de Execução

```text
1. useGame.ts          → BOT FC, sem times reais, fix toast
2. Index.tsx           → fix dupla aplicação, remover legacy offline
3. MatchesTab.tsx      → UI simplificada, sem busca de clube real
4. start-match/index.ts → kickoff melhorado, subs descritivas (deploy)
5. MatchPage.tsx       → forwardRef, kickoff visual
6. MatchManager.ts     → garantir hardReset completo
```

---

## Comportamento Esperado Após Correção

**Amistosos:**
- Botão "Jogar Amistoso vs BOT FC" → gera um BOT FC com força aleatória
- Ao clicar Jogar → vai para `/match`
- Ao voltar → bloqueado por 24h, countdown correto
- Nenhum time real como oponente de amistoso

**Simulação:**
- Kickoff: "⚽ A partida começa no [Estádio X], com [X.XXX] torcedores! Amistoso entre [Time] e BOT FC!"
- Gols aparecem com destaque, placar entre colchetes
- Substituições com nomes: "🔄 [Nome sai] → [Nome entra]"
- Placar no dashboard bate com placar da partida

**Resultado:**
- Toast único e correto com placar do servidor
- Sem dupla aplicação de resultado
- Histórico registra o resultado real

---

## Garantias Técnicas

- `simulateMatch()` offline não é chamado em nenhum caminho do fluxo online
- `checkFinished` tem guarda contra dupla execução na mesma sessão
- BOT FC usa força variável (55-80 OVR) para partidas desafiadoras mas não impossíveis
- `Pitch2DView` com `forwardRef` elimina warning do React no console
- Nenhuma mudança de banco de dados necessária
- Edge Function redeploy automático após mudança no `start-match`
