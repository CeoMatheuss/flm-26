import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Globe, Star, Users, Calendar, BarChart3, History } from 'lucide-react';
import { CONTINENTAL_COMPETITIONS, getContinentalCompetition } from '@/utils/continentalUtils';
import { countryContinents } from '@/types/league';
import { supabase } from '@/integrations/supabase/client';

interface ContinentalTabProps {
  club: any;
}

export function ContinentalTab({ club }: ContinentalTabProps) {
  const userContinent = countryContinents[club.country] || 'south_america';
  const userComp = getContinentalCompetition(userContinent);
  
  const [activeComp, setActiveComp] = useState<string>(userComp.id);

  // Simulating groups for the competition
  const groups = [
    { name: 'Grupo A', teams: [{ name: club.name, p: 12, w: 4, d: 0, l: 1, gf: 10, ga: 3 }, { name: 'Real Madrid', p: 10, w: 3, d: 1, l: 1, gf: 8, ga: 4 }, { name: 'Bayern', p: 4, w: 1, d: 1, l: 3, gf: 5, ga: 9 }, { name: 'Ajax', p: 3, w: 1, d: 0, l: 4, gf: 4, ga: 11 }] },
    { name: 'Grupo B', teams: [{ name: 'Man City', p: 15, w: 5, d: 0, l: 0, gf: 15, ga: 2 }, { name: 'PSG', p: 9, w: 3, d: 0, l: 2, gf: 10, ga: 7 }, { name: 'Benfica', p: 6, w: 2, d: 0, l: 3, gf: 6, ga: 10 }, { name: 'Inter', p: 0, w: 0, d: 0, l: 5, gf: 2, ga: 14 }] },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tighter flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            COMPETIÇÕES CONTINENTAIS
          </h2>
          <p className="text-muted-foreground font-medium">
            O caminho para a glória eterna começa aqui.
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
          <Badge variant="outline" className="bg-background">
            Sua Região: {userContinent.replace('_', ' ').toUpperCase()}
          </Badge>
          <Badge className="bg-yellow-500 text-black border-none">
            {userComp.name}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue={userComp.id} className="w-full" onValueChange={setActiveComp}>
        <TabsList className="grid grid-cols-2 md:grid-cols-6 h-auto p-1 mb-4 bg-muted/30">
          {Object.values(CONTINENTAL_COMPETITIONS).map((comp) => (
            <TabsTrigger 
              key={comp.id} 
              value={comp.id}
              className="py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">{comp.icon}</span>
                <span className="text-[10px] font-bold uppercase truncate w-full text-center">
                  {comp.name.split(' ')[0]}
                </span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.values(CONTINENTAL_COMPETITIONS).map((comp) => (
          <TabsContent key={comp.id} value={comp.id} className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Leaderboard/Groups */}
              <Card className="lg:col-span-2 overflow-hidden border-2 border-muted/20">
                <CardHeader className="bg-muted/50 border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      Fase de Grupos - {comp.name}
                    </CardTitle>
                    <Badge variant="outline" className="font-mono">TEMPORADA 2026</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {groups.map((group, idx) => (
                      <div key={idx} className="p-4">
                        <h4 className="font-black text-sm mb-3 bg-primary/10 w-fit px-3 py-1 rounded text-primary italic uppercase tracking-widest">
                          {group.name}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted-foreground text-[10px] uppercase font-bold border-b">
                                <th className="text-left pb-2 font-black">Clube</th>
                                <th className="text-center pb-2 w-10">P</th>
                                <th className="text-center pb-2 w-8">V</th>
                                <th className="text-center pb-2 w-8">E</th>
                                <th className="text-center pb-2 w-8">D</th>
                                <th className="text-center pb-2 w-12">GP/GC</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {group.teams.map((t, tidx) => (
                                <tr key={tidx} className={`group ${t.name === club.name ? 'bg-primary/5' : ''}`}>
                                  <td className="py-3 flex items-center gap-2">
                                    <span className={`w-1 h-5 rounded-full ${tidx < 2 ? 'bg-emerald-500' : 'bg-transparent'}`} />
                                    <span className={`font-bold ${t.name === club.name ? 'text-primary' : ''}`}>
                                      {t.name}
                                    </span>
                                  </td>
                                  <td className="text-center font-black">{t.p}</td>
                                  <td className="text-center text-muted-foreground">{t.w}</td>
                                  <td className="text-center text-muted-foreground">{t.d}</td>
                                  <td className="text-center text-muted-foreground">{t.l}</td>
                                  <td className="text-center font-mono text-xs">{t.gf}/{t.ga}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar: Info & History */}
              <div className="space-y-6">
                <Card className="bg-gradient-to-br from-primary/5 to-transparent border-2 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      Status da Competição
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg border">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Fase Atual</span>
                      <Badge className="font-black italic">GRUPOS (5/6)</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg border">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Premiação Acumulada</span>
                      <span className="font-black text-emerald-500">R$ 4.5M</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg border">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Prestígio</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Últimos Campeões
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm p-2 hover:bg-muted/50 rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">2025</span>
                        <span className="font-bold">Flamengo</span>
                      </div>
                      <span>🇧🇷</span>
                    </div>
                    <div className="flex items-center justify-between text-sm p-2 hover:bg-muted/50 rounded transition-colors border-t border-dashed">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">2024</span>
                        <span className="font-bold">Fluminense</span>
                      </div>
                      <span>🇧🇷</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom Row: Upcoming & Top Scorers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Próximas Rodadas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="text-center border-r pr-4 min-w-[60px]">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase">DIA</div>
                      <div className="text-xl font-black italic">28</div>
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-bold">{club.name}</span>
                      <span className="text-[10px] font-black bg-muted px-2 py-0.5 rounded italic">VS</span>
                      <span className="font-bold">Real Madrid</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Artilharia
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <table className="w-full text-sm">
                    <tbody className="divide-y">
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 w-8 font-black italic text-primary">1º</td>
                        <td className="p-3 font-bold">Endrick</td>
                        <td className="p-3 text-muted-foreground text-xs uppercase">{club.name}</td>
                        <td className="p-3 text-right font-black">7 ⚽</td>
                      </tr>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 w-8 font-black italic">2º</td>
                        <td className="p-3 font-bold">Vini Jr</td>
                        <td className="p-3 text-muted-foreground text-xs uppercase">Real Madrid</td>
                        <td className="p-3 text-right font-black">6 ⚽</td>
                      </tr>
                    </tbody>
                   </table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
