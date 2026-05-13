import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  onOpenFullPage?: () => void;
  userId?: string;
}

interface NewsEntry {
  id: string;
  text: string;
  category: string;
  created_at: string;
  image_url?: string | null;
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

  const load = async () => {
    setLoading(true);
    const { data: mainNews } = await supabase.from('newspaper_entries').select('id, text, category, created_at, image_url').order('created_at', { ascending: false }).limit(10);
    const { data: leagueNews } = await supabase.from('world_league_news').select('*').order('created_at', { ascending: false }).limit(5);
    const { data: cupNews } = await supabase.from('cup_news').select('*').order('created_at', { ascending: false }).limit(5);
    
    const merged: NewsEntry[] = [];
    if (mainNews) merged.push(...(mainNews as any[]));
    if (leagueNews) {
      leagueNews.forEach(ln => { merged.push({ id: `ln-${ln.id}`, text: `${ln.title}: ${ln.content}`, category: ln.category || 'CAMPEONATO', created_at: ln.created_at, image_url: ln.image_url }); });
    }
    if (cupNews) {
      cupNews.forEach(cn => { merged.push({ id: `cn-${cn.id}`, text: `${cn.title}: ${cn.content}`, category: 'COPA', created_at: cn.created_at, image_url: cn.image_url }); });
    }
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNews(merged.slice(0, 8));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel('newspaper-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'newspaper_entries' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'world_league_news' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cup_news' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const main = news[0];
  const secondary = news.slice(1, 4);

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-0 px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-between border-b-2 border-foreground pb-1 mb-2">
          <div className="flex items-center gap-1.5">
            <Newspaper className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">Diário do Futebol</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[8px] sm:text-[10px] text-muted-foreground font-bold">LIVE</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
          </div>
        ) : main ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={main.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              {/* Main Story with possible Image */}
              <div className="group cursor-pointer" onClick={onOpenFullPage}>
                {main.image_url ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-3 border border-border/50 group-hover:border-primary/50 transition-all duration-500 shadow-lg shadow-black/20">
                    <img src={main.image_url} alt="News" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute top-2 right-2">
                       <div className="bg-primary/90 backdrop-blur-sm p-1 rounded-full animate-pulse shadow-lg">
                         <Sparkles className="h-2.5 w-2.5 text-white" />
                       </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <Badge className={`${categoryColors[main.category] || 'bg-primary'} text-[8px] sm:text-[9px] font-black border-none mb-1 shadow-md`}>
                        {main.category}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-border/50 pb-2 mb-2">
                     <Badge className={`${categoryColors[main.category] || 'bg-primary'} text-[8px] sm:text-[9px] font-black border-none mb-2`}>
                        {main.category}
                      </Badge>
                  </div>
                )}
                
                <h3 className={`text-sm sm:text-base font-black uppercase leading-tight mt-1 line-clamp-2 ${main.image_url ? 'text-white drop-shadow-lg italic' : 'text-foreground'}`}>
                  {main.text.split(': ')[1] || main.text}
                </h3>
                
                <p className="text-[8px] text-muted-foreground mt-1.5 flex items-center gap-1.5 font-mono">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  {new Date(main.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-8 font-bold italic opacity-40 uppercase tracking-widest">Nenhuma notícia ainda</p>
        )}

        {secondary.length > 0 && !loading && (
          <div className="space-y-2 pt-1">
            {secondary.map((item, idx) => {
              const LIMIT = 70;
              const textOnly = item.text.includes(': ') ? item.text.split(': ')[1] : item.text;
              const preview = textOnly.length > LIMIT ? textOnly.slice(0, LIMIT).trimEnd() + '…' : textOnly;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-primary/5 transition-colors group/item"
                >
                  <div className="w-0.5 h-8 bg-muted group-hover/item:bg-primary transition-colors rounded-full" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[7px] font-black text-primary uppercase tracking-tighter">{item.category}</span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight line-clamp-2 font-medium">{preview}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {onOpenFullPage && (
          <Button variant="outline" size="sm" className="w-full h-8 text-[10px] sm:text-xs gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 font-black tracking-widest uppercase" onClick={onOpenFullPage}>
            <ExternalLink className="h-3.5 w-3.5" /> ACESSAR PORTAL COMPLETO
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
