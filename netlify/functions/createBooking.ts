import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";

function toMinutes(t: string) {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const payload = JSON.parse(event.body || "{}");
    const { bookingId: clientBookingId, userId, storeId, serviceId, date, startTime, endTime, locationType, notes } = payload;
    if (!userId || !storeId || !serviceId || !date || !startTime || !endTime || !locationType) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
    }

    // check service exists and whether home service allowed
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) return { statusCode: 404, body: JSON.stringify({ error: "Service not found" }) };
    if (locationType === "home" && !service.homeAllowed) {
      return { statusCode: 400, body: JSON.stringify({ error: "Service not available for home visits" }) };
    }

    // For freelancer bookings (home service) we create booking with status 'pending' (awaiting assignment)
    // For in-salon we auto-assign to first active staff if available

    const bookingDate = new Date(date + "T00:00:00.000Z");

    let bookingStatus = "pending";
    let staffId: string | undefined = undefined;
    let freelancerId: string | undefined = undefined;

    if (locationType === "salon") {
      // attempt to auto-assign staff
      const staff = await prisma.staff.findFirst({ where: { storeId, active: true } });
      if (staff) {
        staffId = staff.id;
        bookingStatus = "assigned";
      } else {
        bookingStatus = "pending";
      }
    }

    // Ensure endTime exists: if not provided attempt to compute from service.durationMin
    let finalEndTime = endTime;
    if (!finalEndTime) {
      const svc = await prisma.service.findUnique({ where: { id: serviceId } });
      const dur = svc?.durationMin || 60;
      const [h,m] = startTime.split(':').map(x=>parseInt(x,10));
      const endH = h + Math.floor((m + dur)/60);
      const endM = (m + dur) % 60;
      finalEndTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
    }

    // Enforce buffer between bookings (prevent scheduling inside overrun buffer)
    const BUFFER_MIN = 15; // buffer before and after
    const toMin = (t: string) => { const [hh,mm] = t.split(':').map(x=>parseInt(x,10)); return hh*60 + (mm||0); };
    const bufStart = toMin(startTime) - BUFFER_MIN;
    const bufEnd = toMin(finalEndTime) + BUFFER_MIN;

    const existingBookings = await prisma.booking.findMany({ where: { storeId, date: bookingDate } });
    const conflict = existingBookings.find(b => {
      if (!b.startTime || !b.endTime) return false;
      const s = toMin(b.startTime);
      const e = toMin(b.endTime);
      return Math.max(s, bufStart) < Math.min(e, bufEnd);
    });
    if (conflict) return { statusCode: 409, body: JSON.stringify({ error: 'Requested slot conflicts with existing booking (buffer enforced)' }) };

    // Create booking record
    // If client provided a bookingId (used to link payment created before booking), attempt to use it
    const createData: any = {
      userId,
      storeId,
      serviceId,
      freelancerId: freelancerId || null,
      staffId: staffId || null,
      date: bookingDate,
      startTime,
      endTime: finalEndTime,
      locationType,
      status: bookingStatus,
      notes: notes || null,
    };
    if (clientBookingId) {
      createData.id = String(clientBookingId);
      // ensure no existing booking with that id
      const existing = await prisma.booking.findUnique({ where: { id: createData.id } }).catch(()=>null);
      if (existing) {
        // return existing booking
        return { statusCode: 200, body: JSON.stringify({ booking: existing }) };
      }
    }

    const booking = await prisma.booking.create({ data: createData });

    // Create an assignment record for tracking
    await prisma.assignment.create({
      data: {
        bookingId: booking.id,
        freelancerId: locationType === "home" ? null : undefined,
        staffId: staffId || null,
        status: bookingStatus === "assigned" ? "accepted" : "pending",
      } as any,
    });

    // If this is a home booking and autoAssign requested, attempt to auto-assign the best freelancer
    try {
      if (locationType === 'home' && (payload.autoAssign === true)) {
        // determine booking location: try payload lat/lng or fallback to store lat/lng fields
        let lat = payload.lat;
        let lng = payload.lng;
        if ((!lat || !lng) && storeId) {
          const storeRec: any = await prisma.store.findUnique({ where: { id: storeId } });
          lat = lat || (storeRec ? (storeRec as any).lat : undefined);
          lng = lng || (storeRec ? (storeRec as any).lng : undefined);
        }
        const svc = await prisma.service.findUnique({ where: { id: serviceId } });
        const durationMin = svc?.durationMin || 60;
        if (lat && lng) {
          const { getAvailableFreelancers } = await import('./matching');
          const candidates = await getAvailableFreelancers({ date: (date || '').slice(0,10), time24: startTime, durationMin, lat: Number(lat), lng: Number(lng), serviceId, storeId });
          if (candidates && candidates.length > 0) {
            const chosen = candidates[0];
            // update booking & assignment
            await prisma.booking.update({ where: { id: booking.id }, data: { freelancerId: chosen.id, status: 'assigned' } });
            await prisma.assignment.update({ where: { bookingId: booking.id }, data: { freelancerId: chosen.id, status: 'pending' } });
            // notify freelancer and owner
            await prisma.notification.create({ data: { userId: null, role: 'freelancer', type: 'assignment_requested', payload: { bookingId: booking.id, freelancerId: chosen.id }, createdAt: new Date() } as any });
          }
        }
      }
    } catch (e:any) {
      console.error('auto-assign failed', e?.message || e);
    }

    // Create notification (simple)
    await prisma.notification.create({
      data: {
        userId: null,
        role: locationType === "home" ? "freelancer" : "owner",
        type: "booking_created",
        payload: { bookingId: booking.id, storeId, locationType },
      },
    });

    return { statusCode: 200, body: JSON.stringify({ booking }) };
  } catch (e: any) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
