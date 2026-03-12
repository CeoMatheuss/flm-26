import { useState, useEffect } from 'react';
import { GameEvent } from '@/types/events';
import { Club } from '@/types/game';
import { Infrastructure, getStadiumCapacity } from '@/types/infrastructure';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ExternalLink, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import signingImg from '@/assets/signing-bg.jpg';

interface Props {
  club: Club;
  events: GameEvent[];
  infrastructure?: Infrastructure;
  onOpenFullPage?: () => void;
  isNewClub?: boolean;
  clubCreatedAt?: number;
}

const transferNewsKeywords = [
  'vendido',
  'venda',
  'contratado',
  'contratacao',
  'transferencia',
  'emprestado',
  'emprestimo',
  'renovacao',
  'renovou',
  'assinou',
  'proposta aceita',
];

function normalizeNewsValue(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function shouldShowSigningImage(category: string, ...texts: Array<string | undefined>): boolean {
  const normalizedCategory = normalizeNewsValue(category || '');
  if (['mercado', 'fundacao', 'elenco', 'emprestimo', 'renovacao'].includes(normalizedCategory)) {
    return true;
  }

  const combinedText = normalizeNewsValue(texts.filter(Boolean).join(' '));
  return transferNewsKeywords.some(keyword => combinedText.includes(keyword));
}

function generateHeadline(club: Club, events: GameEvent[], infrastructure?: Infrastructure, isNewClub?: boolean, clubCreatedAt?: number): { headline: string; subtitle: string; category: string } {
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
      case 'season_awards':
        return { headline: latest.title, subtitle: latest.description, category: 'PREMIAÇÃO' };
      case 'player_unhappy':
        return { headline: latest.title, subtitle: latest.description, category: 'INSATISFAÇÃO' };
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

  // Only show pre-season for NEW clubs within 24h
  if (totalGames === 0) {
    const isWithin24h = isNewClub || (clubCreatedAt && (Date.now() - clubCreatedAt) < 24 * 60 * 60 * 1000);
    if (isWithin24h) {
      return { headline: `${club.name} NASCE! NOVO CLUBE NA CIDADE`, subtitle: 'A torcida celebra a fundação do clube. O início de uma grande história!', category: 'FUNDAÇÃO' };
    }
    // After 24h, show something more relevant
    const topPlayer = [...club.players].sort((a, b) => b.overall - a.overall)[0];
    if (topPlayer) {
      return { headline: `${topPlayer.name} É A ESTRELA DO ${club.name.toUpperCase()}`, subtitle: `Com OVR ${topPlayer.overall}, o craque lidera o elenco rumo ao primeiro jogo.`, category: 'ELENCO' };
    }
    return { headline: `${club.name}: ELENCO FORMADO`, subtitle: `${club.players.length} jogadores prontos para entrar em campo.`, category: 'ELENCO' };
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

  news.push({ text: `📊 Média de idade: ${avgAge} anos | Média OVR: ${avgOvr}`, category: 'ESTATÍSTICAS' });

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
  FUNDAÇÃO: 'bg-emerald-600/80',
  LIDERANÇA: 'bg-yellow-500/80',
  PREMIAÇÃO: 'bg-amber-600/80',
  INSATISFAÇÃO: 'bg-red-700/80',
  ELENCO: 'bg-primary/80',
  GOLS: 'bg-emerald-500/80',
  ESTATÍSTICAS: 'bg-muted-foreground/80',
  ESTÁDIO: 'bg-cyan-500/80',
  ESTRUTURA: 'bg-blue-500/80',
  PASSES: 'bg-purple-500/80',
  PRESTÍGIO: 'bg-amber-500/80',
  LESÕES: 'bg-orange-500/80',
  RENOVAÇÃO: 'bg-blue-600/80',
  EMPRÉSTIMO: 'bg-amber-500/80',
};

export function NewspaperCard({ club, events, infrastructure, onOpenFullPage, isNewClub, clubCreatedAt }: Props) {
  const [adminUpdates, setAdminUpdates] = useState<Array<{ id: string; title: string; content: string; created_at: string }>>([]);
  const main = generateHeadline(club, events, infrastructure, isNewClub, clubCreatedAt);
  const secondary = generateSecondaryNews(club, events, infrastructure).slice(0, 4);

  useEffect(() => {
    const fetchUpdates = async () => {
      const { data } = await supabase.from('journal_updates').select('*').order('created_at', { ascending: false }).limit(5);
      if (data) setAdminUpdates(data as any[]);
    };
    fetchUpdates();
  }, []);

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
          {(['MERCADO', 'FUNDAÇÃO', 'ELENCO', 'EMPRÉSTIMO', 'RENOVAÇÃO'].includes(main.category)) && (
            <div className="relative w-full h-28 sm:h-36 rounded-lg overflow-hidden mb-2">
              <img src={signingImg} alt="Contratação" className="w-full h-full object-cover object-top" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <span className={`text-[8px] sm:text-[9px] font-bold text-white px-1.5 py-0.5 rounded ${categoryColors[main.category] || 'bg-primary'}`}>
                  {main.category}
                </span>
                <h3 className="text-sm sm:text-base font-black uppercase leading-tight mt-1 text-white drop-shadow-lg">{main.headline}</h3>
              </div>
            </div>
          )}
          {!(['MERCADO', 'FUNDAÇÃO', 'ELENCO', 'EMPRÉSTIMO', 'RENOVAÇÃO'].includes(main.category)) && (
            <>
              <span className={`text-[8px] sm:text-[9px] font-bold text-white px-1.5 py-0.5 rounded text-center ${categoryColors[main.category] || 'bg-primary'}`}>
                {main.category}
              </span>
              <h3 className="text-sm sm:text-base font-black uppercase leading-tight mt-1">{main.headline}</h3>
            </>
          )}
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">{main.subtitle}</p>
        </div>

        {/* Admin Updates */}
        {adminUpdates.length > 0 && (
          <div className="space-y-1.5">
            {adminUpdates.slice(0, 2).map(u => (
              <div key={u.id} className="flex items-start gap-1.5 p-1.5 rounded bg-primary/5 border border-primary/20">
                <Megaphone className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[11px] font-semibold text-primary">{u.title}</p>
                  <p className="text-[8px] sm:text-[10px] text-muted-foreground leading-snug">{u.content}</p>
                </div>
                <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 shrink-0 border-primary/30 text-primary">ADM</Badge>
              </div>
            ))}
          </div>
        )}

        {/* Secondary news */}
        {secondary.length > 0 && (
          <div className="space-y-1.5">
            {secondary.map((item, i) => (
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

        {onOpenFullPage && (
          <Button
            variant="secondary"
            size="sm"
            className="w-full h-7 text-[10px] sm:text-xs gap-1"
            onClick={onOpenFullPage}
          >
            <ExternalLink className="h-3 w-3" /> Jornal Completo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
