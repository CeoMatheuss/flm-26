

# Plano: Táticas em Tempo Real + Lobby Online 5min + Painel Admin Reorganizado

## 1. Táticas em tempo real (impacto vivo na simulação)

### 1.1 Adicionar estilos pedidos
Hoje existem 9 estilos. Faltam 2 do pedido com nomes próprios:
- `'retranca-total'` → versão extrema do `defensivo` (atk 0.65 / def 1.45)
- `'pressao-alta'` → renomear interno para alinhar com pedido (alias do `gegenpressing`, mas com label "Pressão Alta")

Os 6 estilos do pedido mapeiam para:
| Pedido | Engine |
|---|---|
| Retranca Total | `retranca-total` (novo) |
| Equilibrado | `equilibrado` |
| Ataque Total | `ofensivo` (label muda para "Ataque Total") |
| Contra-Ataque | `contra-ataque` |
| Pressão Alta | `pressao-alta` (alias gegenpressing) |
| Defesa Total | `defensivo` (label "Defesa Total") |

Os outros 5 estilos avançados (tiki-taka, parking-bus, etc) ficam como **"Avançadas"** num accordion separado.

### 1.2 Interações entre táticas (matchups)
No `start-match/index.ts`, adicionar matriz `MATCHUP_BONUS` que ajusta `homeExpected`/`awayExpected` baseado no par de estilos:
```ts
const MATCHUP: Record<string, Record<string, { homeAtk: number; homeDef: number }>> = {
  'ofensivo':       { 'contra-ataque': { homeAtk: 1.05, homeDef: 0.85 } },     // jogo aberto
  'retranca-total': { 'ofensivo':     { homeAtk: 0.80, homeDef: 1.20 } },      // poucos gols
  'defensivo':      { 'contra-ataque': { homeAtk: 0.85, homeDef: 1.10 } },     // jogo travado
  'pressao-alta':   { 'posse':       { homeAtk: 1.15, homeDef: 0.95 } },       // press funciona
  // ... 6x6 matriz simétrica
};
```
Aplicado depois dos `STYLE_MODS` antes do cálculo de Poisson. Resultado: trocar Ataque Total contra Contra-Ataque produz mais finalizações; Retranca vs Ataque produz menos gols.

### 1.3 Mudança em tempo real durante a partida
Hoje a simulação inteira é gerada **uma única vez** no servidor antes do tick começar. Para que mudar tática durante o jogo tenha efeito:

**Solução híbrida**: persistir mudança em `live_matches.tactics` (já existe coluna). Adicionar nova edge function `re-simulate-from-minute`:
- Recebe `live_match_id` + `from_minute` + `new_tactics`
- Lê o estado atual (placar até X', stats acumuladas, players com stamina/morale do último evento)
- Re-simula minutos `from+1 .. 90` com novos modificadores
- Substitui o array `events` mantendo eventos de `minute <= from_minute`
- Atualiza `live_matches` com novo array; o tick do cliente continua revelando

No cliente (`MatchPage.tsx`): no botão "Aplicar Tática" durante partida ao vivo, chamar a função, aguardar 1-2s, recarregar `dataRef` do hook. Toast: "🔄 Time se ajusta — efeito a partir do minuto X'".

**Limitação documentada**: mudanças válidas no máximo 1x a cada 15 min de jogo (cooldown), evita spam.

### 1.4 UI da troca rápida em jogo
Card flutuante novo "⚡ Tática Rápida" no `MatchPage.tsx`:
- 6 botões grandes (1 por estilo principal) em grid 3x2
- Indicador do estilo atual com glow
- Cooldown visível (badge "🔒 Disponível em 8 min")
- Texto curto do efeito previsto vs adversário ("vs Ataque Total: jogo aberto, mais gols")

## 2. Sistema online — Lobby de 5 minutos com fallback IA

### 2.1 Diagnóstico atual
- Amistosos online (`friendly_invites`): match começa quando ambos clicam "JOGAR PARTIDA" na janela existente.
- Partidas de liga (`league_matches`): cada usuário simula localmente o seu lado.
- Não há "lobby compartilhado" onde ambos esperam — cada um simula isolado.

### 2.2 Nova máquina de estados de partida online
Adicionar coluna em `friendly_invites` e `league_matches`:
- `lobby_opened_at TIMESTAMP` — quando o primeiro jogador entrou
- `home_joined BOOL DEFAULT false` / `away_joined BOOL DEFAULT false`
- `auto_sim_at TIMESTAMP` — `lobby_opened_at + 5 min`

Estados:
1. **Pré-jogo** — janela de início aberta (já existe)
2. **Lobby** — primeiro jogador clicou "Entrar"; timer de 5min começa
3. **Ao vivo (sincronizado)** — ambos entraram, partida tempo real para os dois
4. **Ao vivo (1 lado IA)** — só 1 entrou após 5min; segundo time vira IA (usa squad real do ausente)
5. **Auto-simulada** — ninguém entrou em 5min; resultado gerado server-side via `auto-simulate-expired-matches` (já existe)
6. **Finalizada** — placar + eventos persistidos

### 2.3 Implementação
**Edge function nova `match-lobby-join`**:
- Recebe `match_type` (friendly/league) + `match_id` + `user_id`
- Atomicamente: marca `home_joined`/`away_joined`, set `lobby_opened_at` se primeiro
- Retorna estado: `'waiting_other'` | `'both_ready'` | `'start_with_ai'` (se já passou 5min)

**Edge function `auto-simulate-expired-matches`** (existente): adicionar verificação para `friendly_invites` e `league_matches` com `auto_sim_at < now()` E nenhum entrou. Já roda via `pg_cron`.

**Cliente — novo `MatchLobbyScreen`**:
- Mostra "⏳ Aguardando adversário... 4:23"
- Status do oponente: "🟢 Online" (via `user_presence`) / "🔴 Offline"
- Após 5min: 2 botões "▶ Jogar contra IA do oponente" ou "🤖 Deixar simular"
- Realtime listener no row da partida → quando oponente entra, navega ambos para `/match`

**Resultado**: nenhuma partida trava; sempre há fim em ≤ 12 min reais (5min lobby + 7min sim curta) ou simulação instantânea pelo cron.

## 3. Reorganização do Painel Admin (mobile-first)

### 3.1 Hoje: 13 abas planas em scroll horizontal — confuso, não cabe no mobile.

### 3.2 Nova estrutura: 6 categorias com sub-abas
Sidebar (desktop) / Drawer (mobile) com:

```
🌍 Ligas       → SystemPanel atual (Países & Pirâmide, Temporada)
🏆 Copas       → SystemPanel (Copas, Torneios admin)
👥 Clubes      → Usuários + Premium + Bans + GameBan
👤 Players     → Gerar (founder), Anti-abuso
⚙️ Sistema     → Atualizações, Anúncios IA, Msg Direta, Moderação Chat, Equipe (founder)
📊 Simulação   → SimulationValidationTab + estatísticas
```

### 3.3 Layout responsivo
- **Desktop ≥1024px**: Sidebar fixa (224px) à esquerda + conteúdo à direita
- **Tablet 640-1024px**: Top tabs com ícones grandes + label
- **Mobile <640px**: Drawer lateral via hamburger no header da página + bottom-bar com 6 ícones

Componente novo `AdminLayout` envolve `AdminTab.tsx`:
- Usa `Sidebar` do shadcn em desktop (`collapsible="icon"`)
- Usa `Drawer` em mobile
- Cada categoria carrega suas sub-abas em `Tabs` interno

### 3.4 Hierarquia visual limpa
- Cards com padding consistente (`p-4`)
- Stats cards no topo de cada aba (não duplicar números)
- Filtros e ações sempre no header da aba (não espalhados)
- Remover ícones em duplicidade

## 4. Validação

- ✅ Trocar tática durante a partida muda eventos do minuto seguinte em diante
- ✅ Matriz de matchup torna confronto Retranca vs Ataque previsivelmente baixo (≤ 1.5 gols esperados)
- ✅ Lobby de 5min sempre converge: ambos online → tempo real / 1 online → IA / 0 online → cron simula
- ✅ Painel admin ≤ 6 cliques para qualquer ação; 100% navegável em viewport 375px
- ✅ Cron `auto-simulate-expired-matches` roda a cada 5min (verificar agendamento)
- ✅ Cooldown 15min em troca de tática evita abuso

## 5. Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/types/tactics.ts` | +`'retranca-total'`, +`'pressao-alta'` em `PlayStyle`; entradas em `playStyleEffects` com filosofia/bullets |
| `src/components/game/TacticsTab.tsx` | Reorganizar grid em "Principais (6)" + accordion "Avançadas (5)" |
| `supabase/functions/start-match/index.ts` | +`MATCHUP` matriz; +entradas no `STYLE_MODS` para 2 novos estilos; usa matchup para ajustar `homeExpected`/`awayExpected` |
| `supabase/functions/re-simulate-from-minute/index.ts` | **NOVA** — re-simula minutos restantes com novas táticas |
| `supabase/functions/match-lobby-join/index.ts` | **NOVA** — registra entrada no lobby, retorna estado |
| `src/pages/MatchPage.tsx` | Card flutuante "⚡ Tática Rápida" com 6 botões + cooldown; chama `re-simulate-from-minute` ao trocar |
| `src/components/game/MatchLobbyScreen.tsx` | **NOVO** — tela de espera 5min com countdown e fallback |
| `src/components/game/OnlineFriendliesTab.tsx` | Botão "JOGAR" agora abre `MatchLobbyScreen` antes de `/match` |
| `src/components/game/MatchesTab.tsx` | Idem para partidas de liga |
| `src/components/game/AdminLayout.tsx` | **NOVO** — Sidebar/Drawer responsivo com 6 categorias |
| `src/components/game/AdminTab.tsx` | Refatorar para usar `AdminLayout`; agrupar 13 abas atuais em 6 categorias |
| Migration SQL | +colunas `lobby_opened_at`, `home_joined`, `away_joined`, `auto_sim_at` em `friendly_invites` e `league_matches`; cron `auto-simulate-expired-matches` a cada 2min |

## 6. Anti-bug

- ✅ `re-simulate-from-minute` valida minuto < 90 e cooldown server-side (não confia no cliente)
- ✅ Lobby join é idempotente (UPDATE ... WHERE NOT joined) — duplo clique não quebra
- ✅ Realtime listener no lobby usa filtro por `match_id` para evitar leak entre partidas
- ✅ Auto-simulação respeita squad real (já implementado em `awayPlayers`) → resultado é justo
- ✅ AdminLayout preserva estado atual de aba ao trocar viewport (drawer ↔ sidebar)
- ✅ Matchup matrix é simétrica e tem fallback `{ homeAtk: 1.0, homeDef: 1.0 }` para combos não definidos
- ✅ Estilos antigos (tiki-taka etc) continuam funcionando — só ficam em "Avançadas"
- ✅ Cooldown de troca tática armazenado em `live_matches.tactics.lastChangedAt` (não nova tabela)

