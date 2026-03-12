import { useState, useEffect, useCallback } from 'react';
import { GameEvent } from '@/types/events';
import { Club } from '@/types/game';
import { Infrastructure, getStadiumCapacity } from '@/types/infrastructure';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ArrowLeft, Megaphone, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import signingImg from '@/assets/signing-bg.jpg';

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
  ATUALIZAÇÃO: 'bg-primary/80',
  RENOVAÇÃO: 'bg-blue-600/80',
  EMPRÉSTIMO: 'bg-amber-500/80',
  FUNDAÇÃO: 'bg-emerald-600/80',
};

interface SavedEntry {
  id: string;
  text: string;
  category: string;
  narration: string | null;
  is_event: boolean;
  created_at: string;
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
  if (['mercado', 'elenco', 'emprestimo', 'renovacao', 'fundacao'].includes(normalizedCategory)) {
    return true;
  }

  const combinedText = normalizeNewsValue(texts.filter(Boolean).join(' '));
  return transferNewsKeywords.some(keyword => combinedText.includes(keyword));
}

function generateCurrentNews(club: Club, events: GameEvent[], infrastructure?: Infrastructure): { text: string; category: string; isEvent?: boolean }[] {
  const news: { text: string; category: string; isEvent?: boolean }[] = [];

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

  if (infrastructure) {
    const cap = getStadiumCapacity(infrastructure.stadium.level);
    news.push({ text: `🏟️ ${club.stadiumName}: capacidade de ${cap.toLocaleString()} torcedores (Nv.${infrastructure.stadium.level})`, category: 'ESTÁDIO' });
    if (infrastructure.trainingCenter.level >= 2) news.push({ text: `🏋️ Centro de Treinamento Nv.${infrastructure.trainingCenter.level} — evolução acelerada`, category: 'ESTRUTURA' });
    if (infrastructure.youthAcademy.level >= 2) news.push({ text: `🎓 Base Nv.${infrastructure.youthAcademy.level} — formando talentos`, category: 'CANTEIRA' });
    if (infrastructure.physiotherapy.level >= 2) news.push({ text: `💊 Fisioterapia Nv.${infrastructure.physiotherapy.level} — recuperação rápida`, category: 'ESTRUTURA' });
  }

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
  const [adminUpdates, setAdminUpdates] = useState<Array<{ id: string; title: string; content: string; created_at: string }>>([]);
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [narrating, setNarrating] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [expandedNarration, setExpandedNarration] = useState<string | null>(null);

  // Save current news to DB and fetch history
  const saveAndLoad = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate current news
      const currentNews = generateCurrentNews(club, events, infrastructure);

      // Save current news (upsert by checking if similar text exists recently)
      if (currentNews.length > 0) {
        const entries = currentNews.map(n => ({
          user_id: user.id,
          text: n.text,
          category: n.category,
          is_event: n.isEvent || false,
        }));

        // Check last saved texts to avoid duplicates
        const { data: recent } = await supabase
          .from('newspaper_entries')
          .select('text')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        const recentTexts = new Set((recent || []).map(r => r.text));
        const newEntries = entries.filter(e => !recentTexts.has(e.text));

        if (newEntries.length > 0) {
          await supabase.from('newspaper_entries').insert(newEntries);
        }
      }

      // Load all saved entries
      const { data } = await supabase
        .from('newspaper_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (data) setSavedEntries(data as SavedEntry[]);

      // Load admin updates
      const { data: updates } = await supabase.from('journal_updates').select('*').order('created_at', { ascending: false }).limit(20);
      if (updates) setAdminUpdates(updates as any[]);
    } catch (err) {
      console.error('Error loading newspaper:', err);
    } finally {
      setLoading(false);
    }
  }, [club, events, infrastructure]);

  useEffect(() => {
    saveAndLoad();
  }, [saveAndLoad]);

  // Generate AI narration for entries without it
  const generateNarrations = async () => {
    const withoutNarration = savedEntries.filter(e => !e.narration).slice(0, 10);
    if (withoutNarration.length === 0) {
      toast.info('Todas as notícias já possuem narração!');
      return;
    }

    setNarrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-narration', {
        body: {
          headlines: withoutNarration.map(e => ({ text: e.text, category: e.category })),
        },
      });

      if (error) throw error;

      const narrations: string[] = data.narrations || [];

      // Update entries in DB with narrations
      for (let i = 0; i < withoutNarration.length && i < narrations.length; i++) {
        if (narrations[i]) {
          await supabase
            .from('newspaper_entries')
            .update({ narration: narrations[i] })
            .eq('id', withoutNarration[i].id);
        }
      }

      // Reload entries
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: updated } = await supabase
          .from('newspaper_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(200);
        if (updated) setSavedEntries(updated as SavedEntry[]);
      }

      toast.success(`Narração gerada para ${Math.min(narrations.length, withoutNarration.length)} notícias!`);
    } catch (err) {
      console.error('Narration error:', err);
      toast.error('Erro ao gerar narração');
    } finally {
      setNarrating(false);
    }
  };

  const visibleEntries = showMore ? savedEntries : savedEntries.slice(0, 30);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5">
          <Newspaper className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-[0.2em]">Diário do Futebol</span>
        </div>
        <Badge variant="outline" className="text-[9px]">{savedEntries.length} notícias</Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={generateNarrations}
          disabled={narrating}
          className="h-7 text-[10px] gap-1 ml-auto"
        >
          {narrating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {narrating ? 'Narrando...' : 'Gerar Narração IA'}
        </Button>
      </div>

      {/* Admin Updates */}
      {adminUpdates.length > 0 && (
        <div className="space-y-2">
          {adminUpdates.map(u => {
            const showSigningUpdate = shouldShowSigningImage('ATUALIZAÇÃO', u.title, u.content);

            return (
              <Card key={u.id} className="border-primary/30 bg-primary/5 overflow-hidden">
                <CardContent className="p-0">
                  {showSigningUpdate && (
                    <div className="relative w-full h-20 overflow-hidden">
                      <img src={signingImg} alt="Transferência" className="w-full h-full object-cover object-top opacity-60" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                      <div className="absolute bottom-2 left-3">
                        <span className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-primary/80">MERCADO</span>
                      </div>
                    </div>
                  )}

                  <div className="p-3 flex items-start gap-2">
                    <Megaphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded bg-primary/80">ATUALIZAÇÃO</span>
                        <span className="text-[8px] text-muted-foreground">{new Date(u.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-xs font-semibold mt-1">{u.title}</p>
                      <p className="text-xs leading-snug text-muted-foreground whitespace-pre-line">{u.content}</p>
                    </div>
                    <Badge variant="outline" className="text-[7px] shrink-0 border-primary/30 text-primary">ADM</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* News from DB */}
          <div className="space-y-2">
            {visibleEntries.map((item) => (
              <Card key={item.id} className="border-border overflow-hidden">
                <CardContent className="p-0">
                {(['MERCADO', 'ELENCO', 'EMPRÉSTIMO', 'RENOVAÇÃO'].includes(item.category) || item.text.toLowerCase().includes('vendido') || item.text.toLowerCase().includes('contratado') || item.text.toLowerCase().includes('emprestado') || item.text.toLowerCase().includes('renovação') || item.text.toLowerCase().includes('renovou')) && (
                    <div className="relative w-full h-24 overflow-hidden">
                      <img src={signingImg} alt="" className="w-full h-full object-cover object-top opacity-60" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
                      <div className="absolute bottom-2 left-3">
                        <span className={`text-[8px] font-bold text-white px-1.5 py-0.5 rounded ${categoryColors[item.category] || 'bg-primary/80'}`}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-start gap-2">
                      {!(['MERCADO', 'ELENCO', 'EMPRÉSTIMO', 'RENOVAÇÃO'].includes(item.category) || item.text.toLowerCase().includes('vendido') || item.text.toLowerCase().includes('contratado') || item.text.toLowerCase().includes('emprestado') || item.text.toLowerCase().includes('renovação') || item.text.toLowerCase().includes('renovou')) && (
                        <span className={`text-[8px] font-bold text-white px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${categoryColors[item.category] || 'bg-primary/80'}`}>
                          {item.category}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-snug">{item.text}</p>
                      {item.narration && (
                        <div
                          className="mt-1.5 cursor-pointer"
                          onClick={() => setExpandedNarration(expandedNarration === item.id ? null : item.id)}
                        >
                          <div className="flex items-center gap-1 text-[9px] text-primary font-medium">
                            <Sparkles className="h-2.5 w-2.5" />
                            <span>Narração IA</span>
                          </div>
                          {expandedNarration === item.id && (
                            <p className="text-[10px] leading-snug text-muted-foreground mt-1 italic border-l-2 border-primary/30 pl-2">
                              {item.narration}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {item.is_event && <Badge variant="secondary" className="text-[7px]">Evento</Badge>}
                      <span className="text-[8px] text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {savedEntries.length > 30 && !showMore && (
            <Button variant="outline" size="sm" onClick={() => setShowMore(true)} className="w-full text-xs gap-1">
              <ChevronDown className="h-3 w-3" /> Ver mais {savedEntries.length - 30} notícias
            </Button>
          )}

          {savedEntries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhuma notícia registrada ainda. Jogue partidas para gerar notícias!</p>
          )}
        </>
      )}
    </div>
  );
}
