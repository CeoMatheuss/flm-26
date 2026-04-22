import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, ArrowUp, ArrowDown, Star, Bot, Calendar, Sparkles, Globe2, Medal } from 'lucide-react';

export function HowItWorksTab() {
  return (
    <div className="space-y-3">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Como o sistema funciona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[11px] text-muted-foreground">
            Visão geral da pirâmide competitiva, regras de subida/descida e ciclos de temporada.
          </p>
        </CardContent>
      </Card>

      {/* Pyramid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-400" /> Pirâmide de Tiers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { tier: 'Nacional', emoji: '🏆', color: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/40', desc: 'Elite do país (Div 1-4). Top do funil.', count: '20 clubes/divisão' },
            { tier: 'Regional', emoji: '🥇', color: 'from-blue-500/20 to-blue-500/5 border-blue-500/40', desc: 'Segundo nível regional. Acesso ao Nacional.', count: '20 clubes/liga' },
            { tier: 'Pré-Regional', emoji: '🥈', color: 'from-orange-500/20 to-orange-500/5 border-orange-500/40', desc: 'Sub-regional. Acesso ao Regional.', count: '20 clubes/liga' },
            { tier: 'Várzea', emoji: '⚽', color: 'from-amber-500/20 to-amber-500/5 border-amber-500/40', desc: 'Porta de entrada para novos players.', count: '20 clubes/liga' },
          ].map((t) => (
            <div key={t.tier} className={`p-3 rounded-lg bg-gradient-to-r border ${t.color}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{t.emoji}</span>
                  <div>
                    <p className="text-xs font-bold">{t.tier}</p>
                    <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px]">{t.count}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-blue-400" /> 20 clubes / liga
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">
              Toda liga oficial tem exatamente 20 clubes. Vagas que não forem ocupadas por humanos são
              preenchidas por <strong>bots</strong>. Quando um humano entra, substitui um bot.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <ArrowUp className="h-3.5 w-3.5 text-green-400" />
              <ArrowDown className="h-3.5 w-3.5 text-red-400" /> Subida & Descida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">
              Top 3 sobem e últimos 3 descem entre divisões adjacentes. Sequência:
              <strong> Nacional Div 1 ↔ Div 2 ↔ Regional ↔ Pré-Regional ↔ Várzea</strong>.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Star className="h-3.5 w-3.5 text-amber-400" /> Regra especial Várzea
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">
              <strong>1º colocado</strong> sobe direto para Pré-Regional.
              <strong> 2º–4º</strong> "sobem internamente" — vão para outra Várzea com mais reputação.
              Resto permanece. Vagas abertas viram bots.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" /> Entrada de novos players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">
              <code className="text-[9px] bg-muted px-1 rounded">auto_assign_league</code> aloca o novo
              jogador em uma <strong>Várzea com vaga</strong>. Se nenhuma tiver vaga, cria uma nova.
              Países lotados (max_capacity atingida) ficam <strong>travados</strong>.
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Ciclo de temporada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground">
              <strong>1 dia real = 1 dia de jogo</strong>. A temporada dura ~1 mês real.
            </p>
            <p className="text-[10px] text-muted-foreground">
              No <strong>último dia do mês</strong>, o cron <code className="text-[9px] bg-muted px-1 rounded">plan-season</code> roda automaticamente:
            </p>
            <ul className="text-[10px] text-muted-foreground space-y-0.5 ml-3">
              <li>• Calcula classificação final</li>
              <li>• Aplica promoções/rebaixamentos via <code>process_season_transition</code></li>
              <li>• Redistribui iniciantes via <code>redistribute_beginners</code></li>
              <li>• Distribui prêmios em dinheiro</li>
              <li>• Reseta estatísticas e abre nova temporada</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* International cups */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-primary" /> Competições Internacionais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-[10px] text-muted-foreground">
            Cada continente possui <strong>2 copas</strong> ao final da temporada, com classificação automática
            baseada na posição na liga + campeão da copa nacional.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="p-2 rounded-lg border border-yellow-500/40 bg-yellow-500/5">
              <p className="text-[11px] font-bold flex items-center gap-1 text-yellow-400">
                <Trophy className="h-3 w-3" /> 🥇 Principal (32 clubes)
              </p>
              <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5 ml-3">
                <li>• 1º–4º da Divisão 1 Nacional</li>
                <li>• Campeão da Copa Nacional</li>
                <li>• Se campeão já está no top 4 → vaga vai para o 5º</li>
                <li>• 8 grupos de 4 + mata-mata</li>
              </ul>
              <p className="text-[9px] text-muted-foreground mt-1.5 italic">
                Ex: Champions League, Libertadores, CONCACAF Champions.
              </p>
            </div>

            <div className="p-2 rounded-lg border border-slate-400/40 bg-slate-400/5">
              <p className="text-[11px] font-bold flex items-center gap-1 text-slate-300">
                <Medal className="h-3 w-3" /> 🥈 Secundária (32 clubes)
              </p>
              <ul className="text-[10px] text-muted-foreground mt-1 space-y-0.5 ml-3">
                <li>• 5º–8º da Divisão 1 Nacional</li>
                <li>• Eliminados da fase de grupos da Principal</li>
                <li>• Mesmo formato</li>
              </ul>
              <p className="text-[9px] text-muted-foreground mt-1.5 italic">
                Ex: Europa League, Sul-Americana, CAF Confederation.
              </p>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-muted/20 border border-border/40">
            <p className="text-[10px] font-semibold mb-1">📊 Distribuição final (sem bug)</p>
            <div className="text-[9px] text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-0.5">
              <span>1º → Principal</span><span>5º → Secundária</span>
              <span>2º → Principal</span><span>6º → Secundária</span>
              <span>3º → Principal</span><span>7º → Secundária</span>
              <span>4º → Principal</span><span>8º → Secundária</span>
              <span className="col-span-2 mt-1">🏆 Campeão Copa Nacional → Principal (ou próximo se duplicar)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ASCII pyramid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs">📊 Estrutura visual</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-[9px] font-mono text-muted-foreground whitespace-pre overflow-x-auto leading-tight">
{`              ┌──────────────────┐
              │ NACIONAL Div 1   │  ← topo (20 clubes)
              └────────┬─────────┘
                  ▲ 3↑ │ 3↓ ▼
              ┌────────┴─────────┐
              │ NACIONAL Div 2   │
              └────────┬─────────┘
                  ▲ 3↑ │ 3↓ ▼
            ┌──────────┴───────────┐
            │     REGIONAL         │
            └──────────┬───────────┘
                  ▲ 3↑ │ 3↓ ▼
          ┌────────────┴────────────┐
          │     PRÉ-REGIONAL        │
          └────────────┬────────────┘
                ▲ 1↑+3 internas
        ┌──────────────┴──────────────┐
        │   VÁRZEA (entrada)          │  ← novos players
        └─────────────────────────────┘`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
