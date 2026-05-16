import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Shirt, Palette, Save, Sparkles, ShoppingBag, TrendingUp, Trophy, History, BarChart3, Info, Rocket, ArrowUpRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sponsor } from '@/types/sponsor';

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
  sponsorTextColor?: string;
}

export interface ShirtSale {
  number: number;
  playerName: string;
  overall: number;
  position: string;
  sold: number;
}

export interface UniformsData {
  home: UniformKit;
  away: UniformKit;
  third: UniformKit;
  goalkeeper: UniformKit;
  shirtSales?: {
    totalSold: number;
    revenue: number;
    topSellers: ShirtSale[];
  };
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
  sponsorTextColor: '#FFFFFF',
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
  sponsorTextColor: '#2563EB',
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
  sponsorTextColor: '#FFFFFF',
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
  sponsorTextColor: '#FFFFFF',
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
  sponsors?: Sponsor[];
  players?: Array<{ name: string; position: string; overall: number; goals?: number; gamesPlayed?: number }>;
  clubReputation?: number;
}

function ShirtPreview({ kit, sponsorName, size = 'md' }: { kit: UniformKit; sponsorName?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 44 : size === 'lg' ? 72 : 56;
  const scale = dim / 100;
  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const patternId = `p-${uid}`;

  // Uniform proportions: shirt body is a rectangle with shoulder lines
  const renderPattern = () => {
    const clipId = `c-${uid}`;
    const bodyRect = <rect x="20" y="6" width="60" height="56" rx="2" />;

    const patternOverlay = () => {
      switch (kit.shirtPattern) {
        case 'stripes':
          return [28, 36, 44, 52, 60, 68].map(x => (
            <rect key={x} x={x} y="6" width="4" height="56" fill={kit.shirtSecondaryColor} clipPath={`url(#${clipId})`} />
          ));
        case 'hoops':
          return [10, 20, 30, 40, 50].map(y => (
            <rect key={y} x="20" y={y} width="60" height="5" fill={kit.shirtSecondaryColor} clipPath={`url(#${clipId})`} />
          ));
        case 'halves':
          return <rect x="50" y="6" width="30" height="56" fill={kit.shirtSecondaryColor} clipPath={`url(#${clipId})`} />;
        case 'diagonal':
          return <polygon points="20,35 80,55 80,62 20,42" fill={kit.shirtSecondaryColor} opacity="0.75" clipPath={`url(#${clipId})`} />;
        case 'pinstripes':
          return Array.from({ length: 15 }, (_, i) => 22 + i * 4).map(x => (
            <rect key={x} x={x} y="6" width="1" height="56" fill={kit.shirtSecondaryColor} opacity="0.4" clipPath={`url(#${clipId})`} />
          ));
        case 'gradient':
          return (
            <>
              <defs>
                <linearGradient id={`g-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={kit.shirtColor} />
                  <stop offset="100%" stopColor={kit.shirtSecondaryColor} />
                </linearGradient>
              </defs>
              <rect x="20" y="6" width="60" height="56" rx="2" fill={`url(#g-${uid})`} clipPath={`url(#${clipId})`} />
            </>
          );
        default:
          return null;
      }
    };

    return (
      <>
        <defs>
          <clipPath id={clipId}>{bodyRect}</clipPath>
        </defs>
        <rect x="20" y="6" width="60" height="56" rx="2" fill={kit.shirtColor} />
        {patternOverlay()}
      </>
    );
  };

  const slvH = kit.sleeveStyle === 'long' ? 36 : 22;
  const slvColor = kit.shirtPattern === 'sleeves' ? kit.shirtSecondaryColor : kit.shirtColor;
  const showSponsor = size !== 'sm' && sponsorName;
  const sponsorFontSize = size === 'lg' ? 5 : 4;

  return (
    <div style={{ width: dim, height: dim * 1.2 }} className="flex-shrink-0">
      <svg viewBox="0 0 100 120" className="w-full h-full">
        {/* Left sleeve */}
        <rect x="6" y="8" width="14" height={slvH} rx="2" fill={slvColor} />
        {/* Right sleeve */}
        <rect x="80" y="8" width="14" height={slvH} rx="2" fill={slvColor} />
        {/* Body */}
        {renderPattern()}
        {/* Collar */}
        {kit.collarStyle === 'v-neck' && <polygon points="44,6 50,14 56,6" fill={kit.shirtSecondaryColor} />}
        {kit.collarStyle === 'round' && <ellipse cx="50" cy="7" rx="8" ry="3" fill={kit.shirtSecondaryColor} />}
        {kit.collarStyle === 'polo' && <rect x="42" y="4" width="16" height="5" rx="2" fill={kit.shirtSecondaryColor} />}
        {kit.collarStyle === 'henley' && (
          <>
            <rect x="47" y="6" width="6" height="8" rx="1" fill={kit.shirtSecondaryColor} />
            <circle cx="50" cy="10" r="0.8" fill={kit.shirtColor} />
            <circle cx="50" cy="13" r="0.8" fill={kit.shirtColor} />
          </>
        )}
        {/* Shield placeholder */}
        <circle cx="28" cy="22" r="4" fill="white" opacity="0.9" />
        <circle cx="28" cy="22" r="3.5" fill={kit.shirtColor} opacity="0.8" />
        <path d="M28,19 L29.5,21 L31,19 L30,22 L31,25 L29.5,23 L28,25 L29,22 Z" fill="white" transform="translate(-1, 0) scale(0.6)" />

        {/* Sponsor text */}
        {showSponsor && (
          <text x="50" y="38" textAnchor="middle" fontSize={sponsorFontSize} fontWeight="bold" fill={kit.sponsorTextColor || '#FFFFFF'} fontFamily="sans-serif" opacity="0.85">
            {sponsorName.length > 12 ? sponsorName.slice(0, 12) : sponsorName}
          </text>
        )}
        {/* Number */}
        <text x="50" y={showSponsor ? 55 : 44} textAnchor="middle" fontSize="14" fontWeight="bold" fill={kit.numberColor} fontFamily="monospace">10</text>
        {/* Shorts - two rectangles side by side */}
        <rect x="28" y="64" width="20" height="16" rx="2" fill={kit.shortsColor} />
        <rect x="52" y="64" width="20" height="16" rx="2" fill={kit.shortsColor} />
        {/* Socks */}
        <rect x="30" y="82" width="16" height="18" rx="2" fill={kit.socksColor} />
        <rect x="54" y="82" width="16" height="18" rx="2" fill={kit.socksColor} />
        {/* Shoes */}
        <rect x="30" y="100" width="16" height="4" rx="1" fill="#222" />
        <rect x="54" y="100" width="16" height="4" rx="1" fill="#222" />
      </svg>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</Label>
      <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-1">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-7 h-7 rounded cursor-pointer border border-border/50" style={{ padding: 0 }} />
        <Input value={value} onChange={e => onChange(e.target.value)}
          className="h-7 text-[10px] font-mono flex-1 bg-background/50 border-0" />
      </div>
    </div>
  );
}

function KitEditor({ kit, onChange, hasSponsor }: { kit: UniformKit; onChange: (kit: UniformKit) => void; hasSponsor: boolean }) {
  return (
    <div className="space-y-3">
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
          {hasSponsor && (
            <ColorPicker label="Patrocínio" value={kit.sponsorTextColor || '#FFFFFF'} onChange={v => onChange({ ...kit, sponsorTextColor: v })} />
          )}
        </div>
      </div>
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

function generateShirtSales(players?: Props['players'], reputation?: number): ShirtSale[] {
  if (!players || players.length === 0) return [];
  const sorted = [...players]
    .map(p => {
      const starFactor = Math.max(0, p.overall - 60) / 40;
      const matchFactor = (p.gamesPlayed || 0) / 20;
      const goalFactor = (p.goals || 0) / 10;
      const repFactor = (reputation || 50) / 100;
      const base = Math.floor((starFactor * 400 + matchFactor * 200 + goalFactor * 300) * (0.5 + repFactor) * (0.7 + Math.random() * 0.6));
      return {
        number: Math.floor(Math.random() * 99) + 1,
        playerName: p.name,
        overall: p.overall,
        position: p.position,
        sold: Math.max(10, base),
      };
    })
    .sort((a, b) => b.sold - a.sold);
  return sorted.slice(0, 10);
}

export function UniformsTab({ primaryColor, secondaryColor, uniforms, onSave, sponsors, players, clubReputation }: Props) {
  const [activeKit, setActiveKit] = useState<'home' | 'away' | 'third' | 'goalkeeper'>('home');
  const [kits, setKits] = useState<UniformsData>(uniforms || {
    home: { ...defaultHome, shirtColor: primaryColor || defaultHome.shirtColor, shirtSecondaryColor: secondaryColor || defaultHome.shirtSecondaryColor },
    away: defaultAway,
    third: defaultThird,
    goalkeeper: defaultGoalkeeper,
  });
  const [launches, setLaunches] = useState<any[]>([]);
  const [activeLaunch, setActiveLaunch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    fetchLaunches();
  }, []);

  const fetchLaunches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clubData } = await supabase.from('clubs').select('id').eq('user_id', user.id).single();
      if (!clubData) return;

      const { data: launchData, error } = await supabase
        .from('club_uniform_launches')
        .select('*')
        .eq('club_id', clubData.id)
        .order('launched_at', { ascending: false });

      if (error) throw error;
      setLaunches(launchData || []);
      if (launchData && launchData.length > 0) {
        setActiveLaunch(launchData[0]);
        // Trigger low sales notification if hype is low
        const stats = calculateCurrentSales(launchData[0], clubReputation || 50, clubReputation || 50);
        if (stats.hype < 20 && stats.daysSinceLaunch > 30) {
          const { data: existingNotif } = await supabase
            .from('user_notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('title', 'Vendas de Uniforme em Queda')
            .maybeSingle();
            
          if (!existingNotif) {
             await supabase.from('user_notifications').insert({
              user_id: user.id,
              type: 'info',
              category: 'Marketing',
              title: 'Vendas de Uniforme em Queda',
              message: 'As vendas do uniforme atual começaram a cair drasticamente. Que tal lançar um novo modelo para reacender o interesse da torcida?',
              icon: '📩'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching launches:', error);
    }
  };

  const currentKit = kits[activeKit];
  const shirtSponsor = sponsors?.find(s => s.type === 'camisa');
  const hasSponsor = !!shirtSponsor;

  const topSellers = useMemo(() => generateShirtSales(players, clubReputation), [players, clubReputation]);
  const totalSold = topSellers.reduce((s, t) => s + t.sold, 0);
  const shirtPrice = 120 + Math.floor((clubReputation || 50) * 0.8);
  const totalRevenue = totalSold * shirtPrice;

  const handleKitChange = (updated: UniformKit) => {
    setKits(prev => ({ ...prev, [activeKit]: updated }));
  };

  const generateLaunchNews = async (userId: string, clubName: string, fans: number, reputation: number) => {
    let newsText = '';

    if (fans < 50000) {
      newsText = `👕 ${clubName} apresenta novo uniforme para a temporada. O design busca aumentar a conexão com a torcida e renovar as esperanças dos fãs.`;
    } else if (fans < 500000) {
      newsText = `👕 Novo uniforme do ${clubName} começa a movimentar a torcida. Com vendas iniciais superando as expectativas, o clube aposta no hype para alavancar as receitas.`;
    } else {
      newsText = `👕 Torcida lota loja oficial após lançamento do novo uniforme do ${clubName}. O lançamento do novo uniforme do gigante ${clubName} parou a cidade.`;
    }

    await (supabase.from('newspaper_entries') as any).insert({
      user_id: userId,
      text: newsText,
      category: 'MARKETING',
      importance: 1,
      is_event: true
    });
  };

  const handleLaunch = async () => {
    try {
      setIsLaunching(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clubData } = await (supabase.from('clubs') as any).select('*').eq('user_id', user.id).single();
      if (!clubData) return;

      if ((clubData.uniform_launches_available || 0) <= 0) {
        toast.error('Você não possui slots de lançamento disponíveis. Compre na Loja FLM!');
        return;
      }

      // 1. Criar registro de lançamento
      const { data: newLaunch, error: launchError } = await (supabase.from('club_uniform_launches') as any)
        .insert({
          club_id: clubData.id,
          name: kits.home.name || 'Nova Coleção',
          config: kits as any,
          initial_fans: clubData.fans,
          initial_reputation: clubData.reputation,
          hype_score: 1.0
        })
        .select()
        .single();

      if (launchError) throw launchError;

      // 2. Atualizar clube (consumir slot e definir uniforme atual)
      await (supabase.from('clubs') as any).update({
        uniform_launches_available: clubData.uniform_launches_available - 1,
        current_uniform_launch_id: newLaunch.id,
        primary_color: kits.home.shirtColor,
        secondary_color: kits.home.shirtSecondaryColor
      }).eq('id', clubData.id);

      // 3. Gerar notícia
      await generateLaunchNews(user.id, clubData.name, clubData.fans, clubData.reputation);

      toast.success('🚀 Novo uniforme lançado com sucesso!');
      fetchLaunches();
      window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));
      onSave({ ...kits, shirtSales: { totalSold, revenue: totalRevenue, topSellers } });
    } catch (error: any) {
      console.error('Launch error:', error);
      toast.error('Erro ao lançar uniforme: ' + error.message);
    } finally {
      setIsLaunching(false);
    }
  };

  const calculateCurrentSales = (launch: any, clubFans: number, clubRep: number) => {
    if (!launch) return { daily: 0, total: 0, hype: 0, daysSinceLaunch: 0, revenue: 0 };
    
    const daysSinceLaunch = Math.max(0, (Date.now() - new Date(launch.launched_at).getTime()) / (24 * 3600 * 1000));
    
    const baseDaily = (clubFans * 0.005) * (clubRep / 100);
    
    let hype = 1.0;
    if (daysSinceLaunch <= 15) {
      hype = 1.5 - (daysSinceLaunch / 15) * 0.5;
    } else {
      hype = Math.max(0.1, 1.0 - ((daysSinceLaunch - 15) / 45));
    }
    
    const dailySales = Math.floor(baseDaily * hype);
    
    return {
      daily: dailySales,
      revenue: dailySales * shirtPrice,
      hype: Math.round(hype * 100),
      daysSinceLaunch: Math.floor(daysSinceLaunch)
    };
  };

  const salesStats = useMemo(() => calculateCurrentSales(activeLaunch, clubReputation || 50, clubReputation || 50), [activeLaunch, clubReputation]);

  const handleSave = () => {
    onSave({ ...kits, shirtSales: { totalSold, revenue: totalRevenue, topSellers } });
    toast.success('🎽 Uniformes salvos com sucesso!');
  };

  return (
    <div className="space-y-4">
      {/* Launch Dashboard */}
      {activeLaunch && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] font-black uppercase text-emerald-500/60">Vendas Hoje</span>
              </div>
              <p className="text-xl font-black italic">{salesStats.daily.toLocaleString()} <span className="text-[10px] not-italic font-normal text-muted-foreground">unid.</span></p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-500 font-bold">+R$ {(salesStats.revenue).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-muted/10 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase text-muted-foreground">Hype Atual</span>
              </div>
              <p className="text-xl font-black italic">{salesStats.hype}%</p>
              <div className="w-full bg-muted rounded-full h-1 mt-2">
                <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${salesStats.hype}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/10 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-[10px] font-black uppercase text-muted-foreground">Dias de Lançamento</span>
              </div>
              <p className="text-xl font-black italic">{salesStats.daysSinceLaunch} <span className="text-[10px] not-italic font-normal text-muted-foreground">dias</span></p>
              <p className="text-[9px] text-muted-foreground mt-1">
                {salesStats.daysSinceLaunch < 15 ? '🔥 Fase de Hype Máximo' : '📉 Queda natural de vendas'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/10 border-white/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[10px] font-black uppercase text-muted-foreground">Vendas Totais</span>
              </div>
              <p className="text-xl font-black italic">{(activeLaunch.total_sales_count || 0).toLocaleString()}</p>
              <p className="text-[10px] text-amber-500 font-bold mt-1">R$ {(activeLaunch.total_revenue_cents / 100 || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>
      )}

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 px-4 text-xs gap-1.5 rounded-full" onClick={handleSave}>
            <Save className="h-3 w-3" /> Salvar
          </Button>
          <Button 
            size="sm" 
            className="h-8 px-4 text-xs gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500" 
            onClick={handleLaunch}
            disabled={isLaunching}
          >
            {isLaunching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
            Lançar Coleção
          </Button>
        </div>
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
         <Card className="sm:col-span-2 overflow-hidden border-0 bg-gradient-to-b from-muted/30 to-muted/10">
          <CardContent className="p-3 flex flex-col items-center justify-center min-h-[140px]">
            <ShirtPreview kit={currentKit} sponsorName={shirtSponsor?.name} size="lg" />
            <p className="text-xs font-semibold mt-2">{currentKit.name}</p>
            <p className="text-[10px] text-muted-foreground">{patternLabels[currentKit.shirtPattern]} • {collarLabels[currentKit.collarStyle]}</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-3 border-0 bg-muted/10">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" /> Personalizar
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <KitEditor kit={currentKit} onChange={handleKitChange} hasSponsor={hasSponsor} />
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
                  <div className="w-4 h-4 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: preset.shirt }} />
                  <div className="w-4 h-4 rounded-full border-2 border-background shadow-sm" style={{ backgroundColor: preset.sec }} />
                </div>
                <span className="text-[9px] font-medium text-muted-foreground">{preset.label}</span>
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

      {/* Shirt Sales */}
      <Card className="border-0 bg-muted/10">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-primary" /> Venda de Camisas na Temporada
            </span>
            <Badge variant="secondary" className="text-[10px]">
              R$ {(totalRevenue / 1000).toFixed(0)}k receita
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-primary">{totalSold.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Camisas vendidas</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2 text-center">
              <p className="text-lg font-bold text-primary">R$ {shirtPrice}</p>
              <p className="text-[10px] text-muted-foreground">Preço unitário</p>
            </div>
          </div>

          {topSellers.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Top 10 Camisas Mais Vendidas
              </p>
              {topSellers.map((sale, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                    i === 1 ? 'bg-gray-300/20 text-gray-500' :
                    i === 2 ? 'bg-orange-400/20 text-orange-500' :
                    'bg-muted/30 text-muted-foreground'
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-xs font-bold text-primary w-8 text-center">#{sale.number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{sale.playerName}</p>
                    <p className="text-[10px] text-muted-foreground">{sale.position} • OVR {sale.overall}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{sale.sold.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">vendidas</p>
                  </div>
                  {i < 3 && <Trophy className={`h-3 w-3 flex-shrink-0 ${
                    i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : 'text-orange-400'
                  }`} />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Contrate jogadores para começar a vender camisas!</p>
          )}
        </CardContent>
      </Card>
      {/* History Section */}
      {launches.length > 1 && (
        <Card className="border-0 bg-muted/10">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-primary" /> Histórico de Lançamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-2">
                {launches.slice(1).map((launch, idx) => (
                  <div key={launch.id} className="min-w-[150px] bg-background/50 p-2 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-muted-foreground">{new Date(launch.launched_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-[8px] h-4 px-1">#{launches.length - idx - 1}</Badge>
                    </div>
                    <p className="text-xs font-bold truncate">{launch.name}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-muted-foreground">Vendas:</span>
                        <span className="font-bold">{launch.total_sales_count?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-muted-foreground">Receita:</span>
                        <span className="text-emerald-500 font-bold">R$ {(launch.total_revenue_cents / 100).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
