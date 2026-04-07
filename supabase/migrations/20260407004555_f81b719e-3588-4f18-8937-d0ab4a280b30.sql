-- Allow admins to insert notifications for any user
CREATE POLICY "Admins can insert notifications for any user"
ON public.user_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
);
