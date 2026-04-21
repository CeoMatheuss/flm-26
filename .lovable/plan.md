

# Plano: Painel Admin de Ligas & Países (FLM Control Center)

## Visão geral

Criar uma nova **mega-aba "🌍 Sistema"** dentro do `AdminTab`, com 5 sub-abas, dando ao admin visão total da pirâmide de ligas, copas, status de temporada, e ferramentas de simulação/validação para evitar bugs estruturais.

A aba `active_leagues` atual (`ActiveLeaguesPanel`) será **substituída** por esta nova aba mais completa.

## Estrutura da nova aba "🌍 Sistema"

```
🌍 Sistema
├── 📐 Como Funciona       (documentação visual da pirâmide e regras)
├── 🗺️ Países & Pirâmide   (listagem hierárquica)
├── 🏆 Copas               (todas as copas nacionais/regionais/continentais)
├── 📅 Temporada           (status, datas, controles)
└── 🧪 Simulação & Validação (testar fim de temporada + alertas anti-bug)
```

---

### Sub-aba 1: 📐 Como Funciona

Página **estática/explicativa** (sem queries) com cards visuais mostrando:

- **Pirâmide de tiers**: `Várzea → Pré-Regional → Regional → Nacional`
- Quantos jogadores cada tier exige (20 / 80 / 260)
- Regra dos **20 clubes por liga** (preenchido com bots quando faltar)
- Regras de subida/descida (3↑/3↓ entre divisões adjacentes)
- **Regra especial Várzea**: 1º sobe direto para Pré-Regional; 2º–4º "sobem internamente" (próxima Várzea com mais reputação)
- Como entra um novo player (`auto_assign_league` joga em Várzea com vaga)
- Quando bots são substituídos por humanos
- Cron `plan-season` rodando todo último dia do mês

ASCII + ícones + cores. Texto em pt-BR.

---

### Sub-aba 2: 🗺️ Países & Pirâmide

Lista por **continente → país → ligas** (collapsible).

**Para cada país** (header):
- 🏳️ Bandeira + nome
- Total de jogadores reais
- Total de ligas
- Status de capacidade (badge verde/amarelo/vermelho vs `country_status.max_capacity`)

**Para cada liga** (linha clicável → expande):
- Nome (ex: "Brasil Nacional Div 1")
- Tier + nível + divisão (badges coloridos por tier)
- Tipo: `Elite` (nacional), `Regional`, `Sub-Regional` (pre_regional), `Várzea`
- `X/20 clubes` (vermelho se ≠ 20)
- Status temporada (registration / waiting / in_progress / finished)
- Rodada atual / total
- **Botão "Ver Clubes"** → expande lista dos 20 clubes:
  - Nome + escudo
  - Badge **🧑 Player** (verde) ou **🤖 BOT** (cinza)
  - Posição na tabela (pts / J / V-E-D / SG)
  - Reputação

**Filtros no topo**: país (select), tier (select), busca por nome.

**Dados**: query única em `multiplayer_leagues` + `league_members` agrupada por país/tier.

---

### Sub-aba 3: 🏆 Copas

Lista por **escopo → copa**:

- 🌎 **Copas Continentais** (cup_type=continental)
- 🇧🇷 **Copas Nacionais** (cup_type=national, country)
- 🏘️ **Copas Regionais** (cup_type=regional)

Para cada copa:
- Nome + tipo + país/continente
- Status, rodada atual / total, season_year
- `X/Y times` (de `cup_teams`)
- Botão expandir → lista de times (player vs bot) e próximos jogos

Inclui também `custom_tournaments` em uma seção "🎮 Torneios Customizados".

---

### Sub-aba 4: 📅 Temporada

**Painel de status global** por país:

| País | Status | Início | Fim | Rodada | Próxima ação |
|---|---|---|---|---|---|
| 🇧🇷 Brasil | Em andamento | 01/05 | 31/05 | 12/19 | Aguardar fim do mês |

**Controles** (botões com confirmação):
- 🔄 **Rodar `plan-season` agora** (manual trigger da Edge Function — útil para testes)
- ⏭️ **Forçar fim de temporada do país X** (chama `process_season_transition`)
- 🌱 **Redistribuir iniciantes do país X** (chama `redistribute_beginners`)

Cada ação é logada em `admin_logs`.

---

### Sub-aba 5: 🧪 Simulação & Validação

**A. Validador automático** (executa ao abrir):
Roda checks no banco e mostra cards verde/vermelho:

- ✅/❌ Toda liga tem exatamente 20 clubes (lista as quebradas)
- ✅/❌ Nenhuma divisão pulada (sequência tier_level contínua por país)
- ✅/❌ Não há jogador em 2 ligas no mesmo país
- ✅/❌ Bots preenchem vagas onde faltam humanos
- ✅/❌ Países lotados estão com `is_locked=true`
- ✅/❌ Copas têm número de times = potência de 2 (knockout) ou múltiplo correto

Cada falha tem **botão "Ver detalhes"** mostrando IDs/nomes afetados.

**B. Simulador de promoção/rebaixamento** (dry-run, sem escrever no banco):

- Seleciona país
- Botão **"Simular fim de temporada"**
- Mostra preview tabular:
  - 🔼 **Promovidos** (top 3 de cada divisão)
  - 🔽 **Rebaixados** (últimos 3)
  - ⭐ **Subida especial Várzea** (1º → Pré-Regional, 2º-4º → próxima Várzea)
  - Movimentação entre divisões (Div 2 → Div 1, etc)
- Tudo calculado client-side a partir do snapshot atual de `league_members`.
- Botão "✅ Aplicar de verdade" só executa se admin confirmar (roda `process_season_transition`).

**C. Alertas anti-bug** (banner topo da aba se algo estiver errado):
- 🚨 vermelho: liga com ≠20 clubes / divisão quebrada
- ⚠️ amarelo: bots > 50% em alguma liga / país sem cron rodado em > 35 dias

---

## Detalhes técnicos

### Arquivos novos

| Arquivo | Conteúdo |
|---|---|
| `src/components/game/admin/SystemPanel.tsx` | Container com 5 sub-tabs internas |
| `src/components/game/admin/HowItWorksTab.tsx` | Página estática explicativa |
| `src/components/game/admin/CountriesPyramidTab.tsx` | Pirâmide hierárquica + clubes |
| `src/components/game/admin/CupsOverviewTab.tsx` | Lista de copas |
| `src/components/game/admin/SeasonControlTab.tsx` | Status + botões de controle |
| `src/components/game/admin/SimulationValidationTab.tsx` | Validador + simulador dry-run |
| `src/components/game/admin/leagueHelpers.ts` | Funções utilitárias (cálculo de promoções, validações) |
| `supabase/functions/admin-system-checks/index.ts` | Edge Function (admin-only) que retorna validações pesadas em uma chamada (counts por liga, jogadores duplicados, etc) |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/game/AdminTab.tsx` | Substituir tab `active_leagues` por nova `system`; renderizar `<SystemPanel/>` |
| `supabase/config.toml` | Registrar nova edge function `admin-system-checks` |

### Edge Function `admin-system-checks`

- Valida JWT + checa `has_role('admin')`
- Retorna em uma única resposta:
  - `leagues`: array com `{id, name, country, tier, member_count, bot_count}`
  - `cups`: array com `{id, name, team_count, expected_teams}`
  - `validations`: array de `{check, status, details[]}`
  - `cron_health`: última execução do `plan-season` (estimada por `created_at` mais recente em `multiplayer_leagues`)
- Permissões: `verify_jwt = true` (default)

### Queries cliente (read-only)

Todas usam o `supabase` client com RLS — admin já tem acesso via `has_role`. Sem migrações de schema necessárias (usa tabelas existentes: `multiplayer_leagues`, `league_members`, `cup_competitions`, `cup_teams`, `country_status`, `custom_tournaments`).

### Simulador dry-run

Implementado client-side em `leagueHelpers.ts`:

```ts
function simulateSeasonEnd(country, leagues, members) {
  // ordena membros por pts/SG/GP dentro de cada liga
  // marca top 3 como "promoted" e bottom 3 como "relegated"
  // aplica regra especial: tier=varzea → 1º promovido para pre_regional div max
  // retorna { promotions: [...], relegations: [...], specialMoves: [...] }
}
```

Sem chamadas ao banco — é só preview.

### Aplicação de fim de temporada real

Reusa as RPCs existentes:
- `process_season_transition(_country)` — já existe
- `redistribute_beginners(_country)` — já existe
- Trigger via `supabase.rpc(...)`, logado em `admin_logs` com action `force_season_end`.

## Compatibilidade

- Sem migrations de schema
- `ActiveLeaguesPanel.tsx` removido do AdminTab mas arquivo mantido (caso reutilizado)
- Não afeta usuários comuns — toda a aba está atrás do gate `isAdmin && adminUnlocked`

## Sobre o R$10 / personalização do clube

Sua pergunta inicial: **sim, exatamente assim** — o sistema de paywall já implementado funciona da seguinte forma: ao pagar R$10 (e o admin marcar `customizationUnlocked=true`), o usuário pode trocar **escudo, nome do clube e nome do estádio** quantas vezes quiser pelo Perfil do Clube. Sem desbloqueio, esses campos ficam travados com 🔒. A liberação é feita por você no painel Admin > Customização.

