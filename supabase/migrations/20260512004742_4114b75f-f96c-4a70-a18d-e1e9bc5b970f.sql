-- Create the notification function
CREATE OR REPLACE FUNCTION public.notify_upcoming_matches()
RETURNS void AS $$
BEGIN
    -- 1 hour before
    INSERT INTO public.user_notifications (user_id, title, message, type, category, priority, icon, data)
    SELECT 
        c.user_id,
        'Partida em 1 hora! 🏟️',
        'Sua partida contra ' || (SELECT name FROM public.clubs WHERE id = (CASE WHEN m.home_team_id = c.id THEN m.away_team_id ELSE m.home_team_id END)) || ' começa em breve.',
        'info',
        'Jogos',
        'high',
        '🏟️',
        jsonb_build_object('match_id', m.id, 'time_rem', '1h')
    FROM public.world_matches m
    JOIN public.clubs c ON m.home_team_id = c.id OR m.away_team_id = c.id
    WHERE m.status = 'scheduled'
    AND m.scheduled_at > now() + interval '55 minutes'
    AND m.scheduled_at < now() + interval '65 minutes'
    AND NOT EXISTS (
        SELECT 1 FROM public.user_notifications un 
        WHERE un.user_id = c.user_id 
        AND un.data->>'match_id' = m.id::text
        AND un.data->>'time_rem' = '1h'
    );

    -- 10 minutes before
    INSERT INTO public.user_notifications (user_id, title, message, type, category, priority, icon, data)
    SELECT 
        c.user_id,
        'Partida começando! 🔥',
        'Sua partida contra ' || (SELECT name FROM public.clubs WHERE id = (CASE WHEN m.home_team_id = c.id THEN m.away_team_id ELSE m.home_team_id END)) || ' começa em 10 minutos!',
        'danger',
        'Jogos',
        'ultra',
        '🔥',
        jsonb_build_object('match_id', m.id, 'time_rem', '10m')
    FROM public.world_matches m
    JOIN public.clubs c ON m.home_team_id = c.id OR m.away_team_id = c.id
    WHERE m.status = 'scheduled'
    AND m.scheduled_at > now() + interval '5 minutes'
    AND m.scheduled_at < now() + interval '15 minutes'
    AND NOT EXISTS (
        SELECT 1 FROM public.user_notifications un 
        WHERE un.user_id = c.user_id 
        AND un.data->>'match_id' = m.id::text
        AND un.data->>'time_rem' = '10m'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule it to run every 5 minutes
SELECT cron.schedule('match-notifications', '*/5 * * * *', 'SELECT public.notify_upcoming_matches()');
