import { useState, useEffect } from 'react';
import { GameEvent } from '@/types/events';
import { Club } from '@/types/game';
import { Infrastructure, getStadiumCapacity } from '@/types/infrastructure';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ChevronDown, ChevronUp, ArrowLeft, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  club: Club;
  events: GameEvent[];
  infrastructure?: Infrastructure;
  onBack: () => void;
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
  ESTÁDIO: 'bg-cyan-500/80',
  ESTRUTURA: 'bg-blue-500/80',
  ELENCO: 'bg-primary/80',
  GOLS: 'bg-emerald-500/80',
  PASSES: 'bg-purple-500/80',
  LESÕES: 'bg-orange-500/80',
  PRESTÍGIO: 'bg-amber-500/80',
  ESTATÍSTICAS: 'bg-muted-foreground/80',
};

function generateAllNews(club: Club, events: GameEvent[], infrastructure?: Infrastructure): { text: string; category: string; isEvent?: boolean }[] {
  const news: { text: string; category: string; isEvent?: boolean }[] = [];
  
  // All events as news
  events.forEach(ev => {
    const catMap: Record<string, string> = {
      injury: 'LESÃO', offer: 'MERCADO', protest: 'BASTIDORES', bonus: 'FINANÇAS',
      discovery: 'CANTEIRA', scandal: 'POLÊMICA', player_upgrade: 'EVOLUÇÃO',
      fan_rage: 'TORCIDA', stadium_upgrade: 'INFRAESTRUTURA', transfer_in: 'MERCADO',
      transfer_out: 'MERCADO', record: 'HISTÓRIA', derby: 'RIVALIDADE',
      weather: 'CLIMA', captain: 'LIDERANÇA',
    };
    news.push({ text: `${ev.icon} ${ev.title} — ${ev.description}`, category: catMap[ev.type] || ev.type.toUpperCase(), isEvent: true });
  });

  // Infrastructure news
  if (infrastructure) {
    const cap = getStadiumCapacity(infrastructure.stadium.level);
    news.push({ text: `🏟️ ${club.stadiumName}: capacidade de ${cap.toLocaleString()} torcedores (Nv.${infrastructure.stadium.level})`, category: 'ESTÁDIO' });
    if (infrastructure.trainingCenter.level >= 2) {
      news.push({ text: `🏋️ Centro de Treinamento Nv.${infrastructure.trainingCenter.level} — evolução do elenco acelerada`, category: 'ESTRUTURA' });
    }
    if (infrastructure.youthAcademy.level >= 2) {
      news.push({ text: `🎓 Base Nv.${infrastructure.youthAcademy.level} — formando talentos para o time principal`, category: 'CANTEIRA' });
    }
    if (infrastructure.physiotherapy.level >= 2) {
      news.push({ text: `💊 Fisioterapia Nv.${infrastructure.physiotherapy.level} — recuperação mais rápida`, category: 'ESTRUTURA' });
    }
  }

  // Player stats
  const topPlayer = [...club.players].sort((a, b) => b.overall - a.overall)[0];
  const topScorer = [...club.players].sort((a, b) => b.goals - a.goals)[0];
  const topAssister = [...club.players].sort((a, b) => b.assists - a.assists)[0];
  const youngStar = [...club.players].filter(p => p.age <= 21).sort((a, b) => b.overall - a.overall)[0];
  const injuredCount = club.players.filter(p => p.injury).length;

  if (topPlayer) news.push({ text: `⭐ ${topPlayer.name} (OVR ${topPlayer.overall}) é destaque do elenco`, category: 'ELENCO' });
  if (topScorer && topScorer.goals > 0) news.push({ text: `⚽ Artilheiro: ${topScorer.name} com ${topScorer.goals} gols`, category: 'GOLS' });
  if (topAssister && topAssister.assists > 0) news.push({ text: `🅰️ Garçom: ${topAssister.name} com ${topAssister.assists} assistências`, category: 'PASSES' });
  if (youngStar) news.push({ text: `🌟 Joia da base: ${youngStar.name} (${youngStar.age}a, OVR ${youngStar.overall})`, category: 'CANTEIRA' });
  if (injuredCount > 0) news.push({ text: `🏥 DM lotado: ${injuredCount} jogador(es) no departamento médico`, category: 'LESÕES' });
  if (club.fans > 20000) news.push({ text: `👥 Torcida cresce: ${club.fans.toLocaleString()} torcedores`, category: 'TORCIDA' });
  if (club.reputation >= 80) news.push({ text: `🌍 Reputação do clube atinge nível internacional`, category: 'PRESTÍGIO' });

  const totalGames = club.stats.wins + club.stats.draws + club.stats.losses;
  if (totalGames > 0) {
    const avgAge = (club.players.reduce((s, p) => s + p.age, 0) / club.players.length).toFixed(1);
    const avgOvr = Math.round(club.players.reduce((s, p) => s + p.overall, 0) / club.players.length);
    news.push({ text: `📊 ${totalGames} jogos | ${club.stats.points}pts | Média: ${avgAge}a / OVR ${avgOvr}`, category: 'ESTATÍSTICAS' });
  }

  return news;
}

export function NewspaperFullPage({ club, events, infrastructure, onBack }: Props) {
  const allNews = generateAllNews(club, events, infrastructure);
  const [adminUpdates, setAdminUpdates] = useState<Array<{ id: string; title: string; content: string; created_at: string }>>([]);

  useEffect(() => {
    const fetchUpdates = async () => {
      const { data } = await supabase.from('journal_updates').select('*').order('created_at', { ascending: false }).limit(20);
      if (data) setAdminUpdates(data as any[]);
    };
    fetchUpdates();
  }, []);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5">
          <Newspaper className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Diário do Futebol</span>
        </div>
        <Badge variant="outline" className="text-[9px]">{allNews.length} notícias</Badge>
      </div>

      {/* Admin Updates */}
      {adminUpdates.length > 0 && (
        <div className="space-y-2">
          {adminUpdates.map(u => (
            <Card key={u.id} className="border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex items-start gap-2">
                <Megaphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-primary/80">ATUALIZAÇÃO</span>
                    <span className="text-[8px] text-muted-foreground">{new Date(u.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-xs font-semibold mt-1">{u.title}</p>
                  <p className="text-xs leading-snug text-muted-foreground">{u.content}</p>
                </div>
                <Badge variant="outline" className="text-[7px] shrink-0 border-primary/30 text-primary">ADM</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* News */}
      <div className="space-y-2">
        {allNews.map((item, i) => (
          <Card key={i} className="border-border">
            <CardContent className="p-3 flex items-start gap-2">
              <span className={`text-[8px] font-bold text-white px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${categoryColors[item.category] || 'bg-primary/80'}`}>
                {item.category}
              </span>
              <p className="text-xs leading-snug flex-1">{item.text}</p>
              {item.isEvent && <Badge variant="secondary" className="text-[7px] shrink-0">Evento</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
