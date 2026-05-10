import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Shield, ChevronDown, ChevronUp, Globe, ArrowLeft, ArrowRight, Check, Lock, Users, Gift, Trophy, Sparkles, Lightbulb, Building2, Coins, Target, Eye, Swords } from 'lucide-react';
import { ShieldCrest, ShieldPattern, ShieldShape, ShieldIcon, ShieldConfig } from './ShieldCrest';
import { CrestBuilder, defaultShieldConfig } from './CrestBuilder';
import { validateAndCleanClubName } from '@/utils/clubUtils';
import flmLogo from '@/assets/flm26-logo.png';
import { cn } from '@/lib/utils';

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

const STADIUM_SUGGESTIONS = [
  'Arena do Dragão', 'Estádio Municipal', 'Templo do Futebol',
  'Coliseu', 'Fortaleza', 'Arena dos Campeões',
];

const TIPS = [
  { icon: Sparkles, title: 'Treine seus jogadores', text: 'Treine diariamente para evoluir o OVR do elenco.' },
  { icon: Building2, title: 'Expanda o estádio', text: 'Suba o nível do estádio para aumentar a renda de bilheteria.' },
  { icon: Coins, title: 'Patrocínios crescem', text: 'Os valores de patrocínio escalam com sua reputação.' },
  { icon: Trophy, title: 'Vença campeonatos', text: 'Suba de divisão e ganhe prêmios em dinheiro generosos.' },
  { icon: Eye, title: 'Olheiros revelam talentos', text: 'Contrate olheiros para ver o potencial dos jovens da base.' },
  { icon: Swords, title: 'Tática faz a diferença', text: 'Ajuste formação e estilo antes de partidas decisivas.' },
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

function StepIndicator({ step, onJump }: { step: 1 | 2 | 3 | 4; onJump: (s: 1 | 2 | 3 | 4) => void }) {
  const steps = [
    { n: 1, label: 'Nome' },
    { n: 2, label: 'Estádio' },
    { n: 3, label: 'Escudo' },
    { n: 4, label: 'Revisão' },
  ] as const;
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4">
      {steps.map((s, i) => {
        const active = step === s.n;
        const done = step > s.n;
        const clickable = s.n <= step;
        return (
          <div key={s.n} className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => clickable && onJump(s.n as 1 | 2 | 3 | 4)}
              disabled={!clickable}
              className={cn(
                'flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold transition-all',
                active && 'bg-primary text-primary-foreground shadow-md scale-105',
                done && 'bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 cursor-pointer',
                !active && !done && 'bg-muted text-muted-foreground'
              )}
            >
              <span className={cn(
                'w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold',
                active && 'bg-primary-foreground/20',
                done && 'bg-emerald-500/30',
                !active && !done && 'bg-background/50'
              )}>
                {done ? <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={cn('h-px w-3 sm:w-6', step > s.n ? 'bg-emerald-500/40' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RotatingTips() {
  const [tipIndex, setTipIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);
  const tip = TIPS[tipIndex];
  const Icon = tip.icon;
  return (
    <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Dicas Rápidas</span>
      </div>
      <div key={tipIndex} className="flex-1 flex flex-col items-center justify-center text-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <h4 className="text-sm font-bold">{tip.title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-[220px]">{tip.text}</p>
      </div>
      <div className="flex items-center justify-center gap-1 mt-4">
        {TIPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === tipIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function ClubCreation({ userId, onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [clubName, setClubName] = useState('');
  const [stadiumName, setStadiumName] = useState('');
  const [shieldConfig, setShieldConfig] = useState<ShieldConfig>(() => defaultShieldConfig({
    primaryColor: '#2563EB', secondaryColor: '#FFFFFF', detailColor: '#DC2626', borderColor: '#DC2626',
  }));
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [useCustomLogo, setUseCustomLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [country, setCountry] = useState('BR');
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryStatuses, setCountryStatuses] = useState<Record<string, CountryStatusData>>({});
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [checkingName, setCheckingName] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find(c => c.code === country);

  useEffect(() => {
    const loadStatuses = async () => {
      const { data } = await supabase.from('country_status').select('*');
      if (data) {
        const map: Record<string, CountryStatusData> = {};
        for (const d of data) map[d.country] = d as CountryStatusData;
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

  const goNext = async () => {
    if (step === 1) {
      if (!clubName.trim()) { toast.error('Digite o nome do clube'); return; }
      if (clubName.trim().length > 30) { toast.error('Nome muito longo (máx 30 caracteres)'); return; }
      const status = getCountryStatus(country);
      if (status.locked) { toast.error('Este país está lotado! Escolha outro.'); return; }
      // Verifica nome duplicado no servidor
      setCheckingName(true);
      const { data: check } = await supabase.rpc('check_club_name_available' as any, { _name: clubName.trim() });
      setCheckingName(false);
      const result = (check as any) || {};
      if (result.available === false) {
        const sugg = (result.suggestions || []) as string[];
        setNameSuggestions(sugg);
        toast.error(`Nome "${clubName.trim()}" já em uso. Veja as sugestões abaixo.`);
        return;
      }
      setNameSuggestions([]);
      setStep(2);
    } else if (step === 2) {
      if (stadiumName.trim().length > 40) { toast.error('Nome do estádio muito longo (máx 40 caracteres)'); return; }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const goBack = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4);
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

  const displayStadium = stadiumName.trim() || 'Estádio Municipal';
  const displayName = clubName.trim() || 'Seu Clube';
  const status = getCountryStatus(country);

  // Container: wider on Step 3 (crest builder)
  const containerClass = step === 3
    ? 'w-full max-w-5xl'
    : step === 2
      ? 'w-full max-w-3xl'
      : 'w-full max-w-2xl';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4 py-6">
      <Card className={cn(containerClass, 'max-h-[95vh] overflow-y-auto border-primary/20 shadow-xl')}>
        <CardContent className="pt-5 sm:pt-6 px-4 sm:px-6 pb-5 sm:pb-6">
          <StepIndicator step={step} onJump={setStep} />

          {/* ============================================== */}
          {/* STEP 1 — Welcome + Club Name + Country         */}
          {/* ============================================== */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-3 py-2">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <img src={flmLogo} alt="FLM 26" className="relative w-16 h-16 sm:w-20 sm:h-20" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                    Bem-vindo ao FLM 26!
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Vamos construir a história do seu clube ⚽
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" /> Nome do Clube
                </Label>
                <Input
                  placeholder="Ex: Atlético Estrela"
                  value={clubName}
                  onChange={e => setClubName(e.target.value)}
                  maxLength={30}
                  className="h-12 text-base"
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground text-right">{clubName.length}/30</p>
                {nameSuggestions.length > 0 && (
                  <div className="mt-1 p-2 rounded-lg border border-amber-500/30 bg-amber-500/10 space-y-1">
                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">⚠️ Nome em uso. Sugestões:</p>
                    <div className="flex flex-wrap gap-1">
                      {nameSuggestions.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setClubName(s); setNameSuggestions([]); }}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" /> País
                </Label>
                <button
                  onClick={() => setCountryOpen(!countryOpen)}
                  className="w-full h-11 px-3 rounded-lg border border-border bg-background flex items-center justify-between hover:border-primary/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{selectedCountry?.flag}</span>
                    <span className="font-medium text-sm">{selectedCountry?.name}</span>
                    <span className="flex items-center gap-1">
                      {status.locked && <Lock className="h-3 w-3 text-destructive" />}
                      {status.bonus > 0 && <Gift className="h-3 w-3 text-emerald-500" />}
                      <span className="text-[10px] text-muted-foreground">{status.players} managers</span>
                    </span>
                  </span>
                  {countryOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {countryOpen && (
                  <div className="border border-border rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <ScrollArea className="h-[240px]">
                      <div className="p-1 grid grid-cols-1 gap-0.5">
                        {countries.map(c => {
                          const s = getCountryStatus(c.code);
                          return (
                            <button
                              key={c.code}
                              onClick={() => {
                                if (s.locked) { toast.error(`${c.name} está lotado!`); return; }
                                setCountry(c.code);
                                setCountryOpen(false);
                              }}
                              className={cn(
                                'flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition-colors',
                                s.locked
                                  ? 'opacity-50 cursor-not-allowed bg-destructive/5'
                                  : country === c.code
                                  ? 'bg-primary/10 text-primary font-semibold'
                                  : 'hover:bg-muted/50'
                              )}
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
                {status.bonus > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Gift className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">
                      Bônus de R$ {(status.bonus / 1000).toFixed(0)}K para escolher este país!
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={goNext} disabled={!clubName.trim()} size="lg" className="gap-2">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* STEP 2 — Stadium + Rotating Tips                */}
          {/* ============================================== */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-1">
                <h2 className="text-lg sm:text-2xl font-bold flex items-center justify-center gap-2">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Nome do seu Estádio
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Onde os torcedores farão história
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* LEFT: Input + Suggestions */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Nome do Estádio</Label>
                    <Input
                      placeholder="Ex: Arena do Dragão"
                      value={stadiumName}
                      onChange={e => setStadiumName(e.target.value)}
                      maxLength={40}
                      className="h-12 text-base"
                      autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground text-right">
                      {stadiumName.length}/40 (opcional — usa "Estádio Municipal" por padrão)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sugestões</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {STADIUM_SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          onClick={() => setStadiumName(s)}
                          className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-card hover:bg-primary/10 hover:border-primary/40 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Rotating Tips */}
                <RotatingTips />
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={goBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button onClick={goNext} size="lg" className="gap-2">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* STEP 3 — Crest Builder                          */}
          {/* ============================================== */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-1">
                <h2 className="text-lg sm:text-2xl font-bold flex items-center justify-center gap-2">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Crie o Escudo do {displayName}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Escolha modelo, divisão e cores — ou envie seu próprio logo
                </p>
              </div>

              <CrestBuilder
                value={shieldConfig}
                onChange={(c) => {
                  setShieldConfig(c);
                  setUseCustomLogo(false);
                }}
                showSaveButton={false}
              />

              {/* Upload custom logo */}
              <div className="rounded-lg border border-dashed border-border p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold">Logo personalizado</p>
                    <p className="text-[10px] text-muted-foreground">Envie sua própria imagem (máx 2MB)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {useCustomLogo && customLogoUrl && (
                    <>
                      <img src={customLogoUrl} alt="Logo" className="w-8 h-8 rounded object-cover border border-primary" />
                      <span className="text-[10px] text-emerald-500 font-medium">✓ Ativo</span>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="text-[11px] h-8 gap-1">
                    <Upload className="h-3 w-3" />
                    {uploading ? 'Enviando...' : 'Enviar Logo'}
                  </Button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={goBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button onClick={goNext} size="lg" className="gap-2">
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================== */}
          {/* STEP 4 — Final Review                           */}
          {/* ============================================== */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-1">
                <h2 className="text-lg sm:text-2xl font-bold flex items-center justify-center gap-2">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  Tudo pronto!
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Confira como seu clube ficou antes de começar a jornada
                </p>
              </div>

              {/* HERO Card */}
              <div
                className="relative rounded-2xl border border-border p-6 sm:p-8 overflow-hidden"
                style={{
                  background: `radial-gradient(ellipse at top, ${shieldConfig.primaryColor}25 0%, hsl(var(--card)) 70%)`,
                }}
              >
                <div className="flex flex-col items-center gap-4">
                  {useCustomLogo && customLogoUrl ? (
                    <img
                      src={customLogoUrl}
                      alt="Logo"
                      className="w-24 h-24 sm:w-36 sm:h-36 rounded-2xl object-cover shadow-2xl"
                      style={{ boxShadow: `0 12px 40px ${shieldConfig.primaryColor}55` }}
                    />
                  ) : (
                    <div
                      className="block sm:hidden"
                      style={{ filter: `drop-shadow(0 12px 24px ${shieldConfig.primaryColor}55)` }}
                    >
                      <ShieldCrest
                        primaryColor={shieldConfig.primaryColor}
                        secondaryColor={shieldConfig.secondaryColor}
                        detailColor={shieldConfig.detailColor}
                        pattern={shieldConfig.pattern as ShieldPattern}
                        shape={shieldConfig.shape as ShieldShape}
                        icon={shieldConfig.icon as ShieldIcon}
                        size={140}
                        borderColor={shieldConfig.borderColor}
                        borderWidth={shieldConfig.borderWidth}
                      />
                    </div>
                  )}
                  {!useCustomLogo && (
                    <div
                      className="hidden sm:block"
                      style={{ filter: `drop-shadow(0 16px 32px ${shieldConfig.primaryColor}55)` }}
                    >
                      <ShieldCrest
                        primaryColor={shieldConfig.primaryColor}
                        secondaryColor={shieldConfig.secondaryColor}
                        detailColor={shieldConfig.detailColor}
                        pattern={shieldConfig.pattern as ShieldPattern}
                        shape={shieldConfig.shape as ShieldShape}
                        icon={shieldConfig.icon as ShieldIcon}
                        size={200}
                        borderColor={shieldConfig.borderColor}
                        borderWidth={shieldConfig.borderWidth}
                      />
                    </div>
                  )}
                  <div className="text-center space-y-1">
                    <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: shieldConfig.primaryColor }}>
                      {displayName}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <span>{selectedCountry?.flag}</span>
                      <span>{selectedCountry?.name}</span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="flex items-center gap-1">🏟️ {displayStadium}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Bonus indicator */}
              {status.bonus > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Gift className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">
                    Você receberá R$ {(status.bonus / 1000).toFixed(0)}K extras como bônus de país!
                  </span>
                </div>
              )}

              {/* Kits + Colors */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center mb-3">Uniformes</p>
                  <div className="flex items-center justify-center gap-6 sm:gap-8">
                    <KitPreview
                      shirtColor={shieldConfig.primaryColor}
                      secondaryColor={shieldConfig.secondaryColor}
                      detailColor={shieldConfig.detailColor}
                      pattern="stripes" label="Titular" size={72}
                    />
                    <KitPreview
                      shirtColor={shieldConfig.secondaryColor}
                      secondaryColor={shieldConfig.primaryColor}
                      detailColor={shieldConfig.detailColor}
                      pattern="solid" label="Reserva" size={72}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold text-center mb-3">Cores</p>
                  <div className="flex items-center justify-around h-full pb-3">
                    {[
                      { c: shieldConfig.primaryColor, label: 'Primária' },
                      { c: shieldConfig.secondaryColor, label: 'Secundária' },
                      { c: shieldConfig.detailColor, label: 'Detalhe' },
                    ].map(({ c, label }) => (
                      <div key={label} className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 rounded-full border-2 border-border shadow-md" style={{ backgroundColor: c }} />
                        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-2 pt-2">
                <Button variant="outline" onClick={goBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Editar Escudo
                </Button>
                <Button onClick={handleConfirm} size="lg" className="gap-2 sm:flex-1 sm:max-w-md sm:ml-auto">
                  <Check className="h-4 w-4" /> Criar Clube e Começar Jornada
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
