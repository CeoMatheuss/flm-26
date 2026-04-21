import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShieldCrest, shieldShapes, shieldPatterns, shieldIcons,
  ShieldShape, ShieldPattern, ShieldIcon, ShieldConfig, shieldIconLabels,
} from './ShieldCrest';
import { Shuffle, FlipHorizontal, Save, Crown, Sparkles, Shield, Palette, Settings2, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: ShieldConfig;
  onChange: (config: ShieldConfig) => void;
  onSave?: () => void;
  showSaveButton?: boolean;
}

const QUICK_PALETTE = [
  '#DC2626', '#2563EB', '#16A34A', '#EAB308', '#FFFFFF', '#111827',
  '#FFD700', '#7C3AED', '#EA580C', '#0EA5E9', '#831843', '#059669',
];

const CURATED_PAIRS: Array<[string, string, string]> = [
  ['#DC2626', '#1F2937', '#FFD700'],
  ['#2563EB', '#FFFFFF', '#DC2626'],
  ['#EAB308', '#16A34A', '#FFFFFF'],
  ['#111827', '#FFFFFF', '#DC2626'],
  ['#16A34A', '#FFFFFF', '#EAB308'],
  ['#7C3AED', '#EAB308', '#FFFFFF'],
  ['#EA580C', '#111827', '#FFFFFF'],
  ['#0EA5E9', '#FFFFFF', '#111827'],
];

const SHAPE_LABELS: Record<ShieldShape, string> = {
  classic: 'Clássico', rounded: 'Redondo', pointed: 'Pontudo', circle: 'Círculo',
  pentagon: 'Pentágono', gothic: 'Gótico', hexagon: 'Hexágono', 'diamond-shield': 'Diamante',
  badge: 'Badge', crest: 'Brasão',
};

const LAYOUT_PATTERNS: ShieldPattern[] = ['solid', 'split', 'stripes', 'diagonal', 'shield-band', 'quarters'];

const ANIMAL_ICONS: ShieldIcon[] = ['lion', 'eagle-icon', 'wolf', 'tiger', 'bear', 'horse', 'dragon', 'phoenix', 'snake', 'elephant', 'rhino', 'panther', 'deer', 'bull', 'griffin'];
const SYMBOL_ICONS: ShieldIcon[] = ['star', 'double-star', 'triple-star', 'crown-icon', 'sword', 'crossed-swords', 'laurel', 'tower', 'castle', 'wing', 'lightning', 'fleur-de-lis', 'cross-pattee', 'crescent-moon', 'sun-burst', 'axe', 'trident', 'anchor', 'flame-icon', 'diamond-icon', 'shield-icon', 'compass', 'ball', 'trophy', 'boot'];
const LETTER_ICONS: ShieldIcon[] = ['letter-A', 'letter-B', 'letter-C', 'letter-F', 'letter-M', 'letter-R', 'letter-S'];

export function defaultShieldConfig(overrides: Partial<ShieldConfig> = {}): ShieldConfig {
  return {
    shape: 'classic',
    pattern: 'solid',
    icon: 'star',
    primaryColor: '#2563EB',
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

export function CrestBuilder({ value, onChange, onSave, showSaveButton = true }: Props) {
  const [activeTab, setActiveTab] = useState('shape');
  const [iconCategory, setIconCategory] = useState<'animals' | 'symbols' | 'letters'>('animals');

  const update = (patch: Partial<ShieldConfig>) => onChange({ ...value, ...patch });

  const randomize = () => {
    const [p, s, d] = CURATED_PAIRS[Math.floor(Math.random() * CURATED_PAIRS.length)];
    const allIcons = [...ANIMAL_ICONS, ...SYMBOL_ICONS];
    update({
      shape: shieldShapes[Math.floor(Math.random() * shieldShapes.length)],
      pattern: LAYOUT_PATTERNS[Math.floor(Math.random() * LAYOUT_PATTERNS.length)],
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

  const iconList = useMemo(() => {
    if (iconCategory === 'animals') return ANIMAL_ICONS;
    if (iconCategory === 'letters') return LETTER_ICONS;
    return SYMBOL_ICONS;
  }, [iconCategory]);

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      {/* PREVIEW PANEL */}
      <div className="space-y-3">
        <div
          className="relative rounded-xl border border-border p-4 flex items-center justify-center aspect-square overflow-hidden"
          style={{
            backgroundImage:
              'linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          }}
        >
          <div className="drop-shadow-2xl">
            <ShieldCrest
              primaryColor={value.primaryColor}
              secondaryColor={value.secondaryColor}
              detailColor={value.detailColor}
              pattern={value.pattern}
              shape={value.shape}
              icon={value.icon}
              size={200}
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={randomize} className="flex-1 gap-1.5">
            <Shuffle className="h-3.5 w-3.5" /> Aleatório
          </Button>
          {showSaveButton && onSave && (
            <Button size="sm" onClick={onSave} className="flex-1 gap-1.5">
              <Save className="h-3.5 w-3.5" /> Salvar
            </Button>
          )}
        </div>
      </div>

      {/* TABS PANEL */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-6 h-auto w-full">
          <TabsTrigger value="shape" className="flex-col gap-0.5 py-1.5 text-[10px]"><Shield className="h-3.5 w-3.5" />Forma</TabsTrigger>
          <TabsTrigger value="colors" className="flex-col gap-0.5 py-1.5 text-[10px]"><Palette className="h-3.5 w-3.5" />Cores</TabsTrigger>
          <TabsTrigger value="symbol" className="flex-col gap-0.5 py-1.5 text-[10px]"><Sparkles className="h-3.5 w-3.5" />Símbolo</TabsTrigger>
          <TabsTrigger value="extras" className="flex-col gap-0.5 py-1.5 text-[10px]"><Crown className="h-3.5 w-3.5" />Extras</TabsTrigger>
          <TabsTrigger value="layout" className="flex-col gap-0.5 py-1.5 text-[10px]"><Layers className="h-3.5 w-3.5" />Layout</TabsTrigger>
          <TabsTrigger value="adjust" className="flex-col gap-0.5 py-1.5 text-[10px]"><Settings2 className="h-3.5 w-3.5" />Ajustes</TabsTrigger>
        </TabsList>

        {/* SHAPE TAB */}
        <TabsContent value="shape" className="mt-3">
          <ScrollArea className="h-[280px] pr-2">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {shieldShapes.map(shape => (
                <button
                  key={shape}
                  onClick={() => update({ shape })}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105',
                    value.shape === shape ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
                  )}
                >
                  <ShieldCrest primaryColor={value.primaryColor} secondaryColor={value.secondaryColor} detailColor={value.detailColor} pattern="solid" shape={shape} size={48} />
                  <span className="text-[9px] font-medium text-muted-foreground">{SHAPE_LABELS[shape]}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* COLORS TAB */}
        <TabsContent value="colors" className="mt-3 space-y-3">
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1.5 block">Paletas Sugeridas</Label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {CURATED_PAIRS.map(([p, s, d], i) => (
                <button
                  key={i}
                  onClick={() => update({ primaryColor: p, secondaryColor: s, detailColor: d, borderColor: d })}
                  className="h-9 rounded-md border-2 border-border hover:border-primary/50 overflow-hidden flex transition-all hover:scale-105"
                >
                  <div className="flex-1" style={{ backgroundColor: p }} />
                  <div className="flex-1" style={{ backgroundColor: s }} />
                  <div className="w-2" style={{ backgroundColor: d }} />
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
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
                  <span className="text-[10px] font-mono text-muted-foreground uppercase truncate">{value[key]}</span>
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
                  className="w-6 h-6 rounded-full border-2 border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* SYMBOL TAB */}
        <TabsContent value="symbol" className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 p-0.5 bg-muted rounded-md">
              {(['animals', 'symbols', 'letters'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setIconCategory(c)}
                  className={cn(
                    'px-2.5 py-1 rounded text-[10px] font-medium transition-colors',
                    iconCategory === c ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {c === 'animals' ? '🐺 Animais' : c === 'symbols' ? '✨ Símbolos' : '🔤 Letras'}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              variant={value.iconMirror ? 'default' : 'outline'}
              onClick={() => update({ iconMirror: !value.iconMirror })}
              className="gap-1 h-7 text-[10px]"
            >
              <FlipHorizontal className="h-3 w-3" /> Espelhar
            </Button>
          </div>

          <ScrollArea className="h-[240px] pr-2">
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              <button
                onClick={() => update({ icon: 'none' })}
                className={cn(
                  'aspect-square rounded-lg border-2 transition-all flex items-center justify-center text-[10px] text-muted-foreground',
                  value.icon === 'none' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                )}
              >
                ∅ Nenhum
              </button>
              {iconList.map(ic => (
                <button
                  key={ic}
                  onClick={() => update({ icon: ic })}
                  title={shieldIconLabels[ic]}
                  className={cn(
                    'aspect-square rounded-lg border-2 transition-all hover:scale-105 p-1 flex items-center justify-center',
                    value.icon === ic ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
                  )}
                >
                  <ShieldCrest primaryColor={value.primaryColor} secondaryColor={value.secondaryColor} detailColor={value.detailColor} pattern="solid" shape={value.shape} icon={ic} size={42} />
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* EXTRAS TAB */}
        <TabsContent value="extras" className="mt-3 space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Coroa Real</span>
            </div>
            <Switch checked={!!value.showCrown} onCheckedChange={c => update({ showCrown: c })} />
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <span className="text-base">🌿</span>
              <span className="text-sm font-medium">Folhas de Louro</span>
            </div>
            <Switch checked={!!value.showLaurels} onCheckedChange={c => update({ showLaurels: c })} />
          </div>

          <div className="space-y-1.5 p-2.5 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Estrelas no topo</Label>
              <span className="text-xs font-mono text-muted-foreground">{value.topStars || 0}</span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => update({ topStars: n as 0 | 1 | 2 | 3 })}
                  className={cn(
                    'flex-1 h-8 rounded border-2 text-xs transition-all',
                    (value.topStars || 0) === n ? 'border-primary bg-primary/5 font-bold' : 'border-border hover:border-primary/40'
                  )}
                >
                  {n === 0 ? '—' : '★'.repeat(n)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 p-2.5 rounded-lg border border-border">
            <Label className="text-sm font-medium">Faixa com Texto</Label>
            <Input
              value={value.bannerText || ''}
              onChange={e => update({ bannerText: e.target.value.slice(0, 14) })}
              placeholder="Ex: SINCE 1903"
              maxLength={14}
              className="h-8 text-xs"
            />
            <p className="text-[10px] text-muted-foreground">Deixe vazio para esconder. Máx. 14 caracteres.</p>
          </div>
        </TabsContent>

        {/* LAYOUT TAB */}
        <TabsContent value="layout" className="mt-3">
          <ScrollArea className="h-[280px] pr-2">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {shieldPatterns.map(p => (
                <button
                  key={p}
                  onClick={() => update({ pattern: p })}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105',
                    value.pattern === p ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
                  )}
                >
                  <ShieldCrest primaryColor={value.primaryColor} secondaryColor={value.secondaryColor} detailColor={value.detailColor} pattern={p} shape={value.shape} size={44} />
                  <span className="text-[8px] font-medium text-muted-foreground capitalize">{p.replace('-', ' ')}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ADJUSTMENTS TAB */}
        <TabsContent value="adjust" className="mt-3 space-y-3">
          {[
            { label: 'Tamanho do símbolo', key: 'iconScale' as const, min: 0.5, max: 1.5, step: 0.05, format: (v: number) => `${v.toFixed(2)}x` },
            { label: 'Posição X', key: 'iconOffsetX' as const, min: -30, max: 30, step: 1, format: (v: number) => `${v}px` },
            { label: 'Posição Y', key: 'iconOffsetY' as const, min: -30, max: 30, step: 1, format: (v: number) => `${v}px` },
            { label: 'Rotação', key: 'iconRotation' as const, min: -180, max: 180, step: 5, format: (v: number) => `${v}°` },
            { label: 'Opacidade', key: 'iconOpacity' as const, min: 0.2, max: 1, step: 0.05, format: (v: number) => `${Math.round(v * 100)}%` },
            { label: 'Espessura da borda', key: 'borderWidth' as const, min: 0, max: 8, step: 0.5, format: (v: number) => `${v}px` },
          ].map(({ label, key, min, max, step, format }) => (
            <div key={key} className="space-y-1.5 p-2.5 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">{label}</Label>
                <span className="text-[10px] font-mono text-muted-foreground">{format((value[key] as number) ?? 0)}</span>
              </div>
              <Slider
                min={min}
                max={max}
                step={step}
                value={[(value[key] as number) ?? 0]}
                onValueChange={([v]) => update({ [key]: v })}
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => update({ iconScale: 1, iconOffsetX: 0, iconOffsetY: 0, iconRotation: 0, iconOpacity: 1, borderWidth: 3 })}
          >
            🔄 Resetar Ajustes
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
