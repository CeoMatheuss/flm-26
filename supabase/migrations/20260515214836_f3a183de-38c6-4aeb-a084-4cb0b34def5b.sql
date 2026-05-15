-- Adicionar chave estrangeira se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_payment_orders_item_id'
    ) THEN
        ALTER TABLE public.payment_orders
        ADD CONSTRAINT fk_payment_orders_item_id
        FOREIGN KEY (item_id) 
        REFERENCES public.shop_items(id)
        ON DELETE SET NULL;
    END IF;
END $$;
