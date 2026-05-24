import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShoppingBag, Clock, CheckCircle2, XCircle, AlertCircle, 
  RefreshCw, History, TrendingUp, DollarSign, Activity,
  Search, Filter, MapPin, Tablet, Zap, Package, ShieldAlert,
  ArrowUpRight, User, Eye, Ban
} from 'lucide-react';
import { formatMoney } from '@/lib/formatMoney';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ShopActivity {
  id: string;
  user_id: string;
  club_name: string | null;
  item_id: string | null;
  item_name: string | null;
  amount_cents: number;
  status: string;
  payment_method: string | null;
  ip_address?: string | null;
  device_info?: string | null;
  region?: string | null;
  attempt_duration_ms?: number | null;
  metadata?: any;
  created_at: string;
}

export function AdminShopMonitor() {
  const [activities, setActivities] = useState<ShopActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    attemptingCount: 0,
    fraudulentCount: 0,
    dailyGrowth: 12.5,
    topProduct: 'Plano Premium Gold'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_shop_activity')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query.limit(100);

      if (error) throw error;
      if (data) {
        setActivities(data as unknown as ShopActivity[]);
        
        // Calculate stats
        const approved = (data as any[]).filter(a => ['approved', 'paid', 'delivered'].includes(a.status));
        const revenue = approved.reduce((acc, curr) => acc + Number(curr.amount_cents || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalRevenue: revenue / 100,
          approvedCount: approved.length,
          pendingCount: (data as any[]).filter(a => a.status === 'pending').length,
          rejectedCount: (data as any[]).filter(a => a.status === 'rejected' || a.status === 'cancelled').length,
          attemptingCount: (data as any[]).filter(a => a.status === 'attempting').length,
          fraudulentCount: (data as any[]).filter(a => a.status === 'fraudulent').length,
        }));
      }
    } catch (e: any) {
      console.error('Error loading shop activity:', e);
      toast.error('Erro ao carregar monitor da loja');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('admin-shop-monitor-realtime-v2')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'admin_shop_activity' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newActivity = payload.new as unknown as ShopActivity;
          setActivities(prev => [newActivity, ...prev].slice(0, 100));
          setNewCount(prev => prev + 1);
          
          if (newActivity.amount_cents > 5000 || ['approved', 'paid'].includes(newActivity.status)) {
            const audio = new Audio('https://www.myinstants.com/media/sounds/level-up-6.mp3');
            audio.volume = 0.2;
            audio.play().catch(() => {});
            toast.success(`💰 Venda Aprovada: ${newActivity.item_name} - ${formatMoney(newActivity.amount_cents / 100)}`);
          } else if (newActivity.status === 'fraudulent') {
            toast.error(`🚨 ALERTA: Tentativa de fraude detectada!`, { duration: 5000 });
          } else {
            toast.info(`🛒 Nova atividade: ${newActivity.item_name || 'Produto'}`);
          }
          
          loadData();
        } else if (payload.eventType === 'UPDATE') {
          setActivities(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...(payload.new as any) } : a));
          loadData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'paid':
        return { label: 'Aprovado', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 };
      case 'delivered':
        return { label: 'Entregue', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Package };
      case 'pending':
        return { label: 'Pendente', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock };
      case 'attempting':
        return { label: 'Tentando', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', icon: Activity };
      case 'rejected':
      case 'cancelled':
        return { label: 'Cancelado', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: XCircle };
      case 'fraudulent':
        return { label: 'Fraude', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: ShieldAlert };
      default:
        return { label: status, color: 'bg-muted text-muted-foreground border-border', icon: AlertCircle };
    }
  };

  const filteredActivities = activities.filter(a => 
    a.club_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/40 border-emerald-500/20 relative overflow-hidden group">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 gap-1 bg-emerald-500/5">
                <ArrowUpRight className="h-3 w-3" /> {stats.dailyGrowth}%
              </Badge>
            </div>
            <p className="text-2xl font-black italic tracking-tighter text-white">{formatMoney(stats.totalRevenue)}</p>
            <p className="text-[10px] uppercase font-black text-white/40 tracking-wider">Receita Monitorada</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-blue-500/20 relative overflow-hidden group">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-[10px] text-white/40 font-bold">Hoje</span>
            </div>
            <p className="text-2xl font-black italic tracking-tighter text-white">{stats.approvedCount}</p>
            <p className="text-[10px] uppercase font-black text-white/40 tracking-wider">Vendas Totais</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-amber-500/20 relative overflow-hidden group">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px] animate-pulse">LIVE</Badge>
            </div>
            <p className="text-2xl font-black italic tracking-tighter text-white">{stats.pendingCount + stats.attemptingCount}</p>
            <p className="text-[10px] uppercase font-black text-white/40 tracking-wider">Fluxo em Aberto</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-red-500/20 relative overflow-hidden group">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <ShieldAlert className="h-5 w-5 text-red-400" />
              </div>
              {stats.fraudulentCount > 0 && (
                <Badge className="bg-red-500 text-white border-none text-[9px] animate-bounce">ALERTA</Badge>
              )}
            </div>
            <p className="text-2xl font-black italic tracking-tighter text-white">{stats.fraudulentCount}</p>
            <p className="text-[10px] uppercase font-black text-white/40 tracking-wider">Risco Detectado</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#0a0f1a] border-white/5 shadow-2xl">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-black italic uppercase tracking-tighter">Central de Monitoramento</CardTitle>
                <p className="text-xs text-white/40">Acompanhamento de transações em tempo real</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <Input 
                  placeholder="Buscar..." 
                  className="h-9 pl-9 w-[180px] bg-white/5 border-white/10 rounded-xl text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-[140px] bg-white/5 border-white/10 rounded-xl text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#0f172a] border-white/10">
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="attempting">Tentando</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="fraudulent">Risco/Fraude</SelectItem>
                  <SelectItem value="rejected">Recusado</SelectItem>
                </SelectContent>
              </Select>

              <Button size="sm" variant="outline" onClick={loadData} disabled={loading} className="h-9 bg-white/5 border-white/10 rounded-xl">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <ScrollArea className="h-[600px] w-full">
            <div className="p-4 space-y-3">
              {filteredActivities.length === 0 ? (
                <div className="py-20 text-center text-white/20">Aguardando atividades...</div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredActivities.map((item, index) => {
                    const statusConfig = getStatusConfig(item.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.01 }}
                        className={`p-4 rounded-2xl border ${item.status === 'fraudulent' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5'}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                              <User className="h-5 w-5 text-white/40" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-black uppercase italic text-white truncate">{item.club_name || 'Usuário'}</p>
                              <p className="text-[10px] text-white/30 font-mono truncate">{item.user_id}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                            <div>
                              <p className="text-[11px] font-bold text-white/90">{item.item_name || 'Transação'}</p>
                              <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
                                <span className="text-emerald-400">{formatMoney(item.amount_cents / 100)}</span>
                                <span className="uppercase">{item.payment_method}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="text-[10px] text-white/30 bg-white/5 px-2 py-1 rounded flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {item.region || 'BR'}
                              </div>
                              <div className="text-[10px] text-white/30 bg-white/5 px-2 py-1 rounded flex items-center gap-1">
                                <Tablet className="h-3 w-3" /> {item.device_info || 'PC'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge className={`${statusConfig.color} font-black italic uppercase text-[9px]`}>
                              <StatusIcon className="h-3 w-3 mr-1" /> {statusConfig.label}
                            </Badge>
                            <span className="text-[10px] text-white/30 font-bold whitespace-nowrap">
                              {new Date(item.created_at).toLocaleTimeString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-white/20 uppercase font-black">
                          <span>IP: {item.ip_address || '127.0.0.1'} | {item.attempt_duration_ms ? `${item.attempt_duration_ms}ms` : 'N/A'}</span>
                          <div className="flex gap-3">
                            <button className="hover:text-primary"><Eye className="h-3 w-3" /></button>
                            <button className="hover:text-red-400"><Ban className="h-3 w-3" /></button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
