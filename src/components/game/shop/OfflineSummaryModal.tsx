import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, Users, DollarSign, Clock, Package, 
  CheckCircle2, AlertCircle, ShoppingBag, Truck,
  Calendar, ShoppingCart, Activity, LayoutDashboard,
  Info, ArrowRight
} from 'lucide-react';

import { OfflineSummary } from '@/types/store';
import { formatMoney } from '@/lib/formatMoney';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineSummaryModalProps {
  summary: OfflineSummary;
  onClose: () => void;
}

export function OfflineSummaryModal({ summary, onClose }: OfflineSummaryModalProps) {
  const stats = [
    { label: 'Lucro da Loja', value: formatMoney(summary.revenue), icon: DollarSign, color: 'emerald' },
    { label: 'Produtos Vendidos', value: summary.products_sold.toLocaleString(), icon: ShoppingBag, color: 'blue' },
    { label: 'Crescimento Torcida', value: `+${summary.fans_growth.toLocaleString()}`, icon: Users, color: 'purple' },
    { label: 'Entregas Concluídas', value: summary.completed_deliveries.toLocaleString(), icon: Truck, color: 'indigo' },
    { label: 'Produtos Esgotados', value: summary.out_of_stock.toLocaleString(), icon: AlertCircle, color: summary.out_of_stock > 0 ? 'red' : 'white' },
    { label: 'Tempo Ausente', value: `${Math.floor(summary.time_offline_seconds / 3600)}h ${Math.floor((summary.time_offline_seconds % 3600) / 60)}m`, icon: Clock, color: 'amber' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl bg-[#050810] border border-emerald-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.15)]"
      >
        <div className="relative p-6 sm:p-10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />
          
          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-4 rounded-full bg-emerald-500/10 mb-4 border border-emerald-500/20">
              <Activity className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Relatório de Ausência</h2>
            <p className="text-emerald-400/60 font-black uppercase text-[10px] tracking-[0.3em]">Enquanto você estava fora, o clube não parou!</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((stat, idx) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center"
              >
                <stat.icon className={`h-5 w-5 mb-2 text-${stat.color}-400`} />
                <p className="text-[10px] font-black uppercase text-white/40 mb-1">{stat.label}</p>
                <p className={`text-xl font-black italic text-${stat.color}-400`}>{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center gap-3 text-emerald-400">
              <Info className="h-5 w-5 shrink-0" />
              <p className="text-xs font-bold leading-relaxed">
                Suas vendas são baseadas no tamanho da sua torcida e reputação do clube. Mantenha o estoque cheio para maximizar o lucro offline!
              </p>
            </div>
          </div>

          <Button 
            onClick={onClose}
            className="w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic h-14 rounded-2xl shadow-[0_4px_20px_rgba(16,185,129,0.4)] transition-all active:scale-[0.98]"
          >
            Excelente! Continuar Gestão <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
