

# Plano: Melhorar Responsividade da Simulação + Aba de Equipe Técnica no Menu

## O que será feito

1. **Melhorar responsividade da tela de simulação (MatchPage)**
   - Reduzir padding e tamanhos dos botões do top bar (Tática, Time, Stats, Assistente) para que caibam melhor em telas de 390px
   - Diminuir altura dos botões (`h-8` em vez de `h-9`), usar `text-[10px]` em mobile
   - Abaixar/compactar o scoreboard: reduzir `text-4xl` para `text-3xl` em mobile, diminuir padding
   - Compactar Quick Stats grid: menor padding em mobile
   - Narração: reduzir `max-h` do feed de eventos para caber melhor
   - Pre-match screen: compactar player cards, reduzir padding geral

2. **Melhorar responsividade geral do jogo (Index/GameNavBar)**
   - Garantir que o GameNavBar e GameMenu funcionem bem em 390px (já parece ok, verificar)

3. **Adicionar "Equipe Técnica" ao GameMenu**
   - Adicionar item `staff` na seção "⚽ Clube" do dropdown com ícone `Users` e label "Equipe Técnica"
   - O StaffTab já existe e está integrado no GameTabRouter

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/MatchPage.tsx` | Compactar botões top bar, scoreboard, stats grid, narração para mobile |
| `src/components/game/GameMenu.tsx` | Adicionar item "Equipe Técnica" → `onTabChange('staff')` |

## Detalhes Técnicos

**MatchPage — Top Bar buttons**: Mudar de `h-9` para `h-7 sm:h-9`, texto de `text-xs` para `text-[10px] sm:text-xs`, gap menor.

**MatchPage — Scoreboard**: Placar de `text-4xl sm:text-6xl` para `text-3xl sm:text-6xl`, container min-width reduzido.

**MatchPage — Quick Stats**: Padding `p-1 sm:p-2.5`, texto compacto.

**GameMenu**: Adicionar `<DropdownMenuItem onClick={() => onTabChange('staff')}>` com ícone `Users` na seção Clube.

