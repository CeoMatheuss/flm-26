

# Plano: Separadores por Minuto + Narração Maior + Lances Coletivos com 2D Sincronizado

## 1. Separador entre cada minuto na narração

Hoje, `ChatEventRow` usa apenas `divide-y divide-border/10` no container. Vários eventos do mesmo minuto ficam visualmente colados.

### Mudança
- Agrupar eventos por minuto e renderizar **um cabeçalho de minuto** acima de cada bloco:

```
─── 12' ─────────────────────────
   🛡️ Pedrinho recebe no meio…
   ⚽ GOL DO FLM!!!
─── 14' ─────────────────────────
   🛡️ Carlos pressiona…
```

- Cabeçalho compacto: linha horizontal + badge `12'` no centro (estilo "chip")
- Estilo: `text-[10px] font-mono text-muted-foreground/60` em background `bg-muted/5`, padding `py-0.5 px-2`
- Aplicado em **MatchPage** (feed ao vivo, FinishedSection) e **ReplayPage**

## 2. Narração de cada lance maior

Hoje cada linha tem `text-[13px] sm:text-sm`. Vou:

- Aumentar a descrição para `text-sm sm:text-base leading-relaxed` (~15-16px)
- Padding vertical da linha: `py-2.5 sm:py-3` (de `py-2 sm:py-2.5`)
- Escudo do lance: `size={28}` mobile / `size={32}` desktop (era 24/28)
- Badge de minuto no cabeçalho do lance interno permanece compacta
- Texto do gol: `text-base sm:text-lg font-bold` para destacar ainda mais

## 3. Animação de chat ao surgir gol

Hoje gols já têm `animate-fade-in` + `bg-emerald-500/10`. Vou intensificar:

- Adicionar **flash inicial** de 1s: `bg-emerald-500/30 → bg-emerald-500/10` (animação custom)
- Pulso da borda esquerda: `border-l-4 border-emerald-400 animate-pulse` (era `border-l-2`)
- Escudo do marcador: `animate-bounce` por 1s ao aparecer
- Texto "⚽ GOL" no header: já tem `animate-pulse`, manter
- Auto-scroll suave do feed para colocar o gol no topo da viewport (`scrollIntoView({ behavior: 'smooth', block: 'center' })`)

Implementação: novo componente filho `<GoalRow>` com `useEffect` que dispara `ref.current?.scrollIntoView()` na mount.

## 4. Lances coletivos com posse prolongada e 2D sincronizado

### Backend — `supabase/functions/start-match/index.ts`

Hoje cada **gol** já tem buildup textual de 1 frase. O **2D já tem 6 passes** em counter_attack/crossing/build-up genérico (480 frames ≈ 8s).

Vou estender para mais tipos de lance produzirem narração construída + 2D quando relevante:

#### a) Marcar mais eventos como "highlight" (longa duração)
Adicionar à lista `isHighlightEvent()`:
- `counter_attack` (chance) — já tem 2D `counter_attack` definido
- `buildup_play` (possession) — usa 2D `chance` com 6 passes
- `corner_danger` — já é highlight (mostra 2D corner)

E **garantir** que a narração desses tipos é multi-fase (3-4 frases descrevendo construção):

```
"⚽ ${tName} sai jogando da defesa. ${zag} toca para ${vol} no meio. 
${vol} pressionado, devolve para ${zag} que abre na lateral. 
${lat} acelera pela ponta, troca passe com ${mei}, e cruza! 
${defName} corta no último segundo!"
```

#### b) Ampliar buildup nas descrições de gol
Substituir 1-frase por **narração de 4-5 ações em sequência** (já existem `buildupDesc`, expandir para 4 etapas). Mesma frase no chat aparece com quebras visuais (separadas por `…`) — mantém compatibilidade com replay/banco.

#### c) Cadência (frequência) dos highlights 2D no cliente
Hoje o cliente dispara o 2D a cada `latestEvent` com `isHighlightEvent`. Para evitar excesso e dar **fluidez** com a narração:
- Adicionar **cooldown** entre highlights consecutivos: mínimo de **6 segundos reais** entre 2D (já que cada highlight dura ~7s)
- Se um highlight já está rodando (`activeHighlight !== null`), o próximo é **descartado** (já é o caso pelo `lastHighlightId`, mas reforçar o cooldown)
- **Pênaltis** sempre passam (override do cooldown — são obrigatórios mostrar)
- **Escanteios**: filtro probabilístico de **40%** (mostra parte deles, não todos) — `Math.random() < 0.4` no client antes de setar `activeHighlight`

#### d) Sincronização narração ↔ 2D
Hoje, quando o 2D abre, a narração esconde (`!activeHighlight && latestEvent`). Vou:
- Manter assim, MAS: **abaixo do 2D**, mostrar um **mini-feed flutuante** com as 2-3 últimas frases (em fonte pequena, opacidade 70%) para o usuário não perder contexto
- Quando o 2D termina (`onComplete` + 1.5s delay), o card de "lance ao vivo" já reaparece atualizado — fluxo já existe

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/MatchPage.tsx` | Refatorar feed: agrupar eventos por minuto com separador; aumentar fontes do `ChatEventRow`; adicionar animação reforçada de gol + scroll automático; adicionar cooldown de 6s + filtro 40% para corner em `setActiveHighlight`; mini-feed sob o 2D durante highlight |
| `src/pages/ReplayPage.tsx` | Mesmo agrupamento por minuto + fontes maiores no feed |
| `src/components/game/HighlightMiniCanvas.tsx` | Adicionar `'counter_attack'` e `'buildup_play'` à `isHighlightEvent()`; mapear ambos para `'chance'` ou `'counter_attack'` em `getHighlightType()` |
| `supabase/functions/start-match/index.ts` | Expandir `buildupDesc()` para 4 etapas em sequência; expandir descs de `counter_attack`, `buildup_play`, `corner_danger` para 3-4 frases |
| `tailwind.config.ts` | Adicionar keyframe `goal-flash` (bg emerald 30% → 10% em 1.2s) |

## Visual final do feed

```
┌─────────────────────────────────────────┐
│ ─── 12' ─────────────────────────────── │
│                                         │
│  🛡️[28px] FLM 26                        │
│       Pedrinho recebe no meio-campo,    │
│       gira e toca para Carlos que avan- │
│       ça pela meia-esquerda.            │
│                                         │
│  🛡️[32px] FLM 26 ⚽ GOL                  │
│       …Carlos cruza rasteiro, Junior    │
│       finaliza de primeira no canto!    │
│       GOOOOL DO FLM!!! [1×0]            │
│       (linha pulsando em verde)         │
│                                         │
│ ─── 14' ─────────────────────────────── │
│  🛡️[28px] BOT FC                        │
│       Reposição rápida do goleiro…      │
└─────────────────────────────────────────┘
```

## Anti-bug

- ✅ Agrupamento por minuto preserva ordem cronológica (eventos já vêm sorted)
- ✅ Cooldown de 6s evita 2 highlights se sobrepondo
- ✅ Filtro 40% em corners reduz spam mas mantém variedade
- ✅ Pênaltis sempre passam (regra explícita)
- ✅ Narração expandida não quebra o `description` no banco — só mais texto
- ✅ ScrollIntoView usa `block: 'center'` para não saltar agressivo
- ✅ Animação de gol não bloqueia interação (apenas visual)

