

# Plano: Widgets da Partida no Estilo "Cards de Estilo de Jogo" + Tudo em PT-BR

## Referência Visual (da imagem enviada)

Os cards mostrados na imagem (Equilibrada, Contra-ataque, Marcação Pressão, Tiki-Taka, Bola na Área, etc.) têm este padrão:
- Borda fina arredondada (`rounded-xl border border-border`)
- Ícone colorido grande no canto **superior esquerdo** (não ao lado do texto)
- Título em **negrito** logo abaixo do ícone
- Selecionado: **borda destacada** + leve glow (ex: ciano para Tiki-Taka ativo)
- Layout limpo, sem gradient pesado de fundo

## Mudanças nos 4 Widgets da Partida

**Onde**: `src/pages/MatchPage.tsx` (linhas 707-887)

### Novo layout de cada card

```
┌────────────────────┐
│ 🟢 [ícone grande]  │  ← ícone no topo, com bg colorido suave
│                    │
│ TÁTICA             │  ← título uppercase, fonte média
│ 4-4-2              │  ← valor principal grande, font-black
│ ofensivo · alta    │  ← subtexto em muted
└────────────────────┘
```

- `flex flex-col` (vertical) em vez de `flex items-center` (horizontal)
- Ícone container: `w-11 h-11 rounded-lg` com `bg-{cor}-500/15` no canto superior esquerdo
- Padding: `p-3 sm:p-4`
- Bordas: `border border-{cor}-500/30` (mais sutil, tipo a imagem); ao ativo/com queue, `border-{cor}-500/70` + ring
- Sem gradient pesado — fundo `bg-card/40` com sutil `from-{cor}-500/5 to-transparent`
- Hover: `hover:border-{cor}-500/60 hover:bg-card/60` (sem scale exagerado)

### Renomeações para PT-BR

| Atual | Novo |
|---|---|
| `Tática` | **Tática** (mantém) |
| `Time` | **Elenco** |
| `subs` | **trocas** |
| `Stats` | **Estatísticas** |
| `posse` | **posse** (mantém) |
| `Coach` | **Técnico** |
| `dicas` | **alertas** |
| `Aguardando análise...` | **Aguardando análise...** (mantém) |
| Header da Sheet `Stats` → **Estatísticas** | |
| Header `📋 Assistente Técnico` → **🎙️ Auxiliar Técnico** | |
| Header `Ajustes Táticos` → **Ajustes Táticos** (mantém) | |
| Header `Escalação & Substituições` → **Escalação & Trocas** | |
| Toast `Substituições Bloqueadas` → **Trocas Bloqueadas** | |
| `Elenco descansado` → **Elenco descansado** (mantém) | |

### Indicadores especiais (mantém comportamento)

- 🔒 vermelho no Elenco quando bloqueado
- Badge laranja com contador de fila no Elenco
- Badge âmbar pulsante no Técnico com nº de alertas
- Card desativado (opacidade reduzida) quando sem assistente

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/MatchPage.tsx` | Reescrever 4 widgets (linhas 707-887) com layout vertical estilo "card de estilo de jogo"; renomear textos para PT-BR; atualizar headers das Sheets |

## Não muda

- Lógica de validação de substituições (`validateSubAllowed`)
- Sheet content (LiveTacticsView, ManagerSubstitutionView, StatsView)
- Cores temáticas (emerald/blue/yellow/amber)
- Dados exibidos em cada widget (formação, subs restantes, posse, dicas)

