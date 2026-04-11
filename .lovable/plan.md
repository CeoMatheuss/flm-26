

# Plano: Sistema Global de Competições — Pirâmide, Copas e Continentais

## Escopo

Reestruturar completamente o sistema de ligas para um ecossistema de futebol global com pirâmide de divisões, copas nacionais/regionais, competições continentais e mundial de clubes. Tudo automático, escalável e sem intervenção manual.

## Visão Geral da Arquitetura

```text
PIRÂMIDE POR PAÍS (20 times cada)
├── Nacional Div 1-4        (top tier)
├── Regional Div 1-5        (mid tier)
├── Pré-Regional Div 1-8    (base tier)
└── Várzea                  (entrada)

COPAS
├── Copa Nacional (Div 1-4)
├── Copa Regional (Regional 1-5)
├── Copa Continental (Top 8 por país)
└── Mundial de Clubes (campeões nacionais, T2+)
```

## Problema: Escala

Este sistema implica até **18 ligas × 20 times = 360 times por país × 38 países = 13.680 slots**. A maioria será bots no início. Precisamos de:
- Tabelas novas para copas e calendário
- Edge function robusta de planejamento mensal
- Lógica de bloqueio de país e incentivos

---

## Fase 1 — Banco de Dados (Migrações)

### 1.1 Alterar `multiplayer_leagues`
Adicionar colunas:
- `tier` TEXT (nacional/regional/pre_regional/varzea)
- `tier_level` INT (nível dentro do tier, ex: Regional Div 3 = tier_level 3)
- `season_month` INT (mês da temporada)
- `season_year` INT
- `match_time` TEXT (horário fixo dos jogos dessa liga)

### 1.2 Nova tabela `cup_competitions`
```sql
CREATE TABLE cup_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cup_type TEXT NOT NULL, -- 'national', 'regional', 'continental', 'world'
  country TEXT,
  continent TEXT,
  season_month INT,
  season_year INT,
  format TEXT DEFAULT 'knockout',
  status TEXT DEFAULT 'pending',
  current_round INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.3 Nova tabela `cup_matches`
```sql
CREATE TABLE cup_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id UUID REFERENCES cup_competitions(id),
  round INT NOT NULL,
  leg INT DEFAULT 1, -- 1=ida, 2=volta
  home_user_id UUID,
  away_user_id UUID,
  home_bot_id TEXT,
  away_bot_id TEXT,
  home_goals INT,
  away_goals INT,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  match_data JSONB DEFAULT '{}'
);
```

### 1.4 Nova tabela `cup_teams`
```sql
CREATE TABLE cup_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cup_id UUID REFERENCES cup_competitions(id),
  user_id UUID,
  is_bot BOOLEAN DEFAULT false,
  bot_name TEXT,
  bot_strength INT DEFAULT 60,
  club_name TEXT NOT NULL,
  eliminated BOOLEAN DEFAULT false
);
```

### 1.5 Nova tabela `country_status`
```sql
CREATE TABLE country_status (
  country TEXT PRIMARY KEY,
  total_players INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  max_capacity INT DEFAULT 400,
  bonus_budget BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.6 Nova tabela `season_calendar`
```sql
CREATE TABLE season_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  season_month INT,
  season_year INT,
  day INT NOT NULL,
  league_id UUID,
  cup_id UUID,
  match_time TEXT,
  match_type TEXT, -- 'league', 'cup_national', 'cup_regional', 'cup_continental'
  status TEXT DEFAULT 'pending'
);
```

RLS: Todas com SELECT público autenticado, INSERT/UPDATE via service_role ou admin.

---

## Fase 2 — Edge Function: Planejador de Temporada

Nova Edge Function `plan-season/index.ts` executada no último dia do mês (via pg_cron):

### Responsabilidades:
1. **Inventário**: Contar jogadores reais por país
2. **Criar pirâmide**: Para cada país, criar ligas conforme jogadores disponíveis
   - Se < 20 jogadores: apenas Várzea com bots
   - Se 20-80: Várzea + Pré-Regional
   - Se 80-260: + Regional
   - Se 260+: + Nacional
3. **Preencher com bots**: Completar cada liga para exatos 20 times
4. **Promoção/Rebaixamento**: Top 3 sobem, últimos 3 descem
5. **Substituir bots**: Quando jogador real entra, substitui bot automaticamente
6. **Gerar calendário**: 
   - 1 rodada/dia (round-robin com 19 rodadas para 20 times)
   - Distribuir horários entre ligas
   - Máximo 2 jogos/dia por time
7. **Criar copas**: Nacional (mata-mata Div 1-4), Regional, Continental
8. **Ajuste de meses curtos**: Se fevereiro não tem dias suficientes, iniciar no final de janeiro

### Horários anti-servidor:
```text
Liga 1: 10:00  |  Liga 5: 14:00
Liga 2: 11:00  |  Liga 6: 15:00
Liga 3: 12:00  |  Copa: 20:00
Liga 4: 13:00  |  Continental: 21:00
```

---

## Fase 3 — Lógica de Entrada e Progressão

### Alterar `auto_assign_league` RPC:
- Novo jogador → Várzea do país escolhido
- Se Várzea cheia (20 reais) → criar nova Várzea
- Campeão da Várzea sobe para Pré-Regional (substitui bot)
- Promoções automáticas no fim da temporada

### Bloqueio de país:
- Se todas as ligas do país estão com 20 jogadores reais → bloquear
- Mensagem no `ClubCreation`: "Este país está lotado"

### Incentivos:
- Países com < 10 jogadores: +R$500.000 bônus
- Removido quando atingir 20+ jogadores

---

## Fase 4 — Copas

### Copa Nacional:
- Times das divisões nacionais 1-4 (até 80 times)
- Sorteio mata-mata com ida e volta
- Final em jogo único
- Jogos em dias específicos intercalados com liga

### Copa Regional:
- Times das regionais 1-5
- Mesmo formato

### Copa Continental:
- Top 8 de cada país do continente
- Fase de grupos (4 grupos de 8) + mata-mata
- Intercalada no calendário mensal

### Mundial de Clubes:
- Campeões nacionais de todos os países
- Apenas da temporada 2+
- Formato mata-mata

---

## Fase 5 — Edge Function: Processamento Diário

Alterar `process-tournament-matches` para:
- Processar liga do dia (1 rodada)
- Processar copa do dia (se houver)
- Respeitar horários por liga
- Máximo 2 jogos/time/dia
- Simular partidas de bots automaticamente
- Manter janela de 5 min para jogadores reais

---

## Fase 6 — UI

### Atualizar `LeagueTab`:
- Mostrar pirâmide completa do país
- Indicar tier atual do jogador
- Mostrar zona de promoção/rebaixamento

### Atualizar `LeaguesOverview`:
- Mostrar todas as divisões por país
- Copas ativas

### Novo componente `CupBracketView`:
- Visualização de chaveamento mata-mata
- Ida e volta

### Atualizar `ClubCreation`:
- Mostrar status de cada país (lotado/aberto/bônus)
- Bloquear seleção de países lotados

### Atualizar `DashboardTab`:
- Widget de próximo jogo de copa
- Calendário mensal com todos os jogos

---

## Arquivos Modificados/Criados

| Arquivo | Ação |
|---|---|
| Migração SQL | Novas tabelas + colunas |
| `supabase/functions/plan-season/index.ts` | NOVA — planejador mensal |
| `supabase/functions/process-tournament-matches/index.ts` | Expandir para ligas+copas |
| `auto_assign_league` RPC | Reescrever para pirâmide |
| `src/components/game/LeagueTab.tsx` | Pirâmide visual |
| `src/components/game/LeaguesOverview.tsx` | Todas divisões + copas |
| `src/components/game/CupBracketView.tsx` | NOVO — chaveamento |
| `src/components/game/ClubCreation.tsx` | Status de países |
| `src/components/game/DashboardTab.tsx` | Widgets de copa |
| `src/hooks/useMultiplayer.ts` | Adaptar para novo sistema |
| `src/types/league.ts` | Novos tipos |

---

## Ordem de Implementação

1. Migrações SQL (tabelas + colunas)
2. Reescrever RPC `auto_assign_league` para pirâmide
3. Criar Edge Function `plan-season`
4. Expandir `process-tournament-matches` para copas
5. Atualizar UI (LeagueTab, ClubCreation, Dashboard)
6. Criar CupBracketView

## Nota

Este é um projeto de grande escala. Recomendo implementar em **fases incrementais** — começando pela pirâmide básica (Várzea → Nacional) e adicionando copas/continentais depois. Posso começar pela Fase 1+2+3 (banco + planejador + entrada) e depois expandir para copas. Deseja prosseguir assim ou quer tudo de uma vez?

