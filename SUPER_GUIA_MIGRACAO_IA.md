# 🚀 SUPER GUIA DE MIGRAÇÃO E INDEPENDÊNCIA - FLM V4.0

Este guia foi gerado para permitir a migração total do sistema **Football Life Manager** para qualquer ambiente Supabase independente, garantindo autonomia fora do Lovable Cloud.

---

## 🤖 PROMPT PARA IA (Copiar Banco de Dados)

**Copie e cole o texto abaixo em uma nova IA (como ChatGPT ou Claude) para que ela entenda como reconstruir seu banco:**

> "Atue como um Especialista em Banco de Dados Supabase/PostgreSQL. Recebi um dump de um sistema de gerenciamento de futebol (FLM). Preciso que você analise o schema SQL fornecido e me ajude a:
> 1. Criar todas as tabelas no meu novo projeto Supabase.
> 2. Configurar as políticas de RLS (Row Level Security) exatamente como descritas.
> 3. Implementar as triggers de atualização de timestamps e lógica de negócio.
> 4. Criar as Enums e Funções auxiliares (como `has_role`).
> 
> O sistema é composto por módulos de: Ligas Mundiais, Gestão de Clubes, Mercado de Transferências, Sistema de Escoteiros (Scouting) e Infraestrutura de Estádio.
> 
> Aqui está o Schema Consolidade: [COLE O CONTEÚDO DO ARQUIVO final_schema.sql AQUI]"

---

## 📂 ESTRUTURA DO SISTEMA (Explicação por Abas)

### 1. 🏆 Liga (LeagueTab)
- **O que faz:** Gerencia a tabela de classificação, calendário de jogos e estatísticas de jogadores.
- **Tabelas Relacionadas:** `world_leagues`, `world_league_table`, `world_matches`, `player_competition_stats`.
- **Lógica:** Os jogos são simulados via Edge Function ou Worker. Os pontos são somados na tabela após cada partida `finished`.

### 2. 🛡️ Elenco (SquadTab / TacticsTab)
- **O que faz:** Gestão de jogadores, contratos e definições táticas.
- **Tabelas Relacionadas:** `players`, `clubs`, `tactics`.
- **Lógica:** O Overall dinâmico é calculado com base na posição e atributos. A fadiga (stamina) diminui após jogos e recupera diariamente.

### 3. 💸 Finanças (FinanceTab)
- **O que faz:** Controle de caixa, balanço mensal e fluxo de transações.
- **Tabelas Relacionadas:** `finance_entries`, `sponsors`.
- **Lógica:** Processa receitas de patrocínio e bilheteria, e desconta salários e manutenção de infraestrutura.

### 4. 🏟️ Estádio (StadiumTab)
- **O que faz:** Gestão de infraestrutura, camarotes VIP e preço de ingressos.
- **Tabelas Relacionadas:** `infrastructure`, `stadium_ops`.
- **Lógica:** A ocupação do estádio depende da reputação do clube, preço do ingresso e sequência de resultados (winStreak).

### 5. 🎓 Categorias de Base (YouthAcademyTab)
- **O que faz:** Revelação de novos jogadores.
- **Tabelas Relacionadas:** `youth_prospects`.
- **Lógica:** Jogadores são gerados com potencial oculto que só é revelado 100% por olheiros de alto nível.

---

## 🛠️ COMO EXPORTAR SEUS DADOS ATUAIS

1. Vá para a aba **ADMIN** no jogo.
2. Localize o painel **Exportar Dados**.
3. Clique em cada tabela (Profiles, Clubs, Players, etc) para baixar o CSV.
4. No seu novo Supabase, utilize a ferramenta **Import via CSV** para subir os dados nas tabelas correspondentes que você criou usando o Schema acima.

---

## ⚠️ NOTAS DE SEGURANÇA E INFRAESTRUTURA

- **Edge Functions:** Você precisará implantar as funções da pasta `supabase/functions` no seu novo projeto usando o Supabase CLI: `supabase functions deploy [nome-da-funcao]`.
- **Storage:** Crie os buckets `shields`, `players` e `stadiums` no Supabase Storage e defina-os como Públicos.
- **Realtime:** Habilite o Realtime nas tabelas `world_matches` e `global_chat_messages` para que as atualizações apareçam sem recarregar a página.

---
**FIM DO GUIA DE INDEPENDÊNCIA**
