import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Clock, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

interface Props {
  onBack: () => void;
}

type RequestStatus = 'pending' | 'approved' | 'rejected' | null;

export function BetaAccessRequestForm({ onBack }: Props) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusCheck, setStatusCheck] = useState<{ status: RequestStatus; whitelisted: boolean } | null>(null);

  const checkExisting = async (mail: string) => {
    const lower = mail.trim().toLowerCase();
    if (!lower) return null;

    const { data, error } = await supabase.rpc('check_beta_access', { _email: lower });
    if (error) {
      console.error('check_beta_access error', error);
      return { whitelisted: false, status: null as RequestStatus };
    }
    const result = (data ?? {}) as { whitelisted?: boolean; status?: string | null };
    return {
      whitelisted: !!result.whitelisted,
      status: (result.status as RequestStatus) ?? null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lower = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
      toast.error('Informe um email válido');
      return;
    }
    setLoading(true);
    try {
      const existing = await checkExisting(lower);
      if (existing?.whitelisted) {
        setStatusCheck({ status: 'approved', whitelisted: true });
        toast.success('Você já está aprovado! Volte e crie sua conta.');
        return;
      }
      if (existing?.status === 'pending') {
        setStatusCheck(existing);
        toast.info('Você já tem uma solicitação pendente.');
        return;
      }
      if (existing?.status === 'rejected') {
        setStatusCheck(existing);
        toast.error('Sua solicitação anterior foi recusada.');
        return;
      }

      const { error } = await supabase.from('beta_access_requests').insert({
        email: lower,
        message: message.trim().slice(0, 500),
      });
      if (error) {
        if (error.code === '23505') {
          toast.info('Já existe uma solicitação para este email.');
          setStatusCheck({ status: 'pending', whitelisted: false });
        } else {
          toast.error('Erro ao enviar solicitação');
          console.error(error);
        }
      } else {
        toast.success('Solicitação enviada! Aguarde aprovação.');
        setStatusCheck({ status: 'pending', whitelisted: false });
      }
    } finally {
      setLoading(false);
    }
  };

  if (statusCheck) {
    const { status, whitelisted } = statusCheck;
    const isApproved = whitelisted || status === 'approved';
    const isRejected = status === 'rejected';

    return (
      <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl">
        <CardContent className="p-6 space-y-5 text-center">
          {isApproved ? (
            <>
              <div className="mx-auto w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-xl font-black">Acesso Aprovado! 🎉</h2>
              <p className="text-sm text-muted-foreground">
                Seu email está na whitelist do BETA. Agora você pode criar sua conta normalmente.
              </p>
            </>
          ) : isRejected ? (
            <>
              <div className="mx-auto w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-black">Acesso Negado</h2>
              <p className="text-sm text-muted-foreground">
                Você não tem permissão para acessar o jogo no momento.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center">
                <Clock className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-black">Solicitação Enviada</h2>
              <p className="text-sm text-muted-foreground">
                Aguarde a aprovação do administrador. Você pode voltar aqui depois para verificar o status.
              </p>
              <Badge variant="secondary" className="text-xs">{email}</Badge>
            </>
          )}

          <Button variant="outline" size="sm" onClick={onBack} className="w-full text-xs gap-1">
            <ArrowLeft className="w-3 h-3" /> Voltar ao início
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl">
      <CardContent className="p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-black">Acesso BETA</h2>
          <p className="text-xs text-muted-foreground">
            O FLM 26 está em fase fechada de testes. Solicite acesso e aguarde aprovação para criar sua conta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Seu email (Gmail recomendado)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-11 text-sm pl-9"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">Mensagem (opcional)</label>
            <Input
              placeholder="Conte por que quer testar o jogo"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              className="h-11 text-sm"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 font-bold gap-2">
            {loading ? 'Enviando...' : 'Solicitar Acesso ao BETA'}
          </Button>
        </form>

        <Button variant="ghost" size="sm" onClick={onBack} className="w-full text-xs text-muted-foreground gap-1">
          <ArrowLeft className="w-3 h-3" /> Voltar
        </Button>
      </CardContent>
    </Card>
  );
}
