

# Plano: Simulação Confiável + Obras Premium Inteligentes + Visual Refinado da Partida

## 1. Diagnóstico do "trava no minuto 5"

**Causa raiz**: A simulação completa (90 min + eventos + estatísticas) já é gerada de forma síncrona no servidor (`start-match`) e gravada em `live_matches` (status `'live'`). O cliente apenas **revela eventos progressivamente** ao longo de 12 minutos reais (`durationMs = 720s`).

O minuto 5 corresponde ao **fim da janela de "manual start" / metade do tempo real (≈ 6 min)**. Casos onde "trava":
- `live_matches.status` fica `'live'` mas o `setInterval` para de tickar (aba em background, throttling)
- `data.startTime` fica desalinhado do servidor (clock skew muito alto)
- Após 12 min, o cliente nunca atualiza `status='finished'` se o usuário fechou a aba antes do persistir
- Não há "watchdog" para forçar finalização se algum tick falhar

## 2. Sistema de estados robusto com auto-finalização (cliente)

### `useMatchSimulation.ts`
- **Watchdog**: a cada tick, se `elapsed >= durationMs + 30s` E `phase !== 'finished'`, **forçar finalização**: usar `data.finalHomeGoals/finalAwayGoals` (já estão no `dataRef`) e marcar `phase = 'finished'`.
- **Re-sync ao voltar pra aba** (`document.visibilitychange`): re-rodar `tick()` imediatamente para "pular" eventos perdidos durante throttling.
- **Persistência idempotente**: persistir `status='finished'` mesmo se já foi tentado uma vez (novo retry após 5s se erro).
- **Garantia de placar**: se `data.allEvents.length === 0` (caso raro), gerar placar default `0x0` válido em vez de travar em loading.

### Edge function `start-match`
- Já gera 90 min completos. Adicionar **fallback**: se `simulateFullMatch` retornar `events.length === 0`, criar pelo menos 3 eventos (kickoff, halftime, final_whistle) + placar com base em `homeStrength/awayStrength` (Poisson simples).
- **Pré-validação**: se `homePlayers.length === 0`, retornar 400 claro em vez de tentar simular com pool vazio.

### Auto-cleanup de partidas órfãs (já existe `auto-simulate-expired-matches`)
- Verificar se está rodando via `pg_cron`. Se não estiver, agendar para rodar a cada 5 min: marca como `'finished'` qualquer `live_matches` com `started_at + duration_seconds + 5min < now()`.

## 3. Obras + Premium inteligente

### Hook `useInfraState.ts`
Adicionar novo `useEffect` que observa **mudança de `isPremium`**:

```ts
useEffect(() => {
  if (!isPremium) return;
  const completesAt = infrastructure.youthAcademy.upgradeCompletesAt;
  if (!completesAt) return;
  // Premium ativado durante obra: concluir imediatamente
  setInfrastructure(prev => ({
    ...prev,
    youthAcademy: { 
      ...prev.youthAcademy, 
      level: prev.youthAcademy.level + 1, 
      upgradeCompletesAt: undefined 
    },
  }));
  toast.success('⭐ Obra concluída instantaneamente pelo Premium!');
  if (userId) {
    // Inserir em user_notifications (sino) + newspaper
    supabase.from('user_notifications').insert([{
      user_id: userId,
      title: '🏗️ Obra Concluída — Premium',
      message: 'Sua obra na Academia foi concluída automaticamente devido ao seu Premium ativo.',
      category: 'EVOLUÇÃO',
    }]);
    supabase.from('newspaper_entries').insert([{
      user_id: userId,
      text: `⭐ Premium ativado: obra na Academia concluída instantaneamente — Nv.${infrastructure.youthAcademy.level + 1}`,
      category: 'EVOLUÇÃO', is_event: true,
    }]);
  }
}, [isPremium]);
```

### Regras
- **Sem premium ao iniciar obra**: timer de 24h funciona normalmente (já existe).
- **Premium ativado durante obra**: detecção automática + conclusão imediata + notificação no sino.
- **Progresso nunca perdido**: o `level` só é incrementado quando a obra realmente termina (timer OU premium), nunca antes.
- **UI atualizada**: o `setInfrastructure` triggers re-render → `YouthAcademyTab` reflete imediatamente.

### Notificação no sino
Verificar tabela `user_notifications` (caso não exista uma com esse nome, usar `newspaper_entries` com flag `is_notification` ou checar `notification-system-v2` em memory). Vou usar a estrutura já estabelecida do sistema de notificações v2.

## 4. Visual refinado da partida (rolagem colorida + design)

### Feed de narração (`EventFeed` / `MinuteSeparator`)
- **Background sutil colorido por time** em cada `ChatEventRow`:
  - `team === 'home'` → `bg-gradient-to-r from-primary/[0.04] to-transparent border-l-2 border-primary/30`
  - `team === 'away'` → `bg-gradient-to-l from-red-500/[0.04] to-transparent border-r-2 border-red-500/30`
  - `team === 'neutral'` → fundo neutro
- **Scrollbar customizada** combinando com tema da partida:
  ```css
  .match-feed-scroll::-webkit-scrollbar { width: 6px; }
  .match-feed-scroll::-webkit-scrollbar-thumb { 
    background: linear-gradient(to bottom, hsl(var(--primary) / 0.3), hsl(var(--primary) / 0.1)); 
    border-radius: 3px;
  }
  .match-feed-scroll::-webkit-scrollbar-track { background: hsl(var(--muted) / 0.05); }
  ```
- **Separador de minuto** ganha gradient: `bg-gradient-to-r from-transparent via-primary/[0.06] to-transparent` em vez de `bg-muted/5`.

### Card principal (placar ao vivo)
- Adicionar **glow sutil pulsante** na borda quando há gol nos últimos 8s: `box-shadow: 0 0 20px hsl(var(--primary) / 0.3)` com animação.
- **Backdrop blur** no scoreboard durante highlights 2D para dar profundidade.

### Mini-widgets permanentes
- Adicionar gradient sutil de fundo: `bg-gradient-to-br from-card to-card/50`.
- Ícone do adversário ganha aro colorido pulsante quando o "Pulso" indica pressão dele.

### Highlight 2D
- Adicionar **fade-in suave** (300ms) na entrada e fade-out na saída, sem corte abrupto.
- Sombra dourada animada no card durante highlight ativo.

## 5. Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/match/useMatchSimulation.ts` | Watchdog `elapsed > durationMs+30s` força finished; listener `visibilitychange` re-tick imediato; retry de persist após 5s; fallback `0x0` se eventos vazios |
| `supabase/functions/start-match/index.ts` | Validação `homePlayers.length > 0` (400 claro); fallback de 3 eventos mínimos se sim retornar vazio |
| `src/hooks/useInfraState.ts` | Novo `useEffect([isPremium])` que conclui obra pendente automaticamente + insere notificação no sino + entrada no jornal |
| `src/pages/MatchPage.tsx` | `ChatEventRow`: bg gradient por time + border lateral colorida; `MinuteSeparator` com gradient; scrollbar customizada via classe; glow pulsante no scoreboard em gols recentes; fade-in/out no highlight 2D |
| `src/index.css` | Classe `.match-feed-scroll` com webkit scrollbar customizada (cor primary com gradient) |
| `supabase/migrations/...sql` | Garantir cron `auto-simulate-expired-matches` rodando a cada 5min (se não estiver) |

## Anti-bug

- ✅ Watchdog garante que partida nunca trava — após 12min30s força finished com placar válido
- ✅ Fallback de eventos vazios garante placar coerente sempre (mínimo 3 eventos: kickoff, halftime, final)
- ✅ `isPremium` muda → obra pendente conclui em 1 ciclo de render, sem race condition
- ✅ Progresso da obra nunca é perdido: `upgradeCompletesAt` só é limpo quando level realmente sobe
- ✅ Bg colorido do feed mantém legibilidade (opacidade ≤ 6%)
- ✅ Scrollbar customizada usa tokens semânticos (`hsl(var(--primary))`) para respeitar tema
- ✅ Fade-in do 2D usa CSS (`transition`), não bloqueia interação
- ✅ Notificação Premium só dispara 1x (controlada pelo `useEffect` reagindo à mudança de `isPremium`, não loop)
- ✅ Retroativamente compatível: usuários sem `upgradeCompletesAt` não disparam o effect

