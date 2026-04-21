

# Plano: Foco em Fisioterapia + Redesign da Tela de Partida

## Parte 1 — Aba Infraestrutura: Apenas Fisioterapia

**Arquivo**: `src/components/game/InfrastructureTab.tsx`

- **Remover** o card "Centro de Treinamento" (CT continua existindo no jogo, apenas não aparece nesta seção de saúde/recuperação).
- **Manter apenas** o card "Fisioterapia", agora único e mais destacado.
- Adicionar **botão "?" (HelpCircle)** ao lado do título "Fisioterapia". Ao clicar abre `Dialog`:

  > **🏥 FISIOTERAPIA — COMO FUNCIONA**
  > • Recupera stamina diariamente (+30 + nível do fisio, máx +50)
  > • Reduz risco de lesão
  > • Acelera recuperação de jogadores lesionados
  > • Reduz chance de recaída
  > • Ajuda jogadores cansados (<50 stamina)
  >
  > **💡 DICAS**
  > • Jogadores com baixa stamina têm mais risco de lesão
  > • Rotacione o elenco para evitar desgaste
  > • Fisio alto melhora a estabilidade do time

- Adicionar **bloco "Status do Elenco"** dentro do card, calculado das props (passar `players` ao componente):
  - Stamina média do elenco → texto "Baixo desgaste" (≥70), "Desgaste moderado" (40–69), "Alto desgaste" (<40)
  - Lesionados ativos → "X jogador(es) em recuperação"
  - Risco geral baseado em stamina + propensão média → badge "🟢 Baixo risco" / "🟡 Atenção" / "🔴 Alto risco"

- Atualizar `Props` para incluir `players: Player[]` e remover a opção `'trainingCenter'` do callback `onUpgrade`.
- Atualizar `GameTabRouter.tsx` para passar `players` e remover prop relacionada ao CT nesta aba.

## Parte 2 — Redesign da Tela de Partida (MatchPage)

**Arquivo**: `src/pages/MatchPage.tsx`

### 2.1 Narração estilo chat
Substituir o feed atual de eventos por um layout estilo **chat vertical**:
- Cada lance é um **bloco separado** com:
  - **Escudo do time** (24×24) à esquerda quando `ev.team === 'home' | 'away'` (usar `<ShieldCrest>` com `shieldPropsFromClub`)
  - Minuto em badge sutil (cinza)
  - Texto da narração em cor neutra (`text-foreground` ou `text-muted-foreground`)
- Espaçamento maior entre eventos (`space-y-3` em vez de `space-y-1`)
- Sem fundos coloridos por tipo (remover `getEventBg`), apenas borda inferior sutil `border-b border-border/10`

### 2.2 Cores neutras (remover poluição)
Reescrever `getEventColor`:
- **Padrão**: `text-foreground/85` (neutro)
- **Gols**: `text-emerald-400 font-bold` (único destaque vivo)
- **Apito final / fim de jogo**: `text-emerald-400`
- **Cartões vermelhos / lesões graves**: `text-foreground/70` + emoji (sem vermelho exagerado)
- **Tudo o mais**: neutro

Remover também `text-yellow-400`, `text-red-400` etc. dos eventos comuns no feed.

### 2.3 Card de Fim de Jogo elegante
Refazer `FinishedSection` (parte do header):
- Caixa central com fundo `bg-card/80` + borda `border-emerald-500/20`
- Texto "🏁 FIM DE JOGO" grande e centralizado
- Placar enorme (`text-6xl font-mono`) em destaque
- Tempo total da partida e estádio em linha sutil abaixo
- Animação `animate-fade-in` + leve `scale` na entrada

### 2.4 Escalações (lado direito / inline)
No `LineupView`:
- Aumentar espaçamento entre jogadores (`space-y-2.5`)
- Substituir "stamina XX%" por **barra horizontal fina** (h-1.5) colorida (verde/amarelo/vermelho conforme valor)
- Nota do jogador (rating) maior e em badge ao lado direito do card

### 2.5 Estatísticas modernas
No `StatsView`:
- Substituir números brutos por **barras comparativas** (split bar mostrando % do total entre os dois times)
- Menos texto, ícones maiores no rótulo
- Cores neutras: barra azul (casa) vs barra cinza-escuro (visitante)

### 2.6 Estilo geral
- Remover bordas coloridas das seções (`border-yellow-500/20`, `border-blue-500/20`, etc.) → usar `border-border/20` neutro
- Manter ícones coloridos pequenos apenas no título de cada seção
- Sticky top bar mais limpa (chips menores, sem cores fortes)

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/game/InfrastructureTab.tsx` | Remove CT, adiciona helper "?", adiciona Status do Elenco |
| `src/components/game/GameTabRouter.tsx` | Passa `players` para `InfrastructureTab` |
| `src/pages/MatchPage.tsx` | Feed estilo chat com escudos, cores neutras, novo card de fim de jogo, barras de stamina, stats com barras comparativas, redução de bordas coloridas |

## Compatibilidade

- CT continua acessível e funcional em outros locais do jogo (cálculos de evolução, bônus de treino) — apenas removido visualmente desta tela.
- Eventos de partida existentes continuam compatíveis (apenas mudou a renderização).
- Sem mudanças de schema ou de tipos persistidos.

