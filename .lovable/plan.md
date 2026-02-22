
# Adicionar Energia e Moral no Dialog de Taticas

## O que sera feito
Adicionar barras visuais de **Energia (Stamina)** e **Moral** do jogador no dialog que abre ao clicar em um jogador na aba de Taticas, logo apos os badges de posicao/overall/idade.

## Mudancas

### Arquivo: `src/components/game/TacticsTab.tsx`

Apos a linha dos badges (posicao, OVR, idade), adicionar dois indicadores visuais:

1. **Energia (stamina)**: barra de progresso com icone de raio, valor percentual, cores condicionais (verde >= 70, amarelo >= 40, vermelho < 40)
2. **Moral**: barra de progresso com icone de coracao, valor percentual, mesmas cores condicionais

Layout: grid de 2 colunas compacto, com label, valor numerico e barra `<Progress>`.

### Detalhes tecnicos
- Os dados `stamina` e `morale` ja existem no tipo `Player` (0-100)
- O componente `Progress` ja esta importado no arquivo
- Nenhuma dependencia nova necessaria
- Nenhuma mudanca de backend necessaria
- Apenas ~15 linhas de codigo adicionadas entre os badges e o bloco de goleiro
