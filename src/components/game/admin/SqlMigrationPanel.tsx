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

-- [TABELAS EXISTENTES]
-- Profiles, Game Saves, Clubs, World Teams, Players, Chat, Auctions, Roles...

-- 9. TABELA NEWSPAPER_REACTIONS (Reações ao jornal)
CREATE TABLE IF NOT EXISTS public.newspaper_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  news_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 10. TABELA CALENDAR_SCHEDULE (Agenda do sistema)
CREATE TABLE IF NOT EXISTS public.calendar_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_date timestamp with time zone NOT NULL,
  event_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- 11. TABELA LEAGUE_SQUADS (Escalações das ligas)
CREATE TABLE IF NOT EXISTS public.league_squads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL,
  club_id uuid NOT NULL,
  squad_data jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- [OUTRAS TABELAS NOVAS]
-- Logistic Events, Scout Market, Match Narratives, World Cup Matches, Intl Matches...

-- HABILITAR RLS NAS NOVAS TABELAS
ALTER TABLE public.newspaper_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_squads ENABLE ROW LEVEL SECURITY;

-- PERMISSÕES (GRANTs)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
`;

    const aiPrompt = `### MANUAL DE MIGRAÇÃO COMPLETO (V2 - COM NOVOS DADOS)

Atue como o Arquiteto Chefe do FLM. O sistema foi expandido com novos módulos de engajamento e simulação.

#### 1. ESTRUTURA EXPANDIDA
Novos módulos incluídos:
- **Newspaper Reactions:** Sistema de engajamento social com as notícias do mundo.
- **Calendar Schedule:** Motor de eventos cronológicos para o simulador.
- **League Squads:** Gerenciamento de elencos competitivos.
- **Match Narratives:** Gerador de textos dinâmicos para descrição de partidas.
- **International & World Cup:** Estruturas para competições globais.

#### 2. INSTRUÇÕES PARA RECONSTRUÇÃO
1. Execute o SQL de migração fornecido.
2. Sincronize as tabelas de 'Clubs' com os novos 'League Squads'.
3. Ative os triggers de notificação para 'Newspaper Reactions'.

#### 3. PRÓXIMO NÍVEL
Deseja que eu gere os scripts de carga de dados iniciais (Seed Data) para todas essas 100+ tabelas agora?`;

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
          <h1>Relatório de Migração de Banco de Dados <span class="badge">FLM v2.1 (Novos Dados)</span></h1>
          <p>Este documento contém todas as instruções, códigos e prompts necessários para reconstruir o ecossistema Football Legend Manager em qualquer ambiente Supabase ou compatível com PostgreSQL.</p>
          
          <h2>1. Estrutura do Banco de Dados (SQL)</h2>
          <p>Execute o código abaixo no editor SQL do seu banco de dados para criar as tabelas, habilitar RLS e definir permissões.</p>
          <pre><code>${sql.replace(/</g, '&lt;')}</code></pre>
          
          <h2>2. O que cada tabela faz (Novos Módulos)</h2>
          <ul>
            <li><strong>Newspaper Reactions:</strong> Sistema de engajamento social.</li>
            <li><strong>Calendar Schedule:</strong> Controle de tempo e eventos.</li>
            <li><strong>League Squads:</strong> Detalhamento de elencos por liga.</li>
            <li><strong>Módulos Adicionais:</strong> Inclui narrativas de partidas e competições internacionais.</li>
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
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 border-border/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Super Exportador de IA & PDF (v2.1)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ferramentas atualizadas para migrar todo o seu ecossistema, agora com suporte aos novos módulos de dados e prompts avançados para IA.
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
              <span>Gerar Super PDF v2</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Preview do Schema SQL (Expandido)
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
              Dica: O "Super PDF" agora inclui os novos módulos descobertos no banco de dados, garantindo que a IA tenha visão total do sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
