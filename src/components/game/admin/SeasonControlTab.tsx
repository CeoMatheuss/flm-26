import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, RefreshCw, FastForward, Sprout, Zap, AlertTriangle, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { countryFlags, countryNames } from '@/types/league';
import { LeagueRow, statusColors, statusLabels } from './leagueHelpers';

interface Props { adminUserId: string }

export function SeasonControlTab({ adminUserId }: Props) {
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; country: string } | null>(null);
  const [pendingCounts, setPendingCounts] = useState<{ league: number; cup: number; custom: number; friendly: number }>({ league: 0, cup: 0, custom: 0, friendly: 0 });

  const load = async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const [leaguesRes, lm, cm, ctm, fi] = await Promise.all([
      supabase.from('multiplayer_leagues').select('*').eq('auto_created', true).eq('league_type', 'main').order('country'),
      supabase.from('league_matches').select('id', { count: 'exact', head: true }).eq('status', 'scheduled').lt('created_at', cutoff),
      supabase.from('cup_matches').select('id', { count: 'exact', head: true }).eq('status', 'scheduled').lt('scheduled_at', cutoff),
      supabase.from('custom_tournament_matches').select('id', { count: 'exact', head: true }).eq('status', 'scheduled').lt('scheduled_at', cutoff),
      supabase.from('friendly_invites').select('id', { count: 'exact', head: true }).eq('status', 'accepted').is('match_result', null).lt('match_date', cutoff),
    ]);
    if (leaguesRes.data) setLeagues(leaguesRes.data as LeagueRow[]);
    setPendingCounts({
      league: lm.count || 0,
      cup: cm.count || 0,
      custom: ctm.count || 0,
      friendly: fi.count || 0,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Group by country
  const byCountry: Record<string, LeagueRow[]> = {};
  for (const l of leagues) {
    if (!byCountry[l.country]) byCountry[l.country] = [];
    byCountry[l.country].push(l);
  }

  const logAdmin = async (action: string, details: Record<string, unknown>) => {
    await supabase.from('admin_logs').insert([{ user_id: adminUserId, action, details: details as any }]);
  };

  const runPlanSeason = async () => {
    setActionLoading('plan-season');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/plan-season`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('✅ plan-season executado!');
        await logAdmin('manual_plan_season', { result });
        load();
      } else {
        toast.error(result.error || 'Erro');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    }
    setActionLoading(null);
  };

  const forceSeasonEnd = async (country: string) => {
    setActionLoading(`force-${country}`);
    try {
      const { error } = await supabase.rpc('process_season_transition', { _country: country });
      if (error) throw error;
      toast.success(`✅ Temporada de ${countryNames[country] || country} encerrada!`);
      await logAdmin('force_season_end', { country });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    }
    setActionLoading(null);
    setConfirm(null);
  };

  const redistributeBeginners = async (country: string) => {
    setActionLoading(`redist-${country}`);
    try {
      const { error } = await supabase.rpc('redistribute_beginners', { _country: country });
      if (error) throw error;
      toast.success(`✅ Iniciantes de ${countryNames[country] || country} redistribuídos!`);
      await logAdmin('redistribute_beginners', { country });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    }
    setActionLoading(null);
    setConfirm(null);
  };

  const runAutoSim = async () => {
    setActionLoading('auto-sim');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-simulate-expired-matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (res.ok) {
        toast.success(`🤖 ${result.total} partida(s) simulada(s) automaticamente`);
        await logAdmin('manual_auto_sim_trigger', { result });
        load();
      } else {
        toast.error(result.error || 'Erro');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro');
    }
    setActionLoading(null);
  };

  return (
    <div className="space-y-3">
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Controle de Temporada
            </CardTitle>
            <Button size="sm" onClick={load} disabled={loading} className="h-7 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Cron <code className="text-[9px] bg-muted px-1 rounded">plan-season</code> roda no último dia do mês. Use os botões abaixo para forçar manualmente em testes.
          </p>
          <Button
            size="sm"
            onClick={runPlanSeason}
            disabled={!!actionLoading}
            className="h-8 text-xs bg-primary hover:bg-primary/90 gap-1"
          >
            <Zap className="h-3 w-3" /> {actionLoading === 'plan-season' ? 'Executando…' : 'Rodar plan-season agora'}
          </Button>
        </CardContent>
      </Card>

      {Object.entries(byCountry).map(([country, list]) => {
        const inProgress = list.filter(l => l.season_status === 'in_progress').length;
        const finished = list.filter(l => l.season_status === 'finished').length;
        const registration = list.filter(l => l.season_status === 'registration').length;
        const earliestStart = list.map(l => l.season_start).filter(Boolean).sort()[0];
        const latestEnd = list.map(l => l.season_end).filter(Boolean).sort().pop();
        const isPendingConfirm = confirm?.country === country;

        return (
          <Card key={country}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {countryFlags[country] || '🏳️'} {countryNames[country] || country}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {inProgress > 0 && <Badge variant="outline" className="text-[9px] text-green-400 border-green-500/30">{inProgress} em andamento</Badge>}
                  {finished > 0 && <Badge variant="outline" className="text-[9px] text-muted-foreground">{finished} finalizadas</Badge>}
                  {registration > 0 && <Badge variant="outline" className="text-[9px] text-blue-400 border-blue-500/30">{registration} inscrições</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="p-2 rounded bg-muted/20">
                  <p className="text-muted-foreground">Início</p>
                  <p className="font-semibold">{earliestStart ? new Date(earliestStart).toLocaleDateString('pt-BR') : '—'}</p>
                </div>
                <div className="p-2 rounded bg-muted/20">
                  <p className="text-muted-foreground">Fim</p>
                  <p className="font-semibold">{latestEnd ? new Date(latestEnd).toLocaleDateString('pt-BR') : '—'}</p>
                </div>
              </div>

              <ScrollArea className="max-h-[180px]">
                <div className="space-y-1">
                  {list.map(l => (
                    <div key={l.id} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-muted/10">
                      <span className="truncate">{l.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="outline" className={`text-[8px] ${statusColors[l.season_status] || ''}`}>
                          {statusLabels[l.season_status] || l.season_status}
                        </Badge>
                        <span className="text-muted-foreground">R{l.current_round}/{l.total_rounds}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {isPendingConfirm ? (
                <div className="p-2 rounded bg-destructive/10 border border-destructive/30 space-y-2">
                  <p className="text-[10px] flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Confirmar: {confirm.action === 'force' ? 'forçar fim de temporada' : 'redistribuir iniciantes'} de {countryNames[country] || country}?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-[10px] flex-1"
                      onClick={() => confirm.action === 'force' ? forceSeasonEnd(country) : redistributeBeginners(country)}
                      disabled={!!actionLoading}
                    >
                      Sim, executar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] flex-1"
                      onClick={() => setConfirm(null)}
                      disabled={!!actionLoading}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => setConfirm({ action: 'force', country })}
                    disabled={!!actionLoading}
                  >
                    <FastForward className="h-3 w-3" /> Forçar fim
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => setConfirm({ action: 'redist', country })}
                    disabled={!!actionLoading}
                  >
                    <Sprout className="h-3 w-3" /> Redistribuir
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
