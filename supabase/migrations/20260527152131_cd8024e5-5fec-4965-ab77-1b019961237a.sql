ALTER TABLE public.user_notifications ADD COLUMN actions JSONB;
COMMENT ON COLUMN public.user_notifications.actions IS 'Array of objects: { label: string, type: string, payload: any, variant?: string }';
