import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, Users, Calendar, Info, Zap, ChevronRight, Trophy, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WaitingEntry {
  id: string;
  enrolled_at: string;
  country: string;
  league_type: string;
  position: number;
}

interface Props {
  userId: string;
  onExploreOtherModes?: () => void;
}

export function WaitingListPanel({ userId, onExploreOtherModes }: Props) {
  const [entry, setEntry] = useState<WaitingEntry | null>(null);
  const [totalWaiting, setTotalWaiting] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadWaitingInfo = async () => {
    if (!userId) return;
    setLoading(true);
    
    // Get user's specific entry
    const { data: userEntry, error: entryError } = await supabase
      .from('league_waiting_list')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'waiting')
      .maybeSingle();

    if (entryError) {
      console.error('Error loading waiting entry:', entryError);
    }

    if (userEntry) {
      // Calculate position
      const { count } = await supabase
        .from('league_waiting_list')
        .select('*', { count: 'exact', head: true })
        .eq('country', userEntry.country)
        .eq('league_type', userEntry.league_type)
        .eq('status', 'waiting')
        .lt('enrolled_at', userEntry.enrolled_at);
      
      setEntry({
        ...userEntry,
        position: (count || 0) + 1
      });

      // Get total waiting for context
      const { count: total } = await supabase
        .from('league_waiting_list')
        .select('*', { count: 'exact', head: true })
        .eq('country', userEntry.country)
        .eq('league_type', userEntry.league_type)
        .eq('status', 'waiting');
      
      setTotalWaiting(total || 0);
    } else {
      setEntry(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadWaitingInfo();
    
    // Realtime subscription for updates
    const channel = supabase.channel('waiting-list-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'league_waiting_list',
        filter: `user_id=eq.${userId}`
      }, () => loadWaitingInfo())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) return null;
  if (!entry) return null;

  // Estimate time (16 players per league, typical season 30 days)
  // Very rough estimate: position / 16 * 30 days
  const estimatedDays = Math.ceil(entry.position / 16) * 30;

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-background to-background overflow-hidden relative group transition-all hover:border-amber-500/50">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Clock className="h-24 w-24 text-amber-500 rotate-12" />
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[10px] uppercase font-black border-amber-500/50 text-amber-500 bg-amber-500/5 animate-pulse">
            Inscrito para Próxima Temporada
          </Badge>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {new Date(entry.enrolled_at).toLocaleDateString()}
          </span>
        </div>
        <CardTitle className="text-lg font-black mt-2 flex items-center gap-2">
          Fila de Espera: {entry.country}
        </CardTitle>
        <CardDescription className="text-xs">
          Sua vaga está garantida para a próxima abertura de temporada.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex flex-col gap-1">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Sua Posição</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-500">{entry.position}º</span>
              <span className="text-[10px] text-muted-foreground">de {totalWaiting}</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex flex-col gap-1">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Tempo Estimado</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-foreground">~{estimatedDays}d</span>
              <span className="text-[10px] text-muted-foreground">início temp.</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
            <span className="text-amber-500">Status da Inscrição</span>
            <span className="text-muted-foreground">Aguardando Vaga</span>
          </div>
          <Progress value={Math.max(10, 100 - (entry.position * 5))} className="h-1.5" />
          <p className="text-[9px] text-muted-foreground italic text-center">
            * O tempo é uma estimativa baseada no ciclo atual das temporadas.
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
          <div className="flex items-start gap-2">
            <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-bold">Continue sua jornada!</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Enquanto aguarda, você pode evoluir seu clube participando de <span className="text-foreground font-bold">Copas Iniciantes</span>, Amistosos e Torneios Rápidos.
              </p>
            </div>
          </div>
          <Button 
            className="w-full h-8 text-xs font-bold gap-2 group" 
            variant="default"
            onClick={onExploreOtherModes}
          >
            Jogar Modos Rápidos
            <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground bg-muted/30 py-1.5 rounded-lg border border-border/30">
          <Info className="h-3 w-3" />
          Você será notificado assim que a temporada começar.
        </div>
      </CardContent>
    </Card>
  );
}
