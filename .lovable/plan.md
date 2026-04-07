

# Plano: Manutenção Granular por Abas + Correção Crítica de RLS

## Bug Crítico Encontrado

A tabela `system_settings` tem RLS que **só permite admins lerem**. Isso significa que jogadores normais **nunca veem a tela de manutenção** — a query retorna null e `isMaintenanceMode` fica `false`. Além disso, **a manutenção está ativa agora** (`active: true`) mas ninguém está sendo bloqueado.

## O que será feito

### 1 — Corrigir RLS de system_settings
- Adicionar policy SELECT para **todos os autenticados** poderem ler a chave `maintenance_mode`
- Manter INSERT/UPDATE/DELETE restrito a admins

### 2 — Sistema de Manutenção Granular (Admin)
Expandir o `MaintenanceToggle` no `AdminTab.tsx` para permitir:
- **Manutenção Total**: bloqueia TODO o jogo (tela de manutenção)
- **Bloqueio por Aba**: escolher abas específicas para fechar (ex: mercado, treinos, liga, chat, amistosos, leilão)
- Checkboxes para cada aba + botão "Selecionar Todas"

O valor de `maintenance_mode` no banco passa de `{ active: boolean }` para:
```json
{
  "active": false,
  "blocked_tabs": ["market", "training", "auction"]
}
```

### 3 — Bloquear Acesso no Jogo
- **Manutenção total** (`active: true`): mostra `MaintenanceScreen` para não-admins (já existe, só precisa funcionar com a correção do RLS)
- **Abas bloqueadas** (`blocked_tabs`): no `GameTabRouter`, verificar se a aba atual está bloqueada e mostrar mensagem inline "Esta seção está em manutenção" em vez do conteúdo
- Admins sempre têm acesso total

### 4 — UI do Admin
- Redesenhar o card "Controle de Canais" com:
  - Toggle principal de manutenção total
  - Grid de checkboxes para cada aba do jogo
  - Botões "Selecionar Todas" / "Limpar"
  - Badge mostrando quantas abas estão bloqueadas

---

## Migração SQL

```sql
-- Permitir que todos os autenticados leiam system_settings (necessário para checar manutenção)
DROP POLICY "Only admins can view system settings" ON public.system_settings;
CREATE POLICY "Authenticated can read system settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
```

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| Migração SQL | Corrigir RLS de system_settings |
| `src/components/game/AdminTab.tsx` | Redesenhar MaintenanceToggle com controle granular por aba |
| `src/pages/Index.tsx` | Ler `blocked_tabs` do maintenance_mode e passar para GameTabRouter |
| `src/components/game/GameTabRouter.tsx` | Verificar se aba está bloqueada e mostrar mensagem |

## Ordem
1. Migração SQL (corrigir RLS — **urgente**)
2. Redesenhar MaintenanceToggle no Admin
3. Implementar bloqueio por aba no GameTabRouter
4. Conectar tudo no Index.tsx

