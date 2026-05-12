import { useState } from 'react';
import { X, CheckCheck, Bell, CheckCircle2, Filter, Search, Volume2, VolumeX, Trophy, Shield, Wallet, Users, Sword, Trophy as TrophyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostGameReportModal } from './PostGameReportModal';
import type { Notification } from './NotificationBell';

interface Props {
  notifications: Notification[];
  isRead: (n: Notification) => boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  respondingId: string | null;
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  return `${days}d`;
}

function groupByTime(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: { label: string; items: Notification[] }[] = [
    { label: 'Hoje', items: [] },
    { label: 'Ontem', items: [] },
    { label: 'Anteriores', items: [] },
  ];

  const sorted = [...notifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  sorted.forEach(n => {
    if (n.createdAt >= today) groups[0].items.push(n);
    else if (n.createdAt >= yesterday) groups[1].items.push(n);
    else groups[2].items.push(n);
  });

  return groups.filter(g => g.items.length > 0);
}

const typeStyles: Record<string, { border: string; dot: string; glow: string; text: string }> = {
  danger: { border: 'border-l-red-500', dot: 'bg-red-500', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]', text: 'text-red-500' },
  warning: { border: 'border-l-amber-500', dot: 'bg-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]', text: 'text-amber-500' },
  info: { border: 'border-l-blue-500', dot: 'bg-blue-500', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]', text: 'text-blue-500' },
  success: { border: 'border-l-emerald-500', dot: 'bg-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]', text: 'text-emerald-500' },
  special: { border: 'border-l-purple-500', dot: 'bg-purple-500', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.4)]', text: 'text-purple-400' },
  premium: { border: 'border-l-cyan-400', dot: 'bg-cyan-400', glow: 'shadow-[0_0_25px_rgba(34,211,238,0.5)]', text: 'text-cyan-400' },
};

const categoryIcons: Record<string, any> = {
  'Jogos': Sword,
  'Transferências': Users,
  'Financeiro': Wallet,
  'Copa': Trophy,
  'Liga': TrophyIcon,
  'Clube': Shield,
  'Eventos': Bell,
};

export function NotificationFullPage({ notifications, isRead, onMarkRead, onMarkAllRead, onClose, respondingId }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [openReportMatchId, setOpenReportMatchId] = useState<string | null>(null);

  const filteredNotifications = notifications.filter(n => {
    const matchesCategory = activeCategory === 'all' || n.category === activeCategory;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const unreadCount = filteredNotifications.filter(n => !isRead(n)).length;
  const groups = groupByTime(filteredNotifications);

  const handleClickNotification = (n: Notification) => {
    const matchDbId = n.data?.match_db_id;
    if (matchDbId && typeof matchDbId === 'string') {
      setOpenReportMatchId(matchDbId);
    }
    if (!n.actions) onMarkRead(n.id);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a0c]/98 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
      {/* Premium Header */}
      <div className="flex-shrink-0 border-b border-white/5 bg-gradient-to-b from-black/40 to-transparent">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-primary/20 blur-md rounded-full" />
                <div className="relative flex items-center justify-center h-12 w-12 rounded-2xl bg-card border border-white/10 shadow-2xl">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Central de Notificações</h2>
                <div className="flex items-center gap-2">
                   <span className="text-[11px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded border border-primary/20 uppercase">Premium</span>
                   <p className="text-xs text-muted-foreground font-medium">
                    {unreadCount > 0 ? `${unreadCount} novas mensagens` : 'Sistema operando normalmente'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              </Button>
              <Button 
                onClick={onClose} 
                className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 border-white/5"
                variant="outline"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar notificações..." 
                className="bg-white/5 border-white/10 pl-11 h-11 rounded-xl focus:ring-primary/30 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
              <ScrollArea className="w-full whitespace-nowrap pb-2">
                <TabsList className="bg-white/5 border border-white/5 p-1 h-auto flex gap-1">
                  {['all', 'Jogos', 'Transferências', 'Financeiro', 'Copa', 'Liga', 'Clube'].map(cat => (
                    <TabsTrigger 
                      key={cat} 
                      value={cat}
                      className="rounded-lg px-4 py-2 text-[11px] font-bold uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-black"
                    >
                      {cat === 'all' ? 'Todas' : cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-8 pb-20">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Fluxo de Atividades</h3>
            {unreadCount > 0 && (
              <Button 
                variant="link" 
                className="h-auto p-0 text-[10px] font-black text-primary uppercase tracking-wider hover:no-underline"
                onClick={onMarkAllRead}
              >
                Marcar tudo como lido
              </Button>
            )}
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-50">
              <div className="h-20 w-20 rounded-full bg-white/5 border border-white/5 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground italic">Sem registros</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label} className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-black text-white italic uppercase tracking-wider">{group.label}</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                </div>
                
                <div className="grid gap-3">
                  {group.items.map(n => {
                    const read = isRead(n);
                    const isPremium = n.priority === 'high' || n.priority === 'ultra';
                    const style = isPremium ? typeStyles.premium : (typeStyles[n.type] || typeStyles.info);
                    const CatIcon = categoryIcons[n.category || 'Clube'] || Shield;

                    return (
                      <div
                        key={n.id}
                        className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-[#151518] hover:bg-[#1a1a1e] transition-all duration-300 cursor-pointer ${style.glow} ${read && !n.actions ? 'opacity-60' : ''}`}
                        onClick={() => handleClickNotification(n)}
                      >
                        {/* Status bar */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.dot}`} />
                        
                        <div className="p-4 sm:p-5 flex items-start gap-4">
                          <div className={`relative flex items-center justify-center h-12 w-12 rounded-xl border border-white/5 bg-black/40 shadow-inner shrink-0 transition-transform group-hover:scale-105`}>
                            <CatIcon className={`h-5 w-5 ${style.text}`} />
                            {isPremium && (
                              <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background animate-ping" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-4 mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <h4 className={`text-sm font-black uppercase italic truncate tracking-tight ${!read ? 'text-white' : 'text-zinc-400'}`}>
                                  {n.title}
                                </h4>
                                {!read && <div className={`h-1.5 w-1.5 rounded-full ${style.dot} shadow-[0_0_8px_currentColor]`} />}
                              </div>
                              <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                            </div>

                            <p className="text-xs text-zinc-400 leading-relaxed font-medium line-clamp-2">
                              {n.message}
                            </p>

                            {n.category && (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                                  {n.category}
                                </Badge>
                                {isPremium && (
                                  <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                                    Urgente
                                  </Badge>
                                )}
                              </div>
                            )}

                            {n.actions && (
                              <div className="flex gap-3 mt-4">
                                {n.actions.map((action, i) => (
                                  <Button
                                    key={i}
                                    size="sm"
                                    variant={action.variant}
                                    className={`h-9 px-5 text-[10px] font-black uppercase tracking-wider italic rounded-xl transition-all active:scale-95 ${
                                      action.variant === 'default'
                                        ? 'bg-primary hover:bg-primary/90 text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                    }`}
                                    onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                                    disabled={respondingId !== null}
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {openReportMatchId && (
        <PostGameReportModal matchDbId={openReportMatchId} onClose={() => setOpenReportMatchId(null)} />
      )}
    </div>
  );
}
