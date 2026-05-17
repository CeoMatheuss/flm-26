# Correção: Centro Tático Mobile + Bug da Tela Preta

## Problema 1 — Tela preta ao abrir Táticas após Elenco

`TacticsTab` é renderizado em dois lugares:

- `GameTabRouter.tsx` (aba "tactics") → **sem** `hideSwapButton`
- `squad-modern/SquadModernLayout.tsx` (dentro do Elenco) → embutido

Sem `hideSwapButton`, o `TacticsTab` aplica `fixed inset-0 z-[100] bg-zinc-950` — vira um overlay full-screen por cima da aba. Combinado com `animate-in fade-in` e o `<Sheet>` (Radix Dialog) já montado dentro, gera:

- Overlay preto sobrepondo todo o app na aba Táticas.
- O botão "Sair" chama `window.history.back()`, que sai da rota em vez de fechar a aba → usuário fica preso na tela preta.
- Ao alternar Elenco ↔ Táticas, dois `Sheet` portals competem por `body`, podendo travar o scroll/foco.

### Correção

1. **GameTabRouter** passa `hideSwapButton` ao `TacticsTab` da aba "tactics" para usar o layout embutido (sem `fixed inset-0`, sem botão Sair, sem `window.history.back()`).
2. Em `TacticsTab`:
   - Quando `hideSwapButton`, garantir altura mínima (`min-h-[70vh]`) para evitar colapso e "tela preta" percebida.
   - Remover o botão "Sair" duplicado nessa variante (já condicionado, mas validar).
   - Adicionar fallback de loading: se `players` estiver vazio/`< 11`, exibir skeleton + mensagem "Carregando elenco..." em vez de renderizar campo vazio.
   - Adicionar `ErrorBoundary` leve interno (try/catch no `useMemo` de slots) com fallback "Recarregar formação" que reseta para `4-4-2`.
3. Em `SquadModernLayout` (ao abrir TacticsTab embutido), garantir desmontagem do `Sheet` ao trocar de aba (controlar `open` via efeito ao desmontar).

## Problema 2 — Campo 2D cortado no mobile

`FormationView` usa `max-w-[440px]` + `aspect-[3/4]` + `border-[5px]` + chips `w-11 h-11` posicionados em % do container. Em 390px de viewport:

- O container externo em `TacticsTab` tem `p-2 sm:p-4` + `border` do `Card`, restando ~360px úteis.
- O `INSET_X=8%` aplicado dentro de um campo de 360px ainda deixa chips de 44px + nome 80px próximos da borda → estouro visual e sensação de "cortado nas laterais".
- `aspect-[3/4]` em 360px = 480px de altura, o que empurra o painel de ajustes para baixo da dobra.

### Correção

1. **Campo 100% largura no mobile**: remover `max-w-[440px]` em portrait; usar `w-full`. Reduzir `border-[5px]` para `border-2` no mobile.
2. **Container pai** (`TacticsTab` mobile): remover `p-2`/borda do wrapper `Card` no mobile (`p-0 sm:p-4`, `rounded-none sm:rounded-2xl`, `border-0 sm:border`). O campo deve encostar quase nas bordas.
3. **Escalas responsivas** no `FormationView`:
   - Chip: `w-9 h-9` (mobile) → `w-12 h-12` (sm) → `w-16 h-16` (lg).
   - Número OVR: `text-xs` mobile / `text-base` sm.
   - Nome: `max-w-[60px]` mobile, `text-[8px]`.
   - Barra de stamina: `w-8 h-[3px]` mobile.
   - Badges (capitão/alerta): `w-3.5 h-3.5` mobile com ícone `w-2 h-2`.
4. **Insets adaptativos por orientação**:
   - Portrait mobile: `INSET_X = 11`, `INSET_Y = 6` para garantir que chip+nome não estourem.
   - Landscape: manter `INSET_X = 8`, `INSET_Y = 4`.
5. **Aspect ratio mobile**: trocar `aspect-[3/4]` por `aspect-[4/5]` para deixar o campo mais compacto verticalmente e caber junto com o header sem rolagem inicial.
6. **Eliminar overflow horizontal**: adicionar `overflow-x-hidden` no wrapper raiz do `TacticsTab` e validar que `header` + `Sheet` não somam largura > viewport (já usa `truncate` e `shrink-0`).

## Bônus — Performance e UX

- Memoizar `adaptationRing` por slot/jogador (`useMemo` chaveado por `assigned + formation`).
- Substituir `AnimatePresence mode="popLayout"` por animação só de `layout` (evita unmount em troca de formação, reduz flicker).
- Cachear última `formation` válida em ref para fallback automático caso `formationLayouts[formation]` seja undefined.

## Arquivos a alterar (técnico)

- `src/components/game/GameTabRouter.tsx` — adicionar `hideSwapButton` na aba "tactics".
- `src/components/game/TacticsTab.tsx` — fallback loading/erro, paddings mobile, remover botão Sair quando embutido, `min-h` no modo embutido.
- `src/components/game/FormationView.tsx` — campo `w-full` no mobile, chips/nome/stamina menores, insets adaptativos, fallback de formação inválida, `overflow-x-hidden`.

## Validação

- Mobile 390×585: campo encosta nas bordas laterais sem cortar jogadores; nenhum chip ultrapassa o gramado.
- Trocar Elenco → Táticas → Elenco várias vezes sem tela preta ou scroll travado.
- Trocar formação 4-4-2 → 3-5-2 → 4-3-3 sem flicker e mantendo escalação válida.
- Lista de reservas abre/fecha pelo bottom sheet sem sobrepor o campo permanentemente.
