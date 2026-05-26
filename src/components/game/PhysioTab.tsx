import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { HeartPulse, Activity, AlertTriangle, ShieldCheck, Bandage } from 'lucide-react';
import { Player } from '@/types/game';

interface Props {
  players: Player[];
}

const SEVERITY_COLOR: Record<string, string> = {
  leve: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  moderada: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  grave: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  cronica: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const BODY_PART_LABEL: Record<string, string> = {
  muscular: 'Muscular',
  joelho: 'Joelho',
  ligamento: 'Ligamento',
  tornozelo: 'Tornozelo',
  fadiga: 'Fadiga',
};

export function PhysioTab({ players }: Props) {
  const safe = Array.isArray(players) ? players : [];
  const injured = safe.filter(p => p.injury && p.injury.weeksRemaining > 0);
  const atRisk = safe.filter(p => !p.injury && ((p.stamina ?? 100) < 40 || (p.injuryProneness ?? 0) >= 70));
  const healthy = safe.length - injured.length;

  return (
    <div className="p-3 sm:p-5 space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
          <HeartPulse className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-none">Fisioterapia</h1>
          <p className="text-[10px] sm:text-xs font-bold text-white/40 uppercase tracking-widest mt-1">Centro Médico do Clube</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="bg-zinc-900/60 border-white/5 rounded-2xl">
          <CardContent className="p-3 sm:p-4 flex flex-col items-center gap-1">
            <Bandage className="w-4 h-4 text-red-400" />
            <p className="text-2xl font-black text-white">{injured.length}</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Lesionados</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-white/5 rounded-2xl">
          <CardContent className="p-3 sm:p-4 flex flex-col items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-2xl font-black text-white">{atRisk.length}</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Em Risco</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 border-white/5 rounded-2xl">
          <CardContent className="p-3 sm:p-4 flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <p className="text-2xl font-black text-white">{healthy}</p>
            <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Aptos</p>
          </CardContent>
        </Card>
      </div>

      {/* Lesionados */}
      <Card className="bg-zinc-900/60 border-white/5 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white/80">
            <Bandage className="w-4 h-4 text-red-400" />
            Em Tratamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {injured.length === 0 ? (
            <p className="text-center text-white/40 text-sm py-6">Nenhum jogador lesionado. Elenco 100% saudável! 💪</p>
          ) : (
            injured.map(p => {
              const inj = p.injury!;
              const progress = inj.originalWeeks > 0
                ? Math.round(((inj.originalWeeks - inj.weeksRemaining) / inj.originalWeeks) * 100)
                : 0;
              return (
                <div key={p.id} className="rounded-xl bg-white/5 border border-white/5 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center font-black text-white text-sm shrink-0">
                        {p.overall}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{p.name}</p>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                          {p.position} · {p.age}a
                        </p>
                      </div>
                    </div>
                    <Badge className={`${SEVERITY_COLOR[inj.severity] || ''} text-[9px] font-black uppercase tracking-widest`}>
                      {inj.severity}
                      {inj.isRelapse && ' · Recaída'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-white/60 mb-2">
                    {inj.type}
                    {inj.bodyPart && ` · ${BODY_PART_LABEL[inj.bodyPart] || inj.bodyPart}`}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-white/40">Recuperação</span>
                      <span className="text-red-400">{inj.weeksRemaining} sem. restantes</span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Em risco */}
      <Card className="bg-zinc-900/60 border-white/5 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white/80">
            <Activity className="w-4 h-4 text-amber-400" />
            Atletas em Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {atRisk.length === 0 ? (
            <p className="text-center text-white/40 text-sm py-4">Nenhum atleta em risco de lesão.</p>
          ) : (
            atRisk.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/5 p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center font-black text-white text-sm shrink-0">
                    {p.overall}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.name}</p>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      {p.position} · Fis {p.stamina ?? 100}% · Propensão {p.injuryProneness ?? 0}%
                    </p>
                  </div>
                </div>
                <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[9px] font-black uppercase tracking-widest">
                  Risco
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
