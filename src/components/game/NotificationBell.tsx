import { useState } from 'react';
import { Bell } from 'lucide-react';
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
  const [dismissed, setDismissed] = useState<string[]>([]);

  const notifications: Notification[] = [];

  // Welcome message for new clubs
  if (isNewClub) {
    notifications.push({
      id: 'welcome',
      icon: '🏆',
      title: 'Bem-vindo!',
      message: `Parabéns pela criação do ${clubName}! Monte seu elenco, defina táticas, melhore a infraestrutura e conquiste títulos. Boa sorte, Manager!`,
      type: 'success',
    });
  }

  // Expiring contracts
  const expiring = players.filter(p => p.contract <= 1);
  if (expiring.length > 0) {
    const names = expiring.slice(0, 3).map(p => p.name.split(' ')[0]).join(', ');
    notifications.push({
      id: 'expiring',
      icon: '📄',
      title: `${expiring.length} contrato(s) expirando`,
      message: `${names}${expiring.length > 3 ? ` e mais ${expiring.length - 3}` : ''} — renove na aba Elenco > Contratos antes do fim da temporada!`,
      type: 'danger',
    });
  }

  // Low stamina - detailed
  const tired = players.filter(p => p.stamina < 50);
  if (tired.length > 0) {
    const worst = [...tired].sort((a, b) => a.stamina - b.stamina)[0];
    notifications.push({
      id: 'tired',
      icon: '😴',
      title: `${tired.length} jogador(es) cansado(s)`,
      message: `${worst.name} está com apenas ${worst.stamina}% de energia. Use o botão de descanso ou melhore o Centro de Fisioterapia (Nv.${infrastructure.physiotherapy.level}).`,
      type: 'warning',
    });
  }

  // Low morale
  const lowMorale = players.filter(p => p.morale < 40);
  if (lowMorale.length > 0) {
    const worst = [...lowMorale].sort((a, b) => a.morale - b.morale)[0];
    notifications.push({
      id: 'morale',
      icon: '😤',
      title: `${lowMorale.length} jogador(es) com moral baixa`,
      message: `${worst.name} está com ${worst.morale}% de moral. Vitórias consecutivas ajudam a recuperar a moral do elenco.`,
      type: 'warning',
    });
  }

  // Listed for sale
  if (listedPlayers.length > 0) {
    notifications.push({
      id: 'listed',
      icon: '🏷️',
      title: `${listedPlayers.length} na lista de transferência`,
      message: 'Jogadores listados aguardando propostas no Mercado > Vender.',
      type: 'info',
    });
  }

  // Low budget
  const totalSalaries = players.reduce((s, p) => s + p.salary, 0);
  if (budget < totalSalaries * 3) {
    const monthsLeft = totalSalaries > 0 ? Math.floor(budget / totalSalaries) : 99;
    notifications.push({
      id: 'budget',
      icon: '💰',
      title: 'Orçamento crítico!',
      message: `Restam ~${monthsLeft} meses de salários (R$${(budget / 1000).toFixed(0)}k). Considere vender jogadores ou buscar patrocínios.`,
      type: 'danger',
    });
  }

  // Small squad
  if (players.length < 16) {
    notifications.push({
      id: 'squad',
      icon: '👥',
      title: 'Elenco curto',
      message: `Apenas ${players.length} jogadores. O ideal é ter no mínimo 18. Contrate no Mercado ou promova da base!`,
      type: 'warning',
    });
  }

  // Infrastructure tips
  if (infrastructure.trainingCenter.level < 3) {
    notifications.push({
      id: 'ct_tip',
      icon: '🏋️',
      title: 'Dica: Centro de Treinamento',
      message: `Seu CT está no Nv.${infrastructure.trainingCenter.level}. Melhorar aumenta a chance dos jogadores evoluírem nos treinos!`,
      type: 'info',
    });
  }

  if (infrastructure.physiotherapy.level < 3) {
    notifications.push({
      id: 'physio_tip',
      icon: '🏥',
      title: 'Dica: Fisioterapia',
      message: `Fisioterapia Nv.${infrastructure.physiotherapy.level} — seus jogadores recuperam pouca energia entre jogos. Melhore na aba Infraestrutura!`,
      type: 'info',
    });
  }

  // Top scorer info
  const topScorer = [...players].sort((a, b) => b.goals - a.goals)[0];
  if (topScorer && topScorer.goals > 0) {
    notifications.push({
      id: 'topscorer',
      icon: '⚽',
      title: 'Artilheiro',
      message: `${topScorer.name} lidera com ${topScorer.goals} gol(s) e ${topScorer.assists} assistência(s).`,
      type: 'info',
    });
  }

  // Best overall player
  const bestPlayer = [...players].sort((a, b) => b.overall - a.overall)[0];
  if (bestPlayer) {
    notifications.push({
      id: 'best',
      icon: '⭐',
      title: 'Melhor jogador',
      message: `${bestPlayer.name} (${bestPlayer.position}) — OVR ${bestPlayer.overall} | ${bestPlayer.age} anos | R$${(bestPlayer.salary / 1000).toFixed(0)}k/mês`,
      type: 'info',
    });
  }

  const visible = notifications.filter(n => !dismissed.includes(n.id));
  const count = visible.length;
  const urgentCount = visible.filter(n => n.type === 'danger').length;

  const typeBorder = {
    danger: 'border-l-destructive',
    warning: 'border-l-yellow-400',
    info: 'border-l-primary',
    success: 'border-l-emerald-400',
  };
  const typeBg = {
    danger: 'bg-destructive/10',
    warning: 'bg-yellow-400/5',
    info: 'bg-primary/5',
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
        <Bell className={`h-5 w-5 ${urgentCount > 0 ? 'text-destructive' : ''}`} />
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
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <Card className="absolute right-0 top-11 w-80 sm:w-[420px] z-50 shadow-2xl border-border/80">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-card">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🔔</span>
                  <p className="text-sm font-bold">Notificações</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {urgentCount > 0 && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 h-4">{urgentCount} urgente(s)</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] h-5">{count}</Badge>
                </div>
              </div>
              <ScrollArea className="max-h-[400px]">
                {visible.length === 0 ? (
                  <div className="text-center py-8 px-3">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="text-xs text-muted-foreground">Tudo em ordem, Manager!</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1.5">
                    {visible.map(n => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-lg border-l-[3px] ${typeBorder[n.type]} ${typeBg[n.type]} cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={() => setDismissed(prev => [...prev, n.id])}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm">{n.icon}</span>
                          <p className="text-[11px] font-bold flex-1">{n.title}</p>
                          <span className="text-[8px] text-muted-foreground">✕</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed ml-6">{n.message}</p>
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
