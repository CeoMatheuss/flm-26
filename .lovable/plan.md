

# Plano: Sistema de Competições Internacionais + Classificação Automática

## Visão geral

Implementar um sistema completo de **competições internacionais por continente** (Champions equivalente + Europa League equivalente) com **classificação automática** baseada na posição da liga + campeão da copa nacional, integrado ao ciclo de temporada existente.

---

## 1. Modelo de dados (sem schema novo — reusa `cup_competitions`)

A tabela `cup_competitions` já tem `cup_type='continental'` e campo `continent`. Vamos usar:

- **Principal**: `cup_type='continental'`, `tier='principal'` (novo campo no JSONB? não — usar o `name` ou um campo `format` diferenciado).  
  Para evitar migração de schema, usar **convenção em `name`**: prefixo `[PRINCIPAL]` e `[SECUNDARIA]` OU adicionar coluna `tier text` via migração leve.

**Decisão**: adicionar 1 coluna `tier text` em `cup_competitions` (`'principal' | 'secundaria'`) — é uma única ALTER TABLE.

Mapeamento por continente:

| Continente | Principal | Secundária |
|---|---|---|
| Europa | UEFA Champions League | UEFA Europa League |
| América do Sul | Copa Libertadores | Copa Sul-Americana |
| América do Norte | CONCACAF Champions Cup | CONCACAF Liga |
| África | CAF Champions League | CAF Confederation Cup |
| Ásia | AFC Champions League | AFC Cup |
| Oceania | OFC Champions League | OFC President Cup |

Tudo em uma tabela auxiliar **client-side** `src/data/internationalCompetitions.ts`.

---

## 2. Lógica de classificação (regra anti-bug)

Função RPC nova: **`qualify_international_teams(_continent text, _season_year int)`**

Para cada **país** do continente:
1. Buscar a **Divisão 1** (`tier='nacional'`, `division=1`)
2. Pegar top 8 da tabela final (`league_members` ordenados por pts/SG/GF)
3. Pegar **campeão da copa nacional** (`cup_competitions.cup_type='national'`, `country=país`, status `finished`)

Distribuição (algoritmo):
- **Slots Principal**: 1º, 2º, 3º, 4º + Campeão Copa Nacional
- Se campeão da copa **já está no top 4** → vaga passa para o **5º**
- **Slots Secundária**: 5º, 6º, 7º, 8º (ou 6º-9º se 5º foi promovido)

Anti-duplicação:
- Conjunto `Set<club_id>` para cada copa
- Antes de inserir em `cup_teams`, validar se já existe
- Se faltar time (raro), preencher com bot do país

Total por continente:
- Principal = 32 vagas (distribuídas proporcionalmente entre países por reputação/quantidade de ligas)
- Secundária = 32 vagas

---

## 3. Edge Function `generate-international-cups`

Trigger: chamado pelo `plan-season` no fim de cada temporada (após `process_season_transition`).

Fluxo:
1. Validar admin OU chamada interna do cron
2. Para cada continente ativo:
   - Criar 2 entradas em `cup_competitions` (`tier='principal'` e `'secundaria'`)
   - Chamar `qualify_international_teams` por país
   - Distribuir vagas até atingir 32 por copa
   - Sortear 8 grupos de 4 (formato `groups_then_knockout`)
   - Inserir em `cup_teams` + `cup_matches` (rodada de grupos)
3. Logar em `admin_logs` com action `international_cups_generated`

---

## 4. Atualização do `SystemPanel` (Sub-aba 5: Simulação)

Adicionar na aba **🧪 Simulação & Validação**:
- **Validador novo**: ✅/❌ "Cada continente tem suas 2 copas internacionais ativas"
- **Validador novo**: ✅/❌ "Nenhum clube duplicado em competições internacionais"
- **Botão**: "🌍 Gerar Copas Internacionais agora" (chama Edge Function manualmente para teste)

Adicionar na aba **🏆 Copas**:
- Seção destacada **"🌎 Copas Continentais"** mostrando Principal vs Secundária
- Para cada copa: número de vagas preenchidas vs 32, países representados

---

## 5. Documentação na sub-aba "📐 Como Funciona"

Adicionar nova seção visual:

```
🌍 COMPETIÇÕES INTERNACIONAIS
├── 🥇 Principal (32 clubes, 8 grupos de 4)
│   ├── 1º-4º da Divisão 1
│   └── Campeão Copa Nacional
└── 🥈 Secundária (32 clubes)
    ├── 5º-8º da Divisão 1
    └── Eliminados da fase de grupos da Principal
```

Com texto explicando a regra da vaga deslocada (campeão da copa já no top 4).

---

## 6. Integração com `plan-season` (cron mensal)

Modificar `supabase/functions/plan-season/index.ts`:
- Após processar transições por país
- Chamar `generate-international-cups` para cada continente
- Garantir idempotência: não criar copa se já existir uma com `season_year` atual e `status != 'finished'`

---

## Arquivos novos

| Arquivo | Conteúdo |
|---|---|
| `supabase/functions/generate-international-cups/index.ts` | Edge Function que cria copas continentais e distribui vagas |
| `src/data/internationalCompetitions.ts` | Mapeamento continente → nomes oficiais (UCL, Libertadores etc) |
| `src/components/game/admin/InternationalCupsSection.tsx` | Card no `CupsOverviewTab` mostrando copas continentais com destaque |

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/plan-season/index.ts` | Invocar geração de copas internacionais após transição |
| `src/components/game/admin/CupsOverviewTab.tsx` | Renderizar `InternationalCupsSection` no topo |
| `src/components/game/admin/SimulationValidationTab.tsx` | Adicionar 2 novos validadores + botão manual de geração |
| `src/components/game/admin/HowItWorksTab.tsx` | Nova seção visual sobre copas internacionais |
| `src/components/game/admin/leagueHelpers.ts` | Função `validateInternationalCups()` (sem duplicatas, 32 times etc) |

## Migrações de schema

Apenas **1 ALTER TABLE**:
```sql
ALTER TABLE cup_competitions ADD COLUMN IF NOT EXISTS tier text DEFAULT 'national';
-- valores válidos: 'principal', 'secundaria', 'national', 'regional'
CREATE INDEX IF NOT EXISTS idx_cup_competitions_tier ON cup_competitions(tier);
```

## Migrações de função (RPC)

1 função nova `qualify_international_teams(_continent, _season_year)` (SECURITY DEFINER) — retorna JSONB com `{principal: [{club_id, country, source}], secundaria: [...]}`.

## Regras anti-bug aplicadas

- ✅ Sempre 32 clubes por copa internacional (preenchido com bots se faltar)
- ✅ Anti-duplicação via `Set` no servidor + constraint UNIQUE composta `(cup_id, user_id, club_name)` em `cup_teams`
- ✅ Vaga da copa nacional **redireciona** para o próximo se duplicar
- ✅ Idempotência no cron — só cria se não existir copa ativa do `season_year`
- ✅ Validador automático no painel admin que detecta inconsistências

## Compatibilidade

- Tabela `cup_competitions` já existe — apenas adicionamos 1 coluna
- `cup_teams` e `cup_matches` reusados sem mudança
- Todo código existente continua funcionando (`tier` default = `'national'`)
- Não afeta saves antigos

