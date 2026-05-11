import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMatchSimulation } from './useMatchSimulation';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
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
    })),
    functions: {
      invoke: vi.fn()
    },
    auth: {
      getUser: vi.fn()
    }
  }
}));

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
      away_goals: 0
    };

    (supabase.from as any)().select().eq().maybeSingle.mockResolvedValue({ data: mockMatch, error: null });

    const { result } = renderHook(() => useMatchSimulation());
    
    await result.current.loadMatch('test-id');

    expect(result.current.state.phase).toBe('live');
    expect(result.current.state.homeTeam).toBe('Home FC');
    expect(result.current.state.stadiumName).toBe('Official Arena');
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
      events: []
    };

    (supabase.from as any)().select().eq().maybeSingle.mockResolvedValue({ data: mockMatch, error: null });

    const { result } = renderHook(() => useMatchSimulation());
    
    await result.current.loadMatch('test-id-finished');

    expect(result.current.state.phase).toBe('finished');
    expect(result.current.state.homeGoals).toBe(2);
  });
});
