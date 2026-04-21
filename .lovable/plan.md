

# Plano: Criação de Clube em 4 Etapas (Wizard) + CrestBuilder Responsivo

Reformular `ClubCreation.tsx` em um **wizard de 4 passos** com progresso visual, e tornar o `CrestBuilder` muito mais responsivo no PC (layout 3 colunas em desktop) com mais formatos heráldicos gerados por IA.

## Etapa 1 — Boas-vindas + Nome do Clube + País

Card central com:
- **Título de boas-vindas**: "Bem-vindo ao FLM 26!" + logo + subtítulo motivacional ("Vamos construir a história do seu clube")
- Animação suave de entrada
- Campo grande **Nome do Clube** (h-12, fonte maior)
- Seletor de **País** (mantém lógica atual de `country_status` + bloqueio + bônus)
- Botão **"Continuar →"** (desabilitado se nome vazio)
- Indicador de progresso no topo: `● ○ ○ ○` (Etapa 1 de 4)

## Etapa 2 — Nome do Estádio + Dicas Rotativas

Layout split:
- **Esquerda**: Campo grande "Nome do Estádio" + sugestões clicáveis ("Arena do Dragão", "Estádio Municipal", "Templo do Futebol", "Coliseu", "Fortaleza")
- **Direita**: Card de **Dicas Rotativas** que muda a cada 5s, com ícone + título + texto curto:
  - 💡 *"Treine seus jogadores diariamente para evoluir o OVR"*
  - 🏟️ *"Suba o nível do estádio para aumentar a renda de bilheteria"*
  - 💰 *"Patrocínios rendem mais conforme sua reputação cresce"*
  - 🎯 *"Vença campeonatos para subir de divisão e ganhar prêmios"*
  - 👥 *"Olheiros revelam o potencial dos jovens da base"*
  - 🛡️ *"Ajuste a tática antes de cada partida importante"*
  - ⚽ *"6 dicas no total, com fade transition entre elas"*
- Botões **← Voltar** / **Continuar →**

## Etapa 3 — Criação do Escudo (CrestBuilder reformulado)

Tela cheia/larga (`max-w-5xl`) com o `CrestBuilder` redesenhado em **layout responsivo de 3 colunas no desktop**:

```
┌──────────────────────────────────────────────────────────┐
│ [PREVIEW + Formato]  │  [Modelos/Animais/Símbolos]  │ [Cores] │
│       260px          │           1fr                │  220px  │
└──────────────────────────────────────────────────────────┘
```

- **Mobile** (`<md`): empilha (preview em cima, abas embaixo)
- **Tablet** (`md`): 2 colunas `[260px_1fr]`
- **Desktop** (`lg+`): 3 colunas `[280px_1fr_240px]` — coluna de cores fica fixa à direita, sem precisar trocar de aba
- Reduz tabs para 2: `Modelos` (presets/animais/símbolos) e `Divisão` (patterns) — cores migram para coluna fixa no desktop, viram aba no mobile
- Grids dos catálogos: `grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
- ScrollArea altura `h-[420px] lg:h-[480px]` no desktop (muito mais espaço vertical)
- Adicionar opção de **Upload de Logo Personalizado** dentro desta etapa
- Botões **← Voltar** / **Continuar →**

### Novos formatos de escudo via IA

Adicionar **8 novos formatos heráldicos** ao `ShieldCrest.tsx` (`shieldShapes`):
- `swiss` — escudo suíço (topo plano, base curva)
- `iberian` — peninsular (clássico português/espanhol arredondado)
- `nordic` — alongado vertical com base em U
- `french-modern` — escudo francês moderno (curvas suaves)
- `italian-oval` — oval italiano alongado
- `german-tournament` — entalhado lateral
- `english-heater` — heater clássico inglês
- `victorian` — escudo vitoriano com volutas

Cada um implementado como path SVG dedicado (não gerado por imagem — formas vetoriais nativas, escaláveis e leves). Labels em PT-BR adicionados em `SHAPE_LABELS`.

### Novos presets curados

Expandir `SHIELD_PRESETS` de 10 → 18, aproveitando os novos formatos:
- "Escudo Suíço Vermelho", "Heater Inglês", "Oval Italiano Azul", "Vitoriano Dourado", "Nórdico Branco", "Ibérico Verde", "Francês Royal", "Tournamento Alemão"

## Etapa 4 — Pré-visualização Final + Confirmação

Tela de revisão (substitui a `showConfirmation` atual, melhorada):
- **Card grande central** com:
  - Escudo grande (140px mobile / 200px desktop) com glow no `primaryColor`
  - Nome do clube em destaque
  - País + Estádio
- **Linha de uniformes**: 2 kits lado a lado (titular e reserva) — maiores no desktop (96px)
- **Linha de cores**: 3 swatches grandes com labels
- **Bônus de país** (se houver) destacado
- Botões **← Editar Escudo** / **✓ Criar Clube e Começar Jornada**

## Componente de Wizard (controle de etapas)

Estado novo em `ClubCreation`:
```tsx
const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
```

Indicador de progresso reutilizável no topo (chips numerados clicáveis para voltar):
```
[1 Nome]──[2 Estádio]──[3 Escudo]──[4 Revisão]
   ●         ●            ○           ○
```

Validações por etapa:
- 1 → 2: nome preenchido + país não bloqueado
- 2 → 3: nome do estádio (opcional, usa default)
- 3 → 4: sempre permitido (escudo tem default)
- 4 → criar: chama `onComplete`

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/game/ClubCreation.tsx` | Refatorar em wizard de 4 etapas com `step` state, indicador de progresso no topo, telas dedicadas para cada passo (Boas-vindas/Nome, Estádio+Dicas, Escudo, Revisão), `max-w-5xl` na etapa do escudo, novo componente interno `RotatingTips` para dicas |
| `src/components/game/CrestBuilder.tsx` | Layout 3 colunas no desktop (`lg:grid-cols-[280px_1fr_240px]`), painel fixo de Cores na coluna direita em telas grandes, tabs reduzidas (Modelos + Divisão), ScrollArea maior em desktop, grids responsivos com mais colunas em XL, expandir `SHIELD_PRESETS` para 18 |
| `src/components/game/ShieldCrest.tsx` | Adicionar 8 novos formatos vetoriais (`swiss`, `iberian`, `nordic`, `french-modern`, `italian-oval`, `german-tournament`, `english-heater`, `victorian`) ao `shieldShapes` e respectivos paths SVG |

## Compatibilidade

- `ClubConfig` mantém schema (mesmas chaves enviadas em `onComplete`)
- `ShieldConfig` inalterado — apenas mais valores válidos para `shape`
- Saves antigos continuam renderizando normalmente
- Sem mudanças de DB / Edge Functions / RLS

