import { Club } from '@/types/game';
import { getStadiumCapacity } from '@/types/infrastructure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Heart, Flame, Home, Baby, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateTotalMembers } from '@/lib/membersCalc';

interface Props {
  club: Club;
  winStreak: number;
  loseStreak: number;
  stadiumLevel: number;
  ticketPrice: number;
}

export function FansTab({ club, winStreak, loseStreak, stadiumLevel, ticketPrice }: Props) {
  const totalFans = club.fans;

  // Sócios torcedores — fonte única (mesmo cálculo usado em MembersTab).
  const socios = calculateTotalMembers({
    totalFans,
    reputation: club.reputation || 50,
    wins: club.stats?.wins ?? 0,
    draws: club.stats?.draws ?? 0,
    losses: club.stats?.losses ?? 0,
  });

  // Outras categorias mantidas como antes.
  const familias = Math.floor(totalFans * 0.25);
  const fanaticas = Math.floor(totalFans * 0.15);
  const acompanham = Math.floor(totalFans * 0.35);
  const casuais = Math.max(0, totalFans - familias - fanaticas - acompanham - socios);

  // Stadium capacity based on level
  const stadiumCapacity = getStadiumCapacity(stadiumLevel);

  // Attendance calculation
  const baseAttendance = Math.min(totalFans * 0.15, stadiumCapacity);
  const streakMultiplier = winStreak >= 4 ? 1.5 : winStreak >= 3 ? 1.3 : winStreak >= 2 ? 1.15 : loseStreak >= 6 ? 0.5 : loseStreak >= 5 ? 0.6 : loseStreak >= 4 ? 0.75 : loseStreak >= 3 ? 0.85 : 1;
  const priceMultiplier = ticketPrice > 100 ? 0.7 : ticketPrice > 60 ? 0.85 : ticketPrice < 15 ? 1.2 : 1;
  const reputationBonus = club.reputation / 100;
  const estimatedAttendance = Math.min(stadiumCapacity, Math.floor(baseAttendance * streakMultiplier * priceMultiplier * (0.7 + reputationBonus * 0.5)));
  const occupancy = stadiumCapacity > 0 ? Math.round((estimatedAttendance / stadiumCapacity) * 100) : 0;

  // More tolerant mood: crisis only after 5+ losses
  const fanMood = winStreak >= 4 ? 'Eufórica 🔥' : winStreak >= 3 ? 'Empolgada 😄' : winStreak >= 2 ? 'Animada 🙂' : loseStreak >= 6 ? 'Revoltada 😡' : loseStreak >= 5 ? 'Insatisfeita 😤' : loseStreak >= 4 ? 'Preocupada 😟' : loseStreak >= 3 ? 'Inquieta 😐' : 'Estável 😊';
  const moodColor = winStreak >= 3 ? 'text-emerald-400' : loseStreak >= 5 ? 'text-destructive' : loseStreak >= 3 ? 'text-primary' : 'text-foreground';

  const fanCategories = [
    { name: 'Fanáticas/Organizadas', count: fanaticas, icon: Flame, color: 'text-red-400', desc: 'Presentes em TODOS os jogos, fazem festa nas arquibancadas' },
    { name: 'Acompanham os Jogos', count: acompanham, icon: Users, color: 'text-blue-400', desc: 'Frequentadores regulares do estádio' },
    { name: 'Famílias', count: familias, icon: Baby, color: 'text-green-400', desc: 'Levam crianças, buscam diversão e segurança' },
    { name: 'Sócios', count: socios, icon: Shield, color: 'text-yellow-400', desc: 'Pagam mensalidade, prioridade em ingressos' },
    { name: 'Casuais', count: casuais, icon: Heart, color: 'text-purple-400', desc: 'Torcem de casa, vão ao estádio ocasionalmente' },
  ];

  const formatFans = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toString();

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Torcida do {club.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-2xl font-bold text-primary">{formatFans(totalFans)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Torcedores</p>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className={`text-lg font-bold ${moodColor}`}>{fanMood}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Humor</p>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-2xl font-bold">{club.reputation}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Reputação</p>
            </div>
          </div>

          {/* Streak indicator & Sequence Display */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg border border-white/5">
              {winStreak >= 2 ? (
                <><TrendingUp className="h-5 w-5 text-emerald-400" /><span className="text-sm text-emerald-400 font-bold uppercase italic">{winStreak} vitórias seguidas — Torcida em êxtase! 🔥</span></>
              ) : loseStreak >= 2 ? (
                <><TrendingDown className="h-5 w-5 text-destructive" /><span className="text-sm text-destructive font-bold uppercase italic">{loseStreak} derrotas seguidas — Torcida abandonando... 😟</span></>
              ) : (
                <><Heart className="h-5 w-5 text-primary" /><span className="text-sm text-muted-foreground font-bold uppercase italic">Sem sequência definida — Clima estável 😊</span></>
              )}
            </div>

            {/* Visual Sequence for Fans */}
            <div className="flex flex-col gap-2 p-3 bg-black/20 rounded-lg border border-white/5">
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest italic">Sequência de Resultados</span>
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, idx) => {
                  // Determine result based on streaks for visual consistency
                  let res = '';
                  if (idx < winStreak) res = 'V';
                  else if (idx < winStreak + (loseStreak > 0 ? 0 : 0)) res = ''; // Simplified
                  else if (idx < loseStreak) res = 'D';

                  // We actually want to show the real last 5 if possible, but streaks are provided as numbers
                  // For now, let's use the streaks to simulate the start of the sequence
                  const displayRes = idx < winStreak ? 'V' : (idx < loseStreak ? 'D' : '-');
                  
                  return (
                    <div 
                      key={idx} 
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-black text-white shadow-md border border-black/20
                        ${displayRes === 'V' ? 'bg-[#22c55e]' : displayRes === 'D' ? 'bg-[#ef4444]' : 'bg-[#94a3b8]'}`}
                    >
                      {displayRes !== '-' ? displayRes : ''}
                    </div>
                  );
                })}
              </div>
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
                <Progress value={(cat.count / totalFans) * 100} className="h-1 mt-1" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Stadium Attendance */}
      <Card className="border-orange-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Home className="h-4 w-4" /> Previsão de Público
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-xl font-bold">{estimatedAttendance.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Público Estimado</p>
            </div>
            <div className="text-center bg-muted/30 rounded-lg p-3">
              <p className="text-xl font-bold">{stadiumCapacity.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Capacidade</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Ocupação</span>
              <span className={occupancy >= 80 ? 'text-emerald-400 font-bold' : occupancy < 40 ? 'text-destructive' : ''}>{occupancy}%</span>
            </div>
            <Progress value={occupancy} className="h-2" />
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>• Sequência de vitórias: <span className={winStreak >= 2 ? 'text-emerald-400 font-semibold' : ''}>{winStreak >= 2 ? `+${Math.round((streakMultiplier - 1) * 100)}% público` : 'sem efeito'}</span></p>
            <p>• Sequência de derrotas: <span className={loseStreak >= 2 ? 'text-destructive font-semibold' : ''}>{loseStreak >= 2 ? `${Math.round((streakMultiplier - 1) * 100)}% público` : 'sem efeito'}</span></p>
            <p>• Ingresso R${ticketPrice}: <span className={priceMultiplier < 1 ? 'text-yellow-400' : priceMultiplier > 1 ? 'text-emerald-400' : ''}>{priceMultiplier < 1 ? 'caro, reduz público' : priceMultiplier > 1 ? 'barato, atrai mais' : 'preço justo'}</span></p>
            <p>• Receita estimada: <span className="text-primary font-semibold">R$ {((estimatedAttendance * ticketPrice) / 1000).toFixed(0)}k/jogo</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
