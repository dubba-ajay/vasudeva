import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PaymentSecurityBadges from "@/components/features/PaymentSecurityBadges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function ProgressBar() {
  const steps = ["Cart", "Checkout", "Payment", "Done"];
  const active = 2; // Payment
  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded ${i <= active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}>{s}</span>
          {i < steps.length - 1 && <span className="w-6 h-[2px] bg-gray-200" />}
        </div>
      ))}
    </div>
  );
}

import { useEffect } from "react";
import useCheckout from "@/hooks/useCheckout";
import { CreditCard, Smartphone, Wallet, Building } from "lucide-react";

export default function Checkout() {
  useCheckout();
  const locationState = (history.state || {}) as any;
  // If navigated here with bookingPayload, dispatch checkout:create so useCheckout handles it
  useEffect(() => {
    const payload = locationState.bookingPayload;
    if (payload) {
      try {
        const evt = new CustomEvent('checkout:create', { detail: payload });
        window.dispatchEvent(evt);
      } catch {}
    }
  }, [locationState]);

  const item = {
    id: 1,
    name: "Premium Haircut Package",
    image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=800&auto=format&fit=crop",
    price: 799,
    qty: 1,
  };
  const tax = Math.round(item.price * 0.18);
  const total = item.price * item.qty + tax;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="pt-16">
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-gray-900" />
              <h1 className="text-2xl font-bold">Checkout</h1>
            </div>
            <ProgressBar />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded" />
                    <div className="flex-1">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-muted-foreground">Qty: {item.qty}</div>
                    </div>
                    <div className="font-semibold">₹{item.price.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="border-t pt-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><span>₹{(item.price * item.qty).toLocaleString("en-IN")}</span></div>
                    <div className="flex justify-between"><span>Tax (18%)</span><span>₹{tax.toLocaleString("en-IN")}</span></div>
                    <div className="flex justify-between text-base font-bold"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="upi" className="w-full">
                    <TabsList className="grid grid-cols-3 lg:grid-cols-5">
                      <TabsTrigger value="upi">UPI</TabsTrigger>
                      <TabsTrigger value="card">Card</TabsTrigger>
                      <TabsTrigger value="wallet">Wallet</TabsTrigger>
                      <TabsTrigger value="netbank">Net Banking</TabsTrigger>
                      <TabsTrigger value="paypal">PayPal</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upi" className="space-y-3 pt-4">
                      <label className="text-sm font-medium">UPI ID</label>
                      <input className="w-full border rounded px-3 py-2" placeholder="name@upi" />
                      <Button className="w-full">Verify & Pay</Button>
                    </TabsContent>

                    <TabsContent value="card" className="space-y-3 pt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <img src="/payments/visa.svg" alt="Visa" className="w-14 h-6 object-contain" />
                        <img src="/payments/mastercard.svg" alt="Mastercard" className="w-20 h-6 object-contain" />
                        <img src="/payments/amex.svg" alt="Amex" className="w-14 h-6 object-contain" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Card Number</label>
                          <input className="w-full border rounded px-3 py-2" placeholder="4111 1111 1111 1111" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Name on Card</label>
                          <input className="w-full border rounded px-3 py-2" placeholder="Full Name" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Expiry</label>
                          <input className="w-full border rounded px-3 py-2" placeholder="MM/YY" />
                        </div>
                        <div>
                          <label className="text-sm font-medium">CVV</label>
                          <input className="w-full border rounded px-3 py-2" placeholder="123" />
                        </div>
                      </div>
                      <Button className="w-full">Pay ₹{total.toLocaleString("en-IN")}</Button>
                    </TabsContent>

                    <TabsContent value="wallet" className="space-y-3 pt-4">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <img src="/payments/paytm.svg" alt="Paytm" className="w-28 h-8 object-contain" />
                        <img src="/payments/phonepe.svg" alt="PhonePe" className="w-28 h-8 object-contain" />
                        <img src="/payments/amazonpay.svg" alt="Amazon Pay" className="w-36 h-8 object-contain" />
                        <img src="/payments/mobikwik.svg" alt="Mobikwik" className="w-28 h-8 object-contain" />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {['Paytm','PhonePe','Amazon Pay','Mobikwik'].map(w => <Badge key={w} className="cursor-pointer">{w}</Badge>)}
                      </div>
                      <Button className="w-full">Proceed with Wallet</Button>
                    </TabsContent>

                    <TabsContent value="netbank" className="space-y-3 pt-4">
                      <select className="w-full border rounded px-3 py-2">
                        {['HDFC Bank','ICICI Bank','SBI','Axis Bank','Kotak'].map(b => <option key={b}>{b}</option>)}
                      </select>
                      <Button className="w-full">Pay via Net Banking</Button>
                    </TabsContent>

                    <TabsContent value="paypal" className="space-y-3 pt-4">
                      <div className="flex items-center justify-center mb-3">
                        <img src="/payments/paypal.svg" alt="PayPal" className="w-32 h-10 object-contain" />
                      </div>
                      <Button className="w-full">Continue to PayPal</Button>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-4 flex items-center justify-between flex-wrap text-sm text-muted-foreground gap-4">
                    <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-gray-700" /><span>Cards</span></div>
                    <div className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-green-600" /><span>UPI & Mobile</span></div>
                    <div className="flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" /><span>Wallets</span></div>
                    <div className="flex items-center gap-2"><Building className="w-5 h-5 text-indigo-600" /><span>Netbanking</span></div>
                    <div className="flex items-center gap-2"><img src="/payments/paypal.svg" alt="PayPal" className="w-10 h-6 object-contain" /><span>PayPal</span></div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Button onClick={async () => {
                      try {
                        const payload = { amount: item.price, bookingId: `BKG-${Math.random().toString(36).slice(2,8).toUpperCase()}`, storeId: 's1', freelancerId: undefined, serviceId: 'svc1' };
                        // call backend to create checkout (Razorpay order or Stripe payment intent)
                        const res = await fetch(`${(import.meta.env.VITE_API_BASE || '/.netlify/functions')}/createCheckout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: payload.amount, bookingId: payload.bookingId, storeId: payload.storeId, freelancerId: payload.freelancerId, serviceId: payload.serviceId, gateway: 'razorpay' }) });
                        // Read body as text once and attempt to parse JSON to avoid "body stream already read"
                        // If function is missing (404), fallback to simulating checkout for dev
                        if (res.status === 404) {
                          console.warn('createCheckout returned 404 — falling back to simulated checkout (dev)');
                          const evt = new CustomEvent('checkout:create', { detail: { amount: payload.amount, bookingId: payload.bookingId, storeId: payload.storeId, freelancerId: payload.freelancerId, serviceId: payload.serviceId } });
                          // persist a minimal state so PaymentSuccess can read it when navigated via href
                          try { localStorage.setItem('pending_payment_state', JSON.stringify({ bookingPayload: { storeId: payload.storeId, salonId: payload.storeId, salonName: '', salonAddress: '', date: undefined, time: undefined, services: [], location: 'salon', bookingId: payload.bookingId, serviceId: payload.serviceId }, total: payload.amount + Math.round(payload.amount * 0.18), gateway: 'razorpay', orderId: payload.bookingId, paymentId: payload.bookingId, status: 'created' })); } catch(_) {}
                          window.dispatchEvent(evt);
                          (window as any).location && ((window as any).location.href = '/payment/success');
                          return;
                        }

                        // Safely read response body. If body is already used, fall back to generic handling.
                        let raw = '';
                        let data: any = {};
                        try {
                          if (!res.bodyUsed) {
                            raw = await res.clone().text();
                            try { data = raw ? JSON.parse(raw) : {}; } catch (e) { /* not JSON */ }
                          }
                        } catch (e) {
                          // cloning or reading failed (body already used); leave raw/data empty
                        }
                        if (!res.ok) {
                          const errMsg = (data && data.error) ? data.error : (raw || 'createCheckout failed');
                          throw new Error(errMsg);
                        }

                        // if testMode returned, simulate immediate success and navigate
                        if (data?.testMode) {
                          // create escrow locally via PaymentContext and navigate
                          // import dynamically to avoid circular deps
                          const { default: useCheckout } = await import('@/hooks/useCheckout');
                          // We will mimic useCheckout behavior: create escrow client-side and navigate
                          // But we have access to window event used by useCheckout — trigger it with detail
                          const evt = new CustomEvent('checkout:create', { detail: { amount: payload.amount, bookingId: payload.bookingId, storeId: payload.storeId, freelancerId: payload.freelancerId, serviceId: payload.serviceId } });
                          window.dispatchEvent(evt);
                          // navigate to success page similar to useCheckout flow
                          const total = payload.amount + Math.round(payload.amount * 0.18);
                          const parts = (window as any).paymentParts || null;
                          // best-effort navigate
                          (window as any).location && ((window as any).location.href = '/payment/success');
                          return;
                        }

                        // Live flow: open Razorpay checkout using SDK and order id
                        const orderId = data.orderId || data.paymentIntentId || data.paymentId;
                        // load razorpay script
                        await new Promise((resolve, reject) => {
                          if ((window as any).Razorpay) return resolve(true);
                          const s = document.createElement('script');
                          s.src = 'https://checkout.razorpay.com/v1/checkout.js';
                          s.onload = () => resolve(true);
                          s.onerror = () => reject(new Error('Failed to load Razorpay script'));
                          document.body.appendChild(s);
                        });

                        const key = import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.VITE_RAZORPAY_KEY || '';
                        const options: any = {
                          key,
                          amount: (payload.amount + Math.round(payload.amount * 0.18)) * 100,
                          currency: 'INR',
                          order_id: orderId,
                          name: 'Bliss Salon',
                          description: 'Booking Payment',
                          handler: async (response: any) => {
                            // payment success handler — navigate to success page
                            try {
                              // You may want to notify backend or call webhook simulator here
                              window.location.href = '/payment/success';
                            } catch (e) { window.location.href = '/payment/failed'; }
                          },
                          modal: { escape: true },
                          theme: { color: '#3399cc' }
                        };
                        const rzp = new (window as any).Razorpay(options);
                        rzp.open();

                      } catch (err:any) {
                        console.error('Proceed to pay failed', err);
                        try { alert(err.message || String(err)); } catch(_){}
                      }
                    }} className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl text-base py-6">Proceed to Pay</Button>
                    <div className="text-xs text-center text-muted-foreground">🔒 100% Secure Payments</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <PaymentSecurityBadges />
      </main>
      <Footer />
    </div>
  );
}
