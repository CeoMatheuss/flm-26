

# Plano: Restaurar Design Antigo Auth, Corrigir Canvas 2D, Melhorar Substituições e Mobile

## Diagnóstico

1. **Auth/Tela Inicial**: O design atual usa `auth-hero.jpg` e `auth-manager.jpg` (imagens genéricas). O design antigo usava um carrossel de 3 imagens (`game-preview.jpg`, `game-preview-2.jpg`, `game-preview-3.jpg`) com títulos dinâmicos que rodavam automaticamente. As imagens ainda existem em `src/assets/`.

2. **Canvas 2D não aparece**: O `HighlightMiniCanvas` tem `useEffect` com dependência em `currentMinute`, que muda a cada 300ms. Isso causa o canvas reiniciar sua animação a cada tick, então a animação nunca completa — fica "piscando" ou invisível. Solução: remover `currentMinute` das dependências do `useEffect` e passá-lo via ref.

3. **Substituições**: O sistema atual é funcional mas puramente visual (não afeta a simulação). O design pode ser melhorado com cards mais bonitos, feedback visual de confirmação e animação.

4. **Mobile**: Textos muito pequenos (7px), navbar apertada, cards sem espaçamento adequado.

---

## O que será feito

### 1 — Restaurar Design Antigo da Auth (Carrossel)
- Voltar para o carrossel automático de 3 imagens com títulos/descrições
- Imagens: `game-preview.jpg`, `game-preview-2.jpg`, `game-preview-3.jpg` (já existem)
- Layout split-screen: carrossel lateral no desktop, header no mobile
- Manter o fluxo multi-step (welcome → login/signup → preferences → OTP)

### 2 — Corrigir Bug do Canvas 2D
- **Causa raiz**: `useEffect` no `HighlightMiniCanvas` inclui `currentMinute` nas dependências, fazendo reiniciar a animação a cada 300ms
- **Correção**: Usar `useRef` para `currentMinute` em vez de incluí-lo nas deps do `useEffect`
- O canvas vai iniciar a animação UMA vez por highlight e rodar até completar

### 3 — Redesign das Substituições
- Cards com foto/avatar do jogador, barra de stamina visual
- Animação de transição ao confirmar substituição (slide out/in)
- Histórico das subs feitas com timeline visual
- Indicação de posição recomendada (mesmo tipo de posição = verde)

### 4 — Mobile Completo
- **GameNavBar**: aumentar texto de 7px para 9px, ícones de 12px para 14px, padding mais generoso
- **GameHeader**: compactar budget display, garantir truncate nos nomes longos
- **DashboardTab**: cards com padding mínimo de 12px, stats row 2 colunas no mobile
- **MatchPage**: score 4xl→3xl no mobile, tabs com texto 11px, quick stats 2 colunas
- **AdminTab**: tabs scrolláveis com indicador visual funcional

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `src/pages/Auth.tsx` | Restaurar carrossel de 3 imagens, layout split-screen |
| `src/components/game/HighlightMiniCanvas.tsx` | Corrigir deps do useEffect, usar ref para currentMinute |
| `src/pages/MatchPage.tsx` | Redesign substituições, ajustes mobile |
| `src/components/game/GameNavBar.tsx` | Aumentar tamanhos mobile |
| `src/components/game/DashboardTab.tsx` | Ajustes responsivos |
| `src/components/game/GameHeader.tsx` | Compactar para mobile |

## Ordem
1. Corrigir Canvas 2D (bug crítico)
2. Restaurar Auth com carrossel
3. Redesign substituições
4. Passar mobile em todos os componentes

