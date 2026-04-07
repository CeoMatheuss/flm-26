

# Plano: Corrigir Auto-Simulação, Boas-Vindas, Tutorial e Mensagem Direta Admin

## Diagnóstico

### Bug: Amistosos simulando automaticamente
O `Index.tsx` (linhas 207-219) executa `checkFinished()` ao carregar, que busca qualquer `live_match` com status `finished` e aplica o resultado automaticamente. O fallback `game.club.matches.find(m => !m.played)` pega QUALQUER partida não jogada, causando aplicação incorreta de resultados de partidas stale. Isso faz parecer que o amistoso foi "simulado automaticamente".

**Correção**: Usar `match_id` como critério primário e só aplicar se o `match_id` corresponder a uma partida local real. Remover o fallback genérico. Adicionar validação de tempo (não aplicar matches com mais de 2h).

### Boas-vindas no sininho
Já existe uma mensagem de boas-vindas sendo inserida na criação do clube (linha 100-106 do Index.tsx). Precisa verificar se está funcionando e melhorar o conteúdo.

### Tutorial
O tutorial já bloqueia após uso (salvo no banco). Precisa garantir que funciona corretamente.

### Admin enviar mensagem direta a um jogador
Não existe. Precisa adicionar no AdminTab a funcionalidade de inserir uma notificação na tabela `user_notifications` para um user_id específico (buscando por nome do clube).

---

## O que será feito

### 1 — Corrigir Auto-Simulação de Amistosos
- No `Index.tsx`, modificar `checkFinished()`:
  - Só aplicar resultado se `match_id` do `live_match` corresponder exatamente a um `match.id` local
  - Remover fallback `?? game.club.matches.find(m => !m.played)`
  - Adicionar check de tempo: ignorar matches com mais de 2 horas
  - Limpar matches stale sem aplicar resultado

### 2 — Melhorar Mensagem de Boas-Vindas
- A mensagem já existe. Melhorar o texto com mais dicas úteis.
- Garantir que aparece no sininho corretamente.

### 3 — Admin: Enviar Mensagem Direta
- No `AdminTab.tsx`, adicionar seção "Mensagem Direta" na aba existente:
  - Select/busca por nome do clube (via `game_saves` + `profiles`)
  - Campo de título, mensagem e ícone
  - Botão enviar que faz INSERT em `user_notifications`
- RLS de `user_notifications` precisa permitir INSERT por admins para qualquer `user_id`

### 4 — Migração SQL
- Adicionar policy RLS em `user_notifications` para admins poderem inserir notificações para qualquer usuário

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| Migração SQL | RLS policy para admin INSERT em user_notifications |
| `src/pages/Index.tsx` | Corrigir checkFinished — remover fallback genérico, validar match_id |
| `src/components/game/AdminTab.tsx` | Adicionar seção "Mensagem Direta" para enviar notificação a jogador específico |

## Ordem
1. Migração SQL (RLS admin insert)
2. Corrigir auto-simulação no Index.tsx
3. Adicionar mensagem direta no AdminTab

