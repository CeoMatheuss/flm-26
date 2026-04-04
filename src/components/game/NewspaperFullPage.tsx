import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ArrowLeft, Loader2, ChevronDown, SmilePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
};

interface SavedEntry {
  id: string;
  text: string;
  category: string;
  is_event: boolean;
  created_at: string;
  user_id: string;
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

  const visibleEntries = showMore ? entries : entries.slice(0, 30);

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
        <Badge variant="outline" className="text-[9px]">{entries.length} notícias</Badge>
        <Badge variant="secondary" className="text-[9px] ml-auto">🌍 Global-Online</Badge>
      </div>

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

          {entries.length > 30 && !showMore && (
            <Button variant="outline" size="sm" onClick={() => setShowMore(true)} className="w-full text-xs gap-1">
              <ChevronDown className="h-3 w-3" /> Ver mais ({entries.length - 30} notícias)
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
