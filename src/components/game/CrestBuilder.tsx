import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  ShieldCrest, shieldShapes, shieldPatterns,
  ShieldShape, ShieldPattern, ShieldIcon, ShieldConfig, shieldIconLabels,
} from './ShieldCrest';
import { Shuffle, FlipHorizontal, Save, Palette, Layers, RotateCcw, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: ShieldConfig;
  onChange: (config: ShieldConfig) => void;
  onSave?: () => void;
  showSaveButton?: boolean;
}

/* ── Heraldic curated palettes (inspired by classic European clubs) ── */
const HERALDIC_PAIRS: Array<[string, string, string]> = [
  ['#8B0000', '#FFD700', '#FFFFFF'],
  ['#000080', '#FFFFFF', '#FFD700'],
  ['#000000', '#FFFFFF', '#C0392B'],
  ['#1B5E20', '#FFFFFF', '#FFD700'],
  ['#0D47A1', '#E53935', '#FFFFFF'],
  ['#4A148C', '#FFFFFF', '#FFD700'],
  ['#B71C1C', '#FFFFFF', '#000000'],
  ['#1A1A1A', '#FFD700', '#B8860B'],
];

const QUICK_PALETTE = [
  '#8B0000', '#000080', '#1B5E20', '#FFD700',
  '#000000', '#FFFFFF', '#4A148C', '#0D47A1',
  '#B71C1C', '#1A1A1A', '#B8860B', '#C0392B',
];

const SHAPE_LABELS: Record<ShieldShape, string> = {
  classic: 'Clássico', rounded: 'Redondo', pointed: 'Pontudo', circle: 'Círculo',
  pentagon: 'Pentágono', gothic: 'Gótico', hexagon: 'Hexágono', 'diamond-shield': 'Diamante',
  badge: 'Badge', crest: 'Brasão',
  swiss: 'Suíço', iberian: 'Ibérico', nordic: 'Nórdico', 'french-modern': 'Francês',
  'italian-oval': 'Oval Italiano', 'german-tournament': 'Tournamento', 'english-heater': 'Heater Inglês',
  victorian: 'Vitoriano',
  baroque: 'Barroco', tudor: 'Tudor', kite: 'Pipa Norman', shell: 'Concha',
  'star-shield': 'Estrela', 'modern-hex': 'Hexa Moderno', 'wave-base': 'Onda', 'split-arch': 'Arco Duplo',
};

const PATTERN_LABELS: Partial<Record<ShieldPattern, string>> = {
  solid: 'Sólido', stripes: 'Listras', diagonal: 'Diagonal', split: 'Meio',
  chevron: 'Chevron', cross: 'Cruz', waves: 'Ondas', quarters: 'Quartos',
  triband: 'Tribanda', sash: 'Faixa', hoop: 'Argolas', 'gradient-fade': 'Gradiente',
  pinstripes: 'Riscas', checkered: 'Xadrez', 'shield-band': 'Banda', frame: 'Moldura',
  'inner-circle': 'Círculo', 'double-split': 'Lados', arrow: 'Seta', zigzag: 'Zigue',
  quartered: 'Quartelado', 'per-pale': 'Pala', 'per-bend': 'Banda', bordure: 'Bordura', chief: 'Chefe',
};

const LAYOUT_PATTERNS: ShieldPattern[] = [
  'solid', 'per-pale', 'quartered', 'per-bend', 'chief', 'bordure',
  'split', 'cross', 'quarters', 'diagonal', 'stripes', 'triband',
  'shield-band', 'sash', 'chevron', 'frame',
];

const ANIMAL_ICONS: ShieldIcon[] = [
  'lion', 'tiger', 'eagle-icon', 'eagle-displayed', 'phoenix', 'horse',
  'wolf', 'bear', 'panther', 'bull', 'deer-head', 'snake',
  'griffin', 'elephant', 'rhino', 'falcon', 'fox', 'ram',
  'lion-head', 'eagle-head', 'wolf-head', 'bear-head', 'dragon', 'swan',
  'parrot',
];
const SYMBOL_ICONS: ShieldIcon[] = [
  'crown-icon', 'fleur-de-lis', 'cross-pattee', 'star', 'sun-burst', 'crescent-moon',
  'sword', 'crossed-swords', 'trident', 'laurel', 'feather', 'wing',
  'tower', 'castle', 'anchor', 'lightning', 'flame-icon', 'compass',
  'diamond-icon', 'shield-icon', 'ball', 'trophy', 'boot', 'oak-leaf',
];
const LETTER_ICONS: ShieldIcon[] = [
  'letter-A', 'letter-B', 'letter-C', 'letter-F', 'letter-M', 'letter-R', 'letter-S',
];

/* ── Curated shield presets (full configurations) — 18 total ── */
const SHIELD_PRESETS: Array<Partial<ShieldConfig> & { name: string }> = [
  { name: 'Cruz Templária',     shape: 'gothic',            pattern: 'cross',     icon: 'cross-pattee', primaryColor: '#000000', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF', borderColor: '#000000' },
  { name: 'Lis Real',           shape: 'classic',           pattern: 'per-pale',  icon: 'fleur-de-lis', primaryColor: '#000080', secondaryColor: '#FFFFFF', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Leão Rampante',      shape: 'gothic',            pattern: 'solid',     icon: 'lion',         primaryColor: '#8B0000', secondaryColor: '#FFD700', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Águia Imperial',     shape: 'classic',           pattern: 'solid',     icon: 'eagle-icon',   primaryColor: '#000000', secondaryColor: '#FFFFFF', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Quartelado Lis',     shape: 'classic',           pattern: 'quartered', icon: 'fleur-de-lis', primaryColor: '#0D47A1', secondaryColor: '#FFFFFF', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Banda Diagonal',     shape: 'classic',           pattern: 'per-bend',  icon: 'none',         primaryColor: '#1A1A1A', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF', borderColor: '#1A1A1A' },
  { name: 'Cruz Pattée',        shape: 'pointed',           pattern: 'solid',     icon: 'cross-pattee', primaryColor: '#B71C1C', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF', borderColor: '#FFFFFF' },
  { name: 'Pala Vertical',      shape: 'classic',           pattern: 'per-pale',  icon: 'none',         primaryColor: '#1B5E20', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF', borderColor: '#FFD700' },
  { name: 'Castelo Medieval',   shape: 'classic',           pattern: 'solid',     icon: 'castle',       primaryColor: '#4A148C', secondaryColor: '#FFFFFF', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Coroa Listrada',     shape: 'classic',           pattern: 'stripes',   icon: 'crown-icon',   primaryColor: '#000080', secondaryColor: '#FFD700', detailColor: '#FFD700', borderColor: '#FFD700' },
  // ── New v2 presets using the 8 new shapes ──
  { name: 'Suíço Vermelho',     shape: 'swiss',             pattern: 'cross',     icon: 'none',         primaryColor: '#DC2626', secondaryColor: '#FFFFFF', detailColor: '#FFFFFF', borderColor: '#FFFFFF' },
  { name: 'Heater Inglês',      shape: 'english-heater',    pattern: 'quartered', icon: 'lion',         primaryColor: '#B71C1C', secondaryColor: '#FFFFFF', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Oval Italiano',      shape: 'italian-oval',      pattern: 'triband',   icon: 'eagle-icon',   primaryColor: '#0D47A1', secondaryColor: '#FFFFFF', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Vitoriano Dourado',  shape: 'victorian',         pattern: 'solid',     icon: 'crown-icon',   primaryColor: '#4A148C', secondaryColor: '#FFD700', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Nórdico Branco',     shape: 'nordic',            pattern: 'cross',     icon: 'none',         primaryColor: '#FFFFFF', secondaryColor: '#0D47A1', detailColor: '#0D47A1', borderColor: '#0D47A1' },
  { name: 'Ibérico Verde',      shape: 'iberian',           pattern: 'per-pale',  icon: 'castle',       primaryColor: '#1B5E20', secondaryColor: '#FFD700', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Francês Royal',      shape: 'french-modern',     pattern: 'solid',     icon: 'fleur-de-lis', primaryColor: '#000080', secondaryColor: '#FFFFFF', detailColor: '#FFD700', borderColor: '#FFD700' },
  { name: 'Tournamento Alemão', shape: 'german-tournament', pattern: 'per-pale',  icon: 'eagle-displayed', primaryColor: '#000000', secondaryColor: '#FFD700', detailColor: '#DC2626', borderColor: '#FFD700' },
];

export function defaultShieldConfig(overrides: Partial<ShieldConfig> = {}): ShieldConfig {
  return {
    shape: 'classic',
    pattern: 'solid',
    icon: 'lion',
    primaryColor: '#8B0000',
    secondaryColor: '#FFFFFF',
    detailColor: '#FFD700',
    borderColor: '#FFD700',
    borderWidth: 3,
    iconScale: 1,
    iconOffsetX: 0,
    iconOffsetY: 0,
    iconRotation: 0,
    iconOpacity: 1,
    iconMirror: false,
    topStars: 0,
    showLaurels: false,
    showCrown: false,
    bannerText: '',
    ...overrides,
  };
}

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {children}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function CatalogCard({
  active, onClick, title, children,
}: { active: boolean; onClick: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'aspect-square rounded-lg border-2 transition-all flex items-center justify-center bg-white text-black',
        'hover:scale-105 hover:shadow-md',
        active
          ? 'border-primary ring-2 ring-primary/30 shadow-md'
          : 'border-zinc-300 hover:border-primary/50'
      )}
    >
      {children}
    </button>
  );
}

/* ── Reusable color panel (used in lg sidebar AND mobile tab) ── */
function ColorsPanel({
  value, update,
}: { value: ShieldConfig; update: (patch: Partial<ShieldConfig>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <SectionDivider>Paletas Heráldicas</SectionDivider>
        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {HERALDIC_PAIRS.map(([p, s, d], i) => (
            <button
              key={i}
              onClick={() => update({ primaryColor: p, secondaryColor: s, detailColor: d, borderColor: d })}
              className="h-9 rounded-md border-2 border-border hover:border-primary/50 overflow-hidden flex transition-all hover:scale-105 shadow-sm"
            >
              <div className="flex-1" style={{ backgroundColor: p }} />
              <div className="flex-1" style={{ backgroundColor: s }} />
              <div className="w-2.5" style={{ backgroundColor: d }} />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Primária', key: 'primaryColor' as const },
          { label: 'Secundária', key: 'secondaryColor' as const },
          { label: 'Símbolo', key: 'detailColor' as const },
          { label: 'Borda', key: 'borderColor' as const },
        ].map(({ label, key }) => (
          <div key={key} className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-1.5 p-1.5 rounded-md border border-border bg-card">
              <input
                type="color"
                value={(value[key] as string) || '#000000'}
                onChange={e => update({ [key]: e.target.value })}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-[9px] font-mono text-muted-foreground uppercase truncate">{value[key]}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label className="text-[10px] text-muted-foreground mb-1.5 block">Acesso Rápido</Label>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PALETTE.map(c => (
            <button
              key={c}
              onClick={() => update({ primaryColor: c })}
              className="w-7 h-7 rounded-full border-2 border-border hover:scale-110 transition-transform shadow-sm"
              style={{ backgroundColor: c }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CrestBuilder({ value, onChange, onSave, showSaveButton = true }: Props) {
  const [activeTab, setActiveTab] = useState('models');
  const [shapePopoverOpen, setShapePopoverOpen] = useState(false);

  const update = (patch: Partial<ShieldConfig>) => onChange({ ...value, ...patch });

  const randomize = () => {
    const [p, s, d] = HERALDIC_PAIRS[Math.floor(Math.random() * HERALDIC_PAIRS.length)];
    const heraldicShapes: ShieldShape[] = ['classic', 'rounded', 'pointed', 'gothic', 'crest', 'badge', 'english-heater', 'iberian', 'french-modern', 'italian-oval'];
    const heraldicPatterns: ShieldPattern[] = ['solid', 'per-pale', 'quartered', 'per-bend', 'chief', 'cross'];
    const allIcons = [...ANIMAL_ICONS, ...SYMBOL_ICONS];
    update({
      shape: heraldicShapes[Math.floor(Math.random() * heraldicShapes.length)],
      pattern: heraldicPatterns[Math.floor(Math.random() * heraldicPatterns.length)],
      icon: allIcons[Math.floor(Math.random() * allIcons.length)],
      primaryColor: p,
      secondaryColor: s,
      detailColor: d,
      borderColor: d,
      iconScale: 1,
      iconOffsetX: 0,
      iconOffsetY: 0,
      iconRotation: 0,
      iconOpacity: 1,
      iconMirror: false,
    });
  };

  const reset = () => onChange(defaultShieldConfig());

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr_240px]">
      {/* ─────────────── PREVIEW PANEL ─────────────── */}
      <div className="space-y-3">
        <div className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Preview
          </span>
        </div>

        <div
          className="relative rounded-xl border-2 border-border p-6 flex items-center justify-center overflow-hidden shadow-inner bg-card/50"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0) 70%)',
            minHeight: 200,
          }}
        >
          <div
            className="drop-shadow-2xl transition-transform"
            style={{ filter: `drop-shadow(0 6px 12px ${value.primaryColor}33)` }}
          >
            <ShieldCrest
              primaryColor={value.primaryColor}
              secondaryColor={value.secondaryColor}
              detailColor={value.detailColor}
              pattern={value.pattern}
              shape={value.shape}
              icon={value.icon}
              size={170}
              borderColor={value.borderColor}
              borderWidth={value.borderWidth}
              iconScale={value.iconScale}
              iconOffsetX={value.iconOffsetX}
              iconOffsetY={value.iconOffsetY}
              iconRotation={value.iconRotation}
              iconOpacity={value.iconOpacity}
              iconMirror={value.iconMirror}
              topStars={value.topStars as 0 | 1 | 2 | 3}
              showLaurels={value.showLaurels}
              showCrown={value.showCrown}
              bannerText={value.bannerText}
              bannerColor={value.bannerColor}
            />
          </div>
        </div>

        {/* Trocar Formato Button (Popover) */}
        <Popover open={shapePopoverOpen} onOpenChange={setShapePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between gap-2 h-10">
              <div className="flex items-center gap-2">
                <ShieldCrest
                  primaryColor="#1A1A1A"
                  secondaryColor="#FFFFFF"
                  detailColor="#1A1A1A"
                  borderColor="#1A1A1A"
                  borderWidth={1.2}
                  pattern="solid"
                  shape={value.shape}
                  icon="none"
                  size={20}
                />
                <span className="text-xs font-medium">{SHAPE_LABELS[value.shape]}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-3" align="start">
            <SectionDivider>Formato do Escudo</SectionDivider>
            <div className="grid grid-cols-3 gap-2 mt-2 max-h-[360px] overflow-y-auto">
              {shieldShapes.map(shape => (
                <CatalogCard
                  key={shape}
                  active={value.shape === shape}
                  onClick={() => {
                    update({ shape });
                    setShapePopoverOpen(false);
                  }}
                  title={SHAPE_LABELS[shape]}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCrest
                      primaryColor="#1A1A1A"
                      secondaryColor="#FFFFFF"
                      detailColor="#1A1A1A"
                      borderColor="#1A1A1A"
                      borderWidth={1.5}
                      pattern="solid"
                      shape={shape}
                      icon="none"
                      size={40}
                    />
                    <span className="text-[8.5px] font-medium text-zinc-700 leading-tight text-center px-0.5">
                      {SHAPE_LABELS[shape]}
                    </span>
                  </div>
                </CatalogCard>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="outline" size="sm" onClick={randomize} className="gap-1.5 text-xs">
            <Shuffle className="h-3.5 w-3.5" /> Aleatório
          </Button>
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Resetar
          </Button>
        </div>
        {showSaveButton && onSave && (
          <Button size="sm" onClick={onSave} className="w-full gap-1.5">
            <Save className="h-3.5 w-3.5" /> Salvar Escudo
          </Button>
        )}
      </div>

      {/* ─────────────── TABS PANEL (Modelos + Divisão; Cores aparece no lg via sidebar) ─────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
        <TabsList className="grid grid-cols-3 lg:grid-cols-2 h-auto w-full">
          <TabsTrigger value="models" className="flex-col gap-0.5 py-2 text-[11px]">
            <Sparkles className="h-4 w-4" />Modelos
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex-col gap-0.5 py-2 text-[11px]">
            <Layers className="h-4 w-4" />Divisão
          </TabsTrigger>
          {/* Colors tab visible only below lg (mobile/tablet) */}
          <TabsTrigger value="colors" className="flex-col gap-0.5 py-2 text-[11px] lg:hidden">
            <Palette className="h-4 w-4" />Cores
          </TabsTrigger>
        </TabsList>

        {/* ─── MODELOS TAB ─── */}
        <TabsContent value="models" className="mt-3">
          <div className="flex items-center justify-end mb-2">
            <Button
              size="sm"
              variant={value.iconMirror ? 'default' : 'outline'}
              onClick={() => update({ iconMirror: !value.iconMirror })}
              className="gap-1 h-7 text-[10px]"
            >
              <FlipHorizontal className="h-3 w-3" /> Espelhar
            </Button>
          </div>

          <ScrollArea className="h-[320px] sm:h-[380px] lg:h-[480px] pr-2">
            {/* ── MODELOS DE ESCUDOS ── */}
            <SectionDivider>Modelos de Escudos</SectionDivider>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mt-2 mb-4">
              {SHIELD_PRESETS.map(preset => {
                const isActive =
                  value.shape === preset.shape &&
                  value.pattern === preset.pattern &&
                  value.icon === preset.icon &&
                  value.primaryColor === preset.primaryColor;
                return (
                  <CatalogCard
                    key={preset.name}
                    active={isActive}
                    onClick={() => update(preset)}
                    title={preset.name}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <ShieldCrest
                        primaryColor={preset.primaryColor!}
                        secondaryColor={preset.secondaryColor!}
                        detailColor={preset.detailColor}
                        borderColor={preset.borderColor}
                        borderWidth={1.5}
                        pattern={preset.pattern as ShieldPattern}
                        shape={preset.shape as ShieldShape}
                        icon={preset.icon as ShieldIcon}
                        size={48}
                      />
                      <span className="text-[8px] font-medium text-zinc-700 leading-tight text-center px-0.5 line-clamp-1">
                        {preset.name}
                      </span>
                    </div>
                  </CatalogCard>
                );
              })}
            </div>

            {/* ── ANIMAIS ── */}
            <SectionDivider>Animais</SectionDivider>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mt-2 mb-4">
              <CatalogCard
                active={value.icon === 'none'}
                onClick={() => update({ icon: 'none' })}
                title="Nenhum"
              >
                <span className="text-[10px] font-bold text-zinc-500">∅</span>
              </CatalogCard>
              {ANIMAL_ICONS.map(ic => (
                <CatalogCard
                  key={ic}
                  active={value.icon === ic}
                  onClick={() => update({ icon: ic })}
                  title={shieldIconLabels[ic]}
                >
                  <ShieldCrest
                    primaryColor="#FFFFFF"
                    secondaryColor="#FFFFFF"
                    detailColor="#0A0A0A"
                    borderColor="#0A0A0A"
                    borderWidth={1.2}
                    pattern="solid"
                    shape={value.shape}
                    icon={ic}
                    size={48}
                  />
                </CatalogCard>
              ))}
            </div>

            {/* ── SÍMBOLOS ── */}
            <SectionDivider>Símbolos</SectionDivider>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mt-2 mb-4">
              {SYMBOL_ICONS.map(ic => (
                <CatalogCard
                  key={ic}
                  active={value.icon === ic}
                  onClick={() => update({ icon: ic })}
                  title={shieldIconLabels[ic]}
                >
                  <ShieldCrest
                    primaryColor="#FFFFFF"
                    secondaryColor="#FFFFFF"
                    detailColor="#0A0A0A"
                    borderColor="#0A0A0A"
                    borderWidth={1.2}
                    pattern="solid"
                    shape={value.shape}
                    icon={ic}
                    size={48}
                  />
                </CatalogCard>
              ))}
            </div>

            {/* ── LETRAS ── */}
            <SectionDivider>Letras</SectionDivider>
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-7 gap-2 mt-2">
              {LETTER_ICONS.map(ic => (
                <CatalogCard
                  key={ic}
                  active={value.icon === ic}
                  onClick={() => update({ icon: ic })}
                  title={shieldIconLabels[ic]}
                >
                  <ShieldCrest
                    primaryColor="#FFFFFF"
                    secondaryColor="#FFFFFF"
                    detailColor="#0A0A0A"
                    borderColor="#0A0A0A"
                    borderWidth={1.2}
                    pattern="solid"
                    shape={value.shape}
                    icon={ic}
                    size={48}
                  />
                </CatalogCard>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── LAYOUT (DIVISÃO) TAB ─── */}
        <TabsContent value="layout" className="mt-3">
          <ScrollArea className="h-[320px] sm:h-[380px] lg:h-[480px] pr-2">
            <SectionDivider>Divisões Heráldicas</SectionDivider>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mt-2">
              {LAYOUT_PATTERNS.map(p => (
                <CatalogCard
                  key={p}
                  active={value.pattern === p}
                  onClick={() => update({ pattern: p })}
                  title={PATTERN_LABELS[p] || p}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCrest
                      primaryColor="#1A1A1A"
                      secondaryColor="#E5E5E5"
                      detailColor="#1A1A1A"
                      borderColor="#1A1A1A"
                      borderWidth={1.5}
                      pattern={p}
                      shape={value.shape}
                      icon="none"
                      size={48}
                    />
                    <span className="text-[8.5px] font-medium text-zinc-700 leading-tight">
                      {PATTERN_LABELS[p] || p}
                    </span>
                  </div>
                </CatalogCard>
              ))}
            </div>

            <SectionDivider>Outros Padrões</SectionDivider>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 mt-2">
              {shieldPatterns.filter(p => !LAYOUT_PATTERNS.includes(p)).map(p => (
                <CatalogCard
                  key={p}
                  active={value.pattern === p}
                  onClick={() => update({ pattern: p })}
                  title={PATTERN_LABELS[p] || p}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ShieldCrest
                      primaryColor="#1A1A1A"
                      secondaryColor="#E5E5E5"
                      detailColor="#1A1A1A"
                      borderColor="#1A1A1A"
                      borderWidth={1.5}
                      pattern={p}
                      shape={value.shape}
                      icon="none"
                      size={44}
                    />
                    <span className="text-[8px] font-medium text-zinc-700 leading-tight capitalize">
                      {PATTERN_LABELS[p] || p.replace('-', ' ')}
                    </span>
                  </div>
                </CatalogCard>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── COLORS TAB (mobile/tablet only) ─── */}
        <TabsContent value="colors" className="mt-3 lg:hidden">
          <ColorsPanel value={value} update={update} />
        </TabsContent>
      </Tabs>

      {/* ─────────────── COLORS SIDEBAR (desktop lg+) ─────────────── */}
      <aside className="hidden lg:block">
        <div className="rounded-xl border border-border bg-card/50 p-3 sticky top-2">
          <div className="flex items-center gap-1.5 mb-3">
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cores</span>
          </div>
          <ColorsPanel value={value} update={update} />
        </div>
      </aside>
    </div>
  );
}
