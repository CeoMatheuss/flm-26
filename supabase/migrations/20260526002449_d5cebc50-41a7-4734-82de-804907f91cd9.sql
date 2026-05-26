-- Garantir índice/unique para upsert diário em uniform_sales_history
CREATE UNIQUE INDEX IF NOT EXISTS uniform_sales_history_launch_date_uidx
  ON public.uniform_sales_history(launch_id, sale_date);

-- ============================================================
-- Função principal: tick contínuo de vendas (hora a hora)
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_daily_uniform_sales(p_launch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_club_id       uuid;
  v_user_id       uuid;
  v_club_name     text;
  v_fans          integer;
  v_reputation    integer;
  v_launched_at   timestamptz;
  v_last_update   timestamptz;
  v_hype          double precision;
  v_status        text;
  v_days          double precision;
  v_hours_elapsed double precision;
  v_decay_per_hr  double precision;
  v_hype_floor    double precision;
  v_recent_wins   integer := 0;
  v_form_bonus    double precision := 1.0;
  v_daily_target  double precision;
  v_sales         integer;
  v_revenue_cents bigint;
  v_price_cents   integer;
  v_today         date := (now() at time zone 'America/Sao_Paulo')::date;
BEGIN
  SELECT l.club_id, l.launched_at, COALESCE(l.last_sales_update_at, l.launched_at),
         COALESCE(l.hype_score, 100), COALESCE(l.status,'')
    INTO v_club_id, v_launched_at, v_last_update, v_hype, v_status
    FROM public.club_uniform_launches l
   WHERE l.id = p_launch_id;

  IF NOT FOUND OR v_status NOT IN ('approved','active') THEN
    RETURN;
  END IF;

  SELECT c.user_id, c.name, COALESCE(c.fans,0), COALESCE(c.reputation,50)
    INTO v_user_id, v_club_name, v_fans, v_reputation
    FROM public.clubs c WHERE c.id = v_club_id;

  IF v_user_id IS NULL THEN RETURN; END IF;

  -- Tempo decorrido (em horas) desde o último tick, com teto de 24h
  v_hours_elapsed := LEAST(24.0, GREATEST(0.0, EXTRACT(EPOCH FROM (now() - v_last_update)) / 3600.0));
  IF v_hours_elapsed < 0.25 THEN
    -- Menos de 15 min desde o último tick: ignora pra evitar duplicação
    RETURN;
  END IF;

  v_days := EXTRACT(EPOCH FROM (now() - v_launched_at)) / 86400.0;

  -- Decaimento e piso baseados em tamanho do clube
  IF v_fans >= 30000 OR v_reputation >= 75 THEN
    v_decay_per_hr := 0.12;          -- ~2.9 pts/dia
    v_hype_floor   := 18.0;          -- clubes grandes nunca caem demais
  ELSIF v_fans >= 8000 OR v_reputation >= 55 THEN
    v_decay_per_hr := 0.20;          -- ~4.8 pts/dia
    v_hype_floor   := 12.0;
  ELSE
    v_decay_per_hr := 0.30;          -- ~7.2 pts/dia
    v_hype_floor   := 8.0;
  END IF;

  v_hype := GREATEST(v_hype_floor, v_hype - (v_decay_per_hr * v_hours_elapsed));

  -- Chance de viralizar (3% por tick): salto de +15 pts no hype
  IF random() < 0.03 THEN
    v_hype := LEAST(100.0, v_hype + 15.0);
  END IF;

  -- Bônus por vitórias recentes (últimos 5 jogos do usuário)
  BEGIN
    SELECT COUNT(*) INTO v_recent_wins
      FROM (
        SELECT is_home, home_goals, away_goals
          FROM public.match_history
         WHERE user_id = v_user_id
         ORDER BY played_at DESC NULLS LAST, created_at DESC NULLS LAST
         LIMIT 5
      ) m
     WHERE (m.is_home AND m.home_goals > m.away_goals)
        OR (NOT m.is_home AND m.away_goals > m.home_goals);
    v_form_bonus := 1.0 + (v_recent_wins * 0.06); -- até +30%
  EXCEPTION WHEN OTHERS THEN
    v_form_bonus := 1.0;
  END;

  -- Alvo de vendas diárias (multifator)
  -- base: ~0.35% da torcida * fator reputação * hype * forma
  v_daily_target := GREATEST(0,
      (v_fans * 0.0035)
      * (0.55 + (v_reputation / 100.0))   -- 0.55 .. 1.55
      * (v_hype / 100.0)                  -- 0.08 .. 1.0
      * v_form_bonus                      -- 1.0 .. 1.3
  );

  -- Fração proporcional às horas decorridas + variação aleatória ±15%
  v_sales := GREATEST(0, FLOOR(v_daily_target * (v_hours_elapsed / 24.0) * (0.85 + (random() * 0.30)))::int);

  -- Piso: clubes ativos vendem pelo menos 1 unidade por hora se houver demanda mínima
  IF v_sales = 0 AND v_fans > 500 AND v_hype > v_hype_floor THEN
    v_sales := GREATEST(1, FLOOR(v_hours_elapsed)::int);
  END IF;

  -- Receita: R$ 120 + 0.80/reputação por camisa (em centavos)
  v_price_cents   := 12000 + (v_reputation * 80);
  v_revenue_cents := (v_sales::bigint) * v_price_cents;

  -- Persistir hype + acumular totais
  UPDATE public.club_uniform_launches
     SET hype_score           = v_hype,
         last_sales_update_at = now(),
         total_sales_count    = COALESCE(total_sales_count,0) + v_sales,
         total_revenue_cents  = COALESCE(total_revenue_cents,0) + v_revenue_cents,
         peak_daily_sales     = GREATEST(COALESCE(peak_daily_sales,0), v_sales),
         total_sold           = COALESCE(total_sold,0) + v_sales,
         total_revenue        = COALESCE(total_revenue,0) + (v_revenue_cents / 100.0)
   WHERE id = p_launch_id;

  -- Histórico diário (upsert no dia de hoje em BRT)
  INSERT INTO public.uniform_sales_history (launch_id, club_id, quantity, revenue, sale_date, metadata)
  VALUES (p_launch_id, v_club_id, v_sales, (v_revenue_cents / 100.0), v_today,
          jsonb_build_object('hype', v_hype, 'hours', v_hours_elapsed, 'wins5', v_recent_wins))
  ON CONFLICT (launch_id, sale_date) DO UPDATE
     SET quantity = uniform_sales_history.quantity + EXCLUDED.quantity,
         revenue  = uniform_sales_history.revenue  + EXCLUDED.revenue,
         metadata = jsonb_build_object('hype', v_hype, 'wins5', v_recent_wins);

  -- Credita orçamento do clube
  IF v_revenue_cents > 0 THEN
    UPDATE public.clubs
       SET budget = COALESCE(budget,0) + (v_revenue_cents / 100)
     WHERE id = v_club_id;
  END IF;
END;
$function$;

-- ============================================================
-- Tick global: processa todos os lançamentos aprovados
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_all_uniform_sales()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT id
      FROM public.club_uniform_launches
     WHERE status IN ('approved','active')
       AND (last_sales_update_at IS NULL
            OR last_sales_update_at < now() - INTERVAL '30 minutes')
  ) LOOP
    PERFORM public.calculate_daily_uniform_sales(r.id);
  END LOOP;
END;
$function$;

-- ============================================================
-- Trigger: quando o uniforme vira notícia, dá um boost no hype
-- ============================================================
CREATE OR REPLACE FUNCTION public.boost_uniform_hype_on_news()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_launch_id uuid;
BEGIN
  IF NEW.template_key IS NOT NULL AND NEW.template_key ILIKE 'kit_launch%' THEN
    BEGIN
      v_launch_id := NULLIF(NEW.metadata->>'launchId','')::uuid;
    EXCEPTION WHEN OTHERS THEN v_launch_id := NULL;
    END;

    IF v_launch_id IS NOT NULL THEN
      UPDATE public.club_uniform_launches
         SET hype_score = LEAST(100.0, COALESCE(hype_score,50) + 10.0)
       WHERE id = v_launch_id
         AND status IN ('approved','active');
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_boost_uniform_hype_on_news ON public.newspaper_entries;
CREATE TRIGGER tr_boost_uniform_hype_on_news
AFTER INSERT ON public.newspaper_entries
FOR EACH ROW EXECUTE FUNCTION public.boost_uniform_hype_on_news();

-- Realtime para tabelas relevantes (idempotente)
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables
   WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='uniform_sales_history';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.uniform_sales_history';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables
   WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='club_uniform_launches';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.club_uniform_launches';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;