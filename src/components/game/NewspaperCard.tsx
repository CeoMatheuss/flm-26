import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ExternalLink, Loader2 } from 'lucide-react';

interface Props {
  onOpenFullPage?: () => void;
  userId?: string;
}

interface NewsEntry {
  id: string;
  text: string;
  category: string;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  MERCADO: 'bg-primary/80',
  RESULTADO: 'bg-emerald-500/80',
  CAMPEONATO: 'bg-primary/80',
  DESTAQUE: 'bg-emerald-500/80',
  TRANSFERÊNCIA: 'bg-blue-500/80',
  CONTRATAÇÃO: 'bg-emerald-600/80',
  EMPRÉSTIMO: 'bg-amber-500/80',
  RENOVAÇÃO: 'bg-blue-600/80',
  LESÃO: 'bg-red-500/80',
  ATUALIZAÇÃO: 'bg-primary/80',
  FUNDAÇÃO: 'bg-emerald-600/80',
  CANTEIRA: 'bg-purple-500/80',
  FINANÇAS: 'bg-emerald-500/80',
  EVOLUÇÃO: 'bg-emerald-500/80',
  COPA: 'bg-orange-500/80',
};

export function NewspaperCard({ onOpenFullPage, userId }: Props) {
  const [news, setNews] = useState<NewsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      // 1. Load latest global news
      const { data: mainNews } = await supabase
        .from('newspaper_entries')
        .select('id, text, category, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      // 2. Load League News
      const { data: leagueNews } = await supabase
        .from('world_league_news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // 3. Load Cup News
      const { data: cupNews } = await supabase
        .from('cup_news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const merged: NewsEntry[] = [];

      if (mainNews) {
        merged.push(...(mainNews as NewsEntry[]));
      }

      if (leagueNews) {
        leagueNews.forEach(ln => {
          merged.push({
            id: `ln-${ln.id}`,
            text: `${ln.title}: ${ln.content}`,
            category: ln.category || 'CAMPEONATO',
            created_at: ln.created_at
          });
        });
      }

      if (cupNews) {
        cupNews.forEach(cn => {
          merged.push({
            id: `cn-${cn.id}`,
            text: `${cn.title}: ${cn.content}`,
            category: 'COPA',
            created_at: cn.created_at
          });
        });
      }

      // Sort all by date and limit
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNews(merged.slice(0, 8));
      setLoading(false);
    };
    load();
  }, [userId]);

  const main = news[0];
  const secondary = news.slice(1, 4);

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-0 px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-between border-b-2 border-foreground pb-1 mb-2">
          <div className="flex items-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]">Diário do Futebol</span>
          </div>
          <span className="text-[8px] sm:text-[10px] text-muted-foreground">Global • Online</span>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : main ? (
          <>
            <div className="border-b border-border/50 pb-2">
              <span className={`text-[8px] sm:text-[9px] font-bold text-white px-1.5 py-0.5 rounded ${categoryColors[main.category] || 'bg-primary'}`}>
                {main.category}
              </span>
              {(() => {
                const LIMIT = 90;
                const isLong = (main.text || '').length > LIMIT;
                const preview = isLong ? main.text.slice(0, LIMIT).trimEnd() + '…' : main.text;
                return (
                  <>
                    <h3 className="text-sm sm:text-base font-black uppercase leading-tight mt-1 line-clamp-2">{preview}</h3>
                    {isLong && onOpenFullPage && (
                      <button
                        onClick={onOpenFullPage}
                        className="text-[10px] font-semibold text-primary hover:underline mt-0.5"
                      >
                        Ver mais →
                      </button>
                    )}
                  </>
                );
              })()}
              <p className="text-[8px] text-muted-foreground mt-0.5">
                {new Date(main.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {secondary.length > 0 && (
              <div className="space-y-1.5">
                {secondary.map((item) => {
                  const LIMIT = 70;
                  const isLong = (item.text || '').length > LIMIT;
                  const preview = isLong ? item.text.slice(0, LIMIT).trimEnd() + '…' : item.text;
                  return (
                    <div key={item.id} className="flex items-start gap-1.5">
                      <span className="text-[8px] text-primary font-bold mt-0.5">▸</span>
                      <p className="text-[9px] sm:text-[11px] text-muted-foreground leading-snug flex-1 line-clamp-2">{preview}</p>
                      <Badge variant="outline" className="text-[7px] px-1 py-0 h-3.5 shrink-0">{item.category}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhuma notícia ainda</p>
        )}

        {onOpenFullPage && (
          <Button variant="secondary" size="sm" className="w-full h-7 text-[10px] sm:text-xs gap-1" onClick={onOpenFullPage}>
            <ExternalLink className="h-3 w-3" /> Ver Mais no Jornal
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
