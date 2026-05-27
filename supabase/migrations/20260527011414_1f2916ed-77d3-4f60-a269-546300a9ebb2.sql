
CREATE OR REPLACE FUNCTION public.admin_reset_real_clubs(
  p_admin_id uuid,
  p_confirmation_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup jsonb := '{}'::jsonb;
  v_log_id uuid;
  v_real_user_ids uuid[];
  v_real_team_ids uuid[];
  v_real_player_ids uuid[];
BEGIN
  -- Authorization
  IF NOT public.has_role(p_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  IF p_confirmation_token IS DISTINCT FROM 'CONFIRM_RESET_REAL_CLUBS' THEN
    RAISE EXCEPTION 'invalid confirmation token';
  END IF;

  -- Build sets of "real" entities
  SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::uuid[])
    INTO v_real_user_ids
  FROM (
    SELECT user_id FROM public.world_teams WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM public.league_members WHERE user_id IS NOT NULL AND COALESCE(is_bot,false)=false
    UNION
    SELECT user_id FROM public.world_league_teams WHERE user_id IS NOT NULL AND COALESCE(is_bot,false)=false
  ) s;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_real_team_ids
  FROM public.world_teams
  WHERE user_id IS NOT NULL;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_real_player_ids
  FROM public.world_players
  WHERE team_id = ANY(v_real_team_ids);

  -- Snapshot counters (backup)
  v_backup := jsonb_build_object(
    'real_users', COALESCE(array_length(v_real_user_ids,1),0),
    'real_teams', COALESCE(array_length(v_real_team_ids,1),0),
    'real_players', COALESCE(array_length(v_real_player_ids,1),0),
    'match_history', (SELECT count(*) FROM public.match_history WHERE user_id = ANY(v_real_user_ids)),
    'match_reports', (SELECT count(*) FROM public.match_reports WHERE user_id = ANY(v_real_user_ids)),
    'league_matches', (SELECT count(*) FROM public.league_matches WHERE home_user_id = ANY(v_real_user_ids) OR away_user_id = ANY(v_real_user_ids)),
    'world_matches', (SELECT count(*) FROM public.world_matches WHERE home_team_id = ANY(v_real_team_ids) OR away_team_id = ANY(v_real_team_ids)),
    'global_ranking', (SELECT count(*) FROM public.global_ranking WHERE user_id = ANY(v_real_user_ids)),
    'global_player_ranking', (SELECT count(*) FROM public.global_player_ranking WHERE player_id = ANY(v_real_player_ids))
  );

  -- 1) Histórico de partidas (apenas usuários reais)
  DELETE FROM public.match_reports WHERE user_id = ANY(v_real_user_ids);
  DELETE FROM public.match_history WHERE user_id = ANY(v_real_user_ids);

  -- 2) Remover live_matches travadas envolvendo reais
  DELETE FROM public.live_matches
  WHERE home_user_id = ANY(v_real_user_ids) OR away_user_id = ANY(v_real_user_ids);

  -- 3) Liga multiplayer entre reais — resetar partidas
  UPDATE public.league_matches
  SET status='scheduled', home_goals=NULL, away_goals=NULL,
      played_at=NULL, match_data=NULL,
      synced=false, game_state=NULL
  WHERE home_user_id = ANY(v_real_user_ids) OR away_user_id = ANY(v_real_user_ids);

  -- 4) league_standings (mp) zerar reais
  UPDATE public.league_standings
  SET played=0, wins=0, draws=0, losses=0,
      goals_for=0, goals_against=0, points=0, goals_diff=0
  WHERE user_id = ANY(v_real_user_ids);

  -- 5) league_members zerar stats (não-bots)
  UPDATE public.league_members
  SET points=0, wins=0, draws=0, losses=0,
      goals_for=0, goals_against=0, played=0
  WHERE COALESCE(is_bot,false)=false;

  -- 6) world_matches envolvendo times reais — voltar a "scheduled"
  UPDATE public.world_matches
  SET status='scheduled', home_goals=NULL, away_goals=NULL,
      played_at=NULL, match_data=NULL,
      game_state=NULL, synced=false, simulated=false
  WHERE home_team_id = ANY(v_real_team_ids) OR away_team_id = ANY(v_real_team_ids);

  -- 7) world_league_table / world_league_standings — zerar reais
  UPDATE public.world_league_table
  SET played=0, wins=0, draws=0, losses=0,
      goals_for=0, goals_against=0, goal_diff=0, points=0
  WHERE team_id = ANY(v_real_team_ids);

  UPDATE public.world_league_standings
  SET played=0, wins=0, draws=0, losses=0,
      goals_for=0, goals_against=0, points=0
  WHERE team_id = ANY(v_real_team_ids);

  -- 8) world_league_teams — zerar stats (não-bots)
  UPDATE public.world_league_teams
  SET points=0, wins=0, draws=0, losses=0,
      goals_for=0, goals_against=0, played=0
  WHERE COALESCE(is_bot,false)=false;

  -- 9) Copas nacionais — resetar partidas envolvendo times reais
  UPDATE public.national_cup_matches
  SET status='scheduled', home_score=NULL, away_score=NULL,
      home_penalties=NULL, away_penalties=NULL,
      winner_team_id=NULL, match_data=NULL,
      aggregate_home_score=NULL, aggregate_away_score=NULL,
      synced=false
  WHERE home_team_id = ANY(v_real_team_ids) OR away_team_id = ANY(v_real_team_ids);

  -- 10) Copa do mundo / Internacional — resetar partidas com times reais
  UPDATE public.world_cup_matches
  SET status='scheduled', home_goals=NULL, away_goals=NULL,
      home_penalty_goals=NULL, away_penalty_goals=NULL,
      winner_team_id=NULL, match_data=NULL,
      has_extra_time=false, home_extra_goals=NULL, away_extra_goals=NULL
  WHERE home_team_id = ANY(v_real_team_ids) OR away_team_id = ANY(v_real_team_ids);

  UPDATE public.international_matches
  SET status='scheduled', home_goals=NULL, away_goals=NULL,
      home_penalty_goals=NULL, away_penalty_goals=NULL,
      winner_id=NULL, is_penalty_shootout=false
  WHERE home_team_id = ANY(v_real_team_ids) OR away_team_id = ANY(v_real_team_ids);

  -- 11) Torneios custom / oficiais
  UPDATE public.tournament_matches
  SET status='scheduled', home_goals=NULL, away_goals=NULL,
      played_at=NULL, match_data=NULL
  WHERE home_team_id = ANY(v_real_team_ids) OR away_team_id = ANY(v_real_team_ids);

  UPDATE public.custom_tournament_matches
  SET status='scheduled', home_goals=NULL, away_goals=NULL,
      played_at=NULL, match_data=NULL
  WHERE home_team_id = ANY(v_real_team_ids) OR away_team_id = ANY(v_real_team_ids);

  -- 12) Ranking global de clubes — zerar reais
  UPDATE public.global_ranking
  SET ranking_points=0, games_played=0, wins=0, draws=0, losses=0,
      last_change=0, recent_form='[]'::jsonb, winning_streak=0,
      goals_for=0, goals_against=0,
      season_points=0, total_wins=0, total_draws=0, total_losses=0,
      titles_count=0, titles_data='[]'::jsonb, points_history='[]'::jsonb,
      updated_at=now()
  WHERE user_id = ANY(v_real_user_ids);

  -- 13) Ranking de jogadores — zerar jogadores de clubes reais
  UPDATE public.global_player_ranking
  SET ranking_points=0, seasonal_points=0, reputation_score=0,
      total_goals=0, total_assists=0, total_clean_sheets=0,
      avg_rating=0, mvp_count=0, penalties_saved=0,
      last_update=now()
  WHERE player_id = ANY(v_real_player_ids);

  -- 14) Estatísticas por competição — zerar dos jogadores reais
  UPDATE public.world_player_stats
  SET matches_played=0, goals=0, assists=0, avg_rating=0, best_rating=0,
      mvp_count=0, yellow_cards=0, red_cards=0, clean_sheets=0,
      goals_conceded=0, decisive_passes=0, minutes_played=0,
      total_rating=0, penalties_saved=0
  WHERE player_id = ANY(v_real_player_ids);

  DELETE FROM public.league_player_stats
  WHERE member_id IN (
    SELECT id FROM public.league_members
    WHERE user_id = ANY(v_real_user_ids)
  );

  DELETE FROM public.cup_player_stats
  WHERE player_id = ANY(v_real_player_ids);

  DELETE FROM public.tournament_stats
  WHERE player_id = ANY(v_real_player_ids);

  DELETE FROM public.player_competition_stats
  WHERE player_id = ANY(v_real_player_ids);

  -- 15) Títulos / awards da temporada atual envolvendo reais
  DELETE FROM public.season_awards
  WHERE user_id = ANY(v_real_user_ids);

  DELETE FROM public.league_awards
  WHERE user_id = ANY(v_real_user_ids);

  -- 16) Histórico de ranking (apenas reais)
  DELETE FROM public.club_ranking_history
  WHERE user_id = ANY(v_real_user_ids);

  -- 17) Remover duplicatas de match_history (defensivo)
  DELETE FROM public.match_history a
  USING public.match_history b
  WHERE a.id < b.id
    AND a.user_id = b.user_id
    AND a.played_at = b.played_at
    AND a.home_team = b.home_team
    AND a.away_team = b.away_team
    AND COALESCE(a.competition,'') = COALESCE(b.competition,'');

  -- 18) Log
  INSERT INTO public.admin_logs (user_id, action, details)
  VALUES (
    p_admin_id,
    'reset_real_clubs',
    jsonb_build_object('backup', v_backup, 'executed_at', now())
  )
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true,
    'log_id', v_log_id,
    'backup', v_backup,
    'executed_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_real_clubs(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reset_real_clubs(uuid, text) TO authenticated;
