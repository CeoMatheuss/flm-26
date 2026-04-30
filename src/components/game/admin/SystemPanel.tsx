import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Globe, Trophy, Calendar, FlaskConical, ShieldCheck, Sparkles } from 'lucide-react';
import { HowItWorksTab } from './HowItWorksTab';
import { CountriesPyramidTab } from './CountriesPyramidTab';
import { CupsOverviewTab } from './CupsOverviewTab';
import { SeasonControlTab } from './SeasonControlTab';
import { SimulationValidationTab } from './SimulationValidationTab';
import { BetaAccessPanel } from './BetaAccessPanel';
import { LeaguesPreviewTab } from './LeaguesPreviewTab';

interface Props { adminUserId: string }

export function SystemPanel({ adminUserId }: Props) {
  return (
    <div className="space-y-2">
      <Tabs defaultValue="beta" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full gap-0.5 overflow-x-auto scrollbar-none">
            <TabsTrigger value="beta" className="text-[10px] gap-1 px-2 shrink-0">
              <ShieldCheck className="h-3 w-3" /> BETA
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-[10px] gap-1 px-2 shrink-0">
              <Sparkles className="h-3 w-3" /> Prévia Ligas
            </TabsTrigger>
            <TabsTrigger value="how" className="text-[10px] gap-1 px-2 shrink-0">
              <BookOpen className="h-3 w-3" /> Como Funciona
            </TabsTrigger>
            <TabsTrigger value="pyramid" className="text-[10px] gap-1 px-2 shrink-0">
              <Globe className="h-3 w-3" /> Países & Pirâmide
            </TabsTrigger>
            <TabsTrigger value="cups" className="text-[10px] gap-1 px-2 shrink-0">
              <Trophy className="h-3 w-3" /> Copas
            </TabsTrigger>
            <TabsTrigger value="season" className="text-[10px] gap-1 px-2 shrink-0">
              <Calendar className="h-3 w-3" /> Temporada
            </TabsTrigger>
            <TabsTrigger value="sim" className="text-[10px] gap-1 px-2 shrink-0">
              <FlaskConical className="h-3 w-3" /> Simulação & Validação
            </TabsTrigger>
          </TabsList>
        </ScrollArea>

        <TabsContent value="beta" className="mt-3"><BetaAccessPanel /></TabsContent>
        <TabsContent value="preview" className="mt-3"><LeaguesPreviewTab /></TabsContent>
        <TabsContent value="how" className="mt-3"><HowItWorksTab /></TabsContent>
        <TabsContent value="pyramid" className="mt-3"><CountriesPyramidTab /></TabsContent>
        <TabsContent value="cups" className="mt-3"><CupsOverviewTab /></TabsContent>
        <TabsContent value="season" className="mt-3"><SeasonControlTab adminUserId={adminUserId} /></TabsContent>
        <TabsContent value="sim" className="mt-3"><SimulationValidationTab adminUserId={adminUserId} /></TabsContent>
      </Tabs>
    </div>
  );
}
