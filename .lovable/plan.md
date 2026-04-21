

# Plano: Corrigir Spoiler do Placar no Dashboard + Enriquecer Widgets da Partida

## Problema 1 — Spoiler do Placar Final no Dashboard

Quando o usuário sai da partida em andamento, o card "PARTIDA ATUAL" no dashboard mostra **0-2** mesmo quando o jogo está só no 75'. Isso acontece porque a Edge Function `start-match` já grava o **placar FINAL** nas colunas `home_goals` e `away_goals` da `live_matches` no momento da criação (linhas 970-995 da Edge Function), e o dashboard lê esses campos brutos como se fossem o placar atual.

### Solução

Em `src/components/game/MatchDashboardCard.tsx` (função `fetchLive`, linhas ~289-333), em vez de usar `data.home_goals`/`data.away_goals` diretamente, **contar gols dos `events` filtrados por `currentMinute`**:

```ts
const visibleGoals = events.filter(e => e.minute <= gameMin && e.isGoal);
const liveHomeGoals = visibleGoals.filter(e => e.team === 'home').length;
const liveAwayGoals = visibleGoals.filter(e => e.team === 'away').length;
setCurrentHomeGoals(liveHomeGoals);
setCurrentAwayGoals(liveAwayGoals);
```

Assim o placar exibido no dashboard fica sincronizado com o minuto atual e nunca mostra antecipadamente o resultado final.

Aplicar a mesma lógica no `MatchPage.tsx` quando exibir o placar ao vivo, garantindo consistência entre dashboard e página da partida.

---

## Problema 2 — Widgets na Partida (Tática / Time / Stats / Técnico)

Os widgets já existem dentro de `MatchPage.tsx` (linhas 707-887), substituindo os botões antigos. Cada um mostra:

- **⚙️ Tática** → formação atual (ex: "4-4-2")
- **👥 Time** → "X/5 subs" + badge de fila/cadeado
- **📊 Stats** → "X% posse"
- **📋 Técnico** → "X dicas" + badge pulsante

### Melhorias para deixar mais informativos

Enriquecer cada widget com mais dados em tempo real:

| Widget | Info adicional |
|---|---|
| **Tática** | Linha extra abaixo da formação: estilo + pressão (ex: "Ofensivo · Alta pressão") |
| **Time** | Mostrar jogador mais cansado abaixo (ex: "⚠️ #9 35% energia") quando algum titular estiver < 50% estamina |
| **Stats** | Adicionar mini-display: "Chutes 4-2" abaixo da posse |
| **Técnico** | Preview da última dica truncada (ex: "Substitua o #9...") |

Manter o tamanho atual dos widgets e cores (emerald/blue/yellow/amber). Apenas adicionar uma segunda linha de texto menor (`text-[10px] sm:text-xs text-muted-foreground`) abaixo do valor principal em cada um.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/game/MatchDashboardCard.tsx` | Calcular placar a partir de `events` filtrados por minuto (corrige spoiler) |
| `src/pages/MatchPage.tsx` | Adicionar 2ª linha de info nos 4 widgets (tática/time/stats/coach) |

