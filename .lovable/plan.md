

# Plano: Simulação Realista, Boas-Vindas Globais, Relatório Pós-Jogo e Personalidades

## Problemas Identificados

### 1 — Público irreal na simulação
No `start-match/index.ts` (linha 714), o público é calculado como:
```
estimatedCrowd = Math.min(50000, 2000 + rng() * 8000 + homeStrength * 100)
```
Isso ignora completamente o `stadiumCapacity` passado pelo cliente. Um estádio de 5k pode mostrar 12k de público.

**Também**: no relatório (linha 144), attendance usa `stadiumCapacity` mas esse valor na função `generateReport` recebe `estimatedCrowd` (linha 776) em vez do `stadiumCapacity` real.

### 2 — Simulação não usa personalidades
O `start-match` recebe `homePlayers` mas ignora o campo `personality`. Jogadores com personalidade `competitivo`, `lider`, `calmo`, `temperamental` etc. não influenciam a partida.

### 3 — Atributos por posição não pesam o suficiente
A simulação já tem `homeAtkAvg`, `homeDefAvg`, etc. mas o peso deles no lambda do Poisson é baixo (`* 0.3`). Times com overall alto mas ataque fraco goleiam igual.

### 4 — Relatório/Notificação chega ANTES da partida acabar
O `start-match` já salva `match_reports` e `user_notifications` no momento da criação (linhas 908-960). O jogador recebe notificação do resultado no sininho ANTES de assistir a partida.

### 5 — Boas-vindas só para novos jogadores
A mensagem de boas-vindas só é enviada na criação do clube (Index.tsx linha 100). Jogadores antigos nunca receberam.

---

## O que será feito

### 1 — Público baseado em dados reais
Mudar a fórmula de `estimatedCrowd` no `start-match` para:
```typescript
const maxCapacity = stadiumCapacity || 5000;
const fanFactor = clamp(homeFans / maxCapacity, 0.3, 1.0);
const resultFactor = 0.5 + rng() * 0.3 + (homeStrength / 200);
const estimatedCrowd = Math.floor(Math.min(maxCapacity, maxCapacity * fanFactor * resultFactor));
```
Receber `fans` do cliente junto com `stadiumCapacity`. O público nunca excede a capacidade do estádio.

### 2 — Personalidades impactam a simulação
Receber `personality` de cada jogador no `homePlayers`. Aplicar modificadores:
- **lider**: +3% moral efetiva do time todo se moral > 70
- **competitivo**: +5 em atributos ofensivos contra times com OVR > 70
- **calmo**: +5 composure efetiva
- **temperamental**: ±random em rating base (pode ser 5.5 ou 6.5)
- **dedicado**: +3 em todos atributos efetivos
- **preguicoso**: -2 em physical e workRate efetivos

### 3 — Atributos por posição mais relevantes
Aumentar peso dos atributos posicionais no cálculo do lambda:
- Atacantes com `shooting` alto devem produzir mais gols
- Defesa com `defending`+`marking` alto deve reduzir gols adversários
- Meio-campo com `passing`+`vision` alto melhora criação

### 4 — Relatório só após partida acabar
Mover o INSERT de `match_reports` e `user_notifications` do `start-match` para o fluxo de conclusão. Duas opções:
- **Opção escolhida**: Salvar `reportData` no campo `stats` do `live_matches` mas NÃO inserir report/notification. Quando o `checkFinished` no `Index.tsx` aplica o resultado, ele lê `reportData` do `live_matches` e FAZ o insert de `match_reports` e `user_notifications` nesse momento.

### 5 — Boas-vindas para todos
Ao carregar o jogo (`GameUI` useEffect), verificar se o usuário já tem uma notificação com título "Bem-vindo ao FLM 26!". Se não tiver, inserir a mensagem de boas-vindas.

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `supabase/functions/start-match/index.ts` | Público realista baseado em fans+capacidade; personalidades; peso posicional aumentado; NÃO salvar report/notification no start |
| `src/pages/Index.tsx` | checkFinished salva report+notification ao concluir; boas-vindas para todos |
| `src/components/game/MatchesTab.tsx` | Passar `fans` ao navegar para match |
| `src/pages/MatchPage.tsx` | Passar `fans` na inicialização |

## Ordem
1. Atualizar `start-match` edge function (público, personalidades, sem report prematuro)
2. Atualizar `Index.tsx` (relatório pós-jogo, boas-vindas global)
3. Atualizar `MatchesTab.tsx` (passar fans)

