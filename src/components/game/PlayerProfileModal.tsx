import { Player, PlayerAttributes } from '@/types/game';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const posLabels: Record<string, string> = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante',
};

const posColors: Record<string, string> = {
  GOL: 'bg-primary/15 text-primary',
  ZAG: 'bg-blue-500/15 text-blue-400',
  LAT: 'bg-cyan-500/15 text-cyan-400',
  VOL: 'bg-emerald-500/15 text-emerald-400',
  MEI: 'bg-purple-500/15 text-purple-400',
  ATA: 'bg-red-500/15 text-red-400',
};

const attrLabels: Record<string, { label: string; icon: string }> = {
  speed: { label: 'Velocidade', icon: '⚡' },
  shooting: { label: 'Finalização', icon: '🎯' },
  passing: { label: 'Passe', icon: '📐' },
  defending: { label: 'Defesa', icon: '🛡️' },
  physical: { label: 'Físico', icon: '💪' },
  dribbling: { label: 'Drible', icon: '🎨' },
  setPieces: { label: 'Bola Parada', icon: '🎱' },
  positioning: { label: 'Posicionamento', icon: '📍' },
  heading: { label: 'Cabeceio', icon: '🗣️' },
  marking: { label: 'Marcação', icon: '🔒' },
  vision: { label: 'Visão de Jogo', icon: '👁️' },
  crossing: { label: 'Cruzamento', icon: '🎯' },
  longShots: { label: 'Chute de Longe', icon: '🚀' },
  workRate: { label: 'Intensidade', icon: '🔥' },
  composure: { label: 'Compostura', icon: '🧠' },
  aggression: { label: 'Agressividade', icon: '⚔️' },
};

function getAttrColor(val: number): string {
  if (val >= 80) return 'text-emerald-400';
  if (val >= 60) return 'text-primary';
  if (val >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

interface Props {
  player: Player;
  children: React.ReactNode;
}

export function PlayerProfileModal({ player, children }: Props) {
  const avgRating = player.seasonRatings && player.seasonRatings.length > 0
    ? (player.seasonRatings.reduce((a, b) => a + b, 0) / player.seasonRatings.length)
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${posColors[player.position]}`}>{player.position}</span>
            {player.name}
          </DialogTitle>
        </DialogHeader>

        {/* Basic Info */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Posição</p>
            <p className="font-semibold">{posLabels[player.position]}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Overall</p>
            <p className="font-bold text-lg text-primary">{player.overall}</p>
          </div>
          <div className="bg-muted/30 rounded p-2 text-center">
            <p className="text-[10px] text-muted-foreground">Idade</p>
            <p className="font-semibold">{player.age} anos</p>
          </div>
        </div>

        {/* Contract & Salary */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/30 rounded p-2">
            <p className="text-[10px] text-muted-foreground">📄 Contrato</p>
            <p className={`font-semibold ${player.contract <= 1 ? 'text-destructive' : ''}`}>
              {player.contract} {player.contract === 1 ? 'ano' : 'anos'} {player.contract <= 1 && '⚠️'}
            </p>
          </div>
          <div className="bg-muted/30 rounded p-2">
            <p className="text-[10px] text-muted-foreground">💰 Salário</p>
            <p className="font-semibold text-primary">R$ {(player.salary / 1000).toFixed(0)}k/mês</p>
          </div>
        </div>

        {/* Career Stats */}
        <div>
          <p className="text-xs font-semibold mb-1.5">🏆 Estatísticas da Carreira</p>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-[10px] text-muted-foreground">Jogos</p>
              <p className="font-bold">{player.gamesPlayed}</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-[10px] text-muted-foreground">⚽ Gols</p>
              <p className="font-bold">{player.goals}</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-[10px] text-muted-foreground">🅰️ Assist.</p>
              <p className="font-bold">{player.assists}</p>
            </div>
            <div className="bg-muted/30 rounded p-2 text-center">
              <p className="text-[10px] text-muted-foreground">★ Média</p>
              <p className={`font-bold ${avgRating && avgRating >= 7 ? 'text-emerald-400' : avgRating && avgRating >= 5.5 ? 'text-primary' : 'text-destructive'}`}>
                {avgRating ? avgRating.toFixed(1) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Match Rating */}
        {player.matchRating != null && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Nota última partida:</span>
            <span className={`font-bold ${player.matchRating >= 7 ? 'text-emerald-400' : player.matchRating >= 5.5 ? 'text-primary' : 'text-destructive'}`}>
              ★ {player.matchRating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Stamina & Morale */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
              <span>⚡ Energia</span>
              <span className={player.stamina < 60 ? 'text-destructive' : ''}>{player.stamina}%</span>
            </div>
            <Progress value={player.stamina} className="h-1.5" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
              <span>😊 Moral</span>
              <span>{player.morale}%</span>
            </div>
            <Progress value={player.morale} className="h-1.5" />
          </div>
        </div>

        {/* All Attributes */}
        <div>
          <p className="text-xs font-semibold mb-1.5">📊 Atributos</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {Object.entries(player.attributes).filter(([_, val]) => val != null).map(([key, val]) => (
              <div key={key} className="bg-muted/30 rounded p-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">{attrLabels[key]?.icon} {attrLabels[key]?.label || key}</span>
                  <span className={`text-[10px] font-bold ${getAttrColor(val as number)}`}>{val}</span>
                </div>
                <Progress value={val as number} className="h-1 mt-0.5" />
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div>
          <p className="text-xs font-semibold mb-1.5">📜 Histórico de Clubes</p>
          {player.history && player.history.length > 0 ? (
            <div className="space-y-1">
              {player.history.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] bg-muted/20 rounded px-2 py-1.5">
                  <span className="font-semibold">{h.club}</span>
                  <span className="text-muted-foreground">
                    T{h.seasonStart}{h.seasonEnd ? `–T${h.seasonEnd}` : ' (atual)'}
                  </span>
                  <span className="ml-auto">{h.games}j</span>
                  <span>⚽{h.goals}</span>
                  <span>🅰️{h.assists}</span>
                  {h.avgRating > 0 && (
                    <span className="font-bold text-primary">★{h.avgRating.toFixed(1)}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground bg-muted/20 rounded px-2 py-1.5">Sem histórico de clubes anteriores.</p>
          )}
        </div>

        {/* Injury */}
        {player.injury && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-destructive">🏥 LESIONADO</span>
              <Badge variant="destructive" className="text-[9px] ml-auto">{player.injury.severity}</Badge>
            </div>
            <p className="text-[11px] font-semibold">{player.injury.type}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Progress value={((player.injury.originalWeeks - player.injury.weeksRemaining) / player.injury.originalWeeks) * 100} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground">{player.injury.weeksRemaining}/{player.injury.originalWeeks} partidas</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
