

# Plano: Unificar Identidade & Escudo no Perfil do Clube + Desbloqueio Pago de Edição

## Objetivo
Juntar tudo de identidade visual (escudo, nome do clube, nome do estádio) **dentro** do "Perfil do Clube". Edição desses campos sensíveis fica **bloqueada por padrão** e só libera após pagamento de **R$10** (entregue manualmente por você).

## 1. Mesclar `ClubSettingsTab` dentro de `ClubProfileTab`

`ClubProfileTab.tsx` passa a ter 3 seções verticais:

1. **Cabeçalho do clube** (já existe — escudo + nome + badges)
2. **🛡️ Identidade Visual** (NOVO — vindo de `ClubSettingsTab`)
   - Card "Escudo do Clube" com botão "Editar Escudo" (abre o `Sheet` com `CrestBuilder`)
   - Card "Nome do Clube" com botão editar inline
   - Card "Nome do Estádio" com botão editar inline
3. **👤 Dados do Clube** (já existe — presidente, fundação, instagram, bio, lema)

Os botões de editar dos itens da seção 2 ficam **desabilitados** quando `customizationUnlocked = false` e mostram um cadeado 🔒 com tooltip/badge "Desbloqueio R$10".

## 2. Sistema de desbloqueio (gating)

**Estado:** novo campo `customizationUnlocked: boolean` no `clubProfile` (já é JSONB no `game_saves`, sem migração).

**Fluxo:**
- Por padrão `false` para todos
- Aparece um **card de upsell** no topo da seção Identidade Visual:
  > 🔒 **Personalização Premium — R$10**  
  > Desbloqueie para mudar o nome do clube, nome do estádio e escudo quantas vezes quiser.  
  > [Botão: "Desbloquear (R$10)"]
- Clicar no botão abre um **modal de instruções de pagamento** (Pix/manual) com uma mensagem do tipo "Envie R$10 para [chave Pix] e o admin liberará em até 24h"
- Admin libera via **Painel Admin** (nova ação) ou diretamente via DB

**Liberação pelo admin:**
- Em `AdminTab.tsx`, adicionar mini-seção "🔓 Liberar Personalização" com busca por email/usuário e botão "Ativar"
- Edge function `admin-grant-customization` que atualiza `game_saves.club_data.clubProfile.customizationUnlocked = true` para o user_id alvo
- Logado em `admin_logs`

Quando você tiver pagamento real (Stripe/Paddle), o webhook chama a mesma lógica.

## 3. Remover acesso duplicado no menu

Em `GameMenu.tsx`:
- **Remover** o item "Identidade & Escudo" (linha 33)
- Manter apenas "Perfil do Clube" (já tudo lá dentro)

Em `GameTabRouter.tsx`:
- Manter rota `clubsettings` apontando para `ClubProfileTab` (redirect) para não quebrar deep-links existentes, OU remover o `TabsContent value="clubsettings"`. Vou **remover** e adicionar redirect simples no Index se necessário.

## 4. Passar callbacks ao `ClubProfileTab`

`ClubProfileTab` recebe novas props:
- `onRenameClub: (name: string) => void`
- `onRenameStadium: (name: string) => void`
- `onUpdateShield: (cfg: ShieldConfig) => void`
- `customizationUnlocked: boolean`
- `onRequestUnlock: () => void` (abre modal de instruções de pagamento)

E o `clubProfile` ganha o novo campo `customizationUnlocked`.

## 5. Atualização do tipo `ClubProfile`

```ts
// src/types/clubProfile.ts
export interface ClubProfile {
  // ...existing
  customizationUnlocked?: boolean;
}
```

`defaultClubProfile.customizationUnlocked = false`.

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/types/clubProfile.ts` | Adicionar `customizationUnlocked?: boolean` |
| `src/components/game/ClubProfileTab.tsx` | Adicionar seção "Identidade Visual" (escudo + nomes) com gating + card de upsell + Sheet do CrestBuilder |
| `src/components/game/GameMenu.tsx` | Remover item "Identidade & Escudo" |
| `src/components/game/GameTabRouter.tsx` | Remover `<TabsContent value="clubsettings">`; passar novas props ao `ClubProfileTab` |
| `src/components/game/AdminTab.tsx` | Adicionar painel "Liberar Personalização" com busca por email |
| `supabase/functions/admin-grant-customization/index.ts` | NOVA edge function: valida admin, atualiza save do user alvo, registra em `admin_logs` |
| `src/components/game/ClubSettingsTab.tsx` | Marcar como deprecated (manter arquivo mas não usar) ou deletar |

## Compatibilidade

- Schema `game_saves` intacto (campo dentro de JSONB)
- Saves antigos: `customizationUnlocked` undefined = bloqueado (default seguro)
- Deep-link `?tab=clubsettings` redireciona para `clubprofile`

## Sobre o pagamento real

Hoje fica **manual**: usuário paga via Pix → você libera no painel admin. Quando quiser automatizar, conectamos Stripe/Paddle (built-in da Lovable) com webhook chamando a mesma edge function.

