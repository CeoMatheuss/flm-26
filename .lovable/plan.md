

# Plano: Elenco mais simples + Empréstimo via mercado + Renomear "Listar" → "Anunciar" + Botão Substituir

5 mudanças focadas em clareza e em corrigir o fluxo de empréstimo:

## 1. Empréstimo: enviar para o **Mercado de Empréstimos** (não emprestar direto)

**Problema atual:** `SquadTab → onLoanOut` chama `game.loanOutPlayer(playerId)` que **remove o jogador do elenco imediatamente** sem passar pelo mercado.

**Correção:** No `GameTabRouter.tsx`, trocar o handler `onLoanOut` da `SquadTab` para usar a **mesma lógica do `OnlineMarketTab`** — invocar a edge function `process-transfer` com `action: 'loan-list'`. O jogador continua no elenco, fica anunciado em `loan_listings`, e só sai quando outro clube aceitar.

```
onLoanOut(playerId) →
  supabase.functions.invoke('process-transfer', { 
    action: 'loan-list', playerData, salary, clubName, sellerShield 
  })
  toast: "Jogador anunciado no Mercado de Empréstimos!"
```

A função antiga `game.loanOutPlayer` continua existindo (ainda é usada como fallback interno em `useClubState`), mas o `SquadTab` para de chamá-la diretamente.

## 2. Renomear todos os "Listar" → "Anunciar"

Trocas globais de texto/label:

| Componente | Antes | Depois |
|---|---|---|
| `SquadTab.tsx` (botão de perfil) | "Listar no Mercado" | **"Anunciar no Mercado"** |
| `SquadTab.tsx` (tooltip do ícone) | "Listar à venda" | **"Anunciar venda"** |
| `PlayerProfileModal.tsx` | "Lista de Transferência" | **"Anunciar à venda"** |
| `OnlineMarketTab.tsx` (qualquer "Listar" remanescente) | "Listar" | **"Anunciar"** |
| Toasts | "listado no mercado" | **"anunciado no mercado"** |

Internamente as variáveis (`onListForSale`, `listForSale`) ficam — só o **texto visível** muda.

## 3. Tela inicial do Elenco: remover botões inline (Anunciar / Emprestar / Rescindir)

**Problema:** Os 3 ícones (🏷 / ↔ / 🗑) na linha de cada jogador da tela principal poluem a interface.

**Solução:** No `renderPlayerRow` do `SquadTab.tsx`, remover esses 3 botões. **Mantém apenas:**
- 👁 **Ver perfil** (para abrir o detalhe completo)
- 🔁 **Substituir** (NOVO — ver item 4)
- Botão de leilão só fica para jogadores elegíveis (mantém)

As ações de Anunciar / Emprestar / Rescindir continuam disponíveis **dentro do perfil completo do jogador** (que já tem essas ações).

Resultado: linha mais limpa com no máximo 2-3 ícones em vez de 5-6.

## 4. Novo botão **"🔁 Substituir"** em cada jogador

Funcionalidade: trocar rapidamente um jogador entre **Titular ↔ Banco** (caso de uso mais comum).

**Comportamento:**
- **Em Titulares:** botão "🔁 Banco" — abre um pequeno menu listando todos os reservas com mesma posição (ou todos os reservas se nenhum bater); ao escolher, troca a posição dos dois no array `players` e chama `onReorderPlayers`.
- **Em Banco/Fora:** botão "🔁 Subir" — abre menu com todos os titulares da mesma posição; ao escolher, troca os dois.
- Toast: *"Pedro entrou no time titular no lugar de João"*.

UI: Popover compacto do shadcn ancorado no botão, com lista filtrada (mesma posição primeiro, outras depois).

Substitui também o atual painel de "Mover: Titular / Banco / Fora" — mais intuitivo e menos confuso (a comunidade reclamou).

## 5. Card de jogador mais informativo (menos botões, mais dados)

Já que tiramos os botões da linha, **liberamos espaço** para deixar a linha mais informativa. Adicionar (sem inflar):

- ⚽ **Gols/Assistências** da temporada inline (pequeno: `⚽3 🅰️5`)
- 🏟️ **Jogos disputados** (`🏟️12`)
- Personalidade com **nome curto** ao lado do emoji em viewport ≥ md (ex: `🦁 Líder`)

Mantém: OVR, posição, nome, idade, salário, contrato, valor com tendência, ★ média, barras estamina/moral.

Indicador de status na borda esquerda permanece (vermelho lesão, âmbar contrato).

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/components/game/GameTabRouter.tsx` | `onLoanOut` da `SquadTab` agora chama `supabase.functions.invoke('process-transfer', { action: 'loan-list', ... })` em vez de `game.loanOutPlayer` |
| `src/components/game/SquadTab.tsx` | Remover ícones inline Anunciar/Emprestar/Rescindir do `renderPlayerRow`; trocar texto "Listar" → "Anunciar" no perfil; adicionar botão "🔁 Substituir" com Popover de troca; adicionar gols/assistências/jogos na linha; remover painel "Mover: Titular/Banco/Fora" (substituído pelo novo botão) |
| `src/components/game/PlayerProfileModal.tsx` | Trocar label "Lista de Transferência" → "Anunciar à venda" |
| `src/components/game/OnlineMarketTab.tsx` | Trocar quaisquer ocorrências visíveis de "Listar/Listado" por "Anunciar/Anunciado" |

## Compatibilidade

- Schema do banco inalterado
- `loanOutPlayer` ainda existe em `useClubState` e `useGame` (não removo — pode estar em uso em flows futuros)
- A janela de 7h e o fluxo de aceite via `process-transfer` action `loan-accept` continuam iguais
- Usuário enxerga: ao clicar em "Emprestar" no perfil, recebe toast "Anunciado no Mercado de Empréstimos!" e o jogador **continua no elenco** até outro clube aceitar

