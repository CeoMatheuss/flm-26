import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, FlaskConical, ChevronDown, ChevronRight, ArrowUp, ArrowDown, Star, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { countryFlags, countryNames } from '@/types/league';
import {
  LeagueRow, MemberRow, ValidationResult,
  runValidations, simulateSeasonEnd, PromotionMove,
  validateInternationalCups, CupRowMin, CupTeamMin,
} from './leagueHelpers';
import { ALL_CONTINENTS } from '@/data/internationalCompetitions';

interface Props { adminUserId: string }

export function SimulationValidationTab({ adminUserId }: Props) {
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [countryStatus, setCountryStatus] = useState<Array<{ country: string; total_players: number; max_capacity: number; is_locked: boolean }>>([]);
  const [cups, setCups] = useState<CupRowMin[]>([]);
  const [cupTeams, setCupTeams] = useState<CupTeamMin[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [simCountry, setSimCountry] = useState<string>('');
  const [simResult, setSimResult] = useState<ReturnType<typeof simulateSeasonEnd> | null>(null);
  const [applying, setApplying] = useState(false);
  const [generatingIntl, setGeneratingIntl] = useState(false);

  const load = async () => {
    setLoading(true);
    const [lRes, mRes, cRes, cupRes, ctRes] = await Promise.all([
      supabase.from('multiplayer_leagues').select('*'),
      supabase.from('league_members').select('*'),
      supabase.from('country_status').select('country, total_players, max_capacity, is_locked'),
      supabase.from('cup_competitions').select('id, name, cup_type, tier, continent, season_year, status'),
      supabase.from('cup_teams').select('cup_id, user_id, club_name'),
    ]);
    if (lRes.data) setLeagues(lRes.data as LeagueRow[]);
    if (mRes.data) setMembers(mRes.data as MemberRow[]);
    if (cRes.data) setCountryStatus(cRes.data as any);
    if (cupRes.data) setCups(cupRes.data as any);
    if (ctRes.data) setCupTeams(ctRes.data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const validations = useMemo<ValidationResult[]>(
    () => [
      ...runValidations(leagues, members, countryStatus),
      ...validateInternationalCups(cups, cupTeams, ALL_CONTINENTS, new Date().getFullYear()),
    ],
    [leagues, members, countryStatus, cups, cupTeams]
  );

  const failures = validations.filter(v => v.status === 'fail').length;
  const warnings = validations.filter(v => v.status === 'warn').length;

  const generateIntlCups = async () => {
    if (!confirm('Gerar copas internacionais agora? Será criada 1 Principal + 1 Secundária por continente, com 32 vagas cada.')) return;
    setGeneratingIntl(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-international-cups');
      if (error) throw error;
      toast.success(`✅ ${data?.created?.length || 0} copa(s) criada(s)!`);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar copas');
    }
    setGeneratingIntl(false);
  };

  const allCountries = useMemo(() => [...new Set(leagues.map(l => l.country))].sort(), [leagues]);

  const runSimulation = () => {
    if (!simCountry) { toast.error('Selecione um país'); return; }
    const cl = leagues.filter(l => l.country === simCountry && l.auto_created && l.league_type === 'main');
    const cm = members.filter(m => cl.some(l => l.id === m.league_id));
    const result = simulateSeasonEnd(cl, cm);
    setSimResult(result);
    toast.success('Simulação calculada!');
  };

  const applyForReal = async () => {
    if (!simCountry || !simResult) return;
    if (!confirm(`Aplicar fim de temporada REAL em ${countryNames[simCountry] || simCountry}? Esta ação modifica o banco.`)) return;
    setApplying(true);
    try {
      const { error } = await supabase.rpc('process_season_transition', { _country: simCountry });
      if (error) throw error;
      await supabase.from('admin_logs').insert([{
        user_id: adminUserId,
        action: 'force_season_end_from_sim',
        details: { country: simCountry, promotions: simResult.promotions.length, relegations: simResult.relegations.length },
      }]);
      toast.success('✅ Temporada aplicada com sucesso!');
      setSimResult(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao aplicar');
    }
    setApplying(false);
  };

  const renderMoves = (moves: PromotionMove[], color: string, icon: JSX.Element) => (
    <ScrollArea className="max-h-[200px]">
      <div className="space-y-1">
        {moves.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma movimentação.</p>
        ) : moves.map(m => (
          <div key={m.memberId} className={`p-1.5 rounded border text-[10px] flex items-center justify-between gap-2 ${color}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              {icon}
              <span className="font-semibold">#{m.position}</span>
              <span className="truncate">{m.clubName}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-[9px]">
              <span className="text-muted-foreground">{m.points}pts</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground/80">{m.toLeagueName}</span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <div className="space-y-3">
      {/* Top alerts */}
      {failures > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-xs">🚨 {failures} problema(s) crítico(s) detectado(s)</AlertTitle>
          <AlertDescription className="text-[10px]">
            Verifique abaixo as falhas estruturais antes de iniciar nova temporada.
          </AlertDescription>
        </Alert>
      )}
      {warnings > 0 && failures === 0 && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertTitle className="text-xs">⚠️ {warnings} aviso(s)</AlertTitle>
          <AlertDescription className="text-[10px]">
            Pequenos pontos de atenção, mas a estrutura está estável.
          </AlertDescription>
        </Alert>
      )}

      {/* Validations */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" /> Validador automático
            </CardTitle>
            <Button size="sm" onClick={load} disabled={loading} className="h-7 text-xs">
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Re-validar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {validations.map((v, i) => {
            const isOpen = openDetails[`${i}`];
            const Icon = v.status === 'pass' ? CheckCircle : v.status === 'fail' ? XCircle : AlertTriangle;
            const color = v.status === 'pass' ? 'text-green-400 border-green-500/30 bg-green-500/5'
              : v.status === 'fail' ? 'text-red-400 border-red-500/30 bg-red-500/5'
              : 'text-amber-400 border-amber-500/30 bg-amber-500/5';
            return (
              <Collapsible key={i} open={isOpen} onOpenChange={(o) => setOpenDetails(p => ({ ...p, [i]: o }))}>
                <div className={`p-2 rounded border ${color}`}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <div className="text-left min-w-0">
                          <p className="text-[11px] font-semibold truncate">{v.check}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{v.message}</p>
                        </div>
                      </div>
                      {v.details && v.details.length > 0 && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-[8px]">{v.details.length}</Badge>
                          {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </div>
                      )}
                    </div>
                  </CollapsibleTrigger>
                  {v.details && v.details.length > 0 && (
                    <CollapsibleContent>
                      <ScrollArea className="max-h-[150px] mt-2">
                        <div className="space-y-0.5">
                          {v.details.map((d, j) => (
                            <div key={`${d.id}-${j}`} className="text-[9px] p-1 rounded bg-background/40">
                              <p className="font-medium">{d.label}</p>
                              {d.info && <p className="text-muted-foreground">{d.info}</p>}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  )}
                </div>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>

      {/* Simulator */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" /> Simulador de fim de temporada (dry-run)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Select value={simCountry} onValueChange={setSimCountry}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Selecione um país" />
              </SelectTrigger>
              <SelectContent>
                {allCountries.map(c => (
                  <SelectItem key={c} value={c}>{countryFlags[c] || '🏳️'} {countryNames[c] || c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={runSimulation} className="h-8 text-xs" disabled={!simCountry}>
              <FlaskConical className="h-3 w-3 mr-1" /> Simular
            </Button>
          </div>

          {simResult && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold flex items-center gap-1 text-green-400">
                    <ArrowUp className="h-3 w-3" /> Promovidos ({simResult.promotions.length})
                  </p>
                  {renderMoves(simResult.promotions, 'border-green-500/20 bg-green-500/5', <ArrowUp className="h-3 w-3 text-green-400" />)}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold flex items-center gap-1 text-red-400">
                    <ArrowDown className="h-3 w-3" /> Rebaixados ({simResult.relegations.length})
                  </p>
                  {renderMoves(simResult.relegations, 'border-red-500/20 bg-red-500/5', <ArrowDown className="h-3 w-3 text-red-400" />)}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold flex items-center gap-1 text-amber-400">
                    <Star className="h-3 w-3" /> Várzea especial ({simResult.specialMoves.length})
                  </p>
                  {renderMoves(simResult.specialMoves, 'border-amber-500/20 bg-amber-500/5', <Star className="h-3 w-3 text-amber-400" />)}
                </div>
              </div>

              <Alert className="border-amber-500/40 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-[10px]">
                  Esta é apenas uma <strong>prévia</strong>. Nada foi salvo no banco. Use o botão abaixo para aplicar de verdade.
                </AlertDescription>
              </Alert>

              <Button
                size="sm"
                onClick={applyForReal}
                disabled={applying}
                className="w-full h-8 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-1"
              >
                ✅ Aplicar fim de temporada de verdade ({countryNames[simCountry] || simCountry})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
