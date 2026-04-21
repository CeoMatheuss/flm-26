

# Plano: Premium 24h Base + Auth Simplificado + Perfil Auto + Widgets Partida

## 1. Premium: Construção da Base em 24h para Não-Premium

**Onde**: `src/hooks/useInfraState.ts` + `src/components/game/YouthAcademyTab.tsx`

- Usuários **não-Premium** que upgradearem a Academia ficam com a obra em construção por **24h reais** antes do nível subir efetivamente.
- Premium: sobe instantaneamente (comportamento atual).
- Adicionar campo `youthAcademy.upgradeCompletesAt?: string` (ISO date) no `Infrastructure`.
- Ao iniciar upgrade (não-Premium): debita o valor, marca `upgradeCompletesAt = now + 24h` e mantém nível atual. Toast: "🏗️ Obra iniciada! Conclui em 24h."
- Hook periódico (a cada 60s) verifica se passou; quando completa, incrementa `level` e dispara toast + entrada no Jornal.
- Card mostra **barra de progresso da construção** (00:00 até 24:00) com botão "⭐ Concluir agora (Premium)" desabilitado para free.

## 2. Auth: Remover Etapas Desnecessárias

**Onde**: `src/pages/Auth.tsx`

- **Eliminar etapa `signup-preferences`** (formação preferida + estilo de jogo). Esses dados não são necessários no cadastro.
- Manter apenas: **Nome do Manager**, **Email**, **Senha**, **Confirmar Senha** (campo novo).
- Validação: senhas devem ser iguais; mínimo 6 caracteres; mostra erro inline se diferentes.
- Removidos do `data` no signUp: `preferred_formation`, `playstyle`. Mantém `display_name` e `favorite_country` (selecionado em outra etapa simples se quiser, ou removido também — **vamos remover**, país é definido na criação do clube).
- Fluxo final: `welcome → signup-info (nome/email/senha/confirmar) → verify-email`.

## 3. Perfil Automático ao Criar Clube

**Onde**: `src/components/game/ClubCreation.tsx` + `src/hooks/useClubState.ts` + `src/types/clubProfile.ts`

Quando o clube é criado (`onComplete` no ClubCreation), preencher automaticamente o `clubProfile`:
- **`foundedDate`**: data atual no formato `DD/MM/AAAA` (`new Date().toLocaleDateString('pt-BR')`)
- **`foundedSeason`**: temporada atual do jogo (1 por padrão)
- **`ownerName`**: o `display_name` do usuário (vindo do `auth.user.user_metadata.display_name`)
- **`motto`**: vazio (usuário pode editar depois)
- **`bio`**: vazio
- **`instagram`**: vazio

No `useClubState.ts`, criar função `initializeClubProfile(displayName)` chamada na primeira criação que devolve o `defaultClubProfile` já populado com os dados acima. Isso garante que ao abrir "Meu Perfil" pela primeira vez, o usuário já vê data de fundação e nome do dono pré-configurados.

## 4. Atualizar Widget "Temporada vai Começar" em Táticas

**Onde**: `src/components/game/SeasonStartWidget.tsx` + `src/components/game/TacticsTab.tsx`

- Aumentar tamanhos para PC e celular:
  - Padding: `p-3` → `p-4 sm:p-5`
  - Ícone container: `h-12 w-12` → `h-14 w-14 sm:h-16 sm:w-16`
  - Ícone interno: `h-6 w-6` → `h-7 w-7 sm:h-8 sm:w-8`
  - Título: `text-sm` → `text-base sm:text-lg`
  - Subtexto: `text-[10px]` → `text-xs sm:text-sm`
  - Contador: `text-[10px]` → `text-sm sm:text-base font-mono`
  - Badges inferiores: `text-[7px]` → `text-[10px] sm:text-xs`
- Adicionar exibição também na aba **Táticas** (atualmente só aparece no Dashboard) — incluir `<SeasonStartWidget seasonNumber={season} userId={userId} />` no topo do `TacticsTab`.

## 5. Widgets da Partida no Estilo das Imagens (cards horizontais full-width)

**Onde**: `src/pages/MatchPage.tsx`

As imagens mostram o estilo correto: **modais grandes empilhados verticalmente** ocupando largura total (Estatísticas da Partida, Escalações, Estilo de Jogo, Substituições Automáticas, Substituições) — em vez dos pequenos `Sheet` bottom-sheet atuais.

**Mudanças**:

### 5a. Trocar o grid de 4 botões por **seções inline expandidas/colapsáveis** (estilo accordion)

Em vez de `Sheet` que abre por baixo, cada seção fica visível na própria página (logo abaixo da narração), com header e conteúdo:

```
┌─────────────────────────────────────────┐
│ 📊 Estatísticas da Partida              │  (sempre visível)
│   54% — Posse de Bola — 46%             │
│   17  — Finalizações — 13               │
│   77% — Precisão de Passes — 70%        │
│   [▼ Estatísticas de Jogadores]         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 👥 Escalações  V Time A | Time B        │
│   1  Rafael Santos    GOL  74%   8.1    │
│   2  Rafael Martins   ZAG  80%   6.3    │
│   ...                                   │
│   [▼ Ver Reservas]                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🔄 Substituições Automáticas      0/5   │
│   ⚠️ Programe substituições...          │
│   [+ PROGRAMAR SUBSTITUIÇÃO]            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Estilo de Jogo                          │
│ ✨ Tiki-Taka                    [Ativa] │
│   Pontos Fortes  ✓...  Pontos Fracos ✗.│
│   [grid 5×2 de estilos selecionáveis]   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🔄 Substituições              5/5 rest. │
│   [lista de subs feitas + botão trocar] │
└─────────────────────────────────────────┘
```

### 5b. Manter widgets compactos no topo (sticky bar) só como **navegação rápida (anchor scroll)**

Os 4 cards verticais (Tática/Elenco/Estatísticas/Técnico) viram **botões de navegação** que rolam suavemente até a seção correspondente abaixo (em vez de abrir um Sheet). Mantém o mesmo visual atual mas com `onClick={() => scrollToRef(...)}`.

### 5c. Componente novo: `MatchSection`

Criar `MatchSection` (header verde com ícone + linha + conteúdo full-width dentro de Card com borda colorida sutil) reutilizado pelas 5 seções.

### 5d. PT-BR já está aplicado, manter

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/types/infrastructure.ts` | Campo `upgradeCompletesAt` na `youthAcademy` |
| `src/hooks/useInfraState.ts` | Lógica de upgrade com timer 24h para não-Premium; tick periódico |
| `src/components/game/YouthAcademyTab.tsx` | UI da construção em andamento (barra de progresso, contador) |
| `src/pages/Auth.tsx` | Remover etapa de preferências; adicionar campo "Confirmar Senha" |
| `src/components/game/ClubCreation.tsx` | No `onComplete`, popular `clubProfile` com dados automáticos |
| `src/hooks/useClubState.ts` | Função `initializeClubProfile(displayName)` |
| `src/types/clubProfile.ts` | (sem mudança estrutural — só uso) |
| `src/components/game/SeasonStartWidget.tsx` | Aumentar tamanhos para PC/celular |
| `src/components/game/TacticsTab.tsx` | Adicionar `SeasonStartWidget` no topo |
| `src/pages/MatchPage.tsx` | Refatorar widgets: substituir Sheets por seções inline empilhadas estilo das imagens; widgets do topo viram âncoras de scroll |

## Compatibilidade

- Saves antigos sem `upgradeCompletesAt` continuam funcionando (campo opcional)
- `clubProfile` antigo sem `foundedDate` mostra `foundedSeason` (fallback já existe no Dashboard)
- Auth signup novo não envia `preferred_formation`/`playstyle` — campos do perfil que dependiam disso passam a usar defaults (`4-3-3` / `balanced`)
- Premium status é lido da tabela `premium_users` que já existe; passar `isPremium` como prop para `YouthAcademyTab`

