

# Plano: Sistema de Simulação Realista com Atributos, Stamina, Momentos e Assistente Técnico

## Escopo
Reescrever o motor de simulação (Edge Function `start-match`) e a interface de partida (`MatchPage.tsx`) para criar uma experiência estratégica e realista, com stamina dinâmica, sistema de momentos, assistente técnico contratável e interface sem abas.

---

## Fase 1 — Motor de Simulação (Edge Function `start-match`)

### 1.1 Sistema de Atributos por Ação
Substituir o uso simplificado de OVR por atributos específicos em cada ação:
- **Passe/Criação**: `passing + vision * 0.5`
- **Desarme**: `defending + marking * 0.5`  
- **Finalização**: `shooting + composure * 0.3`
- **Transição**: `speed + workRate * 0.3`
- **Cabeceio**: `heading + physical * 0.3`
- **Drible**: `dribbling + speed * 0.3`

Jogadores com atributos altos devem se destacar claramente nos eventos gerados.

### 1.2 Sistema de Stamina Progressiva
Cada jogador perde stamina ao longo dos 90 minutos:
- Base: 0.3-0.5% por minuto
- Modificadores: `physical` alto = -30% perda; pressão alta = +40% perda; ritmo rápido = +20%
- Efeitos em 4 faixas:
  - `≥70%`: normal
  - `60-69%`: -5% em todos os atributos efetivos
  - `40-59%`: -15% em atributos + "alerta" do assistente
  - `<40%`: -25% + risco de lesão (5% por minuto nessa faixa)
- Stamina gravada nos eventos como metadata

### 1.3 Sistema de Momentos (Fases de Jogo)
Cada bloco de ~10 minutos calcula uma "fase" baseada em:
- Força tática vs adversário
- Stamina média do time
- Situação do placar (perdendo = mais agressivo)
- Fases: `pressão_home`, `pressão_away`, `equilíbrio`, `domínio_home`, `domínio_away`
- Fase atual influencia probabilidade de eventos (mais chances para quem pressiona)

### 1.4 Tática com Impacto Real
O sistema já tem modificadores táticos. Melhorar para:
- **Ofensivo**: +20% chance de finalização, -10% defesa
- **Defensivo**: -15% chance de gol sofrido, -20% ataque
- **Posse**: +15% posse, passes mais seguros, menos contra-ataques
- **Contra-ataque**: ataques rápidos com `speed + dribbling`, menos posse
- **Pressão alta**: mais desarmes no campo ofensivo, +50% desgaste de stamina

### 1.5 Fator Casa Melhorado
- Mandante: +10% moral efetiva, +5% compostura em momentos decisivos
- Mais eventos de "pressão da torcida" quando jogando em casa
- Torcida reage ao placar (perdendo = mais apoio)

### 1.6 Balanceamento
- Lambda Poisson: teto de 3.0 (máximo ~4-5 gols por time)
- Raramente mais de 6 gols totais
- Times fortes vencem ~65-70% contra fracos, mas nunca 100%

### 1.7 Sistema de Lesão Durante Partida
- Jogadores com stamina <40% têm 5% de chance por minuto de lesão leve
- Lesão remove jogador do jogo (substitui automaticamente se houver banco)
- Alerta do assistente avisa antes

---

## Fase 2 — Sistema de Staff / Assistente Técnico

### 2.1 Tipos de dados
```typescript
interface StaffMember {
  id: string;
  name: string;
  role: 'assistente' | 'preparador_fisico' | 'medico';
  skill: number; // 1-10
  salary: number;
  contract: number;
}
```

### 2.2 Armazenamento
Adicionar campo `staff` ao `club_data` (JSONB) no `game_saves`. Sem migração SQL necessária — é JSONB flexível.

### 2.3 Interface de Staff
Criar aba/seção "Equipe Técnica" (pode ser dentro de `SettingsTab` ou novo componente `StaffTab`) para:
- Contratar/demitir assistente técnico
- Ver staff atual
- Custo: R$50.000-200.000/mês dependendo do skill

### 2.4 Assistente Durante a Partida
Gerar mensagens inteligentes no servidor (como eventos extras no array):
- Tipo `assistant_tip` com prioridade
- Exemplos: "Jogador X está com 58% de stamina", "Jogador Y tem cartão amarelo", "Considere substituir Jogador Z"
- Frequência: máximo 1 dica a cada 5 minutos de jogo
- Só aparece se o time tiver assistente contratado
- Qualidade das dicas depende do `skill` do assistente

---

## Fase 3 — Interface da Partida (MatchPage.tsx)

### 3.1 Remover Abas, Usar Botões Flutuantes
Substituir `<Tabs>` por 3 botões fixos na tela:
- 🎯 **Tática** → abre painel overlay (Sheet/Drawer)
- 👥 **Escalação** → abre painel overlay
- 📊 **Estatísticas** → abre painel overlay
- Jogo nunca pausa ao abrir painéis

### 3.2 Painel do Assistente Técnico
- Seção fixa abaixo do placar (se tiver assistente contratado)
- Mostra última dica com ícone de "assistente"
- Dicas aparecem com animação sutil

### 3.3 Barras de Stamina ao Vivo
- Nos painéis de escalação e substituição, mostrar stamina atualizada em tempo real
- Cores: verde (≥70%), amarelo (40-69%), vermelho (<40%)

### 3.4 Indicador de Momento
- Badge entre o placar e a barra de posse mostrando a fase atual:
  - "🔥 Pressão do Mandante" / "⚖️ Equilíbrio" / "🛡️ Domínio Defensivo"

---

## Arquivos Modificados

| Arquivo | Ação |
|---|---|
| `supabase/functions/start-match/index.ts` | Reescrever motor: atributos, stamina, momentos, dicas do assistente |
| `src/pages/MatchPage.tsx` | Remover abas, usar botões + overlay; painel do assistente; indicador de momento |
| `src/types/game.ts` | Adicionar `StaffMember` interface |
| `src/match/useMatchSimulation.ts` | Adicionar stamina tracking + momento ao `MatchState` |
| `src/components/game/StaffTab.tsx` | NOVO — gestão de equipe técnica |
| `src/components/game/GameTabRouter.tsx` | Adicionar rota para StaffTab |

---

## Ordem de Implementação

1. Atualizar tipos (`StaffMember` em `game.ts`)
2. Reescrever `start-match` Edge Function (motor completo)
3. Atualizar `useMatchSimulation.ts` (novos campos no state)
4. Reescrever `MatchPage.tsx` (interface sem abas + assistente + momentos)
5. Criar `StaffTab.tsx` (contratação de staff)
6. Integrar StaffTab no GameTabRouter

