import { GameEvent } from '@/types/events';
import { Club } from '@/types/game';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';

interface Props {
  club: Club;
  events: GameEvent[];
}

function generateHeadline(club: Club, events: GameEvent[]): { headline: string; subtitle: string; category: string } {
  const totalGames = club.stats.wins + club.stats.draws + club.stats.losses;

  // Check recent events first
  if (events.length > 0) {
    const latest = events[0];
    switch (latest.type) {
      case 'injury':
        return { headline: latest.title.replace(/^[^\s]+\s/, ''), subtitle: latest.description, category: 'LESÃO' };
      case 'offer':
        return { headline: `BOMBA! ${latest.title.replace(/^[^\s]+\s/, '')}`, subtitle: latest.description, category: 'MERCADO' };
      case 'protest':
        return { headline: 'CRISE NO CLUBE!', subtitle: latest.description, category: 'BASTIDORES' };
      case 'bonus':
        return { headline: 'DIRETORIA PREMIA ELENCO', subtitle: latest.description, category: 'FINANÇAS' };
      case 'discovery':
        return { headline: 'JOIA DA BASE DESCOBERTA!', subtitle: latest.description, category: 'CANTEIRA' };
      case 'scandal':
        return { headline: 'ESCÂNDALO!', subtitle: latest.description, category: 'POLÊMICA' };
    }
  }

  // Generate based on club state
  if (totalGames === 0) {
    return { headline: `${club.name} SE PREPARA PARA A TEMPORADA`, subtitle: 'Pré-temporada em andamento. Torcida ansiosa pelo início.', category: 'PRÉ-TEMPORADA' };
  }

  const winRate = club.stats.wins / totalGames;
  if (winRate > 0.7) {
    return { headline: `${club.name} ARRASA NA TEMPORADA!`, subtitle: `Com ${club.stats.wins} vitórias em ${totalGames} jogos, clube lidera com força.`, category: 'DESTAQUE' };
  }
  if (winRate < 0.3) {
    return { headline: `CRISE: ${club.name} NÃO REAGE`, subtitle: `Apenas ${club.stats.wins} vitórias em ${totalGames} jogos preocupa torcida.`, category: 'CRISE' };
  }

  return { headline: `${club.name}: TEMPORADA EQUILIBRADA`, subtitle: `${club.stats.points} pontos em ${totalGames} jogos disputados.`, category: 'CAMPEONATO' };
}

function generateSecondaryNews(club: Club, events: GameEvent[]): { text: string }[] {
  const news: { text: string }[] = [];
  const topPlayer = [...club.players].sort((a, b) => b.overall - a.overall)[0];
  const topScorer = [...club.players].sort((a, b) => b.goals - a.goals)[0];

  if (topPlayer) news.push({ text: `${topPlayer.name} (OVR ${topPlayer.overall}) é destaque do elenco` });
  if (topScorer && topScorer.goals > 0) news.push({ text: `Artilheiro: ${topScorer.name} com ${topScorer.goals} gols` });
  if (club.fans > 20000) news.push({ text: `Torcida cresce: ${club.fans.toLocaleString()} torcedores` });
  if (club.reputation >= 80) news.push({ text: 'Reputação do clube atinge nível internacional' });

  // Add older events as smaller news
  events.slice(1, 4).forEach(ev => {
    news.push({ text: `${ev.icon} ${ev.title}` });
  });

  return news.slice(0, 4);
}

export function NewspaperCard({ club, events }: Props) {
  const main = generateHeadline(club, events);
  const secondary = generateSecondaryNews(club, events);

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-0 px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-between border-b-2 border-foreground pb-1 mb-2">
          <div className="flex items-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">Diário do Futebol</span>
          </div>
          <span className="text-[8px] sm:text-[10px] text-muted-foreground">Edição Semanal</span>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
        {/* Main headline */}
        <div className="border-b border-border/50 pb-2">
          <span className="text-[8px] sm:text-[9px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-center">
            {main.category}
          </span>
          <h3 className="text-sm sm:text-base font-black uppercase leading-tight mt-1">{main.headline}</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">{main.subtitle}</p>
        </div>

        {/* Secondary news */}
        {secondary.length > 0 && (
          <div className="space-y-1">
            {secondary.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[8px] text-primary font-bold mt-0.5">▸</span>
                <p className="text-[9px] sm:text-[11px] text-muted-foreground leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
