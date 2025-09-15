import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { usePayments } from "@/contexts/PaymentContext";
import { GatewayService } from "@/lib/gateway";

export default function useCheckout() {
  const { createEscrow, settings, calculateSplit } = usePayments();
  const navigate = useNavigate();
  useEffect(() => {
    const handler = async (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail || {};
      const bookingId = detail.bookingId || `BKG-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
      const amount = typeof detail.amount === 'number' ? detail.amount : 799; // ₹
      const storeId = detail.storeId || 's1';
      const freelancerId = detail.freelancerId || 'freelancer-1';
      const serviceId = detail.serviceId || 'svc1';
      try {
        const apiBase = import.meta.env.VITE_API_BASE || '';
        if (apiBase) {
          const res = await fetch(`${apiBase}/createCheckout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, currency: 'INR', bookingId, storeId, freelancerId, serviceId, gateway: settings.gateway }) });
          let raw = '';
        let data: any = {};
        try {
          if (!res.bodyUsed) {
            raw = await res.clone().text();
            try { data = raw ? JSON.parse(raw) : {}; } catch (e) { /* not JSON */ }
          }
        } catch (e) {
          // ignore
        }
        if (!res.ok) throw new Error((data && data.error) ? data.error : (raw || 'createCheckout failed'));
          const e = createEscrow({ bookingId, storeId, freelancerId, amount, method: settings.gateway, serviceId });
          const parts = calculateSplit(amount, serviceId);
          navigate('/payment/success', { state: { bookingId, total: e.total, split: parts, gateway: settings.gateway, orderId: data.orderId || data.paymentIntentId, paymentId: data.paymentId, status: 'created', bookingPayload: detail } });
          return;
        }
        const order = settings.gateway === 'razorpay'
          ? await GatewayService.createOrderRazorpay({ amount: amount * 100, currency: 'INR', receipt: bookingId }, settings.mode)
          : await GatewayService.createPaymentIntentStripe({ amount: amount * 100, currency: 'INR', receipt: bookingId }, settings.mode);
        const e = createEscrow({ bookingId, storeId, freelancerId, amount, method: settings.gateway, serviceId });
        const parts = calculateSplit(amount, serviceId);
        navigate('/payment/success', { state: { bookingId, total: e.total, split: parts, gateway: settings.gateway, orderId: order.id, status: order.status, bookingPayload: detail } });
      } catch (err:any) {
        console.error(err);
        navigate('/payment/failed', { state: { bookingId, error: err.message || 'Payment initiation failed' } });
      }
    };
    window.addEventListener('checkout:create', handler as EventListener);
    return () => window.removeEventListener('checkout:create', handler as EventListener);
  }, [createEscrow, settings, calculateSplit, navigate]);
}
