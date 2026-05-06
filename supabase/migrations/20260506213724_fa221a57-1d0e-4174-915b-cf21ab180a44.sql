-- Drop existing functions to change return types
DROP FUNCTION IF EXISTS public.get_user_next_match(uuid);
DROP FUNCTION IF EXISTS public.get_user_league_info(_user_id UUID);

-- 1. Create or replace the next match RPC
CREATE OR REPLACE FUNCTION public.get_user_next_match(_user_id UUID)
RETURNS TABLE (
    id UUID,
    league_id UUID,
    league_name TEXT,
    division_name TEXT,
    home_team_name TEXT,
    away_team_name TEXT,
    home_team_id UUID,
    away_team_id UUID,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    round INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lm.id,
        lm.league_id,
        wl.name as league_name,
        wl.name as division_name,
        COALESCE(th.club_name, 'Desconhecido') as home_team_name,
        COALESCE(ta.club_name, 'Desconhecido') as away_team_name,
        lm.home_team_id,
        lm.away_team_id,
        lm.scheduled_at,
        lm.status,
        lm.round
    FROM public.league_matches lm
    JOIN public.world_leagues wl ON wl.id = lm.league_id
    JOIN public.world_league_teams th ON th.id = lm.home_team_id
    JOIN public.world_league_teams ta ON ta.id = lm.away_team_id
    WHERE (lm.home_user_id = _user_id OR lm.away_user_id = _user_id)
      AND lm.status = 'scheduled'
      AND lm.scheduled_at >= (now() - interval '30 minutes')
    ORDER BY lm.scheduled_at ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Alter league_matches to use team IDs for better bot support
ALTER TABLE public.league_matches ADD COLUMN IF NOT EXISTS home_team_id UUID;
ALTER TABLE public.league_matches ADD COLUMN IF NOT EXISTS away_team_id UUID;

-- 3. Update fixture generation to use team IDs
CREATE OR REPLACE FUNCTION public.generate_league_fixtures(_league_id UUID)
RETURNS VOID AS $$
DECLARE
    _teams UUID[];
    _num_teams INTEGER := 16;
    _num_rounds INTEGER := 30;
    _round INTEGER;
    _i INTEGER;
    _home_idx INTEGER;
    _away_idx INTEGER;
    _team_a UUID;
    _team_b UUID;
    _base_date TIMESTAMP WITH TIME ZONE := now();
    _match_time TIME;
BEGIN
    SELECT match_time INTO _match_time FROM public.world_leagues WHERE id = _league_id;
    SELECT array_agg(id) INTO _teams FROM public.world_league_teams WHERE league_id = _league_id;

    FOR _round IN 1..15 LOOP
        FOR _i IN 0..(_num_teams / 2 - 1) LOOP
            _home_idx := _i;
            _away_idx := _num_teams - 1 - _i;
            
            _team_a := _teams[_home_idx + 1];
            _team_b := _teams[_away_idx + 1];

            -- Round X
            INSERT INTO public.league_matches (league_id, round, home_team_id, away_team_id, home_user_id, away_user_id, status, scheduled_at)
            VALUES (
                _league_id, 
                _round, 
                _team_a,
                _team_b,
                (SELECT user_id FROM public.world_league_teams WHERE id = _team_a),
                (SELECT user_id FROM public.world_league_teams WHERE id = _team_b),
                'scheduled',
                (_base_date + (_round - 1) * interval '1 day')::date + _match_time
            );

            -- Round X+15
            INSERT INTO public.league_matches (league_id, round, home_team_id, away_team_id, home_user_id, away_user_id, status, scheduled_at)
            VALUES (
                _league_id, 
                _round + 15, 
                _team_b,
                _team_a,
                (SELECT user_id FROM public.world_league_teams WHERE id = _team_b),
                (SELECT user_id FROM public.world_league_teams WHERE id = _team_a),
                'scheduled',
                (_base_date + (_round + 14) * interval '1 day')::date + _match_time
            );
        END LOOP;
        _teams := _teams[1:1] || _teams[_num_teams:_num_teams] || _teams[2:_num_teams-1];
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC to get league info for user
CREATE OR REPLACE FUNCTION public.get_user_league_info(_user_id UUID)
RETURNS TABLE (
    league_id UUID,
    league_name TEXT,
    status TEXT,
    team_count BIGINT,
    player_team_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wl.id as league_id,
        wl.name as league_name,
        wl.status,
        (SELECT count(*) FROM public.world_league_teams WHERE league_id = wl.id) as team_count,
        wlt.id as player_team_id
    FROM public.world_league_teams wlt
    JOIN public.world_leagues wl ON wl.id = wlt.league_id
    WHERE wlt.user_id = _user_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update world_league_table view
DROP VIEW IF EXISTS public.world_league_table;
CREATE OR REPLACE VIEW public.world_league_table AS
SELECT 
    wlt.id as team_id,
    wlt.league_id,
    wlt.club_name,
    wlt.club_logo,
    wlt.played as mp,
    wlt.wins as w,
    wlt.draws as d,
    wlt.losses as l,
    wlt.goals_for as gf,
    wlt.goals_against as ga,
    (wlt.goals_for - wlt.goals_against) as gd,
    wlt.points as pts,
    wlt.user_id
FROM public.world_league_teams wlt;
