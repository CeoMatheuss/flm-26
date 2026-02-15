import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Player } from '@/types/game';

interface Notification {
  id: string;
  icon: string;
  message: string;
  type: 'warning' | 'info' | 'danger' | 'success';
}

interface Props {
  players: Player[];
  budget: number;
  listedPlayers: string[];
  clubName: string;
  isNewClub?: boolean;
}

export function NotificationBell({ players, budget, listedPlayers, clubName, isNewClub }: Props) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const notifications: Notification[] = [];

  // Welcome message for new clubs
  if (isNewClub) {
    notifications.push({
      id: 'welcome',
      icon: '🏆',
      message: `Bem-vindo ao ${clubName}! Monte seu elenco, defina táticas e conquiste títulos. Boa sorte, Manager!`,
      type: 'success',
    });
  }

  // Expiring contracts
  const expiring = players.filter(p => p.contract <= 1);
  if (expiring.length > 0) {
    notifications.push({
      id: 'expiring',
      icon: '📄',
      message: `${expiring.length} jogador(es) com contrato expirando! Renove na aba Elenco > Contratos.`,
      type: 'danger',
    });
  }

  // Low stamina
  const tired = players.filter(p => p.stamina < 50);
  if (tired.length > 0) {
    notifications.push({
      id: 'tired',
      icon: '😴',
      message: `${tired.length} jogador(es) com energia baixa (<50%): ${tired.slice(0, 3).map(p => p.name.split(' ')[0]).join(', ')}${tired.length > 3 ? '...' : ''}`,
      type: 'warning',
    });
  }

  // Low morale
  const lowMorale = players.filter(p => p.morale < 40);
  if (lowMorale.length > 0) {
    notifications.push({
      id: 'morale',
      icon: '😤',
      message: `${lowMorale.length} jogador(es) com moral baixa: ${lowMorale.slice(0, 3).map(p => p.name.split(' ')[0]).join(', ')}${lowMorale.length > 3 ? '...' : ''}`,
      type: 'warning',
    });
  }

  // Listed for sale
  if (listedPlayers.length > 0) {
    notifications.push({
      id: 'listed',
      icon: '🏷️',
      message: `${listedPlayers.length} jogador(es) na lista de transferência aguardando propostas.`,
      type: 'info',
    });
  }

  // Low budget
  const totalSalaries = players.reduce((s, p) => s + p.salary, 0);
  if (budget < totalSalaries * 3) {
    notifications.push({
      id: 'budget',
      icon: '💰',
      message: `Orçamento crítico! Restam menos de 3 meses de salários (R$${(budget / 1000).toFixed(0)}k).`,
      type: 'danger',
    });
  }

  // Small squad
  if (players.length < 16) {
    notifications.push({
      id: 'squad',
      icon: '👥',
      message: `Elenco curto: apenas ${players.length} jogadores. Contrate no Mercado!`,
      type: 'warning',
    });
  }

  // Top scorer info
  const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0];
  if (topScorer && topScorer.goals > 0) {
    notifications.push({
      id: 'topscorer',
      icon: '⚽',
      message: `Artilheiro: ${topScorer.name} com ${topScorer.goals} gol(s).`,
      type: 'info',
    });
  }

  const visible = notifications.filter(n => !dismissed.includes(n.id));
  const count = visible.length;
  const typeColor = {
    danger: 'text-destructive border-l-destructive',
    warning: 'text-yellow-400 border-l-yellow-400',
    info: 'text-primary border-l-primary',
    success: 'text-emerald-400 border-l-emerald-400',
  };
  const typeBg = {
    danger: 'bg-destructive/10',
    warning: 'bg-yellow-400/10',
    info: 'bg-primary/10',
    success: 'bg-emerald-400/10',
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 sm:h-9 px-2.5 relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        {count > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1.5 -right-1.5 h-5 w-5 p-0 flex items-center justify-center text-[9px] font-bold animate-pulse"
          >
            {count}
          </Badge>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
          <Card className="absolute right-0 top-11 w-80 sm:w-96 z-50 shadow-2xl border-border/80">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                <p className="text-sm font-bold">🔔 Notificações</p>
                <Badge variant="outline" className="text-[10px]">{count}</Badge>
              </div>
              <ScrollArea className="max-h-80">
                {visible.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-6 text-center">✅ Nenhuma notificação no momento</p>
                ) : (
                  <div className="p-2 space-y-1.5">
                    {visible.map(n => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border-l-2 ${typeBg[n.type]} ${typeColor[n.type]} cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={() => setDismissed(prev => [...prev, n.id])}
                      >
                        <span className="text-base shrink-0 mt-0.5">{n.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] leading-relaxed">{n.message}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">Clique para dispensar</p>
                        </div>
                      </div>
                    ))}
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
