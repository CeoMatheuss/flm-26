

# Plano: Auto-simulação Silenciosa + Layout Compacto da Partida

## Parte 1 — Auto-simulação aparece como resultado normal

Hoje, quando a janela de 5 min expira, o widget mostra:
- Badge "⚙️ Simulada automaticamente"
- Texto "⏰ Janela de 5 min expirou — partida simulada pelo servidor"
- Bloco cinza desabilitado

**O que muda**: removo TUDO isso. Quando a partida foi auto-simulada pelo cron, o widget mostra **exatamente como uma partida normal finalizada** — placar final, badge "Final", botão "VER RELATÓRIO". Sem nenhuma indicação de "automática" na frente do usuário.

### Arquivo: `MatchDashboardCard.tsx` (`NextTournamentMatch`)
- **Remover**: estado `isExpired`, badge "Simulada automaticamente", bloco "Janela de 5 min expirou"
- **Novo comportamento quando expirado**: refazer query para buscar a partida como `status='finished'` (a edge function `auto-simulate-expired-matches` já marcou) e renderizar o **mesmo bloco de "última partida finalizada"** com placar e botão "VER RELATÓRIO"
- Polling a cada 10s enquanto janela está expirada-mas-ainda-scheduled, para pegar o momento que o cron simula

### Arquivo: `MatchReportModal.tsx`
- **Remover** badge "🤖 Simulação Automática" (campo `auto_simulated` continua no DB para auditoria, mas invisível ao usuário)

## Parte 2 — Layout compacto da página de partida

Hoje a `MatchPage` empilha tudo verticalmente em coluna única, ocupando muito espaço:
- Placar grande
- Posse de bola
- Momento do jogo
- Dica do assistente
- Canvas 2D (highlight)
- Narração ao vivo (card grande)
- 4 stats em grid horizontal
- Feed de narração (chat)
- Estatísticas, Escalações, Táticas, Substituições (cada um em Card grande sequencial)

**Novo layout (desktop ≥1024px)**: grid 2 colunas
```
┌──────────────────────────────────┬─────────────────┐
│  Placar + Cronômetro (compacto)  │   SIDEBAR       │
│  Canvas 2D highlight             │ ─────────────── │
│  Narração lance atual            │ 📊 Stats rápidas│
│                                  │ (4 cards menores│
│                                  │  empilhados)    │
│  Feed de narração (chat)         │                 │
│  [altura reduzida 280px]         │ ⚡ Momento jogo │
│                                  │ 💬 Dica assist. │
│                                  │ 🔄 Subs status  │
└──────────────────────────────────┴─────────────────┘
↓ Abaixo: Acordeões compactos (Estatísticas, Escalação, Táticas, Subs)
```

**Mobile (<1024px)**: mantém coluna única atual mas com widgets reduzidos.

### Mudanças concretas em `MatchPage.tsx` (componente `MatchViewer`)

| Elemento | Mudança |
|---|---|
| Card de placar | Padding reduzido `p-2 sm:p-3` (era `p-3 sm:p-6`); fontes menores: placar `text-3xl sm:text-4xl` (era `text-5xl`) |
| Posse de bola | Barra mais fina (`h-2`), labels `text-xs` |
| Momento do jogo | Vai pra **sidebar direita**, mostra só ícone+label compacto |
| Dica do assistente | Vai pra **sidebar direita**, card menor com avatar 5x5, sem padding extra |
| Canvas 2D highlight | Mantém posição mas altura reduzida (canvas `h-32 sm:h-40` em vez de `h-48`) |
| Narração lance atual | Card mais fino: `py-2 px-3`, fonte `text-sm` (era `text-lg`) |
| Quick Stats Row | **Move pra sidebar** em desktop, vira grid 2x2 vertical compacto. Em mobile, fica abaixo do canvas com `text-xs` e `p-1.5` |
| Feed de narração (chat) | Altura `max-h-[280px] sm:max-h-[320px]` (em vez de até 340px). Linhas mais densas: padding `py-1.5` |
| Acordeões (Stats/Escalação/Táticas/Subs) | Convertidos de Cards grandes sempre-abertos para `<Collapsible>` fechados por padrão, headers compactos `py-2` |
| Container principal | Em desktop: `max-w-6xl` com grid `lg:grid-cols-[1fr_280px] gap-4`. Mobile inalterado (`max-w-2xl`) |

### Componente novo: `MatchSidebar.tsx`
Pequeno componente que agrupa na coluna direita (só aparece em `lg:` e acima):
- 📊 4 mini-stats verticais (chutes, no gol, escan., faltas)
- ⚡ Badge do momento atual
- 💬 Última dica do assistente (compacta)
- 🔄 Status de substituições (`X/5 usadas`)

### Componente afetado: `ChatEventRow` (linhas do feed)
- Reduzir padding vertical de `py-2` → `py-1.5`
- Fonte `text-xs` no minuto, `text-sm` no texto (era `text-base`)
- Badge minute `text-[10px]`

### `ReplayPage.tsx`
- Aplicar mesma redução de tamanhos no card de comentário e altura do feed de narração para manter consistência com replays.

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/game/MatchDashboardCard.tsx` | Remover UI de "auto-simulada"; tratar partida expirada como finalizada normal; polling a cada 10s |
| `src/components/game/MatchReportModal.tsx` | Remover badge "🤖 Simulação Automática" |
| `src/pages/MatchPage.tsx` | Reduzir tamanhos de widgets, adicionar grid 2 colunas em desktop, converter sections em Collapsibles |
| `src/components/game/MatchSidebar.tsx` (NOVO) | Sidebar compacta para desktop com stats/momento/dica/subs |
| `src/pages/ReplayPage.tsx` | Compactar narração e comentário para consistência |

## Compatibilidade

- Sem mudança de schema (campo `auto_simulated` continua no `match_data`, apenas oculto da UI)
- Mobile mantém layout vertical atual (responsivo)
- Polling de 10s no widget é leve (só pra partidas expiradas pendentes — caso raro)
- Acordeões fechados por padrão em desktop, abertos por padrão em mobile (sem perda de funcionalidade)

## Anti-bug

- ✅ Se o cron ainda não simulou (race), polling continua até pegar `status='finished'`
- ✅ Sem regressão visual em mobile
- ✅ Substituições, táticas, escalações continuam totalmente acessíveis (acordeões expansíveis)
- ✅ Edge function `auto-simulate-expired-matches` já existente continua funcionando — só a UI muda

