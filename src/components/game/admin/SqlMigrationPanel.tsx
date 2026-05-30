import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Copy, Check, Loader2, AlertCircle, FileText, Brain, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SqlMigrationPanel() {
  const [loading, setLoading] = useState(false);
  const [sql, setSql] = useState('');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    const hardcodedSql = `
-- FLM FULL SCHEMA MIGRATION - LOVABLE CLOUD
-- Gerado em 30/05/2026

-- 1. TABELA PROFILES (Perfis de usuários)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 2. TABELA GAME_SAVES (Dados de salvamento de jogo)
CREATE TABLE IF NOT EXISTS public.game_saves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  club_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 3. TABELA CLUBS (Clubes ativos no sistema)
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  country text NOT NULL,
  logo text,
  strength integer DEFAULT 60,
  is_bot boolean DEFAULT false,
  bankrupt_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 4. TABELA WORLD_TEAMS (Times do mundo real/bots)
CREATE TABLE IF NOT EXISTS public.world_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  country text NOT NULL,
  league_id uuid,
  strength integer DEFAULT 60,
  is_bot boolean DEFAULT true,
  logo text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 5. TABELA PLAYERS (Jogadores do sistema)
CREATE TABLE IF NOT EXISTS public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  club_id uuid,
  name text NOT NULL,
  position text NOT NULL,
  overall integer NOT NULL,
  age integer NOT NULL,
  nationality text,
  market_value bigint DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 6. TABELA GLOBAL_CHAT_MESSAGES (Logs de chat)
CREATE TABLE IF NOT EXISTS public.global_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 7. TABELA PLAYER_AUCTIONS (Sistema de leilões)
CREATE TABLE IF NOT EXISTS public.player_auctions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  min_price bigint NOT NULL,
  current_bid bigint DEFAULT 0,
  current_bidder_id uuid,
  status text DEFAULT 'active'::text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 8. TABELA USER_ROLES (Níveis de acesso - Admin/User)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- HABILITAR RLS (Segurança em Nível de Linha)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- PERMISSÕES (GRANTs)
GRANT ALL ON public.profiles TO authenticated, service_role;
GRANT ALL ON public.game_saves TO authenticated, service_role;
GRANT ALL ON public.clubs TO authenticated, service_role;
GRANT ALL ON public.world_teams TO authenticated, service_role;
GRANT ALL ON public.players TO authenticated, service_role;
GRANT ALL ON public.global_chat_messages TO authenticated, service_role;
GRANT ALL ON public.player_auctions TO authenticated, service_role;
GRANT ALL ON public.user_roles TO authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- POLÍTICAS DE ACESSO BÁSICAS (EXEMPLOS)
CREATE POLICY "Users can view their own profiles" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profiles" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
`;

    const aiPrompt = `### MANUAL DE MIGRAÇÃO DO BANCO DE DADOS (PARA IA)

Atue como um Especialista em Banco de Dados e Supabase. Sua missão é reconstruir e analisar o banco de dados do sistema Football Legend Manager (FLM).

#### 1. ESTRUTURA DO SCHEMA (SQL)
Abaixo está o código SQL para criar as tabelas fundamentais. Execute este código no Editor SQL do seu painel Supabase:

\`\`\`sql
${hardcodedSql}
\`\`\`

#### 2. EXPLICAÇÃO DAS ENTIDADES
- **Profiles:** Armazena dados públicos dos usuários (nome, avatar). Chave estrangeira ligada ao Auth do Supabase.
- **Game Saves:** Contém o estado serializado (JSONB) do progresso do jogo de cada usuário.
- **Clubs & World Teams:** 'Clubs' são times gerenciados por humanos; 'World Teams' são times do sistema ou bots.
- **Players:** A alma do jogo. Contém estatísticas (OVR), posições e valores de mercado.
- **Player Auctions:** Gerencia o mercado de transferências dinâmico com lances em tempo real.
- **User Roles:** Controla quem tem acesso ao painel administrativo.

#### 3. PRÓXIMOS PASSOS PARA A IA
Após criar as tabelas, você deve:
1. Configurar as funções de banco de dados para cálculos de força de time.
2. Implementar triggers para atualizar o 'updated_at' automaticamente.
3. Configurar webhooks para monitorar novos registros na tabela de leilões.

Deseja que eu gere os Triggers ou as Funções de cálculo de mercado agora?`;

    setSql(hardcodedSql);
    setPrompt(aiPrompt);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('SQL copiado para a área de transferência!');
  };

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
    toast.success('Prompt para IA copiado com sucesso!');
  };

  const generatePDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Super PDF - Migração FLM</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
            h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
            h2 { color: #1e40af; margin-top: 30px; background: #f3f4f6; padding: 8px 15px; border-radius: 4px; }
            h3 { color: #374151; }
            pre { background: #1e293b; color: #e2e8f0; padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 12px; border-left: 5px solid #3b82f6; }
            code { font-family: 'Courier New', Courier, monospace; }
            .badge { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
            .prompt-box { background: #fdf2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 50px; font-size: 12px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            @media print {
              body { padding: 20px; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Migração de Banco de Dados <span class="badge">FLM v2.0</span></h1>
          <p>Este documento contém todas as instruções, códigos e prompts necessários para reconstruir o ecossistema Football Legend Manager em qualquer ambiente Supabase ou compatível com PostgreSQL.</p>
          
          <h2>1. Estrutura do Banco de Dados (SQL)</h2>
          <p>Execute o código abaixo no editor SQL do seu banco de dados para criar as tabelas, habilitar RLS e definir permissões.</p>
          <pre><code>${sql.replace(/</g, '&lt;')}</code></pre>
          
          <h2>2. O que cada tabela faz</h2>
          <ul>
            <li><strong>Profiles:</strong> Central de dados do usuário (nome, foto).</li>
            <li><strong>Game Saves:</strong> Backup binário do estado atual da carreira do jogador.</li>
            <li><strong>Clubs:</strong> Gerencia economia, finanças e identidade visual dos times.</li>
            <li><strong>Players:</strong> Armazena atributos técnicos, idade, posição e valor.</li>
            <li><strong>Auctions:</strong> Motor do mercado de transferências.</li>
            <li><strong>User Roles:</strong> Sistema de permissões hierárquicas.</li>
          </ul>

          <h2>3. Super Prompt para IA (Copie para ChatGPT/Claude)</h2>
          <div class="prompt-box">
            <p>Copie o texto abaixo e cole em uma IA para que ela entenda e ajude a gerenciar este banco de dados:</p>
            <pre><code>${prompt.replace(/</g, '&lt;')}</code></pre>
          </div>

          <div class="footer">
            Gerado automaticamente pelo Painel Administrativo FLM - ${new Date().toLocaleDateString()}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Super Exportador de IA & PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ferramentas para migrar todo o seu ecossistema para outra plataforma ou instruir uma IA a gerenciar seu banco de dados.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button onClick={copyToClipboard} variant="outline" className="flex items-center gap-2 h-12 bg-background/40 hover:bg-primary/10">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Database className="h-4 w-4 text-primary" />}
              <span>Copiar SQL</span>
            </Button>
            
            <Button onClick={copyPromptToClipboard} variant="outline" className="flex items-center gap-2 h-12 bg-background/40 hover:bg-purple-500/10 border-purple-500/20">
              {copiedPrompt ? <Check className="h-4 w-4 text-green-500" /> : <Bot className="h-4 w-4 text-purple-500" />}
              <span>Copiar Prompt IA</span>
            </Button>

            <Button onClick={generatePDF} className="flex items-center gap-2 h-12 bg-primary hover:bg-primary/90 text-primary-foreground">
              <FileText className="h-4 w-4" />
              <span>Gerar Super PDF</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Preview do Schema SQL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative group">
            <pre className="p-4 rounded-lg bg-black/40 border border-border/10 font-mono text-[10px] text-primary/90 overflow-x-auto max-h-[250px] whitespace-pre-wrap">
              {sql}
            </pre>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 shrink-0" />
            <p className="text-[10px] text-blue-400 leading-relaxed">
              Dica: O "Super PDF" gera um documento completo que você pode imprimir ou salvar, contendo a explicação de cada aba do sistema e os prompts necessários para clonar o banco de dados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

