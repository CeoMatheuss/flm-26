import { X, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  icon: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'danger' | 'success';
  actions?: { label: string; icon: React.ReactNode; variant: 'default' | 'destructive'; onClick: () => void }[];
}

interface Props {
  notifications: Notification[];
  readIds: string[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  respondingId: string | null;
}

const typeBorder = { danger: 'border-l-destructive', warning: 'border-l-yellow-400', info: 'border-l-primary', success: 'border-l-emerald-400' };
const typeBg = { danger: 'bg-destructive/10', warning: 'bg-yellow-400/5', info: 'bg-primary/5', success: 'bg-emerald-400/10' };
const typeLabel = { danger: '⚠️ Urgente', warning: '⚡ Atenção', info: 'ℹ️ Info', success: '✅ Sucesso' };

export function NotificationFullPage({ notifications, readIds, onMarkRead, onMarkAllRead, onClose, respondingId }: Props) {
  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h2 className="text-base font-bold">Central de Notificações</h2>
          <Badge variant="outline" className="text-[10px]">{notifications.length}</Badge>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px]">{unreadCount} não lida(s)</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={onMarkAllRead}>
              <CheckCheck className="h-3 w-3" /> Marcar todas como lidas
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-sm text-muted-foreground">Nenhuma notificação. Tudo em ordem, Manager!</p>
            </div>
          ) : (
            notifications.map(n => {
              const isRead = readIds.includes(n.id);
              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border-l-4 ${typeBorder[n.type]} ${typeBg[n.type]} ${isRead && !n.actions ? 'opacity-50' : ''} transition-opacity cursor-pointer`}
                  onClick={() => !n.actions && onMarkRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{n.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold">{n.title}</p>
                        <Badge variant="outline" className="text-[9px] h-4">{typeLabel[n.type]}</Badge>
                        {!isRead && <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{n.message}</p>
                      {n.actions && (
                        <div className="flex gap-2 mt-3">
                          {n.actions.map((action, i) => (
                            <Button
                              key={i}
                              size="sm"
                              variant={action.variant}
                              className="h-8 text-xs gap-1"
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
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
