

# Plano: Sistema de Base V2 (FLM 26) — Custos de Investimento Reduzidos

Reformulação completa da Academia de Base com **planos de investimento mais acessíveis** conforme solicitado. Mantém compatibilidade com saves existentes.

---

## 1. Novos Planos de Investimento (4 tiers fixos — VALORES REDUZIDOS)

**Arquivo**: `src/types/infrastructure.ts` + `src/components/game/YouthAcademyTab.tsx`

| Plano | Custo/mês | Jogadores |
|---|---|---|
| ❌ Sem Investimento | R$ 0 | 0 |
| 🔹 Básico | **R$ 250k** | 1 |
| 🔸 Intermediário | **R$ 500k** | 2–3 |
| 🔶 Avançado | **R$ 1M** | 4 |
| 🔴 Elite | **R$ 2M** | 5 (máximo) |

Atualizar `getYouthMonthlyPlayers()` para refletir as novas faixas. Botões grandes em grid 2×2 com selecionado destacado (estilo cards de tática).

---

## 2. Custos de Upgrade Rebalanceados (Nv 1 → 30)

**Arquivo**: `src/types/infrastructure.ts` (`academyUpgradeCosts`)

```
Nv 1→5:    0.5M, 1M, 1.5M, 2M, 3M
Nv 6→10:   4M, 6M, 8M, 10M, 13M
Nv 11→15:  16M, 20M, 25M, 30M, 36M
Nv 16→20:  45M, 55M, 65M, 80M, 95M
Nv 21→25:  110M, 130M, 155M, 185M, 220M
Nv 26→30:  260M, 300M, 350M, 400M, 450M
```

---

## 3. Faixas de OVR + Sistema de Potencial Oculto

**Arquivo**: `src/types/infrastructure.ts` + `src/utils/playerGenerator.ts`

| Nível | OVR Min | OVR Max |
|---|---|---|
| 1–5 | 40 | 55 |
| 6–10 | 45 | 60 |
| 11–20 | 50 | 70 |
| 21–25 | 55 | 80 |
| 26–30 | 60 | 85 (chance POT 99) |

**Tier de potencial oculto** (novo campo `potentialTier`):
- `comum` (POT até 70)
- `promissor` (71–80)
- `alto_potencial` (81–88)
- `talento_raro` (89–94)
- `geracional` (95–99) — só nível 26+

Olheiros continuam necessários para revelar POT exato.

---

## 4. Status de Evolução do Jogador

Novo campo `evolutionStatus: 'evoluindo' | 'estavel' | 'travado'` calculado a partir de tempo de jogo, treino, moral e idade.

Indicador visual: 📈 verde / ➡️ amarelo / ⚠️ vermelho.

---

## 5. Simulação Automática de Partidas da Base

**Novo arquivo**: `src/utils/youthMatchSimulator.ts`

A cada 4 rodadas, simula partida fictícia contra "academia rival":
- Placar baseado na média de OVR
- Cada prospect recebe nota 4–10 e ganha `gamesPlayed`
- Destaques aceleram evolução (+5% trainingProgress)
- Relatório no Jornal (categoria `BASE`)

---

## 6. Eventos Dinâmicos da Base

**Novo arquivo**: `src/utils/youthEvents.ts`

~25% de chance pós-ciclo:
- 🌟 Novo talento surgiu (+1 prospect acima da média)
- 🚀 Jogador evoluindo rápido (+10 OVR boost)
- 😴 Promessa estagnou (`travado` por 2 ciclos)
- 🏥 Lesão na base (indisponível 1 ciclo)

---

## 7. Sistema de Destaque (Tags)

Campo `youthTag`:
- `promessa_clube` — OVR ≥ 65 e < 20 anos
- `talento_base` — POT ≥ 85
- `revelacao` — destaque em 3+ partidas seguidas

Badge colorida no card.

---

## 8. Integração com Copinha (Sub-20)

- Desbloqueada na temporada ≥ 2
- Apenas prospects ≤ 20 anos
- 5 partidas mata-mata simplificadas
- Vencedores: +15 OVR boost; vice: +8; revelados ganham tag `revelacao`
- Troféu salvo em `clubProfile.trophies`

---

## 9. Decisões do Jogador

Já existe **Promover**. Adicionar:
- **Vender Jovem**: OVR × 50.000
- Aviso ao promover muito cedo (idade < 18 e OVR < 60)

---

## 10. UI Redesign (estilo cards modernos)

**Arquivo**: `src/components/game/YouthAcademyTab.tsx`

- Card de nível da Base com progresso visual até 30
- Grid 2×2 de planos (cards estilo tática)
- Lista de prospects com nome, idade, OVR grande, barra de evolução, tier de potencial (oculto sem olheiro = "???"), status (📈/➡️/⚠️), tag de destaque, botões Promover/Vender/Observar
- Banner "Última partida da base" no topo
- Botão "🏆 Inscrever na Copinha" quando desbloqueado

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/types/infrastructure.ts` | Novos custos (250k/500k/1M/2M), faixas OVR, novos campos |
| `src/utils/playerGenerator.ts` | Geração com tiers de potencial e novas faixas OVR |
| `src/utils/youthMatchSimulator.ts` | **NOVO** — simula partidas e relatórios |
| `src/utils/youthEvents.ts` | **NOVO** — eventos dinâmicos pós-ciclo |
| `src/hooks/useInfraState.ts` | Cobrar nova faixa, processar eventos, simulação por ciclo, `sellYouth`, `enrollCopinha` |
| `src/components/game/YouthAcademyTab.tsx` | UI completa nova |
| `src/components/game/GameTabRouter.tsx` | Passar novos handlers |
| `src/hooks/useGame.ts` | Expor novos handlers |

## Compatibilidade

- Saves antigos com `youthInvestment` numérico são normalizados automaticamente para o tier mais próximo
- Prospects existentes ganham `evolutionStatus = 'estavel'` e `potentialTier` calculado a partir do POT atual
- Sistema 100% client-side (sem nova tabela ou edge function)

