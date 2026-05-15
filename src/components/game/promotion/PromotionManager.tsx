import React, { useState, useEffect } from 'react';
import { YouthProspect } from '@/types/infrastructure';
import { Player } from '@/types/game';
import { PromotionEvent, PromotionDecision } from '@/types/promotion';
import { PromotionDialog } from './PromotionDialog';
import { ContractNegotiationModal } from './ContractNegotiationModal';
import { toast } from 'sonner';

interface PromotionManagerProps {
  youthProspects: YouthProspect[];
  onDecision: (prospectId: string, decision: PromotionDecision, contractDetails?: any) => void;
  clubBudget: number;
}

export function PromotionManager({ youthProspects, onDecision, clubBudget }: PromotionManagerProps) {
  const [activeEvent, setActiveEvent] = useState<PromotionEvent | null>(null);
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Look for new ready prospects
    const readyProspect = youthProspects.find(p => p.promotionReady && !processedIds.has(p.id));
    
    if (readyProspect && !activeEvent) {
      setActiveEvent({
        id: crypto.randomUUID(),
        prospect: readyProspect,
        status: 'notified',
        createdAt: new Date().toISOString(),
      });
      setProcessedIds(prev => new Set(prev).add(readyProspect.id));
    }
  }, [youthProspects, processedIds, activeEvent]);

  if (!activeEvent) return null;

  const handleInitialDecision = (decision: PromotionDecision) => {
    if (decision === 'promoted') {
      setShowNegotiation(true);
    } else {
      onDecision(activeEvent.prospect.id, decision);
      setActiveEvent(null);
    }
  };

  const handleNegotiationComplete = (accepted: boolean, contractDetails?: any) => {
    if (accepted) {
      onDecision(activeEvent.prospect.id, 'promoted', contractDetails);
    } else {
      // Player might get unhappy or stay in base
      onDecision(activeEvent.prospect.id, 'stayed');
      toast.error(`${activeEvent.prospect.name} recusou o contrato e continuará na base.`);
    }
    setActiveEvent(null);
    setShowNegotiation(false);
  };

  return (
    <>
      <PromotionDialog 
        open={!!activeEvent && !showNegotiation} 
        onOpenChange={(open) => !open && setActiveEvent(null)}
        prospect={activeEvent.prospect}
        onDecision={handleInitialDecision}
      />
      
      {showNegotiation && (
        <ContractNegotiationModal
          open={showNegotiation}
          onOpenChange={setShowNegotiation}
          prospect={activeEvent.prospect}
          onComplete={handleNegotiationComplete}
          clubBudget={clubBudget}
        />
      )}
    </>
  );
}
