/**
 * TrainingHelpPopup — Modal de ajuda para o sistema de treinamento V3.
 * Aceita prop `section` opcional para abrir num tópico específico.
 */
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export type HelpSection = 'overview' | 'ct' | 'group' | 'specific' | 'intensity' | 'progress' | 'matches';

interface Props {
  open: boolean;
  onClose: () => void;
  section?: HelpSection;
}

const sections: { key: HelpSection; emoji: string; title: string; body: string }[] = [
  {
    key: 'overview',
    emoji: '🧠',
    title: 'Como funciona o Treinamento',
    body: 'O treino NÃO evolui o jogador na hora. Ele acumula progresso (%) que, ao atingir 100%, gera +1 no atributo principal. Sistema realista, estratégico e progressivo.',
  },
  {
    key: 'ct',
    emoji: '🏟️',
    title: 'Centro de Treinamento (CT)',
    body: 'Define a velocidade de evolução. Níveis 1–30. Cada nível aumenta a eficiência semanal: Lv 1 = 1.0% / Lv 15 = 7.0% / Lv 30 = 15.0% por semana.',
  },
  {
    key: 'group',
    emoji: '👥',
    title: 'Treino por Grupo',
    body: 'Evolução equilibrada entre vários atributos. Ex: FINALIZAÇÃO → finalização (alto), chute de longe (médio), cabeceio (baixo). Bom para evolução geral.',
  },
  {
    key: 'specific',
    emoji: '🎯',
    title: 'Treino Específico',
    body: 'Foco total em 1 atributo. Mais rápido naquele atributo, mas pior evolução geral. Bom para corrigir pontos fracos.',
  },
  {
    key: 'intensity',
    emoji: '⚙️',
    title: 'Intensidade',
    body: '🟢 Leve = seguro, lento. 🟡 Médio = equilibrado. 🔴 Pesado = mais evolução + mais risco de lesão e perda de moral.',
  },
  {
    key: 'progress',
    emoji: '📊',
    title: 'Progresso e Status',
    body: 'Status: 🔥 Evoluindo rápido (≥8%/sem) • ⚖️ Normal (4-8%) • 🐢 Lento (1-4%) • ❌ Travado (lesão/idade).',
  },
  {
    key: 'matches',
    emoji: '⚽',
    title: 'Partidas aceleram',
    body: 'Jogar partidas adiciona +0.5% de progresso por minuto jogado. Treinar sem jogar = evolução lenta. Jogar + treinar = evolução rápida.',
  },
];

export function TrainingHelpPopup({ open, onClose, section }: Props) {
  const [highlightKey, setHighlightKey] = useState<HelpSection | undefined>(section);

  useEffect(() => {
    if (open && section) setHighlightKey(section);
  }, [open, section]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            ❓ Como funciona o Treinamento
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-3">
            {sections.map((s) => (
              <div
                key={s.key}
                className={`rounded-lg border p-3 transition-colors ${
                  highlightKey === s.key
                    ? 'border-primary bg-primary/10'
                    : 'border-border/30 bg-muted/10'
                }`}
              >
                <p className="font-bold text-sm flex items-center gap-2">
                  <span className="text-base">{s.emoji}</span> {s.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button onClick={onClose} className="w-full mt-2">Entendi</Button>
      </DialogContent>
    </Dialog>
  );
}
