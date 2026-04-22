

# Plano: Canvas 2D Sem Corte + Auto-escalação no Elenco + Widget Tático Resumo

## Problema 1 — Canvas 2D sendo cortado

O `<HighlightMiniCanvas>` desenha em **480×280** (aspect 12:7 ≈ 1.71), mas o container em `MatchPage` usa `aspect-[16/9]` (1.78). O CSS `width:100%; height:100%` do canvas estica o desenho e **corta o campo**.

### Correção
- **Trocar o aspect do container** de `aspect-[16/9]` → `aspect-[12/7]` para casar com o canvas nativo
- Aplicar a mesma correção em `ReplayPage.tsx`
- O canvas continua respondendo a `width:100%; height:100%`, sem distorção

(Alternativa considerada: fazer canvas redimensionável via ResizeObserver — mais complexo e desnecessário, já que o aspect do desenho é fixo.)

### Quanto à narração desaparecer durante highlight
Hoje, quando `activeHighlight` está ativo, o card de narração ao lado some (já tem `latestEvent && !goalFlash` mas o highlight não esconde explícitamente). Vou:
- **Esconder o card de "Lance ao vivo"** enquanto o highlight 2D está rodando (`!activeHighlight && latestEvent && !goalFlash`)
- Quando o highlight termina e `setActiveHighlight(null)` dispara, o card de narração **volta atualizado** com o último lance

## Problema 2 — Aba Elenco precisa de "Montar Time Automático"

### Botão "⚡ Montar Time Automaticamente" no topo da `SquadTab`
Adicionar um botão acima das sub-abas (Titulares/Reservas/Fora) que:
1. Lê a **formação atual** (de `tactics.formation` salvo no club state — se não houver, usa `4-4-2`)
2. Pega as **posições requeridas** da formação (mesma `getFormationPositions()` já usada em `MatchPage.tsx`)
3. Para cada slot, escolhe o **melhor jogador disponível** com score:
   - +1000 se posição idêntica
   - +500 se mesmo grupo posicional (def/mid/atk)
   - +OVR×10
   - +stamina
   - −1000 se lesionado
4. Reordena `players` via `onReorderPlayers()`: 11 titulares → 12 reservas → resto
5. Toast: "✅ Time montado: 4-4-2 • OVR médio 78"

### Onde pegar a tática atual no SquadTab
- Hoje `SquadTab` não recebe `tactics` como prop. Vou:
  - Buscar `tactics` no `useGame()` (ou via prop nova `tactics` passada pelo `GameTabRouter`)
  - Adicionar prop opcional `tactics?: TacticsConfig` em `SquadTabProps`
  - No `GameTabRouter` passar `tactics={game.tactics}` (já existe no state)

## Problema 3 — Widget pequeno de "Resumo Tático" no fim do Elenco

Após a lista de jogadores (no fim de cada sub-aba ou abaixo de tudo), adicionar um **mini-card compacto** (`p-2`, `border-border/20`) mostrando:

```
┌──────────────────────────────────┐
│ 🎯 Resumo Tático                 │
│ ────────────────────────────────  │
│ Formação: 4-4-2  • OVR Time: 78  │
│ Estilo: Equilibrado              │
│ Pressão: Média  • Ritmo: Normal  │
│ Linha def.: Média • Marcação: Zona│
│                                  │
│ Capitão: Pedrinho (MEI)          │
│ Pênalti: Carlos • Falta: Pedrinho│
│ Escanteio: Junior                │
└──────────────────────────────────┘
```

- Componente local `TacticsSummaryWidget` no fim do `SquadTab.tsx`
- Usa `tactics` (mesma prop) + `players` para resolver nomes do capitão/cobradores
- Só renderiza se `tactics` definido
- Estilo enxuto: `text-[11px]`, ícones 3.5w, sem padding excessivo

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/MatchPage.tsx` | Container do canvas: `aspect-[16/9]` → `aspect-[12/7]`; esconder card de "Lance ao vivo" quando `activeHighlight` está ativo |
| `src/pages/ReplayPage.tsx` | Mesma correção de `aspect-[12/7]` no container do canvas |
| `src/components/game/SquadTab.tsx` | Adicionar botão "⚡ Montar Time Automaticamente"; novo componente `TacticsSummaryWidget` no fim; aceitar prop `tactics?: TacticsConfig` |
| `src/components/game/GameTabRouter.tsx` | Passar `tactics={game.tactics}` para `<SquadTab>` |

## Compatibilidade

- Sem mudança de schema
- Se `onReorderPlayers` não estiver definido, botão fica desabilitado com tooltip "Não disponível"
- Se `tactics` não vier (multiplayer/clube novo), widget tático não renderiza (silencioso)
- Aspect-ratio `12:7` é o desenho nativo, então campo aparece **inteiro** sem distorção em qualquer largura

## Anti-bug

- ✅ Canvas nunca mais cortado — aspect ratio do CSS = aspect ratio do desenho
- ✅ Narração não desaparece permanentemente — só some durante o highlight, volta quando o lance termina
- ✅ "Montar Time" respeita a formação atual e prioriza posição correta + OVR + condição
- ✅ Widget tático compacto não polui a tela (apenas info resumida, ~6 linhas)

