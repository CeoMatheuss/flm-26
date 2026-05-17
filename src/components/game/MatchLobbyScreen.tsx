import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Bot, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  matchType: 'friendly' | 'league';
  matchId: string;
  userId: string;
  myClub: string;
  oppClub: string;
  onReady: () => void;       // both joined OR user accepted AI fallback
  onAutoSimulated: () => void; // 5min passed and user chose to leave to cron
  onCancel: () => void;
}

interface LobbyState {
  state: 'waiting_other' | 'one_ready' | 'both_ready' | 'start_with_ai';
  remaining_ms: number;
  home_joined: boolean;
  away_joined: boolean;
  at_least_one_joined?: boolean;
  home_user_id: string;
  away_user_id: string;
  auto_sim_at: string | null;
  kickoff_at?: string | null;
}

export function MatchLobbyScreen({ matchType, matchId, userId, myClub, oppClub, onReady, onAutoSimulated, onCancel }: Props) {
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [opponentOnline, setOpponentOnline] = useState<boolean | null>(null);
  const polledRef = useRef(false);

  const join = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Sessão expirada'); onCancel(); return; }
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match-lobby-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ match_type: matchType, match_id: matchId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erro ao entrar no lobby'); return; }
      setLobby(data);
      setSecondsLeft(Math.ceil(data.remaining_ms / 1000));
      // Check opponent presence
      const oppId = userId === data.home_user_id ? data.away_user_id : data.home_user_id;
      if (oppId) {
        const { data: presence } = await supabase
          .from('user_presence')
          .select('is_online, last_seen')
          .eq('user_id', oppId)
          .maybeSingle();
        if (presence) {
          const recent = presence.last_seen && (Date.now() - new Date(presence.last_seen).getTime()) < 90_000;
          setOpponentOnline(!!presence.is_online && recent);
        } else {
          setOpponentOnline(false);
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro de conexão');
    }
  }, [matchType, matchId, userId, onCancel]);

  useEffect(() => {
    if (polledRef.current) return;
    polledRef.current = true;
    join();
    const interval = setInterval(join, 6000);
    return () => clearInterval(interval);
  }, [join]);

  // Countdown
  useEffect(() => {
    if (!lobby) return;
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lobby]);

  // Auto-trigger when both ready
  useEffect(() => {
    if (lobby?.state === 'both_ready') {
      toast.success('🟢 Ambos os jogadores conectados!');
      const t = setTimeout(onReady, 800);
      return () => clearTimeout(t);
    }
  }, [lobby?.state, onReady]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const expired = secondsLeft === 0 && lobby && lobby.state !== 'both_ready';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/30 shadow-xl">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-1">
            <div className="flex justify-center mb-2">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h2 className="text-lg font-bold">Lobby da Partida</h2>
            <p className="text-xs text-muted-foreground">Aguardando os dois técnicos entrarem</p>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Você</p>
              <p className="text-sm font-bold truncate">{myClub}</p>
              <Badge className="text-[9px] mt-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">🟢 Conectado</Badge>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">Adversário</p>
              <p className="text-sm font-bold truncate">{oppClub}</p>
              <Badge className={`text-[9px] mt-1 ${
                lobby && (userId === lobby.home_user_id ? lobby.away_joined : lobby.home_joined)
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : opponentOnline
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {lobby && (userId === lobby.home_user_id ? lobby.away_joined : lobby.home_joined)
                  ? '🟢 Conectado'
                  : opponentOnline
                  ? '🟡 Online (não entrou)'
                  : opponentOnline === false
                  ? '🔴 Offline'
                  : '⏳ Verificando...'}
              </Badge>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                {expired ? 'Tempo esgotado' : 'Janela de espera'}
              </p>
            </div>
            <p className="text-3xl font-mono font-bold tabular-nums text-primary">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {lobby?.at_least_one_joined
                ? '✅ Você entrou — a partida não será simulada automaticamente'
                : expired
                ? 'Ninguém compareceu — será simulada automaticamente'
                : 'Se nenhum técnico entrar, a partida será simulada automaticamente'}
            </p>
          </div>

          {/* Status visual */}
          {lobby && (
            <div className="text-center">
              <Badge className={`text-[10px] ${
                lobby.state === 'both_ready' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                lobby.state === 'one_ready' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                lobby.state === 'start_with_ai' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                'bg-muted text-muted-foreground'
              }`}>
                {lobby.state === 'both_ready' ? '🟢 Partida iniciando' :
                 lobby.state === 'one_ready' ? '🔵 Jogador conectado — pronto para iniciar' :
                 lobby.state === 'start_with_ai' ? '🤖 Simulação automática' :
                 '⏳ Aguardando jogadores'}
              </Badge>
            </div>
          )}

          {/* Actions */}
          {!lobby && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {lobby?.state === 'waiting_other' && !expired && (
            <div className="text-center text-xs text-muted-foreground italic">
              Aguardando {oppClub}...
            </div>
          )}

          {lobby?.state === 'both_ready' && (
            <Button onClick={onReady} className="w-full h-11 gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Play className="h-4 w-4" /> INICIAR PARTIDA AGORA
            </Button>
          )}

          {/* Basta 1 jogador entrar para poder iniciar (contra IA do ausente). Sem auto-sim. */}
          {lobby?.state === 'one_ready' && (
            <Button onClick={onReady} className="w-full h-11 gap-2 bg-blue-600 hover:bg-blue-700">
              <Play className="h-4 w-4" /> Iniciar contra IA do adversário
            </Button>
          )}

          {(lobby?.state === 'start_with_ai' || expired) && !lobby?.at_least_one_joined && (
            <div className="space-y-2">
              <Button onClick={onReady} className="w-full h-11 gap-2">
                <Bot className="h-4 w-4" /> Jogar contra IA do adversário
              </Button>
              <Button onClick={onAutoSimulated} variant="outline" className="w-full h-10 text-xs gap-1.5">
                🤖 Deixar simular automaticamente
              </Button>
            </div>
          )}

          <Button onClick={onCancel} variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
            Cancelar e voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
