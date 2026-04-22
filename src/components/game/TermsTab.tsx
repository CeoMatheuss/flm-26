import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';

export function TermsTab() {
  return (
    <div className="space-y-3">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-center gap-3">
          <ScrollText className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-bold">Termos de Uso — FLM 26</p>
            <p className="text-[10px] text-muted-foreground">Última atualização: 22/04/2026</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">1. Aceitação dos termos</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>Ao criar uma conta no FLM 26 você concorda integralmente com estes Termos. Se não concordar, não utilize o jogo.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">2. Conta e segurança</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>Você é responsável pelo sigilo das suas credenciais. Cada usuário pode manter apenas 1 clube ativo. Múltiplas contas, scripts ou bots resultam em banimento permanente.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">3. Conduta no jogo</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>É proibido:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Combinar resultados, transferências falsas ou conluio entre clubes;</li>
            <li>Usar palavras ofensivas, racistas ou discriminatórias no chat global;</li>
            <li>Explorar bugs ou falhas — reporte na aba <strong>Suporte</strong>;</li>
            <li>Vender ou comprar contas fora da plataforma.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">4. Premium e pagamentos</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>O Premium tem validade de 30 dias após confirmação. Pagamentos via PIX são processados manualmente. Itens digitais não são reembolsáveis após ativação.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">5. Privacidade</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>Coletamos apenas e-mail, nome de exibição e dados de jogo. Nada é compartilhado com terceiros. Você pode solicitar exclusão da sua conta via Suporte.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">6. Banimentos</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>A administração pode banir contas que violem estes Termos, sem aviso prévio. Banimentos podem ser temporários (1-12 meses) ou permanentes.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">7. Alterações</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>Estes Termos podem ser atualizados a qualquer momento. Mudanças significativas serão comunicadas no Jornal e/ou notificações.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">8. Contato</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <p>Dúvidas? Use a aba <strong>Suporte</strong> dentro do jogo. Sua mensagem chega diretamente à equipe administrativa.</p>
        </CardContent>
      </Card>
    </div>
  );
}
