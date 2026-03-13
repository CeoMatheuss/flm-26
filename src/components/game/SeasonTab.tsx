import { SeasonData } from '@/types/infrastructure';
import { LeagueTeam } from '@/types/league';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Trophy, Info, Globe, Swords, Medal, Users, Clock, ArrowUpDown, Star } from 'lucide-react';

interface Props {
  season: SeasonData;
  leagueTeams: LeagueTeam[];
  clubName: string;
  hasUnplayedMatches: boolean;
  onEndSeason: () => void;
}

export function SeasonTab({ season, leagueTeams, clubName }: Props) {
  const sorted = [...leagueTeams].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
  const clubPos = sorted.findIndex(t => t.name === clubName) + 1;

  return (
    <div className="space-y-4">
      {/* Status da temporada */}
      <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-yellow-400" />
            Temporada {season.currentSeason}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{season.currentWeek - 1}</p>
              <p className="text-xs text-muted-foreground">Rodadas jogadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{season.totalWeeks - season.currentWeek + 1}</p>
              <p className="text-xs text-muted-foreground">Rodadas restantes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{clubPos > 0 ? `${clubPos}º` : '-'}</p>
              <p className="text-xs text-muted-foreground">Posição atual</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Como funciona a liga */}
      <Card className="border-emerald-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-400" />
            Como Funciona a Liga
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3 items-start">
            <Users className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p>Cada liga é composta por <span className="text-foreground font-semibold">30 clubes</span> que competem ao longo de <span className="text-foreground font-semibold">30 rodadas</span> por temporada.</p>
          </div>
          <div className="flex gap-3 items-start">
            <Clock className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p>Cada rodada corresponde a <span className="text-foreground font-semibold">1 dia real</span>. A temporada dura 30 dias, de fevereiro a fevereiro (ciclo contínuo).</p>
          </div>
          <div className="flex gap-3 items-start">
            <ArrowUpDown className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p>No fim da temporada, os <span className="text-foreground font-semibold text-green-400">4 primeiros sobem</span> de divisão e os <span className="text-foreground font-semibold text-red-400">4 últimos caem</span>. As ligas se redistribuem automaticamente.</p>
          </div>
          <div className="flex gap-3 items-start">
            <Star className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p>Existem <span className="text-foreground font-semibold">4 divisões</span> (Série A, B, C e D) em cada país. Todos começam na Série D e sobem por mérito.</p>
          </div>
          <div className="flex gap-3 items-start">
            <Globe className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p>O jogo conta com <span className="text-foreground font-semibold">38 países</span> distribuídos em 5 continentes: América do Sul, Europa, América do Norte, África e Ásia/Oceania.</p>
          </div>
        </CardContent>
      </Card>

      {/* Como funcionam os campeonatos / copas */}
      <Card className="border-amber-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Campeonatos e Copas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3 items-start">
            <Swords className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p>Campeonatos são <span className="text-foreground font-semibold">criados e gerenciados pela administração</span>. Podem ter formato de <span className="text-foreground font-semibold">Liga, Mata-Mata ou Fase de Grupos</span>.</p>
          </div>
          <div className="flex gap-3 items-start">
            <Users className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p>Todos os clubes registrados são inscritos automaticamente. Vagas restantes são preenchidas com <span className="text-foreground font-semibold">BOTs</span> de força configurável.</p>
          </div>
          <div className="flex gap-3 items-start">
            <Clock className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p>As partidas são <span className="text-foreground font-semibold">agendadas automaticamente</span> com data e horário definidos pelo admin. Os jogos iniciam sozinhos na hora marcada.</p>
          </div>
          <div className="flex gap-3 items-start">
            <Medal className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p>Premiações em dinheiro virtual são distribuídas ao <span className="text-foreground font-semibold">1º, 2º e 3º lugar</span>. Os valores são definidos na criação do campeonato.</p>
          </div>
          <div className="flex gap-3 items-start">
            <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p>Copas nacionais e torneios intercontinentais estão planejados para versões futuras, conectando clubes de diferentes países.</p>
          </div>
        </CardContent>
      </Card>

      {/* Dia 31 - Transição */}
      <Card className="border-purple-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-5 w-5 text-purple-400" />
            Transição de Temporada (Dia 31)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Ao final das 30 rodadas, o sistema executa automaticamente o <span className="text-foreground font-semibold">"Dia 31"</span> — um período de processamento onde:</p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>Promoções e rebaixamentos são calculados</li>
            <li>As ligas são redistribuídas entre divisões</li>
            <li>Uma nova temporada inicia automaticamente</li>
            <li>Nenhuma partida é realizada neste dia</li>
          </ul>
          <p className="text-xs text-muted-foreground/60 pt-1">Você não precisa fazer nada — tudo é automático no modo online.</p>
        </CardContent>
      </Card>

      {/* Histórico */}
      {season.seasonHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5" /> Histórico de Temporadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Temp.</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Pontos</TableHead>
                  <TableHead>V/E/D</TableHead>
                  <TableHead>Campeão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {season.seasonHistory.slice().reverse().map(s => (
                  <TableRow key={s.season} className={s.position === 1 ? 'bg-yellow-500/10' : ''}>
                    <TableCell className="font-medium">T{s.season}</TableCell>
                    <TableCell>
                      <Badge variant={s.position === 1 ? 'default' : s.position <= 4 ? 'secondary' : 'outline'}>
                        {s.position}º
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{s.points}</TableCell>
                    <TableCell>{s.wins}/{s.draws}/{s.losses}</TableCell>
                    <TableCell>{s.champion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
