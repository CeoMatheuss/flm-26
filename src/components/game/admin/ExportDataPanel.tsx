import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, FileJson, Table } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ExportDataPanel() {
  const [exporting, setExporting] = useState<string | null>(null);

  const tablesToExport = [
    { id: 'profiles', name: 'DATABASE (Profiles)', table: 'profiles' },
    { id: 'game_saves', name: 'USERS (Game Saves)', table: 'game_saves' },
    { id: 'global_chat_messages', name: 'LOGS (Chat Messages)', table: 'global_chat_messages' },
    { id: 'player_auctions', name: 'APPOINMENTS (Auctions)', table: 'player_auctions' },
    { id: 'world_teams', name: 'TEAMS', table: 'world_teams' },
    { id: 'multiplayer_leagues', name: 'LEAGUES', table: 'multiplayer_leagues' },
  ];

  const exportToCSV = async (tableName: string, label: string) => {
    setExporting(label);
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(5000);
      
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error(`Nenhum dado encontrado em ${label}`);
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(fieldName => {
            const value = row[fieldName];
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
            return `"${stringValue.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `flm_export_${tableName}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exportação de ${label} concluída!`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Erro ao exportar ${label}: ${error.message}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card className="bg-card/50 border-border/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Exportar Dados Lovable Cloud
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Baixe os dados do sistema em formato CSV para análise externa.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tablesToExport.map((item) => (
            <Button
              key={item.id}
              variant="outline"
              className="flex items-center justify-between h-auto py-3 px-4 bg-background/40 hover:bg-primary/10 border-border/10 transition-all"
              onClick={() => exportToCSV(item.table, item.name)}
              disabled={exporting !== null}
            >
              <div className="flex items-center gap-3">
                <Table className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              {exporting === item.name ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Download className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              )}
            </Button>
          ))}
          
          <div className="col-span-full mt-4 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <FileJson className="h-3 w-3" />
              Observação sobre Storage & Functions
            </h4>
            <p className="text-[10px] text-amber-500/80 leading-relaxed">
              Diferente das tabelas do banco de dados, dados de <strong>Storage</strong>, <strong>Secrets</strong> e <strong>Edge Functions</strong> 
              não podem ser exportados via CSV diretamente por questões de segurança e estrutura de arquivos. 
              Para gerenciar estes recursos, utilize o painel do Supabase.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
