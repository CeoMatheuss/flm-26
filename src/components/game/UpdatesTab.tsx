import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wrench, Plus, Bug } from 'lucide-react';

interface Update {
  version: string;
  date: string;
  type: 'feature' | 'improvement' | 'fix';
  items: string[];
}

const updates: Update[] = [
  {
    version: '1.9.0',
    date: '16/02/2026',
    type: 'feature',
    items: [
      '🎽 Sistema completo de uniformes personalizados (titular, visitante, alternativo, goleiro)',
      '🎨 8 padrões de camisa: liso, listras, horizontais, metade, diagonal, risca de giz, degradê, mangas',
      '👔 Personalização de gola (V, redonda, polo, henley) e tipo de manga (curta/longa)',
      '🎨 6 templates rápidos: Clássico, Seleção, Europeu, Moderno, Retrô, Elegante',
      '👁️ Pré-visualização em tempo real do uniforme completo com número',
      '🔓 Leilão de jogadores agora disponível para todos os jogadores',
      '🗑️ Removido sistema Premium e área Admin (será reestruturado)',
    ],
  },
  {
    version: '1.7.0',
    date: '15/02/2026',
    type: 'feature',
    items: [
      '🎱 Novos atributos: Bola Parada, Posicionamento, Cabeceio e Marcação',
      '📰 Jornal expandido com mais notícias: estádio, recordes, clássicos, clima',
      '🔄 Jornal agora pode ser expandido para ver todas as notícias',
      '🏟️ Notícias de infraestrutura e estádio no jornal',
      '⚔️ Novos eventos: clássicos, recordes, clima',
    ],
  },
  {
    version: '1.6.0',
    date: '15/02/2026',
    type: 'feature',
    items: [
      '⚽ 14 formações táticas disponíveis (antes eram 5)',
      '🎯 6 estilos predefinidos: Tiki-Taka, Catenaccio, Gegenpress, etc.',
      '📍 Configurações avançadas: marcação, passe, linha defensiva, largura',
      '©️ Funções especiais: capitão, cobrador de falta, pênalti, escanteio',
      '🏥 Indicador de jogadores lesionados na visualização 2D',
      '👆 Clique nos jogadores no campo para atribuir funções',
    ],
  },
  {
    version: '1.5.0',
    date: '15/02/2026',
    type: 'feature',
    items: [
      '🌍 20 clubes em cada liga (antes eram menos)',
      '🗺️ Página "Ligas do Mundo" para visualizar todas as 12 ligas',
      '📊 Comparação de força entre times de diferentes países',
      '📅 Temporada expandida para 38 rodadas (turno e returno)',
    ],
  },
  {
    version: '1.4.0',
    date: '14/02/2026',
    type: 'feature',
    items: [
      '🚪 Botão de logout visível no cabeçalho',
      '🏥 Sistema de lesões com fisioterapia',
      '📋 Sistema de olheiros com 10 níveis',
      '📄 Gestão de contratos com renovação personalizada',
      '🏷️ Lista de transferência para vender jogadores',
    ],
  },
  {
    version: '1.3.0',
    date: '14/02/2026',
    type: 'feature',
    items: [
      '📰 Sistema de Jornal (Diário do Futebol)',
      '😡 Protestos de organizadas após 3+ derrotas seguidas',
      '⭐ Notícias de evolução de jogadores',
      '🏟️ Gerenciamento de estádio com ingressos personalizáveis',
    ],
  },
  {
    version: '1.2.0',
    date: '13/02/2026',
    type: 'feature',
    items: [
      '🤝 Modo Multiplayer Online com ligas',
      '💬 Chat entre jogadores em ligas multiplayer',
      '📨 Propostas de troca entre clubes',
      '⚔️ Sistema de rivalidades',
    ],
  },
  {
    version: '1.1.0',
    date: '12/02/2026',
    type: 'feature',
    items: [
      '🎨 Criação de clube personalizado com escudo',
      '🏗️ Sistema de infraestrutura (CT, Academia, Estádio, Fisio)',
      '🤝 Sistema de patrocínios',
      '📊 Aba de finanças detalhada',
      '🎓 Academia de base com jovens promissores',
    ],
  },
  {
    version: '1.0.0',
    date: '11/02/2026',
    type: 'feature',
    items: [
      '🎮 Lançamento do FLM 26!',
      '⚽ Simulação de partidas',
      '👥 Gestão de elenco com 20 jogadores',
      '🛒 Mercado de transferências',
      '🏆 Sistema de liga com tabela de classificação',
      '💾 Salvamento automático na nuvem',
    ],
  },
];

const typeIcons = {
  feature: { icon: Plus, label: 'Novo', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  improvement: { icon: Wrench, label: 'Melhoria', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  fix: { icon: Bug, label: 'Correção', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
};

export function UpdatesTab() {
  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-bold text-primary">📋 Histórico de Atualizações</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Todas as novidades e melhorias do FLM 26</p>
          </div>
          <Badge className="ml-auto text-[10px]">v{updates[0].version}</Badge>
        </CardContent>
      </Card>

      {updates.map((update) => {
        const typeInfo = typeIcons[update.type];
        return (
          <Card key={update.version}>
            <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
              <CardTitle className="text-sm sm:text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[9px] ${typeInfo.color}`}>
                    <typeInfo.icon className="h-2.5 w-2.5 mr-0.5" /> {typeInfo.label}
                  </Badge>
                  <span>v{update.version}</span>
                </div>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">{update.date}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <ul className="space-y-1">
                {update.items.map((item, i) => (
                  <li key={i} className="text-[10px] sm:text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">▸</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
