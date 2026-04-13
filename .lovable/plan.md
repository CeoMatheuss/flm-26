

# Plano: Funcionalidades Inovadoras para o Jogo

## 1 — Sistema de Moral Dinâmica dos Jogadores
Cada jogador terá um valor de **moral (0-100)** que muda com base em:
- Gols marcados, assistências → moral sobe
- Derrotas consecutivas, ficar no banco → moral cai
- Moral alta = +10% nos atributos efetivos; moral baixa = -15%
- Ícones visuais no elenco (😄 🙂 😐 😟 😡)

**Impacto**: jogadores insatisfeitos podem pedir transferência.

## 2 — Coletivas de Imprensa Pré-Jogo
Antes de jogos importantes (clássicos, finais), o jogador responde a perguntas da "imprensa" com opções:
- "Vamos jogar com humildade" → moral estável
- "Somos favoritos" → moral sobe se ganhar, cai muito se perder
- "Sem comentários" → neutro

Resultado influencia moral do elenco e reação da torcida.

## 3 — Sistema de Química entre Jogadores
Jogadores que jogam juntos várias partidas ganham **química** (links visíveis no campo):
- Mesma nacionalidade ou ex-clube = bônus inicial
- Química alta = passes mais precisos entre a dupla
- Visual: linhas coloridas conectando jogadores na formação

## 4 — Notificações Push em Tempo Real durante Partida
Quando o jogo está rodando em background (aba minimizada):
- Notificação de gol com vibração
- Alerta de cartão vermelho
- Fim de jogo com resultado

Usa `Notification API` do browser.

## 5 — Replay de Gols com Narração
Após cada gol, exibir uma mini-animação com:
- Sequência de passes que levaram ao gol (dados dos eventos)
- Narração textual dramática gerada por IA
- Botão "Compartilhar Gol" que gera imagem com placar + narração

---

## Recomendação de Implementação

Sugiro começar pelos itens **1 (Moral)** e **4 (Notificações Push)** por serem os mais impactantes na experiência do jogador com menor complexidade.

| Funcionalidade | Arquivos Principais | Complexidade |
|---|---|---|
| Moral Dinâmica | `game.ts`, `start-match`, `SquadTab.tsx` | Média |
| Coletivas de Imprensa | Novo componente + `DashboardTab.tsx` | Média |
| Química de Jogadores | `TacticsTab.tsx`, `start-match` | Alta |
| Notificações Push | `useMatchSimulation.ts` | Baixa |
| Replay de Gols | `MatchPage.tsx`, edge function IA | Alta |

