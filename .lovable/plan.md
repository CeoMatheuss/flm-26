

# Plano: Widgets Abertos + Escudos nos Lances + Canvas 2D Corrigido

## Objetivo

Refinar a `MatchPage` com base no feedback:
1. **Widgets sempre abertos** (não em accordeão), mas em tamanho compacto
2. **Escudo do time** ao lado de cada lance da narração
3. **Corrigir o canvas 2D do campo** (está bugado em tamanho)

## 1. Widgets sempre abertos (sem Collapsible)

Hoje as seções **Estatísticas, Escalações, Táticas, Substituições** estão em `<Collapsible>` fechados. Vou:

- **Remover Collapsibles** dessas 4 seções
- Manter como **Cards compactos sempre visíveis** (mesmo padding pequeno: `p-2 sm:p-3`)
- Reduzir fontes internas (títulos `text-xs`, conteúdo `text-[11px]`)
- Em desktop: organizar em **grid 2 colunas** abaixo do feed (`lg:grid-cols-2 gap-2`) para aproveitar espaço horizontal
- Em mobile: continuam empilhados verticalmente

## 2. Escudos do time em cada lance da narração

Hoje cada linha do feed mostra: `[12'] ⚽ Gol de Pedrinho!`

Vou adicionar escudo **antes do ícone**:
```
[12'] [🛡️] ⚽ Gol de Pedrinho!
```

### Como obter o escudo de cada lance
Cada `SimEvent` tem `team: 'home' | 'away' | 'neutral'`. Vou:
- Receber `homeShieldProps` e `awayShieldProps` (via `shieldPropsFromClub()`) na `MatchPage` e `ReplayPage`
- Passar para o componente que renderiza linhas do feed
- Renderizar `<ShieldCrest size={20} {...props} />` na linha quando `team !== 'neutral'`
- Para `neutral` (kickoff, halftime, final_whistle): sem escudo

### Onde buscar dados dos escudos
- **Time da casa (player)**: já temos via `useGame()` → club atual com `shieldConfig`
- **Time visitante**: vem do match (`match.away_club_data` ou similar). Se não tiver shield_config, fallback pra cores básicas via `shieldPropsFromClub()` que já trata isso
- Aplicar mesma lógica em `ReplayPage` (mas como replay já tem `homeTeamName`/`awayTeamName`, buscar shields via query rápida no `league_squads` ou `game_saves` por nome do clube)

### Tamanho do escudo no feed
- `size={18}` em mobile, `size={20}` em desktop
- Espaçamento `gap-1.5` entre escudo e ícone
- Não quebra layout porque shield é SVG inline pequeno

### Tamanho do escudo nos cards de "lance atual" e highlight
- Card de lance atual: `<ShieldCrest size={24} />` ao lado do minuto
- Banner do highlight ativo: `<ShieldCrest size={28} />` antes do label "GOL!"

## 3. Corrigir canvas 2D do campo

No último ajuste reduzi o canvas para `h-32 sm:h-40` mas isso quebrou o aspect ratio do `HighlightMiniCanvas` que espera proporção específica de campo de futebol.

### Correção
- Remover `h-32 sm:h-40` forçado
- Restaurar **aspect-ratio nativo** do componente: `aspect-[16/9]` (campo paisagem)
- Width 100% do container, altura calculada automaticamente
- Container do canvas: `w-full max-w-[480px] mx-auto aspect-[16/9]` para limitar tamanho em desktop e centralizar
- Em sidebar (desktop), o canvas continua na coluna principal — não vai pra sidebar

### Verificar `HighlightMiniCanvas.tsx`
- Confirmar que ele respeita o tamanho do container pai (parece que sim, usa `<canvas>` com `w-full h-full`)
- Se necessário, ajustar `useEffect` de resize para usar `getBoundingClientRect()` em vez de hardcoded width

## 4. Aplicar mesmas mudanças em `ReplayPage.tsx`

Para consistência:
- Canvas do replay: mesmo aspect-ratio fix
- Lances do feed: escudos pequenos
- Tabs Estatísticas/Narração mantêm-se (replay não tem Escalação/Táticas/Subs porque é só visualização)

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/MatchPage.tsx` | Remover Collapsibles; reorganizar 4 widgets em grid 2-col desktop; passar shields para feed; corrigir aspect ratio canvas |
| `src/pages/ReplayPage.tsx` | Mesma correção de canvas; adicionar escudos no feed; buscar shields dos times |
| `src/components/game/HighlightMiniCanvas.tsx` | Garantir que respeita 100% do container (resize observer se necessário) |

## Componente novo (interno)

`MatchEventRow` (extraído como helper local nas duas páginas):
- Props: `event`, `homeShield`, `awayShield`
- Renderiza: `[minuto] [escudo] [ícone] [texto]`
- Usado tanto no card de "lance atual" quanto nas linhas do feed

## Compatibilidade

- Sem mudança de schema
- Sem regressão em mobile (continua coluna única, widgets compactos)
- Se um clube não tem `shieldConfig`, `shieldPropsFromClub()` já tem fallback pra `'#2563EB'` solid
- Eventos `neutral` (kickoff, halftime, final_whistle) não mostram escudo — só ícone

## Anti-bug

- ✅ Canvas com aspect-ratio fixo não distorce mais
- ✅ Widgets abertos = info sempre visível, mas compacta
- ✅ Escudos com fallback garantido (sem render quebrado se faltar dado)
- ✅ Feed continua com altura limitada (`max-h-[280px]`) para não dominar tela

