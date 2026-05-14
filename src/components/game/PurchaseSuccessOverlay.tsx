import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShoppingBag, Sparkles, Star, Trophy, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

export function PurchaseSuccessOverlay() {
  const [show, setShow] = useState(false);
  const [itemName, setItemName] = useState('');

  useEffect(() => {
    const handler = (e: any) => {
      setItemName(e.detail?.item_name || 'Item Adquirido');
      setShow(true);
      
      // Fire confetti
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#fbbf24', '#ffffff']
      });
    };

    window.addEventListener('flm:purchase-success', handler);
    return () => window.removeEventListener('flm:purchase-success', handler);
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          className="bg-card border border-emerald-500/30 p-8 rounded-[40px] max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/20 to-transparent pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <motion.div 
              initial={{ rotate: -10, scale: 0.5 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              className="w-24 h-24 bg-emerald-500 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/40"
            >
              <CheckCircle2 className="h-12 w-12 text-white" />
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic text-emerald-500 leading-none">
                Compra Concluída!
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Seu novo item já está disponível no seu inventário.
              </p>
            </div>

            <div className="bg-muted/50 p-4 rounded-2xl border border-border/50 relative group">
              <p className="text-[10px] uppercase font-black text-emerald-600 mb-1">Item Entregue</p>
              <p className="text-lg font-black tracking-tight">{itemName}</p>
              
              <div className="absolute -top-2 -right-2 bg-amber-400 p-1.5 rounded-lg shadow-lg rotate-12 group-hover:rotate-0 transition-transform">
                <Sparkles className="h-4 w-4 text-amber-900" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => setShow(false)}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-xl shadow-emerald-500/20"
              >
                Continuar Gerenciando Clube
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
