

# Plano: Histórico do Mercado Livre + Reorganização do Elenco + Empréstimos limpos

Cinco mudanças focadas em organização e clareza:

## 1. Mercado Livre — Nova aba "📜 Histórico" (envio + recebido juntos)

Em `FreeAgentMarketPanel.tsx`, transformar o painel em **3 sub-abas internas**:

| Aba | Conteúdo |
|---|---|
| 🌐 **Disponíveis** | Lista atual de jogadores livres (mantém) |
| ⏳ **Ativas** | Propostas pendentes/contraproposta/aceitas aguardando finalização |
| 📜 **Histórico** | Tudo arquivado: enviadas + recebidas, com data e status |

**Histórico**: carregar TODAS as `free_agent_offers` onde `buyer_id = userId` **OU** o `agent_id` veio de jogadores rescindidos pelo próprio clube (recebidas). Cada linha mostra:
- Nome do jogador + posição
- Tipo: 📤 Enviada / 📥 Recebida
- Status com badge colorido: ✅ Assinado, 💰 Contraproposta, ❌ Recusado, 🚫 Cancelado, ⏳ Pendente
- Salário oferecido + duração + luvas
- Data (`created_at`) + data de resolução (`resolved_at`)
- Filtros: tudo / só assinaturas / só recusas

Carregamento: SELECT em `free_agent_offers` ordenado por `created_at DESC` limitando 100.

## 2. Mercado Online — Remover aba "Listar"

Em `OnlineMarketTab.tsx`:
- Apagar `<TabsTrigger value="list">` e o `<TabsContent value="list">` inteiro
- Reduzir o grid de tabs de `grid-cols-6` → `grid-cols-5`
- A função `listPlayer` agora será chamada **a partir do Elenco** (próximo item)

Estrutura final das tabs do mercado:
`Mercado | Livre | Empréstimos | Recebidas | Enviadas`

## 3. Mercado Online — Aba "Empréstimos" só com cedidos pelo usuário

Em `OnlineMarketTab.tsx` aba `loans`:
- Manter: "Seus jogadores no mercado de empréstimo" (`loan_listings` onde `seller_id = userId`)
- Manter: "Empréstimos Ativos" (somente `loanedPlayers` com `direction === 'out'`)
- **Remover** a seção "Disponíveis para empréstimo" (loans de outros usuários) e a seção "Emprestar jogador" (lista de seleção)
- A ação **emprestar** migra para o Elenco (próximo item)

## 4. Elenco — Redesign com 3 abas: Titulares / Reservas / Fora do Elenco

Reorganizar `SquadTab.tsx` em 3 sub-abas dentro de "Elenco" (mantém aba externa "Contratos"):

```
[👕 Titulares (11)]  [🪑 Reservas]  [📦 Fora do Elenco]  [📄 Contratos]
```

**Definição** (baseada em `players.slice(0, 11)` que já é a convenção do `MatchPage`):
- **Titulares**: posições 0–10 do array `players`
- **Reservas**: posições 11–17 (próximos 7 jogadores no banco)
- **Fora do Elenco**: posições 18+ (resto do plantel — não convocados em jogo)

**Configuração**: cada card tem botões `↑ Subir para Titular` / `↓ Mandar para Reservas` / `📦 Fora do Elenco` que reordenam o array via novo callback `onReorderToGroup(playerId, group)`. Esse callback move o jogador para o início/meio/fim do array `players` e dispara `updatePlayers()` que já existe em `useClubState`.

**Card redesenhado** (mais limpo e legível):
```
┌──────────────────────────────────────────────┐
│ [OVR] [#10] Jogador Nome           ↑ ↓ 📦   │
│       ZAG · 28a · 🧠Líder · 😄Moral         │
│       💰 R$1.2M ↑  📄 3a  💵 R$5k  🔥85%   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [👁 Ver]  [🏷 Listar]  [↔ Emprestar]  [💔]  │
└──────────────────────────────────────────────┘
```

Ações expostas direto no card (não escondidas no detalhe):
- 👁 Ver Perfil
- 🏷 **Listar no Mercado** (nova entrada — chama `onListForSale` que dispara `process-transfer` action `list`)
- ↔ **Mandar para Empréstimo** (novo botão — chama `onLoanOut`)
- 🔨 Leilão (se `OVR ≥ 65 && age ≤ 35`)
- 💔 Rescindir

**Indicadores visuais melhores**:
- Badge de **valor de mercado** sempre visível com tendência ↑↓→ (já existe, manter)
- Badge 💎 para joias (já existe)
- Pílula de personalidade com cor própria
- Barra dupla compacta (estamina + moral) lado a lado
- Borda colorida por estado: vermelho (lesionado), âmbar (contrato expirando), normal (ok)

**Filtros melhorados** (linha única acima da lista):
- Chips de posição (`Todos · GOL · ZAG · LAT · VOL · MEI · ATA`)
- Ordenação: Posição / OVR / Idade / Salário / Valor

**Estatísticas no topo** (mantém o grid 4-cols): Jogadores · Média OVR · Folha/mês · Lesionados

## 5. Props novas e fluxo de dados

| Componente | Mudança |
|---|---|
| `SquadTab.tsx` | Nova prop `onListForSale: (player: Player) => void` que invoca o edge function `process-transfer` action `list` (mesma lógica do `OnlineMarketTab.listPlayer`); nova prop `onReorderPlayers: (newOrder: Player[]) => void` para reorganizar entre titulares/reservas/fora |
| `GameTabRouter.tsx` | Plugar `onListForSale` (chamando edge function diretamente) e `onReorderPlayers` (dispara `updatePlayers` do `useClubState`) |
| `OnlineMarketTab.tsx` | Remover aba "Listar" e seções de loan-in/loan-accept; reduzir tabs para 5 colunas |
| `FreeAgentMarketPanel.tsx` | Nova estrutura interna com `<Tabs>` (Disponíveis / Ativas / Histórico); novo loader `loadHistory()` que busca todas as ofertas (não só pending); render de linha de histórico com badges de status |

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/game/SquadTab.tsx` | Reescrita: 3 sub-abas (Titulares/Reservas/Fora), card redesenhado, botões inline (Listar/Emprestar/Rescindir), novo sistema de reordenação por grupo |
| `src/components/game/OnlineMarketTab.tsx` | Remover aba "Listar"; aba "Empréstimos" mostra só cedidos pelo usuário; tabs em 5 colunas |
| `src/components/game/FreeAgentMarketPanel.tsx` | Adicionar 3 sub-abas internas (Disponíveis/Ativas/Histórico); criar `loadHistory()` SELECT completo de `free_agent_offers` |
| `src/components/game/GameTabRouter.tsx` | Adicionar callbacks `onListForSale` e `onReorderPlayers` no `SquadTab` |

## Compatibilidade

- Schema do banco inalterado (`free_agent_offers` já tem `created_at`, `resolved_at`, `status`)
- A noção de titular/reserva continua sendo derivada da ordem do array `players` (compatível com `MatchPage` e `useMatchState`)
- Saves antigos: nada quebra — todos os jogadores começam como "Titular" se nas 11 primeiras posições, do contrário "Reserva"/"Fora"

