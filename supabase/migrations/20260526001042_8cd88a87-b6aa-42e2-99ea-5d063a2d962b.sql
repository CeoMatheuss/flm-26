-- Trigger function: auto-publish newspaper entry when uniform launch is approved
CREATE OR REPLACE FUNCTION public.publish_uniform_launch_news()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_club_name text;
  v_manager text;
  v_headline text;
  v_variant int;
  v_already_exists boolean;
BEGIN
  -- Só agir em transições para approved/active/official
  IF NEW.status NOT IN ('approved', 'active', 'official') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Resolver clube e dono
  SELECT c.user_id, c.name INTO v_user_id, v_club_name
  FROM public.clubs c
  WHERE c.id = NEW.club_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE LOG '[publish_uniform_launch_news] club % sem user_id', NEW.club_id;
    RETURN NEW;
  END IF;

  -- Proteção contra duplicidade
  SELECT EXISTS (
    SELECT 1 FROM public.newspaper_entries
    WHERE template_key = 'kit_launch'
      AND (metadata->>'launchId') = NEW.id::text
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RAISE LOG '[publish_uniform_launch_news] notícia já existe para launch %', NEW.id;
    RETURN NEW;
  END IF;

  -- Nome do manager (opcional)
  SELECT display_name INTO v_manager
  FROM public.profiles
  WHERE user_id = v_user_id
  LIMIT 1;
  v_manager := COALESCE(v_manager, 'do clube');

  -- Manchete aleatória (6 variações)
  v_variant := 1 + floor(random() * 6)::int;
  v_headline := CASE v_variant
    WHEN 1 THEN '👕 O ' || v_club_name || ' apresenta seu novo uniforme para a temporada!'
    WHEN 2 THEN '✨ Nova camisa do ' || v_club_name || ' é revelada oficialmente.'
    WHEN 3 THEN '🔥 Torcida reage ao novo manto lançado pelo ' || v_club_name || '.'
    WHEN 4 THEN '📣 ' || v_club_name || ' lança coleção inédita e movimenta o mercado.'
    WHEN 5 THEN '🏆 O Manager ' || v_manager || ' apresenta o novo uniforme do ' || v_club_name || '.'
    ELSE '👀 Confira o novo uniforme oficial do ' || v_club_name || ' — já disponível na loja!'
  END;

  INSERT INTO public.newspaper_entries (
    user_id, text, category, importance, template_key, metadata
  ) VALUES (
    v_user_id,
    v_headline,
    'ELENCO',
    3,
    'kit_launch',
    jsonb_build_object(
      'launchId', NEW.id,
      'clubName', v_club_name,
      'managerName', v_manager,
      'kit', NEW.config,
      'launchName', NEW.name
    )
  );

  RAISE LOG '[publish_uniform_launch_news] notícia publicada para launch % (clube %)', NEW.id, v_club_name;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '[publish_uniform_launch_news] erro: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publish_uniform_launch_news ON public.club_uniform_launches;
CREATE TRIGGER trg_publish_uniform_launch_news
AFTER INSERT OR UPDATE OF status ON public.club_uniform_launches
FOR EACH ROW
EXECUTE FUNCTION public.publish_uniform_launch_news();