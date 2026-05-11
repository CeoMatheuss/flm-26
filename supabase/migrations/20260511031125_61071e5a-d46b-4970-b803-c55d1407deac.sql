CREATE OR REPLACE FUNCTION public.execute_admin_money_transfer(p_target_id uuid, p_value bigint, p_description text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_admin_id UUID;
    v_old_bal BIGINT;
    v_new_bal BIGINT;
    v_club_name TEXT;
    v_save_id UUID;
    v_club_data JSONB;
    v_source TEXT;
BEGIN
    v_admin_id := auth.uid();
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Ação não autorizada. Apenas administradores podem gerenciar finanças.';
    END IF;

    -- 1) Tenta tabela legado clubs
    SELECT budget, name INTO v_old_bal, v_club_name
    FROM public.clubs
    WHERE user_id = p_target_id
    FOR UPDATE;

    IF v_club_name IS NOT NULL THEN
        UPDATE public.clubs
        SET budget = budget + p_value, updated_at = now()
        WHERE user_id = p_target_id
        RETURNING budget INTO v_new_bal;
        v_source := 'clubs';
    ELSE
        -- 2) Fallback: game_saves (fonte real do save online)
        SELECT id, club_data INTO v_save_id, v_club_data
        FROM public.game_saves
        WHERE user_id = p_target_id
        FOR UPDATE
        LIMIT 1;

        IF v_save_id IS NULL THEN
            RAISE EXCEPTION 'O usuário alvo não possui clube nem save ativo.';
        END IF;

        v_club_name := COALESCE(v_club_data #>> '{club,name}', v_club_data ->> 'name', 'Clube');
        v_old_bal := COALESCE((v_club_data #>> '{club,budget}')::BIGINT, (v_club_data ->> 'budget')::BIGINT, 0);
        v_new_bal := v_old_bal + p_value;

        IF v_club_data ? 'club' THEN
            v_club_data := jsonb_set(v_club_data, '{club,budget}', to_jsonb(v_new_bal));
        ELSE
            v_club_data := jsonb_set(v_club_data, '{budget}', to_jsonb(v_new_bal));
        END IF;

        UPDATE public.game_saves
        SET club_data = v_club_data, updated_at = now()
        WHERE id = v_save_id;

        v_source := 'game_saves';
    END IF;

    -- Log de Auditoria
    INSERT INTO public.admin_finance_logs (admin_id, target_user_id, amount, reason)
    VALUES (v_admin_id, p_target_id, p_value, p_description);

    -- Notificação de Sistema (Corrigido para user_notifications)
    INSERT INTO public.user_notifications (user_id, title, message, type)
    VALUES (
        p_target_id,
        '💼 Movimentação Administrativa',
        'Seu saldo foi alterado em R$ ' || TO_CHAR(p_value, 'FM999G999G999G999') || '. Motivo: ' || p_description,
        'finance'
    );

    RETURN jsonb_build_object(
        'status', 'success',
        'club', v_club_name,
        'previous_balance', v_old_bal,
        'current_balance', v_new_bal,
        'difference', p_value,
        'source', v_source
    );
END;
$function$;