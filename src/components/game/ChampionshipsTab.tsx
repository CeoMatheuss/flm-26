import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Trophy, Calendar, Users, BarChart2, Newspaper, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function ChampionshipsTab() {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('Brasil');

  // Placeholder para carregar dados
  const loadLeagues = async () => {
    setLoading(true);
    const { data } = await supabase.from('world_leagues').select('*').limit(20);
    if (data) setLeagues(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-white/10">
        <h2 className="text-2xl font-black text-white flex items-center gap-2">
          <Trophy className="text-indigo-400" /> Hub de Competições
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input 
            placeholder="Pesquisar campeonato..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:col-span-2 bg-black/20 border-white/10"
          />
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="bg-black/20 border-white/10">
              <SelectValue placeholder="País" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Brasil">Brasil</SelectItem>
              <SelectItem value="Inglaterra">Inglaterra</SelectItem>
              <SelectItem value="Espanha">Espanha</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-indigo-600 hover:bg-indigo-500 font-bold">
            <Search className="h-4 w-4 mr-2" /> Pesquisar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="hover:border-indigo-500/50 transition cursor-pointer bg-slate-900/50 border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Trophy className="text-yellow-500" /> Brasileirão Série A
              </CardTitle>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Ativo</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Rodada: 28</p>
                <p>Times: 16</p>
                <p>Temporada: 2026</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
