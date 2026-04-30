import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, RefreshCw, Zap, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LeagueBlueprint {
  country: string;
  country_name: string;
  flag: string;
  division: number;
  league_name: string;
  slots: number;
  format: string;
  kickoff_hour_brt: number;
  kickoff_label: string;
  will_be_created: boolean;
  already_exists: boolean;
}

interface PreviewSummary {
  next_season: number;
  total_leagues_planned: number;
  to_be_created: number;
  already_existing: number;
  duplicates_detected: Array<{ key: string; count: number }>;
  total_matches_per_league: number;
  total_matches_planned: number;
}

export function LeaguesPreviewTab() {
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [blueprint, setBlueprint] = useState<LeagueBlueprint[]>([]);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [activateResult, setActivateResult] = useState<any>(null);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('world-leagues-preview');
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha na prévia');
      setBlueprint(data.blueprint || []);
      setSummary(data.summary || null);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar prévia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPreview(); }, []);

  const activateNow = async (force = false) => {
    if (!confirm(force
      ? 'FORÇAR recriação de TODAS as ligas para a próxima season? Times e calendário serão recriados.'
      : 'Ativar agora todas as ligas pendentes para a próxima season?')) return;
    setActivating(true);
    setActivateResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('world-leagues-activate', {
        body: { force },
      });
      if (error) throw error;
      setActivateResult(data);
      if (data?.error_count > 0 || data?.warnings_count > 0) {
        toast.warning(`Ativação concluída com ${data.error_count} erros e ${data.warnings_count} avisos.`);
      } else {
        toast.success(`✅ ${data?.created_count || 0} ligas ativadas! Calendário gerado.`);
      }
      await loadPreview();
    } catch (e: any) {
      toast.error(e.message || 'Erro na ativação');
    } finally {
      setActivating(false);
    }
  };

  const grouped = blueprint.reduce<Record<string, LeagueBlueprint[]>>((acc, l) => {
    const key = String(l.kickoff_hour_brt);
    (acc[key] ||= []).push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> Prévia das Ligas Mundiais
            </CardTitle>
            <Button size="sm" variant="outline" onClick={loadPreview} disabled={loading} className="h-7 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Blueprint das ligas que serão criadas automaticamente à <b>00:00 BRT do dia 1</b> do próximo ciclo.
            Confira tudo antes — nada é persistido até a ativação.
          </p>

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div className="p-2 rounded bg-muted/20">
                <p className="text-muted-foreground">Próxima season</p>
                <p className="font-bold text-base">#{summary.next_season}</p>
              </div>
              <div className="p-2 rounded bg-muted/20">
                <p className="text-muted-foreground">Ligas planejadas</p>
                <p className="font-bold text-base">{summary.total_leagues_planned}</p>
              </div>
              <div className="p-2 rounded bg-muted/20">
                <p className="text-muted-foreground">A criar</p>
                <p className="font-bold text-base text-emerald-400">{summary.to_be_created}</p>
              </div>
              <div className="p-2 rounded bg-muted/20">
                <p className="text-muted-foreground">Jogos totais</p>
                <p className="font-bold text-base">{summary.total_matches_planned}</p>
              </div>
            </div>
          )}

          {summary && summary.duplicates_detected.length > 0 && (
            <div className="p-2 rounded bg-destructive/10 border border-destructive/30 text-[10px]">
              <p className="flex items-center gap-1 text-destructive font-semibold mb-1">
                <AlertTriangle className="h-3 w-3" /> Duplicatas detectadas
              </p>
              {summary.duplicates_detected.map((d) => (
                <p key={d.key} className="text-muted-foreground">{d.key} → {d.count}x</p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => activateNow(false)}
              disabled={activating || loading}
              className="h-8 text-xs gap-1 flex-1"
            >
              <Zap className="h-3 w-3" /> {activating ? 'Ativando…' : 'Ativar agora'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => activateNow(true)}
              disabled={activating || loading}
              className="h-8 text-xs gap-1"
            >
              Forçar recriação
            </Button>
          </div>
        </CardContent>
      </Card>

      {Object.entries(grouped)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([hour, leagues]) => (
          <Card key={hour}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs flex items-center gap-2">
                <Clock className="h-3 w-3 text-primary" />
                Janela {String(hour).padStart(2, '0')}:00 BRT
                <Badge variant="outline" className="text-[9px]">{leagues.length} ligas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[280px]">
                <div className="divide-y divide-border/50">
                  {leagues.map((l) => (
                    <div key={`${l.country}-${l.division}`} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
                      <span className="text-base">{l.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{l.league_name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">
                          {l.country_name} · D{l.division} · {l.slots} times · {l.format}
                        </p>
                      </div>
                      {l.already_exists ? (
                        <Badge variant="outline" className="text-[8px] text-amber-400 border-amber-500/30">
                          Existe
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[8px] text-emerald-400 border-emerald-500/30">
                          A criar
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}

      {activateResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Resultado da Ativação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-[10px]">
            <div className="grid grid-cols-3 gap-1.5">
              <div className="p-1.5 rounded bg-emerald-500/10 text-center">
                <p className="text-muted-foreground">Criadas</p>
                <p className="font-bold">{activateResult.created_count}</p>
              </div>
              <div className="p-1.5 rounded bg-muted/20 text-center">
                <p className="text-muted-foreground">Puladas</p>
                <p className="font-bold">{activateResult.skipped_count}</p>
              </div>
              <div className="p-1.5 rounded bg-destructive/10 text-center">
                <p className="text-muted-foreground">Erros</p>
                <p className="font-bold">{activateResult.error_count}</p>
              </div>
            </div>
            {(activateResult.errors?.length > 0 || activateResult.validation_warnings?.length > 0) && (
              <ScrollArea className="max-h-[160px] mt-1">
                <pre className="text-[9px] bg-muted/20 p-2 rounded whitespace-pre-wrap">
                  {JSON.stringify({
                    errors: activateResult.errors,
                    warnings: activateResult.validation_warnings,
                  }, null, 2)}
                </pre>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
