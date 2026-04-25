-- ============================================
-- 1. user_versions: versão atual + backup
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  game_version TEXT NOT NULL DEFAULT '1.0.0',
  data_version TEXT NOT NULL DEFAULT '1.0.0',
  migration_status TEXT NOT NULL DEFAULT 'idle' CHECK (migration_status IN ('idle','migrating','failed','observation')),
  observation_until TIMESTAMP WITH TIME ZONE,
  last_backup JSONB,
  last_backup_at TIMESTAMP WITH TIME ZONE,
  last_migration_at TIMESTAMP WITH TIME ZONE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_versions_user ON public.user_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_versions_status ON public.user_versions(migration_status);

ALTER TABLE public.user_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own version" ON public.user_versions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own version" ON public.user_versions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own version" ON public.user_versions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all versions" ON public.user_versions
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins update all versions" ON public.user_versions
  FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_user_versions_updated_at
  BEFORE UPDATE ON public.user_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. migration_logs: histórico imutável
-- ============================================
CREATE TABLE IF NOT EXISTS public.migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','failed','rolled_back')),
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_migration_logs_user ON public.migration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_status ON public.migration_logs(status);
CREATE INDEX IF NOT EXISTS idx_migration_logs_created ON public.migration_logs(created_at DESC);

ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own migration logs" ON public.migration_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own migration logs" ON public.migration_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all migration logs" ON public.migration_logs
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

-- ============================================
-- 3. suspicious_activity: anti-exploit
-- ============================================
CREATE TABLE IF NOT EXISTS public.suspicious_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','confirmed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suspicious_user ON public.suspicious_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_status ON public.suspicious_activity(status);
CREATE INDEX IF NOT EXISTS idx_suspicious_severity ON public.suspicious_activity(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_created ON public.suspicious_activity(created_at DESC);

ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own suspicious activity" ON public.suspicious_activity
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage suspicious activity" ON public.suspicious_activity
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- ============================================
-- 4. Função RPC: comparar versões (semver simples)
-- ============================================
CREATE OR REPLACE FUNCTION public.version_compare(v1 TEXT, v2 TEXT)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts1 TEXT[];
  parts2 TEXT[];
  i INTEGER;
  n1 INTEGER;
  n2 INTEGER;
BEGIN
  parts1 := string_to_array(v1, '.');
  parts2 := string_to_array(v2, '.');
  FOR i IN 1..GREATEST(array_length(parts1,1), array_length(parts2,1)) LOOP
    n1 := COALESCE(NULLIF(parts1[i],'')::int, 0);
    n2 := COALESCE(NULLIF(parts2[i],'')::int, 0);
    IF n1 > n2 THEN RETURN 1; END IF;
    IF n1 < n2 THEN RETURN -1; END IF;
  END LOOP;
  RETURN 0;
END;
$$;

-- ============================================
-- 5. RPC: ensure_user_version (cria registro se não existe)
-- ============================================
CREATE OR REPLACE FUNCTION public.ensure_user_version(_user_id UUID, _current_version TEXT)
RETURNS public.user_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.user_versions;
BEGIN
  INSERT INTO public.user_versions (user_id, game_version, data_version)
  VALUES (_user_id, _current_version, _current_version)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO rec FROM public.user_versions WHERE user_id = _user_id;
  RETURN rec;
END;
$$;

-- ============================================
-- 6. Trigger anti-exploit: detecta saltos de saldo
-- ============================================
CREATE OR REPLACE FUNCTION public.detect_budget_jump()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_budget BIGINT;
  new_budget BIGINT;
  diff BIGINT;
  threshold BIGINT := 50000000; -- R$ 50M por save
BEGIN
  IF OLD.club_data IS NULL OR NEW.club_data IS NULL THEN RETURN NEW; END IF;
  old_budget := COALESCE((OLD.club_data->>'budget')::bigint, 0);
  new_budget := COALESCE((NEW.club_data->>'budget')::bigint, 0);
  diff := new_budget - old_budget;

  IF diff > threshold THEN
    INSERT INTO public.suspicious_activity (user_id, activity_type, severity, description, details)
    VALUES (
      NEW.user_id,
      'budget_jump',
      CASE WHEN diff > 500000000 THEN 'critical'
           WHEN diff > 200000000 THEN 'high'
           ELSE 'medium' END,
      'Saldo aumentou em ' || (diff/1000000) || 'M em uma única atualização',
      jsonb_build_object('old_budget', old_budget, 'new_budget', new_budget, 'diff', diff, 'detected_at', now())
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS detect_budget_jump_trigger ON public.game_saves;
CREATE TRIGGER detect_budget_jump_trigger
  AFTER UPDATE ON public.game_saves
  FOR EACH ROW EXECUTE FUNCTION public.detect_budget_jump();