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

  const generateSql = async () => {
    setLoading(true);
    try {
      // We'll query information_schema to get table definitions
      // Note: This is a simplified version as Supabase doesn't expose a direct "pg_dump" via RPC easily
      // We will fetch table names and column info to build a basic CREATE TABLE structure
      
      const { data: tables, error: tableError } = await supabase
        .rpc('get_tables_structure' as any); // Assuming a helper function might exist or we'll try raw query

      // Fallback: Try to query information_schema directly via a safe read query if allowed
      // Since I don't have a specific RPC for this, I'll provide a prompt-based structure
      // that users can use to get the full schema from Supabase Dashboard.
      
      let schemaSql = `-- FLM SQL Migration Schema\n-- Gerado em ${new Date().toLocaleString()}\n\n`;
      
      const { data: cols, error: colError } = await supabase.from('information_schema.columns' as any)
        .select('table_name, column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public');

      if (colError) throw colError;

      const tablesMap: Record<string, any[]> = {};
      (cols as any[]).forEach(col => {
        if (!tablesMap[col.table_name]) tablesMap[col.table_name] = [];
        tablesMap[col.table_name].push(col);
      });

      Object.entries(tablesMap).forEach(([tableName, columns]) => {
        schemaSql += `CREATE TABLE public.${tableName} (\n`;
        const colStrings = columns.map(c => {
          let line = `  ${c.column_name} ${c.data_type}`;
          if (c.is_nullable === 'NO') line += ' NOT NULL';
          if (c.column_default) line += ` DEFAULT ${c.column_default}`;
          return line;
        });
        schemaSql += colStrings.join(',\n');
        schemaSql += `\n);\n\n`;
      });

      setSql(schemaSql);
      toast.success('SQL gerado com sucesso!');
    } catch (err: any) {
      console.error('SQL Error:', err);
      // If direct query fails due to permissions (likely), provide instructions
      setSql(`-- Erro ao gerar automaticamente via API (Restrição de Permissão)\n-- Para migrar suas tabelas, execute o comando abaixo no Editor SQL do Supabase:\n\n/*\nSELECT \n  'CREATE TABLE ' || table_name || ' (' || \n  string_agg(column_name || ' ' || data_type || (is_nullable = 'NO' ? ' NOT NULL' : ''), ', ') || \n  ');' \nFROM information_schema.columns \nWHERE table_schema = 'public' \nGROUP BY table_name;\n*/\n\n-- OU exporte diretamente via Supabase Dashboard -> Database -> Tables -> Export to SQL`);
      toast.error('Não foi possível ler o schema completo via código.');
    } finally {
      setLoading(false);
    }
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
