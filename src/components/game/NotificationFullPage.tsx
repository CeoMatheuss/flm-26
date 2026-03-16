import { useState } from 'react';
import { X, CheckCheck, Bell, AlertTriangle, Info, CheckCircle2, Zap, ChevronDown, ChevronUp } from 'lucide-react';
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

const typeConfig = {
  danger: {
    border: 'border-l-red-500',
    bg: 'bg-white/80 dark:bg-card/90',
    hoverBg: 'hover:bg-white dark:hover:bg-card',
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
    label: 'Urgente',
    labelClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    dot: 'bg-red-500',
  },
  warning: {
    border: 'border-l-amber-500',
    bg: 'bg-white/80 dark:bg-card/90',
    hoverBg: 'hover:bg-white dark:hover:bg-card',
    icon: <Zap className="h-4 w-4 text-amber-500" />,
    label: 'Atenção',
    labelClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  info: {
    border: 'border-l-blue-500',
    bg: 'bg-white/80 dark:bg-card/90',
    hoverBg: 'hover:bg-white dark:hover:bg-card',
    icon: <Info className="h-4 w-4 text-blue-500" />,
    label: 'Info',
    labelClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  success: {
    border: 'border-l-emerald-500',
    bg: 'bg-white/80 dark:bg-card/90',
    hoverBg: 'hover:bg-white dark:hover:bg-card',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: 'Sucesso',
    labelClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
};

export function NotificationFullPage({ notifications, readIds, onMarkRead, onMarkAllRead, onClose, respondingId }: Props) {
  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;
  
  const urgent = notifications.filter(n => n.type === 'danger' || n.actions);
  const attention = notifications.filter(n => n.type === 'warning' && !n.actions);
  const info = notifications.filter(n => (n.type === 'info' || n.type === 'success') && !n.actions);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderNotification = (n: Notification) => {
    const isRead = readIds.includes(n.id);
    const config = typeConfig[n.type];
    const isLong = n.message.length > 80;
    const isExpanded = expandedIds.has(n.id);

    return (
      <div
        key={n.id}
        className={`
          group relative rounded-xl border-l-[3px] ${config.border} ${config.bg} ${config.hoverBg}
          backdrop-blur-sm p-3.5 sm:p-4 shadow-sm
          transition-all duration-200 cursor-pointer
          ${isRead && !n.actions ? 'opacity-50' : ''}
        `}
        onClick={() => !n.actions && onMarkRead(n.id)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5 text-xl leading-none">
            {n.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-sm font-semibold text-foreground leading-tight">{n.title}</p>
              <Badge variant="outline" className={`text-[9px] h-4 px-1.5 border ${config.labelClass} font-medium`}>
                {config.label}
              </Badge>
              {!isRead && (
                <span className={`h-2 w-2 rounded-full ${config.dot} animate-pulse flex-shrink-0`} />
              )}
            </div>
            <p className={`text-xs text-muted-foreground leading-relaxed whitespace-pre-line ${isLong && !isExpanded ? 'line-clamp-2' : ''}`}>
              {n.message}
            </p>
            {isLong && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpand(n.id); }}
                className="flex items-center gap-0.5 text-[10px] text-primary font-medium mt-1 hover:underline"
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {isExpanded ? 'Recolher' : 'Expandir'}
              </button>
            )}
            {n.actions && (
              <div className="flex gap-2 mt-3">
                {n.actions.map((action, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={action.variant}
                    className={`h-8 text-xs gap-1.5 rounded-lg font-medium ${
                      action.variant === 'default' 
                        ? 'bg-primary/90 hover:bg-primary text-primary-foreground shadow-sm shadow-primary/20' 
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
  };

  const renderSection = (title: string, icon: React.ReactNode, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1 pt-2">
          {icon}
          <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">{title}</span>
          <span className="text-[10px] text-muted-foreground/60">({items.length})</span>
        </div>
        <div className="space-y-2">
          {items.map(renderNotification)}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white/95 dark:bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
      {/* Header - white/light theme */}
      <div className="flex-shrink-0 border-b border-border/30 bg-white/90 dark:bg-card/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary/10">
              <Bell className="h-4.5 w-4.5 text-primary" />
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
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-8 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground" 
                onClick={onMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" /> Ler todas
              </Button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
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
              <p className="text-xs text-muted-foreground">Nenhuma notificação pendente, Manager.</p>
            </div>
          ) : (
            <>
              {renderSection('Ação necessária', <AlertTriangle className="h-3.5 w-3.5 text-red-500" />, urgent)}
              {renderSection('Atenção', <Zap className="h-3.5 w-3.5 text-amber-500" />, attention)}
              {renderSection('Informações', <Info className="h-3.5 w-3.5 text-blue-500" />, info)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
