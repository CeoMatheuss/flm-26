

# Plano: Separar Fisio, Base e CT em abas principais distintas

## Contexto
Atualmente as 3 áreas (Fisioterapia, Categorias de Base, Centro de Treinamento) estão unificadas dentro do `InfraHubTab` como sub-tabs. O usuário quer cada uma como **aba principal separada** no menu lateral.

## Mudanças

### 1. `src/components/game/GameMenu.tsx`
Substituir a entrada única **"Infraestrutura"** por **3 entradas separadas** no menu lateral:
- 🏥 **Fisioterapia** (`physio`)
- 🎓 **Categorias de Base** (`youth`)
- 🏋️ **Centro de Treinamento** (`ct`)

Manter a aba **"Treinos"** separada (sessão diária de execução).

### 2. `src/components/game/GameTabRouter.tsx`
- Remover roteamento para `infra` (InfraHubTab)
- Adicionar 3 rotas distintas:
  - `physio` → renderiza `InfrastructureTab` direto (já existe — só Fisio)
  - `youth` → renderiza `YouthAcademyTab` direto (com todos props já existentes)
  - `ct` → novo componente compacto `TrainingCenterTab` ou inline com o Card de upgrade do CT (extraído do `InfraHubTab` atual)

### 3. Novo componente `src/components/game/TrainingCenterTab.tsx`
Extrair o bloco "Centro de Treinamento" que está hoje dentro do `InfraHubTab` (Card com Progress, eficiência, botão de upgrade) para um componente standalone que recebe:
- `infrastructure`, `budget`, `onUpgradeFacility`
- Usa `useLiveMatchGuard` para bloquear upgrade durante partida ao vivo
- Mantém toda lógica visual atual (níveis, +%/sem, próximo nível)

### 4. `src/components/game/InfraHubTab.tsx`
- **Deletar** (não é mais usado) — ou manter só como wrapper deprecated importando os 3 separados, caso algum deep-link antigo aponte para `infra`. Decisão: **deletar** e mapear redirect `infra` → `physio` no router como fallback.

### 5. Navegação / deep-links
- Tutorial e SeasonStartWidget que apontavam para `infra` → atualizar para `physio` (default) ou aba específica conforme o passo.
- `GameTabRouter` adiciona fallback: se tab antiga `infra` chegar, redireciona para `physio`.

## Resultado final no menu lateral
```
Dashboard
Elenco
Táticas
Treinos              ← execução diária
Fisioterapia         ← NOVO (separada)
Categorias de Base   ← NOVO (separada)
Centro de Treinamento ← NOVO (separada)
Estádio
Finanças
... (resto)
```

## Validação
- ✅ Menu lateral mostra 3 entradas distintas com seus ícones próprios
- ✅ Cada aba abre direto seu conteúdo, sem sub-tabs
- ✅ Bloqueio de partida ao vivo continua ativo nos 3
- ✅ Deep-link antigo `infra` redireciona automaticamente para `physio`
- ✅ Aba "Treinos" (sessão diária) permanece intocada e separada

## Anti-bug
- ✅ Props já existem em `GameTabRouter` (passados antes para `InfraHubTab`) — só redistribuir para os 3 componentes
- ✅ `TrainingCenterTab` reutiliza exatamente o mesmo Card do `InfraHubTab` atual — zero regressão visual
- ✅ Nenhuma migração de dados — só reorganização de UI

