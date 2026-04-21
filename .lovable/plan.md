

# Plano: Sistema Financeiro + Mercado Completo (Direto, Livre, Empréstimos, Rescisão)

Reformular o sistema econômico e de transferências em **5 pilares integrados**: orçamento dividido com travas, mercado direto (com decisão do jogador), Mercado Livre online compartilhado (atributos ocultos), empréstimos repaginados, e rescisão de contrato. Tudo com janela de **7 horas** de decisão.

## 1. Sistema Financeiro — Orçamento 40/40 com TRAVA RÍGIDA

**Lógica:** O orçamento total do clube é dividido em 3 categorias visíveis:

```
💰 Orçamento Total: R$ X
├─ 40% → 💸 Verba de Transferências (compras/luvas)
├─ 40% → 🧾 Verba de Salários (folha mensal acumulada)
└─ 20% → 🏛️ Reserva (infraestrutura/operação)
```

**Cálculo:**
- `transferBudget = budget * 0.40`
- `salaryBudget = budget * 0.40` — comparado contra **folha mensal projetada × 12** (ou seja, a verba precisa cobrir o ano inteiro de salários)
- `reservaBudget = budget * 0.20` (informativo, sem trava)

**Travas rígidas:**
- ❌ Compra direta / aceitar contraproposta de mercado livre / pagar luvas → bloqueado se valor > `transferBudget`
- ❌ Adicionar jogador ao elenco → bloqueado se `(folha atual + novo salário) × 12 > salaryBudget`
- ❌ Renovar contrato com aumento → bloqueado se ultrapassar `salaryBudget`
- Mensagem clara: *"Verba de transferências esgotada (R$ X de R$ Y disponível). Venda jogadores ou aguarde próximo ciclo."*

**UI:** Novo widget no topo do `FinanceTab` + barra compacta no header do `OnlineMarketTab` mostrando ambas as barras (verde/laranja/vermelho conforme % usado).

## 2. Valor Dinâmico do Jogador (revisão do `getPlayerValue`)

Hoje o cálculo usa OVR + idade + bônus de vitórias. **Adicionar:**

| Fator | Peso | Implementação |
|---|---|---|
| Overall ⭐ | base | mantém curva atual |
| Idade 🎂 | mantém | curva existente |
| **Potencial 📈** | **+ até 40%** | jogador novo (≤22) com OVR ≥75 ganha multiplicador (joia) |
| **Forma 🔥** | ±15% | últimas 5 notas (`seasonRatings.slice(-5)`): média ≥7.5 → +15%, ≤6.0 → -15% |
| **Personalidade 🧠** | ±10% | `lider`/`competitivo`/`dedicado` → +10%; `festeiro`/`preguicoso` → -10% |
| Sequência clube | mantém | bônus existente de win-streak / colocação |

Resultado: jovem dedicado em alta = **muito caro**; veterano festeiro fora de forma = **muito barato**. Mercado vivo.

## 3. Mercado de Transferências Direto (revisão do que existe)

Mantém o fluxo atual `OnlineMarketTab` com ajustes:

- ⏱️ **Janela de decisão muda de 6h → 7h** (em `process-transfer/index.ts`, ação `respond` e `resolve-decisions`).
- Aplicar **trava 40/40** ao enviar oferta (`makeOffer`).
- Mostrar valor calculado pelo novo `getPlayerValue` na listagem (com badge de "joia 💎" para jovens com bônus de potencial).

## 4. Mercado Livre Online (NOVO — pool global compartilhado)

Pool global de jogadores soltos (sem clube) que **todos os usuários veem e disputam**.

### Schema (nova tabela)

```sql
CREATE TABLE public.free_agents_market (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_data jsonb NOT NULL,           -- Player completo
  player_name text NOT NULL,
  player_position text NOT NULL,
  player_age integer NOT NULL,
  player_overall integer NOT NULL,      -- escondido na UI
  visible_stats jsonb NOT NULL,         -- só { goals, assists, avgRating, age, position, gamesPlayed }
  origin text NOT NULL DEFAULT 'generated',  -- 'generated' | 'rescinded' | 'released'
  available_until timestamptz,          -- expira em 7 dias
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.free_agent_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES free_agents_market(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  buyer_club_name text NOT NULL,
  offered_salary bigint NOT NULL,
  offered_contract_years int NOT NULL DEFAULT 2,
  signing_bonus bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',   -- pending | accepted | rejected | counter_salary
  decision_deadline timestamptz NOT NULL,    -- created_at + 7h
  rejection_reason text,
  counter_salary bigint,                     -- se pediu mais
  created_at timestamptz DEFAULT now()
);
```

RLS: SELECT autenticado em ambas; INSERT em `free_agent_offers` só para `auth.uid() = buyer_id`.

### Edge Function: `process-free-agent`

Ações:
- `make-offer` → cria oferta com `decision_deadline = now + 7h`, valida trava 40/40 do salário
- `resolve-decisions` → cron-like (chamado on-load): para cada oferta vencida, executa lógica de aceite:
  - **Aceita** se salário ≥ valor sugerido + clube tem boa reputação
  - **Pede mais salário** (`counter_salary`) se proposta razoável mas baixa
  - **Recusa** se salário muito abaixo
- `accept-counter` → buyer aceita contraproposta, valida trava 40/40, fecha o negócio
- `seed-pool` (cron diário) → mantém ~100 jogadores no pool, expira os antigos

### UI: Nova sub-aba "🕵️ Mercado Livre" em `OnlineMarketTab`

Card de jogador mostra **APENAS**:
- ✅ Nome, Idade, Posição
- ✅ Gols, Assistências, Nota média (se tiver histórico)
- ❌ Overall, Potencial, Atributos (ocultos — substituídos por "???")
- 🏷️ Badge de origem: "Gerado", "Rescindido por X", "Liberado por Y"

Botão **"Enviar Proposta"** → modal com salário + contrato + luvas → envia, espera 7h.

Tela de "Propostas pendentes" mostra contador regressivo até a deadline.

## 5. Sistema de Empréstimos (refinado)

Mantém estrutura atual de `loan_listings`, com mudanças:

- ⏱️ Janela de decisão muda para **7h** (hoje é instantâneo no aceite — adicionar lógica de espera)
- 💰 Adicionar campo `salary_share` no schema (default 100% para o receptor — já é o comportamento atual)
- 📈 Bônus de evolução: jovens emprestados (`age ≤ 21`) ganham +25% de XP de treino enquanto emprestados
- Travas: `loans_in ≤ 3` e `loans_out ≤ 3` (já existe, manter)

## 6. Rescisão de Contrato (NOVO)

Botão **"Rescindir contrato"** no card de jogador em `SquadTab`.

### Cálculo da taxa
```typescript
function rescissionFee(player: Player): number {
  const baseValue = getPlayerBaseValue(player);
  const monthsLeft = player.contract * 12;
  const salaryWeight = player.salary * Math.min(monthsLeft, 24); // teto 2 anos
  const valueWeight = baseValue * 0.4; // 40% do valor base
  return Math.floor(valueWeight + salaryWeight * 0.5);
}
```

Resultado: taxa varia entre **30%–60% do valor do jogador** (depende do contrato/salário).

### Fluxo
1. Modal de confirmação mostra: taxa exata, impacto na verba, aviso de moral (-5 pontos para jogadores com personalidade `lider`/`leal`).
2. Confirma → debita `transferBudget`, remove do elenco, **insere automaticamente em `free_agents_market`** com `origin = 'rescinded'` (com cooldown de 24h antes de aceitar ofertas, pra evitar swap-abuse).
3. Notificação no `newspaper_entries`: *"💔 [Clube X] rescindiu contrato de [Jogador Y]. Disponível no Mercado Livre em 24h."*
4. Bloqueado se `players.length ≤ 11` (manter mínimo de elenco).

## 7. Elenco (SquadTab) — Atualização

Cada card de jogador mostra (já tem a maioria):
- Nome ✅, Posição ✅, OVR ✅, Idade ✅, Personalidade ✅, Forma ✅ (notas), Energia ✅
- **NOVO: Valor de mercado SEMPRE VISÍVEL** com badge de tendência (↑/↓/→) baseado no win-streak/forma
- **NOVO: Botão "Rescindir"** (com ícone vermelho), separado dos botões existentes (Listar, Emprestar, Leiloar)

## Arquivos Modificados / Criados

| Arquivo | Mudança |
|---|---|
| `src/utils/playerGenerator.ts` | Expandir `getPlayerValue` com fatores Potencial, Forma, Personalidade |
| `src/hooks/useClubState.ts` | Adicionar `transferBudget`/`salaryBudget` derivados; novo `rescindPlayer(playerId)` que chama edge function |
| `src/hooks/useGame.ts` | Expor `transferBudget`, `salaryBudget`, `rescindPlayer` |
| `src/components/game/FinanceTab.tsx` | Novo widget "Verbas 40/40" com barras de progresso e travas visuais |
| `src/components/game/OnlineMarketTab.tsx` | Aplicar trava 40/40 em `makeOffer`; nova sub-aba "Mercado Livre"; banner de verbas no topo |
| `src/components/game/FreeAgentMarketPanel.tsx` (**NOVO**) | UI do Mercado Livre: lista com OVR oculto, modal de proposta, lista de propostas pendentes com contador 7h |
| `src/components/game/SquadTab.tsx` | Adicionar botão "Rescindir" + modal de confirmação com taxa calculada; valor de mercado sempre visível com tendência |
| `src/components/game/RescindModal.tsx` (**NOVO**) | Modal de rescisão com cálculo de taxa, aviso de impacto |
| `supabase/functions/process-transfer/index.ts` | Mudar deadline de 6h → **7h** em `respond` e `resolve-decisions` |
| `supabase/functions/process-free-agent/index.ts` (**NOVO**) | Edge function para mercado livre + rescisão (ações: `make-offer`, `resolve-decisions`, `accept-counter`, `rescind-player`, `seed-pool`) |
| **Migration SQL** (**NOVO**) | Cria `free_agents_market` + `free_agent_offers` com RLS; cron job diário para `seed-pool` |

## Ordem de Implementação

1. Migration: criar tabelas `free_agents_market` + `free_agent_offers` com RLS
2. Edge function `process-free-agent` (todas as ações)
3. Atualizar `process-transfer` para 7h
4. Atualizar `getPlayerValue` com novos fatores
5. Expor `transferBudget`/`salaryBudget` em `useGame`
6. UI do `FinanceTab` com widget de verbas
7. Aplicar travas em `OnlineMarketTab` + nova sub-aba Mercado Livre
8. `RescindModal` + integração no `SquadTab`
9. Cron job para `seed-pool` (manter pool com ~100 jogadores)

## Compatibilidade

- Saves antigos continuam: `transferBudget`/`salaryBudget` são derivados de `budget`, sem schema novo no `Player`
- Mercado direto atual continua funcionando (só muda 6h → 7h)
- Empréstimos atuais continuam, com janela de decisão adicionada
- Pool inicial de Mercado Livre é populado por seed inicial (50 jogadores) + crescimento orgânico via rescisões

