import { useState } from 'react';
import { MatchReport, InterviewScenario, InterviewChoice } from '@/types/matchReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, Mic, Trophy, ArrowLeft, Star } from 'lucide-react';

interface Props {
  report: MatchReport;
  interview: InterviewScenario;
  onInterviewChoice: (choice: InterviewChoice) => void;
  onClose: () => void;
  interviewDone: boolean;
}

export function MatchReportModal({ report, interview, onInterviewChoice, onClose, interviewDone }: Props) {
  const [tab, setTab] = useState<'stats' | 'events' | 'ratings' | 'interview'>('stats');
  const isWin = report.homeGoals > report.awayGoals;
  const isDraw = report.homeGoals === report.awayGoals;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-bold">Relatório da Partida</h2>
      </div>

      {/* Score */}
      <Card className={`border-2 ${isWin ? 'border-emerald-500/30 bg-emerald-500/5' : isDraw ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-6">
            <div className="text-right">
              <p className="text-sm font-bold">{report.homeTeam}</p>
            </div>
            <div className="text-3xl font-black font-mono">
              {report.homeGoals} <span className="text-muted-foreground text-lg">x</span> {report.awayGoals}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold">{report.awayTeam}</p>
            </div>
          </div>
          {report.manOfTheMatch && (
            <div className="mt-2 flex items-center justify-center gap-1">
              <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] text-yellow-400 font-medium">Melhor em campo: {report.manOfTheMatch}</span>
            </div>
          )}
          {report.goalScorers.filter(g => g.team === 'home').length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1">
              ⚽ {report.goalScorers.filter(g => g.team === 'home').map(g => `${g.name} ${g.minute}'`).join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1">
        {(['stats', 'events', 'ratings', 'interview'] as const).map(t => (
          <Button key={t} size="sm" variant={tab === t ? 'default' : 'outline'} onClick={() => setTab(t)} className="flex-1 h-8 text-[10px] gap-1">
            {t === 'stats' && <><BarChart3 className="h-3 w-3" /> Estatísticas</>}
            {t === 'events' && <>⚡ Eventos</>}
            {t === 'ratings' && <><Star className="h-3 w-3" /> Notas</>}
            {t === 'interview' && <><Mic className="h-3 w-3" /> Entrevista</>}
          </Button>
        ))}
      </div>

      {tab === 'stats' && (
        <Card>
          <CardContent className="p-3 space-y-2">
            {([
              ['Posse de bola', report.possession.home, report.possession.away, '%'],
              ['Finalizações', report.shots.home, report.shots.away, ''],
              ['No gol', report.shotsOnTarget.home, report.shotsOnTarget.away, ''],
              ['Passes', report.passes.home, report.passes.away, ''],
              ['Faltas', report.fouls.home, report.fouls.away, ''],
              ['Escanteios', report.corners.home, report.corners.away, ''],
              ['Cartões amarelos', report.yellowCards.home, report.yellowCards.away, ''],
              ['Cartões vermelhos', report.redCards.home, report.redCards.away, ''],
            ] as [string, number, number, string][]).map(([label, home, away, suffix]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs font-mono w-8 text-right">{home}{suffix}</span>
                <div className="flex-1 flex h-2 rounded overflow-hidden bg-muted/30">
                  <div className="bg-primary/70 h-full" style={{ width: `${(home / Math.max(1, home + away)) * 100}%` }} />
                  <div className="bg-destructive/50 h-full flex-1" />
                </div>
                <span className="text-xs font-mono w-8">{away}{suffix}</span>
                <span className="text-[9px] text-muted-foreground w-24 truncate">{label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {tab === 'events' && (
        <Card>
          <CardContent className="p-3">
            <ScrollArea className="h-[300px]">
              <div className="space-y-1.5">
                {report.events.map((ev, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs p-1.5 rounded ${ev.team === 'home' ? 'bg-primary/5' : 'bg-destructive/5'}`}>
                    <Badge variant="outline" className="text-[8px] w-8 justify-center shrink-0">{ev.minute}'</Badge>
                    <span>{ev.description}</span>
                  </div>
                ))}
                {report.events.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Sem eventos registrados</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {tab === 'ratings' && (
        <Card>
          <CardContent className="p-3">
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {Object.entries(report.playerRatings)
                  .sort(([, a], [, b]) => b - a)
                  .map(([pid, rating]) => {
                    const isMOTM = report.manOfTheMatch && Object.entries(report.playerRatings).find(([id]) => id === pid);
                    const ratingColor = rating >= 8 ? 'text-emerald-400' : rating >= 7 ? 'text-primary' : rating >= 6 ? 'text-yellow-400' : 'text-destructive';
                    return (
                      <div key={pid} className="flex items-center justify-between p-1.5 rounded bg-muted/10">
                        <span className="text-xs truncate">{pid.slice(0, 8)}...</span>
                        <div className="flex items-center gap-1.5">
                          {rating >= 8.5 && <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />}
                          <span className={`text-sm font-bold font-mono ${ratingColor}`}>{rating.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {tab === 'interview' && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold">Entrevista Pós-Jogo</span>
            </div>
            <div className="bg-muted/20 rounded-lg p-3 border border-border/50">
              <p className="text-xs font-medium">🎙️ Repórter:</p>
              <p className="text-sm mt-1 italic">"{interview.question}"</p>
            </div>
            {interviewDone ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">✅ Entrevista concluída!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {interview.choices.map(choice => {
                  const toneEmoji = { humble: '🙏', confident: '😎', aggressive: '😤', diplomatic: '🤝' }[choice.tone];
                  const toneLabel = { humble: 'Humilde', confident: 'Confiante', aggressive: 'Agressivo', diplomatic: 'Diplomático' }[choice.tone];
                  return (
                    <Button
                      key={choice.id}
                      variant="outline"
                      className="w-full h-auto p-3 text-left justify-start gap-2 whitespace-normal"
                      onClick={() => onInterviewChoice(choice)}
                    >
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <span>{toneEmoji}</span>
                          <Badge variant="outline" className="text-[7px] px-1">{toneLabel}</Badge>
                        </div>
                        <p className="text-xs">"{choice.text}"</p>
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
