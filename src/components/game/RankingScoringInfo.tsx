import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Mode = 'clubs' | 'players';

interface Props {
  mode: Mode;
  className?: string;
}

const CLUB_RULES = [
  { label: 'Vitória', value: '+3 pts' },
  { label: 'Empate', value: '+1 pt' },
  { label: 'Derrota', value: '0 pt' },
  { label: 'Saldo de gols (V)', value: '+0,1/gol' },
  { label: 'Título nacional', value: '+50 pts' },
  { label: 'Título internacional', value: '+100 pts' },
  { label: 'Acesso de divisão', value: '+25 pts' },
];

const PLAYER_RULES_LINE = [
  { label: 'Gol marcado', value: '+5 pts' },
  { label: 'Assistência', value: '+3 pts' },
  { label: 'Nota média da partida', value: 'multiplicador' },
];

const PLAYER_RULES_GK = [
  { label: 'Jogo sem sofrer gol', value: '+5 pts' },
  { label: 'Pênalti defendido', value: '+6 pts' },
  { label: 'Nota média da partida', value: 'multiplicador' },
];

export function RankingScoringInfo({ mode, className }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`h-10 w-10 bg-background/40 border-white/10 hover:bg-primary/10 hover:border-primary/30 rounded-xl ${className ?? ''}`}
          aria-label="Como funciona a pontuação"
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 overflow-hidden border-white/10 bg-card/95 backdrop-blur-xl"
      >
        <div className="p-4 border-b border-white/5 bg-gradient-to-br from-primary/15 to-transparent">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
            Como funciona
          </p>
          <p className="text-base font-black mt-0.5">
            {mode === 'clubs' ? 'Pontuação de Clubes' : 'Pontuação de Jogadores'}
          </p>
        </div>

        <div className="p-4 space-y-4 text-sm">
          {mode === 'clubs' ? (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A cada partida oficial concluída, o clube recebe pontos de acordo com o resultado e
                conquistas da temporada.
              </p>
              <ul className="space-y-1.5">
                {CLUB_RULES.map((r) => (
                  <li
                    key={r.label}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-background/40 border border-white/5"
                  >
                    <span className="text-foreground/80">{r.label}</span>
                    <span className="font-bold text-primary tabular-nums">{r.value}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground italic">
                Partidas amistosas não contam. O ranking é mundial e atualiza em tempo real após cada
                jogo simulado.
              </p>
            </>
          ) : (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                  Jogadores de linha
                </p>
                <ul className="space-y-1.5">
                  {PLAYER_RULES_LINE.map((r) => (
                    <li
                      key={r.label}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-background/40 border border-white/5"
                    >
                      <span className="text-foreground/80">{r.label}</span>
                      <span className="font-bold text-primary tabular-nums">{r.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1.5">
                  Goleiros
                </p>
                <ul className="space-y-1.5">
                  {PLAYER_RULES_GK.map((r) => (
                    <li
                      key={r.label}
                      className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-background/40 border border-white/5"
                    >
                      <span className="text-foreground/80">{r.label}</span>
                      <span className="font-bold text-primary tabular-nums">{r.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[11px] text-muted-foreground italic">
                A nota média influencia diretamente a pontuação final. Pontos são somados após cada
                partida oficial.
              </p>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
