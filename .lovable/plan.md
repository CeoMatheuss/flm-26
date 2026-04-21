

# Plano: Validações de Substituição + Widgets Bonitos + Público Baseado em Torcida dos Dois Clubes

## 1 — Validações de Substituição com Toast Explicativo

**Onde**: `src/pages/MatchPage.tsx` (função `handleQueueSubstitution` + clique no widget "Time")

Adicionar bloqueios duros com mensagens via `sonner.toast`:

- **Intervalo (45'-60')**: bloquear toda nova substituição enquanto `currentMinute >= 45 && currentMinute < 60`. Ao tentar abrir o painel ou confirmar uma troca:
  > 🚫 "Substituições bloqueadas no intervalo (45'-60'). Aguarde o reinício do 2º tempo."
- **Após 90'**: bloquear quando `currentMinute > 90`:
  > 🚫 "Não é permitido substituir após o 90' minuto."
- **Limite atingido**: quando `subsUsed >= 5`:
  > 🚫 "Limite de 5 substituições já utilizado."
- **Janelas esgotadas** (fora do intervalo, `windowsUsed >= 3`):
  > ⚠️ "Você já usou as 3 janelas de substituição permitidas no jogo corrido."

Os widgets continuarão clicáveis para visualizar o painel, mas os botões de "SAIR" e "ENTRA" dentro ficam `disabled` com banner vermelho explicativo no topo da Sheet quando bloqueado.

## 2 — Widgets Mais Bonitos, Maiores e Clicáveis

**Onde**: `src/pages/MatchPage.tsx` (linhas ~683-836, top bar)

Os 4 widgets (Tática, Time, Stats, Coach) ganham:

- **Altura maior**: de `p-2 sm:p-2.5` para `p-3 sm:p-4`
- **Ícones grandes**: container `w-12 h-12 sm:w-14 sm:h-14` (era `w-9 sm:w-10`), ícone `h-7 w-7 sm:h-8 sm:w-8`
- **Texto MAIOR**:
  - Label do widget: `text-xs sm:text-sm` (era `text-[10px] sm:text-xs`)
  - Valor principal: `text-base sm:text-lg` font-black (era `text-xs sm:text-sm`)
- **Gradient mais vibrante**: `from-X-500/25 to-X-700/10` com `shadow-lg shadow-X-500/10`
- **Hover melhor**: `scale-[1.05]`, `shadow-xl` ao passar
- **Animação de pulse no badge de notificação** (já existe no Coach, expandir para Time quando `subQueue.length > 0`)
- **Borda mais grossa**: `border-2` para destacar
- **Mantém o esquema de cores atual**: emerald (Tática), blue (Time), yellow (Stats), amber (Coach)
- **Indicador visual de bloqueio**: quando intervalo/após 90', o widget "Time" fica com opacidade reduzida + ícone 🔒 sobreposto

Layout em mobile (888px o user vê apenas um device pequeno) mantém `grid-cols-2`, mas com gap maior `gap-2 sm:gap-3`.

## 3 — Público no Estádio Baseado na Torcida dos Dois Clubes

**Onde**: `supabase/functions/start-match/index.ts` (linhas 805-814 + assinatura da função)

**Atual**: Calcula público usando apenas `homeFans` (torcida do mandante).

**Novo cálculo**:
- Aceitar `awayFans` como parâmetro adicional
- Fórmula:
  - **Mandante**: `homeFans * 0.85` (85% da torcida do mandante comparece)
  - **Visitante**: `min(awayFans * 0.05, capacity * 0.10)` (5% da torcida visitante até 10% da capacidade)
  - **Total**: `min(capacity, homePart + awayPart)` ajustado por `homeStrength` (times melhores atraem mais)
- Descrição do kickoff atualizada:
  > "🏟️ A partida começa no {stadiumName}! 👥 Público: {total} (🏠 {homePart} mandante · 🛫 {awayPart} visitante)"
- Adicionar evento extra no minuto 1 com a renda de bilheteria estimada
- Atualizar payload do `MatchPage.tsx` para enviar `awayFans` (vindo de `locState.awayFans` — buscar do clube adversário no momento de criar a partida)

**Onde adicionar `awayFans` no fluxo**:
- `src/components/game/OnlineFriendliesTab.tsx`: ao criar `live_match`, buscar `fans` do oponente via `game_saves`/`league_squads`
- `src/components/game/MatchesTab.tsx`: idem para amistosos contra BOT (usar valor randomizado entre 200-2000)
- `src/pages/MatchPage.tsx`: passar `fans` (mandante) e `awayFans` (visitante) no `startMatch()`

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/MatchPage.tsx` | Validações com toast, widgets maiores/bonitos, passar `awayFans` |
| `supabase/functions/start-match/index.ts` | Aceitar `awayFans`, calcular público dos dois clubes, narração detalhada |
| `src/components/game/OnlineFriendliesTab.tsx` | Buscar `fans` do oponente ao criar partida online |
| `src/components/game/MatchesTab.tsx` | Passar `awayFans` em amistosos vs BOT |
| `src/match/useMatchSimulation.ts` | Adicionar `awayFans` na interface `StartMatchOptions` |

## Detalhes Técnicos

**Validação centralizada** (helper no `MatchPage.tsx`):
```ts
const validateSubAllowed = (): { ok: boolean; reason?: string } => {
  if (currentMinute >= 45 && currentMinute < 60) 
    return { ok: false, reason: '🚫 Substituições bloqueadas no intervalo (45-60)' };
  if (currentMinute > 90) 
    return { ok: false, reason: '🚫 Não é permitido substituir após o 90\'' };
  if (subsUsed >= maxSubs) 
    return { ok: false, reason: '🚫 Limite de 5 substituições atingido' };
  return { ok: true };
};
```

Chamado em `handleQueueSubstitution` antes de adicionar à fila + ao clicar no widget "Time" se bloqueado.

**Cálculo de público server-side**:
```ts
const homePart = Math.floor(homeFans * 0.85);
const awayPart = Math.min(Math.floor(awayFans * 0.05), Math.floor(maxCapacity * 0.10));
const baseAttendance = homePart + awayPart;
const strengthMultiplier = 0.85 + (homeStrength / 200);
const estimatedCrowd = Math.min(maxCapacity, Math.floor(baseAttendance * strengthMultiplier));
```

