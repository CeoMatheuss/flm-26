import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shirt, Palette, Save, Eye, Sparkles, ShieldCheck } from 'lucide-react';
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

function ShirtPreview({ kit }: { kit: UniformKit }) {
  const renderPattern = () => {
    switch (kit.shirtPattern) {
      case 'stripes':
        return (
          <>
            <rect x="20" y="10" width="60" height="65" rx="3" fill={kit.shirtColor} />
            {[28, 40, 52, 64].map(x => (
              <rect key={x} x={x} y="10" width="5" height="65" fill={kit.shirtSecondaryColor} />
            ))}
          </>
        );
      case 'hoops':
        return (
          <>
            <rect x="20" y="10" width="60" height="65" rx="3" fill={kit.shirtColor} />
            {[18, 30, 42, 54].map(y => (
              <rect key={y} x="20" y={y} width="60" height="6" fill={kit.shirtSecondaryColor} />
            ))}
          </>
        );
      case 'halves':
        return (
          <>
            <rect x="20" y="10" width="30" height="65" fill={kit.shirtColor} />
            <rect x="50" y="10" width="30" height="65" fill={kit.shirtSecondaryColor} />
          </>
        );
      case 'diagonal':
        return (
          <>
            <rect x="20" y="10" width="60" height="65" rx="3" fill={kit.shirtColor} />
            <polygon points="20,10 80,50 80,75 20,35" fill={kit.shirtSecondaryColor} opacity="0.7" />
          </>
        );
      case 'pinstripes':
        return (
          <>
            <rect x="20" y="10" width="60" height="65" rx="3" fill={kit.shirtColor} />
            {[25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75].map(x => (
              <rect key={x} x={x} y="10" width="1" height="65" fill={kit.shirtSecondaryColor} opacity="0.5" />
            ))}
          </>
        );
      case 'gradient':
        return (
          <>
            <defs>
              <linearGradient id={`grad-${kit.name}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={kit.shirtColor} />
                <stop offset="100%" stopColor={kit.shirtSecondaryColor} />
              </linearGradient>
            </defs>
            <rect x="20" y="10" width="60" height="65" rx="3" fill={`url(#grad-${kit.name})`} />
          </>
        );
      case 'sleeves':
        return (
          <>
            <rect x="20" y="10" width="60" height="65" rx="3" fill={kit.shirtColor} />
            <rect x="10" y="12" width="15" height="25" rx="3" fill={kit.shirtSecondaryColor} />
            <rect x="75" y="12" width="15" height="25" rx="3" fill={kit.shirtSecondaryColor} />
          </>
        );
      default:
        return <rect x="20" y="10" width="60" height="65" rx="3" fill={kit.shirtColor} />;
    }
  };

  return (
    <svg viewBox="0 0 100 120" className="w-full h-full">
      {/* Sleeves */}
      <rect x="10" y="12" width="15" height={kit.sleeveStyle === 'long' ? '40' : '25'} rx="3" fill={kit.shirtPattern === 'sleeves' ? kit.shirtSecondaryColor : kit.shirtColor} />
      <rect x="75" y="12" width="15" height={kit.sleeveStyle === 'long' ? '40' : '25'} rx="3" fill={kit.shirtPattern === 'sleeves' ? kit.shirtSecondaryColor : kit.shirtColor} />
      {/* Body */}
      {renderPattern()}
      {/* Collar */}
      {kit.collarStyle === 'v-neck' && <polygon points="42,10 50,22 58,10" fill={kit.shirtSecondaryColor} />}
      {kit.collarStyle === 'round' && <ellipse cx="50" cy="12" rx="10" ry="4" fill={kit.shirtSecondaryColor} />}
      {kit.collarStyle === 'polo' && (
        <>
          <rect x="40" y="8" width="20" height="8" rx="2" fill={kit.shirtSecondaryColor} />
          <rect x="40" y="8" width="20" height="3" rx="1" fill={kit.shirtSecondaryColor} opacity="0.7" />
        </>
      )}
      {kit.collarStyle === 'henley' && (
        <>
          <rect x="46" y="10" width="8" height="12" rx="1" fill={kit.shirtSecondaryColor} />
          <circle cx="50" cy="16" r="1" fill={kit.shirtColor} />
          <circle cx="50" cy="20" r="1" fill={kit.shirtColor} />
        </>
      )}
      {/* Number */}
      <text x="50" y="52" textAnchor="middle" fontSize="18" fontWeight="bold" fill={kit.numberColor} fontFamily="monospace">10</text>
      {/* Shorts */}
      <rect x="28" y="78" width="20" height="20" rx="3" fill={kit.shortsColor} />
      <rect x="52" y="78" width="20" height="20" rx="3" fill={kit.shortsColor} />
      {/* Socks */}
      <rect x="30" y="100" width="14" height="16" rx="2" fill={kit.socksColor} />
      <rect x="56" y="100" width="14" height="16" rx="2" fill={kit.socksColor} />
      {/* Shoes */}
      <rect x="28" y="114" width="18" height="5" rx="2" fill="#333" />
      <rect x="54" y="114" width="18" height="5" rx="2" fill="#333" />
    </svg>
  );
}

function KitEditor({ kit, onChange }: { kit: UniformKit; onChange: (kit: UniformKit) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Cor da Camisa</Label>
          <div className="flex gap-1.5 items-center">
            <input type="color" value={kit.shirtColor} onChange={e => onChange({ ...kit, shirtColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
            <Input value={kit.shirtColor} onChange={e => onChange({ ...kit, shirtColor: e.target.value })} className="h-7 text-[10px] font-mono flex-1" />
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Cor Secundária</Label>
          <div className="flex gap-1.5 items-center">
            <input type="color" value={kit.shirtSecondaryColor} onChange={e => onChange({ ...kit, shirtSecondaryColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
            <Input value={kit.shirtSecondaryColor} onChange={e => onChange({ ...kit, shirtSecondaryColor: e.target.value })} className="h-7 text-[10px] font-mono flex-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px]">Calção</Label>
          <div className="flex gap-1 items-center">
            <input type="color" value={kit.shortsColor} onChange={e => onChange({ ...kit, shortsColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0" />
            <Input value={kit.shortsColor} onChange={e => onChange({ ...kit, shortsColor: e.target.value })} className="h-7 text-[10px] font-mono flex-1" />
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Meião</Label>
          <div className="flex gap-1 items-center">
            <input type="color" value={kit.socksColor} onChange={e => onChange({ ...kit, socksColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0" />
            <Input value={kit.socksColor} onChange={e => onChange({ ...kit, socksColor: e.target.value })} className="h-7 text-[10px] font-mono flex-1" />
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Número</Label>
          <div className="flex gap-1 items-center">
            <input type="color" value={kit.numberColor} onChange={e => onChange({ ...kit, numberColor: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0" />
            <Input value={kit.numberColor} onChange={e => onChange({ ...kit, numberColor: e.target.value })} className="h-7 text-[10px] font-mono flex-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px]">Padrão</Label>
          <Select value={kit.shirtPattern} onValueChange={v => onChange({ ...kit, shirtPattern: v as UniformKit['shirtPattern'] })}>
            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(patternLabels).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Gola</Label>
          <Select value={kit.collarStyle} onValueChange={v => onChange({ ...kit, collarStyle: v as UniformKit['collarStyle'] })}>
            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(collarLabels).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[10px]">Manga</Label>
          <Select value={kit.sleeveStyle} onValueChange={v => onChange({ ...kit, sleeveStyle: v as UniformKit['sleeveStyle'] })}>
            <SelectTrigger className="h-7 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="short" className="text-xs">Curta</SelectItem>
              <SelectItem value="long" className="text-xs">Longa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function UniformsTab({ primaryColor, secondaryColor, uniforms, onSave }: Props) {
  const [activeKit, setActiveKit] = useState<'home' | 'away' | 'third' | 'goalkeeper'>('home');
  const [kits, setKits] = useState<UniformsData>(uniforms || {
    home: { ...defaultHome, shirtColor: primaryColor || defaultHome.shirtColor, shirtSecondaryColor: secondaryColor || defaultHome.shirtSecondaryColor },
    away: defaultAway,
    third: defaultThird,
    goalkeeper: defaultGoalkeeper,
  });

  const kitTabs = [
    { key: 'home' as const, label: '🏠 Titular', color: 'text-emerald-400' },
    { key: 'away' as const, label: '✈️ Visitante', color: 'text-blue-400' },
    { key: 'third' as const, label: '⭐ Alternativo', color: 'text-purple-400' },
    { key: 'goalkeeper' as const, label: '🧤 Goleiro', color: 'text-yellow-400' },
  ];

  const currentKit = kits[activeKit];

  const handleKitChange = (updated: UniformKit) => {
    setKits(prev => ({ ...prev, [activeKit]: updated }));
  };

  const handleSave = () => {
    onSave(kits);
    toast.success('🎽 Uniformes salvos com sucesso!');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <Shirt className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-primary">🎽 Uniformes Personalizados</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Crie uniformes únicos para titular, visitante, alternativo e goleiro</p>
          </div>
          <Button size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={handleSave}>
            <Save className="h-3 w-3" /> Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Kit Selector */}
      <div className="flex gap-1.5">
        {kitTabs.map(tab => (
          <Button
            key={tab.key}
            variant={activeKit === tab.key ? 'default' : 'outline'}
            size="sm"
            className={`flex-1 text-[10px] sm:text-xs h-8 ${activeKit === tab.key ? '' : 'opacity-70'}`}
            onClick={() => setActiveKit(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Preview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" /> Pré-visualização
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-40 h-52 sm:w-48 sm:h-64">
              <ShirtPreview kit={currentKit} />
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" /> Personalizar — {currentKit.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KitEditor kit={currentKit} onChange={handleKitChange} />
          </CardContent>
        </Card>
      </div>

      {/* All Kits Overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Todos os Uniformes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {kitTabs.map(tab => (
              <div
                key={tab.key}
                className={`cursor-pointer rounded-lg p-2 border transition-colors ${activeKit === tab.key ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/30'}`}
                onClick={() => setActiveKit(tab.key)}
              >
                <div className="w-full h-28 sm:h-32">
                  <ShirtPreview kit={kits[tab.key]} />
                </div>
                <p className="text-[9px] sm:text-[10px] text-center mt-1 font-semibold">{tab.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preset Templates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Templates Rápidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Clássico', shirt: '#DC2626', sec: '#000000', pattern: 'stripes' as const },
              { label: 'Seleção', shirt: '#EAB308', sec: '#22C55E', pattern: 'solid' as const },
              { label: 'Europeu', shirt: '#2563EB', sec: '#FFFFFF', pattern: 'halves' as const },
              { label: 'Moderno', shirt: '#8B5CF6', sec: '#EC4899', pattern: 'gradient' as const },
              { label: 'Retrô', shirt: '#F97316', sec: '#000000', pattern: 'hoops' as const },
              { label: 'Elegante', shirt: '#111827', sec: '#D4AF37', pattern: 'pinstripes' as const },
            ].map(preset => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                className="h-auto py-2 flex flex-col gap-1 text-[9px]"
                onClick={() => handleKitChange({
                  ...currentKit,
                  shirtColor: preset.shirt,
                  shirtSecondaryColor: preset.sec,
                  shirtPattern: preset.pattern,
                })}
              >
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: preset.shirt }} />
                  <div className="w-3 h-3 rounded-full border border-border/50" style={{ backgroundColor: preset.sec }} />
                </div>
                {preset.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
