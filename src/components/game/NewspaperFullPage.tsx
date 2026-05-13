import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ArrowLeft, Loader2, ChevronDown, SmilePlus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NewsVisualTemplate, TemplateKey } from './NewsVisualTemplate';
import signingImg from '@/assets/transfer-signing.jpg';

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

interface SavedEntry {
  id: string;
  text: string;
  category: string;
  is_event: boolean;
  created_at: string;
  user_id: string;
  template_key?: TemplateKey | null;
  image_url?: string | null;
  metadata?: any;
  importance?: number;
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
    const { data: mainNews } = await supabase.from('newspaper_entries').select('*').order('created_at', { ascending: false }).limit(200);
    const { data: leagueNews } = await supabase.from('world_league_news').select('*').order('created_at', { ascending: false }).limit(50);
    const { data: cupNews } = await supabase.from('cup_news').select('*').order('created_at', { ascending: false }).limit(50);

    const merged: SavedEntry[] = [];
    if (mainNews) merged.push(...(mainNews as any[]));
    if (leagueNews) {
      leagueNews.forEach(ln => {
        merged.push({
          id: `ln-${ln.id}`,
          text: `${ln.title}\n${ln.content}`,
          category: ln.category || 'CAMPEONATO',
          is_event: true,
          created_at: ln.created_at,
          user_id: '',
          template_key: ln.template_key as TemplateKey,
          metadata: ln.metadata,
          image_url: ln.image_url,
          importance: ln.importance || 1
        });
      });
    }
    if (cupNews) {
      cupNews.forEach(cn => {
        merged.push({
          id: `cn-${cn.id}`,
          text: `${cn.title}\n${cn.content}`,
          category: 'COPA',
          is_event: true,
          created_at: cn.created_at,
          user_id: '',
          template_key: cn.template_key as TemplateKey,
          metadata: cn.metadata,
          image_url: cn.image_url,
          importance: 2
        });
      });
    }

    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setEntries(merged);

    const { data: { user } } = await supabase.auth.getUser();
    if (user && mainNews && mainNews.length > 0) {
      const entryIds = (mainNews as any[]).map(e => e.id);
      const { data: rxns } = await supabase.from('newspaper_reactions').select('entry_id, emoji').eq('user_id', user.id).in('entry_id', entryIds);
      if (rxns) {
        const map: Record<string, string[]> = {};
        (rxns as any[]).forEach(r => { if (!map[r.entry_id]) map[r.entry_id] = []; map[r.entry_id].push(r.emoji); });
        setReactions(map);
      }
    }
    setLoading(false);
  }, []);

  const toggleReaction = useCallback(async (entryId: string, emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const current = reactions[entryId] || [];
    if (current.includes(emoji)) {
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

  const featuredEntries = filteredEntries.filter(e => e.template_key || (e.importance && e.importance >= 2)).slice(0, 4);
  const featuredIds = new Set(featuredEntries.map(e => e.id));
  const restEntries = filteredEntries.filter(e => !featuredIds.has(e.id));
  const visibleEntries = showMore ? restEntries : restEntries.slice(0, 30);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5">
          <Newspaper className="h-4 w-4 text-primary" />
          <span className="text-sm font-black uppercase tracking-[0.2em]">Diário do Futebol</span>
        </div>
        <Badge variant="outline" className="text-[9px] font-bold">{filteredEntries.length} NOTÍCIAS</Badge>
        <div className="ml-auto flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter">Live Feed</span>
        </div>
      </div>

      {allCategories.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setCategoryFilter(null)} className={`text-[9px] px-3 py-1 rounded-full border font-black uppercase tracking-widest transition-colors ${!categoryFilter ? 'bg-primary/20 text-primary border-primary/40 shadow-sm' : 'border-border text-muted-foreground hover:bg-muted'}`}>Todas</button>
          {allCategories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)} className={`text-[9px] px-3 py-1 rounded-full border font-black uppercase tracking-widest transition-colors ${categoryFilter === cat ? 'bg-primary/20 text-primary border-primary/40 shadow-sm' : 'border-border text-muted-foreground hover:bg-muted'}`}>{cat}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary/40" /></div>
      ) : (
        <>
          {featuredEntries.length > 0 && !categoryFilter && (
            <div className="space-y-3">
              {featuredEntries.map((item) => {
                const lines = item.text.split('\n').filter(Boolean);
                const headline = lines[0] || item.text;
                const body = lines.slice(1).join(' ').trim();
                return (
                  <Card key={item.id} className="border-border/50 overflow-hidden bg-gradient-to-br from-card to-primary/5 hover:border-primary/30 transition-all duration-500 group">
                    <CardContent className="p-0">
                      {item.template_key ? (
                        <NewsVisualTemplate templateKey={item.template_key} {...item.metadata} />
                      ) : (
                        <div className="relative w-full aspect-video sm:aspect-[21/9] overflow-hidden">
                          {item.image_url ? (
                            <img src={item.image_url} alt="Featured" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center"><Newspaper className="h-10 w-10 text-primary/20" /></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                          <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6">
                            <Badge className="bg-primary text-white font-black text-[8px] mb-2">{item.category}</Badge>
                            <h3 className="text-base sm:text-xl font-black text-white leading-tight uppercase italic">{headline}</h3>
                          </div>
                        </div>
                      )}
                      <div className="px-4 py-2 flex items-center justify-between bg-muted/20 backdrop-blur-sm border-t border-white/5">
                        <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-1">
                          <Newspaper className="h-3 w-3" /> {new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-1">
                          {(reactions[item.id] || []).map(emoji => (
                            <button key={emoji} onClick={() => toggleReaction(item.id, emoji)} className="text-sm px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">{emoji}</button>
                          ))}
                          <button onClick={() => setShowReactionPicker(showReactionPicker === item.id ? null : item.id)} className="p-1 rounded hover:bg-muted relative">
                            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
                            {showReactionPicker === item.id && (
                              <div className="absolute bottom-full right-0 mb-2 flex gap-0.5 bg-card border border-border rounded-lg p-1 shadow-2xl z-50">
                                {REACT_EMOJIS.map(emoji => (
                                  <button key={emoji} onClick={() => toggleReaction(item.id, emoji)} className={`text-sm p-1 rounded hover:bg-muted ${(reactions[item.id] || []).includes(emoji) ? 'bg-primary/15' : ''}`}>{emoji}</button>
                                ))}
                              </div>
                            )}
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleEntries.map((item) => {
              const showSigningVisual = transferCategories.includes(item.category);
              return (
                <Card key={item.id} className="border-border/40 overflow-hidden hover:border-primary/20 transition-all group">
                  <CardContent className="p-0">
                    {item.template_key ? (
                       <NewsVisualTemplate templateKey={item.template_key} {...item.metadata} className="aspect-[21/9]" />
                    ) : item.image_url ? (
                      <div className="relative w-full aspect-[16/7] overflow-hidden">
                        <img src={item.image_url} alt="Notícia" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      </div>
                    ) : showSigningVisual ? (
                      <div className="w-full aspect-[21/9] overflow-hidden bg-blue-500/10 flex items-center justify-center relative">
                        <img src={signingImg} alt="Transferência" className="w-full h-full object-cover opacity-30" />
                        <span className="absolute inset-0 flex items-center justify-center font-black text-blue-500/20 text-3xl italic tracking-tighter">TRANSFER NEWS</span>
                      </div>
                    ) : null}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${categoryColors[item.category] || 'bg-primary/80'} text-[8px] font-bold border-none`}>{item.category}</Badge>
                        <span className="text-[9px] text-muted-foreground font-mono">{new Date(item.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold leading-snug group-hover:text-primary transition-colors whitespace-pre-line">{item.text}</p>
                      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/30">
                        {(reactions[item.id] || []).map(emoji => (
                          <button key={emoji} onClick={() => toggleReaction(item.id, emoji)} className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80">{emoji}</button>
                        ))}
                        <div className="relative">
                          <button onClick={() => setShowReactionPicker(showReactionPicker === item.id ? null : item.id)} className="p-1 rounded hover:bg-muted"><SmilePlus className="h-3.5 w-3.5 text-muted-foreground" /></button>
                          {showReactionPicker === item.id && (
                            <div className="absolute bottom-full left-0 mb-1 flex gap-0.5 bg-card border border-border rounded-lg p-1 shadow-lg z-50">
                              {REACT_EMOJIS.map(emoji => (
                                <button key={emoji} onClick={() => toggleReaction(item.id, emoji)} className={`text-sm p-1 rounded hover:bg-muted ${(reactions[item.id] || []).includes(emoji) ? 'bg-primary/15' : ''}`}>{emoji}</button>
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

          {restEntries.length > 30 && !showMore && (
            <Button variant="outline" size="sm" onClick={() => setShowMore(true)} className="w-full text-xs font-black uppercase tracking-widest border-primary/20 hover:bg-primary/5 py-6">VER MAIS ({restEntries.length - 30} NOTÍCIAS)</Button>
          )}

          {entries.length === 0 && (
            <Card><CardContent className="p-12 text-center"><Newspaper className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" /><p className="text-sm font-black uppercase tracking-widest text-muted-foreground">Nenhuma notícia publicada ainda</p></CardContent></Card>
          )}
        </>
      )}
    </div>
  );
}
