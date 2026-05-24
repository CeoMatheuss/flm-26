import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, Truck, Clock, AlertTriangle, CheckCircle2, 
  TrendingUp, TrendingDown, DollarSign, Users, Info,
  Box, ArrowRight, Zap, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney } from '@/lib/formatMoney';
import { ShopOrder, OrderStatus, ShopProduct } from '@/types/store';

interface OrderTrackerProps {
  orders: ShopOrder[];
}

const statusConfig: Record<OrderStatus, { label: string, color: string, icon: any, progress: number }> = {
  'processing': { label: 'Processando', color: 'blue', icon: Box, progress: 15 },
  'separating': { label: 'Separando', color: 'orange', icon: Package, progress: 35 },
  'shipping': { label: 'Em Transporte', color: 'purple', icon: Truck, progress: 65 },
  'out_for_delivery': { label: 'Saiu para Entrega', color: 'indigo', icon: Zap, progress: 85 },
  'delivered': { label: 'Entregue', color: 'emerald', icon: CheckCircle2, progress: 100 },
  'delayed': { label: 'Atrasado', color: 'red', icon: Clock, progress: 50 },
  'cancelled': { label: 'Cancelado', color: 'slate', icon: AlertTriangle, progress: 0 }
};

export function OrderTracker({ orders }: OrderTrackerProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-white/40 border border-dashed border-white/10 rounded-2xl bg-white/5">
        <Package className="h-12 w-12 mb-2 opacity-20" />
        <p className="text-xs uppercase font-black italic">Nenhuma entrega em andamento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase italic text-emerald-400 flex items-center gap-2">
          <Truck className="h-4 w-4" /> Entregas em Tempo Real
        </h3>
        <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
          {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length} ATIVAS
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {orders.map((order) => {
          const config = statusConfig[order.status];
          const Icon = config.icon;
          const isCompleted = order.status === 'delivered';
          const isDelayed = order.status === 'delayed';

          return (
            <motion.div 
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-slate-900/60 border rounded-2xl p-4 backdrop-blur-md transition-all ${isCompleted ? 'border-emerald-500/20' : isDelayed ? 'border-red-500/20' : 'border-white/5'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                  <div className={`p-2 rounded-xl bg-${config.color}-500/20`}>
                    <Icon className={`h-5 w-5 text-${config.color}-400`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase truncate max-w-[150px]">
                      {order.product?.name || 'Pedido'}
                    </h4>
                    <p className="text-[10px] text-white/40 font-bold">ID: {order.id.slice(0, 8)}</p>
                  </div>
                </div>
                <Badge className={`bg-${config.color}-500/20 text-${config.color}-400 border-${config.color}-500/30 text-[9px] font-black italic`}>
                  {config.label.toUpperCase()}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end text-[10px] mb-1">
                  <span className="text-white/40 font-bold uppercase italic">Progresso</span>
                  <span className="text-white/60">{config.progress}%</span>
                </div>
                <Progress value={config.progress} className={`h-1.5 bg-white/5`} />
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                    <p className="text-[8px] text-white/40 uppercase font-black">Transportadora</p>
                    <p className="text-[10px] font-bold text-emerald-400 truncate">{order.shipping_company?.name || 'Correios'}</p>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                    <p className="text-[8px] text-white/40 uppercase font-black">Previsão</p>
                    <p className="text-[10px] font-bold text-white italic">
                      {new Date(order.estimated_delivery_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {isCompleted && (
                  <div className="flex items-center gap-2 pt-2 text-[10px] text-emerald-400 font-bold">
                    <Star className="h-3 w-3 fill-current" />
                    Satisfação: {order.customer_satisfaction || 5}/5
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
