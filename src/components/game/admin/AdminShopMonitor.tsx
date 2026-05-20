import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, Clock, CheckCircle2, XCircle, AlertCircle, 
  RefreshCw, Volume2, History, TrendingUp, DollarSign, Activity
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { toast } from 'sonner';

interface ShopActivity {
  id: string;
  user_id: string;
  club_name: string | null;
  item_name: string | null;
  amount_cents: number;
  status: string;
  payment_method: string | null;
  transaction_id: string | null;
  created_at: string;
}

export function AdminShopMonitor() {
  const [activities, setActivity] = useState<ShopActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_shop_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) {
        setActivity(data as ShopActivity[]);
        
        // Calculate stats
        const approved = data.filter(a => a.status === 'approved' || a.status === 'paid');
        const revenue = approved.reduce((acc, curr) => acc + (curr.amount_cents || 0), 0);
        
        setStats({
          totalRevenue: revenue / 100,
          approvedCount: approved.length,
          pendingCount: data.filter(a => a.status === 'pending').length,
          rejectedCount: data.filter(a => a.status === 'rejected' || a.status === 'cancelled').length
        });
      }
    } catch (e: any) {
      console.error('Error loading shop activity:', e);
      toast.error('Erro ao carregar monitor da loja');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('admin-shop-monitor')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'admin_shop_activity' 
      }, (payload) => {
        const newActivity = payload.new as ShopActivity;
        setActivity(prev => [newActivity, ...prev].slice(0, 50));
        setNewCount(prev => prev + 1);
        
        // Play notification sound
        const audio = new Audio('https://www.myinstants.com/media/sounds/level-up-6.mp3');
        audio.volume = 0.2;
        audio.play().catch(() => {});

        // Refresh stats
        if (newActivity.status === 'approved' || newActivity.status === 'paid') {
           setStats(prev => ({ 
             ...prev, 
             approvedCount: prev.approvedCount + 1,
             totalRevenue: prev.totalRevenue + (newActivity.amount_cents / 100)
           }));
        } else if (newActivity.status === 'pending') {
           setStats(prev => ({ ...prev, pendingCount: prev.pendingCount + 1 }));
        }

        toast.info(`🛒 Nova atividade: ${newActivity.club_name || 'Usuário'} - ${newActivity.item_name || 'Produto'}`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'paid':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" /> Aprovado</Badge>;
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"><XCircle className="h-3 w-3" /> Recusado</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" /> {status}</Badge>;
    }
  };

  const resetCounter = () => setNewCount(0);

  return (
    <div className="space-y-4">
      {/* Activity Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto mb-1 text-emerald-400" />
            <p className="text-lg font-black italic">{formatMoney(stats.totalRevenue)}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground">Receita Total</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-blue-400" />
            <p className="text-lg font-black italic">{stats.approvedCount}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground">Vendas</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-amber-400" />
            <p className="text-lg font-black italic">{stats.pendingCount}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-purple-500/20 relative overflow-hidden" onClick={resetCounter}>
          <CardContent className="p-3 text-center">
            <Activity className="h-4 w-4 mx-auto mb-1 text-purple-400" />
            <p className="text-lg font-black italic">{newCount}</p>
            <p className="text-[9px] uppercase font-bold text-muted-foreground">Novos Alertas</p>
            {newCount > 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse m-1" />}
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Activity Log */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-black uppercase italic flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Atividade em Tempo Real
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={loadData} disabled={loading} className="h-7 text-[10px]">
             <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Sincronizar
          </Button>
        </CardHeader>
        <CardContent className="px-1 sm:px-3">
          <ScrollArea className="h-[400px] pr-3">
            {activities.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs italic">Nenhuma atividade registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-all group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black uppercase italic text-foreground truncate">
                            {item.club_name || 'Desconhecido'}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            ID: {item.user_id.slice(0, 8)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[11px] font-bold text-primary">
                             {item.item_name || 'Produto'}
                           </span>
                           <span className="text-[10px] text-emerald-400 font-mono font-bold">
                             {formatMoney(item.amount_cents / 100)}
                           </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {getStatusBadge(item.status)}
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(item.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between gap-2">
                      <span className="text-[9px] text-muted-foreground uppercase font-bold">
                        {item.payment_method || 'N/A'}
                      </span>
                      {item.transaction_id && (
                        <span className="text-[9px] text-muted-foreground font-mono bg-muted/50 px-1.5 rounded truncate max-w-[150px]">
                          TX: {item.transaction_id}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
