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

export type SystemSection = 'beta' | 'preview' | 'how' | 'pyramid' | 'cups' | 'season' | 'sim';

interface Props {
  adminUserId: string;
  /** Restringe quais seções aparecem. Se omitido, mostra todas. */
  sections?: SystemSection[];
  defaultSection?: SystemSection;
}

const ALL_SECTIONS: { id: SystemSection; label: string; icon: any }[] = [
  { id: 'beta',    label: 'BETA',                  icon: ShieldCheck },
  { id: 'preview', label: 'Prévia Ligas',          icon: Sparkles },
  { id: 'pyramid', label: 'Países & Pirâmide',     icon: Globe },
  { id: 'season',  label: 'Temporada',             icon: Calendar },
  { id: 'sim',     label: 'Simulação & Validação', icon: FlaskConical },
  { id: 'how',     label: 'Como Funciona',         icon: BookOpen },
];

export function SystemPanel({ adminUserId, sections, defaultSection }: Props) {
  const visible = sections && sections.length > 0
    ? ALL_SECTIONS.filter(s => sections.includes(s.id))
    : ALL_SECTIONS;

  if (visible.length === 0) return null;
  const initial = defaultSection && visible.some(s => s.id === defaultSection)
    ? defaultSection
    : visible[0].id;

  return (
    <div className="space-y-2">
      <Tabs defaultValue={initial} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-auto min-w-full gap-0.5 overflow-x-auto scrollbar-none">
            {visible.map(s => {
              const Icon = s.icon;
              return (
                <TabsTrigger key={s.id} value={s.id} className="text-[10px] gap-1 px-2 shrink-0">
                  <Icon className="h-3 w-3" /> {s.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

        {visible.some(s => s.id === 'beta') && (
          <TabsContent value="beta" className="mt-3"><BetaAccessPanel /></TabsContent>
        )}
        {visible.some(s => s.id === 'preview') && (
          <TabsContent value="preview" className="mt-3"><LeaguesPreviewTab /></TabsContent>
        )}
        {visible.some(s => s.id === 'pyramid') && (
          <TabsContent value="pyramid" className="mt-3"><CountriesPyramidTab /></TabsContent>
        )}
        {visible.some(s => s.id === 'season') && (
          <TabsContent value="season" className="mt-3"><SeasonControlTab adminUserId={adminUserId} /></TabsContent>
        )}
        {/* Seção de copas removida */}
        {visible.some(s => s.id === 'sim') && (
          <TabsContent value="sim" className="mt-3"><SimulationValidationTab adminUserId={adminUserId} /></TabsContent>
        )}
        {visible.some(s => s.id === 'how') && (
          <TabsContent value="how" className="mt-3"><HowItWorksTab /></TabsContent>
        )}
      </Tabs>
    </div>
  );
}
