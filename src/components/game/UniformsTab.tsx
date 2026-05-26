import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Shirt, Palette, Save, Sparkles, ShoppingBag, TrendingUp, Trophy, History, BarChart3, Info, Rocket, ArrowUpRight, Loader2, Zap } from 'lucide-react';
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
  shirtPatternColor?: string; // Color to be used for patterns
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
  uniformsUnlocked?: boolean; // Now redundant but kept for prop compatibility if needed elsewhere
}

function ShirtPreview({ kit, sponsorName, size = 'md' }: { kit: UniformKit; sponsorName?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 64 : size === 'lg' ? 120 : 80;
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
    <div style={{ width: dim, height: dim * 1.3 }} className="flex-shrink-0 transition-all duration-300 hover:scale-105">
      <svg viewBox="0 0 100 130" className="w-full h-full drop-shadow-2xl">

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

export function UniformsTab({ primaryColor, secondaryColor, uniforms, onSave, sponsors, players, clubReputation, uniformsUnlocked }: Props) {
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingLaunchId, setPendingLaunchId] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'checkout' | 'pix' | 'processing' | 'success'>('checkout');
  const [pixInfo, setPixInfo] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [salesHistory, setSalesHistory] = useState<any[]>([]);



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
      
      const approvedLaunch = launchData?.find(l => l.status === 'approved' || l.status === 'active');
      if (approvedLaunch) {
        setActiveLaunch(approvedLaunch);
        fetchSalesHistory(approvedLaunch.id);
      }
    } catch (error) {
      console.error('Error fetching launches:', error);
    }
  };

  const fetchSalesHistory = async (launchId: string) => {
    const { data } = await supabase
      .from('uniform_sales_history')
      .select('*')
      .eq('launch_id', launchId)
      .order('sale_date', { ascending: false })
      .limit(7);
    setSalesHistory(data || []);
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

  const generateLaunchNews = async (userId: string, clubName: string, _fans: number, _reputation: number, launchId?: string) => {
    try {
      // Anti-duplicação: se o trigger do banco já criou, não duplica
      if (launchId) {
        const { data: existing } = await supabase
          .from('newspaper_entries')
          .select('id')
          .eq('template_key', 'kit_launch')
          .filter('metadata->>launchId', 'eq', launchId)
          .limit(1)
          .maybeSingle();
        if (existing) {
          console.log('[uniform-news] notícia já existe para launch', launchId);
          return;
        }
      }

      const { data: userProfile } = await supabase.from('profiles').select('display_name').eq('user_id', userId).maybeSingle();
      const managerName = userProfile?.display_name || 'do clube';

      const headlines = [
        `👕 O ${clubName} apresenta seu novo uniforme para a temporada!`,
        `✨ Nova camisa do ${clubName} é revelada oficialmente.`,
        `🔥 Torcida reage ao novo manto lançado pelo ${clubName}.`,
        `📣 ${clubName} lança coleção inédita e movimenta o mercado.`,
        `🏆 O Manager ${managerName} apresenta o novo uniforme do ${clubName}.`,
        `👀 Confira o novo uniforme oficial do ${clubName} — já disponível na loja!`,
      ];
      const newsText = headlines[Math.floor(Math.random() * headlines.length)];

      const { error } = await supabase.from('newspaper_entries').insert([{
        user_id: userId,
        text: newsText,
        category: 'ELENCO',
        importance: 3,
        template_key: 'kit_launch',
        metadata: {
          launchId,
          clubName,
          kit: kits[activeKit],
          managerName,
        },
      }] as any);

      if (error) {
        console.error('[uniform-news] erro ao inserir notícia:', error);
      } else {
        console.log('[uniform-news] notícia publicada com sucesso');
      }
    } catch (err) {
      console.error('[uniform-news] exceção ao gerar notícia:', err);
    }
  };






  const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clubData } = await supabase.from('clubs')
        .select('id, name, fans, reputation')
        .eq('user_id', user.id)
        .single();
      if (!clubData) return;

      // 1. Criar lançamento pendente
      const { data: launch, error: launchError } = await supabase
        .from('club_uniform_launches')
        .insert({
          club_id: clubData.id,
          name: kits[activeKit].name || 'Nova Coleção',
          config: kits[activeKit] as any,
          initial_fans: clubData.fans,
          initial_reputation: clubData.reputation,
          hype_score: 100,
          status: 'pending_payment',
          price_cents: 1 // R$ 0,01
        })
        .select()
        .single();

      if (launchError) throw launchError;

      setPendingLaunchId(launch.id);
      setShowPaymentModal(true);
      setPaymentStep('checkout');
      
      toast.info('Design validado! Prossiga para o lançamento premium.');
    } catch (error: any) {
      console.error('Launch error:', error);
      toast.error('Erro ao preparar lançamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsLaunching(false);
    }
  };


  const executeKitPayment = async () => {
    if (!pendingLaunchId) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: clubData } = await supabase.from('clubs').select('id, name, fans, reputation').eq('user_id', user.id).single();

      // Registrar tentativa no monitor ADM
      await supabase.from('admin_shop_activity').insert({
        user_id: user.id,
        club_name: clubData?.name,
        item_name: `Lançamento: ${kits[activeKit].name}`,
        amount_cents: 1,
        status: 'attempting',
        payment_method: 'pix',
        metadata: { uniform_id: pendingLaunchId, type: 'uniform_launch' }
      });

      // Chamar function de checkout
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: { 
          item_id: 'uniform_launch_token',
          method: 'pix', // Garantindo o método correto para gerar QR Code
          email: email,
          full_name: fullName,
          // CPF não é mais obrigatório no fluxo de lançamento
          custom_amount: 1, // R$ 0,01
          metadata: { uniform_id: pendingLaunchId, item_type: 'uniform_launch' }
        }
      });

      if (error) throw error;

      if (data?.pix_qr_code) {
        setPixInfo(data);
        setPaymentStep('pix');
        
        // Atualizar monitor
        await supabase.from('admin_shop_activity').update({ status: 'pending' }).eq('metadata->>uniform_id', pendingLaunchId);

        // Se o clubData existir, passar os parâmetros para o sucesso interno caso precise monitorar
        if (clubData) {
          // O monitoramento do canal de pagamento chamará o handlePaymentSuccessInternal
        }
      }
    } catch (e: any) {
      console.error('[uniform-launch] payment error:', e);
      toast.error('Erro ao processar pagamento: ' + (e?.message || 'tente novamente'));
    } finally {
      setLoading(false);
    }
  };

  const confirmUniformPayment = async () => {
    if (!pendingLaunchId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: clubData } = await supabase.from('clubs')
      .select('name, fans, reputation')
      .eq('user_id', user.id)
      .single();

    if (clubData) {
      await handlePaymentSuccessInternal(pendingLaunchId, clubData.name, clubData.fans || 0, clubData.reputation || 50);
    }
  };

  // Monitorar pagamento em tempo real, igual ao fluxo da Loja FLM
  useEffect(() => {
    if (paymentStep !== 'pix' || !pixInfo?.order_id || !pendingLaunchId) return;

    const channel = supabase
      .channel('uniform-payment')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'payment_orders',
        filter: `id=eq.${pixInfo.order_id}`
      }, async (payload: any) => {
        if (payload.new?.status === 'approved' || payload.new?.delivered) {
          await confirmUniformPayment();
        }

        if (['rejected', 'cancelled', 'expired'].includes(payload.new?.status)) {
          toast.error('Pagamento não concluído. Tente novamente.');
          setPaymentStep('checkout');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [paymentStep, pixInfo, pendingLaunchId]);

  // Polling de segurança: garante atualização mesmo se o realtime/webhook atrasar
  useEffect(() => {
    if (paymentStep !== 'pix' || !pixInfo?.order_id || !pendingLaunchId) return;

    let cancelled = false;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const { data, error } = await supabase
          .from('payment_orders')
          .select('status, delivered')
          .eq('id', pixInfo.order_id)
          .maybeSingle();

        if (cancelled || error || !data) return;

        if (data.status === 'approved' || data.delivered) {
          clearInterval(interval);
          await confirmUniformPayment();
        } else if (['rejected', 'cancelled', 'expired'].includes(data.status)) {
          clearInterval(interval);
          toast.error('Pagamento não concluído. Tente novamente.');
          setPaymentStep('checkout');
        } else if (attempts >= 24) {
          clearInterval(interval);
          toast.info('Pagamento ainda pendente. Assim que aprovar, o uniforme será lançado automaticamente.');
        }
      } catch (error) {
        console.warn('[uniform-launch] polling error:', error);
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [paymentStep, pixInfo?.order_id, pendingLaunchId]);

  const handlePaymentSuccessInternal = async (launchId: string, clubName: string, fans: number, reputation: number) => {
    toast.success('Pagamento aprovado! Lançando uniforme...');
    setPaymentStep('success');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Ativar lançamento
      await supabase.from('club_uniform_launches').update({ 
        status: 'approved',
        launched_at: new Date().toISOString(),
        hype_score: 100
      }).eq('id', launchId);

      // Gerar notícia
      await generateLaunchNews(user.id, clubName, fans, reputation, launchId);
      
      // Notificação de sucesso
      await supabase.from('user_notifications').insert({
        user_id: user.id,
        type: 'success',
        category: 'Marketing',
        title: 'Uniforme Lançado!',
        message: `O novo uniforme do ${clubName} já está disponível na loja e as vendas começaram!`,
        icon: '👕'
      });
    }
    
    fetchLaunches();
    window.dispatchEvent(new CustomEvent('flm:refresh-club-data'));
    const audio = new Audio('https://www.myinstants.com/media/sounds/level-up-6.mp3');
    audio.play().catch(() => {});
  };


  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    // This is now handled by handlePaymentSuccessInternal for new launches
    // but kept for compatibility with any existing pending payments
    fetchLaunches();
  };


  // Os dados reais (hype/vendas) vêm do servidor via process_all_uniform_sales.
  // O frontend só lê e exibe — autoritativo no backend.
  const calculateCurrentSales = (launch: any) => {
    if (!launch) return { daily: 0, total: 0, hype: 0, daysSinceLaunch: 0, revenue: 0, revenueToday: 0 };

    const launchedAt = launch.launched_at ? new Date(launch.launched_at) : new Date();
    const daysSinceLaunch = Math.max(0, Math.floor((Date.now() - launchedAt.getTime()) / (24 * 3600 * 1000)));

    // Vendas de hoje vêm da tabela uniform_sales_history (linha do dia atual em BRT)
    const todayBRT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const todayRow = salesHistory.find((s: any) => s.sale_date === todayBRT);
    const dailySales = todayRow?.quantity || 0;
    const revenueToday = Number(todayRow?.revenue || 0);

    const hype = Math.max(0, Math.min(100, Math.round(Number(launch.hype_score ?? 0))));

    return {
      daily: dailySales,
      revenue: revenueToday,
      revenueToday,
      total: launch.total_sales_count || 0,
      hype,
      daysSinceLaunch,
    };
  };


  const salesStats = useMemo(() => calculateCurrentSales(activeLaunch), [activeLaunch, salesHistory]);

  const handleSave = () => {
    /*
    if (!uniformsUnlocked) {
      toast.error('🔒 Compre o desbloqueio de Uniformes na Loja FLM para salvar.');
      return;
    }
    */
    onSave({ ...kits, shirtSales: { totalSold, revenue: totalRevenue, topSellers } });
    toast.success('🎽 Uniformes salvos com sucesso!');
  };

  return (
    <div className="space-y-4">
      {/* Removal of locked warning as it's now free */}
      {/* Launch Dashboard */}
      {activeLaunch && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Shirt className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">Uniformes</p>
            <p className="text-[10px] text-muted-foreground truncate">Personalize seus 4 kits</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="h-9 flex-1 sm:flex-initial sm:px-4 text-xs gap-1.5 rounded-full" onClick={handleSave}>
            <Save className="h-3 w-3" /> Salvar
          </Button>
          <Button 
            size="sm" 
            className="h-9 flex-1 sm:flex-initial sm:px-4 text-xs gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500" 
            onClick={handleLaunch}
            disabled={isLaunching}
          >
            {isLaunching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />}
            <span className="truncate">Lançar Coleção</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
         <Card className="lg:col-span-2 overflow-hidden border-0 bg-gradient-to-b from-muted/30 to-muted/10 shadow-inner">
          <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center min-h-[240px] sm:min-h-[300px]">
            <ShirtPreview kit={currentKit} sponsorName={shirtSponsor?.name} size="lg" />
            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-base sm:text-lg font-black uppercase italic text-white tracking-tighter">{currentKit.name}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase">{patternLabels[currentKit.shirtPattern]} • {collarLabels[currentKit.collarStyle]}</p>
            </div>
          </CardContent>
        </Card>


        <Card className="lg:col-span-3 border-0 bg-muted/10">
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
      {/* Modal de Pagamento de Uniforme */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md bg-[#1A1F2C] border-primary/20 shadow-2xl overflow-hidden">
            <div className="relative h-24 bg-gradient-to-r from-primary/20 to-emerald-500/20 flex items-center justify-center">
               <div className="absolute top-4 right-4">
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-white/10" onClick={() => setShowPaymentModal(false)}>
                  <Label className="text-white cursor-pointer">✕</Label>
                </Button>
              </div>
              <Shirt className="h-10 w-10 text-white animate-bounce" />
            </div>

            <CardContent className="p-6">
              {paymentStep === 'checkout' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">Lançamento Premium</h2>
                    <p className="text-sm text-muted-foreground">Oficialize seu novo uniforme e comece a vender para sua torcida agora mesmo.</p>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-4 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Taxa de Lançamento</span>
                      <span className="font-bold text-white">R$ 0,01</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Benefícios</span>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-0">Vendas Ativas</Badge>
                    </div>
                    <div className="pt-2 border-t border-white/5 flex justify-between items-center font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-xl text-primary font-black">R$ 0,01</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Nome Completo</Label>
                      <Input placeholder="Seu nome" value={fullName} onChange={e => setFullName(e.target.value)} className="bg-muted/50 border-0 h-11" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">E-mail</Label>
                      <Input placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="bg-muted/50 border-0 h-11" />
                    </div>
                  </div>

                  <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase italic rounded-xl gap-2 shadow-lg shadow-primary/20" 
                    onClick={executeKitPayment} disabled={loading || !email || !fullName}>
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                    ADQUIRIR AGORA (R$ 0,01)
                  </Button>
                </div>
              )}

              {paymentStep === 'pix' && (
                <div className="text-center space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Aguardando Pagamento</h2>
                    <p className="text-sm text-muted-foreground">Escaneie o QR Code abaixo para confirmar o lançamento.</p>
                  </div>

                  <div className="flex justify-center p-4 bg-white rounded-2xl mx-auto w-48 h-48 shadow-xl">
                    {pixInfo?.pix_qr_code_base64 ? (
                      <img src={`data:image/png;base64,${pixInfo.pix_qr_code_base64}`} alt="PIX QR Code" className="w-full h-full" />
                    ) : pixInfo?.pix_qr_code ? (
                      <img src={`data:image/png;base64,${pixInfo.pix_qr_code}`} alt="PIX QR Code" className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button variant="outline" className="w-full border-white/10 text-xs gap-2 py-5" 
                      onClick={() => {
                        const code = pixInfo?.pix_qr_code || pixInfo?.pix_copy_paste;
                        if (code) {
                          navigator.clipboard.writeText(code);
                          toast.success('Copiado para a área de transferência!');
                        }
                      }}>
                      Copiar Código PIX
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Detectando pagamento...</span>
                    </div>
                  </div>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="text-center space-y-6 animate-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                    <span className="text-white text-3xl">✓</span>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Sucesso Total!</h2>
                    <p className="text-sm text-muted-foreground">Seu uniforme foi lançado oficialmente. As vendas começaram a todo vapor!</p>
                  </div>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11" onClick={() => setShowPaymentModal(false)}>
                    Ir para Dashboard de Vendas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}


