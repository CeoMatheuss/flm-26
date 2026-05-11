import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Star, ShieldCheck, Zap, Sparkles, Clock } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'premium',
    name: 'Premium & VIP',
    description: 'Vantagens exclusivas e status de fundador',
    icon: <Star className="h-5 w-5 text-yellow-500" />,
    items: ['Plano VIP Mensal', 'Status de Fundador', 'Sem Anúncios'],
    status: 'coming_soon'
  },
  {
    id: 'customization',
    name: 'Personalização',
    description: 'Deixe seu clube com a sua cara',
    icon: <Sparkles className="h-5 w-5 text-purple-500" />,
    items: ['Escudos Exclusivos', 'Uniformes Épicos', 'Cores Customizadas'],
    status: 'coming_soon'
  },
  {
    id: 'boosts',
    name: 'Aceleradores',
    description: 'Evolua sua infraestrutura mais rápido',
    icon: <Zap className="h-5 w-5 text-blue-500" />,
    items: ['Obras Instantâneas', 'Recuperação de Stamina', 'Bônus de Treino'],
    status: 'coming_soon'
  },
  {
    id: 'security',
    name: 'Segurança & Gestão',
    description: 'Proteção extra para seu patrimônio',
    icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
    items: ['Seguro de Estádio Elite', 'Contratos de Longo Prazo', 'Proteção Anti-Multa'],
    status: 'coming_soon'
  }
];

export function ShopTab() {
  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-black tracking-tight">LOJA FLM</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Em breve você poderá adquirir itens exclusivos para turbinar sua jornada como Manager.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => (
          <Card key={cat.id} className="relative overflow-hidden border-border/40 bg-card/60 backdrop-blur-sm group hover:border-primary/30 transition-all duration-300">
            <div className="absolute top-0 right-0 p-3">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none flex items-center gap-1 py-1">
                <Clock className="h-3 w-3" />
                Em Breve
              </Badge>
            </div>
            
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 rounded-lg bg-background/80 border border-border/30 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{cat.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-1">{cat.description}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2 mt-2">
                {cat.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground/80 bg-background/40 p-2 rounded-md border border-border/10">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-primary/20 bg-primary/5">
        <CardContent className="p-6 text-center space-y-2">
          <h3 className="font-bold text-primary italic">SUGESTÕES?</h3>
          <p className="text-xs text-muted-foreground">
            Tem algum item que gostaria de ver na loja? Envie sua sugestão através do nosso Suporte!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
