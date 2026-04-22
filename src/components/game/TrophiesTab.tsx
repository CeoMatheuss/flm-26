import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy as TrophyIcon, Sparkles, Globe, MapPin } from 'lucide-react';
import { Trophy } from '@/types/clubProfile';
import { supabase } from '@/integrations/supabase/client';
import { SeasonAwardsModal } from './SeasonAwardsModal';

interface Props {
  trophies: Trophy[];
}

interface AwardRow {
  id: string;
  season: number;
  scope: string;
  award_type: string;
  player_name: string | null;
  club_name: string | null;
  ai_image_url: string | null;
  user_id: string | null;
}

const AWARD_LABELS: Record<string, string> = {
  ballon_dor: '🥇 Bola de Ouro',
  top_scorer: '⚽ Artilheiro',
  top_assists: '🎯 Rei das Assistências',
  best_gk: '🧤 Luva de Ouro',
  best_team: '🏆 Melhor Time',
  best_player: '⭐ Melhor da Liga',
  team_of_season: '🌟 Seleção da Temporada',
};

export function TrophiesTab({ trophies }: Props) {
  const [awards, setAwards] = useState<AwardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'global' | 'league'>('all');
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('season_awards')
        .select('id, season, scope, award_type, player_name, club_name, ai_image_url, user_id')
        .order('season', { ascending: false })
        .order('scope', { ascending: true });
      setAwards((data || []) as any);
      setLoading(false);
    })();
  }, []);

  const filtered = awards.filter(a => filter === 'all' ? true : a.scope === filter);
  const seasonsAvailable = [...new Set(filtered.map(a => a.season))].sort((a, b) => b - a);
  const currentSeason = seasonsAvailable[0];
  const thisSeasonAwards = filtered.filter(a => a.season === currentSeason);
  const historyAwards = filtered.filter(a => a.season !== currentSeason);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm sm:text-lg flex items-center gap-2">
        <TrophyIcon className="h-5 w-5 text-yellow-500" /> 🏆 Galeria de Troféus & Premiações
      </h3>

      <Tabs defaultValue="trophies" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-9">
          <TabsTrigger value="trophies" className="text-xs gap-1"><TrophyIcon className="h-3 w-3" />Troféus</TabsTrigger>
          <TabsTrigger value="awards" className="text-xs gap-1"><Sparkles className="h-3 w-3" />Premiações</TabsTrigger>
        </TabsList>

        {/* Trophies Tab — original content */}
        <TabsContent value="trophies" className="space-y-3 mt-3">
          {trophies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <TrophyIcon className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum troféu conquistado ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">Vença campeonatos e premiações para colecionar troféus!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trophies.map((trophy, i) => (
                <Card key={i} className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span className="text-xl">🏆</span> {trophy.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Temporada {trophy.season}</p>
                    <p className="text-[10px] text-muted-foreground">{trophy.date}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Awards Tab */}
        <TabsContent value="awards" className="space-y-3 mt-3">
          {/* Scope filters */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${filter === 'all' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('global')}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${filter === 'global' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              <Globe className="h-3 w-3" /> Global
            </button>
            <button
              onClick={() => setFilter('league')}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${filter === 'league' ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              <MapPin className="h-3 w-3" /> Por Liga
            </button>
          </div>

          {loading ? (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">Carregando...</CardContent></Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma premiação ainda.</p>
                <p className="text-xs text-muted-foreground mt-1">As premiações são geradas automaticamente ao final de cada temporada.</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="current" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-8">
                <TabsTrigger value="current" className="text-[10px]">Esta Temporada</TabsTrigger>
                <TabsTrigger value="history" className="text-[10px]">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="current" className="mt-2 space-y-2">
                {thisSeasonAwards.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma premiação para a temporada atual.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {thisSeasonAwards.map(a => (
                      <AwardCard key={a.id} award={a} onClick={() => setOpenSeason(a.season)} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-2 space-y-3">
                {seasonsAvailable.slice(1).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Sem histórico ainda.</p>
                ) : (
                  seasonsAvailable.slice(1).map(s => (
                    <div key={s} className="space-y-1.5">
                      <Badge variant="outline" className="text-[10px]">Temporada {s}</Badge>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {historyAwards.filter(a => a.season === s).map(a => (
                          <AwardCard key={a.id} award={a} onClick={() => setOpenSeason(s)} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </TabsContent>
      </Tabs>

      {openSeason !== null && (
        <SeasonAwardsModal open={openSeason !== null} onClose={() => setOpenSeason(null)} season={openSeason} />
      )}
    </div>
  );
}

function AwardCard({ award, onClick }: { award: AwardRow; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-gradient-to-br from-amber-500/5 to-amber-900/10 border border-amber-500/30 rounded-lg p-2.5 hover:border-amber-500/60 transition-colors"
    >
      <div className="flex items-center gap-2">
        {award.ai_image_url ? (
          <img src={award.ai_image_url} alt="" className="w-10 h-10 rounded object-cover border border-amber-500/30" />
        ) : (
          <div className="w-10 h-10 rounded bg-amber-500/20 flex items-center justify-center"><TrophyIcon className="h-5 w-5 text-amber-400" /></div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold truncate">{AWARD_LABELS[award.award_type] || award.award_type}</p>
          <p className="text-[10px] text-muted-foreground truncate">{award.player_name || award.club_name || '—'}</p>
        </div>
      </div>
    </button>
  );
}
