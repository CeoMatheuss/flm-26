import { useState, useEffect, useCallback } from 'react';
import { Bell, X, ChevronDown, CheckCheck, Check, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player } from '@/types/game';
import { Infrastructure } from '@/types/infrastructure';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showAll, setShowAll] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<FriendlyInvite[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const PREVIEW_COUNT = 5;

  // Persist read IDs to localStorage
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

  useEffect(() => {
    loadInvites();
    const channel = supabase
      .channel('bell-friendly-invites')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendly_invites' }, () => loadInvites())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadInvites]);

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

  if (isNewClub) {
    notifications.push({
      id: 'welcome', icon: '🏆', title: 'Bem-vindo ao FLM 26!',
      message: `Parabéns, Manager! Você acaba de fundar o ${clubName}! 🎉\n\nSeu objetivo é construir um time vencedor, conquistar ligas online e subir de divisão. O FLM 26 é 100% multiplayer — tudo que você faz é visível para outros jogadores: transferências, escalação, resultados.\n\nSuas ações são salvas automaticamente a cada 30 segundos. Boa sorte e divirta-se!`,
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
  }

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

  // Auto-mark all as read when bell is opened
  const handleOpen = () => {
    const wasOpen = open;
    setOpen(!open);
    if (!wasOpen) {
      // Mark all non-action notifications as read on open
      const nonActionIds = notifications.filter(n => !n.actions).map(n => n.id);
      setReadIds(prev => {
        const newIds = nonActionIds.filter(id => !prev.includes(id));
        return newIds.length > 0 ? [...prev, ...newIds] : prev;
      });
    }
  };

  const typeBorder = { danger: 'border-l-destructive', warning: 'border-l-yellow-400', info: 'border-l-primary', success: 'border-l-emerald-400' };
  const typeBg = { danger: 'bg-destructive/10', warning: 'bg-yellow-400/5', info: 'bg-primary/5', success: 'bg-emerald-400/10' };

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

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <Card className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-11 left-2 sm:left-auto w-auto sm:w-[420px] z-50 shadow-2xl border-border/80">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-card">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔔</span>
                  <p className="text-sm font-bold">Notificações</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1" onClick={markAllAsRead}>
                      <CheckCheck className="h-3 w-3" /> Ler todas
                    </Button>
                  )}
                  <Badge variant="outline" className="text-[10px] h-5">{notifications.length}</Badge>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-1 hover:bg-destructive/20" onClick={() => setOpen(false)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="max-h-[400px]">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 px-3">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="text-xs text-muted-foreground">Tudo em ordem, Manager!</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1.5">
                    {displayedNotifications.map(n => {
                      const isRead = readIds.includes(n.id);
                      return (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-lg border-l-[3px] ${typeBorder[n.type]} ${typeBg[n.type]} ${isRead && !n.actions ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-0.5" onClick={() => !n.actions && markAsRead(n.id)}>
                            <span className="text-sm">{n.icon}</span>
                            <p className="text-[11px] font-bold flex-1">{n.title}</p>
                            {!isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed ml-6 whitespace-pre-line">{n.message}</p>
                          {n.actions && (
                            <div className="flex gap-1.5 ml-6 mt-2">
                              {n.actions.map((action, i) => (
                                <Button
                                  key={i}
                                  size="sm"
                                  variant={action.variant}
                                  className="h-7 text-[10px] gap-1 flex-1"
                                  onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                                  disabled={respondingId !== null}
                                >
                                  {action.icon} {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {hasMore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs gap-1 mt-1"
                        onClick={() => setShowAll(!showAll)}
                      >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                        {showAll ? 'Recolher' : `Ver todas (${notifications.length})`}
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
