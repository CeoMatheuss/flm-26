import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';

export function TermsTab() {
  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <ScrollText className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-bold">Termos de Uso e Política de Privacidade — FLM 26</p>
            <p className="text-[10px] text-muted-foreground">Última atualização: 11/05/2026</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">1. Aceitação dos termos</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>Ao criar uma conta no FLM 26 você concorda integralmente com estes Termos. O uso de automações (bots), scripts ou exploração de bugs para benefício próprio é estritamente proibido.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">2. Conta e Multi-contas</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>Cada usuário físico tem direito a apenas 1 (um) clube. O uso de múltiplas contas para transferências facilitadas ou conluio resultará em banimento permanente de todos os envolvidos.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">3. Conduta e Fair Play</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>Respeite os adversários no chat global. Ofensas, toxicidade ou spam não serão tolerados. O sistema de leilão deve ser usado de forma justa; bances falsos serão auditados.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">4. Economia e Premium</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>Vantagens Premium são válidas por 30 dias. Itens digitais não possuem valor monetário fora do jogo e não são reembolsáveis após o consumo das funcionalidades.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">5. Dados e Privacidade</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>Seus dados de jogo são armazenados de forma segura. Não compartilhamos e-mails com terceiros. Ao deletar sua conta, todos os dados sensíveis são removidos permanentemente.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">6. Suporte e Denúncias</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <p>Qualquer infração deve ser reportada via aba Suporte. A administração reserva-se o direito de suspender contas para investigação de atividades suspeitas.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
