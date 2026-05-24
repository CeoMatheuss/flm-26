import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Search, Globe, Crown, Shield, Star, 
  Sparkles, Loader2, Zap, ArrowRight, History,
  TrendingUp, MapPin, Briefcase, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/formatMoney';

interface ScoutPack {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  icon: string;
}

interface Scout {
  id: string;
  name: string;
  nationality: string;
  rarity: string;
  specialty: string;
  favorite_region: string;
  potential_eval_rating: number;
  discovery_rating: number;
  analysis_rating: number;
  contract_seasons_left: number;
  salary_cents: number;
}

export function ScoutPackTab({ clubId, budget }: { clubId: string; budget: number }) {
  const [packs, setPacks] = useState<ScoutPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [revealingScout, setRevealingScout] = useState<Scout | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    const { data, error } = await supabase.from('shop_scout_packs').select('*').order('price_cents', { ascending: true });
    if (data) setPacks(data);
    setLoading(false);
  };

  const buyPack = async (pack: ScoutPack) => {
    if (budget < pack.price_cents / 100) {
      toast.error('Saldo insuficiente!');
      return;
    }

    setPurchasing(true);
    try {
      // 1. Deduct money (simulated here, in prod use RPC/Trigger)
      const { error: budgetErr } = await supabase.rpc('adjust_club_budget', { 
        p_club_id: clubId, 
        p_amount_cents: -pack.price_cents 
      });
      if (budgetErr) throw budgetErr;

      // 2. Generate procedural scout
      const { data: scoutId, error: scoutErr } = await supabase.rpc('generate_random_scout', {
        p_club_id: clubId,
        p_pack_id: pack.id
      });
      if (scoutErr) throw scoutErr;

      // 3. Fetch the new scout data for reveal
      const { data: scoutData } = await supabase.from('club_scouts').select('*').eq('id', scoutId).single();
      
      if (scoutData) {
        setRevealingScout(scoutData as Scout);
        setShowReveal(true);
        toast.success(`🎉 Novo olheiro contratado: ${scoutData.name}`);
        
        // Log to Admin Monitor
        await supabase.from('admin_shop_activity').insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          club_name: 'Seu Clube', // Fetch if possible
          item_name: `Pack Olheiro: ${pack.name}`,
          amount_cents: pack.price_cents,
          status: 'approved',
          payment_method: 'in_game',
          metadata: { scout_id: scoutId, rarity: scoutData.rarity }
        });
      }

    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao abrir pacote.');
    } finally {
      setPurchasing(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Mundial': return 'from-amber-400 to-yellow-600 text-amber-950';
      case 'Elite': return 'from-purple-500 to-indigo-700 text-white';
      case 'Excelente': return 'from-emerald-400 to-teal-600 text-white';
      case 'Bom': return 'from-blue-400 to-blue-600 text-white';
      default: return 'from-slate-400 to-slate-600 text-white';
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Search': return <Search className="h-6 w-6" />;
      case 'Globe': return <Globe className="h-6 w-6" />;
      case 'Crown': return <Crown className="h-6 w-6" />;
      default: return <Users className="h-6 w-6" />;
    }
  };

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packs.map(pack => (
          <Card key={pack.id} className="bg-slate-900/60 border-white/10 hover:border-primary/40 transition-all overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              {getIcon(pack.icon)}
            </div>
            <CardHeader>
              <Badge className="w-fit mb-2 bg-primary/20 text-primary border-primary/30 uppercase text-[9px] font-black">Scout Pack</Badge>
              <CardTitle className="text-lg font-black italic uppercase tracking-tighter text-white">{pack.name}</CardTitle>
              <p className="text-xs text-white/40">{pack.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-emerald-400 font-black italic text-xl">
                <Zap className="h-4 w-4" />
                {formatMoney(pack.price_cents / 100)}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => buyPack(pack)} 
                disabled={purchasing}
                className="w-full bg-white/5 hover:bg-primary hover:text-white border-white/10 font-bold uppercase italic text-xs h-10 group-hover:scale-[1.02] transition-transform"
              >
                {purchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Recrutar Agora
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* REVEAL ANIMATION OVERLAY */}
      <AnimatePresence>
        {showReveal && revealingScout && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.5, rotateY: 180 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="relative w-full max-w-sm"
            >
              {/* Shine effect for rare scouts */}
              {(revealingScout.rarity === 'Elite' || revealingScout.rarity === 'Mundial') && (
                <div className="absolute inset-[-20px] bg-primary/20 blur-[60px] rounded-full animate-pulse" />
              )}

              <Card className={`overflow-hidden border-none shadow-2xl bg-gradient-to-br ${getRarityColor(revealingScout.rarity)}`}>
                <div className="p-1">
                  <div className="bg-[#0a0f1a] rounded-xl overflow-hidden p-6 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className={`mb-1 uppercase font-black italic text-[10px] bg-gradient-to-r ${getRarityColor(revealingScout.rarity)} border-none`}>
                          {revealingScout.rarity}
                        </Badge>
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{revealingScout.name}</h2>
                        <div className="flex items-center gap-1.5 text-white/60 text-[10px] font-bold uppercase">
                          <Globe className="h-3 w-3" /> {revealingScout.nationality}
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase font-black text-white/30 tracking-widest">Especialidade</p>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Briefcase className="h-3 w-3 text-primary" /> {revealingScout.specialty}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase font-black text-white/30 tracking-widest">Região</p>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-emerald-400" /> {revealingScout.favorite_region}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase italic">
                          <span className="text-white/40">Avaliação Potencial</span>
                          <span className="text-primary">{revealingScout.potential_eval_rating}</span>
                        </div>
                        <Progress value={revealingScout.potential_eval_rating} className="h-1 bg-white/5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase italic">
                          <span className="text-white/40">Descoberta Wonderkids</span>
                          <span className="text-emerald-400">{revealingScout.discovery_rating}</span>
                        </div>
                        <Progress value={revealingScout.discovery_rating} className="h-1 bg-white/5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black uppercase italic">
                          <span className="text-white/40">Inteligência de Análise</span>
                          <span className="text-blue-400">{revealingScout.analysis_rating}</span>
                        </div>
                        <Progress value={revealingScout.analysis_rating} className="h-1 bg-white/5" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] uppercase font-black text-white/30 tracking-widest">Contrato</p>
                        <p className="text-xs font-black italic text-white flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {revealingScout.contract_seasons_left} Temporadas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] uppercase font-black text-white/30 tracking-widest">Salário</p>
                        <p className="text-sm font-black italic text-emerald-400">{formatMoney(revealingScout.salary_cents / 100)}/mês</p>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-white font-black italic uppercase tracking-wider"
                      onClick={() => setShowReveal(false)}
                    >
                      Confirmar Contratação
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
