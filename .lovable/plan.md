

# Plano: Empréstimo via mercado + Substituição inteligente + Mercado reorganizado

Quatro mudanças focadas em corrigir o fluxo de empréstimo no perfil, melhorar a UX de substituição e reorganizar o Mercado em uma única central.

## 1. Empréstimo no perfil → enviar para Mercado de Empréstimos

**Problema:** No `PlayerProfileModal.tsx`, o botão "Emprestar" recebe `onLoanOut` que pode estar conectado a `game.loanOutPlayer` (envio direto). Já no `SquadTab.tsx` perfil interno, o botão chama o callback do router — esse já vai para o mercado.

**Correção:** Auditar TODOS os pontos onde o botão "Emprestar" aparece e garantir que sempre invoque o edge function `process-transfer` com `action: 'loan-list'`. Toast: *"{Jogador} anunciado no Mercado de Empréstimos!"*. O jogador permanece no elenco até alguém aceitar.

| Local | Estado atual | Ação |
|---|---|---|
| `SquadTab` perfil interno (linha ~285) | Já chama `onLoanOut` do router → loan-list ✅ | OK |
| `PlayerProfileModal.tsx` (linha ~103) | Recebe `onLoanOut` como prop | Onde for usado, garantir handler de loan-list |
| `GameTabRouter` SquadTab `onLoanOut` | Já correto ✅ | OK |
| `GameTabRouter` OnlineMarketTab `onLoanOut` | Já correto ✅ | OK |

Resultado: comportamento 100% consistente — Emprestar = sempre anunciar.

## 2. Substituição inteligente: pré-seleciona e leva para o Banco/Fora

**Problema atual:** Botão "🔁 Banco" em titular abre Popover ali mesmo, exigindo escolher manualmente o reserva. Usuário pediu: ao clicar, **levar até a aba Banco** com o titular **pré-selecionado** para ele escolher por quem trocar lá.

**Novo fluxo:**

- Em **Titulares**: botão "🔁 Tirar" → muda automaticamente para a sub-aba "🪑 Banco" (e marca o titular como pendente)
- Na aba Banco/Fora aparece uma **barra fixa no topo** destacada:
  ```
  ⚡ Trocando: [OVR] João (ZAG) — Toque em quem entra no time
                                                    [✕ Cancelar]
  ```
- Cada card de reserva fica clicável (o card todo vira botão de "trocar"). Reservas da mesma posição ganham destaque verde "✓ mesma posição".
- Ao clicar em um reserva: chama `swapPlayers(titularId, reservaId)`, exibe toast *"{Reserva} entrou no time titular no lugar de {Titular}"*, **volta para a aba Titulares** automaticamente e limpa estado.
- O mesmo no inverso: em Banco/Fora botão "🔁 Subir" → leva para aba Titulares com o reserva pré-selecionado, barra mostra "Trocando: {Reserva}", clica em titular para finalizar.

**Implementação:**
- Estado `pendingSwap: { player: Player; from: Group } | null` no `SquadTab`
- Estado `currentSquadSubTab` controlado (em vez de `defaultValue`) para forçar mudança de aba
- Remover Popover atual, substituir por essa barra fixa + cards clicáveis
- Botão "Cancelar" e tecla Esc cancelam

## 3. Mercado reorganizado: Auction movido para dentro

**Problema:** Aba "Leilão" hoje fica solta no menu lateral (`auction`). Usuário quer **TUDO no mercado**: Mercado, Jogadores Livres, Minhas Propostas (recebidas+enviadas), Leilão.

**Nova estrutura do Mercado** (em `OnlineMarketTab.tsx`):

```
[🌐 Mercado]  [🕵️ Livres]  [⚖️ Leilão]  [📨 Propostas]  [🔄 Empréstimos]
```

Mudanças:
- **Recebidas + Enviadas** unificadas em **"📨 Propostas"** com sub-toggle interno (`Recebidas | Enviadas`) ou seções empilhadas. Badge de notificação no triggers principal mantém contador de pendentes.
- **Nova aba "⚖️ Leilão"** que renderiza o `AuctionTab` (já existe) inline dentro de `OnlineMarketTab`. O `AuctionTab` recebe os mesmos props (`userId`, `clubName`, `players`, `budget`, `isPremium`).
- Remover entrada "Leilão de Jogadores" do `GameMenu.tsx` (ou redirecionar para `market` + tab `auction`).
- Manter o Hero de orçamento 40/40 no topo.

**Layout final do mercado** (5 abas em vez de 5 dispersas):

| Aba | Conteúdo |
|---|---|
| 🌐 Mercado | Listagens à venda + filtros (mantém) |
| 🕵️ Livres | `FreeAgentMarketPanel` com sub-abas Disponíveis/Ativas/Histórico (mantém) |
| ⚖️ Leilão | `AuctionTab` embutido (NOVO aqui) |
| 📨 Propostas | Recebidas + Enviadas em seções (consolidação) |
| 🔄 Empréstimos | Cedidos pelo usuário (mantém) |

## 4. Auditoria geral das abas

Conferir consistência em todas as abas onde aparecem ações de jogador:

- **PlayerProfileModal**: usar mesmo handler `loan-list` se for renderizado fora do SquadTab
- **OnlineMarketTab "Empréstimos"**: confirmar que mostra apenas `seller_id = userId` (já está)
- **GameMenu**: remover ou redirecionar a entrada "Leilão de Jogadores" (vira atalho para Mercado→Leilão)
- **Toasts**: padronizar idioma — "Anunciar" em vez de "Listar" em todos os lugares restantes (ainda há "listado no mercado" no `GameTabRouter` linha 141 e "listado no mercado de empréstimos" linha 269)

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/game/SquadTab.tsx` | Substituir Popover por fluxo de pré-seleção + barra fixa de troca + mudança automática de sub-aba; cards de candidatos clicáveis inteiros |
| `src/components/game/PlayerProfileModal.tsx` | Confirmar que `onLoanOut` chama loan-list (depende de quem renderiza); padronizar label "Emprestar → Anunciar empréstimo" |
| `src/components/game/OnlineMarketTab.tsx` | Adicionar aba "⚖️ Leilão" embutindo `AuctionTab`; consolidar Recebidas+Enviadas em "📨 Propostas"; reduzir para 5 abas reorganizadas |
| `src/components/game/GameMenu.tsx` | Remover (ou redirecionar) item "Leilão de Jogadores" para `market` |
| `src/components/game/GameTabRouter.tsx` | Atualizar toast de listagem para usar "anunciado"; passar `isPremium` para o OnlineMarketTab (necessário para AuctionTab) |

## Compatibilidade

- Schema do banco intacto
- A aba `auction` no router permanece (acessível via deep-link), mas o ponto de entrada principal vira o Mercado
- Fluxo de `swapPlayers` continua usando `onReorderPlayers` (sem novo callback)
- Empréstimo continua passando pela edge function `process-transfer` com janela de 7h

