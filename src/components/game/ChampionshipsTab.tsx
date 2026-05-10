import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Globe, Trophy, Loader2, Users, Calendar, Star, MapPin, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CupBracketView } from './CupBracketView';

interface Cup {
  id: string;
  name: string;
  cup_type: string;
  country: string | null;
  continent: string | null;
  status: string;
  current_round: number;
  total_rounds: number;
  tier: string;
}

export function ChampionshipsTab() {
  const [selectedCupId, setSelectedCupId] = useState<string | null>(null);
  const [cups, setCups] = useState<Cup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCups = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('cup_competitions')
        .select('*')
        .order('cup_type', { ascending: false })
        .order('tier', { ascending: true });
      
      if (data) {
        setCups(data as Cup[]);
      }
      setLoading(false);
    };
    loadCups();
  }, []);

  if (selectedCupId) {
    return <CupBracketView cupId={selectedCupId} onBack={() => setSelectedCupId(null)} />;
  }

  const getCupIcon = (type: string) => {
    if (type === 'world_cup') return '🌍';
    if (type === 'continental') return '🌟';
    return '🏆';
  };

  const getPhaseName = (round: number) => {
    const labels: Record<number, string> = { 1: 'R32', 2: 'Oitavas', 3: 'Quartas', 4: 'Semi', 5: 'Final' };
    return labels[round] || `Fase ${round}`;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse h-32 bg-muted/20" />
          ))
        ) : cups.map(cup => (
          <Card
            key={cup.id}
            className="group relative overflow-hidden border-border/40 hover:border-primary/50 transition-all hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-card to-accent/5"
            onClick={() => setSelectedCupId(cup.id)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl shadow-inner group-hover:bg-primary/20 transition-colors">
                    {getCupIcon(cup.cup_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm leading-tight truncate">{cup.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">
                        {cup.continent || cup.country || 'Mundial'}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant={cup.status === 'in_progress' ? 'default' : 'secondary'} className="text-[8px] h-5 px-1.5 shrink-0">
                  {cup.status === 'in_progress' ? '🟢 Ativa' : cup.status === 'pending' ? '📋 Breve' : '🏁 Fim'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-muted/40 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                  <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Fase</p>
                  <p className="text-xs font-black text-primary">{getPhaseName(cup.current_round)}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2 flex flex-col items-center justify-center text-center">
                  <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Status</p>
                  <p className="text-xs font-black text-foreground capitalize">{cup.status === 'in_progress' ? 'Jogando' : 'Sorteio'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 px-1 border-t border-border/10">
                <span className="flex items-center gap-1 font-medium">
                  <Play className="h-2.5 w-2.5" /> Ver Chaveamento
                </span>
                <span className="font-black text-primary group-hover:translate-x-1 transition-transform">
                  Detalhes →
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {cups.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl">
             <Globe className="h-10 w-10 text-muted-foreground/20 mx-auto" />
             <p className="text-sm text-muted-foreground mt-2">Nenhuma copa global encontrada no sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
}
