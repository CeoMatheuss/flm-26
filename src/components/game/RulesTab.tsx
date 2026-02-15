import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, ShoppingCart, Trophy, Swords, Building2, Target, DollarSign, GraduationCap, Shield, ArrowLeftRight } from 'lucide-react';

export function RulesTab() {
  const sections = [
    {
      icon: Users,
      title: 'Elenco',
      rules: [
        'O elenco inicial possui 20 jogadores com OVR máximo de 55.',
        'Cada jogador possui 10 atributos: Velocidade, Finalização, Passe, Defesa, Físico, Drible, Bola Parada, Posicionamento, Cabeceio e Marcação.',
        'Jogadores evoluem automaticamente a cada 10 jogos disputados.',
        'A chance de evolução depende do nível do Centro de Treinamento.',
        'Jogadores acima de 33 anos podem perder atributos a cada temporada.',
        'Jogadores com contrato expirando saem do clube ao fim da temporada.',
        'Lesões podem ocorrer após partidas (30% de chance). Stamina baixa e idade avançada aumentam a gravidade.',
      ],
    },
    {
      icon: ShoppingCart,
      title: 'Mercado de Transferências',
      rules: [
        'Jogadores do mercado possuem valor baseado no OVR e idade.',
        'Jogadores jovens (<25a) custam 30% a mais. Veteranos (>30a) custam 30% a menos.',
        'Venda de jogadores rende 80% do valor de mercado.',
        'Para vender, o jogador deve ser listado primeiro (ícone 🏷️ no Elenco).',
        'O elenco mínimo é de 11 jogadores — não é possível vender abaixo disso.',
        'Jogadores livres (Free Agents) têm OVR oculto — contrate olheiros para revelá-lo.',
        'Ao contratar um agente livre, você define o salário mensal.',
      ],
    },
    {
      icon: ArrowLeftRight,
      title: 'Empréstimos',
      rules: [
        'Cada clube pode emprestar no máximo 3 jogadores por temporada.',
        'O empréstimo tem duração fixa de 1 temporada.',
        'O clube que recebe o jogador emprestado arca com 100% do salário.',
        'Jogadores emprestados retornam automaticamente ao fim da temporada.',
        'Não é possível vender um jogador emprestado.',
        'Jogadores emprestados não podem ser emprestados novamente.',
        'O elenco deve manter pelo menos 11 jogadores após o empréstimo.',
      ],
    },
    {
      icon: Target,
      title: 'Táticas',
      rules: [
        '14 formações disponíveis (4-4-2, 4-3-3, 3-5-2, etc.).',
        '6 estilos predefinidos: Tiki-Taka, Catenaccio, Contra-Ataque, Gegenpress, Jogo Bonito, Retranca.',
        'Configurações avançadas: mentalidade, pressão, ritmo, marcação, passe, linha defensiva e largura.',
        'Defina capitão, cobrador de falta, pênalti e escanteio.',
        'Estilo ofensivo dá +5 de bônus, defensivo dá -3. Pressão alta +3, baixa -2.',
      ],
    },
    {
      icon: Swords,
      title: 'Partidas',
      rules: [
        'A temporada tem 38 rodadas (turno e returno completo).',
        'Gols são calculados com base na força média do elenco vs oponente.',
        'Vitória: +3 pontos. Empate: +1 ponto. Derrota: 0 pontos.',
        'Receita por jogo: premiação + receita de bilheteria + patrocínios.',
        'Goleadas (3+ gols de diferença) dão bônus extra de torcedores.',
      ],
    },
    {
      icon: Trophy,
      title: 'Liga & Temporada',
      rules: [
        'Cada liga possui 20 clubes (19 bots + seu time).',
        '12 ligas disponíveis em diferentes países.',
        'Ao encerrar a temporada: jogadores envelhecem, contratos diminuem, salários são pagos.',
        'Premiação de fim de temporada: 1º = R$5M, Top 4 = R$2M, Demais = R$500k.',
        'Reputação aumenta ao terminar no Top 4 (+5) e diminui fora (-2).',
      ],
    },
    {
      icon: DollarSign,
      title: 'Finanças',
      rules: [
        'Receitas: bilheteria, premiações, patrocínios, vendas de jogadores.',
        'Despesas: salários, transferências, renovações, infraestrutura.',
        'Salários são pagos semanalmente (a cada partida).',
        'Patrocinadores pagam mensalmente e têm duração limitada.',
      ],
    },
    {
      icon: Building2,
      title: 'Infraestrutura',
      rules: [
        '4 instalações: Centro de Treinamento, Academia de Base, Estádio e Fisioterapia.',
        'Cada instalação tem 10 níveis de upgrade.',
        'CT: aumenta chance de evolução dos jogadores.',
        'Academia: melhora OVR mínimo/máximo dos jovens da base.',
        'Estádio: aumenta capacidade, bilheteria e bônus de torcedores.',
        'Fisioterapia: reduz tempo de recuperação de lesões.',
      ],
    },
    {
      icon: GraduationCap,
      title: 'Base / Juvenil',
      rules: [
        'Invista mensalmente para gerar jovens talentos.',
        'Quanto maior o investimento, mais jovens aparecem.',
        'O nível da Academia influencia o potencial dos jovens.',
        'Jovens podem ser promovidos ao time principal a qualquer momento.',
        'Jovens evoluem automaticamente entre temporadas.',
      ],
    },
    {
      icon: Shield,
      title: 'Olheiros',
      rules: [
        '10 níveis de olheiros disponíveis (Amador → Gênio Supremo).',
        'Olheiros revelam atributos de jogadores livres.',
        'Relatórios são gerados a cada 5 partidas.',
        'Quanto maior a habilidade do olheiro, mais preciso o relatório.',
        'Contratos de olheiros duram 2 temporadas.',
      ],
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3 sm:p-4 flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-bold text-primary">📖 Manual do Jogo</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Todas as regras e mecânicas do FLM 26</p>
          </div>
        </CardContent>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <section.icon className="h-4 w-4 text-primary" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <ul className="space-y-1.5">
              {section.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-[10px] sm:text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 shrink-0 mt-0.5">{i + 1}</Badge>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
