import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMatchSimulation } from './useMatchSimulation';

// Mock Supabase simplificado para injetar dados via Promise.resolve
vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn()
          })
        })
      }),
      auth: { getUser: vi.fn() },
      channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnValue({ subscribe: vi.fn() }) }),
      removeChannel: vi.fn()
    }
  };
});

import { supabase } from '@/integrations/supabase/client';

describe('useMatchSimulation Data Injection', () => {
  it('should process match data correctly', async () => {
    const mockMatch = {
      id: 'test-id',
      home_team: 'Home FC',
      away_team: 'Away FC',
      stadium_name: 'Official Arena',
      stadium_capacity: 50000,
      started_at: new Date().toISOString(),
      status: 'live',
      events: [{ minute: 1, type: 'kickoff', description: 'Game started', team: 'home' }],
      home_goals: 1,
      away_goals: 0,
      duration_seconds: 720
    };

    // Forçamos o mock a retornar o que queremos
    (supabase.from as any)().select().eq().maybeSingle.mockResolvedValue({ data: mockMatch, error: null });

    const { result } = renderHook(() => useMatchSimulation());
    
    // Disparamos o carregamento
    await waitFor(async () => {
      await result.current.loadMatch('test-id');
    });

    // Verificamos se o estado final no hook bate com o mockado
    await waitFor(() => {
      expect(result.current.state.homeTeam).toBe('Home FC');
      expect(result.current.state.homeGoals).toBe(1);
    }, { timeout: 2000 });
  });
});

