

# Plano: Finalizar Integração do Crest Builder Pro

Concluir a integração do novo editor de escudos no app inteiro, garantindo que o `shieldConfig` propague para todos os locais que renderizam o escudo do clube.

## 1. Botão "Editar Escudo" em ClubSettingsTab

**Arquivo**: `src/components/game/ClubSettingsTab.tsx`

- Adicionar nova `Card` "🎨 Escudo do Clube":
  - Mostra preview pequeno (60×60) do escudo atual
  - Botão "Editar Escudo" abre `Sheet` (lateral em desktop, bottom em mobile) com `<CrestBuilder />` em tela cheia
  - Botões "Cancelar" / "Salvar" no rodapé do sheet
- Estender props do componente: `shieldConfig` + `onUpdateShield(config)` para persistir no club state.

## 2. Propagar `shieldConfig` ao ShieldCrest em Todo o App

**Arquivos** que renderizam `<ShieldCrest>` e precisam priorizar `shieldConfig` sobre os campos legados:

- `src/components/game/GameHeader.tsx` (header principal)
- `src/components/game/GameNavBar.tsx` (nav bar inferior)
- `src/components/game/DashboardTab.tsx` (placar/destaque)
- `src/components/game/ClubProfilePage.tsx` (perfil público)
- `src/components/game/ClubProfileTab.tsx`
- `src/components/game/MatchDashboardCard.tsx`
- `src/components/game/SeasonStartWidget.tsx`
- `src/components/game/LeagueTab.tsx` (tabela de classificação)
- `src/components/game/RankingTab.tsx`
- `src/components/game/ActiveLeaguesPanel.tsx`
- `src/components/game/CupBracketView.tsx`
- `src/pages/MatchPage.tsx`

Criar **helper** `src/components/game/shieldHelpers.ts`:
```typescript
export function shieldPropsFromClub(club: Club | ClubConfig) {
  if (club.shieldConfig) {
    // spread completo (novas props + transformações + camadas extras)
    return { ...club.shieldConfig };
  }
  // fallback legado
  return {
    shape: club.shieldShape,
    pattern: club.shieldPattern,
    icon: club.shieldIcon,
    primaryColor: club.primaryColor,
    secondaryColor: club.secondaryColor,
  };
}
```

Substituir os usos manuais por `<ShieldCrest {...shieldPropsFromClub(club)} size={N} />`.

## 3. Sincronização com Multiplayer

**Arquivo**: `src/hooks/useMultiplayer.ts` (e funções de sync existentes)

- Incluir `shieldConfig` no objeto `club_metadata` enviado ao auto-sync de `league_squads` / `league_members`.
- Ao receber dados de outros clubes (perfil público, ranking, liga), ler `shieldConfig` se presente.

## 4. Bots e Clubes Sem Configuração

- Bots gerados nas Edge Functions (`get-all-clubs`, `process-tournament-matches`) continuam sem `shieldConfig` → o helper acima cai automaticamente no fallback legado, sem alterar Edge Functions.
- Confirmar `ShieldCrest` aceita props ausentes com defaults seguros (já implementado).

## 5. Persistência

Já feito (`shieldConfig` está em `club_data` JSONB do `game_saves`). Esta etapa só garante que o `setClub({ ...club, shieldConfig })` chamado pelo Sheet dispara o auto-save reativo (debounce 2s) — verificar `useClubState`.

## Arquivos Modificados / Criados

| Arquivo | Mudança |
|---|---|
| `src/components/game/shieldHelpers.ts` | **NOVO** — helper `shieldPropsFromClub()` |
| `src/components/game/ClubSettingsTab.tsx` | Card de escudo + Sheet com CrestBuilder |
| `src/components/game/GameHeader.tsx` | Usa helper |
| `src/components/game/GameNavBar.tsx` | Usa helper |
| `src/components/game/DashboardTab.tsx` | Usa helper |
| `src/components/game/ClubProfilePage.tsx` | Usa helper (lê do club fetched) |
| `src/components/game/ClubProfileTab.tsx` | Usa helper |
| `src/components/game/MatchDashboardCard.tsx` | Usa helper |
| `src/components/game/SeasonStartWidget.tsx` | Usa helper |
| `src/components/game/LeagueTab.tsx` | Usa helper nas linhas da tabela |
| `src/components/game/RankingTab.tsx` | Usa helper |
| `src/components/game/ActiveLeaguesPanel.tsx` | Usa helper |
| `src/components/game/CupBracketView.tsx` | Usa helper |
| `src/pages/MatchPage.tsx` | Usa helper para escudos das duas equipes |
| `src/hooks/useMultiplayer.ts` | Inclui `shieldConfig` no payload de sync |

## Compatibilidade

- Saves antigos sem `shieldConfig` → helper retorna fallback (`shieldShape`/`shieldPattern`/`shieldIcon`) sem quebrar.
- Bots/Edge Functions: sem mudança — campos legados continuam funcionando.
- Sem migração de banco (tudo persiste no JSONB existente).

