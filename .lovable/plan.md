
# Plano: Corrigir Substituições e Lances 2D

## Bugs Encontrados

### Bug 1 — Substituições não funcionam (posições em inglês)
O `getPositionGroup` no `MatchPage.tsx` (linha 417-421) verifica posições em **inglês** (`GK`, `CB`, `LB`, `RB`, etc.), mas o jogo usa posições em **português** (`GOL`, `ZAG`, `LAT`, `VOL`, `MEI`, `ATA`). Resultado: o badge "Mesma posição" nunca aparece e a lógica de correspondência é inútil.

**Correção**: Atualizar `getPositionGroup` para usar as posições do jogo:
```
GOL → gk
ZAG → def
LAT → def
VOL → mid
MEI → mid
ATA → atk
```

### Bug 2 — Lances 2D não aparecem
Dois problemas:

1. **`lastHighlightMinute` bloqueia eventos no mesmo minuto**: Se dois eventos de highlight ocorrem no mesmo minuto (ex: gol + comemoração), só o primeiro mostra. A verificação `latestEvent.minute !== lastHighlightMinute.current` impede o segundo.

2. **`latestEvent` muda referência a cada tick (300ms)** mas o `useEffect` verifica `.minute` que não muda — então quando o minuto avança e um evento de highlight aparece, ele funciona. MAS: o `onComplete` dispara `setTimeout(() => setActiveHighlight(null), 1500)` — isso pode conflitar com o próximo highlight. Se um novo highlight chega antes dos 1500ms, o timeout anterior limpa o novo highlight.

**Correção**:
- Usar um **ID único por evento** (combinar `minute + type + index`) em vez de apenas `minute` para tracking
- Limpar o timeout anterior quando um novo highlight chega
- Garantir que o `activeHighlight` não é limpo pelo timeout de um highlight anterior

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `src/pages/MatchPage.tsx` | Corrigir `getPositionGroup` para posições PT-BR; Corrigir lógica de highlight com tracking por ID e cleanup de timeouts |

## Detalhes Técnicos

### getPositionGroup corrigido:
```typescript
const getPositionGroup = (pos: string) => {
  if (['GOL'].includes(pos)) return 'gk';
  if (['ZAG', 'LAT'].includes(pos)) return 'def';
  if (['VOL', 'MEI'].includes(pos)) return 'mid';
  if (['ATA'].includes(pos)) return 'atk';
  return 'atk'; // fallback
};
```

### Highlight tracking corrigido:
- Trocar `lastHighlightMinute` (number) por `lastHighlightId` (string: `${minute}-${type}`)
- Adicionar `useRef` para o timeout de limpeza do highlight
- Limpar timeout anterior ao criar novo highlight
