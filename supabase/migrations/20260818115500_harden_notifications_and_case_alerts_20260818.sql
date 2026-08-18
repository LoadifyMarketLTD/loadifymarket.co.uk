-- Loadify Market: make cross-user notifications server-owned. End users may
-- read/update their own notifications, but may not fabricate arbitrary alerts
-- for other accounts. Return/dispute alerts are emitted by trusted DB triggers.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'order','payment','shipment','return','dispute','message','review',
    'product_question','rfq','delivery','promotion','system','general',
    'seller_approved','seller_rejected','product_approved','product_rejected',
    'question_answered','offer_received','offer_accepted','offer_rejected',
    'support_ticket','order_refunded'
  ));

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
FOR INSERT
WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.notify_return_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.notifications ("userId", type, title, message, link)
    VALUES (
      NEW."buyerId",
      'return',
      'Return approved',
      'Your return request has been approved. Follow the seller instructions and keep your return tracking details.',
      '/buyer/orders'
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications ("userId", type, title, message, link)
    VALUES (
      NEW."buyerId",
      'return',
      'Return rejected',
      'Your return request was rejected. Contact support if you believe the decision needs review.',
      '/buyer/orders'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_return_status_change ON public.returns;
CREATE TRIGGER trg_notify_return_status_change
AFTER UPDATE OF status ON public.returns
FOR EACH ROW
EXECUTE FUNCTION public.notify_return_status_change();

CREATE OR REPLACE FUNCTION public.notify_dispute_opened()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications ("userId", type, title, message, link)
  VALUES (
    NEW."sellerId",
    'dispute',
    'Buyer dispute opened',
    'A buyer opened a dispute for one of your orders. Keep all order and delivery evidence available while the case is reviewed.',
    '/seller/orders'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_dispute_opened ON public.disputes;
CREATE TRIGGER trg_notify_dispute_opened
AFTER INSERT ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.notify_dispute_opened();
