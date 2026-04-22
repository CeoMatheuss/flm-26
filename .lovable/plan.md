

# Plano: Auto-simulação de Partida após Janela de 5 Minutos

## Objetivo

Se o jogador **não iniciar manualmente** a partida dentro da janela de 5 minutos (após o horário agendado), o sistema **simula automaticamente** o resultado no servidor, gera o relatório completo, atualiza tabelas/estatísticas e notifica o usuário — **sem precisar abrir o app**.

## Contexto atual

Hoje:
- Partidas têm uma janela de 5 min (`mem://features/match-start-interaction`) para o player apertar "⚽ JOGAR PARTIDA"
- Se ninguém entra, a partida fica pendente até o usuário voltar
- Existe `start-match` Edge Function para iniciar manualmente
- `process-tournament-matches` já simula partidas BOTxBOT em torneios

Falta: **um trigger automático** que detecte janelas expiradas e force a simulação no servidor.

## Solução

### 1. Nova Edge Function `auto-simulate-expired-matches`

Roda periodicamente (cron a cada 1 minuto). Para cada tipo de partida pendente:

**Liga (`league_matches`):**
- Busca matches com `status='scheduled'` e `scheduled_at < now() - interval '5 minutes'`
- Para cada uma: chama lógica de simulação Poisson (mesma do `start-match`)
- Atualiza `home_goals`, `away_goals`, `match_data` (com eventos gerados), `status='finished'`, `played_at=now()`
- Atualiza `league_members` (pts/V/E/D/SG) dos dois lados

**Copa (`cup_matches`):**
- Mesma lógica para `cup_matches` com `scheduled_at < now() - 5min` e `status='scheduled'`
- Avança rodada se necessário (reusa lógica de `process-tournament-matches`)

**Torneio customizado (`custom_tournament_matches`):**
- Idem

**Amistosos abertos / convites (`friendly_invites`):**
- Se `match_date < now() - 5min` e `status='accepted'` mas sem `match_result`: simula e marca como expirado-simulado

### 2. Lógica de simulação (compartilhada)

Para cada match pendente:
1. Buscar **força real** dos 2 times:
   - Se player → pega elenco salvo em `league_squads` ou `game_saves` → calcula OVR médio dos 11 titulares
   - Se BOT → usa `bot_strength` da tabela
2. Aplicar fator casa (+5 OVR para mandante)
3. Calcular Poisson: `λ_home = base * (home_str / (home_str + away_str)) * 1.1`
4. Sortear gols (`Poisson(λ)`)
5. Gerar **eventos sintéticos** (gols com minutos aleatórios, posse, chutes etc.) → `match_data.events`
6. Determinar `man_of_the_match`, `goal_scorers`, `player_ratings` para o lado humano
7. Persistir tudo em uma transação

### 3. Notificação automática

Após simular cada partida com player:
- Insert em `user_notifications` (mesmo padrão do `post-match-feedback-system`):
  - Tipo: `match_auto_simulated`
  - Título: `"Sua partida foi simulada automaticamente"`
  - Conteúdo: `"Você não entrou em campo. Resultado: X TIME 2x1 ADVERSÁRIO"`
- Sino badge atualiza em tempo real (já existe via realtime)

### 4. Cron / agendamento

Em `supabase/migrations/`, adicionar:
```sql
SELECT cron.schedule(
  'auto-simulate-expired-matches',
  '* * * * *',  -- a cada 1 minuto
  $$
  SELECT net.http_post(
    url := 'https://devjicsgksuxnnlkcliq.supabase.co/functions/v1/auto-simulate-expired-matches',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <service_role>')
  );
  $$
);
```

Alternativa mais segura: usar `pg_cron` com chamada interna via `extensions.http`.

### 5. Idempotência e proteção

- Rodar `SELECT ... FOR UPDATE SKIP LOCKED` nas matches para evitar dupla simulação caso 2 cron jobs rodem em paralelo
- Edge function valida `verify_jwt = false` mas exige header secreto `x-cron-secret` (novo segredo) — só o cron tem
- Limita a 50 matches por execução para não travar

### 6. UI: indicador de "auto-simulada"

No `MatchReportModal` e no Histórico, adicionar badge **"🤖 Simulação Automática"** quando a partida foi processada pelo cron (campo `match_data.auto_simulated = true`).

No widget "Próxima Partida" do Dashboard, se passou da janela:
- Trocar botão **"⚽ JOGAR PARTIDA"** por **"⏳ Simulando automaticamente..."** (cinza, desabilitado, com spinner)

### 7. Painel Admin — controle manual

No `SeasonControlTab` (já existe), adicionar botão:
- **"⚡ Simular partidas pendentes agora"** → chama a edge function manualmente para teste
- Mostra contagem de partidas pendentes por categoria (liga / copa / torneio)

Logado em `admin_logs` (`action: 'manual_auto_sim_trigger'`).

## Arquivos

### Novos
| Arquivo | Conteúdo |
|---|---|
| `supabase/functions/auto-simulate-expired-matches/index.ts` | Cron-driven: simula todas as matches expiradas (>5min sem início) |
| `supabase/migrations/<ts>_auto_simulate_cron.sql` | Schedule pg_cron + secret `CRON_SECRET` |

### Modificados
| Arquivo | Mudança |
|---|---|
| `supabase/config.toml` | Registrar nova função com `verify_jwt=false` |
| `src/components/game/MatchDashboardCard.tsx` | Detectar janela expirada → mostrar "Simulando automaticamente..." |
| `src/components/game/MatchReportModal.tsx` | Badge "🤖 Simulação Automática" se `match_data.auto_simulated` |
| `src/components/game/admin/SeasonControlTab.tsx` | Botão manual + contador de pendências |

## Segurança

- Função usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS
- Header `x-cron-secret` obrigatório (novo segredo `CRON_SECRET` que vou pedir após aprovação)
- Idempotência via `FOR UPDATE SKIP LOCKED` + `WHERE status='scheduled'`

## Compatibilidade

- Sem mudança de schema (apenas adiciona `auto_simulated: true` no JSONB `match_data`)
- Não afeta partidas iniciadas manualmente
- Players continuam podendo entrar nos 5 min — se não entrarem, sistema assume controle

## Regras anti-bug

- ✅ Janela de 5 min respeitada (não simula antes)
- ✅ Não duplica simulação (`SKIP LOCKED` + filtro `status='scheduled'`)
- ✅ Se player iniciar em paralelo, edge function manual ganha (timestamp earlier)
- ✅ Todas as 4 fontes de match cobertas (liga, copa, torneio custom, amistoso)
- ✅ Estatísticas e ranking atualizados igual a uma partida normal

