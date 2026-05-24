import { Player } from '@/types/game';
import { SimEvent } from '../useMatchSimulation';
import { supabase } from '@/integrations/supabase/client';

export interface PlayerMatchStats {
  id: string;
  name: string;
  position: string;
  minutesPlayed: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  tackles: number;
  interceptions: number;
  saves: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  goalsConceded: number;
  cleanSheet: boolean;
  errorsLeadToGoal: number;
  isGk: boolean;
}

export interface PlayerRating {
  playerId: string;
  rating: number; // 0.0 - 10.0
  color: string; // Dynamic color hex or tailwind class
  label: string; // "Craque", "Bom", etc.
  stats: PlayerMatchStats;
}

/**
 * Advanced Match Rating System (FLM 26)
 * Calculates dynamic player ratings based on real-time match events.
 */
export function calculatePlayerRatings(
  starters: Player[],
  events: SimEvent[],
  currentMinute: number,
  isHome: boolean
): Record<string, PlayerRating> {
  const ratings: Record<string, PlayerRating> = {};
  const playerStats: Record<string, PlayerMatchStats> = {};

  // Initialize stats for all starters
  starters.forEach(p => {
    playerStats[p.id] = {
      id: p.id,
      name: p.name,
      position: p.position,
      minutesPlayed: currentMinute, // Simplified
      goals: 0,
      assists: 0,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      tackles: 0,
      interceptions: 0,
      saves: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      goalsConceded: 0,
      cleanSheet: true,
      errorsLeadToGoal: 0,
      isGk: p.position === 'GOL'
    };
  });

  // Process events to build stats
  events.forEach(ev => {
    const pName = ev.playerName;
    const aName = ev.assistName;
    const teamMatch = (ev.team === 'home' && isHome) || (ev.team === 'away' && !isHome);
    const opponentMatch = (ev.team === 'away' && isHome) || (ev.team === 'home' && !isHome);

    if (teamMatch && pName) {
      const p = starters.find(s => s.name === pName);
      if (p) {
        const stats = playerStats[p.id];
        if (ev.isGoal || ev.type === 'goal' || ev.type.endsWith('_goal')) stats.goals++;
        if (['shot_off', 'long_shot_miss', 'header_miss', 'woodwork', 'great_save', 'gk_save'].includes(ev.type)) stats.shots++;
        if (['great_save', 'gk_save', 'woodwork'].includes(ev.type)) stats.shotsOnTarget++;
        if (ev.type === 'tackle') stats.tackles++;
        if (ev.type === 'interception') stats.interceptions++;
        if (ev.type === 'foul' || ev.type === 'dangerous_foul') stats.fouls++;
        if (ev.type === 'yellow_card') stats.yellowCards++;
        if (ev.type === 'red_card') stats.redCards++;
        if (['possession', 'pass', 'through_ball', 'crossing'].includes(ev.type)) stats.passes++;
      }
    }

    if (teamMatch && aName) {
      const a = starters.find(s => s.name === aName);
      if (a) playerStats[a.id].assists++;
    }

    // Goalkeeper specific
    if (opponentMatch) {
      const gk = starters.find(s => s.position === 'GOL');
      if (gk) {
        const stats = playerStats[gk.id];
        if (ev.type === 'great_save' || ev.type === 'gk_save') stats.saves++;
        if (ev.isGoal || ev.type === 'goal' || ev.type.endsWith('_goal')) {
          stats.goalsConceded++;
          stats.cleanSheet = false;
        }
      }
    }
  });

  // Calculate final rating for each player
  starters.forEach(p => {
    const stats = playerStats[p.id];
    let score = 6.0; // Base rating for playing

    // General modifiers
    score += stats.goals * 1.5;
    score += stats.assists * 1.0;
    score += (stats.shotsOnTarget * 0.2);
    score += (stats.passes * 0.05);
    score += (stats.tackles * 0.3);
    score += (stats.interceptions * 0.2);
    
    // Penalties
    score -= (stats.fouls * 0.1);
    score -= (stats.yellowCards * 0.5);
    score -= (stats.redCards * 3.0);
    score -= (stats.errorsLeadToGoal * 2.0);

    // Position specific adjustments
    if (p.position === 'GOL') {
      score += (stats.saves * 0.4);
      if (stats.cleanSheet && currentMinute > 60) score += 1.0;
      score -= (stats.goalsConceded * 0.5);
    } else if (['ZAG', 'LAT'].includes(p.position)) {
      if (stats.cleanSheet && currentMinute > 70) score += 0.5;
      score += (stats.tackles * 0.2); // Extra weight for defenders
    } else if (['ATA'].includes(p.position)) {
      if (stats.goals === 0 && currentMinute > 75) score -= 0.5; // Pressure on strikers
    }

    // Cap rating
    score = Math.min(10.0, Math.max(0.0, score));
    // Round to 1 decimal
    score = Math.round(score * 10) / 10;

    ratings[p.id] = {
      playerId: p.id,
      rating: score,
      color: getRatingColor(score),
      label: getRatingLabel(score),
      stats
    };
  });

  return ratings;
}

export async function persistMatchRatings(ratings: Record<string, PlayerRating>, competition: string) {
  try {
    const ratingList = Object.values(ratings);
    for (const r of ratingList) {
      // 1. Update player stats via RPC to avoid TS depth issues and handle logic on server
      await supabase.rpc('update_player_after_match', {
        _player_id: r.playerId,
        _rating: r.rating,
        _goals: r.stats.goals,
        _assists: r.stats.assists,
        _clean_sheet: r.stats.cleanSheet,
        _competition: competition
      });
    }
    console.log("[RATINGS] Persisted ratings for", ratingList.length, "players");
  } catch (e) {
    console.error("[RATINGS] Failed to persist ratings:", e);
  }
}

function getRatingColor(rating: number): string {
  if (rating >= 9.0) return '#fbbf24'; // text-amber-400 (Dourado)
  if (rating >= 7.5) return '#10b981'; // text-emerald-500 (Verde)
  if (rating >= 6.0) return '#facc15'; // text-yellow-400 (Amarelo)
  if (rating >= 4.5) return '#f97316'; // text-orange-500 (Laranja)
  return '#ef4444'; // text-red-500 (Vermelho)
}

function getRatingLabel(rating: number): string {
  if (rating >= 9.5) return 'Histórica';
  if (rating >= 8.5) return 'Destaque';
  if (rating >= 7.5) return 'Boa';
  if (rating >= 6.0) return 'Média';
  if (rating >= 4.5) return 'Ruim';
  return 'Horrível';
}
