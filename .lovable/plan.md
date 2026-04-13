

# Plano: Narração Mais Longa + Design Melhorado + Assistente Detalhado + Correções de Campeonato

## Resumo

Melhorar a simulação com mais eventos, redesenhar a interface da partida com botões que navegam para páginas/seções distintas, expandir o assistente técnico com informações detalhadas, remover a tela pré-jogo desnecessária, corrigir simulação automática por timeout, e verificar campeonatos para início dia 01/05.

---

## 1 — Mais Eventos na Simulação (start-match Edge Function)

**Problema**: A simulação gera poucos eventos por minuto, o jogo parece "vazio".

**Solução**:
- Aumentar `chanceMins` de 5-10 para 10-18 eventos de chance
- Aumentar `possessionMins` para gerar 2-3 eventos por minuto em vez de 1
- Adicionar novos tipos de evento: `counter_attack`, `long_ball`, `gk_distribution`, `throw_in`, `free_kick_near`, `buildup_play`, `pressing_recovery`
- Cada evento terá descrições mais longas e narrativas (2-3 frases)
- Adicionar emojis em todas as descrições de eventos

## 2 — Redesign da Interface de Partida (MatchPage.tsx)

**Problema**: Botões pequenos, textos curtos, design genérico.

**Solução**:
- **Barra fixa no topo**: Manter os 4 botões (Tática, Time, Stats, Assistente) mas com design mais bonito — ícones maiores, textos maiores (`text-sm`), altura `h-10`, espaçamento melhor
- **Cada botão abre um Sheet fullscreen** (já funciona assim, mas melhorar o conteúdo dentro)
- **Aumentar textos**: Narração de `text-xs/sm` para `text-sm/base`, placar mantém `text-3xl/6xl`
- **Emojis em tudo**: Cada tipo de evento com emoji correspondente
- **Indicador de minuto melhorado**: Mostrar "1º TEMPO • 23'" ou "2º TEMPO • 67'" com badge maior e pulsante
- **Remover PreMatchScreen** (tela de escalação antes da partida) — ir direto para a simulação
- **Cores**: Manter o esquema atual (emerald para gols, yellow para chances, blue/red para times)

## 3 — Assistente Técnico Detalhado

**Problema**: As dicas do assistente são genéricas e poucas.

**Solução**:
- Gerar mais tipos de tips na Edge Function:
  - Análise tática: "O adversário está jogando com linha alta, explore contra-ataques"
  - Análise de performance: "Seu meio-campo está perdendo muitos duelos, considere um VOL mais defensivo"
  - Recomendação de substituição com justificativa detalhada
  - Alerta de pressão: "Estamos sofrendo muita pressão nos últimos 10 minutos"
  - Alerta de oportunidade: "O adversário tem um jogador com cartão amarelo, explore o lado dele"
- No painel do assistente (Sheet), mostrar todas as dicas organizadas cronologicamente com ícones e cores
- Mostrar informações da partida: momentum, posse, chutes, comparação de setores (defesa/meio/ataque)

## 4 — Remover Tela Pré-Jogo

**Problema**: O usuário pediu para remover "essa coisa antes de entrar".

**Solução**: Pular o `PreMatchScreen` e ir direto para `doStartMatch` com os jogadores já selecionados do `locState`.

## 5 — Simulação Automática por Timeout

**Problema**: Quando o prazo estoura e a partida é simulada automaticamente, algo não funciona bem.

**Solução**: Verificar e garantir que `process-tournament-matches` gere corretamente os resultados quando o timeout ocorre, e que o status mude para `played` com `match_data` completo.

## 6 — Verificar Campeonatos para Dia 01

**Status atual**: Existe 1 torneio custom (`Liga Nacional Brasil`) com status `in_progress` e 43 ligas multiplayer todas em `registration` com `season_start = null`. O `plan-season` (pg_cron) deve ser acionado no último dia do mês para agendar jogos começando dia 01.

**Ação**: Verificar se o `plan-season` está configurado corretamente e se as ligas em `registration` com 20 membros cada vão iniciar corretamente.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/start-match/index.ts` | Mais eventos, narrações longas, tips detalhados |
| `src/pages/MatchPage.tsx` | Redesign UI, remover PreMatch, textos maiores, emojis, indicador de minuto |
| `src/match/useMatchSimulation.ts` | Suportar novos tipos de evento |
| `supabase/functions/process-tournament-matches/index.ts` | Verificar simulação automática por timeout |
| `supabase/functions/plan-season/index.ts` | Verificar configuração para início dia 01 |

## Ordem de Implementação

1. Reescrever `start-match` com mais eventos e tips detalhados
2. Redesenhar `MatchPage.tsx` — remover PreMatch, melhorar UI, textos maiores
3. Atualizar helpers de ícones/cores para novos tipos
4. Verificar e corrigir `process-tournament-matches` para timeout
5. Verificar `plan-season` para ligas começarem dia 01

