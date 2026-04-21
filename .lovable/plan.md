

# Plano: Substituições Manuais + Widgets na Simulação + Amistosos com Simulação Completa

## Resumo

1. Remover qualquer modo de simulação automática residual (5min)
2. Sistema de substituições 100% manual (sem IA decidindo) com até 5 trocas, mostrando minuto, sai/entra e escudo do time
3. Trocar os botões da barra superior por **widgets visuais** mais bonitos
4. Garantir que amistosos rodem a simulação lance-por-lance completa (igual aos campeonatos)
5. Esconder escudos durante o intervalo

---

## 1 — Remover Auto-Simulação Residual

**Onde**: `supabase/functions/process-tournament-matches/index.ts`

Garantir que **NENHUMA** partida com humano seja simulada antes do prazo de 48h. Remover qualquer fallback de 5min/30min para ligas que envolvam jogadores reais. Bot vs Bot mantém auto-sim (30min) para a liga continuar.

## 2 — Sistema de Substituições Manual

**Onde**: `src/pages/MatchPage.tsx` (painel "Time" / Sheet de elenco)

Atualmente as substituições são automáticas (via `auto_substitutions` na Edge Function). Mudanças:

- **Remover IA de substituições**: Edge Function `start-match` não vai mais sugerir/forçar trocas automáticas — apenas alertar via Assistente quando algum jogador estiver cansado
- **UI de Substituição**:
  - No painel "Time", cada titular tem um botão "🔄 Substituir"
  - Ao clicar, abre lista de reservas disponíveis com OVR, posição e estamina
  - Confirmar a troca registra um evento de substituição com:
    - ⏱️ Minuto atual
    - ⬇️ Jogador que sai (nome + foto)
    - ⬆️ Jogador que entra (nome + foto)
    - 🛡️ Escudo do clube ao lado
  - Contador visível: "Substituições: 2/5"
  - Botão fica `disabled` ao atingir 5 trocas
- **Restrições**:
  - Não permitir trocas durante o **intervalo** (15-min)
  - Não permitir trocas após o 90'
  - Cada jogador só pode sair/entrar uma vez

## 3 — Widgets na Barra Superior (substituir botões)

**Onde**: `src/pages/MatchPage.tsx`

Trocar os 4 botões atuais (Tática, Time, Stats, Assistente) por **widgets em formato de cards compactos** com:
- Ícone grande (32px) com gradient de fundo
- Label curto abaixo
- Badge dinâmico mostrando informação relevante:
  - **⚙️ Tática**: formação atual ("4-3-3")
  - **👥 Time**: substituições restantes ("3/5")
  - **📊 Stats**: posse de bola ("58%")
  - **🎙️ Assistente**: número de novas dicas ("•3")

Cada widget vira um card clicável com:
- `rounded-2xl`, gradient de fundo (esmeralda/azul/amarelo/roxo)
- Hover com `scale-105`
- Animação `pulse` no badge quando há novidade
- Em mobile (390px): grid 2x2 / em desktop: row de 4

## 4 — Amistosos com Simulação Lance-por-Lance

**Onde**: `src/components/game/OnlineFriendliesTab.tsx` + fluxo de invite

Verificar e garantir que ao aceitar um amistoso, o sistema:
- Crie uma `live_matches` row
- Redirecione AMBOS os jogadores para `/match/:id`
- Use a mesma engine `start-match` que campeonatos
- Resultado vá para `match_history` ao final

## 5 — Esconder Escudos no Intervalo

**Onde**: `src/pages/MatchPage.tsx`

Quando `isHalftime === true`:
- Banner grande "⏸️ INTERVALO • 15:00"
- Não mostrar escudos dos times
- Mostrar apenas estatísticas do 1º tempo (posse, chutes, gols)

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/MatchPage.tsx` | Widgets na top bar, sistema manual de subs, esconder escudo no intervalo |
| `supabase/functions/start-match/index.ts` | Remover auto-substitutions, manter apenas alertas do assistente |
| `supabase/functions/process-tournament-matches/index.ts` | Confirmar 48h estritos para humanos, sem fallback de 5min |
| `src/components/game/OnlineFriendliesTab.tsx` | Garantir fluxo de live_match ao aceitar amistoso |
| `src/match/useMatchSimulation.ts` | Suportar evento `manual_substitution` enviado pelo cliente |

## Detalhes Técnicos

**Substituição manual (cliente)**:
- Novo botão dispatcha update na `live_matches.events` adicionando: `{ type: 'substitution', minute, playerOut, playerIn, teamLogo }`
- Estado local `substitutionsUsed` (max 5), bloqueia botão ao atingir
- Bloqueio quando `currentMinute === 45.5` (intervalo) ou `currentMinute > 90`

**Widget design**:
```
[⚙️ Tática]  [👥 Time]
   4-3-3        3/5
[📊 Stats]   [🎙️ Coach]
   58%          •3
```
Grid `grid-cols-2 sm:grid-cols-4 gap-2`, cards com `bg-gradient-to-br from-X to-Y`.

**Auto-sim removida**:
- `start-match` não terá mais a função `autoSubstitutePlayers()`
- Apenas avisos do tipo "💡 Considere substituir o #9, ele está com 35% de estamina"

