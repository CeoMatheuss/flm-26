

# Plano: Correção OTP, Widget Admin com IA, Tutorial Bloqueável, Missões e Melhorias Gerais

## Diagnóstico

1. **OTP não chega (só link "Verify Email")**: O `signUp` do Supabase envia um email com link de verificação por padrão, não um código OTP. O código só tenta `verifyOtp` mas o email não contém OTP. Solução: habilitar auto-confirm e usar o fluxo de OTP corretamente, OU mudar para fluxo baseado em link (redirect).

2. **Tutorial não bloqueia após uso**: Atualmente usa `localStorage` implicitamente via `isNewClub`, mas pode ser reaberto pelo menu. Precisa salvar no banco que o tutorial foi completado.

3. **Logs tab → Widget de Anúncios com IA**: Substituir a aba de Logs por uma página de criação de widgets/anúncios com geração de imagem por IA.

4. **Missões para players**: Sistema de missões com recompensas (gols, vitórias, etc).

5. **IDs → Nomes de time/dono**: Em todo o admin, substituir UUIDs por nomes legíveis.

---

## O que será feito

### 1 — Corrigir Fluxo de Email/OTP
- O problema: `supabase.auth.signUp()` envia email com link "Verify Email", não um código OTP de 6 dígitos
- **Solução**: Mudar o fluxo para usar o link de verificação (redirect para o app) em vez de OTP manual, OU configurar o auth para enviar OTP via `cloud--configure_auth`
- Redesenhar a tela de verificação: ao invés de campo OTP, mostrar mensagem "Verifique seu email e clique no link" com botão de reenviar
- Adicionar mensagem de boas-vindas estilizada ao confirmar

### 2 — Substituir Aba Logs por Widget de Anúncios com IA
- Remover `AdminLogsPanel` da aba "Logs"
- Criar nova aba "Anúncios" com:
  - Editor de texto para título e corpo do anúncio
  - Botão "Gerar Imagem com IA" que usa o modelo `google/gemini-3-pro-image-preview` para criar imagem baseada no texto
  - Preview do anúncio antes de publicar
  - Publicação que envia para todos os players via tabela `game_updates`
- Incluir opção de bloquear canais (manutenção parcial)

### 3 — Tutorial Bloqueável + Melhorado
- Salvar `tutorial_completed` na tabela `profiles` (migração SQL)
- Ao completar, marcar no banco — não pode ser reaberto
- Adicionar mais informações em cada step do tutorial
- Ensinar o player a navegar mostrando screenshots/descrições de cada aba
- Remover botão "Pular" após primeiro uso (ou manter mas marcar como incompleto)

### 4 — Sistema de Missões
- Criar tabela `player_missions` com missões predefinidas
- Criar tabela `mission_progress` para tracking por user
- Missões exemplo: "Marque 10 gols", "Vença 5 partidas", "Contrate 3 jogadores", "Complete o tutorial"
- Recompensas em dinheiro do jogo
- Widget no Dashboard mostrando missões ativas

### 5 — IDs → Nomes (Admin)
- Em toda a AdminTab, onde mostra UUID, fazer lookup na tabela `profiles` para mostrar `display_name` e nome do clube (de `game_saves`)
- Nos inputs de ban/gift, permitir buscar por nome em vez de colar UUID

### 6 — Manutenção no Admin (bloquear canais)
- No widget de anúncios, opção de bloquear/desbloquear features específicas
- Atualizar `MaintenanceScreen` com design mais informativo

### 7 — Abas Admin com scroll lateral melhorado
- Manter ScrollArea horizontal mas com indicador visual de setas funcionais

---

## Migração SQL necessária

```text
- profiles: adicionar coluna tutorial_completed (boolean default false)
- Nova tabela: player_missions (id, title, description, target_value, reward_amount, category)
- Nova tabela: mission_progress (id, user_id, mission_id, current_value, completed, completed_at)
```

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| Migração SQL | Adicionar tutorial_completed, player_missions, mission_progress |
| `src/pages/Auth.tsx` | Mudar OTP para fluxo de link, redesign verificação |
| `src/components/game/AdminTab.tsx` | Substituir Logs por Anúncios IA, UUIDs por nomes, scroll melhorado |
| `src/components/game/TutorialModal.tsx` | Bloquear após uso, mais info, missões integradas |
| `src/components/game/DashboardTab.tsx` | Widget de missões |
| `src/components/game/MaintenanceScreen.tsx` | Atualizar design |
| `src/pages/Index.tsx` | Conectar tutorial_completed ao banco |
| `supabase/functions/generate-announcement-image/index.ts` | Nova edge function para gerar imagem com IA |

## Ordem de Execução
1. Migração SQL
2. Corrigir fluxo de verificação de email
3. Substituir aba Logs por Widget Anúncios com IA
4. Tutorial bloqueável + melhorado
5. Sistema de missões
6. IDs → Nomes no Admin
7. Melhorias de manutenção e scroll

