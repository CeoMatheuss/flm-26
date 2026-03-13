import { Player, PlayerAttributes, ScoutReport } from '@/types/game';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getPlayerValue } from '@/utils/playerGenerator';
import { ShoppingCart, UserPlus, Search, EyeOff, RefreshCw, DollarSign, ArrowLeftRight, Filter, TrendingUp, Star, Zap, Shield, Crosshair, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LoanedPlayer } from '@/hooks/useGame';
import { PlayerProfileModal } from './PlayerProfileModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  marketPlayers: Player[];
  freeAgents: Player[];
  clubPlayers: Player[];
  budget: number;
  clubName: string;
  listedForSale: string[];
  scoutReports: ScoutReport[];
  loanedPlayers: LoanedPlayer[];
  onBuy: (player: Player) => void;
  onSell: (player: Player) => void;
  onSignFreeAgent: (player: Player, offeredSalary: number) => void;
  onRefresh: () => void;
  onRefreshFreeAgents: () => void;
  onLoanOut: (playerId: string) => void;
  onLoanIn: (player: Player) => void;
}

const posColors: Record<string, { bg: string; text: string; border: string }> = {
  GOL: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  ZAG: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  LAT: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  VOL: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  MEI: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  ATA: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
};

const attrLabels: Record<string, string> = {
  speed: '⚡ Vel', shooting: '🎯 Fin', passing: '📐 Pas', defending: '🛡️ Def',
  physical: '💪 Fís', dribbling: '🎨 Dri', setPieces: '🎱 BP', positioning: '📍 Pos',
  heading: '🗣️ Cab', marking: '🔒 Mar', vision: '👁️ Vis', crossing: '🎯 Cru',
  longShots: '🚀 CL', workRate: '🔥 Int', composure: '🧠 Com', aggression: '⚔️ Agr',
};

function getPlayerExpectedSalary(player: Player): number {
  return Math.floor(player.overall * 200 + player.age * 100);
}

function getOvrColor(ovr: number) {
  if (ovr >= 85) return 'text-amber-400';
  if (ovr >= 75) return 'text-emerald-400';
  if (ovr >= 65) return 'text-blue-400';
  return 'text-muted-foreground';
}

function getOvrBg(ovr: number) {
  if (ovr >= 85) return 'from-amber-500/20 to-amber-500/5';
  if (ovr >= 75) return 'from-emerald-500/20 to-emerald-500/5';
  if (ovr >= 65) return 'from-blue-500/20 to-blue-500/5';
  return 'from-muted/30 to-muted/10';
}

export function MarketTab({ marketPlayers, freeAgents, clubPlayers, budget, clubName, listedForSale, scoutReports, loanedPlayers, onBuy, onSell, onSignFreeAgent, onRefresh, onRefreshFreeAgents, onLoanOut, onLoanIn }: Props) {
  const [salaryOffers, setSalaryOffers] = useState<Record<string, number>>({});
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());
  const [posFilter, setPosFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'overall' | 'age' | 'value'>('overall');
  const [searchText, setSearchText] = useState('');

  const listedPlayers = clubPlayers.filter(p => listedForSale.includes(p.id));
  const loansOut = loanedPlayers.filter(l => l.direction === 'out');
  const loansIn = loanedPlayers.filter(l => l.direction === 'in');
  const loanedPlayerIds = loanedPlayers.map(l => l.player.id);
  const loanableClubPlayers = clubPlayers.filter(p => !loanedPlayerIds.includes(p.id) && !listedForSale.includes(p.id));

  const toggleExpand = (id: string) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filterAndSort = (players: Player[]) => {
    let filtered = players;
    if (posFilter !== 'all') filtered = filtered.filter(p => p.position === posFilter);
    if (searchText) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchText.toLowerCase()));
    return filtered.sort((a, b) => {
      if (sortBy === 'overall') return b.overall - a.overall;
      if (sortBy === 'age') return a.age - b.age;
      return getPlayerValue(b) - getPlayerValue(a);
    });
  };

  const renderAttributes = (attrs: PlayerAttributes) => (
    <div className="mt-3 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
      {(Object.entries(attrLabels) as [string, string][]).map(([key, label]) => {
        const val = attrs[key as keyof PlayerAttributes];
        if (val === undefined) return null;
        const color = val >= 80 ? 'text-emerald-400' : val >= 60 ? 'text-amber-400' : 'text-red-400';
        const barWidth = `${val}%`;
        return (
          <div key={key} className="text-center rounded-lg p-1.5" style={{ background: 'hsl(var(--accent) / 0.5)' }}>
            <p className="text-[7px] text-muted-foreground leading-none mb-0.5">{label}</p>
            <p className={`text-[11px] font-bold ${color}`}>{val}</p>
            <div className="w-full h-0.5 rounded-full mt-0.5" style={{ background: 'hsl(var(--border) / 0.3)' }}>
              <div className={`h-full rounded-full ${val >= 80 ? 'bg-emerald-400' : val >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: barWidth }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderPlayerCard = (player: Player, action: React.ReactNode, showAttrs = true) => {
    const value = getPlayerValue(player);
    const isExpanded = expandedPlayers.has(player.id);
    const pos = posColors[player.position] || { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/30' };

    return (
      <div key={player.id} className="group rounded-xl border border-border/20 hover:border-primary/30 transition-all duration-300 overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        <div className={`flex items-center gap-2.5 p-3 bg-gradient-to-r ${getOvrBg(player.overall)}`}>
          {/* OVR Badge */}
          <div className="relative shrink-0">
            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center ${pos.bg} border ${pos.border}`}>
              <span className={`text-sm font-black ${getOvrColor(player.overall)}`}>{player.overall}</span>
              <span className={`text-[7px] font-bold ${pos.text} leading-none`}>{player.position}</span>
            </div>
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <PlayerProfileModal player={player}>
              <button className="font-bold text-sm truncate text-left hover:text-primary transition-colors cursor-pointer block">{player.name}</button>
            </PlayerProfileModal>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{player.age} anos</span>
            </div>
          </div>

          {/* Value */}
          <div className="text-right shrink-0 mr-1">
            <p className="text-xs font-black text-emerald-400">R${(value / 1000).toFixed(0)}k</p>
            <p className="text-[8px] text-muted-foreground">valor</p>
          </div>

          {/* Action + Expand */}
          <div className="flex items-center gap-1 shrink-0">
            {showAttrs && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-60 hover:opacity-100" onClick={() => toggleExpand(player.id)}>
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            )}
            {action}
          </div>
        </div>
        {isExpanded && showAttrs && (
          <div className="px-3 pb-3">
            {renderAttributes(player.attributes)}
          </div>
        )}
      </div>
    );
  };

  // Filters bar
  const renderFilters = () => (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative flex-1 min-w-[120px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar jogador..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>
      <Select value={posFilter} onValueChange={setPosFilter}>
        <SelectTrigger className="h-8 w-[90px] text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="GOL">GOL</SelectItem>
          <SelectItem value="ZAG">ZAG</SelectItem>
          <SelectItem value="LAT">LAT</SelectItem>
          <SelectItem value="VOL">VOL</SelectItem>
          <SelectItem value="MEI">MEI</SelectItem>
          <SelectItem value="ATA">ATA</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
        <SelectTrigger className="h-8 w-[100px] text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="overall">OVR ↓</SelectItem>
          <SelectItem value="age">Idade ↑</SelectItem>
          <SelectItem value="value">Valor ↓</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Budget Header */}
      <div className="rounded-xl p-4 border border-border/20" style={{ background: 'linear-gradient(135deg, hsl(var(--card)), hsl(var(--accent) / 0.5))' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Orçamento disponível</p>
            <p className="text-2xl font-black text-emerald-400">R$ {(budget / 1000).toFixed(0)}k</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="text-center">
              <p className="font-bold text-foreground text-lg">{clubPlayers.length}</p>
              <p>Jogadores</p>
            </div>
            <div className="h-8 w-px bg-border/30" />
            <div className="text-center">
              <p className="font-bold text-foreground text-lg">{listedPlayers.length}</p>
              <p>À venda</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="market" className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-10 rounded-xl p-1" style={{ background: 'hsl(var(--accent) / 0.5)' }}>
          <TabsTrigger value="market" className="text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1">
            <ShoppingCart className="h-3 w-3" /> Mercado
          </TabsTrigger>
          <TabsTrigger value="free" className="text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1">
            <UserPlus className="h-3 w-3" /> Livres
          </TabsTrigger>
          <TabsTrigger value="loans" className="text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1">
            <ArrowLeftRight className="h-3 w-3" /> Empréstimos
          </TabsTrigger>
          <TabsTrigger value="sell" className="text-[10px] sm:text-xs rounded-lg data-[state=active]:bg-primary/15 data-[state=active]:text-primary gap-1">
            <DollarSign className="h-3 w-3" /> Vender
          </TabsTrigger>
        </TabsList>

        {/* ── MARKET TAB ── */}
        <TabsContent value="market" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" /> Mercado de Transferências
              <Badge variant="outline" className="text-[9px] ml-1">{marketPlayers.length}</Badge>
            </h3>
            <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs gap-1.5 h-8 rounded-lg">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>

          {renderFilters()}

          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-2">
              {filterAndSort(marketPlayers).map(player =>
                renderPlayerCard(player,
                  <Button
                    size="sm"
                    onClick={() => onBuy(player)}
                    disabled={budget < getPlayerValue(player)}
                    className="h-8 px-3 text-[10px] sm:text-xs rounded-lg gap-1"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    <span className="hidden sm:inline">Comprar</span>
                  </Button>
                )
              )}
              {filterAndSort(marketPlayers).length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">Nenhum jogador encontrado</div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── FREE AGENTS TAB ── */}
        <TabsContent value="free" className="space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Jogadores Livres
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Negocie o salário — contrate olheiros para saber o nível real</p>
            </div>
            <Button variant="outline" size="sm" onClick={onRefreshFreeAgents} className="text-xs gap-1.5 h-8 rounded-lg">
              <RefreshCw className="h-3 w-3" /> Atualizar
            </Button>
          </div>

          <ScrollArea className="max-h-[55vh]">
            <div className="space-y-2.5">
              {freeAgents.map(player => {
                const expectedSalary = getPlayerExpectedSalary(player);
                const report = scoutReports.find(r => r.player.id === player.id);
                const currentOffer = salaryOffers[player.id] ?? expectedSalary;
                const pos = posColors[player.position] || { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border/30' };

                return (
                  <div key={player.id} className={`rounded-xl border transition-all duration-300 overflow-hidden ${report ? 'border-primary/30' : 'border-border/20'}`} style={{ background: 'hsl(var(--card))' }}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5 p-3">
                      <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center ${pos.bg} border ${pos.border}`}>
                        <EyeOff className={`h-3.5 w-3.5 ${pos.text}`} />
                        <span className={`text-[7px] font-bold ${pos.text} leading-none mt-0.5`}>{player.position}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <PlayerProfileModal player={player} isFreeAgent scoutReport={report}>
                          <button className="font-bold text-sm truncate text-left hover:text-primary transition-colors cursor-pointer block">{player.name}</button>
                        </PlayerProfileModal>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{player.age} anos</span>
                          <span className="text-[10px] text-muted-foreground/50">OVR ???</span>
                        </div>
                      </div>
                      {report && (
                        <Badge className="text-[9px] bg-primary/15 text-primary border-primary/30 shrink-0 gap-1">
                          <Search className="h-2.5 w-2.5" /> ~{report.estimatedOverall}
                        </Badge>
                      )}
                    </div>

                    {/* Salary negotiation */}
                    <div className="px-3 pb-3 space-y-2 border-t border-border/10 pt-2">
                      <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Proposta salarial mensal
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[expectedSalary, Math.ceil(expectedSalary * 1.15), Math.ceil(expectedSalary * 1.3), Math.ceil(expectedSalary * 1.5)].map(sal => (
                          <Button
                            key={sal}
                            size="sm"
                            variant={currentOffer === sal ? 'default' : 'outline'}
                            className="h-6 px-2 text-[9px] rounded-lg"
                            onClick={() => setSalaryOffers(prev => ({ ...prev, [player.id]: sal }))}
                          >
                            R${(sal / 1000).toFixed(0)}k
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1000}
                          step={1000}
                          value={currentOffer}
                          onChange={e => setSalaryOffers(prev => ({ ...prev, [player.id]: Math.max(1000, Number(e.target.value)) }))}
                          className="h-7 w-28 text-[10px] px-2 rounded-lg"
                        />
                        <span className="text-[9px] text-muted-foreground">/mês</span>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-[10px] gap-1 ml-auto rounded-lg"
                          onClick={() => onSignFreeAgent(player, currentOffer)}
                        >
                          <UserPlus className="h-3 w-3" /> Assinar
                        </Button>
                      </div>
                    </div>

                    {report && (
                      <div className="px-3 pb-3">
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                          {(Object.entries(report.estimatedAttributes) as [keyof PlayerAttributes, number][]).map(([key, val]) => (
                            <div key={key} className="text-center rounded-lg p-1" style={{ background: 'hsl(var(--accent) / 0.4)' }}>
                              <p className="text-[7px] text-muted-foreground">{attrLabels[key]}</p>
                              <p className={`text-[10px] font-bold ${val >= 80 ? 'text-emerald-400' : val >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{val}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── LOANS TAB ── */}
        <TabsContent value="loans" className="space-y-3 mt-3">
          {/* Info Card */}
          <div className="rounded-xl p-3 border border-primary/20" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))' }}>
            <div className="flex items-center gap-2.5">
              <ArrowLeftRight className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-bold text-primary">Sistema de Empréstimos</p>
                <p className="text-[10px] text-muted-foreground">Máx. 3 empréstimos (entrada ou saída). Duração: 1 temporada. Receptor paga salário.</p>
              </div>
            </div>
          </div>

          {/* Active loans */}
          {(loansOut.length > 0 || loansIn.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Empréstimos Ativos</p>
              {loansOut.map(loan => (
                <div key={loan.player.id} className="rounded-xl border border-orange-500/20 p-3 flex items-center gap-2.5" style={{ background: 'hsl(var(--card))' }}>
                  <Badge className="text-[8px] bg-orange-500/15 text-orange-400 border-orange-500/30 shrink-0">↗ SAÍDA</Badge>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${posColors[loan.player.position]?.bg || 'bg-muted/30'} ${posColors[loan.player.position]?.text || 'text-muted-foreground'}`}>{loan.player.position}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{loan.player.name}</p>
                    <p className="text-[10px] text-muted-foreground">OVR {loan.player.overall} • Desde T{loan.seasonStart}</p>
                  </div>
                </div>
              ))}
              {loansIn.map(loan => (
                <div key={loan.player.id} className="rounded-xl border border-blue-500/20 p-3 flex items-center gap-2.5" style={{ background: 'hsl(var(--card))' }}>
                  <Badge className="text-[8px] bg-blue-500/15 text-blue-400 border-blue-500/30 shrink-0">↙ ENTRADA</Badge>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${posColors[loan.player.position]?.bg || 'bg-muted/30'} ${posColors[loan.player.position]?.text || 'text-muted-foreground'}`}>{loan.player.position}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{loan.player.name}</p>
                    <p className="text-[10px] text-muted-foreground">OVR {loan.player.overall} • Sal: R${(loan.player.salary / 1000).toFixed(0)}k/mês</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loan out */}
          <div className="space-y-2">
            <p className="text-xs font-bold flex items-center gap-1.5">
              Emprestar Jogadores
              <Badge variant="outline" className="text-[8px]">{loansOut.length}/3</Badge>
            </p>
            {loansOut.length >= 3 ? (
              <p className="text-[10px] text-muted-foreground">Limite de empréstimos de saída atingido.</p>
            ) : (
              <ScrollArea className="max-h-[35vh]">
                <div className="space-y-1.5">
                  {loanableClubPlayers.map(player =>
                    renderPlayerCard(player,
                      <Button size="sm" variant="outline" className="h-7 px-2.5 text-[10px] rounded-lg gap-1" onClick={() => onLoanOut(player.id)} disabled={clubPlayers.length <= 11}>
                        <ArrowLeftRight className="h-3 w-3" /> Emprestar
                      </Button>,
                      false
                    )
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Loan in from market */}
          <div className="space-y-2">
            <p className="text-xs font-bold flex items-center gap-1.5">
              Pegar Emprestado
              <Badge variant="outline" className="text-[8px]">{loansIn.length}/3</Badge>
            </p>
            {loansIn.length >= 3 ? (
              <p className="text-[10px] text-muted-foreground">Limite de empréstimos de entrada atingido.</p>
            ) : (
              <ScrollArea className="max-h-[35vh]">
                <div className="space-y-1.5">
                  {marketPlayers.slice(0, 5).map(player => {
                    const isExpanded = expandedPlayers.has(`loan-${player.id}`);
                    return renderPlayerCard(player,
                      <Button size="sm" className="h-7 px-2.5 text-[10px] rounded-lg gap-1" onClick={() => onLoanIn(player)} disabled={clubPlayers.length >= 30}>
                        <ArrowLeftRight className="h-3 w-3" /> Pegar
                      </Button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* ── SELL TAB ── */}
        <TabsContent value="sell" className="space-y-3 mt-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Vender Jogadores
          </h3>

          {listedPlayers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">À venda</p>
              {listedPlayers.map(player => {
                const value = getPlayerValue(player);
                return (
                  <div key={player.id} className="rounded-xl border border-primary/30 p-3 flex items-center gap-2.5" style={{ background: 'hsl(var(--card))' }}>
                    <div className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center ${posColors[player.position]?.bg || 'bg-muted/30'}`}>
                      <span className={`text-xs font-black ${getOvrColor(player.overall)}`}>{player.overall}</span>
                      <span className={`text-[7px] font-bold ${posColors[player.position]?.text || 'text-muted-foreground'}`}>{player.position}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate">{player.name}</p>
                      <p className="text-[10px] text-emerald-400 font-bold">R${(value / 1000).toFixed(0)}k</p>
                    </div>
                    <Badge className="text-[8px] bg-primary/15 text-primary border-primary/30">À VENDA</Badge>
                  </div>
                );
              })}
            </div>
          )}

          <ScrollArea className="max-h-[45vh]">
            <div className="space-y-1.5">
              {clubPlayers.filter(p => !listedForSale.includes(p.id)).map(player =>
                renderPlayerCard(player,
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[10px] rounded-lg gap-1"
                    onClick={() => onSell(player)}
                    disabled={clubPlayers.length <= 11}
                  >
                    <DollarSign className="h-3 w-3" /> Vender
                  </Button>,
                  false
                )
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
