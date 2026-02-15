import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Player } from '@/types/game';

interface Notification {
  id: string;
  icon: string;
  message: string;
  type: 'warning' | 'info' | 'danger';
}

interface Props {
  players: Player[];
  budget: number;
  listedPlayers: string[];
}

export function NotificationBell({ players, budget, listedPlayers }: Props) {
  const [open, setOpen] = useState(false);

  const notifications: Notification[] = [];

  // Expiring contracts
  const expiring = players.filter(p => p.contract <= 1);
  if (expiring.length > 0) {
    notifications.push({
      id: 'expiring',
      icon: '📄',
      message: `${expiring.length} jogador(es) com contrato expirando!`,
      type: 'danger',
    });
  }

  // Low stamina
  const tired = players.filter(p => p.stamina < 50);
  if (tired.length > 0) {
    notifications.push({
      id: 'tired',
      icon: '😴',
      message: `${tired.length} jogador(es) com energia baixa (<50%)`,
      type: 'warning',
    });
  }

  // Low morale
  const lowMorale = players.filter(p => p.morale < 40);
  if (lowMorale.length > 0) {
    notifications.push({
      id: 'morale',
      icon: '😤',
      message: `${lowMorale.length} jogador(es) com moral baixa`,
      type: 'warning',
    });
  }

  // Listed for sale
  if (listedPlayers.length > 0) {
    notifications.push({
      id: 'listed',
      icon: '🏷️',
      message: `${listedPlayers.length} jogador(es) na lista de transferência`,
      type: 'info',
    });
  }

  // Low budget
  const totalSalaries = players.reduce((s, p) => s + p.salary, 0);
  if (budget < totalSalaries * 3) {
    notifications.push({
      id: 'budget',
      icon: '💰',
      message: 'Orçamento baixo! Menos de 3 meses de salários.',
      type: 'danger',
    });
  }

  // Small squad
  if (players.length < 16) {
    notifications.push({
      id: 'squad',
      icon: '👥',
      message: `Elenco curto: apenas ${players.length} jogadores`,
      type: 'warning',
    });
  }

  const count = notifications.length;
  const typeColor = { danger: 'text-destructive', warning: 'text-yellow-400', info: 'text-primary' };

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" className="h-7 sm:h-8 px-2 relative" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[8px]">
            {count}
          </Badge>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <Card className="absolute right-0 top-10 w-72 z-50 shadow-xl border-border">
            <CardContent className="p-2">
              <p className="text-xs font-semibold mb-2 px-1">🔔 Notificações ({count})</p>
              {notifications.length === 0 ? (
                <p className="text-[10px] text-muted-foreground px-1 py-2">Nenhuma notificação</p>
              ) : (
                <div className="space-y-1">
                  {notifications.map(n => (
                    <div key={n.id} className="flex items-start gap-2 p-1.5 rounded bg-muted/30 hover:bg-muted/50">
                      <span className="text-sm shrink-0">{n.icon}</span>
                      <p className={`text-[10px] ${typeColor[n.type]}`}>{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
