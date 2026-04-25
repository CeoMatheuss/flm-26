
INSERT INTO public.global_ranking (user_id, club_name, ranking_points, games_played, wins, draws, losses, last_change)
SELECT 
  gs.user_id,
  COALESCE(gs.club_data->>'name', 'Clube') AS club_name,
  0, 0, 0, 0, 0, 0
FROM public.game_saves gs
WHERE NOT EXISTS (
  SELECT 1 FROM public.global_ranking gr WHERE gr.user_id = gs.user_id
);
