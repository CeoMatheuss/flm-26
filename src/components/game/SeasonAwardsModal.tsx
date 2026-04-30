import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Trophy, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Award {
  id: string;
  season: number;
  scope: string;
  award_type: string;
  player_name: string | null;
  player_position: string | null;
  player_overall: number | null;
  club_name: string | null;
  stats: any;
  ai_image_url: string | null;
  ai_narrative: string | null;
  team_of_season: any[] | null;
}

const AWARD_LABELS: Record<string, string> = {
  ballon_dor: '🥇 Bola de Ouro',
  top_scorer: '⚽ Artilheiro',
  top_assists: '🎯 Rei das Assistências',
  best_gk: '🧤 Luva de Ouro',
  best_team: '🏆 Melhor Time',
  best_player: '⭐ Melhor Jogador da Liga',
  team_of_season: '🌟 Seleção da Temporada',
  prize_money: '💰 Premiação Financeira',
};

type AwardCategory = 'individuais' | 'coletivas' | 'financeiras';

const AWARD_CATEGORY: Record<string, AwardCategory> = {
  ballon_dor: 'individuais',
  top_scorer: 'individuais',
  top_assists: 'individuais',
  best_gk: 'individuais',
  best_player: 'individuais',
  best_team: 'coletivas',
  team_of_season: 'coletivas',
  prize_money: 'financeiras',
};

const CATEGORY_INFO: Record<AwardCategory, { label: string; emoji: string; color: string }> = {
  individuais: { label: 'Individuais', emoji: '⭐', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  coletivas:   { label: 'Coletivas',   emoji: '🏆', color: 'border-primary/40 bg-primary/10 text-primary' },
  financeiras: { label: 'Financeiras', emoji: '💰', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
};


interface Props {
  open: boolean;
  onClose: () => void;
  season: number;
}

export function SeasonAwardsModal({ open, onClose, season }: Props) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('season_awards')
        .select('*')
        .eq('season', season)
        .order('scope', { ascending: true })
        .order('award_type', { ascending: true });
      setAwards((data || []) as any);
      setIdx(0);
      setLoading(false);
    })();
  }, [open, season]);

  const a = awards[idx];

  const close = async () => {
    // Mark season as viewed
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ viewed_awards_season: season })
        .eq('user_id', user.id);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-gradient-to-br from-amber-950 via-background to-background border-amber-500/40">
        <div className="relative">
          <button onClick={close} className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/60 hover:bg-background/80 transition">
            <X className="h-4 w-4" />
          </button>

          <div className="px-6 py-4 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-b border-amber-500/30">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="font-bold text-base sm:text-lg">Premiações da Temporada {season}</h2>
              <Badge variant="outline" className="ml-auto border-amber-500/50 text-amber-300">
                {awards.length > 0 ? `${idx + 1} / ${awards.length}` : '0'}
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Carregando premiações...</div>
          ) : awards.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Nenhuma premiação disponível para esta temporada.
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {a.ai_image_url ? (
                <div className="aspect-video rounded-xl overflow-hidden border border-amber-500/30 bg-muted">
                  <img src={a.ai_image_url} alt={a.player_name || ''} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-900/40 flex items-center justify-center">
                  <Trophy className="h-16 w-16 text-amber-400/60" />
                </div>
              )}

              <div>
                {(() => {
                  const cat = AWARD_CATEGORY[a.award_type];
                  const info = cat ? CATEGORY_INFO[cat] : null;
                  return (
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      {info && (
                        <Badge variant="outline" className={`${info.color} text-[10px]`}>
                          {info.emoji} {info.label}
                        </Badge>
                      )}
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                        {AWARD_LABELS[a.award_type] || a.award_type}
                      </Badge>
                    </div>
                  );
                })()}
                <h3 className="text-2xl font-bold">{a.player_name || a.club_name}</h3>
                {a.club_name && a.player_name && <p className="text-sm text-muted-foreground">{a.club_name}</p>}
              </div>

              {a.stats && Object.keys(a.stats).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(a.stats).map(([k, v]) => (
                    <div key={k} className="bg-card/60 rounded-lg p-2 border border-border/30">
                      <div className="text-[10px] uppercase text-muted-foreground">{k}</div>
                      <div className="text-base font-semibold">{String(v)}</div>
                    </div>
                  ))}
                </div>
              )}

              {a.ai_narrative && (
                <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line bg-card/40 rounded-lg p-3 border border-border/30">
                  {a.ai_narrative}
                </div>
              )}

              {a.team_of_season && Array.isArray(a.team_of_season) && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">⭐ Os 11 selecionados</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {a.team_of_season.map((p: any, i: number) => (
                      <div key={i} className="bg-card/60 rounded-lg p-2 border border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{p.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{p.position}</Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground">OVR {p.overall} · {p.club}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {awards.length > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border/30 bg-card/40">
              <Button variant="outline" size="sm" onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIdx(i => Math.min(awards.length - 1, i + 1))} disabled={idx >= awards.length - 1}>
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
