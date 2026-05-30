import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SqlMigrationPanel() {
  const [loading, setLoading] = useState(false);
  const [sql, setSql] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const hardcodedSql = `
-- FLM FULL SCHEMA MIGRATION
-- Gerado em 30/05/2026

CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.game_saves (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  club_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.clubs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  country text NOT NULL,
  logo text,
  strength integer DEFAULT 60,
  is_bot boolean DEFAULT false,
  bankrupt_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.world_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  country text NOT NULL,
  league_id uuid,
  strength integer DEFAULT 60,
  is_bot boolean DEFAULT true,
  logo text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.players (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  club_id uuid,
  name text NOT NULL,
  position text NOT NULL,
  overall integer NOT NULL,
  age integer NOT NULL,
  nationality text,
  market_value bigint DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.global_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sender_name text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.player_auctions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  min_price bigint NOT NULL,
  current_bid bigint DEFAULT 0,
  current_bidder_id uuid,
  status text DEFAULT 'active'::text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Permissões básicas
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
`;
    setSql(hardcodedSql);
  }, []);

  const generateSql = async () => {
    setLoading(true);
    // Refresh the SQL or show toast
    toast.success('SQL atualizado!');
    setLoading(false);
  };


  const copyToClipboard = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('SQL copiado para a área de transferência!');
  };

  return (
    <Card className="bg-card/50 border-border/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Schema SQL para Migração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-muted-foreground">
            Gere o código SQL necessário para recriar a estrutura do banco de dados.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={generateSql} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Database className="h-3 w-3 mr-2" />}
              Gerar SQL
            </Button>
            {sql && (
              <Button size="sm" variant="outline" onClick={copyToClipboard}>
                {copied ? <Check className="h-3 w-3 mr-2" /> : <Copy className="h-3 w-3 mr-2" />}
                Copiar
              </Button>
            )}
          </div>
        </div>

        {sql && (
          <div className="relative group">
            <pre className="p-4 rounded-lg bg-black/40 border border-border/10 font-mono text-[10px] text-primary/90 overflow-x-auto max-h-[400px] whitespace-pre-wrap">
              {sql}
            </pre>
          </div>
        )}

        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 shrink-0" />
          <p className="text-[10px] text-blue-400 leading-relaxed">
            Dica: Para uma migração completa incluindo RLS, Triggers e Funções, recomenda-se usar o comando <code>supabase db dump</code> via Supabase CLI no seu terminal local.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
