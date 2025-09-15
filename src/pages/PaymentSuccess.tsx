import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useEffect, useState } from 'react';
import { useLocation as useAppLocation } from '@/contexts/LocationContext';
import { useLocation } from 'react-router-dom';
import { bookSlot } from '@/lib/availability';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApiBase, apiFetch } from "@/lib/api";
import { toast } from "sonner";
import LeafletMap from "@/components/Map/LeafletMap";

function ConfettiBg() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden>
      <div className="w-full h-full" style={{
        backgroundImage: "repeating-radial-gradient(circle at 20% 30%, #22c55e 0 2px, transparent 3px 40px), repeating-radial-gradient(circle at 80% 40%, #3b82f6 0 2px, transparent 3px 50px), repeating-radial-gradient(circle at 40% 80%, #f59e0b 0 2px, transparent 3px 60px)",
        backgroundSize: "auto",
      }} />
    </div>
  );
}

export default function PaymentSuccess() {
  const nav = useNavigate();
  // state passed via navigate('/payment/success', { state: { ... } })
  const routerLocation = useLocation();
  const initialState = (routerLocation.state as any) || {};
  const [state, setState] = useState<any>(initialState);

  useEffect(() => {
    if (!initialState || !initialState.bookingPayload) {
      try {
        const raw = localStorage.getItem('pending_payment_state');
        if (raw) {
          const parsed = JSON.parse(raw);
          setState(parsed);
          // remove after reading
          localStorage.removeItem('pending_payment_state');
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const txn = {
    id: (state.orderId || ("TXN" + Math.random().toString(36).slice(2,8).toUpperCase())),
    amount: (state.total ?? 0),
    method: (state.gateway ?? 'razorpay'),
    date: new Date().toLocaleString(),
    split: state.split,
    status: state.status || 'created'
  };

  const bookingPayload = state.bookingPayload || undefined;
  const [bookingSaved, setBookingSaved] = useState(false);
  const [savedBooking, setSavedBooking] = useState<any>(null);

  // useAppLocation provides requestLocation; but hook name is useLocation in context
  // To avoid name conflict with react-router, call it useAppLocation earlier and import useLocation for browser location
  const { requestLocation, location } = useAppLocation();

  useEffect(() => {
    if (!location) requestLocation();
  }, []);

  useEffect(() => {
    const save = async () => {
      if (!bookingPayload) return;
      // avoid duplicate saves
      const existing = (localStorage.getItem('myBookings') ? JSON.parse(localStorage.getItem('myBookings') as string) : []) as any[];
      if (existing.find(b => b.id === bookingPayload.bookingId)) {
        setBookingSaved(true);
        setSavedBooking(existing.find(b => b.id === bookingPayload.bookingId));
        return;
      }

      // helper: parse 12h time like '9:30 AM' to '09:30'
      const parseTime12 = (t: string | undefined) => {
        if (!t) return undefined;
        const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!m) return undefined;
        let hh = parseInt(m[1], 10);
        const mm = m[2];
        const mer = m[3].toUpperCase();
        if (mer === 'PM' && hh !== 12) hh += 12;
        if (mer === 'AM' && hh === 12) hh = 0;
        return `${String(hh).padStart(2,'0')}:${mm}`;
      };

      const addMinutes = (time24: string | undefined, mins: number) => {
        if (!time24) return undefined;
        const [h, m] = time24.split(':').map(n => parseInt(n,10));
        const dt = new Date(); dt.setHours(h); dt.setMinutes(m + mins); dt.setSeconds(0); dt.setMilliseconds(0);
        return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      };

      // Build payload for server API if available
      try {
        const apiBase = getApiBase();
        const time24 = parseTime12(bookingPayload.time);
        const duration = bookingPayload.durationMinutes || bookingPayload.duration || 60;
        const endTime = addMinutes(time24, Number(duration) || 60);

        // Prefer to call backend API if present
        if (apiBase) {
          try {
            const userId = (typeof (window as any).__auth_user_id__ !== 'undefined') ? (window as any).__auth_user_id__ : (null as any);
            // Try to obtain user id from supabase session if available via DOM global set by app; fallback to guest id
            const payload: any = {
              userId: (() => {
                try {
                  // Attempt to read from local auth context if set on window
                  if ((window as any).__auth_user_id__) return (window as any).__auth_user_id__;
                } catch {}
                return `guest_${Math.random().toString(36).slice(2,8)}`;
              })(),
              storeId: bookingPayload.storeId || bookingPayload.salonId || String(bookingPayload.salonId || ''),
              serviceId: bookingPayload.serviceId || undefined,
              date: bookingPayload.date,
              startTime: time24,
              endTime: endTime,
              locationType: bookingPayload.location || 'salon',
              notes: (bookingPayload.services && Array.isArray(bookingPayload.services)) ? bookingPayload.services.join(', ') : bookingPayload.notes || ''
            };

            // serviceId is required by API; if missing, fallback to local save
            if (!payload.serviceId) throw new Error('Missing serviceId in booking payload - saving locally');

            const res = await apiFetch('/createBooking', { method: 'POST', body: JSON.stringify(payload) });
            const data = await res.json();
            setBookingSaved(true);
            setSavedBooking(data.booking || data);
            return;
          } catch (err: any) {
            console.warn('API booking failed or unavailable; falling back to local storage', err?.message || err);
            // fallthrough to local save
          }
        }

        // Fallback: store locally using bookSlot helper (existing behaviour)
        const rec = await bookSlot({
          salonId: Number(bookingPayload.storeId) || Number(bookingPayload.salonId) || 0,
          salonName: bookingPayload.salonName || '',
          date: bookingPayload.date,
          time: bookingPayload.time,
          location: bookingPayload.location || 'salon',
          services: bookingPayload.services || []
        });
        setBookingSaved(true);
        setSavedBooking(rec);
      } catch (err) {
        console.error('Failed to save booking after payment', err);
      }
    };
    save();

    // Auto-simulate webhook in dev/test mode to complete flow only if explicitly enabled
    const RAZORPAY_TEST = (import.meta.env.VITE_RAZORPAY_TEST_MODE === 'true') || (import.meta.env.RAZORPAY_TEST_MODE === 'true');
    let simulated = false;
    (async () => {
      try {
        if (!RAZORPAY_TEST || !state.paymentId || simulated) return;
        // Respect query param ?autoSimulate=1 or persisted dev toggle
        const params = new URLSearchParams(window.location.search);
        const autoQuery = params.get('autoSimulate') === '1';
        if (!autoQuery && !autoSimEnable) return;

        simulated = true;
        toast('Simulating payment capture (dev)...');
        const res = await apiFetch('/simulateWebhook', { method: 'POST', body: JSON.stringify({ paymentId: state.paymentId }) });
        const j = await res.json();
        toast.success && toast.success('Payment capture simulated');
        // reload to show updated booking state
        window.location.reload();
      } catch (e:any) {
        toast.error && toast.error('Auto-simulate failed: ' + (e?.message || String(e)));
      }
    })();
  }, [bookingPayload]);

  const [autoShare, setAutoShare] = useState<boolean>(() => { try { return localStorage.getItem('wa_auto_share') === 'true'; } catch { return false; } });
  const [waOpened, setWaOpened] = useState(false);

  // Dev-only: control whether to auto-simulate capture on page load
  const [autoSimEnable, setAutoSimEnable] = useState<boolean>(() => { try { return localStorage.getItem('autoSimulate') === 'true'; } catch { return false; } });

  const userLocLabel = location?.address || 'Your address (not provided)';

  const buildWhatsAppMessage = (includeCopy = false) => {
    const parts: string[] = [];
    parts.push('Booking Confirmed!');
    if (bookingPayload) {
      if (bookingPayload.salonName) parts.push(`Salon: ${bookingPayload.salonName}`);
      if (bookingPayload.date) parts.push(`Date: ${bookingPayload.date}`);
      if (bookingPayload.time) parts.push(`Time: ${bookingPayload.time}`);
      if (bookingPayload.services && Array.isArray(bookingPayload.services)) parts.push(`Services: ${bookingPayload.services.join(', ')}`);
      parts.push(`Booking ID: ${bookingPayload.bookingId || ''}`);
    }

    // location link: prefer salon address + user coords
    let mapLink = '';
    if (bookingPayload && bookingPayload.salonAddress) {
      mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bookingPayload.salonAddress)}`;
    }
    if (location && location.latitude && location.longitude) {
      const userMap = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      if (bookingPayload && bookingPayload.location === 'home' && mapLink) {
        // include both
        parts.push(`Salon: ${mapLink}`);
        parts.push(`My location: ${userMap}`);
      } else {
        parts.push(userMap);
      }
    } else if (mapLink) {
      parts.push(mapLink);
    }

    const msg = parts.join('\n');
    if (includeCopy) return msg;
    return encodeURIComponent(msg);
  };

  const sendWhatsApp = (copyOnly = false) => {
    if (!bookingPayload) return;
    const msg = buildWhatsAppMessage(copyOnly);
    if (copyOnly) {
      // copy to clipboard
      try { navigator.clipboard.writeText(msg); alert('Booking message copied to clipboard'); } catch { alert('Copy failed'); }
      return;
    }
    const url = `https://wa.me/?text=${msg}`;
    try {
      window.open(url, '_blank');
      setWaOpened(true);
    } catch (err) { console.error('WhatsApp share failed', err); }
  };

  // Auto-share when bookingSaved & autoShare enabled
  useEffect(() => {
    if (bookingSaved && autoShare && !waOpened && bookingPayload) {
      sendWhatsApp(false);
    }
  }, [bookingSaved, autoShare, waOpened, bookingPayload]);

  useEffect(() => {
    try { localStorage.setItem('wa_auto_share', autoShare ? 'true' : 'false'); } catch {}
  }, [autoShare]);

  return (
    <div className="relative min-h-screen flex flex-col bg-white">
      <Header />
      <main className="pt-16">
        <ConfettiBg />
        <div className="container mx-auto px-4 lg:px-6 py-12">
          <div className="mx-auto max-w-md text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
            <h1 className="text-3xl font-bold">Payment Successful 🎉</h1>
            <p className="text-muted-foreground">Your order has been placed successfully.</p>

            <Card>
              <CardHeader><CardTitle>Transaction Details</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Transaction ID</span><span className="font-medium">{txn.id}</span></div>
                <div className="flex justify-between"><span>Amount Paid</span><span className="font-medium">₹{txn.amount.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span>Payment Method</span><span className="font-medium">{txn.method}</span></div>
                <div className="flex justify-between"><span>Status</span><span className="font-medium capitalize">{txn.status}</span></div>
                <div className="flex justify-between"><span>Date</span><span className="font-medium">{txn.date}</span></div>
              </CardContent>
            </Card>

            {txn.split && (
              <Card>
                <CardHeader><CardTitle>Split Breakdown</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between"><span>Store</span><span className="font-medium">₹{Math.round((txn.split.rule.storePct/100)*(txn.amount || 0)).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span>Freelancer</span><span className="font-medium">₹{Math.round((txn.split.rule.freelancerPct/100)*(txn.amount || 0)).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span>Platform</span><span className="font-medium">₹{Math.max(0, (txn.amount || 0) - Math.round((txn.split.rule.storePct/100)*(txn.amount || 0)) - Math.round((txn.split.rule.freelancerPct/100)*(txn.amount || 0))).toLocaleString('en-IN')}</span></div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 justify-center">
              <Button className="rounded-xl" onClick={() => nav('/')}>Go Home</Button>
              <Button className="rounded-xl" variant="outline" onClick={() => nav('/user-dashboard')}>Go to Dashboard</Button>
              {state.paymentId && (
                <a href={`${getApiBase()}/invoice?paymentId=${state.paymentId}`} target="_blank" rel="noopener" className="inline-flex items-center px-4 py-2 rounded-xl border">Download Invoice</a>
              )}

              {/* Dev-only: simulate webhook to mark payment captured and trigger assignment */}
              {((import.meta.env.VITE_RAZORPAY_TEST_MODE === 'true') || (import.meta.env.RAZORPAY_TEST_MODE === 'true')) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">Dev Only</span>

                  <label className="inline-flex items-center text-sm gap-2">
                    <input type="checkbox" checked={autoSimEnable} onChange={(e)=>{ try { localStorage.setItem('autoSimulate', e.target.checked ? 'true' : 'false'); setAutoSimEnable(e.target.checked);}catch{} }} className="w-4 h-4" />
                    <span className="text-xs">Auto-sim on load</span>
                  </label>

                  <Button title="Test-mode only: simulates Razorpay payment capture via local webhook. Does not affect production." aria-label="Simulate payment capture (dev)" variant="ghost" className="rounded-xl text-sm px-3 py-1" onClick={async () => {
                    try {
                      // call simulateWebhook; apiFetch adds base
                      toast('Simulating webhook...');
                      const res = await apiFetch('/simulateWebhook', { method: 'POST', body: JSON.stringify({ paymentId: state.paymentId }) });
                      const j = await res.json();
                      toast.success && toast.success('Webhook simulated');
                      // reload to reflect updated booking/assignment statuses
                      window.location.reload();
                    } catch (e:any) {
                      toast.error && toast.error('simulateWebhook failed: ' + (e?.message || String(e)));
                    }
                  }}>Simulate capture (dev)</Button>
                </div>
              )}
            </div>

            {bookingPayload && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Salon Location</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    {/* Interactive map showing salon marker */}
                    <div className="h-48 w-full rounded overflow-hidden mb-3">
                      <LeafletMap
                        salon={{ name: bookingPayload.salonName, address: bookingPayload.salonAddress }}
                        userLocation={location ? { latitude: location.latitude, longitude: location.longitude } : null}
                        height={192}
                        showRoute={false}
                      />
                    </div>

                    <div className="font-medium">{bookingPayload.salonName}</div>
                    <div className="text-muted-foreground">{bookingPayload.salonAddress}</div>
                    <div className="mt-2">
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(bookingPayload.salonAddress || bookingPayload.salonName)}`} target="_blank" rel="noopener" className="text-sm text-blue-600">Open in Maps</a>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Your Location</CardTitle></CardHeader>
                  <CardContent className="text-sm">
                    {/* For home services show directions from user -> salon, otherwise show user location */}
                    {bookingPayload.location === 'home' && location ? (
                      <div className="h-48 w-full rounded overflow-hidden mb-3">
                        <LeafletMap
                          salon={{ name: bookingPayload.salonName, address: bookingPayload.salonAddress }}
                          userLocation={{ latitude: location.latitude, longitude: location.longitude }}
                          height={192}
                          showRoute={true}
                        />
                      </div>
                    ) : location ? (
                      <div className="h-48 w-full rounded overflow-hidden mb-3">
                        <LeafletMap
                          salon={{ name: bookingPayload.salonName, address: bookingPayload.salonAddress }}
                          userLocation={{ latitude: location.latitude, longitude: location.longitude }}
                          height={192}
                          showRoute={false}
                        />
                      </div>
                    ) : (
                      <div className="h-48 w-full rounded bg-gray-100 flex items-center justify-center mb-3 text-sm text-muted-foreground">Location not available</div>
                    )}

                    <div className="font-medium">{userLocLabel}</div>
                    <div className="text-muted-foreground">{bookingSaved ? 'Booking confirmed for this location' : 'Booking will be confirmed shortly'}</div>
                    {bookingPayload.location === 'home' && (
                      <div className="mt-2 text-sm">A freelancer will visit the above address for the home service.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="text-xs text-muted-foreground">Need help? Contact Support</div>

            {/* WhatsApp share controls */}
            {bookingPayload && (
              <div className="mt-4 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3 mb-2">
                  <input id="waAuto" type="checkbox" className="w-4 h-4" defaultChecked={localStorage.getItem('wa_auto_share') === 'true'} onChange={(e)=>{ try{ localStorage.setItem('wa_auto_share', e.target.checked ? 'true' : 'false'); setAutoShare(e.target.checked);}catch{}}} />
                  <label htmlFor="waAuto" className="text-sm">Auto-share booking & location via WhatsApp on success</label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => sendWhatsApp(false)} className="rounded-xl">Share on WhatsApp</Button>
                  <Button variant="outline" onClick={() => sendWhatsApp(true)} className="rounded-xl">Copy message</Button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">Sharing will open WhatsApp (web or app) with a pre-filled message containing your booking details and location link.</div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
