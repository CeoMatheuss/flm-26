import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shirt, Palette, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export interface UniformKit {
  name: string;
  shirtColor: string;
  shortsColor: string;
  socksColor: string;
  shirtPattern: 'solid' | 'stripes' | 'hoops' | 'halves' | 'diagonal' | 'pinstripes' | 'gradient' | 'sleeves';
  shirtSecondaryColor: string;
  numberColor: string;
  collarStyle: 'v-neck' | 'round' | 'polo' | 'henley';
  sleeveStyle: 'short' | 'long';
}

export interface UniformsData {
  home: UniformKit;
  away: UniformKit;
  third: UniformKit;
  goalkeeper: UniformKit;
}

const defaultHome: UniformKit = {
  name: 'Titular',
  shirtColor: '#2563EB',
  shortsColor: '#1E3A5F',
  socksColor: '#2563EB',
  shirtPattern: 'solid',
  shirtSecondaryColor: '#FFFFFF',
  numberColor: '#FFFFFF',
  collarStyle: 'v-neck',
  sleeveStyle: 'short',
};

const defaultAway: UniformKit = {
  name: 'Visitante',
  shirtColor: '#FFFFFF',
  shortsColor: '#1E3A5F',
  socksColor: '#FFFFFF',
  shirtPattern: 'solid',
  shirtSecondaryColor: '#2563EB',
  numberColor: '#2563EB',
  collarStyle: 'round',
  sleeveStyle: 'short',
};

const defaultThird: UniformKit = {
  name: 'Alternativo',
  shirtColor: '#DC2626',
  shortsColor: '#991B1B',
  socksColor: '#DC2626',
  shirtPattern: 'stripes',
  shirtSecondaryColor: '#000000',
  numberColor: '#FFFFFF',
  collarStyle: 'polo',
  sleeveStyle: 'short',
};

const defaultGoalkeeper: UniformKit = {
  name: 'Goleiro',
  shirtColor: '#22C55E',
  shortsColor: '#111111',
  socksColor: '#22C55E',
  shirtPattern: 'solid',
  shirtSecondaryColor: '#111111',
  numberColor: '#FFFFFF',
  collarStyle: 'round',
  sleeveStyle: 'long',
};

const patternLabels: Record<UniformKit['shirtPattern'], string> = {
  solid: 'Liso',
  stripes: 'Listras Verticais',
  hoops: 'Listras Horizontais',
  halves: 'Metade/Metade',
  diagonal: 'Faixa Diagonal',
  pinstripes: 'Risca de Giz',
  gradient: 'Degradê',
  sleeves: 'Mangas Coloridas',
};

const collarLabels: Record<UniformKit['collarStyle'], string> = {
  'v-neck': 'Gola V',
  'round': 'Gola Redonda',
  'polo': 'Gola Polo',
  'henley': 'Gola Henley',
};

interface Props {
  primaryColor?: string;
  secondaryColor?: string;
  uniforms?: UniformsData;
  onSave: (uniforms: UniformsData) => void;
}

function ShirtPreview({ kit, size = 'md' }: { kit: UniformKit; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-16 h-24' : size === 'lg' ? 'w-40 h-56' : 'w-28 h-40';

  const bodyPath = "M25,8 L20,12 L12,14 L12,38 L20,36 L25,75 L75,75 L80,36 L88,38 L88,14 L80,12 L75,8 Z";
  const leftSleeve = kit.sleeveStyle === 'long'
    ? "M12,14 L4,18 L4,48 L12,46 L12,38 Z"
    : "M12,14 L4,18 L4,32 L12,30 L12,38 Z";
  const rightSleeve = kit.sleeveStyle === 'long'
    ? "M88,14 L96,18 L96,48 L88,46 L88,38 Z"
    : "M88,14 L96,18 L96,32 L88,30 L88,38 Z";

  const patternId = `pat-${kit.name}-${size}`;

  const renderBodyFill = () => {
    switch (kit.shirtPattern) {
      case 'stripes':
        return (
          <>
            <path d={bodyPath} fill={kit.shirtColor} />
            {[30, 38, 46, 54, 62, 70].map(x => (
              <line key={x} x1={x} y1="8" x2={x} y2="75" stroke={kit.shirtSecondaryColor} strokeWidth="3" clipPath={`url(#clip-${patternId})`} />
            ))}
          </>
        );
      case 'hoops':
        return (
          <>
            <path d={bodyPath} fill={kit.shirtColor} />
            {[14, 22, 30, 38, 46, 54, 62, 70].map(y => (
              <line key={y} x1="12" y1={y} x2="88" y2={y} stroke={kit.shirtSecondaryColor} strokeWidth="3" clipPath={`url(#clip-${patternId})`} />
            ))}
          </>
        );
      case 'halves':
        return (
          <>
            <path d={bodyPath} fill={kit.shirtColor} />
            <rect x="50" y="0" width="50" height="80" fill={kit.shirtSecondaryColor} clipPath={`url(#clip-${patternId})`} />
          </>
        );
      case 'diagonal':
        return (
          <>
            <path d={bodyPath} fill={kit.shirtColor} />
            <polygon points="0,30 100,60 100,80 0,50" fill={kit.shirtSecondaryColor} opacity="0.7" clipPath={`url(#clip-${patternId})`} />
          </>
        );
      case 'pinstripes':
        return (
          <>
            <path d={bodyPath} fill={kit.shirtColor} />
            {Array.from({ length: 20 }, (_, i) => 20 + i * 3).map(x => (
              <line key={x} x1={x} y1="8" x2={x} y2="75" stroke={kit.shirtSecondaryColor} strokeWidth="0.8" opacity="0.5" clipPath={`url(#clip-${patternId})`} />
            ))}
          </>
        );
      case 'gradient':
        return (
          <>
            <defs>
              <linearGradient id={`grad-${patternId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={kit.shirtColor} />
                <stop offset="100%" stopColor={kit.shirtSecondaryColor} />
              </linearGradient>
            </defs>
            <path d={bodyPath} fill={`url(#grad-${patternId})`} />
          </>
        );
      case 'sleeves':
        return <path d={bodyPath} fill={kit.shirtColor} />;
      default:
        return <path d={bodyPath} fill={kit.shirtColor} />;
    }
  };

  const sleeveColor = kit.shirtPattern === 'sleeves' ? kit.shirtSecondaryColor : kit.shirtColor;

  return (
    <div className={sizeClass}>
      <svg viewBox="0 100" className="w-full h-full">
        <defs>
          <clipPath id={`clip-${patternId}`}>
            <path d={bodyPath} />
          </clipPath>
        </defs>
        {/* Sleeves */}
        <path d={leftSleeve} fill={sleeveColor} />
        <path d={rightSleeve} fill={sleeveColor} />
        {/* Body with pattern */}
        {renderBodyFill()}
        {/* Collar */}
        {kit.collarStyle === 'v-neck' && <polygon points="42,8 50,18 58,8" fill={kit.shirtSecondaryColor} />}
        {kit.collarStyle === 'round' && <ellipse cx="50" cy="9" rx="10" ry="3" fill={kit.shirtSecondaryColor} />}
        {kit.collarStyle === 'polo' && <rect x="40" y="6" width="20" height="6" rx="2" fill={kit.shirtSecondaryColor} />}
        {kit.collarStyle === 'henley' && (
          <>
            <rect x="46" y="8" width="8" height="10" rx="1" fill={kit.shirtSecondaryColor} />
            <circle cx="50" cy="12" r="1" fill={kit.shirtColor} />
            <circle cx="50" cy="16" r="1" fill={kit.shirtColor} />
          </>
        )}
        {/* Number */}
        <text x="50" y="48" textAnchor="middle" fontSize="16" fontWeight="bold" fill={kit.numberColor} fontFamily="monospace">10</text>
        {/* Shorts */}
        <rect x="30" y="77" width="18" height="14" rx="2" fill={kit.shortsColor} />
        <rect x="52" y="77" width="18" height="14" rx="2" fill={kit.shortsColor} />
        {/* Socks */}
        <rect x="32" y="92" width="12" height="8" rx="1" fill={kit.socksColor} />
        <rect x="56" y="92" width="12" height="8" rx="1" fill={kit.socksColor} />
      </svg>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-1.5">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-md cursor-pointer border-2 border-border/50 hover:border-primary/50 transition-colors"
          style={{ padding: 0 }}
        />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-7 text-[10px] font-mono flex-1 bg-background/50 border-0"
        />
      </div>
    </div>
  );
}

function KitEditor({ kit, onChange }: { kit: UniformKit; onChange: (kit: UniformKit) => void }) {
  return (
    <div className="space-y-4">
      {/* Colors Section */}
      <div>
        <p className="text-[10px] font-semibold text-primary mb-2 flex items-center gap-1">
          <Palette className="h-3 w-3" /> Cores
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ColorPicker label="Camisa" value={kit.shirtColor} onChange={v => onChange({ ...kit, shirtColor: v })} />
          <ColorPicker label="Secundária" value={kit.shirtSecondaryColor} onChange={v => onChange({ ...kit, shirtSecondaryColor: v })} />
          <ColorPicker label="Calção" value={kit.shortsColor} onChange={v => onChange({ ...kit, shortsColor: v })} />
          <ColorPicker label="Meião" value={kit.socksColor} onChange={v => onChange({ ...kit, socksColor: v })} />
          <ColorPicker label="Número" value={kit.numberColor} onChange={v => onChange({ ...kit, numberColor: v })} />
        </div>
      </div>

      {/* Style Section */}
      <div>
        <p className="text-[10px] font-semibold text-primary mb-2 flex items-center gap-1">
          <Shirt className="h-3 w-3" /> Estilo
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Padrão</Label>
            <Select value={kit.shirtPattern} onValueChange={v => onChange({ ...kit, shirtPattern: v as UniformKit['shirtPattern'] })}>
              <SelectTrigger className="h-8 text-[10px] bg-muted/30 border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(patternLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Gola</Label>
            <Select value={kit.collarStyle} onValueChange={v => onChange({ ...kit, collarStyle: v as UniformKit['collarStyle'] })}>
              <SelectTrigger className="h-8 text-[10px] bg-muted/30 border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(collarLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Manga</Label>
            <Select value={kit.sleeveStyle} onValueChange={v => onChange({ ...kit, sleeveStyle: v as UniformKit['sleeveStyle'] })}>
              <SelectTrigger className="h-8 text-[10px] bg-muted/30 border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short" className="text-xs">Curta</SelectItem>
                <SelectItem value="long" className="text-xs">Longa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

const kitTabs = [
  { key: 'home' as const, label: 'Titular', emoji: '🏠' },
  { key: 'away' as const, label: 'Visitante', emoji: '✈️' },
  { key: 'third' as const, label: 'Alternativo', emoji: '⭐' },
  { key: 'goalkeeper' as const, label: 'Goleiro', emoji: '🧤' },
];

const presets = [
  { label: 'Clássico', shirt: '#DC2626', sec: '#000000', pattern: 'stripes' as const },
  { label: 'Seleção', shirt: '#EAB308', sec: '#22C55E', pattern: 'solid' as const },
  { label: 'Europeu', shirt: '#2563EB', sec: '#FFFFFF', pattern: 'halves' as const },
  { label: 'Moderno', shirt: '#8B5CF6', sec: '#EC4899', pattern: 'gradient' as const },
  { label: 'Retrô', shirt: '#F97316', sec: '#000000', pattern: 'hoops' as const },
  { label: 'Elegante', shirt: '#111827', sec: '#D4AF37', pattern: 'pinstripes' as const },
];

export function UniformsTab({ primaryColor, secondaryColor, uniforms, onSave }: Props) {
  const [activeKit, setActiveKit] = useState<'home' | 'away' | 'third' | 'goalkeeper'>('home');
  const [kits, setKits] = useState<UniformsData>(uniforms || {
    home: { ...defaultHome, shirtColor: primaryColor || defaultHome.shirtColor, shirtSecondaryColor: secondaryColor || defaultHome.shirtSecondaryColor },
    away: defaultAway,
    third: defaultThird,
    goalkeeper: defaultGoalkeeper,
  });

  const currentKit = kits[activeKit];

  const handleKitChange = (updated: UniformKit) => {
    setKits(prev => ({ ...prev, [activeKit]: updated }));
  };

  const handleSave = () => {
    onSave(kits);
    toast.success('🎽 Uniformes salvos com sucesso!');
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Shirt className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">Uniformes</p>
            <p className="text-[10px] text-muted-foreground">Personalize seus 4 kits</p>
          </div>
        </div>
        <Button size="sm" className="h-8 px-4 text-xs gap-1.5 rounded-full" onClick={handleSave}>
          <Save className="h-3 w-3" /> Salvar
        </Button>
      </div>

      {/* Kit Selector Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {kitTabs.map(tab => (
          <button
            key={tab.key}
            className={`flex-1 py-2 px-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
              activeKit === tab.key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveKit(tab.key)}
          >
            <span className="block text-sm">{tab.emoji}</span>
            <span className="block mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content: Preview + Editor */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* Preview - takes 2 cols */}
        <Card className="sm:col-span-2 overflow-hidden border-0 bg-gradient-to-b from-muted/30 to-muted/10">
          <CardContent className="p-4 flex flex-col items-center justify-center min-h-[280px]">
            <ShirtPreview kit={currentKit} size="lg" />
            <p className="text-xs font-semibold mt-3">{currentKit.name}</p>
            <p className="text-[10px] text-muted-foreground">{patternLabels[currentKit.shirtPattern]} • {collarLabels[currentKit.collarStyle]}</p>
          </CardContent>
        </Card>

        {/* Editor - takes 3 cols */}
        <Card className="sm:col-span-3 border-0 bg-muted/10">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" /> Personalizar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <KitEditor kit={currentKit} onChange={handleKitChange} />
          </CardContent>
        </Card>
      </div>

      {/* Quick Templates */}
      <Card className="border-0 bg-muted/10">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Templates Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {presets.map(preset => (
              <button
                key={preset.label}
                className="group flex flex-col items-center gap-1.5 p-2 rounded-lg border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all"
                onClick={() => handleKitChange({
                  ...currentKit,
                  shirtColor: preset.shirt,
                  shirtSecondaryColor: preset.sec,
                  shirtPattern: preset.pattern,
                })}
              >
                <div className="flex gap-0.5">
                  <div className="w-4 h-4 rounded-full border-2 border-background shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: preset.shirt }} />
                  <div className="w-4 h-4 rounded-full border-2 border-background shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: preset.sec }} />
                </div>
                <span className="text-[9px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{preset.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* All Kits Mini Overview */}
      <div className="grid grid-cols-4 gap-2">
        {kitTabs.map(tab => (
          <button
            key={tab.key}
            className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
              activeKit === tab.key
                ? 'border-primary/50 bg-primary/5 shadow-sm'
                : 'border-border/30 hover:border-primary/30 hover:bg-muted/20'
            }`}
            onClick={() => setActiveKit(tab.key)}
          >
            <ShirtPreview kit={kits[tab.key]} size="sm" />
            <p className="text-[9px] font-semibold mt-1">{tab.emoji} {tab.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
