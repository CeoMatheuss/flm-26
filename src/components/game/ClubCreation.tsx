import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Shield, Palette } from 'lucide-react';
import { ShieldCrest, shieldPatterns, ShieldPattern } from './ShieldCrest';
import flmLogo from '@/assets/flm26-logo.png';

export interface ClubConfig {
  name: string;
  stadiumName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  shieldPattern?: string;
  country: string;
}

interface Props {
  userId: string;
  onComplete: (config: ClubConfig) => void;
}

const presetColors = [
  { primary: '#DC2626', secondary: '#1F2937' },   // Red/Dark
  { primary: '#2563EB', secondary: '#FFFFFF' },    // Blue/White
  { primary: '#EAB308', secondary: '#16A34A' },    // Gold/Green
  { primary: '#111827', secondary: '#FFFFFF' },    // Black/White
  { primary: '#16A34A', secondary: '#FFFFFF' },    // Green/White
  { primary: '#7C3AED', secondary: '#EAB308' },    // Purple/Gold
  { primary: '#EA580C', secondary: '#111827' },    // Orange/Black
  { primary: '#DB2777', secondary: '#2563EB' },    // Pink/Blue
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
];

export function ClubCreation({ userId, onComplete }: Props) {
  const [clubName, setClubName] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [selectedPattern, setSelectedPattern] = useState<ShieldPattern>('classic');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [useCustomLogo, setUseCustomLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [country, setCountry] = useState('BR');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande (máx 2MB)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens são permitidas');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${userId}/logo.${ext}`;

    const { error } = await supabase.storage.from('club-logos').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Erro ao enviar logo');
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('club-logos').getPublicUrl(path);
    setCustomLogoUrl(data.publicUrl);
    setUseCustomLogo(true);
    toast.success('Logo enviado!');
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!clubName.trim()) {
      toast.error('Digite o nome do clube');
      return;
    }
    if (clubName.trim().length > 30) {
      toast.error('Nome do clube muito longo (máx 30 caracteres)');
      return;
    }
    if (stadiumName.trim().length > 40) {
      toast.error('Nome do estádio muito longo (máx 40 caracteres)');
      return;
    }
    onComplete({
      name: clubName.trim(),
      stadiumName: stadiumName.trim() || 'Estádio Municipal',
      primaryColor,
      secondaryColor,
      logoUrl: useCustomLogo ? customLogoUrl : selectedPattern,
      shieldPattern: useCustomLogo ? undefined : selectedPattern,
      country,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4">
      <Card className="w-full max-w-lg">
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
            <Label className="text-xs font-semibold flex items-center gap-1.5">🌍 País do Clube</Label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {countries.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCountry(c.code)}
                  className={`h-9 rounded-lg border-2 transition-all flex items-center justify-center gap-1 text-xs ${country === c.code ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border hover:border-primary/50'}`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="hidden sm:inline text-[10px]">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stadium Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">🏟️ Nome do Estádio</Label>
            <Input placeholder="Ex: Arena do Dragão" value={stadiumName} onChange={e => setStadiumName(e.target.value)} maxLength={40} className="h-9 text-sm" />
          </div>

          {/* Colors */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Palette className="h-3 w-3" /> Cores do Clube</Label>
            <div className="grid grid-cols-4 gap-2">
              {presetColors.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { setPrimaryColor(c.primary); setSecondaryColor(c.secondary); }}
                  className={`h-10 rounded-lg border-2 transition-all flex overflow-hidden ${primaryColor === c.primary && secondaryColor === c.secondary ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border hover:border-primary/50'}`}
                >
                  <div className="flex-1" style={{ backgroundColor: c.primary }} />
                  <div className="flex-1" style={{ backgroundColor: c.secondary }} />
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">Cor Principal</Label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <div className="flex-1 h-6 rounded" style={{ backgroundColor: primaryColor }} />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">Cor Secundária</Label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <div className="flex-1 h-6 rounded" style={{ backgroundColor: secondaryColor }} />
                </div>
              </div>
            </div>
          </div>

          {/* Shield Pattern Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Shield className="h-3 w-3" /> Escudo do Clube</Label>
            <div className="grid grid-cols-6 gap-1.5">
              {shieldPatterns.map(pattern => (
                <button
                  key={pattern}
                  onClick={() => { setSelectedPattern(pattern); setUseCustomLogo(false); }}
                  className={`p-1 rounded-lg border-2 transition-all flex items-center justify-center ${selectedPattern === pattern && !useCustomLogo ? 'border-primary ring-2 ring-primary/30 scale-105' : 'border-border hover:border-primary/50'}`}
                >
                  <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} pattern={pattern} size={40} />
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

          {/* Preview */}
          <div className="border border-border rounded-lg p-4 text-center space-y-2" style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)` }}>
            <div className="flex justify-center">
              {useCustomLogo && customLogoUrl ? (
                <img src={customLogoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} pattern={selectedPattern} size={72} />
              )}
            </div>
            <p className="font-bold text-sm sm:text-base" style={{ color: primaryColor }}>{clubName || 'Seu Clube'}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">🏟️ {stadiumName || 'Estádio Municipal'}</p>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!clubName.trim()}>
            Criar Clube e Começar 🏆
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
