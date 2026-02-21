

# Plano: Sistema de Ranking Global + Painel Principal Simplificado

## Resumo

Dois grandes blocos de trabalho:
1. **Ranking Global** -- reescrever completamente o sistema de ranking removendo tiers/XP/barra de progressao e implementando um ranking puramente baseado em resultados, visivel para todos os clubes do jogo.
2. **Dashboard simplificado** -- remover cards extras e manter apenas o card de partida com informacoes essenciais.

---

## Parte 1: Banco de Dados -- Tabela `global_ranking`

Criar uma nova tabela para armazenar o ranking de TODOS os clubes (usuarios e bots):

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| user_id | uuid (nullable) | NULL para bots |
| club_name | text | Nome do clube |
| ranking_points | integer (default 1000) | Pontos de ranking |
| games_played | integer (default 0) | Total de jogos |
| wins | integer (default 0) | Vitorias |
| draws | integer (default 0) | Empates |
| losses | integer (default 0) | Derrotas |
| last_change | integer (default 0) | Ultima variacao (+/-/0) |
| current_competition | text (default 'Liga Nacional') | Competicao atual |
| updated_at | timestamptz | Ultima atualizacao |
| is_bot | boolean (default false) | Se e clube bot |

- RLS: SELECT para todos autenticados, UPDATE/INSERT pelo proprio user_id ou via edge function.
- Habilitar realtime para atualizacoes em tempo real.
- Seed inicial: criar ~50 clubes bots com pontuacoes variadas para popular o ranking.

---

## Parte 2: Logica de Pontuacao

Implementar no `useGame.ts` (funcoes `simulateMatch` e `applyServerResult`):

**Pontos base por resultado:**
- Vitoria: +25 pontos
- Empate: +5 pontos  
- Derrota: -15 pontos

**Multiplicador por competicao:**
- Liga nacional: x1.0
- Copa nacional: x1.2
- Continental: x1.6
- Mundial: x2.0

**Ajuste por forca do adversario:**
- Comparar ranking_points de ambos os times
- Diferenca > 200 pontos: fator 1.5x (ganhar de mais forte) ou 0.6x (ganhar de mais fraco)
- Diferenca > 100 pontos: fator 1.25x ou 0.8x
- Formula: `pontosFinais = pontosBase * pesoCompeticao * fatorAdversario`

**Impacto de temporada (fim da temporada):**
- Campeao nacional: +10%
- Campeao continental: +15%
- Campeao mundial: +25% (teto: max +40% acumulado)
- Zona de rebaixamento: -10%
- Rebaixado: -20%
- Lanterna: -25%

Remover: `Math.max(100, ...)` -- ranking pode cair livremente.

---

## Parte 3: Componente `RankingTab.tsx` -- Reescrita Total

Remover completamente:
- Tiers (Ferro, Bronze, Prata, etc.)
- Barra de progressao
- Card "Como Funciona" com XP

Novo layout:
1. **Card do seu clube** -- posicao atual, pontos, ultima variacao
2. **Tabela de ranking global** -- lista de TODOS os clubes ordenados por pontos:
   - Posicao (#)
   - Nome do clube
   - Pontos de ranking
   - J (jogos)
   - V/E/D
   - Ultima variacao (seta verde/vermelha/cinza)
   - Competicao atual
3. Destaque visual na linha do jogador
4. Busca por nome de clube

Dados carregados da tabela `global_ranking` via Supabase query.

---

## Parte 4: Atualizacao do Ranking apos cada partida

Depois de cada resultado (`simulateMatch` / `applyServerResult`):
1. Calcular delta de pontos com formula completa
2. Upsert na tabela `global_ranking` com novos pontos, wins/draws/losses, last_change
3. Remover estado local `ranking` / `rankingHistory` do GameState (usar apenas banco)

---

## Parte 5: Dashboard Simplificado

No `DashboardTab.tsx`:
- Manter APENAS o `MatchDashboardCard` (card de partida ao vivo/ultima/agendada)
- Adicionar informacoes resumidas dentro dele: pontos de ranking, posicao, V/E/D
- Remover: Stats Row (5 cards), Newspaper, Events Feed, Fan Mood, Performance, Last 5, Top Players
- Resultado: dashboard limpo com foco na partida e ranking

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabela `global_ranking` + RLS + seed bots |
| `src/components/game/RankingTab.tsx` | Reescrever completamente |
| `src/components/game/DashboardTab.tsx` | Simplificar -- so MatchDashboardCard + info do ranking |
| `src/hooks/useGame.ts` | Atualizar calculo de ranking + upsert no banco |
| `src/pages/Index.tsx` | Passar props atualizadas para RankingTab |

---

## Detalhes Tecnicos

- A tabela `global_ranking` usa `ON CONFLICT (user_id)` para upsert eficiente
- Bots sao populados via seed SQL com nomes e pontuacoes variadas (800-1500)
- Ranking atualiza em tempo real via Supabase Realtime na tabela
- Pontos minimos: 0 (sem floor artificial)
- Todos os clubes novos comecam com 1000 pontos

