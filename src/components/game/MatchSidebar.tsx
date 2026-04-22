/**
 * MatchSidebar — Compact desktop-only sidebar shown alongside the match feed.
 * Groups quick stats, current moment, latest assistant tip, and substitution status.
 */
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ArrowUpDown } from 'lucide-react';
import type { MatchStats, MatchState, SimEvent } from '@/match';

interface Props {
  stats: MatchStats;
  matchState: MatchState;
  subsUsed: number;
  maxSubs: number;
  windowsUsed: number;
  maxWindows: number;
  isFinished: boolean;
}

const momentLabels: Record<string, { label: string; icon: string }> = {
  dominating: { label: 'Dominando', icon: '🔥' },
  pressing: { label: 'Pressionando', icon: '⚡' },
  defending: { label: 'Defendendo', icon: '🛡️' },
  counter: { label: 'Contra-ataque', icon: '💨' },
  tense: { label: 'Tenso', icon: '😰' },
  calm: { label: 'Calmo', icon: '😌' },
};

export function MatchSidebar({
  stats, matchState, subsUsed, maxSubs, windowsUsed, maxWindows, isFinished,
}: Props) {
  const latestTip = matchState.assistantTips.length > 0
    ? matchState.assistantTips[matchState.assistantTips.length - 1]
    : null;
  const moment = matchState.currentMoment ? momentLabels[matchState.currentMoment] : null;

  const quickStats: Array<[string, string, number, number]> = [
    ['⚡', 'Chutes', stats.shots[0], stats.shots[1]],
    ['🎯', 'No Gol', stats.shotsOnTarget[0], stats.shotsOnTarget[1]],
    ['🏳️', 'Escan.', stats.corners[0], stats.corners[1]],
    ['⚠️', 'Faltas', stats.fouls[0], stats.fouls[1]],
  ];

  return (
    <aside className="space-y-2.5">
      {/* Quick Stats — 2x2 compact grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {quickStats.map(([icon, label, h, a]) => (
          <div key={label} className="text-center bg-card/50 border border-border/20 rounded-lg p-1.5">
            <p className="text-[9px] text-muted-foreground">{icon} {label}</p>
            <p className="text-sm font-black font-mono">{h} <span className="text-muted-foreground/40">-</span> {a}</p>
          </div>
        ))}
      </div>

      {/* Match Moment */}
      {!isFinished && moment && (
        <div className="bg-card/50 border border-border/20 rounded-lg p-2 text-center">
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Momento</p>
          <p className="text-xs font-bold mt-0.5">{moment.icon} {moment.label}</p>
        </div>
      )}

      {/* Latest Assistant Tip */}
      {!isFinished && latestTip && (
        <div className="bg-amber-500/8 border border-amber-500/25 rounded-lg p-2">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare className="h-3 w-3 text-amber-400" />
            <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">
              Auxiliar • {latestTip.minute}'
            </p>
          </div>
          <p className="text-[11px] leading-snug">{latestTip.description}</p>
          {matchState.assistantTips.length > 1 && (
            <Badge variant="outline" className="text-[8px] mt-1 border-amber-500/30 text-amber-400 h-4">
              +{matchState.assistantTips.length - 1} alertas
            </Badge>
          )}
        </div>
      )}

      {/* Substitution Status */}
      {!isFinished && (
        <div className="bg-card/50 border border-border/20 rounded-lg p-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ArrowUpDown className="h-3 w-3 text-orange-400" />
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Substituições</p>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold">{subsUsed}/{maxSubs}</span>
            <span className="text-muted-foreground">subs</span>
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: maxSubs }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i < subsUsed ? 'bg-primary' : 'bg-muted/30'}`} />
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] mt-1.5">
            <span className="text-muted-foreground">Janelas</span>
            <span className="font-mono">{windowsUsed}/{maxWindows}</span>
          </div>
        </div>
      )}
    </aside>
  );
}
