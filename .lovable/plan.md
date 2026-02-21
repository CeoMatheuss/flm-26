

# Valor Automatico no Gerador de Jogadores ADM

## O que muda

Quando voce gerar um jogador no painel ADM, o preco dele vai ser calculado automaticamente usando o mesmo sistema do jogo: baseado nos **atributos**, **idade** e **OVR**. Hoje o preco usa uma formula simples (`OVR x OVR x 100`), que nao reflete o valor real.

## Mudancas

### 1. Edge Function `admin-gift` -- Calcular valor real do jogador

Substituir a formula atual de preco (`ovr * ovr * 100`) pela mesma logica de `getPlayerBaseValue` que ja existe no jogo:
- OVR 85+ = OVR x 80.000
- OVR 75-84 = OVR x 40.000
- OVR 65-74 = OVR x 20.000
- OVR 55-64 = OVR x 10.000
- OVR abaixo = OVR x 5.000

Multiplicador de idade:
- 20 ou menos = 1.5x
- 21-22 = 1.4x
- 23-24 = 1.3x
- 25-27 = 1.2x
- 28-29 = 1.0x
- 30-31 = 0.7x
- 32-33 = 0.4x
- 34+ = 0.2x

O preco retornado na resposta incluira o nome, posicao, idade, OVR e valor calculado.

### 2. Frontend `AdminTab.tsx` -- Mostrar preview do valor e resultado detalhado

- Adicionar uma **previa estimada** do valor abaixo dos campos, atualizada em tempo real conforme o OVR muda (usando idade media de 24 como referencia)
- Remover o campo "Preco Minimo (opcional)" pois o preco sera automatico
- Apos gerar, exibir no toast o valor real calculado que ja vem do servidor

### Detalhes Tecnicos

**Edge Function (`supabase/functions/admin-gift/index.ts`):**
- Linha 164: Substituir `Math.floor(ovr * ovr * 100)` pela funcao de calculo baseada em OVR + idade
- Incluir `playerAge` e `calculatedPrice` na resposta JSON

**Frontend (`src/components/game/AdminTab.tsx`):**
- Linhas 1220-1224: Remover campo `genMinPrice`
- Adicionar calculo local de preview usando `useMemo` baseado no `genOverall`
- Linhas 1247-1248: Exibir mensagem com valor formatado

