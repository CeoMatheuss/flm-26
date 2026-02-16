import { useState } from 'react';
import { Bell, X, ChevronDown, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player } from '@/types/game';
import { Infrastructure } from '@/types/infrastructure';

interface Notification {
  id: string;
  icon: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'danger' | 'success';
}

interface Props {
  players: Player[];
  budget: number;
  listedPlayers: string[];
  clubName: string;
  infrastructure: Infrastructure;
  isNewClub?: boolean;
}

export function NotificationBell({ players, budget, listedPlayers, clubName, infrastructure, isNewClub }: Props) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const PREVIEW_COUNT = 5;

  const notifications: Notification[] = [];

  if (isNewClub) {
    notifications.push({
      id: 'welcome', icon: '🏆', title: 'Bem-vindo ao FLM 26!',
      message: `Parabéns pela criação do ${clubName}! 🎉 Monte seu elenco, defina táticas e leve seu clube ao topo!`,
      type: 'success',
    });
    notifications.push({
      id: 'welcome_tips', icon: '💡', title: 'Primeiros passos',
      message: '1️⃣ Formação em Táticas • 2️⃣ Amistosos • 3️⃣ CT e Base • 4️⃣ Mercado • 5️⃣ Liga Online',
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
  const urgentCount = notifications.filter(n => n.type === 'danger' && !readIds.includes(n.id)).length;
  const displayedNotifications = showAll ? notifications : notifications.slice(0, PREVIEW_COUNT);
  const hasMore = notifications.length > PREVIEW_COUNT;

  const markAsRead = (id: string) => {
    setReadIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  const markAllAsRead = () => {
    setReadIds(notifications.map(n => n.id));
  };

  const typeBorder = { danger: 'border-l-destructive', warning: 'border-l-yellow-400', info: 'border-l-primary', success: 'border-l-emerald-400' };
  const typeBg = { danger: 'bg-destructive/10', warning: 'bg-yellow-400/5', info: 'bg-primary/5', success: 'bg-emerald-400/10' };

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" className="h-8 sm:h-9 px-2.5 relative" onClick={() => setOpen(!open)}>
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
                          className={`p-2.5 rounded-lg border-l-[3px] ${typeBorder[n.type]} ${typeBg[n.type]} cursor-pointer hover:opacity-80 transition-all ${isRead ? 'opacity-50' : ''}`}
                          onClick={() => markAsRead(n.id)}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm">{n.icon}</span>
                            <p className="text-[11px] font-bold flex-1">{n.title}</p>
                            {!isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-relaxed ml-6">{n.message}</p>
                        </div>
                      );
                    })}

                    {/* Ver Todos / Recolher */}
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
