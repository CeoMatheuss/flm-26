import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminTournamentTab } from './AdminTournamentTab';
import { AdminUpdatesPanel } from './AdminUpdatesPanel';
import { SystemPanel } from './admin/SystemPanel';
import { AdminSupportPanel } from './admin/AdminSupportPanel';
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
  BookOpen, FlaskConical, Calendar, ShieldCheck
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AdminVersionPanel } from './admin/AdminVersionPanel';
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

type ClubOption = { user_id: string; club_name: string; club_logo: string };

function AdminAddMoneyCard() {
  const [allClubs, setAllClubs] = useState<ClubOption[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ClubOption | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{ club: string; newBudget: number; delta: number } | null>(null);

  // Load all clubs once for autocomplete
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingClubs(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-clubs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ scope: 'Mundial' }),
        });
        const result = await res.json();
        if (mounted && Array.isArray(result.clubs)) setAllClubs(result.clubs);
      } catch {
        // silent — autocomplete is optional
      } finally {
        if (mounted) setLoadingClubs(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || selected?.club_name.toLowerCase() === q) return [];
    return allClubs
      .filter(c => c.club_name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, allClubs, selected]);

  const pick = (c: ClubOption) => {
    setSelected(c);
    setSearch(c.club_name);
  };

  const submit = async () => {
    if (!selected) return toast.error('Selecione um clube na busca.');
    const value = Math.trunc(Number(amount));
    if (!Number.isFinite(value) || value === 0) return toast.error('Informe um valor diferente de zero.');
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ giftType: 'add_money', targetUserId: selected.user_id, amount: value }),
      });
      const result = await res.json();
      if (result.success) {
        const delta = value;
        const newBudget = Number(result.newBudget) || 0;
        toast.success(`✅ Valor ${delta >= 0 ? 'adicionado' : 'descontado'} com sucesso ao clube ${selected.club_name}`);
        setLastResult({ club: selected.club_name, newBudget, delta });
        setAmount('');
      } else {
        toast.error(result.error || 'Falha na operação');
      }
    } catch {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-emerald-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="text-emerald-400">💰</span>
          Adicionar Dinheiro a Clube
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="relative">
          <Input
            placeholder={loadingClubs ? 'Carregando clubes…' : 'Buscar clube por nome (ex: Pal...)'}
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }}
            className="text-xs h-8"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-lg">
              {suggestions.map(c => (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => pick(c)}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted flex items-center gap-2"
                >
                  <span className="shrink-0">{c.club_logo || '⚽'}</span>
                  <span className="font-medium truncate">{c.club_name}</span>
                  <span className="ml-auto text-[9px] text-muted-foreground font-mono truncate max-w-[100px]">{c.user_id.slice(0, 8)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-base">{selected.club_logo || '⚽'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{selected.club_name}</p>
              <p className="text-[9px] text-muted-foreground font-mono truncate">{selected.user_id}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => { setSelected(null); setSearch(''); }}>
              Trocar
            </Button>
          </div>
        )}

        <Input
          type="number"
          placeholder="Valor em R$ (use negativo para descontar)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="text-xs h-8"
        />
        <p className="text-[10px] text-muted-foreground">Limite: ±R$ 1.000.000.000. A ação é registrada em admin_logs e o jogador é notificado.</p>
        <Button
          size="sm"
          className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={submit}
          disabled={busy || !selected}
        >
          {busy ? 'Processando…' : 'Confirmar'}
        </Button>

        {lastResult && (
          <div className="mt-2 p-2 rounded-md bg-muted/40 border text-[10px] space-y-0.5">
            <p className="font-semibold text-emerald-400">
              {lastResult.delta >= 0 ? '✅ Crédito aplicado' : '⚠️ Débito aplicado'}
            </p>
            <p>Clube: <span className="font-medium">{lastResult.club}</span></p>
            <p>Operação: <span className="font-mono">{lastResult.delta >= 0 ? '+' : ''}R$ {lastResult.delta.toLocaleString('pt-BR')}</span></p>
            <p>Novo saldo: <span className="font-mono font-semibold">R$ {lastResult.newBudget.toLocaleString('pt-BR')}</span></p>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
  const [customizationUserId, setCustomizationUserId] = useState('');
  const [customizationLoading, setCustomizationLoading] = useState(false);
  const [abuseAlerts, setAbuseAlerts] = useState<Array<{
    id: string; user_id: string; alert_type: string; severity: string;
    title: string; description: string; details: any; status: string;
    reviewed_by: string | null; reviewed_at: string | null; created_at: string;
  }>>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  // Player generator state
  const [genOverall, setGenOverall] = useState('60');
  const [genPosition, setGenPosition] = useState('random');
  const [genAge, setGenAge] = useState('random');
  const [genDestination, setGenDestination] = useState<'market' | 'auction'>('market');
  const estimatedPrice = useMemo(() => {
    const o = Math.max(40, Math.min(99, Number(genOverall) || 60));
    const base = o >= 85 ? o * 80000 : o >= 75 ? o * 40000 : o >= 65 ? o * 20000 : o >= 55 ? o * 10000 : o * 5000;
    return Math.floor(base * 1.3); // age 23-24 avg
  }, [genOverall]);
  const [generating, setGenerating] = useState(false);
  // Game ban state
  const [gameBanUserId, setGameBanUserId] = useState('');
  const [gameBanReason, setGameBanReason] = useState('');
  const [gameBanMonths, setGameBanMonths] = useState('1');
  const [gameBanPassword, setGameBanPassword] = useState('');
  const [gameBans, setGameBans] = useState<Array<{ id: string; user_id: string; reason: string; duration_months: number; banned_at: string; expires_at: string }>>([]);
  const [gameBanLoading, setGameBanLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('users');

  // Reset active tab when category changes
  useEffect(() => {
    const map: Record<AdminCategory, string[]> = {
      leagues:    ['system'],
      cups:       ['system', 'tournaments'],
      clubs:      ['users', 'premium', 'bans', 'gameban', 'moderation'],
      players:    isFounder ? ['generator', 'abuse'] : ['abuse'],
      system:     [...(isFounder ? ['team'] : []), 'updates_mgmt', 'announcements', 'direct_msg', 'support'],
      simulation: ['system'],
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
      toast.error('Erro ao verificar senha');
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
      // Detect suspicious auction patterns: same user bidding unusually high
      const { data: auctions } = await supabase.from('player_auctions').select('*').eq('status', 'active');
      if (auctions) {
        for (const a of auctions) {
          if (a.current_bid > a.min_price * 5 && a.current_bidder_id) {
            // Check if bidder and seller have traded before
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

      // Detect rapid trade proposals between same users
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
  }, [abuseAlerts]);

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
        else if (giftType === 'sticker') { /* sticker gift handled */ }
        else if (giftType === 'unban') loadBans();
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

  // ── Category → tab map (visible triggers) ─────────────────────
  const CATEGORY_TABS: Record<AdminCategory, string[]> = {
    leagues:    ['leagues_overview'],
    cups:       ['cups_overview', 'tournaments'],
    clubs:      ['users', 'premium', 'bans', 'gameban', 'moderation'],
    players:    isFounder ? ['generator', 'abuse'] : ['abuse'],
    system:     ['beta_access', ...(isFounder ? ['team'] : []), 'updates_mgmt', 'announcements', 'direct_msg', 'support', 'versions', 'how_it_works'],
    simulation: ['simulation_panel'],
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
    announcements:     { label: 'Anúncios IA',    icon: Image },
    direct_msg:        { label: 'Msg Direta',     icon: Megaphone },
    support:           { label: 'Suporte',        icon: LifeBuoy },
    versions:          { label: 'Versões',        icon: Shield },
  };

  return (
    <div className="space-y-3">
      {/* Header (compact) */}
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
            <Button size="sm" variant="outline" onClick={loadAll} disabled={loading} className="h-7 px-2 text-[10px]">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
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

        {/* Team/Hierarchy Tab - Founder Only */}
        {isFounder && (
          <TabsContent value="team" className="space-y-3 mt-3">
            {/* Hierarchy Info */}
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
                    <p className="text-[10px] text-muted-foreground">Controle total. Pode adicionar/remover admins, moderar tudo.</p>
                  </div>
                  <Badge className="ml-auto text-[8px] bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Você</Badge>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Shield className="h-5 w-5 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-blue-400">Administrador</p>
                    <p className="text-[10px] text-muted-foreground">Pode moderar chat, gerenciar premium e banimentos.</p>
                  </div>
                  <Badge variant="outline" className="ml-auto text-[8px] text-blue-400 border-blue-500/30">{admins.filter(a => a.role === 'admin').length}</Badge>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Jogador</p>
                    <p className="text-[10px] text-muted-foreground">Acesso normal ao jogo, sem permissões especiais.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add Admin */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-400" />
                  Adicionar Administrador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  placeholder="ID do usuário (UUID) — copie do painel de stats"
                  value={newAdminId}
                  onChange={e => setNewAdminId(e.target.value)}
                  className="text-xs h-8"
                />
                <Button size="sm" className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={addAdmin} disabled={loading}>
                  <UserPlus className="h-3 w-3 mr-1" /> Promover a Admin
                </Button>
              </CardContent>
            </Card>

            {/* Current Admins */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-400" />
                  Administradores Atuais ({admins.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {admins.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum admin além do fundador.</p>
                ) : (
                  <ScrollArea className="max-h-[250px]">
                    <div className="space-y-2">
                      {admins.map(a => {
                        const isSelf = a.user_id === userId;
                        return (
                          <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/50">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold truncate">
                                    {allUsers.find(u => u.user_id === a.user_id)?.display_name || a.user_id.slice(0, 12) + '...'}
                                  </span>
                                  {isSelf && <Badge className="text-[7px] bg-yellow-500/20 text-yellow-400 px-1">Você</Badge>}
                                </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge variant="outline" className={`text-[8px] ${
                                  a.role === 'admin' ? 'text-blue-400 border-blue-500/30' :
                                  a.role === 'moderator' ? 'text-green-400 border-green-500/30' :
                                  'text-muted-foreground'
                                }`}>
                                  {a.role === 'admin' ? '🛡️ Admin' : a.role === 'moderator' ? '🔧 Mod' : '👤 User'}
                                </Badge>
                                <span className="text-[8px] text-muted-foreground">
                                  Desde {new Date(a.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </div>
                            {!isSelf && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-[9px] border-red-500/30 text-red-400 hover:bg-red-500/10"
                                onClick={() => removeAdmin(a.id, a.user_id)}
                                disabled={loading}
                              >
                                <XCircle className="h-3 w-3 mr-1" /> Remover
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-3 mt-3">
          {/* Gift section - Founder Only */}
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

          {/* Adicionar Dinheiro a qualquer clube — admin */}
          <AdminAddMoneyCard />

          {/* Customization Unlock - any admin */}
          <Card className="border-amber-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Liberar Personalização (R$ 10)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-[10px] text-muted-foreground">
                Cole o ID do usuário que pagou para desbloquear edição de nome do clube, estádio e escudo.
              </p>
              <Input
                placeholder="Cole o ID do usuário aqui"
                value={customizationUserId}
                onChange={e => setCustomizationUserId(e.target.value)}
                className="text-xs h-8 font-mono"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black gap-1"
                  disabled={customizationLoading || !customizationUserId.trim()}
                  onClick={async () => {
                    setCustomizationLoading(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) { toast.error('Sessão expirada'); setCustomizationLoading(false); return; }
                      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-grant-customization`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                        body: JSON.stringify({ targetUserId: customizationUserId.trim(), grant: true }),
                      });
                      const result = await res.json();
                      if (result.success) {
                        toast.success(`✅ ${result.message}`);
                        setCustomizationUserId('');
                      } else {
                        toast.error(result.error || 'Erro');
                      }
                    } catch {
                      toast.error('Erro ao liberar');
                    }
                    setCustomizationLoading(false);
                  }}
                >
                  <CheckCircle className="h-3 w-3" /> Liberar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1"
                  disabled={customizationLoading || !customizationUserId.trim()}
                  onClick={async () => {
                    setCustomizationLoading(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) { toast.error('Sessão expirada'); setCustomizationLoading(false); return; }
                      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-grant-customization`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                        body: JSON.stringify({ targetUserId: customizationUserId.trim(), grant: false }),
                      });
                      const result = await res.json();
                      if (result.success) {
                        toast.success(`Bloqueado: ${result.message}`);
                        setCustomizationUserId('');
                      } else {
                        toast.error(result.error || 'Erro');
                      }
                    } catch {
                      toast.error('Erro');
                    }
                    setCustomizationLoading(false);
                  }}
                >
                  <Lock className="h-3 w-3" /> Bloquear
                </Button>
              </div>
            </CardContent>
          </Card>

          {!isFounder && (
            <Card className="border-muted/30">
              <CardContent className="p-4 text-center">
                <Gift className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Somente o Fundador pode dar presentes.</p>
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
                          <p className="text-[8px] text-muted-foreground">Desde {new Date(u.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(u.user_id)} title="Copiar ID">
                            <Copy className="h-3 w-3" />
                          </Button>
                          {isFounder && (
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[8px] border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10" onClick={() => setGiftUserId(u.user_id)}>
                              <Gift className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Premium Tab */}
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-400" />
                Todos os Premium ({allPremium.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {allPremium.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário premium ainda.</p>
              ) : (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1">
                    {allPremium.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2 rounded bg-muted/20">
                        <span className="text-[10px] font-mono truncate">{u.user_id.slice(0, 16)}...</span>
                        <Badge variant="outline" className={`text-[8px] ${
                          u.status === 'active' ? 'text-green-400 border-green-500/30' :
                          u.status === 'pending' ? 'text-yellow-400 border-yellow-500/30' :
                          'text-red-400 border-red-500/30'
                        }`}>
                          {u.status === 'active' ? '✅ Ativo' : u.status === 'pending' ? '⏳ Pendente' : '❌ Rejeitado'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bans Tab */}
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
              <Input placeholder="Motivo (opcional)" value={banReason} onChange={e => setBanReason(e.target.value)} className="text-xs h-8" />
              <Button size="sm" variant="destructive" className="w-full h-8 text-xs" onClick={banUser} disabled={loading}>
                <Ban className="h-3 w-3 mr-1" /> Banir do Chat
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-400" />
                Usuários Banidos ({bans.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bans.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum usuário banido.</p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {bans.map(b => (
                      <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono truncate">{b.user_id.slice(0, 16)}...</p>
                          <p className="text-[9px] text-muted-foreground">
                            {b.reason || 'Sem motivo'} • {new Date(b.banned_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-[9px] border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => unbanUser(b.id)} disabled={loading}>
                          <CheckCircle className="h-3 w-3 mr-1" /> Desbanir
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Abuse Detection Tab */}
        <TabsContent value="abuse" className="space-y-3 mt-3">
          <Card className="border-orange-500/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" />
                  Sistema Anti-Abuso
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={runAbuseDetection} disabled={alertsLoading} className="h-7 px-2 text-[10px] gap-1">
                    <Activity className={`h-3 w-3 ${alertsLoading ? 'animate-spin' : ''}`} /> Varredura
                  </Button>
                  <Button size="sm" variant="outline" onClick={loadAbuseAlerts} disabled={alertsLoading} className="h-7 px-2 text-[10px]">
                    <RefreshCw className={`h-3 w-3 ${alertsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Detecta transferências anormais, lances suspeitos e manipulações entre clubes.</p>
            </CardHeader>
          </Card>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="p-2 text-center border-red-500/20">
              <p className="text-lg font-bold text-red-400">{abuseAlerts.filter(a => a.severity === 'high' && a.status === 'pending').length}</p>
              <p className="text-[9px] text-muted-foreground">Alta Prioridade</p>
            </Card>
            <Card className="p-2 text-center border-orange-500/20">
              <p className="text-lg font-bold text-orange-400">{abuseAlerts.filter(a => a.status === 'pending').length}</p>
              <p className="text-[9px] text-muted-foreground">Pendentes</p>
            </Card>
            <Card className="p-2 text-center border-green-500/20">
              <p className="text-lg font-bold text-green-400">{abuseAlerts.filter(a => a.status === 'reviewed').length}</p>
              <p className="text-[9px] text-muted-foreground">Revisados</p>
            </Card>
          </div>

          {/* Alerts list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                Alertas ({abuseAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {abuseAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-6 w-6 mx-auto text-green-400 mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhum alerta de abuso. Execute uma varredura para verificar.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {abuseAlerts.map(alert => (
                      <div key={alert.id} className={`p-3 rounded-lg border ${
                        alert.severity === 'high' ? 'border-red-500/30 bg-red-500/5' :
                        alert.severity === 'medium' ? 'border-orange-500/30 bg-orange-500/5' :
                        'border-yellow-500/30 bg-yellow-500/5'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge variant="outline" className={`text-[8px] ${
                                alert.severity === 'high' ? 'text-red-400 border-red-500/30' :
                                alert.severity === 'medium' ? 'text-orange-400 border-orange-500/30' :
                                'text-yellow-400 border-yellow-500/30'
                              }`}>
                                {alert.severity === 'high' ? '🔴 ALTO' : alert.severity === 'medium' ? '🟠 MÉDIO' : '🟡 BAIXO'}
                              </Badge>
                              <Badge variant="outline" className="text-[8px]">
                                {alert.alert_type === 'suspicious_transfer' ? '💱 Transferência' :
                                 alert.alert_type === 'suspicious_auction' ? '🔨 Leilão' :
                                 alert.alert_type === 'salary_manipulation' ? '💰 Salário' : '⚠️ Outro'}
                              </Badge>
                              <Badge variant="outline" className={`text-[8px] ${
                                alert.status === 'pending' ? 'text-yellow-400 border-yellow-500/30' :
                                alert.status === 'reviewed' ? 'text-green-400 border-green-500/30' :
                                'text-muted-foreground'
                              }`}>
                                {alert.status === 'pending' ? '⏳ Pendente' : alert.status === 'reviewed' ? '✅ Revisado' : '🚫 Descartado'}
                              </Badge>
                            </div>
                            <p className="text-xs font-semibold">{alert.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{alert.description}</p>
                            <p className="text-[9px] font-mono text-muted-foreground mt-1">
                              ID: {alert.user_id.slice(0, 12)}... • {new Date(alert.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          {alert.status === 'pending' && (
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button size="sm" variant="outline" className="h-6 px-2 text-[9px] border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={() => reviewAlert(alert.id, 'reviewed')}>
                                <Eye className="h-3 w-3 mr-1" /> Revisar
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 px-2 text-[9px] border-muted text-muted-foreground hover:bg-muted/20" onClick={() => reviewAlert(alert.id, 'dismissed')}>
                                <EyeOff className="h-3 w-3 mr-1" /> Descartar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Game Ban Tab */}
        <TabsContent value="gameban" className="space-y-3 mt-3">
          <Card className="border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-400" />
                Banir do Jogo (por meses)
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Bane completamente um jogador do game por X meses. Requer senha especial.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input placeholder="ID do usuário (UUID)" value={gameBanUserId} onChange={e => setGameBanUserId(e.target.value)} className="text-xs h-8 font-mono" />
              <Input placeholder="Motivo do banimento" value={gameBanReason} onChange={e => setGameBanReason(e.target.value)} className="text-xs h-8" maxLength={500} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-muted-foreground">Meses</label>
                  <Select value={gameBanMonths} onValueChange={setGameBanMonths}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 6, 12, 24, 36, 60].map(m => (
                        <SelectItem key={m} value={String(m)} className="text-xs">{m} {m === 1 ? 'mês' : 'meses'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[9px] text-muted-foreground">Senha de Ban</label>
                  <Input type="password" placeholder="Senha BAN" value={gameBanPassword} onChange={e => setGameBanPassword(e.target.value)} className="text-xs h-8" />
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full h-8 text-xs gap-1"
                disabled={gameBanLoading || !gameBanUserId.trim() || !gameBanPassword.trim()}
                onClick={async () => {
                  setGameBanLoading(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) { toast.error('Sessão expirada'); setGameBanLoading(false); return; }
                    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-gift`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                      body: JSON.stringify({
                        giftType: 'game_ban',
                        targetUserId: gameBanUserId.trim(),
                        banPassword: gameBanPassword,
                        banReason: gameBanReason.trim(),
                        banMonths: Number(gameBanMonths),
                      }),
                    });
                    const result = await res.json();
                    if (result.success) {
                      toast.success(`🔒 ${result.message}`);
                      setGameBanUserId(''); setGameBanReason(''); setGameBanPassword('');
                      loadGameBans();
                    } else {
                      toast.error(result.error || 'Erro ao banir');
                    }
                  } catch { toast.error('Erro ao processar banimento'); }
                  setGameBanLoading(false);
                }}
              >
                <Lock className="h-3 w-3" /> Banir do Jogo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-400" />
                  Jogadores Banidos do Game ({gameBans.length})
                </CardTitle>
                <Button size="sm" variant="outline" onClick={loadGameBans} disabled={gameBanLoading} className="h-6 px-2 text-[9px]">
                  <RefreshCw className={`h-3 w-3 ${gameBanLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {gameBans.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum jogador banido do game.</p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {gameBans.map(b => {
                      const expired = new Date(b.expires_at) < new Date();
                      return (
                        <div key={b.id} className={`flex items-center justify-between p-2.5 rounded-lg border ${expired ? 'border-muted bg-muted/10' : 'border-red-500/20 bg-red-500/5'}`}>
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono truncate">{b.user_id.slice(0, 16)}...</p>
                            <p className="text-[9px] text-muted-foreground">
                              {b.reason || 'Sem motivo'} • {b.duration_months} {b.duration_months === 1 ? 'mês' : 'meses'}
                            </p>
                            <p className="text-[8px] text-muted-foreground">
                              Até {new Date(b.expires_at).toLocaleDateString('pt-BR')} {expired ? '(Expirado)' : ''}
                            </p>
                          </div>
                          <Button
                            size="sm" variant="outline"
                            className="h-6 px-2 text-[9px] border-green-500/30 text-green-400 hover:bg-green-500/10"
                            onClick={async () => {
                              await supabase.from('game_bans').delete().eq('id', b.id);
                              toast.success('Ban removido!');
                              loadGameBans();
                            }}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Remover
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Player Generator Tab - Founder Only */}
        {isFounder && (
          <TabsContent value="generator" className="space-y-3 mt-3">
            <Card className="border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-yellow-400" />
                  Gerar Jogador
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">Gere um jogador com OVR específico e coloque no mercado ou leilão.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-muted-foreground">Overall (40-99)</label>
                    <Input type="number" min="40" max="99" value={genOverall} onChange={e => setGenOverall(e.target.value)} className="text-xs h-8" />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Posição</label>
                    <Select value={genPosition} onValueChange={setGenPosition}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random" className="text-xs">🎲 Aleatória</SelectItem>
                        <SelectItem value="GOL" className="text-xs">🧤 GOL</SelectItem>
                        <SelectItem value="ZAG" className="text-xs">🛡️ ZAG</SelectItem>
                        <SelectItem value="LAT" className="text-xs">🏃 LAT</SelectItem>
                        <SelectItem value="VOL" className="text-xs">⚙️ VOL</SelectItem>
                        <SelectItem value="MEI" className="text-xs">🎯 MEI</SelectItem>
                        <SelectItem value="ATA" className="text-xs">⚽ ATA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Idade</label>
                    <Select value={genAge} onValueChange={setGenAge}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random" className="text-xs">🎲 Aleatória</SelectItem>
                        {Array.from({ length: 23 }, (_, i) => i + 16).map(age => (
                          <SelectItem key={age} value={String(age)} className="text-xs">{age} anos</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-muted-foreground">Destino</label>
                    <Select value={genDestination} onValueChange={(v) => setGenDestination(v as 'market' | 'auction')}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market" className="text-xs">🏪 Mercado</SelectItem>
                        <SelectItem value="auction" className="text-xs">🔨 Leilão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground">Valor estimado:</span>
                      <span className="text-xs font-bold text-yellow-400">R${estimatedPrice.toLocaleString('pt-BR')}</span>
                    </div>
                </div>
                <Button
                  size="sm"
                  className="w-full h-8 text-xs gap-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                  disabled={generating}
                  onClick={async () => {
                    setGenerating(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) { toast.error('Sessão expirada'); setGenerating(false); return; }
                      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-gift`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                      body: JSON.stringify({
                          giftType: 'generate_player',
                          playerOverall: Number(genOverall),
                          playerPosition: genPosition === 'random' ? undefined : genPosition,
                          playerAge: genAge === 'random' ? undefined : Number(genAge),
                          playerDestination: genDestination,
                        }),
                      });
                      const result = await res.json();
                      if (result.success) {
                        toast.success(`⚡ ${result.message}`);
                      } else {
                        toast.error(result.error || 'Erro ao gerar jogador');
                      }
                    } catch { toast.error('Erro ao gerar jogador'); }
                    setGenerating(false);
                  }}
                >
                  <Wand2 className="h-3 w-3" /> {generating ? 'Gerando...' : 'Gerar e Colocar'}
                </Button>
              </CardContent>
            </Card>

            {/* Scout Generator (global market) */}
            <AdminScoutsAndStaffGenerators userId={userId} />
          </TabsContent>
        )}

        {/* Tournaments Tab */}
        <TabsContent value="tournaments" className="space-y-3 mt-3">
          <AdminTournamentTab userId={userId} />
        </TabsContent>

        {/* Categoria: Ligas */}
        <TabsContent value="leagues_overview" className="space-y-3 mt-3">
          <SystemPanel adminUserId={userId} sections={['preview', 'pyramid', 'season']} defaultSection="preview" />
        </TabsContent>

        {/* Categoria: Copas (visão geral) */}
        <TabsContent value="cups_overview" className="space-y-3 mt-3">
          <SystemPanel adminUserId={userId} sections={['cups']} defaultSection="cups" />
        </TabsContent>

        {/* Categoria: Simulação */}
        <TabsContent value="simulation_panel" className="space-y-3 mt-3">
          <SystemPanel adminUserId={userId} sections={['sim']} defaultSection="sim" />
        </TabsContent>

        {/* Categoria: Sistema → BETA */}
        <TabsContent value="beta_access" className="space-y-3 mt-3">
          <SystemPanel adminUserId={userId} sections={['beta']} defaultSection="beta" />
        </TabsContent>

        {/* Categoria: Sistema → Como Funciona */}
        <TabsContent value="how_it_works" className="space-y-3 mt-3">
          <SystemPanel adminUserId={userId} sections={['how']} defaultSection="how" />
        </TabsContent>

        {/* Moderation Tab */}
        <TabsContent value="moderation" className="space-y-3 mt-3">
          <ModerationPanel onDeleteMessage={deleteMessage} />
        </TabsContent>

        {/* Updates Management Tab */}
        <TabsContent value="updates_mgmt" className="space-y-3 mt-3">
          <AdminUpdatesPanel userId={userId} />
        </TabsContent>

        {/* Announcements with AI Tab */}
        <TabsContent value="announcements" className="space-y-3 mt-3">
          <AdminAnnouncementsPanel userId={userId} />
        </TabsContent>

        {/* Direct Message Tab */}
        <TabsContent value="direct_msg" className="space-y-3 mt-3">
          <AdminDirectMessagePanel allUsers={allUsers} />
        </TabsContent>

        {/* Support Tickets Tab */}
        <TabsContent value="support" className="space-y-3 mt-3">
          <AdminSupportPanel adminUserId={userId} />
        </TabsContent>

        {/* Versioning & Anti-exploit */}
        <TabsContent value="versions" className="space-y-3 mt-3">
          <AdminVersionPanel />
        </TabsContent>
      </Tabs>
      </AdminLayout>
    </div>
  );
}

function AdminDirectMessagePanel({ allUsers }: { allUsers: Array<{ user_id: string; display_name: string | null; created_at: string }> }) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ user_id: string; club_name: string; display_name: string } | null>(null);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgIcon, setMsgIcon] = useState('📩');
  const [sending, setSending] = useState(false);
  const [clubUsers, setClubUsers] = useState<Array<{ user_id: string; club_name: string; display_name: string }>>([]);
  const [searching, setSearching] = useState(false);

  const searchUsers = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const { data: saves } = await supabase.from('game_saves').select('user_id, club_data').limit(200);
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').limit(200);
      
      const profileMap: Record<string, string> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p.display_name || 'Manager'; });
      
      const results: Array<{ user_id: string; club_name: string; display_name: string }> = [];
      (saves || []).forEach(s => {
        const cd = s.club_data as any;
        const clubName = cd?.club?.name || cd?.name || 'Sem nome';
        const displayName = profileMap[s.user_id] || 'Manager';
        if (clubName.toLowerCase().includes(search.toLowerCase()) || displayName.toLowerCase().includes(search.toLowerCase())) {
          results.push({ user_id: s.user_id, club_name: clubName, display_name: displayName });
        }
      });
      setClubUsers(results);
    } catch { toast.error('Erro ao buscar'); }
    setSearching(false);
  };

  const sendMessage = async () => {
    if (!selectedUser) return toast.error('Selecione um jogador');
    if (!msgTitle.trim() || !msgBody.trim()) return toast.error('Preencha título e mensagem');
    setSending(true);
    try {
      const { error } = await supabase.from('user_notifications').insert([{
        user_id: selectedUser.user_id,
        icon: msgIcon,
        title: msgTitle,
        message: msgBody,
        type: 'info',
      }]);
      if (error) throw error;
      toast.success(`Mensagem enviada para ${selectedUser.club_name}!`);
      setMsgTitle(''); setMsgBody(''); setSelectedUser(null);
    } catch (err: any) { toast.error(err.message || 'Erro ao enviar'); }
    setSending(false);
  };

  const icons = ['📩', '⚠️', '🎁', '🏆', '📢', '💰', '⚽', '🔔', '❗', '🎉'];

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Mensagem Direta para Jogador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por nome do clube ou manager..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUsers()}
            className="text-xs h-8"
          />
          <Button size="sm" onClick={searchUsers} disabled={searching} className="h-8 px-3 text-xs shrink-0">
            {searching ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Buscar'}
          </Button>
        </div>

        {/* Results */}
        {clubUsers.length > 0 && (
          <ScrollArea className="max-h-[150px]">
            <div className="space-y-1">
              {clubUsers.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs flex items-center justify-between transition-colors ${
                    selectedUser?.user_id === u.user_id ? 'bg-primary/20 border border-primary/40' : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div>
                    <span className="font-semibold">{u.club_name}</span>
                    <span className="text-muted-foreground ml-2">({u.display_name})</span>
                  </div>
                  {selectedUser?.user_id === u.user_id && <CheckCircle className="h-3 w-3 text-primary" />}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedUser && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-primary/10">
            <p className="text-xs text-muted-foreground">
              Enviando para: <span className="font-semibold text-foreground">{selectedUser.club_name}</span> ({selectedUser.display_name})
            </p>

            {/* Icon selector */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-muted-foreground mr-1">Ícone:</span>
              {icons.map(ic => (
                <button
                  key={ic}
                  onClick={() => setMsgIcon(ic)}
                  className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-colors ${
                    msgIcon === ic ? 'bg-primary/20 ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>

            <Input
              placeholder="Título da mensagem"
              value={msgTitle}
              onChange={e => setMsgTitle(e.target.value)}
              className="text-xs h-8"
            />
            <Textarea
              placeholder="Corpo da mensagem..."
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
              className="text-xs min-h-[60px]"
            />
            <Button size="sm" onClick={sendMessage} disabled={sending} className="w-full text-xs">
              {sending ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Megaphone className="h-3 w-3 mr-1" />}
              Enviar Notificação
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminAnnouncementsPanel({ userId }: { userId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const generateImage = async () => {
    if (!title.trim()) return toast.error('Digite um título para gerar a imagem');
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); setGenerating(false); return; }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-announcement-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt: `${title}. ${description}` }),
      });
      const result = await res.json();
      if (result.success && result.imageUrl) {
        setImageUrl(result.imageUrl);
        toast.success('🎨 Imagem gerada com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao gerar imagem');
      }
    } catch {
      toast.error('Erro ao gerar imagem');
    }
    setGenerating(false);
  };

  const publishAnnouncement = async () => {
    if (!title.trim()) return toast.error('Título obrigatório');
    setPublishing(true);
    const { error } = await supabase.from('game_updates').insert([{
      title,
      description: description || title,
      version: new Date().toISOString().split('T')[0],
      author_id: userId,
      status: 'published',
      published_at: new Date().toISOString(),
      features: [title],
      fixes: [],
      ai_summary: imageUrl ? 'Imagem gerada por IA' : null,
    }]);
    if (error) toast.error('Erro ao publicar: ' + error.message);
    else {
      toast.success('📢 Anúncio publicado para todos os jogadores!');
      setTitle('');
      setDescription('');
      setImageUrl('');
    }
    setPublishing(false);
  };

  return (
    <div className="space-y-3">
      <Card className="border-purple-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Image className="h-4 w-4 text-purple-400" />
            Criar Anúncio com IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground">Título do Anúncio</label>
            <Input placeholder="Ex: Nova temporada chegando!" value={title} onChange={e => setTitle(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground">Descrição</label>
            <Textarea placeholder="Detalhes do anúncio..." value={description} onChange={e => setDescription(e.target.value)} className="text-xs min-h-[60px]" />
          </div>

          <Button size="sm" variant="outline" onClick={generateImage} disabled={generating} className="w-full h-8 text-xs gap-1 border-purple-500/30 text-purple-400">
            <Wand2 className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Gerando imagem...' : '🎨 Gerar Imagem com IA'}
          </Button>

          {imageUrl && (
            <div className="rounded-lg overflow-hidden border border-border/30">
              <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover" />
              <p className="text-[9px] text-muted-foreground text-center py-1">Preview da imagem gerada</p>
            </div>
          )}

          <Button onClick={publishAnnouncement} disabled={publishing || !title.trim()} className="w-full h-9 text-xs font-bold gap-1">
            <Megaphone className="h-3 w-3" />
            {publishing ? 'Publicando...' : '📢 Publicar Anúncio'}
          </Button>
        </CardContent>
      </Card>

      {/* Maintenance channel controls */}
      <Card className="border-orange-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-orange-400" />
            Controle de Canais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[10px] text-muted-foreground">Bloquear/desbloquear acesso ao jogo para manutenção.</p>
          <MaintenanceToggle userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}

function MaintenanceToggle({ userId }: { userId: string }) {
  const [active, setActive] = useState(false);
  const [blockedTabs, setBlockedTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const allTabs = [
    { key: 'market', label: 'Mercado', icon: '🏪' },
    { key: 'training', label: 'Treinos', icon: '🏋️' },
    { key: 'league', label: 'Liga', icon: '🏆' },
    { key: 'chat', label: 'Chat Global', icon: '💬' },
    { key: 'auction', label: 'Leilão', icon: '🔨' },
    { key: 'matches', label: 'Partidas', icon: '⚽' },
    { key: 'tactics', label: 'Táticas', icon: '📋' },
    { key: 'sponsors', label: 'Patrocínios', icon: '💰' },
    { key: 'youth', label: 'Base', icon: '🌱' },
    { key: 'scouts', label: 'Olheiros', icon: '🔍' },
    { key: 'pacotinhos', label: 'Pacotinhos', icon: '🎁' },
    { key: 'calendar', label: 'Calendário', icon: '📅' },
  ];

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'maintenance_mode').maybeSingle();
      if (data?.value) {
        const val = data.value as any;
        setActive(val.active === true);
        setBlockedTabs(val.blocked_tabs || []);
      }
      setLoading(false);
    };
    check();
  }, []);

  const save = async (newActive: boolean, newBlocked: string[]) => {
    setLoading(true);
    const { error } = await supabase.from('system_settings').upsert({
      key: 'maintenance_mode',
      value: { active: newActive, blocked_tabs: newBlocked } as any,
      updated_by: userId,
    });
    if (error) toast.error('Erro: ' + error.message);
    else {
      setActive(newActive);
      setBlockedTabs(newBlocked);
      toast.success(newActive ? '🔒 Manutenção total ativada' : newBlocked.length > 0 ? `🔒 ${newBlocked.length} abas bloqueadas` : '🔓 Jogo totalmente liberado');
    }
    setLoading(false);
  };

  const toggleTab = (key: string) => {
    const newBlocked = blockedTabs.includes(key) ? blockedTabs.filter(t => t !== key) : [...blockedTabs, key];
    save(active, newBlocked);
  };

  const selectAll = () => save(active, allTabs.map(t => t.key));
  const clearAll = () => save(active, []);

  return (
    <div className="space-y-3">
      {/* Global toggle */}
      <div className="flex items-center justify-between p-2.5 rounded-lg border border-orange-500/30 bg-orange-500/5">
        <div>
          <p className="text-xs font-semibold">Manutenção Total</p>
          <p className="text-[9px] text-muted-foreground">Bloqueia TODO o jogo para não-admins</p>
        </div>
        <Button
          size="sm"
          variant={active ? 'destructive' : 'outline'}
          className="h-7 text-[10px] gap-1"
          onClick={() => save(!active, blockedTabs)}
          disabled={loading}
        >
          {active ? '🔓 Desativar' : '🔒 Ativar'}
        </Button>
      </div>

      {/* Per-tab controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted-foreground">Bloqueio por Aba</p>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-[8px] px-1.5">{blockedTabs.length}/{allTabs.length}</Badge>
            <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[8px]" onClick={selectAll} disabled={loading}>Todas</Button>
            <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[8px]" onClick={clearAll} disabled={loading}>Limpar</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {allTabs.map(tab => {
            const isBlocked = blockedTabs.includes(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => toggleTab(tab.key)}
                disabled={loading}
                className={`flex items-center gap-1.5 p-2 rounded-md border text-left transition-colors text-[10px] ${
                  isBlocked
                    ? 'border-red-500/40 bg-red-500/10 text-red-400'
                    : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="font-medium truncate">{tab.label}</span>
                {isBlocked && <Lock className="h-3 w-3 ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
        <p className="text-[8px] text-muted-foreground/60 text-center">Abas bloqueadas mostram mensagem de manutenção para jogadores. Admins têm acesso total.</p>
      </div>
    </div>
  );
}

function ModerationPanel({ onDeleteMessage }: { onDeleteMessage: (id: string) => Promise<void> }) {
  const [messages, setMessages] = useState<Array<{ id: string; content: string; sender_name: string; created_at: string; user_id: string }>>([]);
  const [loading, setLoading] = useState(false);

  const loadMessages = async () => {
    setLoading(true);
    const { data } = await supabase.from('global_chat_messages').select('*').order('created_at', { ascending: false }).limit(50);
    if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => { loadMessages(); }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-blue-400" />
            Últimas Mensagens do Chat Global
          </CardTitle>
          <Button size="sm" variant="outline" onClick={loadMessages} disabled={loading} className="h-6 px-2 text-[9px]">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhuma mensagem.</p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1.5">
              {messages.map(m => (
                <div key={m.id} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/20 group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-primary">{m.sender_name}</span>
                      <span className="text-[8px] text-muted-foreground">{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground break-words">{m.content}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                    onClick={async () => { await onDeleteMessage(m.id); loadMessages(); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Scouts & Staff Generators (admin patches game_saves directly) ─────────────
function AdminScoutsAndStaffGenerators({ userId: _userId }: { userId: string }) {
  const [targetUserId, setTargetUserId] = useState('');
  const [scoutCount, setScoutCount] = useState('1');
  const [scoutSkill, setScoutSkill] = useState('5');
  const [busy, setBusy] = useState(false);

  const patchClubData = async (
    target: string,
    mutate: (cd: any) => any,
  ): Promise<{ ok: boolean; error?: string }> => {
    const trimmed = target.trim();
    if (!trimmed) return { ok: false, error: 'Informe o user_id alvo' };
    const { data, error } = await supabase
      .from('game_saves')
      .select('id, club_data')
      .eq('user_id', trimmed)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: 'Save não encontrado para este user_id' };
    const next = mutate(data.club_data || {});
    const { error: upErr } = await supabase
      .from('game_saves')
      .update({ club_data: next })
      .eq('id', data.id);
    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true };
  };

  const generateScoutsForTarget = async () => {
    setBusy(true);
    const count = Math.max(1, Math.min(20, Number(scoutCount) || 1));
    const skill = Math.max(1, Math.min(10, Number(scoutSkill) || 5));
    const names = ['Carlos', 'Pedro', 'João', 'Rafael', 'Bruno', 'Eduardo', 'Henrique', 'Marcos', 'Felipe', 'Gustavo'];
    const surnames = ['Silva', 'Souza', 'Costa', 'Lima', 'Pereira', 'Oliveira', 'Santos', 'Ferreira'];
    const newScouts = Array.from({ length: count }, () => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `${names[Math.floor(Math.random() * names.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`,
      skill,
      salary: skill * 12000,
      contract: 2,
    }));
    const res = await patchClubData(targetUserId, (cd) => {
      const club = cd.club || cd;
      const updated = {
        ...club,
        availableScouts: [...(club.availableScouts || []), ...newScouts].slice(-20),
        lastScoutGeneratedAt: new Date().toISOString(),
      };
      return cd.club ? { ...cd, club: updated } : updated;
    });
    if (res.ok) toast.success(`✅ ${count} olheiro(s) skill ${skill} adicionado(s)!`);
    else toast.error(`Erro: ${res.error}`);
    setBusy(false);
  };

  const generateStaffForTarget = async () => {
    setBusy(true);
    const names = ['Carlos Mendes', 'Ricardo Souza', 'Fernando Lima', 'André Santos', 'Paulo Costa', 'Marcos Silva', 'João Ferreira', 'Pedro Almeida', 'Luis Gomes', 'Felipe Rocha'];
    const make = (role: 'assistente' | 'medico' | 'preparador_fisico', count: number) =>
      Array.from({ length: count }, () => {
        const skill = Math.floor(Math.random() * 7) + 3;
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: names[Math.floor(Math.random() * names.length)],
          role,
          skill,
          salary: skill * 18000,
          contract: 2,
        };
      });
    const market = [...make('assistente', 5), ...make('medico', 2), ...make('preparador_fisico', 2)];
    const res = await patchClubData(targetUserId, (cd) => {
      const club = cd.club || cd;
      const updated = {
        ...club,
        staffMarket: market,
        lastStaffMarketRefreshAt: new Date().toISOString(),
      };
      return cd.club ? { ...cd, club: updated } : updated;
    });
    if (res.ok) toast.success(`✅ Mercado de staff gerado (5 assistentes, 2 médicos, 2 preparadores)!`);
    else toast.error(`Erro: ${res.error}`);
    setBusy(false);
  };

  return (
    <Card className="border-emerald-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-emerald-400" />
          Geradores de Olheiros & Staff
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Cole o user_id alvo e gere itens diretamente no save dele.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="user_id (UUID) do clube alvo"
          value={targetUserId}
          onChange={(e) => setTargetUserId(e.target.value)}
          className="text-xs h-8 font-mono"
        />

        <div className="space-y-2 p-2 rounded-md border border-border/40 bg-muted/10">
          <p className="text-[11px] font-semibold flex items-center gap-1">🔍 Gerar Olheiros</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-muted-foreground">Quantidade (1-20)</label>
              <Input type="number" min="1" max="20" value={scoutCount} onChange={(e) => setScoutCount(e.target.value)} className="text-xs h-8" />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground">Skill (1-10)</label>
              <Input type="number" min="1" max="10" value={scoutSkill} onChange={(e) => setScoutSkill(e.target.value)} className="text-xs h-8" />
            </div>
          </div>
          <Button size="sm" disabled={busy} onClick={generateScoutsForTarget} className="w-full h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            🔍 Gerar Olheiros
          </Button>
        </div>

        <div className="space-y-2 p-2 rounded-md border border-border/40 bg-muted/10">
          <p className="text-[11px] font-semibold flex items-center gap-1">👨‍💼 Gerar Equipe Técnica</p>
          <p className="text-[10px] text-muted-foreground">Cria 5 assistentes, 2 médicos e 2 preparadores no mercado.</p>
          <Button size="sm" disabled={busy} onClick={generateStaffForTarget} className="w-full h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            👨‍💼 Gerar Staff
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
