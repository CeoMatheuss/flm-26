CREATE OR REPLACE FUNCTION public.check_duplicate_matches()
RETURNS TABLE (match_count BIGINT, home_team_id UUID, away_team_id UUID, match_date DATE) AS $$
BEGIN
    RETURN QUERY
    SELECT COUNT(*), m.home_team_id, m.away_team_id, m.kickoff_at::DATE
    FROM world_matches m
    GROUP BY m.home_team_id, m.away_team_id, m.kickoff_at::DATE
    HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_schedule_conflicts()
RETURNS TABLE (club_id UUID, match_id_1 UUID, match_id_2 UUID, time_diff INTERVAL) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m1.home_team_id as club_id, 
        m1.id as match_id_1, 
        m2.id as match_id_2, 
        (m2.kickoff_at - m1.kickoff_at) as time_diff
    FROM world_matches m1
    JOIN world_matches m2 ON m1.home_team_id = m2.home_team_id AND m1.id < m2.id
    WHERE m2.kickoff_at > m1.kickoff_at 
      AND m2.kickoff_at - m1.kickoff_at < INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
