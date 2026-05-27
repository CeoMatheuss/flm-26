import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type HighlightType = 'new_signing' | 'listed_loan' | 'transferred' | 'listed_sale';

export interface PlayerHighlight {
  playerId: string;
  type: HighlightType;
  timestamp: number;
}

interface PlayerHighlightContextType {
  highlights: Record<string, PlayerHighlight>;
  addHighlight: (playerId: string, type: HighlightType) => void;
  removeHighlight: (playerId: string) => void;
  isHighlighted: (playerId: string) => boolean;
}

const PlayerHighlightContext = createContext<PlayerHighlightContextType | undefined>(undefined);

export const PlayerHighlightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highlights, setHighlights] = useState<Record<string, PlayerHighlight>>({});

  const addHighlight = useCallback((playerId: string, type: HighlightType) => {
    setHighlights(prev => ({
      ...prev,
      [playerId]: {
        playerId,
        type,
        timestamp: Date.now()
      }
    }));

    // Auto-remove after 10 seconds if not closed manually
    setTimeout(() => {
      setHighlights(prev => {
        const newHighlights = { ...prev };
        if (newHighlights[playerId] && Date.now() - newHighlights[playerId].timestamp >= 10000) {
          delete newHighlights[playerId];
        }
        return newHighlights;
      });
    }, 10000);
  }, []);

  const removeHighlight = useCallback((playerId: string) => {
    setHighlights(prev => {
      const newHighlights = { ...prev };
      delete newHighlights[playerId];
      return newHighlights;
    });
  }, []);

  const isHighlighted = useCallback((playerId: string) => {
    return !!highlights[playerId];
  }, [highlights]);

  return (
    <PlayerHighlightContext.Provider value={{ highlights, addHighlight, removeHighlight, isHighlighted }}>
      {children}
    </PlayerHighlightContext.Provider>
  );
};

export const usePlayerHighlight = () => {
  const context = useContext(PlayerHighlightContext);
  if (!context) {
    throw new Error('usePlayerHighlight must be used within a PlayerHighlightProvider');
  }
  return context;
};
