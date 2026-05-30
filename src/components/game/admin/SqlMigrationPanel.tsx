import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Copy, Check, FileText, Brain, Bot, Shield, Rocket, Server, Code } from 'lucide-react';
import { toast } from 'sonner';

export function SqlMigrationPanel() {
  const [loading, setLoading] = useState(false);
  const [sql, setSql] = useState('');
  const [prompt, setPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  useEffect(() => {
    const hardcodedSql = `
-- ==========================================================
-- FLM MASTER SCHEMA MIGRATION - STANDALONE VERSION
-- Gerado em 30/05/2026 para Independência do Lovable Cloud
-- ==========================================================

-- 1. CORE & AUTH
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  club_id uuid,
  role text DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now()
);

-- 2. GAMEPLAY CORE (CLUBS & PLAYERS)
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  shield_url text,
  budget bigint DEFAULT 1000000,
  fans integer DEFAULT 0,
  manager_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.players (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  overall integer NOT NULL,
  position text NOT NULL,
  club_id uuid REFERENCES public.clubs(id),
  market_value bigint,
  attributes jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. COMPETITIONS
CREATE TABLE IF NOT EXISTS public.world_leagues (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  division integer NOT NULL,
  season integer DEFAULT 1,
  status text DEFAULT 'active'
);

-- 4. MATCH ENGINE & SOCIAL
CREATE TABLE IF NOT EXISTS public.live_matches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  home_team_id uuid REFERENCES public.clubs(id),
  away_team_id uuid REFERENCES public.clubs(id),
  score_home integer DEFAULT 0,
  score_away integer DEFAULT 0,
  status text DEFAULT 'scheduled',
  match_data jsonb,
  kickoff_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.newspaper_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id uuid NOT NULL,
  user_id uuid REFERENCES public.profiles(id),
  reaction_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. RLS & PERMISSIONS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newspaper_reactions ENABLE ROW LEVEL SECURITY;

-- Exemplo de Política RLS
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- Permissões Universais
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
`;

    const aiPrompt = `### MANUAL DE RECONSTRUÇÃO DO ECOSSISTEMA FLM (FOOTBALL LEGEND MANAGER)

Você é o Arquiteto Sênior encarregado de migrar o sistema FLM do Lovable Cloud para uma infraestrutura Supabase Independente.

#### OBJETIVO:
Reconstruir as 100+ tabelas, funções PostgreSQL e Edge Functions para que o sistema funcione de forma autônoma.

#### 1. ARQUITETURA DO BANCO DE DADOS:
O sistema é dividido em 7 módulos principais:
1. **Módulo de Identidade:** Gerenciamento de perfis e funções (profiles, user_roles).
2. **Módulo de Clubes e Atletas:** O coração do jogo (clubs, players, club_memberships).
3. **Módulo de Ligas:** Estrutura competitiva e divisões (world_leagues, world_divisions).
4. **Motor de Simulação:** Logica de partidas e resultados (live_matches, match_history, narratives).
5. **Mercado e Finanças:** Transferências e Leilões (transfer_listings, player_auctions, bids).
6. **Módulo Social:** Chat global, notícias e reações (newspaper_reactions, global_chat).
7. **Infraestrutura:** Logs de administração e auditoria (admin_logs, abuse_alerts).

#### 2. INSTRUÇÕES PARA A IA:
- **Passo 1:** Analise o SQL de Schema fornecido. Identifique todas as chaves estrangeiras.
- **Passo 2:** Sugira a criação de triggers para atualização automática de 'updated_at' e estatísticas de jogadores.
- **Passo 3:** Projete a lógica das Edge Functions (Typescript) para processar os jogos em background usando o motor de simulação contido nos arquivos do projeto.

#### 3. MENSAGEM DE STATUS:
Estou pronto para gerar os scripts SQL específicos para qualquer um desses módulos. Qual você deseja reconstruir primeiro?`;

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

    const htmlContent = `
      <html>
        <head>
          <title>SUPER PDF - MIGRATION MASTER PLAN FLM</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 900px; margin: 0 auto; padding: 50px; background: #fff; }
            .header-container { text-align: center; border-bottom: 4px solid #000; padding-bottom: 20px; margin-bottom: 40px; }
            h1 { font-size: 28px; text-transform: uppercase; letter-spacing: 2px; margin: 0; }
            h2 { font-size: 20px; color: #2563eb; margin-top: 40px; border-left: 5px solid #2563eb; padding-left: 15px; }
            h3 { font-size: 16px; font-weight: 700; color: #4b5563; margin-top: 25px; }
            p { font-size: 14px; color: #374151; }
            .module-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .module-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; background: #f9fafb; }
            .module-card strong { color: #1e40af; display: block; margin-bottom: 5px; }
            pre { background: #0f172a; color: #f8fafc; padding: 25px; border-radius: 12px; overflow-x: auto; font-size: 11px; line-height: 1.4; border: 1px solid #334155; }
            .prompt-section { background: #fefce8; border: 2px dashed #facc15; padding: 25px; border-radius: 12px; margin: 30px 0; }
            .prompt-header { display: flex; align-items: center; gap: 10px; color: #854d0e; font-weight: 800; margin-bottom: 15px; text-transform: uppercase; }
            .footer { margin-top: 60px; font-size: 11px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
            .badge-standalone { background: #000; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 12px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="badge-standalone">PROJETO INDEPENDÊNCIA</div>
            <h1>FLM MASTER MIGRATION PLAN</h1>
            <p>Relatório Técnico para Migração de Banco de Dados e Lógica de Negócio</p>
          </div>
          
          <p>Este documento foi gerado para fornecer total autonomia ao proprietário do projeto Football Legend Manager, permitindo a migração completa do Lovable Cloud para qualquer ambiente Supabase autônomo ou infraestrutura baseada em PostgreSQL.</p>

          <h2>1. ESTRUTURA MODULAR DO SISTEMA</h2>
          <div class="module-grid">
            <div class="module-card">
              <strong>Módulo 01: Identidade (Auth)</strong>
              <p>Tabelas: profiles, user_roles, user_presence. Gerencia o acesso e permissões de usuários e administradores.</p>
            </div>
            <div class="module-card">
              <strong>Módulo 02: Core Gameplay</strong>
              <p>Tabelas: clubs, players, club_memberships. Contém toda a lógica de ativos digitais e elencos.</p>
            </div>
            <div class="module-card">
              <strong>Módulo 03: Competições</strong>
              <p>Tabelas: world_leagues, world_divisions, tournaments. Define o calendário e estrutura das ligas.</p>
            </div>
            <div class="module-card">
              <strong>Módulo 04: Motor de Partidas</strong>
              <p>Tabelas: live_matches, match_history, narratives. Lógica de simulação e persistência de resultados.</p>
            </div>
          </div>

          <h2>2. SCHEMA SQL (EXEMPLO CORE)</h2>
          <p>Utilize este SQL inicial para estabelecer as bases do banco de dados. Para o schema completo, consulte a pasta <code>supabase/migrations</code> no repositório do projeto.</p>
          <pre><code>${sql.replace(/</g, '&lt;')}</code></pre>
          
          <h2>3. ESTRATÉGIA DE DADOS</h2>
          <p>Para migrar os dados existentes:</p>
          <ul>
            <li>Exporte cada tabela em formato CSV através do Painel de Exportação.</li>
            <li>No novo banco de dados, utilize a ferramenta de Importação CSV do Supabase Dashboard.</li>
            <li>Respeite a ordem de dependências (ex: primeiro 'profiles', depois 'clubs', depois 'players').</li>
          </ul>

          <div class="prompt-section">
            <div class="prompt-header">
              <span>🤖 SUPER PROMPT PARA IA (CLAUDE / CHATGPT)</span>
            </div>
            <p>Copie e cole o texto abaixo em uma IA para que ela ajude você a configurar todo o sistema em minutos:</p>
            <pre><code>${prompt.replace(/</g, '&lt;')}</code></pre>
          </div>

          <div class="footer">
            Relatório de Migração Gerado em ${new Date().toLocaleDateString()} - Football Legend Manager Admin Panel
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // Give images/fonts time to load if any
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/20 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-3">
            <Rocket className="h-6 w-6 text-blue-400" />
            Super Migration Hub (Lovable Independence)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex gap-4">
            <Shield className="h-10 w-10 text-blue-400 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold text-blue-400">Objetivo: Independência Total</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Estas ferramentas permitem que você mova seu projeto do Lovable Cloud para seu próprio Supabase 
                ou servidor PostgreSQL a qualquer momento, sem perder dados ou lógica.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Server className="h-3 w-3" /> Infraestrutura
              </h4>
              <Button onClick={copyToClipboard} variant="outline" className="w-full justify-start gap-3 h-14 bg-background/40">
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Database className="h-5 w-5 text-blue-400" />}
                <div className="text-left">
                  <div className="text-sm font-bold">Schema SQL</div>
                  <div className="text-[10px] text-muted-foreground">Copiar tabelas core</div>
                </div>
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Bot className="h-3 w-3" /> Inteligência
              </h4>
              <Button onClick={copyPromptToClipboard} variant="outline" className="w-full justify-start gap-3 h-14 bg-background/40 border-purple-500/20 hover:bg-purple-500/5">
                {copiedPrompt ? <Check className="h-5 w-5 text-green-500" /> : <Brain className="h-5 w-5 text-purple-400" />}
                <div className="text-left">
                  <div className="text-sm font-bold">Super Prompt IA</div>
                  <div className="text-[10px] text-muted-foreground">Manual para ChatGPT/Claude</div>
                </div>
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" /> Documentação
              </h4>
              <Button onClick={generatePDF} className="w-full justify-start gap-3 h-14 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                <FileText className="h-5 w-5" />
                <div className="text-left">
                  <div className="text-sm font-bold">Gerar Super PDF</div>
                  <div className="text-[10px] text-blue-100">Exportação Completa v3</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            Guia Rápido de Migração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-black/20 border border-border/10">
              <h5 className="text-xs font-bold text-primary mb-2">1. Exportar Migrações</h5>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Baixe a pasta <code className="text-primary">supabase/migrations</code>. 
                Ela contém cada comando SQL executado no Lovable desde o início do projeto.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-black/20 border border-border/10">
              <h5 className="text-xs font-bold text-primary mb-2">2. Exportar Funções</h5>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Suas Edge Functions estão na pasta <code className="text-primary">supabase/functions</code>. 
                Basta implantá-las no seu novo projeto usando a CLI do Supabase.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
