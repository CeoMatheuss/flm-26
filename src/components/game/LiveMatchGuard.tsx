import { toast } from 'sonner';
import { useActiveMatch } from '@/hooks/useActiveMatch';

/**
 * Hook helper: retorna uma função `guard` que envolve qualquer ação sensível.
 * Se houver partida ao vivo, exibe toast e bloqueia a execução.
 */
export function useLiveMatchGuard() {
  const { isInLiveMatch } = useActiveMatch();

  const guard = <T extends (...args: any[]) => any>(fn: T): T => {
    return ((...args: any[]) => {
      if (isInLiveMatch) {
        toast.error('🔒 Ação indisponível durante a partida', {
          description: 'Aguarde o fim do jogo para fazer alterações no elenco/finanças',
          duration: 4000,
        });
        return undefined;
      }
      return fn(...args);
    }) as T;
  };

  return { guard, isInLiveMatch };
}

/**
 * Função utilitária standalone — usa quando não tem como chamar hook.
 */
export function showLiveMatchBlockToast() {
  toast.error('🔒 Ação indisponível durante a partida', {
    description: 'Aguarde o fim do jogo para fazer alterações no elenco/finanças',
    duration: 4000,
  });
}
