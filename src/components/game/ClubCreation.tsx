import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Shield, Shirt, Palette } from 'lucide-react';
import fcmLogo from '@/assets/fcm26-logo.png';

export interface ClubConfig {
  name: string;
  stadiumName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
}

interface Props {
  userId: string;
  onComplete: (config: ClubConfig) => void;
}

const presetLogos = [
  '⚽', '🦅', '🦁', '🐉', '🏆', '⭐', '🔥', '💎',
  '🐺', '🦈', '🐍', '🦇', '🐻', '🦊', '🐯', '🐘',
];

const presetColors = [
  { primary: 'hsl(0, 80%, 50%)', secondary: 'hsl(0, 0%, 10%)' },       // Red/Black
  { primary: 'hsl(220, 80%, 50%)', secondary: 'hsl(0, 0%, 100%)' },    // Blue/White
  { primary: 'hsl(45, 90%, 50%)', secondary: 'hsl(120, 60%, 35%)' },   // Gold/Green
  { primary: 'hsl(0, 0%, 10%)', secondary: 'hsl(0, 0%, 100%)' },       // Black/White
  { primary: 'hsl(120, 60%, 40%)', secondary: 'hsl(0, 0%, 100%)' },    // Green/White
  { primary: 'hsl(270, 60%, 50%)', secondary: 'hsl(45, 90%, 55%)' },   // Purple/Gold
  { primary: 'hsl(30, 90%, 50%)', secondary: 'hsl(0, 0%, 10%)' },      // Orange/Black
  { primary: 'hsl(340, 80%, 50%)', secondary: 'hsl(220, 80%, 50%)' },  // Pink/Blue
];

export function ClubCreation({ userId, onComplete }: Props) {
  const [clubName, setClubName] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('hsl(220, 80%, 50%)');
  const [secondaryColor, setSecondaryColor] = useState('hsl(0, 0%, 100%)');
  const [selectedLogo, setSelectedLogo] = useState('⚽');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
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
    setSelectedLogo('');
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
      logoUrl: customLogoUrl || selectedLogo,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <img src={fcmLogo} alt="FCM 26" className="w-14 h-14 mx-auto mb-1" />
          <CardTitle className="text-lg sm:text-xl">Criar Seu Clube</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Configure a identidade do seu time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-5">
          {/* Club Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Shield className="h-3 w-3" /> Nome do Clube</Label>
            <Input
              placeholder="Ex: Atlético Estrela"
              value={clubName}
              onChange={e => setClubName(e.target.value)}
              maxLength={30}
              className="h-9 text-sm"
            />
          </div>

          {/* Stadium Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">🏟️ Nome do Estádio</Label>
            <Input
              placeholder="Ex: Arena do Dragão"
              value={stadiumName}
              onChange={e => setStadiumName(e.target.value)}
              maxLength={40}
              className="h-9 text-sm"
            />
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
                  <input type="color" value={hslToHex(primaryColor)} onChange={e => setPrimaryColor(hexToHsl(e.target.value))} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <div className="flex-1 h-6 rounded" style={{ backgroundColor: primaryColor }} />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">Cor Secundária</Label>
                <div className="flex items-center gap-1.5">
                  <input type="color" value={hslToHex(secondaryColor)} onChange={e => setSecondaryColor(hexToHsl(e.target.value))} className="w-8 h-8 rounded cursor-pointer border-0" />
                  <div className="flex-1 h-6 rounded" style={{ backgroundColor: secondaryColor }} />
                </div>
              </div>
            </div>
          </div>

          {/* Logo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5"><Shirt className="h-3 w-3" /> Escudo do Clube</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {presetLogos.map(logo => (
                <button
                  key={logo}
                  onClick={() => { setSelectedLogo(logo); setCustomLogoUrl(''); }}
                  className={`h-10 rounded-lg border-2 text-lg flex items-center justify-center transition-all ${selectedLogo === logo && !customLogoUrl ? 'border-primary bg-primary/10 scale-110' : 'border-border hover:border-primary/50'}`}
                >
                  {logo}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs h-8 gap-1.5"
              >
                <Upload className="h-3 w-3" />
                {uploading ? 'Enviando...' : 'Upload Logo'}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              {customLogoUrl && (
                <div className="flex items-center gap-2">
                  <img src={customLogoUrl} alt="Logo" className="w-8 h-8 rounded object-cover border border-primary" />
                  <span className="text-[10px] text-emerald-500 font-medium">✓ Logo personalizado</span>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="border border-border rounded-lg p-3 sm:p-4 text-center space-y-2" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${secondaryColor}15)` }}>
            <div className="text-3xl sm:text-4xl">
              {customLogoUrl ? <img src={customLogoUrl} alt="Logo" className="w-12 h-12 mx-auto rounded-lg object-cover" /> : selectedLogo}
            </div>
            <p className="font-bold text-sm sm:text-base" style={{ color: primaryColor }}>{clubName || 'Seu Clube'}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">🏟️ {stadiumName || 'Estádio Municipal'}</p>
            <div className="flex justify-center gap-1">
              <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: primaryColor }} />
              <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: secondaryColor }} />
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

// Helpers for color conversion
function hslToHex(hsl: string): string {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return '#3b82f6';
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  const a2 = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const color = l - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s: number;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}
