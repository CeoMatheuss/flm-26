import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Shield, Palette, Shirt, ChevronDown, ChevronUp, Globe, Sparkles, ArrowLeft, Check, Lock, Users, Gift } from 'lucide-react';
import { ShieldCrest, shieldPatterns, ShieldPattern, shieldShapes, ShieldShape, shieldIcons, ShieldIcon, shieldIconLabels, ShieldConfig } from './ShieldCrest';
import { CrestBuilder, defaultShieldConfig } from './CrestBuilder';
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
  shieldConfig?: ShieldConfig;
  country: string;
}

interface Props {
  userId: string;
  onComplete: (config: ClubConfig) => void;
}

interface CountryStatusData {
  country: string;
  total_players: number | null;
  is_locked: boolean | null;
  bonus_budget: number | null;
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
  { code: 'PY', name: 'Paraguai', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'EC', name: 'Equador', flag: '🇪🇨' },
  { code: 'BO', name: 'Bolívia', flag: '🇧🇴' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'BE', name: 'Bélgica', flag: '🇧🇪' },
  { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
  { code: 'EG', name: 'Egito', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigéria', flag: '🇳🇬' },
  { code: 'ZA', name: 'África do Sul', flag: '🇿🇦' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'AU', name: 'Austrália', flag: '🇦🇺' },
  { code: 'QA', name: 'Catar', flag: '🇶🇦' },
  { code: 'AE', name: 'Emirados', flag: '🇦🇪' },
];

function KitPreview({ shirtColor, secondaryColor, detailColor, pattern, label, size = 64 }: {
  shirtColor: string; secondaryColor: string; detailColor: string;
  pattern: 'solid' | 'stripes' | 'halves'; label: string; size?: number;
}) {
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
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size * 1.2 }} className="flex-shrink-0">
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
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
    </div>
  );
}

export function ClubCreation({ userId, onComplete }: Props) {
  const [clubName, setClubName] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');
  const [detailColor, setDetailColor] = useState('#DC2626');
  const [selectedPattern, setSelectedPattern] = useState<ShieldPattern>('solid');
  const [selectedShape, setSelectedShape] = useState<ShieldShape>('classic');
  const [selectedIcon, setSelectedIcon] = useState<ShieldIcon>('star');
  const [shieldConfig, setShieldConfig] = useState<ShieldConfig>(() => defaultShieldConfig({
    primaryColor: '#2563EB', secondaryColor: '#FFFFFF', detailColor: '#DC2626', borderColor: '#DC2626',
  }));
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [useCustomLogo, setUseCustomLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [country, setCountry] = useState('BR');
  const [countryOpen, setCountryOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [countryStatuses, setCountryStatuses] = useState<Record<string, CountryStatusData>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find(c => c.code === country);

  // Load country statuses
  useEffect(() => {
    const loadStatuses = async () => {
      const { data } = await supabase.from('country_status').select('*');
      if (data) {
        const map: Record<string, CountryStatusData> = {};
        for (const d of data) {
          map[d.country] = d as CountryStatusData;
        }
        setCountryStatuses(map);
      }
    };
    loadStatuses();
  }, []);

  const getCountryStatus = (code: string) => {
    const status = countryStatuses[code];
    if (!status) return { locked: false, players: 0, bonus: 0 };
    return {
      locked: status.is_locked || false,
      players: status.total_players || 0,
      bonus: status.bonus_budget || 0,
    };
  };

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

  const handleGoToConfirm = () => {
    if (!clubName.trim()) { toast.error('Digite o nome do clube'); return; }
    if (clubName.trim().length > 30) { toast.error('Nome do clube muito longo (máx 30 caracteres)'); return; }
    if (stadiumName.trim().length > 40) { toast.error('Nome do estádio muito longo (máx 40 caracteres)'); return; }

    const status = getCountryStatus(country);
    if (status.locked) {
      toast.error('Este país está lotado! Escolha outro ou aguarde o próximo mês.');
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    onComplete({
      name: clubName.trim(),
      stadiumName: stadiumName.trim() || 'Estádio Municipal',
      primaryColor: shieldConfig.primaryColor,
      secondaryColor: shieldConfig.secondaryColor,
      detailColor: shieldConfig.detailColor,
      logoUrl: useCustomLogo ? customLogoUrl : shieldConfig.pattern,
      shieldPattern: useCustomLogo ? undefined : shieldConfig.pattern,
      shieldShape: useCustomLogo ? undefined : shieldConfig.shape,
      shieldIcon: useCustomLogo ? undefined : shieldConfig.icon,
      shieldConfig: useCustomLogo ? undefined : shieldConfig,
      country,
    });
  };

  const shapeNames: Record<ShieldShape, string> = {
    classic: 'Clássico', rounded: 'Redondo', pointed: 'Pontudo', circle: 'Círculo',
    pentagon: 'Pentágono', gothic: 'Gótico', hexagon: 'Hexágono', 'diamond-shield': 'Diamante',
    badge: 'Badge', crest: 'Brasão',
  };

  const displayStadium = stadiumName.trim() || 'Estádio Municipal';
  const displayName = clubName.trim() || 'Seu Clube';

  // ===== CONFIRMATION PAGE =====
  if (showConfirmation) {
    const status = getCountryStatus(country);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-2 sm:p-4">
        <Card className="w-full max-w-md max-h-[95vh] overflow-y-auto border-primary/20">
          <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-5 px-3 sm:px-6">
            <div className="text-center space-y-0.5">
              <h2 className="text-base sm:text-lg font-bold">Confirme seu Clube</h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Verifique se está tudo certo antes de criar</p>
            </div>

            <div className="flex flex-col items-center gap-2 sm:gap-3 py-3 sm:py-4 rounded-xl border border-border" style={{ background: `linear-gradient(180deg, ${primaryColor}12, ${secondaryColor}08)` }}>
              {useCustomLogo && customLogoUrl ? (
                <img src={customLogoUrl} alt="Logo" className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl object-cover shadow-lg" />
              ) : (
                <>
                  <div className="block sm:hidden">
                    <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern={selectedPattern} shape={selectedShape} icon={selectedIcon} size={72} />
                  </div>
                  <div className="hidden sm:block">
                    <ShieldCrest primaryColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern={selectedPattern} shape={selectedShape} icon={selectedIcon} size={96} />
                  </div>
                </>
              )}
              <div className="text-center space-y-0.5">
                <p className="text-base sm:text-xl font-bold" style={{ color: primaryColor }}>{displayName}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">{selectedCountry?.flag} {selectedCountry?.name}</p>
              </div>
            </div>

            {/* Bonus indicator */}
            {status.bonus > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Gift className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-emerald-600 font-medium">
                  Bônus de R$ {(status.bonus / 1000).toFixed(0)}K por país em crescimento!
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="rounded-lg border border-border p-2.5 sm:p-3 flex items-center gap-2.5 sm:flex-1">
                <span className="text-xl sm:text-2xl">🏟️</span>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Estádio</p>
                  <p className="font-bold text-xs sm:text-sm truncate">{displayStadium}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-2.5 sm:p-3 flex items-center justify-center gap-3 sm:flex-1">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-border" style={{ backgroundColor: primaryColor }} />
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground">1ª</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-border" style={{ backgroundColor: secondaryColor }} />
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground">2ª</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-border" style={{ backgroundColor: detailColor }} />
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground">Det</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 sm:p-4">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center mb-2 sm:mb-3">Uniformes</p>
              <div className="flex items-center justify-center gap-6 sm:gap-8">
                <KitPreview shirtColor={primaryColor} secondaryColor={secondaryColor} detailColor={detailColor} pattern="stripes" label="Uniforme 1" size={56} />
                <KitPreview shirtColor={secondaryColor} secondaryColor={primaryColor} detailColor={detailColor} pattern="solid" label="Uniforme 2" size={56} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pb-2">
              <Button variant="outline" onClick={() => setShowConfirmation(false)} className="sm:flex-1 gap-2 h-9 sm:h-10 text-xs sm:text-sm">
                <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Voltar e Editar
              </Button>
              <Button onClick={handleConfirm} className="sm:flex-1 gap-2 h-9 sm:h-10 text-xs sm:text-sm">
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Confirmar e Criar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== EDITOR PAGE =====
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4">
      <Card className="w-full max-w-lg max-h-[95vh] overflow-y-auto border-primary/20">
        <div className="sticky top-0 z-10 bg-card border-b border-border px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <img src={flmLogo} alt="FLM 26" className="w-8 h-8" />
            <div>
              <h2 className="text-base font-bold">Criar Seu Clube</h2>
              <p className="text-[10px] text-muted-foreground">Configure a identidade do seu time</p>
            </div>
          </div>
        </div>

        <CardContent className="space-y-4 pt-4">
          {/* SECTION 1: Info Básica */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Informações Básicas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Nome do Clube</Label>
                <Input placeholder="Ex: Atlético Estrela" value={clubName} onChange={e => setClubName(e.target.value)} maxLength={30} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Nome do Estádio</Label>
                <Input placeholder="Ex: Arena do Dragão" value={stadiumName} onChange={e => setStadiumName(e.target.value)} maxLength={40} className="h-8 text-sm" />
              </div>
            </div>

            {/* Country with status */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> País</Label>
              <button
                onClick={() => setCountryOpen(!countryOpen)}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background flex items-center justify-between hover:border-primary/50 transition-colors text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{selectedCountry?.flag}</span>
                  <span className="font-medium text-sm">{selectedCountry?.name}</span>
                  {(() => {
                    const s = getCountryStatus(country);
                    return (
                      <span className="flex items-center gap-1">
                        {s.locked && <Lock className="h-3 w-3 text-destructive" />}
                        {s.bonus > 0 && <Gift className="h-3 w-3 text-emerald-500" />}
                        <span className="text-[9px] text-muted-foreground">{s.players} managers</span>
                      </span>
                    );
                  })()}
                </span>
                {countryOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {countryOpen && (
                <div className="border border-border rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <ScrollArea className="h-[220px]">
                    <div className="p-1 grid grid-cols-1 gap-0.5">
                      {countries.map(c => {
                        const s = getCountryStatus(c.code);
                        return (
                          <button
                            key={c.code}
                            onClick={() => {
                              if (s.locked) {
                                toast.error(`${c.name} está lotado! Escolha outro país.`);
                                return;
                              }
                              setCountry(c.code);
                              setCountryOpen(false);
                            }}
                            className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors ${
                              s.locked
                                ? 'opacity-50 cursor-not-allowed bg-destructive/5'
                                : country === c.code
                                ? 'bg-primary/10 text-primary font-semibold'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="text-sm">{c.flag}</span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              {s.locked && (
                                <Badge variant="destructive" className="text-[8px] px-1 py-0">
                                  <Lock className="h-2.5 w-2.5 mr-0.5" /> Lotado
                                </Badge>
                              )}
                              {s.bonus > 0 && (
                                <Badge className="text-[8px] px-1 py-0 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                                  <Gift className="h-2.5 w-2.5 mr-0.5" /> +{(s.bonus / 1000).toFixed(0)}K
                                </Badge>
                              )}
                              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                <Users className="h-2.5 w-2.5" /> {s.players}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* SECTION 2+3: Crest Builder Pro */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Editor de Escudo
            </h3>
            <CrestBuilder
              value={shieldConfig}
              onChange={(c) => {
                setShieldConfig(c);
                setPrimaryColor(c.primaryColor);
                setSecondaryColor(c.secondaryColor);
                setDetailColor(c.detailColor);
                setSelectedPattern(c.pattern as ShieldPattern);
                setSelectedShape(c.shape as ShieldShape);
                setSelectedIcon(c.icon as ShieldIcon);
                setUseCustomLogo(false);
              }}
              showSaveButton={false}
            />
          </div>

          <div className="border-t border-border" />

          {/* Upload Logo */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-[10px] h-7 gap-1">
              <Upload className="h-3 w-3" />
              {uploading ? 'Enviando...' : 'Upload Logo Personalizado'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {useCustomLogo && customLogoUrl && (
              <div className="flex items-center gap-2">
                <img src={customLogoUrl} alt="Logo" className="w-7 h-7 rounded object-cover border border-primary" />
                <span className="text-[9px] text-emerald-500 font-medium">✓ Logo personalizado</span>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-xl p-4 border border-border space-y-2" style={{ background: `linear-gradient(135deg, ${shieldConfig.primaryColor}12, ${shieldConfig.secondaryColor}08)` }}>
            <p className="text-[10px] font-semibold text-center text-muted-foreground uppercase tracking-widest">
              <Shirt className="h-3 w-3 inline mr-1" /> Prévia do Clube
            </p>
            <div className="text-center space-y-0.5">
              <p className="font-bold text-base" style={{ color: shieldConfig.primaryColor }}>{displayName}</p>
              <p className="text-xs text-muted-foreground">{selectedCountry?.flag} {selectedCountry?.name}</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">🏟️ {displayStadium}</p>
            </div>
            <div className="flex items-center justify-center gap-6 pt-1">
              <KitPreview shirtColor={shieldConfig.primaryColor} secondaryColor={shieldConfig.secondaryColor} detailColor={shieldConfig.detailColor} pattern="stripes" label="Uniforme 1" size={56} />
              <KitPreview shirtColor={shieldConfig.secondaryColor} secondaryColor={shieldConfig.primaryColor} detailColor={shieldConfig.detailColor} pattern="solid" label="Uniforme 2" size={56} />
            </div>
          </div>

          <Button onClick={handleGoToConfirm} className="w-full h-10" disabled={!clubName.trim()}>
            Avançar para Confirmação →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
