

# Plano de Features - FLM 26

## 1. Bot Team FC para Ligas Multiplayer
Times sem dono real nas ligas multiplayer serao identificados como "Bot Team FC". Quando uma liga iniciar a temporada sem preencher todos os slots, os slots vazios serao preenchidos automaticamente com bots.

### Detalhes Tecnico
- No `useMultiplayer.ts`, ao iniciar a temporada (`startSeason`), preencher slots vazios ate `max_members` com membros bot (user_id prefixado com `bot_`)
- Bots recebem elenco gerado automaticamente via `generateMarketPlayers`
- Na UI do `MultiplayerTab.tsx`, exibir badge "BOT" ao lado de times bot na tabela de classificacao
- Bots nao contam como "usuarios online" - adicionar indicador de online/offline nos membros

## 2. Premiacoes da Liga (Artilheiro e Assistencias)
Ao final de cada temporada, o sistema calcula automaticamente artilheiro e melhor assistente baseado nos dados de match_data (eventos de gol).

### Detalhes Tecnico
- Extrair gols e assistencias dos `match_data.events` de cada partida jogada
- Criar nova aba "Premiacoes" no `MultiplayerTab.tsx` com ranking de artilheiros e garcons
- No `endSeason`, salvar premiacoes na tabela `league_awards` (nova tabela no banco)
- Campos: league_id, season, award_type (artilheiro/assistente/melhor_time), user_id, player_name, value (gols/assists)

## 3. Noticia de Final de Temporada no Jornal
No `NewspaperCard.tsx`, ao encerrar temporada, gerar manchetes especiais: melhor jogador, melhor garcom, time que mais venceu.

### Detalhes Tecnico
- Adicionar novo tipo de evento `season_awards` no `GameEvent`
- Na funcao `advanceSeason` do `useGame.ts`, calcular estatisticas e gerar eventos de premiacao
- Melhor jogador = maior media de rating; Melhor garcom = mais assistencias; Time campeao = mais vitorias

## 4. Aba de Trofeus no Painel do Clube
Nova aba "Trofeus" no dashboard mostrando conquistas do clube com data e temporada.

### Detalhes Tecnico
- Adicionar campo `trophies` no tipo `ClubProfile` (array de {title, season, date})
- Criar componente `TrophiesTab.tsx` com cards dourados para cada trofeu
- Ao vencer liga (1o lugar), ganhar artilharia, etc., adicionar trofeu automaticamente
- Trofeus de ligas multiplayer vem da tabela `league_awards`

## 5. Limite de 3 Emprestimos (Dar e Receber)
O sistema ja tem limite de 3 emprestimos recebidos. Confirmar e manter o limite de 3 para dar e 3 para receber.

### Detalhes Tecnico
- Ja existe no codigo: `canLoanOut` verifica `loanedPlayers.filter(l => l.direction === 'out').length < 3`
- Ja existe: `loansIn.length >= 3` no `loanInPlayer`
- Apenas validar que a UI mostra claramente "X/3 emprestimos ativos" em ambas direcoes

## 6. Jogador Insatisfeito Pede para Sair
Se um jogador com overall >= 70 ficar 2 temporadas consecutivas sem jogar (gamesPlayed == 0 por 2 temporadas), ele pede para sair no final do contrato.

### Detalhes Tecnico
- Adicionar campo `seasonsWithoutPlaying` no tipo `Player`
- Na funcao `advanceSeason`, incrementar contador para jogadores com 0 jogos na temporada
- Se `seasonsWithoutPlaying >= 2` e `overall >= 70`, gerar evento de insatisfacao e remover jogador do elenco automaticamente (sem custo) ou abrir dialogo para o usuario decidir
- Gerar evento no jornal: "JOGADOR INSATISFEITO DEIXA O CLUBE"

## 7. Remover Preco do Estadio das Configuracoes
Remover a secao de preco de ingresso do `ClubSettingsTab.tsx`. O preco do ingresso ja e gerenciado na aba do Estadio.

### Detalhes Tecnico
- Remover o card "Preco do Ingresso" do `ClubSettingsTab.tsx` (linhas 79-107)
- Remover props `ticketPrice` e `onSetTicketPrice` do componente
- Atualizar `Index.tsx` para nao passar essas props ao `ClubSettingsTab`

## Migracoes de Banco Necessarias
- Criar tabela `league_awards` com campos: id, league_id, season, award_type, user_id, player_name, value, created_at
- Adicionar RLS policies para leitura por membros da liga

## Arquivos Modificados
- `src/hooks/useMultiplayer.ts` - Bot teams, premiacoes
- `src/hooks/useGame.ts` - Jogador insatisfeito, trofeus, noticias de temporada
- `src/components/game/MultiplayerTab.tsx` - UI de bots, premiacoes, online
- `src/components/game/ClubSettingsTab.tsx` - Remover preco ingresso
- `src/components/game/DashboardTab.tsx` - Link para trofeus
- `src/components/game/NewspaperCard.tsx` - Noticias de final de temporada
- `src/types/game.ts` - Campo seasonsWithoutPlaying no Player
- `src/types/clubProfile.ts` - Campo trophies
- `src/pages/Index.tsx` - Integrar novas features
- Nova tabela `league_awards` via migracao SQL

