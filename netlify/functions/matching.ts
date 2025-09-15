import { prisma } from "./_prisma";

const EARTH_R = 6371; // km
function toRad(v: number) { return v * Math.PI / 180; }
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

function toMinutes(t: string) {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m || 0);
}

export async function getAvailableFreelancers(opts: {
  date: string; // YYYY-MM-DD
  time24: string; // HH:mm
  durationMin: number;
  lat?: number;
  lng?: number;
  serviceId?: string;
  requiredSkill?: string;
  storeId?: string;
  maxResults?: number;
}) {
  const { date, time24, durationMin, lat, lng, requiredSkill, storeId } = opts;

  // 1) gather candidate freelancers: those who either are linked to store or have the skill
  const where: any = {};
  if (requiredSkill) {
    // use array contains on skills if implemented; schema uses Availability and Freelancer but no skills field — we will consider linkedStore relation as primary
    // We'll pick all freelancers and filter by linkedStores proximity/availability
  }

  const freelancers = await prisma.freelancer.findMany({ include: { availabilities: true, linkedStores: true } });

  const targetDate = new Date(date + "T00:00:00.000Z");
  const ps = toMinutes(time24);
  const pe = ps + durationMin;

  const candidates: Array<any> = [];

  for (const f of freelancers) {
    // Freelancer geographic coordinates are optional in schema. If coordinates exist on freelancer or store, compute distance; otherwise treat distance as unknown.
    let fLat: number | null = null;
    let fLng: number | null = null;
    try {
      if ((f as any).lat && (f as any).lng) {
        fLat = (f as any).lat;
        fLng = (f as any).lng;
      } else if (f.linkedStores && f.linkedStores.length > 0 && f.linkedStores[0].storeId) {
        const storeRecord = await prisma.store.findUnique({ where: { id: f.linkedStores[0].storeId } });
        if (storeRecord && (storeRecord as any).lat && (storeRecord as any).lng) {
          fLat = (storeRecord as any).lat;
          fLng = (storeRecord as any).lng;
        }
      }
    } catch (e) {
      // ignore
    }

    const dist = (fLat !== null && fLng !== null && typeof lat === 'number' && typeof lng === 'number') ? haversineKm(lat, lng, fLat, fLng) : 9999;

    // If service radius is defined on service record and we have a concrete distance, enforce it
    if (opts.storeId && opts.serviceId) {
      try {
        const svc = await prisma.service.findUnique({ where: { id: opts.serviceId } });
        if (svc && svc.homeAllowed && (svc as any).radiusKm && dist !== 9999) {
          const radius = (svc as any).radiusKm as number;
          if (typeof radius === 'number' && dist > radius) continue; // out of radius
        }
      } catch (e) {}
    }

    // Check availability for this date.
    // Support both legacy schema (date + startTime/endTime) and Date fields (startAt/endAt).
    const avails = await prisma.availability.findMany({ where: { freelancerId: f.id } });
    if (!avails || avails.length === 0) continue;

    const covers = avails.some(a => {
      // If availability has startAt/endAt DateTime fields
      if (a.startAt && a.endAt) {
        const as = toMinutes(new Date(a.startAt).toISOString().slice(11,16));
        const ae = toMinutes(new Date(a.endAt).toISOString().slice(11,16));
        const adate = new Date(a.startAt).toISOString().slice(0,10);
        if (adate !== date) return false;
        return ps >= as && pe <= ae;
      }
      // If availability uses legacy fields startTime/endTime and date
      if ((a as any).startTime && (a as any).endTime && (a as any).date) {
        const as = toMinutes((a as any).startTime);
        const ae = toMinutes((a as any).endTime);
        const adate = new Date((a as any).date).toISOString().slice(0,10);
        if (adate !== date) return false;
        return ps >= as && pe <= ae;
      }
      return false;
    });
    if (!covers) continue;

    // Check for overlapping bookings for this freelancer
    const conflicts = await prisma.booking.findMany({ where: { freelancerId: f.id, status: { in: ['assigned', 'accepted', 'in_progress'] } } });
    const overlapping = conflicts.some(c => {
      // support booking.startAt/endAt (Date) or startTime/endTime (string)
      let cs = null, ce = null, cdate = null;
      if (c.startAt && c.endAt) {
        cs = toMinutes(new Date(c.startAt).toISOString().slice(11,16));
        ce = toMinutes(new Date(c.endAt).toISOString().slice(11,16));
        cdate = new Date(c.startAt).toISOString().slice(0,10);
      } else if ((c as any).startTime && (c as any).endTime && (c as any).date) {
        cs = toMinutes((c as any).startTime);
        ce = toMinutes((c as any).endTime);
        cdate = new Date((c as any).date).toISOString().slice(0,10);
      }
      if (cdate && cdate !== date) return false;
      if (cs === null || ce === null) return false;
      return ps < ce && cs < pe;
    });
    if (overlapping) continue;

    // compute load (count of bookings for date)
    const load = await prisma.booking.count({ where: { freelancerId: f.id, date: targetDate } });

    // scoring: prefer lower distance, higher rating, lower load
    const rating = f.rating || 0;
    const score = dist * 1.0 - rating * 2.0 + load * 5.0;

    candidates.push({ freelancer: f, dist, rating, load, score });
  }

  candidates.sort((a,b) => a.score - b.score);
  const max = opts.maxResults || 10;
  return candidates.slice(0, max).map(c => ({ id: c.freelancer.id, name: c.freelancer.name, dist: c.dist, rating: c.rating, load: c.load }));
}
