-- Adicionar campos de timestamp para controle offline no perfil do usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_offline_processed_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Tabela de Transportadoras Fictícias
CREATE TABLE IF NOT EXISTS public.shipping_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    speed_factor FLOAT NOT NULL DEFAULT 1.0, -- Multiplicador de velocidade (menor = mais rápido)
    quality_score FLOAT NOT NULL DEFAULT 0.95, -- Chance de não ter problemas
    price_factor FLOAT NOT NULL DEFAULT 1.0, -- Multiplicador de custo de frete
    delay_risk FLOAT NOT NULL DEFAULT 0.05, -- Risco base de atraso
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir transportadoras iniciais
INSERT INTO public.shipping_companies (name, speed_factor, quality_score, price_factor, delay_risk)
SELECT 'FlashExpress', 0.7, 0.90, 1.5, 0.08 WHERE NOT EXISTS (SELECT 1 FROM public.shipping_companies WHERE name = 'FlashExpress');
INSERT INTO public.shipping_companies (name, speed_factor, quality_score, price_factor, delay_risk)
SELECT 'BR Delivery', 1.0, 0.95, 1.0, 0.05 WHERE NOT EXISTS (SELECT 1 FROM public.shipping_companies WHERE name = 'BR Delivery');
INSERT INTO public.shipping_companies (name, speed_factor, quality_score, price_factor, delay_risk)
SELECT 'NovaCargo', 1.3, 0.98, 0.8, 0.03 WHERE NOT EXISTS (SELECT 1 FROM public.shipping_companies WHERE name = 'NovaCargo');
INSERT INTO public.shipping_companies (name, speed_factor, quality_score, price_factor, delay_risk)
SELECT 'UltraLog', 0.5, 0.99, 2.5, 0.02 WHERE NOT EXISTS (SELECT 1 FROM public.shipping_companies WHERE name = 'UltraLog');

-- Ajustar tabela de Produtos existente
ALTER TABLE public.club_shop_products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_stock INTEGER NOT NULL DEFAULT 1000,
ADD COLUMN IF NOT EXISTS popularity_score FLOAT NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS is_limited_edition BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'comum',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Tabela de Entregas (Orders / Shipments)
-- Usando TEXT para product_id para manter compatibilidade com a tabela club_shop_products
CREATE TABLE IF NOT EXISTS public.club_shop_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    product_id TEXT, -- Mantido como TEXT para bater com club_shop_products.id
    shipping_company_id UUID REFERENCES public.shipping_companies(id),
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'separating', 'shipping', 'out_for_delivery', 'delivered', 'delayed', 'cancelled'
    customer_satisfaction INTEGER, -- 1-5 estrelas
    freight_cents INTEGER NOT NULL DEFAULT 0,
    distance_km FLOAT NOT NULL DEFAULT 0,
    risk_factor FLOAT NOT NULL DEFAULT 0,
    estimated_delivery_at TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_delivery_at TIMESTAMP WITH TIME ZONE,
    is_offline_processed BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Vendas (Histórico de Receita)
CREATE TABLE IF NOT EXISTS public.club_shop_sales_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    product_id TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    total_revenue_cents INTEGER NOT NULL,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Eventos de Logística
CREATE TABLE IF NOT EXISTS public.logistic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'rain', 'holiday', 'strike', 'high_demand'
    name TEXT NOT NULL,
    impact_factor FLOAT NOT NULL, -- Multiplicador de tempo de entrega
    probability FLOAT NOT NULL,
    is_global BOOLEAN DEFAULT false,
    active_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir eventos base
INSERT INTO public.logistic_events (type, name, impact_factor, probability, is_global)
SELECT 'rain', 'Chuva Intensa', 1.3, 0.1, true WHERE NOT EXISTS (SELECT 1 FROM public.logistic_events WHERE type = 'rain');
INSERT INTO public.logistic_events (type, name, impact_factor, probability, is_global)
SELECT 'strike', 'Greve dos Transportes', 2.5, 0.02, true WHERE NOT EXISTS (SELECT 1 FROM public.logistic_events WHERE type = 'strike');

-- Função para calcular lucro e vendas offline
CREATE OR REPLACE FUNCTION public.process_offline_shop_activity(p_club_id UUID, p_seconds_offline INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_total_revenue INTEGER := 0;
    v_products_sold INTEGER := 0;
    v_fans_growth INTEGER := 0;
    v_completed_deliveries INTEGER := 0;
    v_out_of_stock_count INTEGER := 0;
    v_result JSONB;
    v_reputation FLOAT;
    v_fans_count INTEGER;
    v_base_sale_rate FLOAT;
    v_product RECORD;
    v_sale_chance FLOAT;
    v_quantity_to_sell INTEGER;
BEGIN
    -- Obter reputação e torcida atual
    SELECT reputation, fans INTO v_reputation, v_fans_count FROM public.clubs WHERE id = p_club_id;
    
    -- Taxa base de venda baseada em torcida e reputação (1 venda a cada X torcedores por hora)
    v_base_sale_rate := (v_fans_count / 1000.0) * (v_reputation / 50.0);
    
    -- Processar cada produto no estoque
    FOR v_product IN SELECT * FROM public.club_shop_products WHERE (stock_quantity > 0) LOOP
        -- Calcular probabilidade de venda para este produto no período
        v_sale_chance := (v_product.popularity_score * v_base_sale_rate * p_seconds_offline) / 3600.0;
        
        -- Quantidade vendida
        v_quantity_to_sell := LEAST(v_product.stock_quantity, FLOOR(v_sale_chance)::INTEGER);
        
        IF v_quantity_to_sell > 0 THEN
            -- Atualizar estoque
            UPDATE public.club_shop_products 
            SET stock_quantity = stock_quantity - v_quantity_to_sell,
                updated_at = now()
            WHERE id = v_product.id;
            
            -- Registrar venda
            INSERT INTO public.club_shop_sales_history (club_id, product_id, quantity, total_revenue_cents)
            VALUES (p_club_id, v_product.id, v_quantity_to_sell, v_product.base_price_cents * v_quantity_to_sell);
            
            v_total_revenue := v_total_revenue + (v_product.base_price_cents * v_quantity_to_sell);
            v_products_sold := v_products_sold + v_quantity_to_sell;
            
            -- Torcida cresce com vendas
            v_fans_growth := v_fans_growth + (v_quantity_to_sell * 2);
        END IF;
        
        -- Verificar se acabou o estoque
        IF (v_product.stock_quantity - v_quantity_to_sell) <= 0 THEN
            v_out_of_stock_count := v_out_of_stock_count + 1;
        END IF;
    END LOOP;
    
    -- Atualizar entregas que deveriam ter sido concluídas
    WITH updated_orders AS (
        UPDATE public.club_shop_orders
        SET status = 'delivered',
            actual_delivery_at = estimated_delivery_at,
            customer_satisfaction = FLOOR(random() * 2 + 4), 
            updated_at = now()
        WHERE club_id = p_club_id 
          AND status IN ('processing', 'separating', 'shipping', 'out_for_delivery')
          AND estimated_delivery_at <= now()
        RETURNING id
    )
    SELECT count(*) INTO v_completed_deliveries FROM updated_orders;

    -- Atualizar finanças e torcida do clube
    UPDATE public.clubs
    SET budget = budget + (v_total_revenue / 100.0),
        fans = fans + v_fans_growth
    WHERE id = p_club_id;

    v_result := jsonb_build_object(
        'revenue', v_total_revenue / 100.0,
        'products_sold', v_products_sold,
        'fans_growth', v_fans_growth,
        'completed_deliveries', v_completed_deliveries,
        'out_of_stock', v_out_of_stock_count
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.shipping_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_shop_sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistic_events ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on shipping companies') THEN
        CREATE POLICY "Allow public read on shipping companies" ON public.shipping_companies FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clubs can manage their orders') THEN
        CREATE POLICY "Clubs can manage their orders" ON public.club_shop_orders FOR ALL USING (club_id IN (SELECT id FROM public.clubs WHERE user_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clubs can view their sales history') THEN
        CREATE POLICY "Clubs can view their sales history" ON public.club_shop_sales_history FOR SELECT USING (club_id IN (SELECT id FROM public.clubs WHERE user_id = auth.uid()));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read on logistic events') THEN
        CREATE POLICY "Allow public read on logistic events" ON public.logistic_events FOR SELECT USING (true);
    END IF;
END $$;
