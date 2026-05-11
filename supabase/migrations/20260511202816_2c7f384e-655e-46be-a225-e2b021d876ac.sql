CREATE OR REPLACE FUNCTION public.increment_cup_goals(p_cup_id UUID, p_player_id UUID, p_team_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.cup_player_stats (cup_id, player_id, team_id, goals, matches_played)
    VALUES (p_cup_id, p_player_id, p_team_id, 1, 1)
    ON CONFLICT (cup_id, player_id)
    DO UPDATE SET 
        goals = cup_player_stats.goals + 1,
        matches_played = cup_player_stats.matches_played + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
