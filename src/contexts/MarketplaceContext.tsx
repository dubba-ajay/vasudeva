import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { allStores } from '@/components/features/AllStores';
import { apiFetch } from '@/lib/api';

export type Role = "guest" | "freelancer" | "owner";

export type Job = {
  id: string;
  storeId: string;
  storeName: string;
  title: string;
  location: string;
  date: string; // ISO date
  startTime: string; // HH:mm
  hours: number;
  rate: number; // per hour
  homeService: boolean;
  status: "open" | "applied" | "assigned" | "in_progress" | "completed" | "paid";
  freelancerId?: string;
};

export type Earning = {
  id: string;
  jobId: string;
  date: string; // ISO date
  amount: number;
  status: "pending" | "paid";
};

export type Booking = {
  id: string;
  storeId: string;
  storeName: string;
  date: string; // ISO date
  price: number;
  startTime?: string;
  endTime?: string;
  locationType?: "salon" | "home";
  status?: "pending" | "assigned" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled";
  allowClaim?: boolean;
  serviceId?: string;
  freelancerId?: string | null;
};

export type Freelancer = {
  id: string;
  name?: string;
  location?: string; // city/area
  skills?: string[];
  linkedStores?: string[]; // storeIds
  availabilities?: { date: string; startTime: string; endTime: string }[];
};

export type Store = {
  id: string;
  name: string;
  city?: string;
  needsFreelancers?: boolean;
};


const uid = () => Math.random().toString(36).slice(2, 9);

const todayISO = () => new Date().toISOString().slice(0,10);

export type MarketplaceState = {
  role: Role;
  setRole: (r: Role) => void;
  freelancerId: string; // simulated current freelancer id
  ownerStoreId: string; // simulated current owner's store id
  jobs: Job[];
  bookings: Booking[];
  earnings: Earning[];
  // derived
  openJobs: Job[];
  myJobs: Job[];
  todaysEarnings: number;
  todaysRevenue: number;
  bookingsToday: number;
  // actions (freelancer)
  applyToJob: (jobId: string) => void;
  startJob: (jobId: string) => void;
  completeJob: (jobId: string) => void;
  requestPayout: (jobId: string) => void;
  // actions (owner)
  postJob: (partial: Omit<Job, "id" | "status">) => void;
  markBooking: (price: number) => void;
  // helpers (optional)
  isHomeServiceAvailable?: (storeId: string, date: string, startTime: string, durationMin?: number) => boolean;
  getAvailableFreelancersForSlot?: (storeId: string, date: string, startTime: string, durationMin?: number) => string[];
  stores?: Store[];
  freelancers?: Freelancer[];
  listOpenJobsForFreelancer?: (fid: string) => Job[];
  createBookingLocal?: (b: Partial<Booking> & { storeId: string; storeName: string; date: string; startTime?: string; endTime?: string; locationType?: 'salon'|'home' }) => Booking;
  cancelBookingLocal?: (bookingId: string, reason?: string) => void;
};

const MarketplaceContext = createContext<MarketplaceState | null>(null);

export const useMarketplace = () => {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error("useMarketplace must be used within MarketplaceProvider");
  return ctx;
};

// safe variant that returns null when provider is not present (useful for modals mounted outside provider during SSR or early mount)
export const useMarketplaceSafe = () => {
  const ctx = useContext(MarketplaceContext);
  return ctx;
};

const seedJobs: Job[] = [
  {
    id: uid(), storeId: "s1", storeName: "Elite Men's Grooming", title: "Barber - Haircut & Beard",
    location: "Connaught Place", date: todayISO(), startTime: "11:00", hours: 4, rate: 300,
    homeService: false, status: "assigned", freelancerId: "freelancer-1",
  },
  {
    id: uid(), storeId: "s2", storeName: "Glamour Hair & Beauty", title: "Hair Stylist",
    location: "Bandra", date: todayISO(), startTime: "15:00", hours: 5, rate: 350,
    homeService: true, status: "open",
  },
  {
    id: uid(), storeId: "s3", storeName: "Nail Couture", title: "Nail Tech (Gel)",
    location: "Indiranagar", date: todayISO(), startTime: "12:00", hours: 3, rate: 280,
    homeService: false, status: "open",
  },
];

const seedBookings: Booking[] = [
  { id: uid(), storeId: "s1", storeName: "Elite Men's Grooming", date: todayISO(), price: 499, startTime: "10:00", endTime: "11:00", locationType: 'salon', status: 'assigned' },
  { id: uid(), storeId: "s1", storeName: "Elite Men's Grooming", date: todayISO(), price: 699, startTime: "11:30", endTime: "12:30", locationType: 'salon', status: 'assigned' },
  { id: uid(), storeId: "s2", storeName: "Glamour Hair & Beauty", date: todayISO(), price: 899, startTime: "15:00", endTime: "16:00", locationType: 'home', status: 'pending' },
];

const seedFreelancers: Freelancer[] = [
  { id: 'freelancer-1', name: 'Asha', location: 'Connaught Place', skills: ['haircut','beard'], linkedStores: ['s1'], availabilities: [{ date: todayISO(), startTime: '09:00', endTime: '17:00' }] },
  { id: 'freelancer-2', name: 'Kabir', location: 'Bandra', skills: ['haircolor','stylist'], linkedStores: ['s2'], availabilities: [{ date: todayISO(), startTime: '13:00', endTime: '18:00' }] },
  // Added Krish for Elite Men's Grooming (s1) to support manual assignment and home visits
  { id: 'freelancer-krish', name: 'Krish', location: 'Connaught Place', skills: ['haircut','beard'], linkedStores: ['s1'], availabilities: [{ date: todayISO(), startTime: '09:00', endTime: '19:00' }] },
];

const seedStores: Store[] = [
  { id: 's1', name: "Elite Men's Grooming", city: 'Delhi', needsFreelancers: false },
  { id: 's2', name: 'Glamour Hair & Beauty', city: 'Mumbai', needsFreelancers: false },
  { id: 's3', name: 'Nail Couture', city: 'Bengaluru', needsFreelancers: false },
];

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [role, setRole] = useState<Role>("guest");
  const [jobs, setJobs] = useState<Job[]>(seedJobs);
  const [bookings, setBookings] = useState<Booking[]>(seedBookings);
  const [earnings, setEarnings] = useState<Earning[]>([]);

  // Current ids (can be mapped from auth user)
  const [currentFreelancerId, setCurrentFreelancerId] = useState<string | null>(seedFreelancers.find(f => f.id === 'freelancer-krish') ? 'freelancer-krish' : 'freelancer-1');
  const [currentOwnerStoreId, setCurrentOwnerStoreId] = useState<string | null>('s1');

  // additional in-memory data
  const [freelancers, setFreelancers] = useState<Freelancer[]>(seedFreelancers);
  const [stores, setStores] = useState<Store[]>(seedStores);

  // sync marketplace role with authenticated user role when available
  React.useEffect(() => {
    if (auth?.role) {
      const r = String(auth.role).toLowerCase();
      if (r === 'owner' || r === 'freelancer' || r === 'guest') setRole(r as Role);
      else setRole('guest');
    }
  }, [auth?.role]);

  // Map authenticated user to marketplace identities (freelancer or owner store)
  React.useEffect(() => {
    let mounted = true;
    const mapProfile = async () => {
      try {
        // prefer explicit supabase user id, otherwise try to decode token
        let userId: string | null = auth?.user?.id ?? null;
        if (!userId && auth?.token) {
          try {
            const parts = auth.token.split('.');
            if (parts.length === 3) {
              const body = JSON.parse(atob(parts[1]));
              userId = body.id || null;
            }
          } catch (e) { /* ignore */ }
        }

        const phone: string | null = auth?.user?.phone ?? auth?.user?.user_metadata?.phone ?? auth?.user?.user_metadata?.phone_number ?? null;
        const email: string | null = auth?.user?.email ?? auth?.user?.user_metadata?.email ?? null;

        // If we have neither id nor phone nor email, nothing to map
        if (!userId && !phone && !email) return;

        const qs = new URLSearchParams();
        if (userId) qs.set('userId', userId);
        if (phone) qs.set('phone', phone);
        if (email) qs.set('email', email);

        const res = await apiFetch(`/getProfile?${qs.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (data.type === 'freelancer' && data.freelancer) {
          const f = data.freelancer;
          setCurrentFreelancerId(f.id);
          // merge into in-memory freelancers if not present
          setFreelancers(prev => {
            if (prev.find(p => p.id === f.id)) return prev;
            return [{ id: f.id, name: f.name || f.id, location: f.city || '', skills: f.skills || [], linkedStores: f.linkedStores || [], availabilities: f.availabilities || [] }, ...prev];
          });
        } else if (data.type === 'store' && data.store) {
          const s = data.store;
          setCurrentOwnerStoreId(s.id);
          setStores(prev => {
            if (prev.find(p => p.id === s.id)) return prev;
            return [{ id: s.id, name: s.name || 'Store', city: s.city || '', needsFreelancers: false }, ...prev];
          });
        }
      } catch (e) {
        // ignore mapping errors
      }
    };
    mapProfile();
    return () => { mounted = false; };
  }, [auth?.user, auth?.token]);

  // Poll backend for bookings regularly so UI reacts to assignments/accepts made via API
  React.useEffect(() => {
    let mounted = true;
    const loadBookings = async () => {
      try {
        const res = await apiFetch(`/listBookings`);
        const data = await res.json();
        if (!mounted) return;
        const fetched: Booking[] = (data.bookings || []).map((b: any) => ({
          id: b.id,
          storeId: b.storeId,
          storeName: b.storeName,
          date: (b.date || '').slice(0,10),
          price: b.price || 0,
          startTime: b.startTime,
          endTime: b.endTime,
          locationType: b.locationType,
          status: b.status,
          allowClaim: !!b.allowClaim,
          serviceId: b.serviceId,
          freelancerId: b.freelancerId || null,
        }));
        setBookings(fetched);
      } catch (e) {
        // ignore network errors; keep in-memory bookings
      }
    };
    loadBookings();
    const iv = setInterval(loadBookings, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  const openJobs = useMemo(() => jobs.filter(j => j.status === "open"), [jobs]);
  const myJobs = useMemo(() => jobs.filter(j => j.freelancerId === currentFreelancerId), [jobs, currentFreelancerId]);

  const todaysEarnings = useMemo(() => earnings.filter(e => e.date === todayISO()).reduce((s, e) => s + e.amount, 0), [earnings]);
  const todaysRevenue = useMemo(() => bookings.filter(b => b.date === todayISO()).reduce((s, b) => s + b.price, 0), [bookings]);
  const bookingsToday = useMemo(() => bookings.filter(b => b.date === todayISO()).length, [bookings]);

  // Helper: time overlap
  const overlap = (s1: string, e1: string, s2: string, e2: string) => {
    const toMin = (t: string) => {
      const [h,m] = t.split(':').map(x=>parseInt(x,10)); return h*60 + (m||0);
    };
    return Math.max(toMin(s1), toMin(s2)) < Math.min(toMin(e1), toMin(e2));
  };

  // helper: match store ids robustly (string equality or numeric digits match)
  const storeIdMatches = (paramId: any, candidateId: any) => {
    const a = String(paramId ?? "");
    const b = String(candidateId ?? "");
    if (a === b) return true;
    const da = a.replace(/\D/g, "");
    const db = b.replace(/\D/g, "");
    if (da && db && da === db) return true;
    // If paramId is numeric (from allStores), try to resolve by store name in our local stores list
    try {
      const num = Number(a);
      if (!isNaN(num)) {
        const ext = allStores?.find((s:any) => Number(s.id) === num);
        if (ext) {
          const match = stores.find(s => String(s.name).toLowerCase() === String(ext.name).toLowerCase());
          if (match) return true;
        }
      }
    } catch (e) { /* ignore */ }
    return false;
  };

  // Check if at least one freelancer is available for store at given date/time/duration
  const isHomeServiceAvailable = (storeId: string, date: string, startTime: string, durationMin = 60) => {
    // find freelancers in same city or linked to store
    const candidates = freelancers.filter(f => (f.linkedStores || []).some(ls => storeIdMatches(ls, storeId)) || (f.location && stores.find(s=> storeIdMatches(s.id, storeId) && s.city===f.location)));
    for (const f of candidates) {
      // check availability entries for date
      const avail = (f.availabilities || []).find(a => a.date === date);
      if (!avail) continue;
      // compute endTime
      const parts = startTime.split(':').map(x=>parseInt(x,10));
      const endH = parts[0] + Math.floor((parts[1]||0 + durationMin)/60);
      const endM = (parts[1]||0 + durationMin) % 60;
      const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
      if (!overlap(avail.startTime, avail.endTime, startTime, endTime)) continue; // not within availability
      // check existing bookings for that freelancer for conflicts (only consider active statuses)
      const conflict = bookings.some(b => b.freelancerId === f.id && b.date === date && b.startTime && b.endTime && ['assigned','accepted','in_progress'].includes(b.status || '') && overlap(b.startTime, b.endTime, startTime, endTime));
      if (!conflict) return true;
    }
    return false;
  };

  // get available freelancer ids for slot
  const getAvailableFreelancersForSlot = (storeId: string, date: string, startTime: string, durationMin = 60) => {
    const res: string[] = [];
    const candidates = freelancers.filter(f => (f.linkedStores || []).some(ls => storeIdMatches(ls, storeId)) || (f.location && stores.find(s=> storeIdMatches(s.id, storeId) && s.city===f.location)));
    for (const f of candidates) {
      const avail = (f.availabilities || []).find(a => a.date === date);
      if (!avail) continue;
      const parts = startTime.split(':').map(x=>parseInt(x,10));
      const endH = parts[0] + Math.floor((parts[1]||0 + durationMin)/60);
      const endM = (parts[1]||0 + durationMin) % 60;
      const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
      if (!overlap(avail.startTime, avail.endTime, startTime, endTime)) continue;
      const conflict = bookings.some(b => b.freelancerId === f.id && b.date === date && b.startTime && b.endTime && ['assigned','accepted','in_progress'].includes(b.status || '') && overlap(b.startTime, b.endTime, startTime, endTime));
      if (!conflict) res.push(f.id);
    }
    return res;
  };

  // mark stores as needsFreelancers when pending bookings > capacity
  const updateStoreNeeds = () => {
    setStores(prev => prev.map(s => {
      const pending = bookings.filter(b => b.storeId === s.id && b.status === 'pending').length;
      const capacity = freelancers.filter(f => (f.linkedStores || []).includes(s.id)).length || 0;
      const needs = capacity === 0 ? pending > 0 : pending > capacity;
      return { ...s, needsFreelancers: needs };
    }));
  };

  // create booking into in-memory store and update derived flags (with buffer enforcement)
  const createBookingLocal = (b: Partial<Booking> & { storeId: string; storeName: string; date: string; startTime?: string; endTime?: string; locationType?: 'salon'|'home'; serviceId?: string }) => {
    const BUFFER_MIN = 15;
    const toMin = (t: string) => { const [hh,mm] = t.split(':').map(x=>parseInt(x,10)); return hh*60 + (mm||0); };

    // compute endTime if missing using service duration from local jobs/services mapping (fallback 60)
    let finalEnd = b.endTime;
    if (!finalEnd) {
      // try to find service duration from jobs or services (not fully modeled here) - default 60
      const dur = 60;
      if (!b.startTime) throw new Error('startTime required');
      const [h,m] = b.startTime.split(':').map(x=>parseInt(x,10));
      const endH = h + Math.floor((m + dur)/60);
      const endM = (m + dur) % 60;
      finalEnd = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
    }

    // check buffer conflicts for same store on that date
    const bufStart = toMin(b.startTime || '00:00') - BUFFER_MIN;
    const bufEnd = toMin(finalEnd) + BUFFER_MIN;
    const conflict = bookings.find(x => x.storeId === b.storeId && x.date === b.date && x.startTime && x.endTime && Math.max(toMin(x.startTime), bufStart) < Math.min(toMin(x.endTime), bufEnd));
    if (conflict) throw new Error('Slot conflicts with existing booking (buffer enforced)');

    const booking: Booking = {
      id: uid(), storeId: b.storeId, storeName: b.storeName, date: b.date, price: (b.price||0), startTime: b.startTime, endTime: finalEnd, locationType: b.locationType, status: b.status || (b.locationType === 'home' ? 'pending' : 'assigned'), allowClaim: !!b.allowClaim, serviceId: b.serviceId, freelancerId: b.freelancerId ?? null,
    };
    setBookings(prev => [booking, ...prev]);
    // update store flags
    setTimeout(updateStoreNeeds, 0);
    return booking;
  };

  // Cancellation handling locally
  const cancelBookingLocal = (bookingId: string, reason?: string) => {
    const now = new Date();
    setBookings(prev => {
      return prev.map(b => {
        if (b.id !== bookingId) return b;
        // compute minutes until start
        const start = b.date + 'T' + (b.startTime || '00:00') + ':00.000Z';
        const ms = new Date(start).getTime() - now.getTime();
        const mins = Math.round(ms / 60000);
        let status: any = 'cancelled';
        const meta: any = { reason };
        if (b.status === 'in_progress' || mins <= 0) {
          status = 'no_show';
          meta.note = 'Cancelled after start - marked no_show';
        } else if (mins < 30) {
          status = 'cancelled';
          meta.cancellationFeeApplied = true;
        } else {
          status = 'cancelled';
          meta.refund = 'full';
        }
        // free freelancer
        const freelancerId = b.freelancerId ? null : b.freelancerId;
        const notes = (b.notes || '') + '\nCancellation:' + JSON.stringify(meta);
        return { ...b, status, freelancerId, notes };
      });
    });
    setTimeout(updateStoreNeeds, 0);
  };

  // list open jobs for freelancer based on area and store needs
  const listOpenJobsForFreelancer = (fid: string) => {
    const f = freelancers.find(x=>x.id===fid);
    if (!f) return openJobs;
    // prefer stores flagged as needsFreelancers
    const needStoreIds = stores.filter(s=>s.needsFreelancers).map(s=>s.id);
    const byStore = jobs.filter(j => (j.homeService || true) && (needStoreIds.includes(j.storeId) || (f.linkedStores||[]).includes(j.storeId) || j.storeId === f.linkedStores?.[0]));
    return byStore.length ? byStore : openJobs;
  };

  // Freelancer actions
  const applyToJob = (jobId: string) => {
    const fid = currentFreelancerId;
    setJobs(prev => prev.map(j => j.id === jobId && j.status === 'open' ? { ...j, status: 'applied', freelancerId: fid || undefined } : j));
  };

  const startJob = (jobId: string) => {
    const fid = currentFreelancerId;
    setJobs(prev => prev.map(j => j.id === jobId && j.freelancerId === fid ? { ...j, status: 'in_progress' } : j));
  };

  const completeJob = (jobId: string) => {
    const fid = currentFreelancerId;
    setJobs(prev => prev.map(j => j.id === jobId && j.freelancerId === fid ? { ...j, status: 'completed' } : j));
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      const amount = job.rate * (job.hours || 1);
      setEarnings(prev => [...prev, { id: uid(), jobId: job.id, date: todayISO(), amount, status: 'pending' }]);
    }
  };

  const requestPayout = (jobId: string) => {
    const fid = currentFreelancerId;
    setJobs(prev => prev.map(j => j.id === jobId && j.freelancerId === fid ? { ...j, status: 'paid' } : j));
    setEarnings(prev => prev.map(e => e.jobId === jobId ? { ...e, status: 'paid' } : e));
  };

  // Owner actions
  const postJob = (partial: Omit<Job, 'id' | 'status'>) => {
    setJobs(prev => [{ ...partial, id: uid(), status: 'open' }, ...prev]);
  };

  const markBooking = (price: number) => {
    const sid = currentOwnerStoreId || 's1';
    const newBooking: Booking = { id: uid(), storeId: sid, storeName: stores.find(s=>s.id===sid)?.name || 'Store', date: todayISO(), price, startTime: undefined, endTime: undefined, locationType: 'salon', status: 'pending', allowClaim: false };
    setBookings(prev => [newBooking, ...prev]);
    setTimeout(updateStoreNeeds, 0);
  };

  const value: MarketplaceState = {
    role, setRole, freelancerId: currentFreelancerId || '', ownerStoreId: currentOwnerStoreId || '',
    jobs, bookings, earnings,
    openJobs, myJobs, todaysEarnings, todaysRevenue, bookingsToday,
    applyToJob, startJob, completeJob, requestPayout,
    postJob, markBooking,
    isHomeServiceAvailable,
    getAvailableFreelancersForSlot,
    stores,
    freelancers,
    listOpenJobsForFreelancer,
    createBookingLocal,
    // @ts-ignore - expose local cancel helper
    cancelBookingLocal,
  };

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}
