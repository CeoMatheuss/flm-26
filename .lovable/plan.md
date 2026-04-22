

# Plano: Bloqueios Durante Partida + Sistema de Premiações de Fim de Temporada com IA

## Parte 1 — Bloqueios durante partida ao vivo

### 1.1 Detecção global de partida ativa
Criar hook `useActiveMatch` em `src/hooks/useActiveMatch.ts`:
- Lê `live_matches` do usuário com `status = 'live'` (e `current_minute < 90`)
- Realtime listener (postgres_changes) reage a início/fim
- Retorna `{ isInLiveMatch: boolean, matchId: string | null, minute: number }`

### 1.2 Snapshot anti-exploit
Quando partida começa (`start-match` edge function): já persiste `home_players` em `live_matches` (snapshot real do elenco no minuto 0). Reforçar:
- Edge function `start-match` adiciona campo `roster_locked_at = now()` 
- Migration: nova coluna `roster_locked_at TIMESTAMPTZ` em `live_matches`

### 1.3 Bloqueio em ações sensíveis
Componente novo `LiveMatchGuard` (HOC/wrapper) — exibe mensagem "🔒 Ação indisponível durante a partida" e bloqueia clique.

Pontos onde aplicar (envolvendo botões/handlers):
- `SquadTab.tsx` — botões: Rescindir, Listar venda, Emprestar, Trocar número, Renovar, Reordenar
- `OnlineMarketTab.tsx` — botões: Comprar, Listar, Fazer oferta, Empréstimo
- `AuctionTab.tsx` — botão Dar lance + criar leilão
- `PacotinhosTab.tsx` — botão Comprar pacote
- `InfrastructureTab.tsx` — botão Melhorar (qualquer facility)
- `StadiumTab.tsx` — botão Expandir + alterar preço ingresso
- `YouthAcademyTab.tsx` — botão Promover, Vender, Investimento
- `ScoutsTab.tsx` — Contratar/demitir olheiro
- `StaffTab.tsx` — Contratar/demitir staff
- `TacticsTab.tsx` — botão "Salvar" (persistir alteração permanente). Mudança rápida via "⚡ Aplicar Tática" do MatchPage CONTINUA permitida (única exceção)

### 1.4 Toast padrão
Mensagem fixa via `sonner`:
```ts
toast.error("🔒 Ação indisponível durante a partida", { 
  description: "Aguarde o fim do jogo para fazer alterações no elenco/finanças" 
});
```

### 1.5 Indicador visual
Banner fixo no topo do `GameNavBar.tsx` quando `isInLiveMatch`:
- Badge vermelho pulsante "🔴 PARTIDA AO VIVO — Modo Estratégia"
- Botão "Voltar à partida" → navega `/match`

### 1.6 Validação server-side (defesa em profundidade)
Edge functions `process-transfer`, `admin-grant-customization`, `process-free-agent` verificam se `live_matches` ativa do user existe → bloqueiam com erro 423 "Locked".

---

## Parte 2 — Sistema de Premiações de Fim de Temporada

### 2.1 Schema novo
Migration: tabela `season_awards`:
```sql
CREATE TABLE season_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season integer NOT NULL,
  scope text NOT NULL, -- 'global' | 'league'
  scope_id uuid,       -- league_id quando scope='league'
  award_type text NOT NULL, -- 'ballon_dor' | 'top_scorer' | 'top_assists' | 'best_gk' | 'best_team' | 'team_of_season'
  player_name text,
  player_position text,
  player_overall integer,
  user_id uuid,        -- dono do jogador
  club_name text,
  club_logo text,
  stats jsonb DEFAULT '{}',
  score numeric DEFAULT 0,
  ai_image_url text,
  ai_narrative text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE season_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view awards" ON season_awards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage awards" ON season_awards FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
```

### 2.2 Edge function `process-season-awards`
Nova função `supabase/functions/process-season-awards/index.ts`:

**Fluxo**:
1. Recebe `{ season: number, league_id?: string }`. Sem `league_id` = processa TUDO (global + todas ligas)
2. Agrega stats dos jogadores via `match_history` (extraindo `goal_scorers`, `events`, `player_ratings` da temporada)
3. Calcula score por jogador:
   ```ts
   score = goals*4 + assists*3 + cleanSheets*2 + (avgRating-6)*5 + titles*10
   minGames = 10 // filtrar
   ```
4. Para cada categoria, escolhe vencedor (tiebreaker: rating médio → jogos → idade)
5. Para cada award: chama Lovable AI Gateway:
   - `google/gemini-3.1-flash-image-preview` → imagem 1024x1024 (jogador erguendo troféu, estilo cartaz)
   - `google/gemini-2.5-flash` → narrativa pt-BR estilo jornalista esportivo (3 parágrafos)
6. Sobe imagem ao bucket `club-logos` (reaproveitado) → URL público
7. INSERT em `season_awards`
8. INSERT em `journal_updates` com manchete + imagem
9. INSERT em `user_notifications` para vencedores: "🏆 Você ganhou Bola de Ouro temporada X!"

**Categorias geradas**:
- **Globais (1 cada)**: Bola de Ouro, Artilheiro Mundial, Rei das Assistências, Luva de Ouro (melhor GK), Melhor Time do Mundo
- **Por liga (1 cada)**: Melhor Jogador, Artilheiro, Assistências, Melhor GK, Campeão
- **Time da Temporada por liga**: 11 jogadores (1 GK, 4 DEF, 3 MEI, 3 ATA) com maior score por posição → formação 4-3-3

### 2.3 Trigger automático
Edge function `plan-season` (existente, roda via pg_cron no fim do mês) chama `process-season-awards` antes de avançar season. Adicionar bloco no final do handler.

### 2.4 UI — Tela de Premiação
Novo componente `src/components/game/SeasonAwardsModal.tsx`:
- Modal full-screen com fundo dourado animado
- Carrossel de cards (1 award por slide, navegação por setas)
- Cada card: imagem IA (16:9), título do prêmio, jogador + escudo, stats principais, narrativa IA
- Slide especial "Time da Temporada": campo 2D com 11 jogadores posicionados (reusar `FormationView`)
- Footer: botão "Compartilhar no Jornal" (já vai automático) + "Fechar"
- Trigger: ao abrir o jogo, se houver `season_awards` da última season ainda não vista → mostra modal. Persiste `viewed_awards_season` em `profiles`

### 2.5 Aba dedicada
Nova aba "🏆 Premiações" dentro de `TrophiesTab.tsx`:
- Tabs internos: "Esta Temporada" / "Histórico"
- Lista todos awards com filtros (Global / Minha Liga)
- Click no card → reabre `SeasonAwardsModal` naquele award

### 2.6 Newspaper integration
`process-season-awards` insere automaticamente em `journal_updates` com:
- `category: 'awards'`
- `title: "🏆 [Nome] conquista Bola de Ouro da Temporada X!"`
- `content: <narrativa IA>`
- `image_url: <url IA>`
Filtro novo "🏆 Premiações" no `NewspaperFullPage.tsx`.

### 2.7 Notificação push
Para vencedores, INSERT em `user_notifications` com `notification_type: 'award'` → toca som + browser notification (sistema existente).

---

## 3. Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/hooks/useActiveMatch.ts` | **NOVO** — detecta partida ativa via realtime |
| `src/components/game/LiveMatchGuard.tsx` | **NOVO** — wrapper que bloqueia ações sensíveis com toast |
| `src/components/game/GameNavBar.tsx` | +banner "🔴 PARTIDA AO VIVO" quando ativa |
| `src/components/game/SquadTab.tsx` | Envolver handlers de venda/empréstimo/rescindir |
| `src/components/game/OnlineMarketTab.tsx` | Bloquear botões de compra/listagem |
| `src/components/game/AuctionTab.tsx`, `PacotinhosTab.tsx`, `InfrastructureTab.tsx`, `StadiumTab.tsx`, `YouthAcademyTab.tsx`, `ScoutsTab.tsx`, `StaffTab.tsx` | Aplicar `LiveMatchGuard` |
| `src/components/game/TacticsTab.tsx` | Bloquear botão "Salvar" permanente; permitir só via MatchPage |
| Edge `process-transfer`, `process-free-agent` | Validação server-side: 423 se live match |
| Migration | +`roster_locked_at` em `live_matches`; +tabela `season_awards`; +`viewed_awards_season` em `profiles` |
| `supabase/functions/process-season-awards/index.ts` | **NOVA** — agrega stats, gera awards, IA imagens+narrativas, popula tabelas |
| `supabase/functions/plan-season/index.ts` | Chama `process-season-awards` antes de fechar season |
| `src/components/game/SeasonAwardsModal.tsx` | **NOVO** — modal carrossel full-screen |
| `src/components/game/TrophiesTab.tsx` | +Tab "Premiações" com histórico |
| `src/components/game/NewspaperFullPage.tsx` | +filtro "🏆 Premiações" |
| `src/pages/Index.tsx` | Trigger SeasonAwardsModal se houver awards não vistos |
| `supabase/config.toml` | +`[functions.process-season-awards] verify_jwt = false` |

## 4. Validação

- ✅ Tentar comprar jogador durante live match → toast "🔒 Ação indisponível"
- ✅ Tentar iniciar obra → bloqueado
- ✅ Trocar tática rápida no MatchPage → continua funcionando (única exceção)
- ✅ Banner vermelho aparece em todas as abas durante partida
- ✅ Final de temporada → todos vencedores recebem notificação + abrem modal automaticamente no próximo login
- ✅ Imagens IA salvas em bucket público com URL persistente
- ✅ Time da Temporada respeita posições (1 GK, 4 DEF, 3 MEI, 3 ATA)
- ✅ Tiebreaker funciona: empate em gols → desempate por rating médio

## 5. Anti-bug

- ✅ `useActiveMatch` re-checa a cada 30s além de realtime (fallback se WS cair)
- ✅ Snapshot `home_players` já existe em `live_matches` — fonte da verdade durante simulação
- ✅ Validação server-side em edge functions evita bypass via DevTools
- ✅ `process-season-awards` é idempotente: `UNIQUE(season, scope, scope_id, award_type)` evita duplicação
- ✅ Filtro `minGames = 10` evita awards para jogadores com 1 jogo
- ✅ Geração IA com `Promise.allSettled` — se imagem falha, award ainda é criado (só sem foto)
- ✅ Modal de awards usa flag em `profiles` — não mostra duas vezes
- ✅ Bucket `club-logos` reusado (já público) para imagens — sem custo de novo bucket
- ✅ TacticsTab: distinção clara entre "Salvar permanente" (bloqueado) vs "Aplicar agora" no MatchPage (livre)

