import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ArrowLeft, Loader2, ChevronDown, SmilePlus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import signingImg from '@/assets/transfer-signing.jpg';
import leagueChampionImg from '@/assets/news-league-champion.jpg';
import cupChampionImg from '@/assets/news-cup-champion.jpg';
import ballonDorImg from '@/assets/news-ballon-dor.jpg';

interface Props {
  onBack: () => void;
}

const categoryColors: Record<string, string> = {
  MERCADO: 'bg-blue-500/80',
  RESULTADO: 'bg-emerald-500/80',
  CAMPEONATO: 'bg-primary/80',
  DESTAQUE: 'bg-emerald-500/80',
  TRANSFERÊNCIA: 'bg-blue-500/80',
  CONTRATAÇÃO: 'bg-emerald-600/80',
  EMPRÉSTIMO: 'bg-amber-500/80',
  RENOVAÇÃO: 'bg-blue-600/80',
  LESÃO: 'bg-orange-500/80',
  ATUALIZAÇÃO: 'bg-primary/80',
  FUNDAÇÃO: 'bg-emerald-600/80',
  CANTEIRA: 'bg-purple-500/80',
  FINANÇAS: 'bg-emerald-500/80',
  EVOLUÇÃO: 'bg-green-500/80',
  CRISE: 'bg-destructive/80',
  TORCIDA: 'bg-red-600/80',
  ELENCO: 'bg-primary/80',
  GOLS: 'bg-emerald-500/80',
  PASSES: 'bg-purple-500/80',
  HISTÓRIA: 'bg-amber-500/80',
  POLÊMICA: 'bg-yellow-600/80',
  INFRAESTRUTURA: 'bg-cyan-500/80',
  ESTÁDIO: 'bg-cyan-500/80',
  BASTIDORES: 'bg-red-500/80',
  PREMIAÇÃO: 'bg-amber-600/80',
  INSATISFAÇÃO: 'bg-red-700/80',
  AWARDS: 'bg-amber-500/80',
  CAMPEÃO: 'bg-amber-500/90',
  COPA: 'bg-amber-600/90',
  'BOLA DE OURO': 'bg-yellow-500/90',
};

// Visual presets keyed by image_key (or auto-detected from category/text fallback)
const IMAGE_PRESETS: Record<string, { src: string; label: string; gradient: string }> = {
  league_champion:    { src: leagueChampionImg, label: '🏆 CAMPEÃO DA LIGA',     gradient: 'from-amber-500/80 via-amber-600/40' },
  league_champion_early: { src: leagueChampionImg, label: '🏆 CAMPEÃO ANTECIPADO', gradient: 'from-amber-400/80 via-orange-500/40' },
  cup_champion:       { src: cupChampionImg,    label: '🏆 CAMPEÃO DE COPA',     gradient: 'from-amber-500/80 via-yellow-600/40' },
  international_champion: { src: cupChampionImg, label: '🌍 CAMPEÃO INTERNACIONAL', gradient: 'from-blue-500/80 via-amber-500/40' },
  ballon_dor:         { src: ballonDorImg,      label: '⭐ BOLA DE OURO',         gradient: 'from-yellow-400/80 via-amber-600/40' },
  awards:             { src: ballonDorImg,      label: '🏅 PREMIAÇÃO',            gradient: 'from-amber-500/70 via-yellow-600/30' },
};

function detectImageKey(item: { image_key?: string | null; category?: string; text?: string }): string | null {
  if (item.image_key && IMAGE_PRESETS[item.image_key]) return item.image_key;
  const cat = (item.category || '').toUpperCase();
  const txt = (item.text || '').toLowerCase();
  if (cat === 'BOLA DE OURO' || txt.includes('bola de ouro')) return 'ballon_dor';
  if (cat === 'AWARDS' || cat === 'PREMIAÇÃO') return 'awards';
  if (cat === 'COPA' || txt.includes('vence a final') || txt.includes('campeão de copa')) return 'cup_champion';
  if (cat === 'CAMPEÃO' || txt.includes('campeão antecipado')) return 'league_champion_early';
  if (txt.includes('campeão da liga') || txt.includes('conquista o título')) return 'league_champion';
  return null;
}

interface SavedEntry {
  id: string;
  text: string;
  category: string;
  is_event: boolean;
  created_at: string;
  user_id: string;
  image_key?: string | null;
}

const transferCategories = ['MERCADO', 'TRANSFERÊNCIA', 'CONTRATAÇÃO', 'EMPRÉSTIMO', 'RENOVAÇÃO'];
const REACT_EMOJIS = ['👍', '🔥', '❤️', '👏', '😂', '😮', '👎', '😡'];


export function NewspaperFullPage({ onBack }: Props) {
  const [entries, setEntries] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    // Load ALL global news (from all users)
    const { data } = await supabase
      .from('newspaper_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setEntries(data as SavedEntry[]);

    // Load user reactions
    const { data: { user } } = await supabase.auth.getUser();
    if (user && data && data.length > 0) {
      const entryIds = (data as SavedEntry[]).map(e => e.id);
      const { data: rxns } = await supabase
        .from('newspaper_reactions')
        .select('entry_id, emoji')
        .eq('user_id', user.id)
        .in('entry_id', entryIds);
      if (rxns) {
        const map: Record<string, string[]> = {};
        (rxns as any[]).forEach(r => {
          if (!map[r.entry_id]) map[r.entry_id] = [];
          map[r.entry_id].push(r.emoji);
        });
        setReactions(map);
      }
    }

    setLoading(false);
  }, []);

  const toggleReaction = useCallback(async (entryId: string, emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const current = reactions[entryId] || [];
    const hasIt = current.includes(emoji);

    if (hasIt) {
      await supabase.from('newspaper_reactions').delete().eq('entry_id', entryId).eq('user_id', user.id).eq('emoji', emoji);
      setReactions(prev => ({ ...prev, [entryId]: (prev[entryId] || []).filter(e => e !== emoji) }));
    } else {
      await supabase.from('newspaper_reactions').insert({ entry_id: entryId, user_id: user.id, emoji });
      setReactions(prev => ({ ...prev, [entryId]: [...(prev[entryId] || []), emoji] }));
    }
    setShowReactionPicker(null);
  }, [reactions]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const allCategories = [...new Set(entries.map(e => e.category))].filter(Boolean).sort();
  const filteredEntries = categoryFilter ? entries.filter(e => e.category === categoryFilter) : entries;
  const visibleEntries = showMore ? filteredEntries : filteredEntries.slice(0, 30);

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
        <Badge variant="outline" className="text-[9px]">{filteredEntries.length} notícias</Badge>
        <Badge variant="secondary" className="text-[9px] ml-auto">🌍 Global-Online</Badge>
      </div>

      {/* Category Filters */}
      {allCategories.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`text-[9px] px-2 py-1 rounded-full border transition-colors ${!categoryFilter ? 'bg-primary/15 text-primary border-primary/30' : 'border-border text-muted-foreground hover:bg-muted'}`}
          >
            Todas
          </button>
          {/* Premiações shortcut — pinned so users always see it */}
          {(allCategories.includes('AWARDS') || allCategories.includes('PREMIAÇÃO')) && (
            <button
              onClick={() => {
                const target = allCategories.includes('AWARDS') ? 'AWARDS' : 'PREMIAÇÃO';
                setCategoryFilter(categoryFilter === target ? null : target);
              }}
              className={`text-[9px] px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${categoryFilter === 'AWARDS' || categoryFilter === 'PREMIAÇÃO' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'border-amber-500/30 text-amber-400/70 hover:bg-amber-500/10'}`}
            >
              🏆 Premiações
            </button>
          )}
          {allCategories.filter(c => c !== 'AWARDS' && c !== 'PREMIAÇÃO').slice(0, 8).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={`text-[9px] px-2 py-1 rounded-full border transition-colors ${categoryFilter === cat ? 'bg-primary/15 text-primary border-primary/30' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {visibleEntries.map((item) => {
              const showSigningVisual = transferCategories.includes(item.category);

              return (
                <Card key={item.id} className="border-border overflow-hidden">
                  <CardContent className="p-0">
                    {showSigningVisual && (
                      <div className="w-full overflow-hidden">
                        <img src={signingImg} alt="Transferência" className="w-full h-auto opacity-70" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-start gap-2">
                        <span className={`text-[8px] font-bold text-white px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${categoryColors[item.category] || 'bg-primary/80'}`}>
                          {item.category}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug">{item.text}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          {item.is_event && <Badge variant="secondary" className="text-[7px]">Evento</Badge>}
                          <span className="text-[8px] text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      {/* Reaction bar */}
                      <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-border/30">
                        {(reactions[item.id] || []).map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(item.id, emoji)}
                            className="text-sm px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                        <div className="relative">
                          <button
                            onClick={() => setShowReactionPicker(showReactionPicker === item.id ? null : item.id)}
                            className="p-1 rounded hover:bg-muted transition-colors"
                          >
                            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          {showReactionPicker === item.id && (
                            <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 bg-card border border-border rounded-lg p-1 shadow-lg z-10">
                              {REACT_EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => toggleReaction(item.id, emoji)}
                                  className={`text-sm p-1 rounded hover:bg-muted transition-colors ${(reactions[item.id] || []).includes(emoji) ? 'bg-primary/15' : ''}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredEntries.length > 30 && !showMore && (
            <Button variant="outline" size="sm" onClick={() => setShowMore(true)} className="w-full text-xs gap-1">
              <ChevronDown className="h-3 w-3" /> Ver mais ({filteredEntries.length - 30} notícias)
            </Button>
          )}

          {entries.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Newspaper className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Nenhuma notícia publicada</p>
                <p className="text-xs text-muted-foreground">Transferências e eventos aparecerão aqui automaticamente</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
