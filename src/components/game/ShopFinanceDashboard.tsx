import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  TrendingUp, TrendingDown, Users, ShoppingBag, 
  DollarSign, Package, Star, BarChart3, LineChart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, AreaChart, Area, 
  XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

interface ShopFinanceDashboardProps {
  stats: any;
  club: any;
  products: any[];
}

export function ShopFinanceDashboard({ stats, club, products }: ShopFinanceDashboardProps) {
  const chartData = stats.revenue_history || [];
  
  const metrics = [
    { 
      label: 'Ganhos Diários', 
      value: `R$ ${(stats.daily_revenue / 100).toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10',
      trend: stats.daily_revenue > 0 ? '+12%' : '0%',
      trendUp: true,
      sub: 'Renda passiva'
    },
    { 
      label: 'Ganhos Mensais (Proj)', 
      value: `R$ ${((stats.daily_revenue * 30) / 100).toLocaleString()}`, 
      icon: BarChart3, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10',
      trend: '+5%',
      trendUp: true,
      sub: 'Baseado no atual'
    },
    { 
      label: 'Lucro Total do Clube', 
      value: `R$ ${(stats.total_profit / 100).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10',
      trend: '+18%',
      trendUp: true,
      sub: 'Desde a fundação'
    },
    { 
      label: 'Conversão de Marca', 
      value: `${((stats.buying_fans / (club.fans || 1)) * 100).toFixed(1)}%`, 
      icon: Users, 
      color: 'text-purple-400', 
      bg: 'bg-purple-500/10',
      trend: 'Alta',
      trendUp: true,
      sub: 'Fãs compradores'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="bg-black/40 border-white/5 overflow-hidden backdrop-blur-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className={`${metric.bg} p-2 rounded-xl`}>
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-bold ${metric.trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {metric.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {metric.trend}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-wider">{metric.label}</p>
                  <p className="text-lg font-black italic uppercase tracking-tighter text-white">{metric.value}</p>
                  <p className="text-[9px] text-white/20 font-medium italic mt-0.5">{metric.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 bg-black/40 border-white/5 backdrop-blur-md overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-black uppercase italic tracking-widest text-emerald-400">Evolução da Receita</h3>
                <p className="text-[10px] text-white/40 font-medium">Histórico de vendas dos últimos 30 dias</p>
              </div>
              <LineChart className="h-5 w-5 text-white/10" />
            </div>
            
            <div className="h-[250px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      hide 
                    />
                    <YAxis 
                      hide 
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#050810', border: '1px solid #ffffff10', borderRadius: '12px' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                      labelStyle={{ color: '#ffffff40', fontSize: '10px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                   <BarChart3 className="h-8 w-8 text-white/5" />
                   <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Aguardando dados de simulação...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info & Upgrades */}
        <div className="space-y-6">
          <Card className="bg-black/40 border-white/5 backdrop-blur-md overflow-hidden">
            <CardContent className="p-6">
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2 rounded-xl bg-purple-500/10">
                        <Users className="h-4 w-4 text-purple-400" />
                     </div>
                     <div>
                        <h4 className="text-[10px] text-white/40 font-black uppercase tracking-widest">Impacto da Marca</h4>
                        <p className="text-sm font-black text-white italic">Crescimento da Instituição</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5">
                        <p className="text-[9px] text-white/30 font-black uppercase tracking-wider mb-1">Reputação</p>
                        <p className="text-xl font-black text-white italic">{(club.reputation || 0).toFixed(0)}</p>
                     </div>
                     <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5">
                        <p className="text-[9px] text-white/30 font-black uppercase tracking-wider mb-1">Engajamento</p>
                        <p className="text-xl font-black text-white italic">Forte</p>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <span className="text-white/20">Média de Vendas</span>
                        <span className="text-white/60">R$ {((stats.daily_revenue / (stats.buying_fans || 1)) / 100).toFixed(2)} / torcedor</span>
                     </div>
                     <div className="h-1 w-full bg-white/5 rounded-full" />
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-600/10 border-emerald-500/20 backdrop-blur-md overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Star className="h-16 w-16 text-emerald-400" />
            </div>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Status da Loja</p>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Nível {stats.level}</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-white/40">Popularidade</span>
                    <span className="text-emerald-400">{(stats.popularity * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.popularity * 50}%` }}
                      className="h-full bg-emerald-500 shadow-[0_0_10px_#10b981]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[9px] text-white/40 leading-relaxed">
                    Sua loja gera receita automaticamente baseada no tamanho da sua torcida e reputação do clube. Faça upgrades para aumentar o bônus de conversão.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-white/5 backdrop-blur-md">
            <CardContent className="p-5">
              <h4 className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Package className="h-3 w-3 text-emerald-400" /> Produtos Mais Vendidos
              </h4>
              <div className="space-y-3">
                {products.slice(0, 3).map((prod, i) => (
                  <div key={prod.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/5 p-2 rounded-lg group-hover:bg-emerald-500/10 transition-colors">
                        <ShoppingBag className="h-3 w-3 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{prod.name}</p>
                        <p className="text-[9px] text-white/20 uppercase font-black">{prod.category}</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-emerald-400">
                      R$ {(prod.base_price_cents / 100).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
