---
name: Admin Panel Isolation
description: Painel admin separado por responsabilidade — Financeiro, Personalização, Usuários, Sistema isolados, sem lógica compartilhada
type: feature
---

Sidebar do AdminLayout tem 8 categorias distintas:
- Ligas, Copas, Clubes, Players, **Financeiro**, **Personalização**, Sistema, Simulação.

Cada função em arquivo próprio:
- `src/components/game/admin/FinancePanel.tsx` — único lugar que ajusta saldo. Chama RPC `admin_add_money_to_club` (SECURITY DEFINER, lock FOR UPDATE, limite ±R$1B, log em admin_logs, notificação ao jogador). Trava `busy` impede dupla execução.
- `src/components/game/admin/CustomizationPanel.tsx` — único lugar que libera/bloqueia personalização. Chama edge function `admin-grant-customization`. Trava `busy` impede dupla execução.

A edge function `admin-gift` não trata mais `add_money` (retorna 410 Gone). Isso elimina a fonte do erro "tipo de presente inválido" aparecendo durante operações financeiras.

Proibido: misturar lógica de Financeiro/Personalização com Premium/Gift/Ban no mesmo card ou função.
