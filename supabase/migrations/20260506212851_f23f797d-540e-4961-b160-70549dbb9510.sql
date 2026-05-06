-- 1. Create Authoritative Standing View
CREATE OR REPLACE VIEW public.world_league_table AS
SELECT 
    ws.division_id,
    ws.team_id,
    wt.name AS club_name,
    wt.logo AS club_logo,
    wt.user_id,
    ws.played AS mp,
    ws.wins AS w,
    ws.draws AS d,
    ws.losses AS l,
    ws.goals_for AS gf,
    ws.goals_against AS ga,
    ws.goal_difference AS gd,
    ws.points AS pts
FROM public.world_standings ws
JOIN public.world_teams wt ON wt.id = ws.team_id;

-- 2. Create User Next Match RPC
CREATE OR REPLACE FUNCTION public.get_user_next_match(_user_id UUID)
RETURNS TABLE (
    id UUID,
    division_id UUID,
    division_name TEXT,
    league_name TEXT,
    home_team_name TEXT,
    away_team_name TEXT,
    home_team_id UUID,
    away_team_id UUID,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    auto_sim_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    round INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wm.id,
        wm.division_id,
        wd.name as division_name,
        wl.name as league_name,
        wt_home.name as home_team_name,
        wt_away.name as away_team_name,
        wm.home_team_id,
        wm.away_team_id,
        wm.scheduled_at,
        wm.auto_sim_at,
        wm.status,
        wm.round
    FROM public.world_matches wm
    JOIN public.world_divisions wd ON wd.id = wm.division_id
    JOIN public.world_leagues wl ON wl.id = wd.league_id
    JOIN public.world_teams wt_home ON wt_home.id = wm.home_team_id
    JOIN public.world_teams wt_away ON wt_away.id = wm.away_team_id
    JOIN public.world_teams wt_user ON (wt_user.id = wm.home_team_id OR wt_user.id = wm.away_team_id)
    WHERE wt_user.user_id = _user_id
      AND wm.status = 'scheduled'
      AND wm.scheduled_at >= (now() - interval '10 minutes') -- Allow 5-min window + buffer
    ORDER BY wm.scheduled_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Integrity Sync Function
CREATE OR REPLACE FUNCTION public.sync_league_integrity(_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Ensure all teams in world_teams have a row in world_standings
    INSERT INTO public.world_standings (division_id, team_id)
    SELECT division_id, id FROM public.world_teams
    WHERE division_id IS NOT NULL
    ON CONFLICT (division_id, team_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
