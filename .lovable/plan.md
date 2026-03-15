

# Plano: Simulação 2D para Campeonatos, Notificações e Temporada

## Resumo dos Problemas Atuais

1. **Partidas do campeonato são simuladas automaticamente** pela edge function `process-tournament-matches` quando o horário chega -- sem simulação 2D nem narração
2. **Botão "vs" no calendário** não oferece opção de assistir a partida com simulação 2D
3. **Notificações** usam estilo escuro; precisa ser redesenhado com cores brancas e melhor organização
4. **Informação da primeira temporada** não aparece (data de teste: 01/05/2026)
5. **Dados offline** precisam ser limpos

---

## Tarefa 1: Simulação 2D + Narração para Partidas de Campeonato

### Problema
Quando o horário agendado chega, `process-tournament-matches` resolve o jogo instantaneamente com Poisson simples (apenas gols + kickoff/halftime/fulltime). O jogador humano não tem chance de assistir.

### Solução
Adicionar na UI do calendário de partidas do torneio:

- **Botão "Assistir" (Eye icon)** em cada partida agendada que envolva o time do jogador OU qualquer partida de bot
- Ao clicar "Assistir", a partida é iniciada via `start-match` edge function (que já gera eventos completos com narração, pênaltis, faltas, etc.) e redireciona para a MatchPage com simulação 2D
- Para partidas **bot vs bot** que o jogador quer assistir: criar um modo "spectator" que usa os dados de `match_data` já salvos e os revela progressivamente (reutilizando o `useMatchSimulation` em modo de replay)

### Mudanças específicas:

**TournamentDashboardCard.tsx** (calendário de partidas):
- No calendário, partidas `scheduled` mostram botão "⚽ Entrar" (se envolve o jogador) ou "👁️ Assistir" (para bot vs bot)
- Partidas `played` mostram "📺 Replay" para revisar com narração 2D
- Ao clicar "Entrar", chama o fluxo normal de `startMatch` do MatchPage
- Ao clicar "Assistir/Replay", carrega `match_data` do banco e reproduz via hook de replay

**Novo: useMatchReplay hook** (`src/match/useMatchReplay.ts`):
- Recebe os eventos e stats salvos em `match_data`
- Revela progressivamente com tick de 300ms, igual ao `useMatchSimulation`
- Exibe no MatchPage em modo somente leitura

**MatchPage.tsx**:
- Aceitar query param `?replay=MATCH_ID` para modo replay de torneio
- Reutilizar os componentes 2D existentes (HighlightMiniCanvas, narração)

**process-tournament-matches (edge function)**:
- Enriquecer os eventos gerados: adicionar eventos intermediários (faltas, cartões, escanteios, defesas) entre os gols, similar ao `start-match`
- Isso garante que partidas de bot tenham narração rica para replay

---

## Tarefa 2: Redesign do Sino de Notificações

### Mudanças visuais:
- **Ícone do sino**: cor branca, badge de contagem com fundo vermelho
- **Página de notificações (NotificationFullPage)**: fundo branco/claro, cards com bordas suaves
- Organizar por categorias: Partidas, Transferências, Sistema
- Melhor visualização de créditos/economia
- Limitar exibição a máximo de créditos visíveis

### Mudanças em:
- `NotificationBell.tsx`: estilo do ícone
- `NotificationFullPage.tsx`: layout e cores

---

## Tarefa 3: Informação da Primeira Temporada

### Na aba Temporada (SeasonTab):
- Adicionar banner informativo: "🧪 Temporada de Testes - Início em 01/05/2026"
- Exibir quando `season.currentSeason === 1`
- Texto explicativo sobre regras da temporada teste

---

## Tarefa 4: Limpeza de Dados Offline

### Remover dados do localStorage:
- Na tela de Settings ou via botão dedicado
- Limpar chaves: `flm26_*`, `game_state_*`, qualquer cache local
- Não afeta dados do banco (partidas, save, ranking)

---

## Ordem de Implementação

1. Enriquecer `process-tournament-matches` com eventos completos (narração rica)
2. Criar `useMatchReplay` hook para replay de partidas salvas
3. Adicionar botões "Assistir/Replay" no calendário do torneio
4. Integrar replay no MatchPage
5. Redesign visual do NotificationBell + NotificationFullPage
6. Adicionar banner de temporada teste no SeasonTab
7. Implementar limpeza de dados offline no Settings

