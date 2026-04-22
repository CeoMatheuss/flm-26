

# Plano: Correções de Substituição + Onboarding com elenco pré-escalado

## 1. Banner de substituição não fecha em 5s
**Bug**: `SubstitutionBanner` recebe `onDone={() => setActiveBanner(null)}` recriado a cada render do `MatchPage`. O `useEffect([onDone])` reinicia o `setTimeout` infinitamente porque o componente pai re-renderiza a cada minuto/tick — o timer nunca chega aos 5s.

**Fix em `src/pages/MatchPage.tsx`**:
- Remover `onDone` da lista de dependências do `useEffect` dentro do `SubstitutionBanner` (usar `[]` para rodar uma única vez ao montar).
- Trocar `setTimeout` por uma referência estável, garantindo que o banner desapareça exatamente 5s após aparecer.

## 2. Reduzir substituições para 3 paradas (3 subs no total)
**Em `src/pages/MatchPage.tsx`**:
- Alterar `const maxSubs = 5` → `const maxSubs = 3`.
- Manter `maxWindows = 3` (uma sub por janela, alinhado com "3 paradas").
- Atualizar mensagens visíveis (badges "Subs X/3", textos de bloqueio) — já são dinâmicas via `maxSubs`, então mudam automaticamente.

## 3. Pré-escalação automática ao criar conta
Hoje `generateInitialSquad()` cria 20 jogadores mas nenhum é marcado como titular. O usuário precisa abrir Táticas → Sugerir Escalação manualmente.

**Fix em `src/utils/playerGenerator.ts`**:
- Após gerar o elenco em `generateInitialSquad()`, escolher os 11 melhores por OVR respeitando a formação padrão **4-4-2** (1 GOL, 2 ZAG, 2 LAT, 2 VOL, 2 MEI, 2 ATA) e marcar `isStarter: true` neles.
- Marcar os demais como `isStarter: false`.

**Fix em `src/pages/Index.tsx` (`handleClubCreated`)**:
- Após `generateInitialSquad(config.name)`, popular `tactics.startingXI` (ou campo equivalente já consumido pelo MatchPage/TacticsTab) com os IDs dos 11 titulares — garantindo que o "Sugerir Melhor Escalação" não seja necessário no primeiro jogo.

## 4. Limitar geração a no máximo 2 jogadores por posição específica
Hoje o squad inicial gera: 2 GOL, 4 ZAG, 3 LAT, 3 VOL, 4 MEI, 4 ATA = 20 jogadores, com até 4 da mesma posição.

**Fix em `src/utils/playerGenerator.ts`** (e replicar em `ClubProfilePage.tsx`, `MultiplayerTab.tsx`, `TeamViewModal.tsx` que usam o mesmo padrão `posCount`):
- Trocar a distribuição para **no máximo 2 por posição**, gerando 12 jogadores no total:
  - `[['GOL', 2], ['ZAG', 2], ['LAT', 2], ['VOL', 2], ['MEI', 2], ['ATA', 2]]`
- Mantém variedade tática sem inflar elenco com 4 zagueiros idênticos.

## Resumo dos arquivos editados
- `src/utils/playerGenerator.ts` — limite 2 por posição + marcar 11 titulares por OVR.
- `src/pages/MatchPage.tsx` — fix timer do banner + `maxSubs=3`.
- `src/pages/Index.tsx` — popular `startingXI` ao criar clube.
- `src/components/game/ClubProfilePage.tsx`, `MultiplayerTab.tsx`, `TeamViewModal.tsx` — alinhar `posCount` para BOTs também (2 por posição).

## Validação
- Banner de substituição some em 5s reais (verificável durante uma partida).
- Widget de subs mostra "3/3" como limite, bloqueio aparece após 3ª sub.
- Novo clube cai direto na partida com 11 titulares já escolhidos (badge "Titular" nos 11 melhores).
- Aba Elenco mostra 12 jogadores (2 por posição), sem GOL repetido 4x.

