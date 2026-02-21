import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Shield, Palette, Shirt, ChevronDown, ChevronUp, Globe, Sparkles } from 'lucide-react';
import { ShieldCrest, shieldPatterns, ShieldPattern, shieldShapes, ShieldShape, shieldIcons, ShieldIcon, shieldIconLabels } from './ShieldCrest';
import flmLogo from '@/assets/flm26-logo.png';

export interface ClubConfig {
  name: string;
  stadiumName: string;
  primaryColor: string;
  secondaryColor: string;
  detailColor: string;
  logoUrl: string;
  shieldPattern?: string;
  shieldShape?: string;
  shieldIcon?: string;
  country: string;
}

interface Props {
  userId: string;
  onComplete: (config: ClubConfig) => void;
}

const presetColors = [
  { primary: '#DC2626', secondary: '#1F2937', detail: '#FFD700' },
  { primary: '#2563EB', secondary: '#FFFFFF', detail: '#DC2626' },
  { primary: '#EAB308', secondary: '#16A34A', detail: '#FFFFFF' },
  { primary: '#111827', secondary: '#FFFFFF', detail: '#DC2626' },
  { primary: '#16A34A', secondary: '#FFFFFF', detail: '#EAB308' },
  { primary: '#7C3AED', secondary: '#EAB308', detail: '#FFFFFF' },
  { primary: '#EA580C', secondary: '#111827', detail: '#FFFFFF' },
  { primary: '#DB2777', secondary: '#2563EB', detail: '#FFD700' },
  { primary: '#0EA5E9', secondary: '#FFFFFF', detail: '#111827' },
  { primary: '#831843', secondary: '#FFD700', detail: '#FFFFFF' },
  { primary: '#059669', secondary: '#111827', detail: '#FFD700' },
  { primary: '#4338CA', secondary: '#F59E0B', detail: '#FFFFFF' },
];

const countries = [
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'ES', name: 'Espanha', flag: '🇪🇸' },
  { code: 'FR', name: 'França', flag: '🇫🇷' },
  { code: 'IT', name: 'Itália', flag: '🇮🇹' },
  { code: 'DE', name: 'Alemanha', flag: '🇩🇪' },
  { code: 'EN', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'NL', name: 'Holanda', flag: '🇳🇱' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'CO', name: 'Colômbia', flag: '🇨🇴' },
  { code: 'JP', name: 'Japão', flag: '🇯🇵' },
  { code: 'US', name: 'EUA', flag: '🇺🇸' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'UY', name: 'Uruguai', flag: '🇺🇾' },
  { code: 'TR', name: 'Turquia', flag: '🇹🇷' },
  { code: 'KR', name: 'Coreia do Sul', flag: '🇰🇷' },
  { code: 'SA', name: 'Arábia Saudita', flag: '🇸🇦' },
];

function KitPreview({ shirtColor, secondaryColor, detailColor, pattern, label, size = 64 }: {
  shirtColor: string; secondaryColor: string; detailColor: string;
  pattern: 'solid' | 'stripes' | 'halves'; label: string; size?: number;
}) {
  const dim = size;
  const renderShirtPattern = () => {
    switch (pattern) {
      case 'stripes':
        return [28, 36, 44, 52, 60, 68].map(x => (
          <rect key={x} x={x} y="6" width="4" height="56" fill={secondaryColor} opacity="0.5" />
        ));
      case 'halves':
        return <rect x="50" y="6" width="30" height="56" fill={secondaryColor} opacity="0.6" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div style={{ width: dim, height: dim * 1.2 }} className="flex-shrink-0">
        <svg viewBox="0 0 100 120" className="w-full h-full">
          <rect x="6" y="8" width="14" height="22" rx="2" fill={secondaryColor} />
          <rect x="80" y="8" width="14" height="22" rx="2" fill={secondaryColor} />
          <rect x="20" y="6" width="60" height="56" rx="2" fill={shirtColor} />
          {renderShirtPattern()}
          <polygon points="44,6 50,14 56,6" fill={detailColor} />
          <text x="50" y="44" textAnchor="middle" fontSize="14" fontWeight="bold" fill={detailColor} fontFamily="monospace">10</text>
          <rect x="28" y="64" width="20" height="16" rx="2" fill={secondaryColor} />
          <rect x="52" y="64" width="20" height="16" rx="2" fill={secondaryColor} />
          <rect x="30" y="82" width="16" height="18" rx="2" fill={shirtColor} />
          <rect x="54" y="82" width="16" height="18" rx="2" fill={shirtColor} />
          <rect x="30" y="100" width="16" height="4" rx="1" fill="#222" />
          <rect x="54" y="100" width="16" height="4" rx="1" fill="#222" />
        </svg>
      </div>
      <span className="text-[8px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export function ClubCreation({ userId, onComplete }: Props) {
  const [clubName, setClubName] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [detailColor, setDetailColor] = useState('#DC2626');
  const [selectedPattern, setSelectedPattern] = useState<ShieldPattern>('classic');
  const [selectedShape, setSelectedShape] = useState<ShieldShape>('classic');
  const [selectedIcon, setSelectedIcon] = useState<ShieldIcon>('star');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [useCustomLogo, setUseCustomLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [country, setCountry] = useState('BR');
  const [countryOpen, setCountryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find(c => c.code === country);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 2MB)'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens são permitidas'); return; }
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/logo.${ext}`;
    const { error } = await supabase.storage.from('club-logos').upload(path, file, { upsert: true });
    if (error) { toast.error('Erro ao enviar logo'); setUploading(false); return; }
    const { data } = supabase.storage.from('club-logos').getPublicUrl(path);
    setCustomLogoUrl(data.publicUrl);
    setUseCustomLogo(true);
    toast.success('Logo enviado!');
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!clubName.trim()) { toast.error('Digite o nome do clube'); return; }
    if (clubName.trim().length > 30) { toast.error('Nome do clube muito longo (máx 30 caracteres)'); return; }
    if (stadiumName.trim().length > 40) { toast.error('Nome do estádio muito longo (máx 40 caracteres)'); return; }
    onComplete({
      name: clubName.trim(),
      stadiumName: stadiumName.trim() || 'Estádio Municipal',
      primaryColor, secondaryColor, detailColor,
      logoUrl: useCustomLogo ? customLogoUrl : selectedPattern,
      shieldPattern: useCustomLogo ? undefined : selectedPattern,
      shieldShape: useCustomLogo ? undefined : selectedShape,
      shieldIcon: useCustomLogo ? undefined : selectedIcon,
      country,
    });
  };

  const shapeNames: Record<ShieldShape, string> = {
    classic: 'Clássico', rounded: 'Redondo', pointed: 'Pontudo', circle: 'Círculo',
    pentagon: 'Pentágono', gothic: 'Gótico', hexagon: 'Hexágono', 'diamond-shield': 'Diamante',
    badge: 'Badge', crest: 'Brasão',
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4">
      <Card className="w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <CardHeader className="text-center pb-2">
          <img src={flmLogo} alt="FLM 26" className="w-12 h-12 mx-auto mb-1" />
          <CardTitle className="text-lg sm:text-xl">Criar Seu Clube</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Configure a identidade do seu time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Club Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Shield className="h-3 w-3" /> Nome do Clube</Label>
            <Input placeholder="Ex: Atlético Estrela" value={clubName} onChange={e => setClubName(e.target.value)} maxLength={30} className="h-9 text-sm" />
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Globe className="h-3 w-3" /> País do Clube</Label>
            <button
              onClick={() => setCountryOpen(!countryOpen)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background flex items-center justify-between hover:border-primary/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <span className="text-lg">{selectedCountry?.flag}</span>
                <span className="font-medium">{selectedCountry?.name}</span>
              </span>
              {countryOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {countryOpen && (
              <div className="border border-border rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <ScrollArea className="h-[180px]">
                  <div className="p-1 space-y-0.5">
                    {countries.map(c => (
                      <button
                        key={c.code}
                        onClick={() => { setCountry(c.code); setCountryOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                          country === c.code ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/50'
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span>{c.name}</span>
                        {country === c.code && <span className="ml-auto text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Stadium Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">🏟️ Nome do Estádio</Label>
            <Input placeholder="Ex: Arena do Dragão" value={stadiumName} onChange={e => setStadiumName(e.target.value)} maxLength={40} className="h-9 text-sm" />
          </div>

          {/* Colors */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Palette className="h-3 w-3" /> Cores do Clube</Label>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {presetColors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => { setPrimaryColor(c.primary); setSecondaryColor(c.secondary); setDetailColor(c.detail); }}
                    className={`shrink-0 h-10 w-16 rounded-lg border-2 transition-all flex overflow-hidden ${primaryColor === c.primary && secondaryColor === c.secondary ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border hover:border-primary/50'}`}
                  >
                    <div className="flex-1" style={{ backgroundColor: c.primary }} />
                    <div className="flex-1" style={{ backgroundColor: c.secondary }} />
                    <div className="w-2" style={{ backgroundColor: c.detail }} />
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Principal</Label>
                <div className="flex items-center gap-1">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
                  <div className="flex-1 h-5 rounded" style={{ backgroundColor: primaryColor }} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Secundária</Label>
                <div className="flex items-center gap-1">
                  <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
                  <div className="flex-1 h-5 rounded" style={{ backgroundColor: secondaryColor }} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Detalhes</Label>
                <div className="flex items-center gap-1">
                  <input type="color" value={detailColor} onChange={e => setDetailColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0" />
                  <div className="flex-1 h-5 rounded" style={{ backgroundColor: detailColor }} />
                </div>
              </div>
            </div>
          </div>

          {/* Shield Shape */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Shield className="h-3 w-3" /> Forma do Escudo</Label>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {shieldShapes.map(shape => (
                  <button
                    key={shape}
                    onClick={() => setSelectedShape(shape)}
                    className={`shrink-0 p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 min-w-[60px] ${selectedShape === shape ? 'border-primary ring-2 ring-primary/30 scale-105 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  >
                    <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern="classic" shape={shape} size={36} />
                    <span className="text-[8px] font-medium text-muted-foreground">{shapeNames[shape]}</span>
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Shield Pattern */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Palette className="h-3 w-3" /> Padrão do Escudo</Label>
            <div className="grid grid-cols-6 sm:grid-cols-13 gap-1">
              {shieldPatterns.map(pattern => (
                <button
                  key={pattern}
                  onClick={() => { setSelectedPattern(pattern); setUseCustomLogo(false); }}
                  className={`p-0.5 rounded-lg border-2 transition-all flex items-center justify-center aspect-square ${selectedPattern === pattern && !useCustomLogo ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border hover:border-primary/50'}`}
                >
                  <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern={pattern} shape={selectedShape} icon={selectedIcon} size={28} />
                </button>
              ))}
            </div>
          </div>

          {/* Shield Icon */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Ícone do Escudo</Label>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-1.5 pb-2">
                {shieldIcons.map(icon => (
                  <button
                    key={icon}
                    onClick={() => { setSelectedIcon(icon); setUseCustomLogo(false); }}
                    className={`shrink-0 p-1.5 rounded-lg border-2 transition-all flex flex-col items-center gap-0.5 min-w-[52px] ${selectedIcon === icon && !useCustomLogo ? 'border-primary ring-2 ring-primary/30 scale-105 bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  >
                    <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern="classic" shape={selectedShape} icon={icon} size={32} />
                    <span className="text-[7px] font-medium text-muted-foreground leading-tight">{shieldIconLabels[icon].split(' ')[0]}</span>
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Upload Logo */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs h-8 gap-1.5">
              <Upload className="h-3 w-3" />
              {uploading ? 'Enviando...' : 'Upload Logo Personalizado'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {useCustomLogo && customLogoUrl && (
              <div className="flex items-center gap-2">
                <img src={customLogoUrl} alt="Logo" className="w-8 h-8 rounded object-cover border border-primary" />
                <span className="text-[10px] text-emerald-500 font-medium">✓ Logo personalizado</span>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="border border-border rounded-xl p-4 space-y-3" style={{ background: `linear-gradient(135deg, ${primaryColor}18, ${secondaryColor}18)` }}>
            <p className="text-[10px] font-semibold text-center text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Shirt className="h-3 w-3" /> Prévia do Clube
            </p>
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <div className="flex flex-col items-center gap-1">
                {useCustomLogo && customLogoUrl ? (
                  <img src={customLogoUrl} alt="Logo" className="w-[68px] h-[68px] rounded-lg object-cover" />
                ) : (
                  <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern={selectedPattern} shape={selectedShape} icon={selectedIcon} size={68} />
                )}
                <span className="text-[8px] text-muted-foreground">Escudo</span>
              </div>
              <KitPreview shirtColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern="stripes" label="Uniforme 1" size={58} />
              <KitPreview shirtColor={secondaryColor} secondaryColor={primaryColor} detailColor={detailColor} pattern="solid" label="Uniforme 2" size={58} />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm sm:text-base" style={{ color: primaryColor }}>{clubName || 'Seu Clube'}</p>
              <p className="text-[10px] text-muted-foreground">
                {selectedCountry?.flag} {selectedCountry?.name} • 🏟️ {stadiumName || 'Estádio Municipal'}
              </p>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!clubName.trim()}>
            Criar Clube e Começar 🏆
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
