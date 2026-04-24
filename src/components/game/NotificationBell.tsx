/**
 * NotificationBell — Clean bell icon + full-page notification center
 * Only dynamic notifications from DB + real-time events (no static tips)
 */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, XCircle } from 'lucide-react';
import { Player } from '@/types/game';
import { Infrastructure } from '@/types/infrastructure';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NotificationFullPage } from './NotificationFullPage';

export interface Notification {
  id: string;
  icon: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'danger' | 'success';
  createdAt: Date;
  actions?: { label: string; icon: React.ReactNode; variant: 'default' | 'destructive'; onClick: () => void }[];
}

interface FriendlyInvite {
  id: string;
  sender_club_name: string;
  sender_stadium: string;
  sender_stadium_capacity: number;
  receiver_stadium: string;
  receiver_stadium_capacity: number;
  home_team_id: string;
  sender_id: string;
  receiver_id: string;
  match_date: string;
  created_at: string;
}

interface Props {
  players: Player[];
  budget: number;
  listedPlayers: string[];
  clubName: string;
  infrastructure: Infrastructure;
  isNewClub?: boolean;
  userId: string;
}

export function NotificationBell({ players, budget, listedPlayers, clubName, infrastructure, isNewClub, userId }: Props) {
  const [fullPage, setFullPage] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<FriendlyInvite[]>([]);
  const [dbNotifications, setDbNotifications] = useState<Array<{
    id: string; icon: string; title: string; message: string; type: string; read_at: string | null; created_at: string;
  }>>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [persistedReadKeys, setPersistedReadKeys] = useState<Set<string>>(new Set());

  const loadInvites = useCallback(async () => {
    const { data } = await supabase
      .from('friendly_invites')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingInvites(data as unknown as FriendlyInvite[]);
  }, [userId]);

  const loadDbNotifications = useCallback(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('user_notifications')
      .select('id, icon, title, message, type, read_at, created_at')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setDbNotifications(data);
  }, [userId]);

  const loadPersistedReadState = useCallback(async () => {
    const { data } = await supabase
      .from('notification_read_state')
      .select('notification_key')
      .eq('user_id', userId);
    if (data) setPersistedReadKeys(new Set(data.map(r => r.notification_key)));
  }, [userId]);

  useEffect(() => {
    loadInvites();
    loadDbNotifications();
    loadPersistedReadState();
    const ch1 = supabase.channel('bell-invites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendly_invites' }, () => loadInvites())
      .subscribe();
    const ch2 = supabase.channel('bell-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications' }, () => loadDbNotifications())
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [loadInvites, loadDbNotifications, loadPersistedReadState]);

  const respondInvite = async (inviteId: string, accept: boolean) => {
    setRespondingId(inviteId);
    const { error } = await supabase
      .from('friendly_invites')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', inviteId);
    if (error) toast.error('Erro ao responder');
    else {
      toast.success(accept ? '✅ Amistoso aceito!' : '❌ Amistoso recusado');
      if (accept) {
        // Dispara simulação automática imediata sem precisar abrir tela.
        try { (window as any).__triggerAutoSim?.(); } catch { /* ignore */ }
      }
    }
    setRespondingId(null);
    loadInvites();
  };

  // Build notifications list — only dynamic/relevant ones
  const notifications: Notification[] = [];

  pendingInvites.forEach(invite => {
    const isHome = invite.home_team_id === userId;
    const dateStr = new Date(invite.match_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    notifications.push({
      id: `invite-${invite.id}`,
      icon: '⚔️',
      title: `${invite.sender_club_name} quer jogar!`,
      message: `📅 ${dateStr} • 🏟️ ${isHome ? invite.receiver_stadium : invite.sender_stadium} (${(isHome ? invite.receiver_stadium_capacity : invite.sender_stadium_capacity).toLocaleString()})`,
      type: 'warning',
      createdAt: new Date(invite.created_at),
      actions: [
        { label: 'Aceitar', icon: <Check className="h-3 w-3" />, variant: 'default', onClick: () => respondInvite(invite.id, true) },
        { label: 'Recusar', icon: <XCircle className="h-3 w-3" />, variant: 'destructive', onClick: () => respondInvite(invite.id, false) },
      ],
    });
  });

  dbNotifications.forEach(dbN => {
    const typeMap: Record<string, 'warning' | 'info' | 'danger' | 'success'> = {
      warning: 'warning', info: 'info', danger: 'danger', success: 'success',
    };
    notifications.push({
      id: `db-${dbN.id}`,
      icon: dbN.icon,
      title: dbN.title,
      message: dbN.message,
      type: typeMap[dbN.type] || 'info',
      createdAt: new Date(dbN.created_at),
    });
  });

  // Dynamic alerts based on squad state
  const expiring = players.filter(p => p.contract <= 1);
  if (expiring.length > 0) {
    const names = expiring.slice(0, 3).map(p => p.name.split(' ')[0]).join(', ');
    notifications.push({
      id: 'expiring', icon: '📄', title: `${expiring.length} contrato(s) expirando`,
      message: `${names}${expiring.length > 3 ? ` e +${expiring.length - 3}` : ''} — renove!`,
      type: 'danger', createdAt: new Date(),
    });
  }

  const injured = players.filter(p => p.injury);
  if (injured.length > 0) {
    notifications.push({
      id: 'injured', icon: '🏥', title: `${injured.length} lesionado(s)`,
      message: injured.slice(0, 3).map(p => `${p.name.split(' ')[0]} (${p.injury!.weeksRemaining}j)`).join(', '),
      type: 'danger', createdAt: new Date(),
    });
  }

  const totalSalaries = players.reduce((s, p) => s + p.salary, 0);
  if (budget < totalSalaries * 3) {
    const monthsLeft = totalSalaries > 0 ? Math.floor(budget / totalSalaries) : 99;
    notifications.push({
      id: 'budget', icon: '💰', title: 'Orçamento crítico!',
      message: `~${monthsLeft} meses de salários restantes.`,
      type: 'danger', createdAt: new Date(),
    });
  }

  if (players.length < 16) {
    notifications.push({
      id: 'squad', icon: '👥', title: 'Elenco curto',
      message: `${players.length} jogadores. Ideal: 18+.`,
      type: 'warning', createdAt: new Date(),
    });
  }

  // Read state combines DB read_at, persistedReadKeys (from notification_read_state)
  const isRead = (n: Notification) => {
    if (persistedReadKeys.has(n.id)) return true;
    if (n.id.startsWith('db-')) {
      const dbId = n.id.replace('db-', '');
      const dbN = dbNotifications.find(d => d.id === dbId);
      return dbN?.read_at !== null;
    }
    return false;
  };

  const unreadCount = notifications.filter(n => !isRead(n)).length;
  const urgentCount = notifications.filter(n => (n.type === 'danger' || n.actions) && !isRead(n)).length;

  const markAsRead = async (id: string) => {
    setPersistedReadKeys(prev => new Set(prev).add(id));
    if (id.startsWith('db-')) {
      const dbId = id.replace('db-', '');
      await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', dbId);
    }
    // Persist to DB so it survives logout
    await supabase.from('notification_read_state').upsert(
      { user_id: userId, notification_key: id, read_at: new Date().toISOString() },
      { onConflict: 'user_id,notification_key' }
    );
  };

  const markAllAsRead = async () => {
    const allIds = notifications.map(n => n.id);
    setPersistedReadKeys(new Set([...persistedReadKeys, ...allIds]));
    const dbIds = dbNotifications.filter(d => !d.read_at).map(d => d.id);
    if (dbIds.length > 0) {
      await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).in('id', dbIds);
    }
    // Persist all keys to DB
    if (allIds.length > 0) {
      await supabase.from('notification_read_state').upsert(
        allIds.map(key => ({ user_id: userId, notification_key: key, read_at: new Date().toISOString() })),
        { onConflict: 'user_id,notification_key' }
      );
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setFullPage(prev => !prev)}
        className="relative flex items-center justify-center h-9 w-9 bg-transparent transition-colors duration-200"
      >
        <Bell
          className={`h-5 w-5 ${urgentCount > 0 ? 'text-red-500' : unreadCount > 0 ? 'text-yellow-400' : 'text-white'}`}
          strokeWidth={2.5}
        />
        {unreadCount > 0 && (
          <span className={`absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black ${urgentCount > 0 ? 'bg-red-500 text-white' : 'bg-yellow-400 text-black'}`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {fullPage && createPortal(
        <NotificationFullPage
          notifications={notifications}
          isRead={isRead}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onClose={() => setFullPage(false)}
          respondingId={respondingId}
        />,
        document.body
      )}
    </div>
  );
}
