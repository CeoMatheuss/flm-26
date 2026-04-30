import { useState } from 'react';
import { X, CheckCheck, Bell, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const typeStyles: Record<string, { border: string; dot: string }> = {
  danger: { border: 'border-l-red-500', dot: 'bg-red-500' },
  warning: { border: 'border-l-amber-500', dot: 'bg-amber-500' },
  info: { border: 'border-l-blue-500', dot: 'bg-blue-500' },
  success: { border: 'border-l-emerald-500', dot: 'bg-emerald-500' },
};

export function NotificationFullPage({ notifications, isRead, onMarkRead, onMarkAllRead, onClose, respondingId }: Props) {
  const unreadCount = notifications.filter(n => !isRead(n)).length;
  const groups = groupByTime(notifications);
  const [openReportMatchId, setOpenReportMatchId] = useState<string | null>(null);

  const handleClickNotification = (n: Notification) => {
    const matchDbId = n.data?.match_db_id;
    if (matchDbId && typeof matchDbId === 'string') {
      setOpenReportMatchId(matchDbId);
    }
    if (!n.actions) onMarkRead(n.id);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Notificações</h2>
              <p className="text-[10px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} não lida(s)` : 'Tudo em dia ✓'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" className="h-8 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground" onClick={onMarkAllRead}>
                <CheckCheck className="h-3.5 w-3.5" /> Ler todas
              </Button>
            )}
            <button onClick={onClose} className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-8">
          {notifications.length === 0 ? (
            <div className="text-center py-20">
              <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Tudo em ordem!</p>
              <p className="text-xs text-muted-foreground">Nenhuma notificação pendente.</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label} className="space-y-2">
                <div className="flex items-center gap-2 px-1 pt-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</span>
                  <span className="text-[9px] text-muted-foreground/50">({group.items.length})</span>
                </div>
                <div className="space-y-1.5">
                  {group.items.map(n => {
                    const read = isRead(n);
                    const style = typeStyles[n.type] || typeStyles.info;

                    return (
                      <div
                        key={n.id}
                        className={`relative rounded-lg border-l-[3px] ${style.border} bg-card/90 hover:bg-card p-3 transition-all cursor-pointer ${read && !n.actions ? 'opacity-50' : ''}`}
                        onClick={() => handleClickNotification(n)}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="text-base leading-none mt-0.5 shrink-0">{n.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-semibold text-foreground leading-tight">{n.title}</p>
                              {!read && <span className={`h-1.5 w-1.5 rounded-full ${style.dot} animate-pulse shrink-0`} />}
                              <span className="text-[9px] text-muted-foreground/60 ml-auto shrink-0">{timeAgo(n.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{n.message}</p>
                            {n.actions && (
                              <div className="flex gap-2 mt-2">
                                {n.actions.map((action, i) => (
                                  <Button
                                    key={i}
                                    size="sm"
                                    variant={action.variant}
                                    className={`h-7 text-[10px] gap-1 rounded-lg font-medium ${
                                      action.variant === 'default'
                                        ? 'bg-primary/90 hover:bg-primary text-primary-foreground'
                                        : 'bg-destructive/90 hover:bg-destructive'
                                    }`}
                                    onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                                    disabled={respondingId !== null}
                                  >
                                    {action.icon} {action.label}
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
    </div>
  );
}
