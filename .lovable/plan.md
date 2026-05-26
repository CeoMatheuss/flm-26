
# Expansão do Motor de Simulação — FLM 26

Esta é uma mudança grande que toca banco de dados, motor de simulação (edge function `start-match` / engine v2), narrativa, frontend ao vivo e histórico. Vou dividir em fases entregáveis, cada uma testável antes de seguir.

## Visão geral

Hoje o motor já tem: Poisson + pesos posicionais, fases de 10 min, stamina/lesão, moral dinâmica, public/clima/sponsors. Falta variedade real de **tipos de lance**, **contexto narrativo** e **imprevisibilidade controlada**.

A expansão introduz um **catálogo de eventos** dirigido por dados (não hardcoded no engine), pesos modulados por contexto (rivalidade, moral, fadiga, clima, tática, estádio, reputação) e uma camada de narrativa pós-jogo.

---

## Fase 1 — Banco de dados de eventos (fundação)

Tabelas novas (todas RLS pública SELECT, escrita só admin):

- `match_event_catalog` — catálogo central de lances
  - `code` (ex: `attack.counter`, `def.miracle_save`, `gk.penalty_save`, `special.var_disallowed`)
  - `category` (`attack` | `defense` | `midfield` | `goalkeeper` | `special`)
  - `subcategory` (ex: `counter`, `cross`, `long_shot`, `dribble`, `aerial`, `rebound`, `pressing`, `tiki_taka`, `blocked_shot`, `woodwork`, `freak_goal`, `golazo`, `howler`, …)
  - `base_weight` (peso base de ocorrência por fase)
  - `outcome` (`goal` | `shot_on` | `shot_off` | `chance` | `foul` | `card` | `injury` | `flavor`)
  - `min_minute`, `max_minute` (alguns só em fim de jogo, ex: `last_minute_winner`)
  - `requires_context` jsonb (ex: `{"derby": true}`, `{"weather":"heavy_rain"}`, `{"morale_gte":80}`)
  - `narration_templates` text[] (3-6 variantes por evento)
  - `headline_templates` text[] (manchete pós-jogo opcional)
  - `stats_impact` jsonb (ex: `{"shots":1,"shots_on":1,"possession":0}`)

- `match_context_modifiers` — modificadores de peso por contexto
  - `code`, `condition` jsonb, `event_filter` jsonb, `weight_multiplier` numeric
  - Ex: clássico → +40% em `foul`, `card`, `pressing`; chuva forte → −30% em `tiki_taka`, +50% em `howler`; treinador ofensivo → +25% em `counter`, `long_shot`.

- `match_narratives` — narrativa pós-jogo persistida
  - `match_id`, `headline`, `summary`, `man_of_the_match_player_id`, `key_moments` jsonb[], `tactical_read` text, `created_at`

Seed inicial: ~150–200 eventos cobrindo todas as categorias da lista do usuário (ataque, defesa, meio-campo, goleiro, especiais). Cada um com 3–6 variantes de narração em pt-BR.

Histórico: `match_history` ganha colunas `narrative_id uuid`, `event_diversity_score numeric`, `man_of_the_match jsonb`.

## Fase 2 — Engine: seletor de eventos por contexto

Refatorar `supabase/functions/start-match/index.ts` (motor v2):

1. **Contexto da partida** calculado uma vez: `derby` (mesma cidade/país + rivalidade), `crowd_pressure` (público/capacidade), `weather`, `coach_style` (off/def/balanced via tática), `reputation_gap`, `morale_home/away`, `avg_stamina`, `tactical_intensity`.
2. **Loop por minuto** (mantém tick 500ms): em cada "beat de evento", o engine:
   - Busca o catálogo (cache em memória da function).
   - Aplica `match_context_modifiers` → peso final por evento.
   - Sorteia via PRNG `mulberry32` já seedado por `matchId` (mantém determinismo cross-cliente).
   - Resolve outcome: gol/chute/falta/etc. usando atributos reais dos jogadores envolvidos (posicional weighting já existente).
3. **Anti-repetição**: janela deslizante dos últimos N eventos; reduz peso de evento que apareceu há <3 min. Evita "três golaços seguidos".
4. **Imprevisibilidade controlada**: 
   - "Zebra factor" — quando reputação do underdog < favorito, 7% chance por fase de buff temporário no underdog.
   - Eventos `freak_goal`, `howler`, `var_disallowed`, `last_minute_winner` só liberam em janelas/contextos certos.
5. **Substituições e mudanças táticas** já alteram pesos: troca pra mentalidade ofensiva → +pressing/+long_shot, defensiva → −shots/+blocked.

## Fase 3 — Narração e realtime

- Cada evento gerado escolhe um template e injeta nomes (`{player}`, `{assist}`, `{gk}`, `{minute}`). Sai narração diversa, não mais frases fixas.
- `live_matches.events` (jsonb[]) ganha campos: `code`, `category`, `narration`, `context_tags`.
- Frontend (`MatchPage.tsx` + tickers/feeds): renderizar ícone por `category`, badge por `outcome`, cor por `context_tags` (ex: `derby` vermelho). Sem mudar layout atual.
- Realtime continua via `shared_match_id` (já existe).

## Fase 4 — Pós-jogo: manchete, craque, destaques

Ao finalizar (já há trigger `check_finished`):
- Calcular **Man of the Match**: score por gols (×4), assistências (×3), defesas decisivas (×2.5), passes-chave, notas táticas, penalidade por cartão/erro grave.
- Gerar **headline** a partir de `headline_templates` do evento mais marcante + contexto (virada, goleada, zebra, clássico).
- Gerar **tactical_read** curto (2-3 frases) explicando como a partida fluiu (posse, chances, ritmo).
- Persistir em `match_narratives` + ligar em `match_history.narrative_id`.
- Integrar com sistema de Jornal (já existe) — manchetes viram notícias.

## Fase 5 — Estatísticas detalhadas + diversidade

- `match_stats` por partida (já parcial): garantir posse, chutes, chutes no gol, escanteios, faltas, cartões, impedimentos, passes certos %, duelos ganhos, **distribuição por categoria de evento** (mostra que partida foi "truncada" vs "aberta").
- `event_diversity_score`: entropia das categorias dos eventos da partida. Exposto no histórico e usado pra QA detectar partidas repetitivas.

## Fase 6 — Integrações

- **Ranking online**: pontuação base mantida; bônus pequeno por vitória com `event_diversity_score` alto (jogo memorável). Opcional.
- **Notícias automáticas**: manchetes da Fase 4 entram em `news_articles`.
- **Lesões em jogo**: já existem; agora vinculadas ao evento `special.in_match_injury` com narração própria.
- **Confusão/VAR/última hora**: novos eventos especiais com efeitos visuais leves no feed (sem mudar UI de placar).

---

## Plano técnico

**Arquivos / áreas tocadas:**
- `supabase/migrations/*` — Fase 1 (tabelas + seed) e Fase 5 (colunas extras).
- `supabase/functions/start-match/index.ts` — Fases 2, 3, 4 (refator do gerador de eventos).
- `supabase/functions/finish-match/` (ou trigger existente) — Fase 4 (narrativa, MOTM).
- `src/pages/MatchPage.tsx` e `src/components/match/*` — Fase 3 (render do feed expandido) e Fase 4 (tela pós-jogo com headline/MOTM).
- `src/components/news/*` — Fase 6 (manchete).
- Memory: atualizar `mem://features/match-simulation-engine-v2` ao final.

**Compatibilidade:**
- Mantém `shared_match_id`, PRNG mulberry32 seedado por `matchId`, RLS `is_match_participant`, orientação autoritativa do mandante. Nada disso muda.
- Eventos antigos continuam funcionando até o catálogo virar fonte única (migração suave, fallback no engine).

**Performance:**
- Catálogo + modificadores carregados 1x por simulação (cache na function). Sorteio é O(N) com N≈200, trivial.
- Frontend continua recebendo eventos via Realtime; payload por evento aumenta ~80 bytes (narração).

**Riscos / decisões:**
- Catálogo grande → vou começar com ~150 eventos bem cobertos em vez de 500 medianos.
- Imprevisibilidade x justiça competitiva: zebra factor limitado (7%) e só em fase certa, pra não quebrar ranking.
- Não vou mexer em mercado, finanças, juventude, nem em layout da tela de partida — só feed/pós-jogo.

---

## Ordem de execução proposta

1. Fase 1 (migration + seed) — entregar e validar antes de seguir.
2. Fase 2 (engine usa catálogo) — testar em amistoso.
3. Fase 3 (narração no feed).
4. Fase 4 (pós-jogo + MOTM + headline).
5. Fase 5 (stats + diversity score).
6. Fase 6 (notícias + ranking bônus).

Posso começar pela Fase 1 assim que aprovar. Quer que eu já inclua os ~150 eventos no seed inicial ou prefere começar com ~60 e expandir depois?
