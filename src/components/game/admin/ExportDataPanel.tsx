import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, FileJson, Table } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ExportDataPanel() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const tablesToExport = [
    { id: 'profiles', name: 'DATABASE (Profiles)', table: 'profiles' },
    { id: 'game_saves', name: 'USERS (Game Saves)', table: 'game_saves' },
    { id: 'admin_logs', name: 'LOGS (Admin Activity)', table: 'admin_logs' },
    { id: 'global_chat_messages', name: 'CHAT LOGS', table: 'global_chat_messages' },
    { id: 'player_auctions', name: 'APPOINMENTS (Auctions)', table: 'player_auctions' },
    { id: 'world_teams', name: 'TEAMS', table: 'world_teams' },
    { id: 'players', name: 'PLAYERS', table: 'players' },
    { id: 'clubs', name: 'CLUBS', table: 'clubs' },
    { id: 'multiplayer_leagues', name: 'LEAGUES', table: 'multiplayer_leagues' },
    { id: 'shop_products', name: 'SHOP PRODUCTS', table: 'shop_products' },
    { id: 'shop_purchases', name: 'SHOP PURCHASES', table: 'shop_purchases' },
    { id: 'transfer_listings', name: 'TRANSFER LISTINGS', table: 'transfer_listings' },
    { id: 'transfer_log', name: 'TRANSFER LOGS', table: 'transfer_log' },
    { id: 'match_history', name: 'MATCH HISTORY', table: 'match_history' },
    { id: 'system_settings', name: 'SYSTEM SETTINGS', table: 'system_settings' },
    { id: 'user_roles', name: 'USER ROLES', table: 'user_roles' },
    { id: 'premium_users', name: 'PREMIUM USERS', table: 'premium_users' },
    { id: 'chat_bans', name: 'CHAT BANS', table: 'chat_bans' },
    { id: 'game_bans', name: 'GAME BANS', table: 'game_bans' },
    { id: 'abuse_alerts', name: 'ABUSE ALERTS', table: 'abuse_alerts' },
    { id: 'suspicious_activity', name: 'SUSPICIOUS ACTIVITY', table: 'suspicious_activity' },
    { id: 'payment_orders', name: 'PAYMENT ORDERS', table: 'payment_orders' },
    { id: 'membership_revenue', name: 'MEMBERSHIP REVENUE', table: 'membership_revenue_history' },
    { id: 'support_messages', name: 'SUPPORT MESSAGES', table: 'support_messages' },
    { id: 'admin_finance_logs', name: 'FINANCE LOGS', table: 'admin_finance_logs' },
    { id: 'scout_reports', name: 'SCOUT REPORTS', table: 'scout_reports' },
    { id: 'auction_history', name: 'AUCTION HISTORY', table: 'auction_history' },
    { id: 'player_negotiations', name: 'PLAYER NEGOTIATIONS', table: 'player_negotiations' },
    { id: 'loan_offers', name: 'LOAN OFFERS', table: 'loan_offers' },
    { id: 'world_leagues', name: 'WORLD LEAGUES', table: 'world_leagues' },
    { id: 'tournaments', name: 'TOURNAMENTS', table: 'tournaments' },
    { id: 'national_cups', name: 'NATIONAL CUPS', table: 'national_cups' },
    { id: 'league_members', name: 'LEAGUE MEMBERS', table: 'league_members' },
    { id: 'club_memberships', name: 'CLUB MEMBERSHIPS', table: 'club_memberships' },
    { id: 'player_development', name: 'DEVELOPMENT POINTS', table: 'player_development_points' },
    { id: 'match_simulation_logs', name: 'SIMULATION LOGS', table: 'match_simulation_logs' },
    { id: 'scout_missions', name: 'SCOUT MISSIONS', table: 'scout_missions' },
    { id: 'trade_proposals', name: 'TRADE PROPOSALS', table: 'trade_proposals' },
    { id: 'daily_training', name: 'TRAINING SESSIONS', table: 'daily_training_sessions' },
    { id: 'tournament_stats', name: 'TOURNAMENT STATS', table: 'tournament_stats' },
    { id: 'youth_prospects', name: 'YOUTH PROSPECTS', table: 'youth_prospects' },
    { id: 'scout_reports', name: 'SCOUT REPORTS', table: 'scout_reports' },
    { id: 'club_sponsorships', name: 'CLUB SPONSORSHIPS', table: 'club_sponsorships' },
    { id: 'club_shop_orders', name: 'SHOP ORDERS', table: 'club_shop_orders' },
    { id: 'user_notifications', name: 'NOTIFICATIONS', table: 'user_notifications' },
    { id: 'countries', name: 'COUNTRIES', table: 'countries' },
    { id: 'world_players', name: 'WORLD PLAYERS', table: 'world_players' },
    { id: 'match_context', name: 'MATCH CONTEXT', table: 'match_context_modifiers' },
    { id: 'player_missions', name: 'PLAYER MISSIONS', table: 'player_missions' },
    { id: 'season_calendar', name: 'SEASON CALENDAR', table: 'season_calendar' },
    { id: 'rivalries', name: 'CLUB RIVALRIES', table: 'rivalries' },
  ];

  const exportToCSV = async (tableName: string, label: string) => {
    setExporting(label);
    try {
      const { data, error } = await (supabase.from(tableName as any) as any).select('*').limit(5000);
      
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

  const filteredTables = tablesToExport.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="bg-card/50 border-border/20">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Exportar Dados Lovable Cloud
          </CardTitle>
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar tabela..."
              className="w-full bg-background/50 border border-border/20 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Baixe os dados do sistema em formato CSV para análise externa. Total: {tablesToExport.length} tabelas.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTables.map((item) => (
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
