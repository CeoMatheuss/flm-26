import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Shield, Palette, Shirt } from 'lucide-react';
import { ShieldCrest, shieldPatterns, ShieldPattern, shieldShapes, ShieldShape } from './ShieldCrest';
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

function UniformPreview({ primary, secondary, detail, size = 80 }: { primary: string; secondary: string; detail: string; size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s * 1.2} viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
      {/* Shirt body */}
      <path d="M25 25 L15 35 L15 50 L25 45 L25 95 L75 95 L75 45 L85 50 L85 35 L75 25 L65 15 Q50 20 35 15 L25 25 Z" fill={primary} stroke={detail} strokeWidth="2" />
      {/* Sleeves detail */}
      <path d="M25 25 L15 35 L15 50 L25 45 Z" fill={secondary} opacity={0.6} />
      <path d="M75 25 L85 35 L85 50 L75 45 Z" fill={secondary} opacity={0.6} />
      {/* Collar */}
      <path d="M35 15 Q50 22 65 15 Q60 20 50 22 Q40 20 35 15" fill={detail} />
      {/* Center stripe */}
      <rect x="46" y="25" width="8" height="70" fill={secondary} opacity={0.3} rx="2" />
      {/* Shorts */}
      <path d="M30 95 L30 115 L48 115 L50 100 L52 115 L70 115 L70 95 Z" fill={secondary} stroke={detail} strokeWidth="1.5" />
      {/* Shorts detail line */}
      <line x1="30" y1="100" x2="70" y2="100" stroke={detail} strokeWidth="1" opacity={0.5} />
    </svg>
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
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [useCustomLogo, setUseCustomLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [country, setCountry] = useState('BR');
  const fileRef = useRef<HTMLInputElement>(null);

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
      primaryColor,
      secondaryColor,
      detailColor,
      logoUrl: useCustomLogo ? customLogoUrl : selectedPattern,
      shieldPattern: useCustomLogo ? undefined : selectedPattern,
      shieldShape: useCustomLogo ? undefined : selectedShape,
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

          {/* Country - horizontal scrollable */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">🌍 País do Clube</Label>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-2 pb-2">
                {countries.map(c => (
                  <button
                    key={c.code}
                    onClick={() => setCountry(c.code)}
                    className={`shrink-0 h-12 rounded-xl border-2 transition-all flex flex-col items-center justify-center px-3 min-w-[72px] ${country === c.code ? 'border-primary ring-2 ring-primary/30 bg-primary/10 scale-[1.03]' : 'border-border hover:border-primary/50'}`}
                  >
                    <span className="text-xl leading-none">{c.flag}</span>
                    <span className="text-[9px] font-medium mt-0.5">{c.name}</span>
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
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
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {shieldPatterns.map(pattern => (
                <button
                  key={pattern}
                  onClick={() => { setSelectedPattern(pattern); setUseCustomLogo(false); }}
                  className={`p-1 rounded-lg border-2 transition-all flex items-center justify-center aspect-square ${selectedPattern === pattern && !useCustomLogo ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border hover:border-primary/50'}`}
                >
                  <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern={pattern} shape={selectedShape} size={30} />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs h-8 gap-1.5">
                <Upload className="h-3 w-3" />
                {uploading ? 'Enviando...' : 'Upload Logo'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              {useCustomLogo && customLogoUrl && (
                <div className="flex items-center gap-2">
                  <img src={customLogoUrl} alt="Logo" className="w-8 h-8 rounded object-cover border border-primary" />
                  <span className="text-[10px] text-emerald-500 font-medium">✓ Logo personalizado</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview: Shield + Uniform side by side */}
          <div className="border border-border rounded-xl p-4 space-y-3" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)` }}>
            <p className="text-[10px] font-semibold text-center text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Shirt className="h-3 w-3" /> Prévia do Clube
            </p>
            <div className="flex items-center justify-center gap-6">
              {/* Shield */}
              <div className="flex flex-col items-center gap-1">
                {useCustomLogo && customLogoUrl ? (
                  <img src={customLogoUrl} alt="Logo" className="w-[72px] h-[72px] rounded-lg object-cover" />
                ) : (
                  <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern={selectedPattern} shape={selectedShape} size={72} />
                )}
                <span className="text-[9px] text-muted-foreground">Escudo</span>
              </div>
              {/* Uniform */}
              <div className="flex flex-col items-center gap-1">
                <UniformPreview primary={primaryColor} secondary={secondaryColor} detail={detailColor} size={72} />
                <span className="text-[9px] text-muted-foreground">Uniforme</span>
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-sm sm:text-base" style={{ color: primaryColor }}>{clubName || 'Seu Clube'}</p>
              <p className="text-[10px] text-muted-foreground">
                {countries.find(c => c.code === country)?.flag} {countries.find(c => c.code === country)?.name} • 🏟️ {stadiumName || 'Estádio Municipal'}
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
