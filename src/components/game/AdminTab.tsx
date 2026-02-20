import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield, CheckCircle, XCircle, Crown, Users, Clock, MessageCircle,
  Ban, RefreshCw, Trash2, Trophy, Gavel, BarChart3, UserX, UserPlus, Star, Gift, Copy
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [giftType, setGiftType] = useState<'premium' | 'moderator' | 'unban'>('premium');

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

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPremiumUsers(), loadBans(), loadStats(), loadAdmins(), loadUsers()]);
    setLoading(false);
  }, []);

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
        else if (giftType === 'moderator') loadAdmins();
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-red-500/30 bg-gradient-to-r from-red-500/5 via-orange-500/5 to-yellow-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              {isFounder ? (
                <><Star className="h-5 w-5 text-yellow-400 fill-yellow-400" /> Painel do Fundador</>
              ) : (
                <><Shield className="h-5 w-5 text-red-400" /> Painel do Administrador</>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[9px] ${isFounder ? 'text-yellow-400 border-yellow-500/30' : 'text-blue-400 border-blue-500/30'}`}>
                {isFounder ? '⭐ Fundador' : '🛡️ Admin'}
              </Badge>
              <Button size="sm" variant="outline" onClick={loadAll} disabled={loading} className="h-7 px-2 text-[10px]">
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {isFounder
              ? 'Controle total do jogo. Gerencie admins, pagamentos, banimentos e moderação.'
              : 'Gerencie pagamentos, banimentos e moderação do chat.'}
          </p>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {statItems.map(s => (
            <Card key={s.label} className="p-2 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Admin Tabs */}
      <Tabs defaultValue={isFounder ? 'team' : 'users'} className="w-full">
        <TabsList className={`grid w-full ${isFounder ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {isFounder && <TabsTrigger value="team" className="text-xs gap-1"><Users className="h-3 w-3" /> Equipe</TabsTrigger>}
          <TabsTrigger value="users" className="text-xs gap-1"><Users className="h-3 w-3" /> Usuários</TabsTrigger>
          <TabsTrigger value="premium" className="text-xs gap-1"><Crown className="h-3 w-3" /> Premium</TabsTrigger>
          <TabsTrigger value="bans" className="text-xs gap-1"><Ban className="h-3 w-3" /> Bans</TabsTrigger>
          <TabsTrigger value="moderation" className="text-xs gap-1"><MessageCircle className="h-3 w-3" /> Chat</TabsTrigger>
        </TabsList>

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
                                <span className="text-[10px] font-mono truncate">{a.user_id.slice(0, 16)}...</span>
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
                  <Button size="sm" variant={giftType === 'moderator' ? 'default' : 'outline'} className="h-7 text-[9px]" onClick={() => setGiftType('moderator')}>
                    🔧 Moderador
                  </Button>
                  <Button size="sm" variant={giftType === 'unban' ? 'default' : 'outline'} className="h-7 text-[9px]" onClick={() => setGiftType('unban')}>
                    ✅ Desbanir
                  </Button>
                </div>
                <Button size="sm" className="w-full h-8 text-xs bg-yellow-600 hover:bg-yellow-700 text-white gap-1" onClick={giftUser} disabled={loading}>
                  <Gift className="h-3 w-3" /> {giftType === 'premium' ? 'Dar Premium' : giftType === 'moderator' ? 'Dar Moderador' : 'Desbanir Usuário'}
                </Button>
              </CardContent>
            </Card>
          )}

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

        {/* Moderation Tab */}
        <TabsContent value="moderation" className="space-y-3 mt-3">
          <ModerationPanel onDeleteMessage={deleteMessage} />
        </TabsContent>
      </Tabs>
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
