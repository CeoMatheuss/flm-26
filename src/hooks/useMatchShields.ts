/**
 * useMatchShields — Resolves shield render props for both teams in a match by club name.
 * Tries multiple sources: game_saves (player clubs), league_members, cup_teams.
 * Always returns valid props (with sensible defaults) so render never breaks.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { shieldPropsFromClub, ShieldRenderProps } from '@/components/game/shieldHelpers';

export function useMatchShields(homeTeam: string | undefined, awayTeam: string | undefined) {
  const [homeShield, setHomeShield] = useState<ShieldRenderProps>(() => shieldPropsFromClub(null));
  const [awayShield, setAwayShield] = useState<ShieldRenderProps>(() => shieldPropsFromClub(null));

  useEffect(() => {
    let cancelled = false;
    const names = [homeTeam, awayTeam].filter(Boolean) as string[];
    if (names.length === 0) return;

    const resolve = async () => {
      const found: Record<string, ShieldRenderProps> = {};

      // 1. Try player game_saves.club_data
      try {
        const { data: saves } = await supabase
          .from('game_saves')
          .select('club_data')
          .limit(500);
        if (saves) {
          for (const row of saves) {
            const cd: any = row.club_data;
            if (cd?.club?.name && names.includes(cd.club.name) && !found[cd.club.name]) {
              found[cd.club.name] = shieldPropsFromClub(cd.club);
            }
          }
        }
      } catch { /* ignore */ }

      // 2. Try league_members for any unresolved
      const stillMissing = names.filter(n => !found[n]);
      if (stillMissing.length > 0) {
        try {
          const { data: members } = await supabase
            .from('league_members')
            .select('club_name, club_logo')
            .in('club_name', stillMissing);
          if (members) {
            for (const m of members) {
              if (!found[m.club_name]) {
                found[m.club_name] = shieldPropsFromClub({ shieldConfig: m.club_logo as any });
              }
            }
          }
        } catch { /* ignore */ }
      }

      if (cancelled) return;
      if (homeTeam) setHomeShield(found[homeTeam] || shieldPropsFromClub(null));
      if (awayTeam) {
        // For away team, try a fallback color so it visually differs from home
        const awayResolved = found[awayTeam];
        if (awayResolved) setAwayShield(awayResolved);
        else setAwayShield(shieldPropsFromClub({ primaryColor: '#DC2626', secondaryColor: '#FFFFFF', shieldPattern: 'solid' }));
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [homeTeam, awayTeam]);

  return { homeShield, awayShield };
}
