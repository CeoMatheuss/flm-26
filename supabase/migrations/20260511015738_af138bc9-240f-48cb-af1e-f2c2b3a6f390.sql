-- Enum para níveis e especializações
CREATE TYPE scout_level AS ENUM ('baixo', 'médio', 'alto', 'elite');
CREATE TYPE scout_specialization AS ENUM ('ataque', 'defesa', 'meio', 'jovens', 'geral');
CREATE TYPE mission_type AS ENUM ('local', 'global', 'posição', 'promessas');
CREATE TYPE mission_status AS ENUM ('em_andamento', 'concluída', 'cancelada');

-- Tabela de Olheiros
CREATE TABLE public.scouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    level scout_level NOT NULL DEFAULT 'baixo',
    specialization scout_specialization NOT NULL DEFAULT 'geral',
    efficiency FLOAT NOT NULL DEFAULT 0.5, -- 0.0 a 1.0
    is_busy BOOLEAN NOT NULL DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Missões
CREATE TABLE public.scout_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    scout_id UUID REFERENCES public.scouts(id) ON DELETE CASCADE NOT NULL,
    type mission_type NOT NULL,
    status mission_status NOT NULL DEFAULT 'em_andamento',
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    target_position TEXT, -- Opcional para missões de posição
    risk FLOAT NOT NULL DEFAULT 0.1,
    reward_multiplier FLOAT NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Relatórios (Jogadores Descobertos)
CREATE TABLE public.scout_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    mission_id UUID REFERENCES public.scout_missions(id) ON DELETE CASCADE NOT NULL,
    player_data JSONB NOT NULL, -- Nome, idade, ovr, pot, valor, etc
    accuracy FLOAT NOT NULL, -- Qual a precisão do OVR/POT exibido
    status TEXT NOT NULL DEFAULT 'novo', -- novo, visto, contratado, descartado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_reports ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can manage their own scouts" ON public.scouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own missions" ON public.scout_missions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own reports" ON public.scout_reports FOR ALL USING (auth.uid() = user_id);

-- Trigger para marcar olheiro como ocupado
CREATE OR REPLACE FUNCTION public.handle_scout_mission_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.scouts SET is_busy = true WHERE id = NEW.scout_id;
    ELSIF (TG_OP = 'UPDATE' AND NEW.status != 'em_andamento') THEN
        UPDATE public.scouts SET is_busy = false WHERE id = NEW.scout_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_mission_status_change
AFTER INSERT OR UPDATE ON public.scout_missions
FOR EACH ROW EXECUTE FUNCTION public.handle_scout_mission_status();

-- Inserir olheiros iniciais para quem já tem time (opcional, mas bom para teste)
-- Isso seria feito via código na primeira visita à aba.
