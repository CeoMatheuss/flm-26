import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Swords, Users, Play, Loader2, Trophy, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OnlineFriendliesTab } from './OnlineFriendliesTab';

interface Props {
  userId: string;
  clubName: string;
  stadiumName: string;
  stadiumCapacity: number;
  players: any[];
  teamStrength: number;
  tactics: any;
  fans: number;
}

export function MatchesTab({
  userId, clubName, stadiumName, stadiumCapacity, players, teamStrength, tactics, fans
}: Props) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bot');
  const [generating, setGenerating] = useState(false);

  const startFriendlyMatch = async (opponent: { name: string, logo?: string, strength: number }, isOnline = false) => {
    const isHome = Math.random() > 0.5;
    
    // Cálculo oficial de estádio para o adversário (BOT ou Visitante)
    let oppStadium = `Estádio ${opponent.name}`;
    let oppCapacity = 5000;
    
    if (!isHome) {
      // Se não for em casa, estima um estádio baseado na força do BOT
      const tiers = [5000, 12000, 25000, 45000, 65000, 85000];
      const tierIdx = Math.min(tiers.length - 1, Math.floor(opponent.strength / 18));
      oppCapacity = tiers[tierIdx];
      
      const stadiumNames = ["Arena Municipal", "Parque dos Esportes", "Estádio do Povo", "Coliseu da Vitória", "Memorial do Futebol"];
      oppStadium = `${stadiumNames[Math.floor(Math.random() * stadiumNames.length)]} (${opponent.name})`;
    }

    navigate('/match', {
      state: {
        homeTeam: isHome ? clubName : opponent.name,
        awayTeam: isHome ? opponent.name : clubName,
        homePlayers: isHome ? players : [],
        homeStrength: isHome ? teamStrength : opponent.strength,
        awayStrength: isHome ? opponent.strength : teamStrength,
        matchId: `friendly-${Math.random().toString(36).substr(2, 9)}`,
        tactics: tactics || { formation: '4-4-2' },
        stadiumName: isHome ? stadiumName : oppStadium,
        stadiumCapacity: isHome ? stadiumCapacity : oppCapacity,
        isHome,
        competition: isOnline ? 'Amistoso Online' : 'Amistoso vs BOT',
        fans: fans || 1000,
        isFriendly: true,
        reputation: 50, // Default for friendlies
        ticketPrice: 30,
      }
    });
  };

  const generateBotFriendly = async (level: 'easy' | 'balanced' | 'hard') => {
    setGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    
    let oppStrength = teamStrength;
    if (level === 'easy') oppStrength -= 10;
    if (level === 'hard') oppStrength += 10;
    
    const botOpponent = {
      name: `BOT ${level.toUpperCase()} FC`,
      logo: '🤖',
      strength: Math.max(40, Math.min(99, oppStrength))
    };

    startFriendlyMatch(botOpponent);
    setGenerating(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Swords className="h-6 w-6 text-primary" /> Amistosos!
        </h2>
        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
          Treino Livre
        </Badge>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 via-card to-background border-primary/20 overflow-hidden">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full h-12 bg-muted/30 rounded-none border-b border-border/50">
              <TabsTrigger value="bot" className="flex-1 gap-2 py-3 data-[state=active]:bg-background"> // Centralizando amistosos em GERAIS - BOT
                <Users className="h-4 w-4" /> Desafiar BOT
              </TabsTrigger>
              <TabsTrigger value="online" className="flex-1 gap-2 py-3 data-[state=active]:bg-background">
                <Shield className="h-4 w-4" /> Matchmaking Online
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bot" className="p-4 space-y-4 mt-0">
              <div className="space-y-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" /> Partida Rápida
                </h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Jogue contra o sistema para testar táticas e ganhar torcida. 
                  <span className="text-primary font-bold ml-1">Sem impacto na fadiga dos jogadores.</span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-1 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
                  onClick={() => generateBotFriendly('easy')}
                  disabled={generating}
                >
                  <span className="text-xs font-black text-emerald-500">NÍVEL FÁCIL</span>
                  <span className="text-[9px] opacity-60">Ideal para goleadas</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-1 border-primary/20 bg-primary/5 hover:bg-primary/10"
                  onClick={() => generateBotFriendly('balanced')}
                  disabled={generating}
                >
                  <span className="text-xs font-black text-primary">EQUILIBRADO</span>
                  <span className="text-[9px] opacity-60">Nível similar ao seu</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col gap-1 border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                  onClick={() => generateBotFriendly('hard')}
                  disabled={generating}
                >
                  <span className="text-xs font-black text-red-500">NÍVEL DIFÍCIL</span>
                  <span className="text-[9px] opacity-60">Desafio real de treino</span>
                </Button>
              </div>

              {generating && (
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-[10px] text-muted-foreground animate-pulse">Sorteando adversário...</span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="online" className="p-0 mt-0">
              <OnlineFriendliesTab 
                userId={userId}
                clubName={clubName}
                stadiumName={stadiumName}
                stadiumCapacity={stadiumCapacity}
                players={players}
                teamStrength={teamStrength}
                tactics={tactics}
                fans={fans}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sistema de Torcida</h4>
              <p className="text-[10px] text-muted-foreground">
                Vitórias em amistosos atraem novos torcedores para o clube. Empates mantêm a estabilidade, enquanto derrotas podem afastar os mais exigentes.
              </p>
            </div>
          </div>
          
          <div className="pt-2 border-t border-border/20">
            <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
              <Swords className="h-3 w-3" /> Histórico de Amistosos
            </h4>
            <div className="bg-background/40 rounded-lg p-3 text-center text-[10px] text-muted-foreground italic">
              Seus últimos resultados em amistosos aparecerão aqui.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}