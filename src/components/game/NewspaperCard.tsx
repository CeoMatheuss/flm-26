import { useState } from 'react';
import { GameEvent } from '@/types/events';
import { Club } from '@/types/game';
import { Infrastructure } from '@/types/infrastructure';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  club: Club;
  events: GameEvent[];
  infrastructure?: Infrastructure;
}

function generateHeadline(club: Club, events: GameEvent[], infrastructure?: Infrastructure): { headline: string; subtitle: string; category: string } {
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
      case 'player_upgrade':
        return { headline: latest.title, subtitle: latest.description, category: 'EVOLUÇÃO' };
      case 'fan_rage':
        return { headline: 'ORGANIZADAS EXPLODEM!', subtitle: latest.description, category: 'TORCIDA' };
      case 'stadium_upgrade':
        return { headline: '🏟️ ESTÁDIO EXPANDIDO!', subtitle: latest.description, category: 'INFRAESTRUTURA' };
      case 'transfer_in':
        return { headline: 'REFORÇO CHEGA!', subtitle: latest.description, category: 'MERCADO' };
      case 'transfer_out':
        return { headline: 'JOGADOR SAI DO CLUBE', subtitle: latest.description, category: 'MERCADO' };
      case 'record':
        return { headline: '🏆 RECORDE HISTÓRICO!', subtitle: latest.description, category: 'HISTÓRIA' };
      case 'derby':
        return { headline: '⚔️ CLÁSSICO ESQUENTA!', subtitle: latest.description, category: 'RIVALIDADE' };
      case 'weather':
        return { headline: latest.title, subtitle: latest.description, category: 'CLIMA' };
      case 'captain':
        return { headline: latest.title, subtitle: latest.description, category: 'LIDERANÇA' };
    }
  }

  // Stadium expansion news
  if (infrastructure && infrastructure.stadium.level >= 3) {
    const stadiumCapacity = getStadiumCapacity(infrastructure.stadium.level);
    if (Math.random() < 0.3) {
      return {
        headline: `${club.stadiumName}: ARENA DE ${stadiumCapacity.toLocaleString()} LUGARES`,
        subtitle: `Expansão do estádio para nível ${infrastructure.stadium.level} atrai mais torcedores e aumenta receita por jogo.`,
        category: 'INFRAESTRUTURA',
      };
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

function getStadiumCapacity(level: number): number {
  const capacities: Record<number, number> = { 1: 5000, 2: 10000, 3: 20000, 4: 35000, 5: 50000, 6: 65000, 7: 80000, 8: 95000, 9: 110000, 10: 130000 };
  return capacities[level] || 5000;
}

function generateSecondaryNews(club: Club, events: GameEvent[], infrastructure?: Infrastructure): { text: string; category?: string }[] {
  const news: { text: string; category?: string }[] = [];
  const topPlayer = [...club.players].sort((a, b) => b.overall - a.overall)[0];
  const topScorer = [...club.players].sort((a, b) => b.goals - a.goals)[0];
  const topAssister = [...club.players].sort((a, b) => b.assists - a.assists)[0];
  const youngStar = [...club.players].filter(p => p.age <= 21).sort((a, b) => b.overall - a.overall)[0];
  const injuredCount = club.players.filter(p => p.injury).length;
  const avgAge = club.players.length > 0 ? (club.players.reduce((s, p) => s + p.age, 0) / club.players.length).toFixed(1) : '0';
  const avgOvr = club.players.length > 0 ? Math.round(club.players.reduce((s, p) => s + p.overall, 0) / club.players.length) : 0;

  if (topPlayer) news.push({ text: `⭐ ${topPlayer.name} (OVR ${topPlayer.overall}) é destaque do elenco`, category: 'ELENCO' });
  if (topScorer && topScorer.goals > 0) news.push({ text: `⚽ Artilheiro: ${topScorer.name} com ${topScorer.goals} gols`, category: 'GOLS' });
  if (topAssister && topAssister.assists > 0) news.push({ text: `🅰️ Garçom: ${topAssister.name} com ${topAssister.assists} assistências`, category: 'PASSES' });
  if (youngStar) news.push({ text: `🌟 Joia da base: ${youngStar.name} (${youngStar.age}a, OVR ${youngStar.overall})`, category: 'CANTEIRA' });
  if (injuredCount > 0) news.push({ text: `🏥 DM lotado: ${injuredCount} jogador(es) no departamento médico`, category: 'LESÕES' });
  if (club.fans > 20000) news.push({ text: `👥 Torcida cresce: ${club.fans.toLocaleString()} torcedores`, category: 'TORCIDA' });
  if (club.reputation >= 80) news.push({ text: `🌍 Reputação do clube atinge nível internacional`, category: 'PRESTÍGIO' });
  
  // Stadium news
  if (infrastructure) {
    const cap = getStadiumCapacity(infrastructure.stadium.level);
    news.push({ text: `🏟️ ${club.stadiumName}: capacidade de ${cap.toLocaleString()} torcedores (Nv.${infrastructure.stadium.level})`, category: 'ESTÁDIO' });
    if (infrastructure.trainingCenter.level >= 5) {
      news.push({ text: `🏋️ CT de elite (Nv.${infrastructure.trainingCenter.level}) acelera evolução do elenco`, category: 'ESTRUTURA' });
    }
    if (infrastructure.youthAcademy.level >= 4) {
      news.push({ text: `🎓 Base forte (Nv.${infrastructure.youthAcademy.level}) produz talentos para o time principal`, category: 'CANTEIRA' });
    }
  }

  // Stats
  news.push({ text: `📊 Média de idade: ${avgAge} anos | Média OVR: ${avgOvr}`, category: 'ESTATÍSTICAS' });

  // Add older events as smaller news
  events.slice(1, 6).forEach(ev => {
    news.push({ text: `${ev.icon} ${ev.title}`, category: ev.type.toUpperCase() });
  });

  return news;
}

const categoryColors: Record<string, string> = {
  LESÃO: 'bg-orange-500/80',
  MERCADO: 'bg-blue-500/80',
  BASTIDORES: 'bg-red-500/80',
  FINANÇAS: 'bg-emerald-500/80',
  CANTEIRA: 'bg-purple-500/80',
  POLÊMICA: 'bg-yellow-600/80',
  EVOLUÇÃO: 'bg-green-500/80',
  TORCIDA: 'bg-red-600/80',
  INFRAESTRUTURA: 'bg-cyan-500/80',
  HISTÓRIA: 'bg-amber-500/80',
  RIVALIDADE: 'bg-orange-600/80',
  CLIMA: 'bg-sky-500/80',
  CAMPEONATO: 'bg-primary/80',
  DESTAQUE: 'bg-emerald-500/80',
  CRISE: 'bg-destructive/80',
  'PRÉ-TEMPORADA': 'bg-primary/80',
  LIDERANÇA: 'bg-yellow-500/80',
};

export function NewspaperCard({ club, events, infrastructure }: Props) {
  const [expanded, setExpanded] = useState(false);
  const main = generateHeadline(club, events, infrastructure);
  const secondary = generateSecondaryNews(club, events, infrastructure);
  const displayedNews = expanded ? secondary : secondary.slice(0, 3);

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
          <span className={`text-[8px] sm:text-[9px] font-bold text-white px-1.5 py-0.5 rounded text-center ${categoryColors[main.category] || 'bg-primary'}`}>
            {main.category}
          </span>
          <h3 className="text-sm sm:text-base font-black uppercase leading-tight mt-1">{main.headline}</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">{main.subtitle}</p>
        </div>

        {/* Secondary news */}
        {displayedNews.length > 0 && (
          <div className="space-y-1.5">
            {displayedNews.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[8px] text-primary font-bold mt-0.5">▸</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[11px] text-muted-foreground leading-snug">{item.text}</p>
                </div>
                {item.category && (
                  <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 shrink-0">{item.category}</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Ver Mais / Ver Menos */}
        {secondary.length > 3 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-[10px] sm:text-xs gap-1"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Ver Menos</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> Ver Mais ({secondary.length - 3})</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
