import { Club } from '@/types/game';
import { getStadiumCapacity } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Heart, Flame, Home, Baby, Shield, TrendingUp, TrendingDown, DollarSign, Zap, Star } from 'lucide-react';
import { calculateTotalMembers } from '@/lib/membersCalc';
import { useMemo } from 'react';
import { calculateStadiumEconomy, safeNumber } from '@/match/stadiumEconomyEngine';
import { formatMoney } from '@/lib/formatMoney';

interface Props {
  club: Club;
  winStreak: number;
  loseStreak: number;
  stadiumLevel: number;
  ticketPrice: number;
}

export function FansTab({ club, winStreak, loseStreak, stadiumLevel, ticketPrice }: Props) {
  const totalFans = safeNumber(club.fans);
  
  // 1. Centralize economy logic using the new engine
  const economy = useMemo(() => {
    // Determine a default importance for the dashboard view
    const importance = (winStreak >= 4 || club.reputation >= 85) ? 'classico' : 'liga';
    
    // Count VIP units from club state if available
    const vipUnits = Object.values(club.vipBoxesBuilt || {}).reduce((a, b) => a + (b || 0), 0);

    return calculateStadiumEconomy({
      fans: totalFans,
      reputation: club.reputation || 50,
      ticketPrice: ticketPrice,
      winStreak: winStreak,
      loseStreak: loseStreak,
      importance: importance as any,
      stadiumCapacity: getStadiumCapacity(stadiumLevel),
      stadiumLevel: stadiumLevel,
      vipUnits: vipUnits
    });
  }, [totalFans, club.reputation, club.vipBoxesBuilt, ticketPrice, winStreak, loseStreak, stadiumLevel]);

  // 2. Derive visual states from economy result
  const fanMood = economy.mood.charAt(0).toUpperCase() + economy.mood.slice(1);
  const moodEmoji = economy.mood === 'eufórica' ? '🔥' : economy.mood === 'empolgada' ? '😄' : economy.mood === 'instável' ? '🙂' : '😡';
  const moodColor = economy.mood === 'eufórica' || economy.mood === 'empolgada' ? 'text-emerald-400' : economy.mood === 'crise' ? 'text-destructive' : 'text-primary';

  const socios = calculateTotalMembers({
    totalFans,
    reputation: club.reputation || 50,
    wins: club.stats?.wins ?? 0,
    draws: club.stats?.draws ?? 0,
    losses: club.stats?.losses ?? 0,
  });

  const familias = Math.floor(totalFans * 0.25);
  const fanaticas = Math.floor(totalFans * 0.15);
  const acompanham = Math.floor(totalFans * 0.35);
  const casuais = Math.max(0, totalFans - familias - fanaticas - acompanham - socios);

  const fanCategories = [
    { name: 'Fanáticas/Organizadas', count: fanaticas, icon: Flame, color: 'text-red-400', desc: 'Presentes em TODOS os jogos, fazem festa nas arquibancadas' },
    { name: 'Acompanham os Jogos', count: acompanham, icon: Users, color: 'text-blue-400', desc: 'Frequentadores regulares do estádio' },
    { name: 'Famílias', count: familias, icon: Baby, color: 'text-green-400', desc: 'Levam crianças, buscam diversão e segurança' },
    { name: 'Sócios', count: socios, icon: Shield, color: 'text-yellow-400', desc: 'Pagam mensalidade, prioridade em ingressos' },
    { name: 'Casuais', count: casuais, icon: Heart, color: 'text-purple-400', desc: 'Torcem de casa, vão ao estádio ocasionalmente' },
  ];

  const formatFans = (n: number) => {
    const sn = safeNumber(n);
    if (sn >= 1000000) return `${(sn / 1000000).toFixed(1)}M`;
    if (sn >= 1000) return `${(sn / 1000).toFixed(0)}k`;
    return sn.toString();
  };

  const formatCurrency = (n: number) => {
    const sn = safeNumber(n);
    if (sn >= 1000000) return `R$ ${(sn / 1000000).toFixed(1)}M`;
    if (sn >= 1000) return `R$ ${(sn / 1000).toFixed(0)}k`;
    return `R$ ${sn}`;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Torcida do {club.name}
            </div>
            <Badge variant="outline" className="text-xs uppercase font-black">{economy.visualState}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-2xl font-bold text-primary">{formatFans(totalFans)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Torcedores</p>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className={`text-lg font-bold ${moodColor}`}>{fanMood} {moodEmoji}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Humor</p>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-2xl font-bold">{club.reputation}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Reputação</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg border border-white/5">
              {winStreak >= 2 ? (
                <><TrendingUp className="h-5 w-5 text-emerald-400" /><span className="text-sm text-emerald-400 font-bold uppercase italic">{winStreak} vitórias seguidas — {economy.mood === 'eufórica' ? 'Êxtase total!' : 'Clima quente!'} 🔥</span></>
              ) : loseStreak >= 2 ? (
                <><TrendingDown className="h-5 w-5 text-destructive" /><span className="text-sm text-destructive font-bold uppercase italic">{loseStreak} derrotas seguidas — Torcida cobrando... 😟</span></>
              ) : (
                <><Heart className="h-5 w-5 text-primary" /><span className="text-sm text-muted-foreground font-bold uppercase italic">Sem sequência definida — Clima {economy.mood}</span></>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fan Categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tipos de Torcedor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fanCategories.map(cat => (
            <div key={cat.name} className="flex items-center gap-3 p-2 bg-muted/20 rounded-lg">
              <cat.icon className={`h-5 w-5 ${cat.color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">{cat.name}</p>
                  <Badge variant="outline" className="text-[10px]">{formatFans(cat.count)}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{cat.desc}</p>
                <Progress value={totalFans > 0 ? (cat.count / totalFans) * 100 : 0} className="h-1 mt-1" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stadium Attendance & Revenue */}
      <Card className="border-orange-500/20 overflow-hidden">
        <div className="bg-orange-500/10 p-4 pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4" /> Economia do Estádio
            </div>
            <Zap className="h-4 w-4 text-yellow-400" />
          </CardTitle>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xl font-bold">{economy.expectedAttendance.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Público Estimado</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xl font-bold">{formatCurrency(economy.revenue.total)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Receita Total</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Ocupação do Estádio</span>
              <span className={economy.occupancyRate >= 0.8 ? 'text-emerald-400 font-bold' : economy.occupancyRate < 0.3 ? 'text-destructive' : ''}>
                {Math.round(economy.occupancyRate * 100)}%
              </span>
            </div>
            <Progress value={economy.occupancyRate * 100} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-2 border-t border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase">Ingressos</span>
              <span className="text-xs font-bold">{formatCurrency(economy.revenue.tickets)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase">Camarotes</span>
              <span className="text-xs font-bold">{formatCurrency(economy.revenue.vip)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase">Comercial</span>
              <span className="text-xs font-bold">{formatCurrency(economy.revenue.commercial)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground uppercase">Estacionam.</span>
              <span className="text-xs font-bold">{formatCurrency(economy.revenue.parking)}</span>
            </div>
          </div>

          <div className="bg-primary/5 rounded-lg p-2 text-[10px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço do Ingresso:</span>
              <span className="font-bold">R$ {ticketPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacidade do Nv.{stadiumLevel}:</span>
              <span className="font-bold">{safeNumber(getStadiumCapacity(stadiumLevel)).toLocaleString()}</span>
            </div>
            <p className="text-[9px] italic text-muted-foreground mt-1 border-t border-white/5 pt-1">
              * Cálculos baseados em uma partida de {economy.mood === 'eufórica' ? 'alta demanda' : 'demanda regular'}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
