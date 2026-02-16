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
      '🎨 8 padrões de camisa: liso, listras verticais, horizontais, metade, diagonal, risca de giz, degradê, mangas coloridas',
      '👔 Personalização de gola (V, redonda, polo, henley) e tipo de manga (curta/longa)',
      '🎨 6 templates rápidos: Clássico, Seleção, Europeu, Moderno, Retrô, Elegante',
      '👁️ Pré-visualização em tempo real do uniforme completo com número do jogador',
      '🔓 Leilão de jogadores agora disponível para todos os jogadores (antes era Premium)',
      '🗑️ Removido sistema Premium e área Admin antigos (será reestruturado no futuro)',
      '📱 Melhorias de responsividade em telas menores para uniformes',
    ],
  },
  {
    version: '1.8.0',
    date: '16/02/2026',
    type: 'feature',
    items: [
      '🛡️ Sistema de hierarquia administrativa: Fundador → Admin → Jogador',
      '⭐ Fundador com controle total do jogo (adicionar/remover admins)',
      '📊 Painel Admin com estatísticas globais (jogadores, saves, mensagens, leilões, ligas)',
      '💳 Gerenciamento de pagamentos PIX Premium (aprovar/rejeitar)',
      '🔨 Sistema de banimentos com motivo e lista de banidos',
      '💬 Moderação do chat global (deletar mensagens ofensivas)',
      '👥 Aba Equipe exclusiva do Fundador para gerenciar administradores',
      '📋 Feed do Clube com reações da torcida e emojis interativos',
      '🗞️ Reações dinâmicas baseadas no OVR do jogador contratado',
    ],
  },
  {
    version: '1.7.0',
    date: '15/02/2026',
    type: 'feature',
    items: [
      '🎱 Novos atributos de jogador: Bola Parada, Posicionamento, Cabeceio e Marcação',
      '📰 Jornal expandido com mais categorias de notícias',
      '🏟️ Notícias de infraestrutura e estádio no jornal',
      '⚔️ Novos eventos no jornal: clássicos, recordes, clima e rivalidades',
      '🔄 Jornal agora pode ser expandido para ver todas as notícias de uma vez',
      '📊 Estatísticas detalhadas no jornal (artilheiro, garçom, média de idade/OVR)',
      '🏥 Indicador de jogadores no departamento médico no jornal',
    ],
  },
  {
    version: '1.6.0',
    date: '15/02/2026',
    type: 'feature',
    items: [
      '⚽ 14 formações táticas disponíveis (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, etc.)',
      '🎯 6 estilos táticos predefinidos: Tiki-Taka, Catenaccio, Gegenpress, Jogo Direto, Contra-Ataque, Posse Total',
      '📍 Configurações avançadas: tipo de marcação, estilo de passe, linha defensiva, largura do time',
      '©️ Funções especiais: capitão, cobrador de falta, cobrador de pênalti, cobrador de escanteio',
      '🏥 Indicador visual de jogadores lesionados na visualização 2D do campo',
      '👆 Clique nos jogadores no campo para atribuir funções especiais',
      '📐 Visualização 2D do campo com posições corretas para cada formação',
    ],
  },
  {
    version: '1.5.0',
    date: '15/02/2026',
    type: 'feature',
    items: [
      '🌍 12 ligas internacionais com 20 clubes reais cada',
      '🇧🇷 Brasil, 🇦🇷 Argentina, 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra, 🇪🇸 Espanha, 🇩🇪 Alemanha, 🇮🇹 Itália',
      '🇫🇷 França, 🇵🇹 Portugal, 🇳🇱 Holanda, 🇲🇽 México, 🇺🇸 EUA, 🇯🇵 Japão',
      '🗺️ Página "Ligas do Mundo" para visualizar e comparar todas as 12 ligas',
      '📊 Comparação de força média entre times de diferentes países',
      '📅 Temporada expandida para 38 rodadas (19 turno + 19 returno)',
      '🏆 Cada liga com seus próprios times e classificação independente',
    ],
  },
  {
    version: '1.4.0',
    date: '14/02/2026',
    type: 'feature',
    items: [
      '🚪 Botão de logout visível no cabeçalho para fácil acesso',
      '🏥 Sistema de lesões com diferentes gravidades e tempo de recuperação',
      '💊 Fisioterapia para acelerar recuperação de jogadores lesionados',
      '📋 Sistema de olheiros com 10 níveis de especialização',
      '🔍 Olheiros revelam atributos ocultos de jogadores do mercado',
      '📄 Gestão de contratos com renovação personalizada (duração e salário)',
      '🏷️ Lista de transferência para vender jogadores do seu elenco',
      '💰 Definição de preço mínimo ao colocar jogador à venda',
    ],
  },
  {
    version: '1.3.0',
    date: '14/02/2026',
    type: 'feature',
    items: [
      '📰 Sistema de Jornal "Diário do Futebol" com notícias dinâmicas',
      '😡 Protestos de organizadas após 3+ derrotas consecutivas',
      '⭐ Notícias automáticas de evolução de jogadores',
      '🏟️ Gerenciamento completo de estádio com nome personalizado',
      '🎟️ Sistema de ingressos com preços personalizáveis por setor',
      '💰 Renda de bilheteria calculada por jogo baseada na capacidade',
      '📈 Upgrade de estádio até 120.000 lugares (nível 15)',
    ],
  },
  {
    version: '1.2.0',
    date: '13/02/2026',
    type: 'feature',
    items: [
      '🤝 Modo Multiplayer Online com criação de ligas privadas',
      '🔑 Sistema de código para convidar amigos para sua liga',
      '💬 Chat em tempo real entre jogadores dentro de ligas multiplayer',
      '📨 Sistema de mensagens privadas entre membros da liga',
      '🔄 Propostas de troca de jogadores entre clubes (compra, venda, empréstimo)',
      '⚔️ Sistema de rivalidades que cresce conforme os confrontos',
      '🏆 Classificação multiplayer com pontos, gols e saldo',
      '⚡ Sincronização em tempo real via WebSocket',
    ],
  },
  {
    version: '1.1.0',
    date: '12/02/2026',
    type: 'feature',
    items: [
      '🎨 Criação de clube personalizado com escudo customizável',
      '🛡️ 6 padrões de escudo: listras, metade, faixa diagonal, quadrantes, círculo, gradiente',
      '🏗️ Sistema de infraestrutura com 4 instalações upgradáveis',
      '🏋️ Centro de Treinamento (acelera evolução do elenco)',
      '🎓 Academia de Base (forma jovens promissores)',
      '🏟️ Estádio (aumenta capacidade e renda)',
      '💊 Fisioterapia (acelera recuperação de lesões)',
      '🤝 Sistema de patrocínios com propostas baseadas na reputação',
      '📊 Aba de finanças detalhada com histórico de receitas e despesas',
      '👶 Academia de base com jovens promissores e potencial oculto',
    ],
  },
  {
    version: '1.0.0',
    date: '11/02/2026',
    type: 'feature',
    items: [
      '🎮 Lançamento oficial do FLM 26!',
      '⚽ Simulação realista de partidas com eventos (gols, cartões, substituições)',
      '👥 Gestão de elenco com 20+ jogadores e atributos detalhados',
      '🛒 Mercado de transferências com jogadores gerados proceduralmente',
      '🆓 Agentes livres disponíveis para contratação sem custo de transferência',
      '🏆 Sistema de liga com tabela de classificação, pontos e saldo de gols',
      '📅 Calendário de jogos com rodadas semanais',
      '💾 Salvamento automático na nuvem (nunca perca seu progresso)',
      '🔐 Login seguro com Google ou e-mail',
      '📱 Interface responsiva para jogar no celular ou computador',
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
