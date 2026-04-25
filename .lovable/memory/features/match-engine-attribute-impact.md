---
name: Match Engine Attribute Impact
description: Pesos reforçados de atributos no motor de simulação start-match — finalização/defesa/passe pesam mais no resultado
type: feature
---
- Em `supabase/functions/start-match/index.ts` (linhas ~593-616) os multiplicadores foram reforçados:
  - `(homeAttackVsDefense - 1) * 0.6` → `* 1.1` (atributos quase 2× mais influentes)
  - `(strengthDiff / 100) * 1.5` → `* 2.2` (diferença de OVR mais decisiva no ataque do mandante)
  - `(strengthDiff / 100) * 1.2` → `* 1.8` (mesmo para o visitante)
  - Range do clamp expandido de `0.2..3.0` para `0.1..4.0` (placares mais elásticos)
- Resultado: times com finalização/defesa/passe/velocidade superiores marcam mais e sofrem menos.
- Cron `close-expired-auctions-weekly` roda toda segunda 17:00 BRT (`0 20 * * 0` UTC) chamando `public.close_expired_auctions()`.
