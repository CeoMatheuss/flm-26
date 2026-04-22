

# Plano: Otimização Geral — Fisio, Torcida, Perfil, Infra, Olheiros, Staff, Admin e Mercado

## 1. Fisioterapia — Custos rebalanceados (Nv 1→20)

Atualizar `src/types/infrastructure.ts`:
- Reescrever `physiotherapyCosts` com a tabela exata pedida:
  ```
  2:300k, 3:500k, 4:800k, 5:1.2M, 6:1.8M, 7:2.5M, 8:3.5M, 9:4.8M, 10:6M
  11:8M, 12:10M, 13:13M, 14:16M, 15:20M
  16:25M, 17:32M, 18:40M, 19:50M, 20:65M
  ```
- Manter `getDailyStaminaRecovery()` já correto (30 + nível, máx 50).
- O `InfrastructureTab` já mostra recuperação e cap; só validar texto "+30 base / max 50".

## 2. Torcida — Ganho moderado por partida

Em `src/hooks/useMatchState.ts`:
- Substituir a lógica atual (que pode dar +200 a +300) por faixa final fixa **50 a 100** torcedores em vitória, **20 a 50** em empate, **0 a 20** em derrota.
- Remover bônus exagerados de streak/estádio que estouram o teto. Manter pequena variação por reputação (±10) e estádio (+5/nível).
- Cap final: `clamp(fanChange, -50, 100)`.

## 3. Simulação de partida — Auto-play baseado em tempo (sem depender do servidor)

Em `src/match/useMatchSimulation.ts` + `src/pages/MatchPage.tsx`:
- Reforçar fallback client-side: se `live_matches` não responder em 8s, ou se a partida for amistoso vs BOT, simular **integralmente no cliente** usando timestamp:
  - `currentMinute = floor((Date.now() - startedAt) / (duration_seconds * 1000 / 90))`
  - Eventos gerados deterministicamente por seed (matchId) → idêntico em qualquer dispositivo.
- Servidor permanece como "source of truth" só para PvP; amistoso/treino simulam offline.
- Persistir resultado quando partida termina (apenas se online); se offline, salva no `localStorage` e faz re-sync.

## 4. Perfil do Clube — Apenas Saldo Total

Em `src/components/game/ClubProfileTab.tsx`:
- Remover badges/números de "verba de transferência", "verba salarial", "reserva" caso apareçam (verificar BudgetBreakdown referenciado).
- Card superior exibe somente: `💰 Saldo: R$ X` (formato compacto via `formatMoney`).
- Manter torcedores, reputação, temporada, país.
- BudgetBreakdown continua acessível só na aba `Finanças`.

## 5. Infraestrutura — Mover Base e Treinamento

Em `src/components/game/GameMenu.tsx` e `GameTabRouter.tsx`:
- Criar **aba unificada "Infraestrutura"** que apresenta sub-tabs:
  - 🏥 Fisioterapia (atual)
  - 🎓 Categorias de Base (atual `YouthAcademyTab`)
  - 🏋️ Centro de Treinamento (atual `TrainingTab` — só a parte de upgrade do CT, não confundir com a aba de execução de treino diário, que continua como "Treinos")
- Remover entradas duplicadas "Categorias de Base" e "Treinos" do menu lateral; manter apenas o atalho **"Treinos"** (sessão diária) e **"Infraestrutura"** (upgrades).
- Decisão: **Centro de Treinamento upgrade vai para Infra**; **execução diária de treino fica em "Treinos"**.

## 6. Olheiros — Geração automática + Premium instantâneo

Novo módulo `src/hooks/useScoutGenerator.ts`:
- A cada **7 dias reais** (compara `lastScoutGeneratedAt` salvo em `clubState`), gera 1 olheiro disponível com `skill` aleatório (1–8) e o adiciona em `availableScouts[]` (novo array no club state).
- `ScoutsTab.tsx` ganha sub-seção "🎁 Olheiros Disponíveis" com card "Próximo em Xd Yh".
- Botão **"⚡ Olheiro Nível Máximo (10) — 10 moedas"** chama `usePremium`/Pacotinhos para debitar coins e criar instantaneamente um scout skill 10.
- Manter contratação manual atual como opção paga em R$.

## 7. Equipe Técnica — Geração automática de 5 assistentes livres

Em `src/components/game/StaffTab.tsx`:
- Substituir array fixo `STAFF_MARKET` por mercado dinâmico:
  - Hook `useStaffMarket()` mantém **5 assistentes**, **2 médicos** e **2 preparadores** sempre disponíveis com níveis aleatórios (3–9), salários proporcionais.
  - Refresh automático a cada **15 dias reais** ou via botão "🔄 Atualizar Mercado" (cooldown 24h).
- Persiste em `clubState.staffMarket[]` via auto-save.
- Mantém limite de 1 staff por papel (`hasRole`).

## 8. Painel Admin — Novas funções de geração

Em `AdminTab.tsx`, categoria **Players** (sub-tab nova "Geradores"):
- Botão **"🔍 Gerar Olheiros"** — input: quantidade + skill. Insere em todos os clubes alvo (ou um user específico) via Edge Function nova `admin-generate-staff` ou direto em `game_saves.club_data.availableScouts`.
- Botão **"👨‍💼 Gerar Equipe Técnica"** — gera 5 assistentes/2 médicos/2 preparadores no mercado global.
- Botão **"♻️ Resetar Mercado de Staff (todos)"** — limpa e regenera.
- Reaproveitar layout do gerador de jogadores existente (cards lado a lado).

## 9. Mercado — Aumentar preço dos jogadores top

Em `src/utils/playerGenerator.ts` → `getPlayerBaseValue`:
- Reescalonar curva de OVR para encarecer elite:
  ```
  OVR ≥ 90 → ovr * 250.000  (era 80k)
  OVR ≥ 85 → ovr * 150.000  (era 80k)
  OVR ≥ 80 → ovr * 80.000
  OVR ≥ 75 → ovr * 50.000   (era 40k)
  OVR ≥ 70 → ovr * 30.000
  OVR ≥ 65 → ovr * 20.000
  OVR ≥ 55 → ovr * 10.000
  resto    → ovr * 5.000
  ```
- Manter `ageFactor` atual.
- Resultado típico: jogador OVR 90 / 24a passa de ~9M para ~30M; OVR 85 sobe de ~6.5M para ~14M.
- Ajustar `pacotinhos` se houver cálculo derivado.

## 10. Validação

| Item | Como validar |
|---|---|
| Custo Fisio | Abrir aba Fisioterapia, conferir botão "Melhorar para Nv 2 — R$ 300k", "10 — R$ 6M", "20 — R$ 65M" |
| Torcida | Disputar 5 amistosos: ganhos sempre dentro de 50–100 |
| Sim offline | Desligar Wi-Fi mid-match → simulação continua até o 90' |
| Perfil Clube | Apenas 1 número financeiro visível |
| Infra unificada | Menu mostra 1 entrada "Infraestrutura" com 3 sub-tabs |
| Olheiros auto | Após 7d (ou ajuste de relógio), ver olheiro novo disponível |
| Olheiros premium | Comprar com 10 coins → skill 10 imediato |
| Staff dinâmico | Demitir assistente → ver novo no mercado, refresh automático |
| Admin gerar | Botões funcionam, jogadores recebem itens |
| Preço top | OVR 90 jovem custa ~30–40M no mercado |

## 11. Anti-bug

- ✅ `physiotherapyCosts` indexado por nível-alvo (key 2 = custo de 1→2, etc.) — coerente com `getUpgradeCost(currentLevel)` que já usa `[currentLevel + 1]`.
- ✅ Geração de olheiros usa timestamp persistido — evita duplicar se user abrir várias abas (debounce + check `Date.now() - lastGen >= 7d`).
- ✅ Staff market regenerado preserva contratos ativos (filtrar por `hasRole`).
- ✅ Aumento de preço aplica só a NOVOS jogadores gerados (`generateMarketPlayers`); jogadores já no elenco mantêm valor calculado on-the-fly via `getPlayerValue` (refletirá novo preço, intencional).
- ✅ Simulação offline grava resultado em `localStorage` com chave `pending_match_result_{matchId}` → `useGame` faz flush para Supabase quando voltar online.
- ✅ Cap de torcida não afeta sistema existente de reputação (só `fanChange`).
- ✅ Aba "Infraestrutura" unificada não quebra deep-links de tutorial (mapear redirect `youth` e `training` → `infra` se necessário).
- ✅ Migração: nenhuma alteração de schema necessária — tudo cabe no `club_data` JSONB existente.

