---
name: Bot-Always-Fill League Creation
description: Ligas sempre criadas com 4 divisões nacionais + 20 bots, independente de jogadores online
type: feature
---
# Bot-Always-Fill — Garantia de Funcionamento Sem Jogadores

## Regra principal
**Liga deve SEMPRE ser criada e iniciar com 20/20 times, mesmo com 0 jogadores online.**

## plan-season (corrigido)
- Estrutura mínima fixa por país: **1 várzea + 4 divisões nacionais (D1-D4)**.
- Antes: D1-D4 só apareciam com 260+ jogadores no país → ligas oficiais não existiam em países pequenos.
- Tiers regional/pre_regional escalam adicionalmente conforme a base cresce.
- Insert de bots em **batch** (atômico) — se falhar, faz rollback da liga inteira.
- Bots agora marcados com `is_bot=true` e `bot_strength` (D1: 75-90, D4: 45-60, etc).
- Nomes únicos globais: `${prefix} ${suffix} ${tag}` quando o índice ultrapassa o pool.

## Tabela `league_members`
- Novas colunas: `is_bot boolean DEFAULT false`, `bot_strength integer`.
- Migração marca retroativamente todos os user_ids sintéticos como bots.
- Índice `(league_id, is_bot)` para filtros rápidos.

## RPC `replace_bot_with_player`
- Quando jogador entra numa liga, herda a vaga do **bot mais fraco** (`bot_strength ASC`).
- `FOR UPDATE SKIP LOCKED` evita corrida (dois jogadores tentando o mesmo slot).
- Mantém estatísticas da temporada em curso para coerência da tabela.
- Retorna `{success, member_id, inherited_slot}` ou erro tipificado.
- `REVOKE FROM public + GRANT TO authenticated` (apenas autenticados podem chamar).

## Validação
- Liga com 0 jogadores: ✅ todas as 4 divisões criadas, 80 bots/país.
- Liga com poucos jogadores: ✅ jogadores entram via `replace_bot_with_player`.
- Falha no insert de bots: ✅ rollback automático da liga.
