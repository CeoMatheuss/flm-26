import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Player } from '@/types/game';
import { Infrastructure } from '@/types/infrastructure';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NotificationFullPage } from './NotificationFullPage';

interface Notification {
  id: string;
  icon: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'danger' | 'success';
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
}

interface SoldListing {
  id: string;
  player_name: string;
  buyer_club_name: string | null;
  asking_price: number;
  sold_at: string | null;
}

interface BoughtListing {
  id: string;
  player_name: string;
  seller_club_name: string;
  asking_price: number;
  sold_at: string | null;
}

const STORAGE_KEY = 'flm26_read_notifications';

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
  const [open, setOpen] = useState(false);
  const [fullPage, setFullPage] = useState(false);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showAll, setShowAll] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<FriendlyInvite[]>([]);
  const [soldListings, setSoldListings] = useState<SoldListing[]>([]);
  const [boughtListings, setBoughtListings] = useState<BoughtListing[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const PREVIEW_COUNT = 5;

  // Load read IDs from Supabase on mount
  useEffect(() => {
    if (!userId) return;
    const loadSaved = async () => {
      const { data } = await supabase.from('game_saves').select('club_data').eq('user_id', userId).maybeSingle();
      if (data?.club_data && typeof data.club_data === 'object' && 'readNotificationIds' in (data.club_data as any)) {
        const saved = (data.club_data as any).readNotificationIds as string[];
        if (saved?.length) {
          setReadIds(prev => {
            const merged = Array.from(new Set([...prev, ...saved]));
            return merged;
          });
        }
      }
    };
    loadSaved();
  }, [userId]);

  // Persist read IDs to localStorage + Supabase
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds));
  }, [readIds]);

  const loadInvites = useCallback(async () => {
    const { data } = await supabase
      .from('friendly_invites')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setPendingInvites(data as unknown as FriendlyInvite[]);
  }, [userId]);

  const loadSoldListings = useCallback(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('transfer_listings')
      .select('id, player_name, buyer_club_name, asking_price, sold_at')
      .eq('seller_id', userId)
      .eq('status', 'sold')
      .gte('sold_at', sevenDaysAgo)
      .order('sold_at', { ascending: false });
    if (data) setSoldListings(data as SoldListing[]);
  }, [userId]);

  const loadBoughtListings = useCallback(async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('transfer_listings')
      .select('id, player_name, seller_club_name, asking_price, sold_at')
      .eq('buyer_id', userId)
      .eq('status', 'sold')
      .gte('sold_at', sevenDaysAgo)
      .order('sold_at', { ascending: false });
    if (data) setBoughtListings(data as BoughtListing[]);
  }, [userId]);

  useEffect(() => {
    loadInvites();
    loadSoldListings();
    loadBoughtListings();
    const channel = supabase
      .channel('bell-friendly-invites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendly_invites' }, () => loadInvites())
      .subscribe();
    const channel2 = supabase
      .channel('bell-sold-listings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfer_listings' }, () => { loadSoldListings(); loadBoughtListings(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(channel2); };
  }, [loadInvites, loadSoldListings, loadBoughtListings]);

  const respondInvite = async (inviteId: string, accept: boolean) => {
    setRespondingId(inviteId);
    const { error } = await supabase
      .from('friendly_invites')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', inviteId);
    if (error) toast.error('Erro ao responder');
    else toast.success(accept ? '✅ Amistoso aceito!' : '❌ Amistoso recusado');
    setRespondingId(null);
    loadInvites();
  };

  const notifications: Notification[] = [];

  // Friendly invite notifications
  pendingInvites.forEach(invite => {
    const isHome = invite.home_team_id === userId;
    const dateStr = new Date(invite.match_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    notifications.push({
      id: `invite-${invite.id}`,
      icon: '⚔️',
      title: `${invite.sender_club_name} quer jogar!`,
      message: `📅 ${dateStr} • 🏟️ ${isHome ? invite.receiver_stadium : invite.sender_stadium} (${(isHome ? invite.receiver_stadium_capacity : invite.sender_stadium_capacity).toLocaleString()}) • ${isHome ? 'Você é mandante' : 'Você é visitante'}`,
      type: 'warning',
      actions: [
        {
          label: 'Aceitar',
          icon: <Check className="h-3 w-3" />,
          variant: 'default',
          onClick: () => respondInvite(invite.id, true),
        },
        {
          label: 'Recusar',
          icon: <XCircle className="h-3 w-3" />,
          variant: 'destructive',
          onClick: () => respondInvite(invite.id, false),
        },
      ],
    });
  });

  // Sold player notifications
  soldListings.forEach(sold => {
    const dateStr = sold.sold_at ? new Date(sold.sold_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    notifications.push({
      id: `sold-${sold.id}`,
      icon: '💰',
      title: `${sold.player_name} vendido!`,
      message: `${sold.player_name} foi comprado por ${sold.buyer_club_name || 'outro clube'} por R$${(sold.asking_price / 1000).toFixed(0)}k! 📅 ${dateStr}`,
      type: 'success',
    });
  });

  // Bought player notifications
  boughtListings.forEach(bought => {
    const dateStr = bought.sold_at ? new Date(bought.sold_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    notifications.push({
      id: `bought-${bought.id}`,
      icon: '🛒',
      title: `${bought.player_name} contratado!`,
      message: `Você comprou ${bought.player_name} do ${bought.seller_club_name} por R$${(bought.asking_price / 1000).toFixed(0)}k! 📅 ${dateStr}`,
      type: 'success',
    });
  });

  notifications.push({
    id: 'welcome', icon: '🏆', title: 'Bem-vindo ao FLM 26!',
    message: `Parabéns, Manager! Você fundou o ${clubName}! 🎉\n\nSeu objetivo é construir um time vencedor, conquistar ligas online e subir de divisão. O FLM 26 é 100% multiplayer — tudo que você faz é visível para outros jogadores: transferências, escalação, resultados.\n\nSuas ações são salvas automaticamente a cada 30 segundos. Boa sorte e divirta-se!`,
    type: 'success',
  });
  notifications.push({
    id: 'welcome_tips', icon: '💡', title: '📋 Guia Completo do Manager',
    message: '1️⃣ Táticas → Monte sua formação e escalação ideal\n2️⃣ Partidas → Jogue 1 amistoso diário vs BOT FC para experiência\n3️⃣ CT & Base → Melhore infraestrutura e desenvolva jovens talentos\n4️⃣ Mercado Online → Compre e venda jogadores com outros managers\n5️⃣ Liga → Participe da liga online com temporadas de 30 dias\n6️⃣ Pacotinhos → Abra pacotes e descubra promessas de 17 anos\n7️⃣ Leilão → Dispute jogadores raros contra outros managers\n8️⃣ Uniformes → Personalize o visual do seu clube',
    type: 'info',
  });
  notifications.push({
    id: 'welcome_online', icon: '🌐', title: 'Mundo 100% Online & Competitivo',
    message: 'Temporadas de 30 dias com 1 rodada por dia. Ao final, os melhores sobem de divisão e os piores caem. Construa sua reputação, suba no ranking e conquiste troféus!\n\n⚽ Amistosos online contra outros managers\n🏆 Ligas automáticas por país\n💰 Mercado de transferências em tempo real\n📊 Ranking global de reputação',
    type: 'info',
  });
  notifications.push({
    id: 'welcome_save', icon: '💾', title: 'Auto-Save Ativo',
    message: 'Seu progresso é salvo automaticamente a cada 30 segundos. Pode sair tranquilo — quando voltar, tudo estará como deixou! As notificações lidas também são salvas.',
    type: 'success',
  });

  const expiring = players.filter(p => p.contract <= 1);
  if (expiring.length > 0) {
    const names = expiring.slice(0, 3).map(p => p.name.split(' ')[0]).join(', ');
    notifications.push({ id: 'expiring', icon: '📄', title: `${expiring.length} contrato(s) expirando`, message: `${names}${expiring.length > 3 ? ` e +${expiring.length - 3}` : ''} — renove antes do fim da temporada!`, type: 'danger' });
  }

  const tired = players.filter(p => p.stamina < 50);
  if (tired.length > 0) {
    const worst = [...tired].sort((a, b) => a.stamina - b.stamina)[0];
    notifications.push({ id: 'tired', icon: '😴', title: `${tired.length} cansado(s)`, message: `${worst.name} com ${worst.stamina}% energia. Descanse ou melhore a Fisioterapia.`, type: 'warning' });
  }

  const lowMorale = players.filter(p => p.morale < 40);
  if (lowMorale.length > 0) {
    const worst = [...lowMorale].sort((a, b) => a.morale - b.morale)[0];
    notifications.push({ id: 'morale', icon: '😤', title: `${lowMorale.length} com moral baixa`, message: `${worst.name} com ${worst.morale}% moral. Vitórias ajudam!`, type: 'warning' });
  }

  const injured = players.filter(p => p.injury);
  if (injured.length > 0) {
    const names = injured.slice(0, 3).map(p => `${p.name.split(' ')[0]} (${p.injury!.weeksRemaining}j)`).join(', ');
    notifications.push({ id: 'injured', icon: '🏥', title: `${injured.length} lesionado(s)`, message: `${names}${injured.length > 3 ? ` e +${injured.length - 3}` : ''}`, type: 'danger' });
  }

  if (listedPlayers.length > 0) {
    notifications.push({ id: 'listed', icon: '🏷️', title: `${listedPlayers.length} na lista`, message: 'Jogadores aguardando propostas no Mercado.', type: 'info' });
  }

  const totalSalaries = players.reduce((s, p) => s + p.salary, 0);
  if (budget < totalSalaries * 3) {
    const monthsLeft = totalSalaries > 0 ? Math.floor(budget / totalSalaries) : 99;
    notifications.push({ id: 'budget', icon: '💰', title: 'Orçamento crítico!', message: `~${monthsLeft} meses de salários restantes.`, type: 'danger' });
  }

  if (players.length < 16) {
    notifications.push({ id: 'squad', icon: '👥', title: 'Elenco curto', message: `${players.length} jogadores. Ideal: 18+.`, type: 'warning' });
  }

  if (infrastructure?.trainingCenter && infrastructure.trainingCenter.level < 3) {
    notifications.push({ id: 'ct_tip', icon: '🏋️', title: 'Dica: CT', message: `CT Nv.${infrastructure.trainingCenter.level} — melhore para treinos mais eficientes.`, type: 'info' });
  }

  if (infrastructure?.physiotherapy && infrastructure.physiotherapy.level < 3) {
    notifications.push({ id: 'physio_tip', icon: '🏥', title: 'Dica: Fisioterapia', message: `Nv.${infrastructure.physiotherapy.level} — recuperação lenta. Melhore!`, type: 'info' });
  }

  const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0];
  if (topScorer && topScorer.goals > 0) {
    notifications.push({ id: 'topscorer', icon: '⚽', title: 'Artilheiro', message: `${topScorer.name}: ${topScorer.goals} gol(s), ${topScorer.assists} assist.`, type: 'info' });
  }

  const bestPlayer = [...players].sort((a, b) => b.overall - a.overall)[0];
  if (bestPlayer) {
    notifications.push({ id: 'best', icon: '⭐', title: 'Melhor jogador', message: `${bestPlayer.name} (${bestPlayer.position}) OVR ${bestPlayer.overall}`, type: 'info' });
  }

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;
  const urgentCount = notifications.filter(n => (n.type === 'danger' || n.actions) && !readIds.includes(n.id)).length;
  const displayedNotifications = showAll ? notifications : notifications.slice(0, PREVIEW_COUNT);
  const hasMore = notifications.length > PREVIEW_COUNT;

  const markAsRead = (id: string) => {
    setReadIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const markAllAsRead = () => {
    setReadIds(notifications.map(n => n.id));
  };

  // Open full page directly when bell is clicked
  const handleOpen = () => {
    try {
      setFullPage(prev => !prev);
      // Mark all non-action notifications as read on open
      const nonActionIds = notifications.filter(n => !n.actions).map(n => n.id);
      setReadIds(prev => {
        const newIds = nonActionIds.filter(id => !prev.includes(id));
        return newIds.length > 0 ? [...prev, ...newIds] : prev;
      });
    } catch (error) {
      console.error("Error opening notifications:", error);
      toast.error("Erro ao abrir notificações");
    }
  };

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" className="h-8 sm:h-9 px-2.5 relative" onClick={handleOpen}>
        <Bell className={`h-5 w-5 ${urgentCount > 0 ? 'text-destructive' : ''}`} />
        {unreadCount > 0 && (
          <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-[9px] font-bold animate-pulse">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {fullPage && createPortal(
        <NotificationFullPage
          notifications={notifications}
          readIds={readIds}
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
