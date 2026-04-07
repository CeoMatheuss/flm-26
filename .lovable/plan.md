

# Plano: Sistema de Treinos em Tempo Real, Boas-Vindas no Sininho e Melhoria Admin

## Resumo

Reescrever completamente o sistema de treinos para funcionar em tempo real (1 dia real = 1 dia no jogo), com sessões diárias, tipos de treino com descrições visuais, evolução progressiva acumulada, sistema de upgrade até nível 30, treino offline acumulado, e feedback diário. Também: mensagem de boas-vindas no sininho e melhorias no painel admin.

---

## 1 — Migração SQL

Nova tabela `daily_training_sessions` para persistir treinos no servidor:
- `id`, `user_id`, `player_id`, `session_date` (date), `session_slot` (1=manhã, 2=tarde)
- `training_type` (tecnico, tatico, fisico, recuperacao, preparacao)
- `focus` (ofensivo, defensivo, equilibrado, individual)
- `intensity` (leve, moderado, pesado)
- `dev_points_earned` (integer) — pontos acumulados nessa sessão
- `fatigue_generated` (integer)
- RLS: user can CRUD own

Nova tabela `player_development_points`:
- `id`, `user_id`, `player_id`, `attribute` (text), `accumulated_points` (integer), `threshold` (integer)
- Quando `accumulated_points >= threshold` → atributo +1, reset pontos
- RLS: user can CRUD own

Alterar `profiles`: adicionar `last_training_processed_at` (timestamptz) para saber último dia processado (treino offline acumulado).

Alterar custo de upgrade do CT: escala até nível 30 (R$10.000 → R$10.000.000).

---

## 2 — Tipos de Treino e Sessões Diárias

Cada dia permite 1 sessão obrigatória + 1 opcional (desbloqueada em CT nível 10+).

### 5 Tipos de Treino:
| Tipo | Cor | Efeito |
|---|---|---|
| 🟢 Técnico | Verde | Passe, drible, finalização |
| 🔵 Tático | Azul | Posicionamento, visão, compostura |
| 🔴 Físico | Vermelho | Velocidade, força, resistência — mais fadiga |
| 🟡 Recuperação | Amarelo | Reduz fadiga e risco de lesão |
| 🟣 Preparação de Jogo | Roxo | Boost geral para próxima partida |

Cada tipo tem descrição visível no card de seleção.

---

## 3 — Sistema de Foco
- Ofensivo: prioriza shooting, dribbling, crossing
- Defensivo: prioriza defending, marking, heading
- Equilibrado: distribui entre todos
- Individual: escolhe 1 jogador para treino especial (+50% pontos para ele)

---

## 4 — Evolução Progressiva (Pontos Acumulados)

Cada sessão gera X pontos de desenvolvimento no atributo focado. Quando atinge threshold → +1 atributo.

- Threshold base: `100 - (CT_level * 2)` pontos (nível 1 = 98, nível 30 = 40)
- Pontos por sessão: `base(5) * intensityMult * ageFactor * personalityFactor`
- Jovens (<22): 1.5x
- Veteranos (>30): 0.5x
- Dedicado: 1.2x, Preguiçoso: 0.8x

---

## 5 — Upgrade CT até Nível 30

Escala de custos:
- Nível 1→2: R$10.000
- Nível 10→11: R$500.000
- Nível 20→21: R$3.000.000
- Nível 29→30: R$10.000.000

Impactos por nível: velocidade de evolução, qualidade do treino, redução de fadiga, menor risco de lesão.

---

## 6 — Treino Offline Acumulado

Ao abrir o jogo, calcula dias desde `last_training_processed_at`. Para cada dia não processado:
- Aplica sessão automática com última config salva
- Gera pontos de desenvolvimento
- Aplica fadiga/recuperação
- Máximo: 7 dias offline acumulados

---

## 7 — Fadiga, Lesões e Moral

- Cada sessão gera fadiga (Físico=15, Técnico=8, Tático=5, Recuperação=-20, Preparação=3)
- Fadiga >80: risco de lesão aumenta 3x
- Treinos pesados consecutivos: moral -2/dia
- Treinos equilibrados: moral +1/dia
- Sem treino: perde ritmo (-1 stamina/dia)

---

## 8 — Feedback Diário

Card de resumo diário mostrando:
- Evolução dos jogadores (barras de progresso até próximo +1)
- Nível de cansaço de cada jogador
- Avisos de risco de lesão
- Jogadores insatisfeitos

---

## 9 — UI do TrainingTab (Reescrita)

Layout em 3 seções:
1. **Painel de Sessão do Dia**: selecionar tipo de treino + foco + intensidade para sessão da manhã/tarde
2. **Progresso dos Jogadores**: lista com barras de progresso acumulado por atributo, stamina, moral
3. **Histórico**: últimos 7 dias de resultados

Design com cards coloridos por tipo de treino, descrições visíveis, e indicadores claros.

---

## 10 — Mensagem de Boas-Vindas no Sininho

Ao criar conta, inserir notificação na tabela `user_notifications`:
- icon: 👋, title: "Bem-vindo ao FLM 26!", message com dicas iniciais
- Tipo: success

---

## 11 — Melhoria Painel Admin

- Abas com scroll horizontal funcional e setas visuais no mobile
- Reorganizar layout para melhor uso do espaço
- Cards de stats mais compactos

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| Migração SQL | `daily_training_sessions`, `player_development_points`, alterar profiles |
| `src/types/infrastructure.ts` | Escala CT até nível 30 |
| `src/training/TrainingTypes.ts` | Novos tipos (sessão diária, tipos de treino, foco) |
| `src/training/TrainingManager.ts` | Reescrever para sistema de pontos acumulados |
| `src/training/PlayerDevelopmentEngine.ts` | Adaptar para pontos progressivos |
| `src/components/game/TrainingTab.tsx` | Reescrita completa da UI |
| `src/components/game/NotificationBell.tsx` | Boas-vindas ao criar conta |
| `src/pages/Index.tsx` | Processar treino offline ao carregar + inserir welcome notification |
| `src/components/game/AdminTab.tsx` | Melhorar scroll mobile das abas |
| `src/hooks/useInfraState.ts` | Adaptar upgrade CT para 30 níveis |

## Ordem de Execução
1. Migração SQL (tabelas + profiles)
2. Tipos e engine de treino
3. UI do TrainingTab
4. Treino offline acumulado (Index.tsx)
5. Welcome notification
6. Admin melhorias

