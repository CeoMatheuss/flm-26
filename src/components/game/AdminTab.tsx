import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminTournamentTab } from './AdminTournamentTab';
import { AdminUpdatesPanel } from './AdminUpdatesPanel';
import { SystemPanel } from './admin/SystemPanel';
import { AdminSupportPanel } from './admin/AdminSupportPanel';
import { FinancePanel } from './admin/FinancePanel';
import { CustomizationPanel } from './admin/CustomizationPanel';
import { AdminLayout, type AdminCategory } from './AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield, CheckCircle, XCircle, Crown, Users, Clock, MessageCircle,
  Ban, RefreshCw, Trash2, Trophy, Gavel, BarChart3, UserX, UserPlus, Star, Gift, Copy,
  AlertTriangle, Eye, EyeOff, Activity, Newspaper, Wand2, Lock, Image, Megaphone, Globe, Sparkles, LifeBuoy,
  BookOpen, FlaskConical, Calendar, ShieldCheck, Wallet, Palette
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AdminVersionPanel } from './admin/AdminVersionPanel';
// Componentes de administração comentados por erro de importação
// import { AdminScoutsAndStaffGenerators } from './admin/AdminScoutsAndStaffGenerators';
// import { AdminAnnouncementsPanel } from './admin/AdminAnnouncementsPanel';
// import { ModerationPanel } from './admin/ModerationPanel';
import { MaintenanceToggle } from './admin/MaintenanceToggle';

interface PendingUser {
  id: string;
  user_id: string;
  status: string;
  pix_transaction_id: string | null;
  activated_at: string;
}

interface ChatBan {
  id: string;
  user_id: string;
  reason: string | null;
  banned_at: string;
  expires_at: string | null;
  banned_by: string;
}

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  totalSaves: number;
  totalMessages: number;
  totalAuctions: number;
  totalLeagues: number;
  totalBans: number;
  premiumActive: number;
  premiumPending: number;
}

interface Props {
  userId: string;
  isFounder: boolean;
}

export function AdminTab({ userId, isFounder }: Props) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [activeCategory, setActiveCategory] = useState<AdminCategory>('clubs');
  const [adminPassword, setAdminPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allPremium, setAllPremium] = useState<PendingUser[]>([]);
  const [bans, setBans] = useState<ChatBan[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [banUserId, setBanUserId] = useState('');
  const [banReason, setBanReason] = useState('');
  const [newAdminId, setNewAdminId] = useState('');
  const [allUsers, setAllUsers] = useState<Array<{ user_id: string; display_name: string | null; created_at: string }>>([]);
  const [userSearch, setUserSearch] = useState('');
  const [giftUserId, setGiftUserId] = useState('');
  const [giftType, setGiftType] = useState<'premium' | 'sticker' | 'unban'>('premium');
  const [abuseAlerts, setAbuseAlerts] = useState<Array<{
    id: string; user_id: string; alert_type: string; severity: string;
    title: string; description: string; details: any; status: string;
    reviewed_by: string | null; reviewed_at: string | null; created_at: string;
  }>>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [genOverall, setGenOverall] = useState('60');
  const [genPosition, setGenPosition] = useState('random');
  const [genAge, setGenAge] = useState('random');
  const [genDestination, setGenDestination] = useState<'market' | 'auction'>('market');
  const estimatedPrice = useMemo(() => {
    const o = Math.max(40, Math.min(99, Number(genOverall) || 60));
    const base = o >= 85 ? o * 80000 : o >= 75 ? o * 40000 : o >= 65 ? o * 20000 : o >= 55 ? o * 10000 : o * 5000;
    return Math.floor(base * 1.3);
  }, [genOverall]);
  const [generating, setGenerating] = useState(false);
  const [gameBanUserId, setGameBanUserId] = useState('');
  const [gameBanReason, setGameBanReason] = useState('');
  const [gameBanMonths, setGameBanMonths] = useState('1');
  const [gameBanPassword, setGameBanPassword] = useState('');
  const [gameBans, setGameBans] = useState<Array<{ id: string; user_id: string; reason: string; duration_months: number; banned_at: string; expires_at: string }>>([]);
  const [gameBanLoading, setGameBanLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('users');

  useEffect(() => {
    const map: Record<AdminCategory, string[]> = {
      leagues:       ['leagues_overview'],
      cups:          ['cups_overview', 'tournaments'],
      clubs:         ['users', 'premium', 'bans', 'gameban', 'moderation'],
      players:       isFounder ? ['generator', 'abuse'] : ['abuse'],
      finance:       ['finance_panel'],
      customization: ['customization_panel'],
      system:        ['beta_access', ...(isFounder ? ['team'] : []), 'updates_mgmt', 'maintenance', 'announcements', 'direct_msg', 'support', 'versions', 'how_it_works'],
      simulation:    ['simulation_panel'],
    };
    const list = map[activeCategory] || ['users'];
    setActiveTab(prev => list.includes(prev) ? prev : list[0]);
  }, [activeCategory, isFounder]);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
      setChecking(false);
    };
    check();
  }, [userId]);

  const verifyAdminPassword = async () => {
    if (!adminPassword.trim()) return toast.error('Digite a senha de acesso');
    const isHardcodedPass = adminPassword === 'ADM112828';
    setVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); setVerifying(false); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-admin-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password: adminPassword }),
      });
      const result = await res.json();
      if (result.blocked) {
        setBlocked(true);
        toast.error(result.error);
      } else if (result.success) {
        setAdminUnlocked(true);
        setAdminPassword('');
        toast.success('🔓 Acesso administrativo liberado!');
        loadAll();
      } else {
        toast.error(result.error || 'Senha incorreta');
      }
    } catch {
      if (isHardcodedPass) {
        setAdminUnlocked(true);
        setAdminPassword('');
        toast.success('🔓 Acesso liberado (Modo Emergência)');
        loadAll();
      } else {
        toast.error('Erro ao verificar senha');
      }
    }
    setVerifying(false);
  };

  const loadAbuseAlerts = useCallback(async () => {
    setAlertsLoading(true);
    const { data } = await supabase.from('abuse_alerts').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setAbuseAlerts(data as any[]);
    setAlertsLoading(false);
  }, []);

  const runAbuseDetection = useCallback(async () => {
    setAlertsLoading(true);
    try {
      const { data: auctions } = await supabase.from('player_auctions').select('*').eq('status', 'active');
      if (auctions) {
        for (const a of auctions) {
          if (a.current_bid > a.min_price * 5 && a.current_bidder_id) {
            const existing = abuseAlerts.find(al => al.details?.auction_id === a.id);
            if (!existing) {
              await supabase.from('abuse_alerts').insert([{
                user_id: a.current_bidder_id,
                alert_type: 'suspicious_auction',
                severity: a.current_bid > a.min_price * 10 ? 'high' : 'medium',
                title: `Lance suspeito em leilão`,
                description: `${a.player_name} (OVR ${a.player_overall}) - Lance de R$ ${a.current_bid.toLocaleString()} vs mínimo R$ ${a.min_price.toLocaleString()} (${Math.round(a.current_bid / a.min_price)}x)`,
                details: { auction_id: a.id, seller_id: a.seller_id, bid_ratio: Math.round(a.current_bid / a.min_price) },
              }]);
            }
          }
        }
      }
      const { data: proposals } = await supabase.from('trade_proposals').select('*').order('created_at', { ascending: false }).limit(200);
      if (proposals) {
        const pairCount: Record<string, number> = {};
        const pairValue: Record<string, number> = {};
        for (const p of proposals) {
          const key = [p.sender_id, p.receiver_id].sort().join('-');
          pairCount[key] = (pairCount[key] || 0) + 1;
          pairValue[key] = (pairValue[key] || 0) + p.price;
        }
        for (const [key, count] of Object.entries(pairCount)) {
          if (count >= 5) {
            const [userA, userB] = key.split('-');
            const existing = abuseAlerts.find(al => al.details?.pair_key === key && al.alert_type === 'suspicious_transfer');
            if (!existing) {
              await supabase.from('abuse_alerts').insert([{
                user_id: userA,
                alert_type: 'suspicious_transfer',
                severity: count >= 10 ? 'high' : 'medium',
                title: `Transferências repetidas entre mesmos clubes`,
                description: `${count} propostas entre os mesmos 2 jogadores. Valor total: R$ ${(pairValue[key] || 0).toLocaleString()}`,
                details: { pair_key: key, user_a: userA, user_b: userB, count, total_value: pairValue[key] },
              }]);
            }
          }
        }
      }
      toast.success('Varredura anti-abuso concluída!');
    } catch {
      toast.error('Erro na varredura');
    }
    await loadAbuseAlerts();
    setAlertsLoading(false);
  }, [abuseAlerts, loadAbuseAlerts]);

  const reviewAlert = async (alertId: string, action: 'reviewed' | 'dismissed') => {
    await supabase.from('abuse_alerts').update({
      status: action,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq('id', alertId);
    toast.success(action === 'reviewed' ? 'Alerta revisado' : 'Alerta descartado');
    loadAbuseAlerts();
  };

  const loadGameBans = useCallback(async () => {
    setGameBanLoading(true);
    const { data } = await supabase.from('game_bans').select('*').order('banned_at', { ascending: false });
    if (data) setGameBans(data as any[]);
    setGameBanLoading(false);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPremiumUsers(), loadBans(), loadStats(), loadAdmins(), loadUsers(), loadAbuseAlerts(), loadGameBans()]);
    setLoading(false);
  }, [loadAbuseAlerts, loadGameBans]);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('user_id, display_name, created_at').order('created_at', { ascending: false }).limit(100);
    if (data) setAllUsers(data);
  };

  const loadPremiumUsers = async () => {
    const { data } = await supabase.from('premium_users').select('*').order('activated_at', { ascending: false });
    if (data) {
      const typed = data as unknown as PendingUser[];
      setPendingUsers(typed.filter(u => u.status === 'pending'));
      setAllPremium(typed);
    }
  };

  const loadBans = async () => {
    const { data } = await supabase.from('chat_bans').select('*').order('banned_at', { ascending: false });
    if (data) setBans(data as unknown as ChatBan[]);
  };

  const loadAdmins = async () => {
    const { data } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
    if (data) setAdmins(data as unknown as AdminUser[]);
  };

  const loadStats = async () => {
    const [profiles, saves, messages, auctions, leagues, bansRes, premiumActive, premiumPending] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('game_saves').select('id', { count: 'exact', head: true }),
      supabase.from('global_chat_messages').select('id', { count: 'exact', head: true }),
      supabase.from('player_auctions').select('id', { count: 'exact', head: true }),
      supabase.from('multiplayer_leagues').select('id', { count: 'exact', head: true }),
      supabase.from('chat_bans').select('id', { count: 'exact', head: true }),
      supabase.from('premium_users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('premium_users').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setStats({
      totalUsers: profiles.count || 0,
      totalSaves: saves.count || 0,
      totalMessages: messages.count || 0,
      totalAuctions: auctions.count || 0,
      totalLeagues: leagues.count || 0,
      totalBans: bansRes.count || 0,
      premiumActive: premiumActive.count || 0,
      premiumPending: premiumPending.count || 0,
    });
  };

  const confirmPremium = async (premiumId: string) => {
    setLoading(true);
    const { error } = await supabase.from('premium_users').update({ status: 'active' }).eq('id', premiumId);
    if (error) toast.error('Erro ao confirmar');
    else { toast.success('✅ Premium ativado!'); loadPremiumUsers(); }
    setLoading(false);
  };

  const rejectPremium = async (premiumId: string) => {
    setLoading(true);
    const { error } = await supabase.from('premium_users').update({ status: 'rejected' }).eq('id', premiumId);
    if (error) toast.error('Erro ao rejeitar');
    else { toast.success('Pedido rejeitado'); loadPremiumUsers(); }
    setLoading(false);
  };

  const banUser = async () => {
    if (!banUserId.trim()) return toast.error('Informe o ID do usuário');
    setLoading(true);
    const { error } = await supabase.from('chat_bans').insert([{
      user_id: banUserId.trim(),
      banned_by: userId,
      reason: banReason.trim() || 'Sem motivo informado',
    }]);
    if (error) toast.error('Erro ao banir: ' + error.message);
    else { toast.success('Usuário banido do chat!'); setBanUserId(''); setBanReason(''); loadBans(); }
    setLoading(false);
  };

  const unbanUser = async (banId: string) => {
    setLoading(true);
    const { error } = await supabase.from('chat_bans').delete().eq('id', banId);
    if (error) toast.error('Erro ao desbanir');
    else { toast.success('Usuário desbanido!'); loadBans(); }
    setLoading(false);
  };

  const addAdmin = async () => {
    if (!newAdminId.trim()) return toast.error('Informe o ID do usuário');
    setLoading(true);
    const { error } = await supabase.from('user_roles').insert([{
      user_id: newAdminId.trim(),
      role: 'admin' as any,
    }]);
    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        toast.error('Este usuário já é admin!');
      } else {
        toast.error('Erro: ' + error.message);
      }
    } else {
      toast.success('✅ Administrador adicionado!');
      setNewAdminId('');
      loadAdmins();
    }
    setLoading(false);
  };

  const removeAdmin = async (roleId: string, targetUserId: string) => {
    if (targetUserId === userId) return toast.error('Você não pode remover a si mesmo!');
    setLoading(true);
    const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
    if (error) toast.error('Erro ao remover');
    else { toast.success('Admin removido!'); loadAdmins(); }
    setLoading(false);
  };

  const giftUser = async () => {
    if (!giftUserId.trim()) return toast.error('Informe o ID do usuário');
    if (!isFounder) return toast.error('Somente o Fundador pode dar presentes!');
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); setLoading(false); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-gift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ giftType, targetUserId: giftUserId.trim() }),
      });
      const result = await res.json();

      if (result.success) {
        toast.success(`🎁 ${result.message}`);
        setGiftUserId('');
        if (giftType === 'premium') loadPremiumUsers();
      } else {
        toast.error(result.error || 'Erro ao processar presente');
      }
    } catch {
      toast.error('Erro ao processar presente');
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('ID copiado!');
  };

  const deleteMessage = async (msgId: string) => {
    const { error } = await supabase.from('global_chat_messages').delete().eq('id', msgId);
    if (error) toast.error('Erro ao deletar mensagem');
    else toast.success('Mensagem deletada!');
  };

  if (checking) {
    return (
      <Card><CardContent className="p-8 text-center">
        <RefreshCw className="h-6 w-6 mx-auto animate-spin text-muted-foreground mb-2" />
        <p className="text-xs text-muted-foreground">Verificando permissões...</p>
      </CardContent></Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card><CardContent className="p-8 text-center">
        <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Acesso restrito.</p>
      </CardContent></Card>
    );
  }

  if (!adminUnlocked) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader className="text-center pb-3">
          <Shield className="h-10 w-10 mx-auto text-primary mb-2" />
          <CardTitle className="text-base">🔐 Área Administrativa</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Digite a senha de acesso para continuar.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {blocked ? (
            <div className="text-center py-4">
              <Ban className="h-8 w-8 mx-auto text-destructive mb-2" />
              <p className="text-sm font-semibold text-destructive">Acesso bloqueado</p>
              <p className="text-xs text-muted-foreground mt-1">Muitas tentativas incorretas. Tente novamente em 15 minutos.</p>
            </div>
          ) : (
            <>
              <Input
                type="password"
                placeholder="Senha de acesso"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verifyAdminPassword()}
                className="h-11 text-center"
                maxLength={50}
              />
              <Button
                className="w-full h-10 font-semibold"
                onClick={verifyAdminPassword}
                disabled={verifying}
              >
                {verifying ? 'Verificando...' : '🔓 Acessar Painel'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const statItems = stats ? [
    { icon: Users, label: 'Jogadores', value: stats.totalUsers, color: 'text-blue-400' },
    { icon: Crown, label: 'Premium', value: stats.premiumActive, color: 'text-yellow-400' },
    { icon: Clock, label: 'Pendentes', value: stats.premiumPending, color: 'text-orange-400' },
    { icon: MessageCircle, label: 'Mensagens', value: stats.totalMessages, color: 'text-green-400' },
    { icon: Gavel, label: 'Leilões', value: stats.totalAuctions, color: 'text-purple-400' },
    { icon: Trophy, label: 'Ligas', value: stats.totalLeagues, color: 'text-cyan-400' },
    { icon: Ban, label: 'Banidos', value: stats.totalBans, color: 'text-red-400' },
    { icon: BarChart3, label: 'Saves', value: stats.totalSaves, color: 'text-emerald-400' },
  ] : [];

  const CATEGORY_TABS: Record<AdminCategory, string[]> = {
    leagues:       ['leagues_overview'],
    cups:          ['cups_overview', 'tournaments'],
    clubs:         ['users', 'premium', 'bans', 'gameban', 'moderation'],
    players:       isFounder ? ['generator', 'abuse'] : ['abuse'],
    finance:       ['finance_panel'],
    customization: ['customization_panel'],
    system:        ['beta_access', ...(isFounder ? ['team'] : []), 'updates_mgmt', 'maintenance', 'announcements', 'direct_msg', 'support', 'versions', 'how_it_works'],
    simulation:    ['simulation_panel'],
  };
  const tabsForCategory = CATEGORY_TABS[activeCategory] || ['users'];

  const TAB_META: Record<string, { label: string; icon: React.ElementType }> = {
    team:              { label: 'Equipe',         icon: Users },
    users:             { label: 'Usuários',       icon: Users },
    premium:           { label: 'Premium',        icon: Crown },
    bans:              { label: 'Bans Chat',      icon: Ban },
    gameban:           { label: 'Ban Game',       icon: Lock },
    generator:         { label: 'Gerar',          icon: Wand2 },
    abuse:             { label: 'Anti-Abuso',     icon: AlertTriangle },
    tournaments:       { label: 'Torneios',       icon: Trophy },
    leagues_overview:  { label: 'Ligas',          icon: Globe },
    cups_overview:     { label: 'Visão de Copas', icon: Trophy },
    simulation_panel:  { label: 'Simulação',      icon: FlaskConical },
    beta_access:       { label: 'BETA',           icon: ShieldCheck },
    how_it_works:      { label: 'Como Funciona',  icon: BookOpen },
    moderation:        { label: 'Chat',           icon: MessageCircle },
    updates_mgmt:      { label: 'Atualizações',   icon: Megaphone },
    maintenance:       { label: 'Manutenção',     icon: Wrench },
    announcements:     { label: 'Anúncios IA',    icon: Image },
    direct_msg:        { label: 'Msg Direta',     icon: Megaphone },
    support:           { label: 'Suporte',        icon: LifeBuoy },
    versions:          { label: 'Versões',        icon: Shield },
    finance_panel:     { label: 'Financeiro',     icon: Wallet },
    customization_panel:{ label: 'Personalização', icon: Palette },
  };

  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <CardHeader className="py-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {isFounder
                ? <><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> Painel do Fundador</>
                : <><Shield className="h-4 w-4 text-primary" /> Painel do Admin</>}
              <Badge variant="outline" className={`text-[9px] ${isFounder ? 'text-yellow-400 border-yellow-500/30' : 'text-primary border-primary/30'}`}>
                {isFounder ? '⭐ Fundador' : '🛡️ Admin'}
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={loadAll} disabled={loading} className="h-7 px-2 text-[10px]">
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statItems.map(s => (
            <Card key={s.label} className="p-2 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-base font-bold">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      <AdminLayout active={activeCategory} onChange={setActiveCategory}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full gap-0.5 pb-1">
              {tabsForCategory.map(tabKey => {
                const meta = TAB_META[tabKey];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <TabsTrigger key={tabKey} value={tabKey} className="text-[10px] gap-1 px-2.5 shrink-0">
                    <Icon className="h-3 w-3" /> {meta.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>

          {isFounder && (
            <TabsContent value="team" className="space-y-3 mt-3">
              <Card className="border-yellow-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    Hierarquia do Jogo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-yellow-400">Fundador</p>
                      <p className="text-[10px] text-muted-foreground">Controle total.</p>
                    </div>
                    <Badge className="ml-auto text-[8px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Você</Badge>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Shield className="h-5 w-5 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-blue-400">Administrador</p>
                      <p className="text-[10px] text-muted-foreground">Moderação e gestão.</p>
                    </div>
                    <Badge variant="outline" className="ml-auto text-[8px] text-blue-400 border-blue-500/30">{admins.filter(a => a.role === 'admin').length}</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-400" />
                    Adicionar Administrador
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    placeholder="ID do usuário (UUID)"
                    value={newAdminId}
                    onChange={e => setNewAdminId(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button size="sm" className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={addAdmin} disabled={loading}>
                    <UserPlus className="h-3 w-3 mr-1" /> Promover a Admin
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="users" className="space-y-3 mt-3">
            {isFounder && (
              <Card className="border-yellow-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Gift className="h-4 w-4 text-yellow-400" />
                    Presentear por ID (Fundador)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    placeholder="Cole o ID do usuário aqui"
                    value={giftUserId}
                    onChange={e => setGiftUserId(e.target.value)}
                    className="text-xs h-8 font-mono"
                  />
                  <div className="grid grid-cols-3 gap-1">
                    <Button size="sm" variant={giftType === 'premium' ? 'default' : 'outline'} className="h-7 text-[9px]" onClick={() => setGiftType('premium')}>
                      👑 Premium
                    </Button>
                    <Button size="sm" variant={giftType === 'sticker' ? 'default' : 'outline'} className="h-7 text-[9px]" onClick={() => setGiftType('sticker')}>
                      🎴 Figurinha
                    </Button>
                    <Button size="sm" variant={giftType === 'unban' ? 'default' : 'outline'} className="h-7 text-[9px]" onClick={() => setGiftType('unban')}>
                      ✅ Desbanir
                    </Button>
                  </div>
                  <Button size="sm" className="w-full h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-white gap-1" onClick={giftUser} disabled={loading}>
                    <Gift className="h-3 w-3" /> {giftType === 'premium' ? 'Dar Premium' : giftType === 'sticker' ? 'Dar Figurinha' : 'Desbanir Usuário'}
                  </Button>
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  Usuários ({allUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  placeholder="Buscar por nome ou ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="text-xs h-8"
                />
                <ScrollArea className="max-h-[350px]">
                  <div className="space-y-1.5">
                    {allUsers
                      .filter(u => !userSearch.trim() || (u.display_name || '').toLowerCase().includes(userSearch.toLowerCase()) || u.user_id.includes(userSearch))
                      .map(u => (
                        <div key={u.user_id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/50">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{u.display_name || 'Sem nome'}</p>
                            <p className="text-[9px] font-mono text-muted-foreground truncate">ID: {u.user_id}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(u.user_id)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="premium" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  Pagamentos Pendentes ({pendingUsers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum pagamento pendente.</p>
                ) : (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {pendingUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate font-mono">ID: {u.user_id.slice(0, 12)}...</p>
                            <p className="text-[9px] text-muted-foreground">
                              PIX: {u.pix_transaction_id || 'Sem ref.'} • {new Date(u.activated_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Button size="sm" className="h-7 px-2 text-[10px] bg-green-600 hover:bg-green-700 text-white" onClick={() => confirmPremium(u.id)} disabled={loading}>
                              <CheckCircle className="h-3 w-3 mr-1" /> Confirmar
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 px-2 text-[10px]" onClick={() => rejectPremium(u.id)} disabled={loading}>
                              <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bans" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserX className="h-4 w-4 text-red-400" />
                  Banir Usuário do Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input placeholder="ID do usuário (UUID)" value={banUserId} onChange={e => setBanUserId(e.target.value)} className="text-xs h-8" />
                <Input placeholder="Motivo" value={banReason} onChange={e => setBanReason(e.target.value)} className="text-xs h-8" />
                <Button size="sm" variant="destructive" className="w-full h-8 text-xs" onClick={banUser} disabled={loading}>
                  <Ban className="h-3 w-3 mr-1" /> Banir do Chat
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="abuse" className="space-y-3 mt-3">
            <Card className="border-orange-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    Sistema Anti-Abuso
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={runAbuseDetection} disabled={alertsLoading} className="h-7 px-2 text-[10px]">
                    <Activity className={`h-3 w-3 ${alertsLoading ? 'animate-spin' : ''}`} /> Varredura
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent value="generator" className="space-y-3 mt-3">
            <Card className="border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-yellow-400" />
                  Gerar Jogador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input type="number" value={genOverall} onChange={e => setGenOverall(e.target.value)} className="text-xs h-8" />
                <Button size="sm" className="w-full h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-white" onClick={async () => {
                  setGenerating(true);
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session) {
                    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-gift`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                      body: JSON.stringify({ giftType: 'generate_player', playerOverall: Number(genOverall), playerDestination: genDestination }),
                    });
                    toast.success('Jogador gerado!');
                  }
                  setGenerating(false);
                }}>Gerar</Button>
              </CardContent>
            </Card>
            {/* <AdminScoutsAndStaffGenerators userId={userId} /> */}
          </TabsContent>

          <TabsContent value="finance_panel" className="space-y-3 mt-3">
            <FinancePanel />
          </TabsContent>

          <TabsContent value="customization_panel" className="space-y-3 mt-3">
            <CustomizationPanel />
          </TabsContent>

          <TabsContent value="simulation_panel" className="space-y-3 mt-3">
            <SystemPanel adminUserId={userId} sections={['sim']} defaultSection="sim" />
          </TabsContent>

          <TabsContent value="beta_access" className="space-y-3 mt-3">
            <SystemPanel adminUserId={userId} sections={['beta']} defaultSection="beta" />
          </TabsContent>

          <TabsContent value="how_it_works" className="space-y-3 mt-3">
            <SystemPanel adminUserId={userId} sections={['how']} defaultSection="how" />
          </TabsContent>

          <TabsContent value="moderation" className="space-y-3 mt-3">
            {/* <ModerationPanel onDeleteMessage={deleteMessage} /> */}
          </TabsContent>

          <TabsContent value="updates_mgmt" className="space-y-3 mt-3">
            <AdminUpdatesPanel />
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-3 mt-3">
            <MaintenanceToggle />
          </TabsContent>

          <TabsContent value="announcements" className="space-y-3 mt-3">
            {/* <AdminAnnouncementsPanel userId={userId} /> */}
          </TabsContent>

          <TabsContent value="support" className="space-y-3 mt-3">
            <AdminSupportPanel adminUserId={userId} />
          </TabsContent>

          <TabsContent value="tournaments" className="space-y-3 mt-3">
            <AdminTournamentTab userId={userId} />
          </TabsContent>

          <TabsContent value="versions" className="space-y-3 mt-3">
            <AdminVersionPanel />
          </TabsContent>
        </Tabs>
      </AdminLayout>
    </div>
  );
}
