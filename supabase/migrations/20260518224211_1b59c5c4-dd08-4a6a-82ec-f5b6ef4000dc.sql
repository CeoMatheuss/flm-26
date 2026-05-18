-- Function to add cash to a club atomically
CREATE OR REPLACE FUNCTION public.add_club_cash(_club_id UUID, _amount BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.clubs 
    SET cash = COALESCE(cash, budget, 0) + _amount 
    WHERE id = _club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync world league standings
CREATE OR REPLACE FUNCTION public.sync_world_league_standings(_league_id UUID)
RETURNS VOID AS $$
BEGIN
    -- This function recalculates the whole league table for simplicity and consistency
    -- It updates world_league_standings based on world_matches results
    
    INSERT INTO public.world_league_standings (league_id, team_id, played, wins, draws, losses, goals_for, goals_against, points)
    SELECT 
        m.league_id,
        t.id as team_id,
        COUNT(m.id) as played,
        COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_goals > m.away_goals) OR (m.away_team_id = t.id AND m.away_goals > m.home_goals) THEN 1 END) as wins,
        COUNT(CASE WHEN m.home_goals = m.away_goals THEN 1 END) as draws,
        COUNT(CASE WHEN (m.home_team_id = t.id AND m.home_goals < m.away_goals) OR (m.away_team_id = t.id AND m.away_goals < m.home_goals) THEN 1 END) as losses,
        SUM(CASE WHEN m.home_team_id = t.id THEN m.home_goals ELSE m.away_goals END) as goals_for,
        SUM(CASE WHEN m.home_team_id = t.id THEN m.away_goals ELSE m.home_goals END) as goals_against,
        SUM(CASE 
            WHEN (m.home_team_id = t.id AND m.home_goals > m.away_goals) OR (m.away_team_id = t.id AND m.away_goals > m.home_goals) THEN 3
            WHEN m.home_goals = m.away_goals THEN 1
            ELSE 0
        END) as points
    FROM public.world_matches m
    JOIN public.world_teams t ON t.id IN (m.home_team_id, m.away_team_id)
    WHERE m.league_id = _league_id AND m.status = 'finished'
    GROUP BY m.league_id, t.id
    ON CONFLICT (league_id, team_id) DO UPDATE SET
        played = EXCLUDED.played,
        wins = EXCLUDED.wins,
        draws = EXCLUDED.draws,
        losses = EXCLUDED.losses,
        goals_for = EXCLUDED.goals_for,
        goals_against = EXCLUDED.goals_against,
        points = EXCLUDED.points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
