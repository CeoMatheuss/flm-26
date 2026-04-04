

# Plano: Melhorias Gerais — Responsividade, Admin Logs, Campeonato, Amistosos Online e Visualização de Times

## Resumo

Múltiplas melhorias: responsividade mobile, logs admin, redesign campeonato, amistosos online com convite aberto, visualização de time adversário, remoção da aba temporada/indicador dia, limpeza de dados, e hide do badge Lovable.

---

## 1 — Responsividade Mobile (Dashboard + Admin)

- **DashboardTab**: Stats cards em `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`, texto responsivo
- **AdminTab**: Tabs scrollable horizontal no mobile, formulários em grid compacto, inputs full-width
- **GameHeader**: Remover indicador `Dia X/30` da temporada (conforme pedido)
- **TournamentDashboardCard**: Fontes maiores nos nomes de times e placares, badges mais legíveis

## 2 — Logs Admin

- Criar tabela `admin_logs` com campos: `id`, `user_id`, `action`, `details (jsonb)`, `created_at`
- RLS: apenas admins podem ler/inserir
- Nova sub-aba "Logs" no AdminTab mostrando histórico de ações (criar torneio, banir, gift, etc.)
- Inserir logs automaticamente nas ações admin existentes (ban, gift, torneio, manutenção)

## 3 — Redesign Aba Campeonato

- Aumentar tamanho de fontes: nomes de times 14px, placares 16px bold
- Tabela de classificação com colunas mais espaçadas
- Calendário de jogos com cards maiores e mais legíveis
- Badge de status do jogo mais visível

## 4 — Esconder Badge "Edit with Lovable"

- Usar `publish_settings--set_badge_visibility` para esconder

## 5 — Verificação de Email (Auth)

- Verificar configuração atual de confirmação de email
- Garantir que `supabase.auth.signUp` envia código OTP corretamente
- Melhorar UX da tela de OTP com instruções mais claras

## 6 — Limpar Dados do Jogo (Reset)

- Adicionar botão "Resetar Jogo" nas Configurações que deleta o save do banco e recarrega
- Migração para limpar dados existentes se necessário

## 7 — Remover Aba Temporada e Indicador de Dia

- Remover entrada "Temporada" do `GameMenu.tsx`
- Remover `SeasonTab` do `GameTabRouter.tsx`
- Remover badge `Dia X/30` do `GameHeader.tsx`

## 8 — Amistosos Online Redesign

- Remover simulação local de amistoso (botão "Jogar Amistoso" no Dashboard que simula vs BOT)
- Manter apenas modo online: buscar jogador, enviar convite
- Adicionar opção de **convite aberto**: jogador publica que quer jogar, primeiro que aceita fecha o amistoso
- Nova tabela `open_friendly_slots` com: `id`, `user_id`, `club_name`, `stadium_name`, `stadium_capacity`, `created_at`, `status`
- No `OnlineFriendliesTab`: seção "Partidas Abertas" listando convites abertos de outros jogadores
- Botão "Criar Partida Aberta" que publica disponibilidade

## 9 — Visualizar Time Adversário

- Ao clicar no nome de um clube (no jornal, campeonato, ranking, amistosos), abrir página/modal `ClubProfilePage` com:
  - Escudo, nome, país, reputação
  - Infraestrutura (níveis)
  - Elenco completo (carregado via `game_saves` ou `league_squads`)
  - Estatísticas do clube
- Prop `onViewClub` já existe em alguns componentes — expandir para jornal e ranking
- Criar rota ou modal dedicado que carrega dados do clube via save público

## 10 — Melhorar Jornal

- No `NewspaperFullPage`: ao lado do nome do clube em cada notícia, tornar clicável para abrir perfil do clube
- Adicionar filtros por categoria (Mercado, Resultado, etc.)

---

## Arquivos Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `src/components/game/DashboardTab.tsx` | Responsividade mobile |
| `src/components/game/AdminTab.tsx` | Responsividade + logs |
| `src/components/game/GameHeader.tsx` | Remover Dia X/30 |
| `src/components/game/GameMenu.tsx` | Remover aba Temporada |
| `src/components/game/GameTabRouter.tsx` | Remover SeasonTab, add ClubProfilePage |
| `src/components/game/TournamentDashboardCard.tsx` | Fontes maiores, design |
| `src/components/game/OnlineFriendliesTab.tsx` | Convite aberto, remover simulação local |
| `src/components/game/MatchDashboardCard.tsx` | Remover botão amistoso local |
| `src/components/game/NewspaperFullPage.tsx` | Clique no clube, filtros |
| `src/components/game/ClubProfilePage.tsx` | Expandir para visualização pública |
| `src/pages/Auth.tsx` | Melhorar UX de verificação |
| `src/components/game/SettingsTab.tsx` | Botão reset game |
| Migração SQL | Tabela `admin_logs`, `open_friendly_slots` |

## Ordem de Execução

1. Migração SQL (admin_logs + open_friendly_slots)
2. Remover aba temporada + indicador dia
3. Responsividade Dashboard + Admin
4. Logs admin
5. Redesign campeonato (fontes)
6. Amistosos online com convite aberto
7. Visualização de time adversário
8. Melhorar jornal
9. Auth/OTP melhorias
10. Hide badge Lovable
11. Reset game button

