import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMatchSimulation } from './useMatchSimulation';
// removido import duplicado abaixo

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const mockSingle = vi.fn();
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: mockSingle,
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn()
          }))
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn()
    }))
  }));

  return {
    supabase: {
      from: mockFrom,
      functions: { invoke: vi.fn() },
      auth: { getUser: vi.fn() },
      channel: vi.fn(() => ({ on: vi.fn(() => ({ subscribe: vi.fn() })) })),
      removeChannel: vi.fn()
    }
  };
});

// Importante para acessar o mock
import { supabase } from '@/integrations/supabase/client';


describe('useMatchSimulation Consistency', () => {
  it('should load match data correctly and enter live phase', async () => {
    const mockMatch = {
      id: 'test-id',
      home_team: 'Home FC',
      away_team: 'Away FC',
      stadium_name: 'Official Arena',
      stadium_capacity: 50000,
      started_at: new Date().toISOString(),
      status: 'live',
      events: [{ minute: 1, type: 'kickoff', description: 'Game started', team: 'home' }],
      home_goals: 0,
      away_goals: 0,
      duration_seconds: 720
    };

    const maybeSingle = (supabase.from('live_matches').select('*').eq('id', 'any') as any).maybeSingle;
    maybeSingle.mockResolvedValue({ data: mockMatch, error: null });

    const { result } = renderHook(() => useMatchSimulation());
    
    // Usamos waitFor para aguardar as atualizações de estado assíncronas do loadMatch
    await waitFor(async () => {
      await result.current.loadMatch('test-id');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('live');
    });
    
    expect(result.current.state.homeTeam).toBe('Home FC');
  });

  it('should handle finished match state correctly', async () => {
    const mockMatch = {
      id: 'test-id-finished',
      home_team: 'Home FC',
      away_team: 'Away FC',
      status: 'finished',
      home_goals: 2,
      away_goals: 1,
      started_at: new Date().toISOString(),
      events: [],
      duration_seconds: 720
    };

    const maybeSingle = (supabase.from('live_matches').select('*').eq('id', 'any') as any).maybeSingle;
    maybeSingle.mockResolvedValue({ data: mockMatch, error: null });

    const { result } = renderHook(() => useMatchSimulation());
    
    await waitFor(async () => {
      await result.current.loadMatch('test-id-finished');
    });

    await waitFor(() => {
      expect(result.current.state.phase).toBe('finished');
    });
    
    expect(result.current.state.homeGoals).toBe(2);
  });
});
