import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST" && event.httpMethod !== "PATCH") return { statusCode: 405, body: "Method not allowed" };
  try {
    const payload = JSON.parse(event.body || "{}");
    const { bookingId, allowClaim, startTime, endTime, action, reason } = payload;
    if (!bookingId) return { statusCode: 400, body: JSON.stringify({ error: "Missing bookingId" }) };

    // Fetch existing booking
    const existing = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!existing) return { statusCode: 404, body: JSON.stringify({ error: 'Booking not found' }) };

    // Cancellation workflow
    if (action === 'cancel') {
      // determine now and minutes until start
      const now = new Date();
      const bookingStart = new Date(existing.date.toISOString().slice(0,10) + 'T' + (existing.startTime || '00:00') + ':00.000Z');
      const minutesUntilStart = Math.round((bookingStart.getTime() - now.getTime()) / 60000);
      let statusToSet = 'cancelled';
      let meta: any = { reason: reason || null };
      if (existing.status === 'in_progress' || existing.status === 'assigned' && minutesUntilStart <= 0) {
        statusToSet = 'no_show';
        meta.note = 'Cancelled after start — marked no-show';
      } else if (minutesUntilStart < 30) {
        statusToSet = 'cancelled';
        meta.cancellationFeeApplied = true;
        meta.note = 'Last-minute cancellation — fee applied';
      } else {
        statusToSet = 'cancelled';
        meta.refund = 'full';
        meta.note = 'Cancelled in advance — full refund';
      }

      const updated = await prisma.booking.update({ where: { id: bookingId }, data: { status: statusToSet, notes: (existing.notes || '') + '\nCancellation: ' + JSON.stringify(meta) } });

      // free freelancer slot if assigned
      if (existing.freelancerId) {
        await prisma.booking.update({ where: { id: bookingId }, data: { freelancerId: null } });
      }

      // create notifications
      await prisma.notification.createMany({ data: [
        { userId: null, role: 'owner', type: 'booking_cancelled', payload: { bookingId, meta } } as any,
        { userId: existing.freelancerId || null, role: 'freelancer', type: 'booking_cancelled', payload: { bookingId, meta } } as any,
        { userId: existing.userId || null, role: 'user', type: 'booking_cancelled', payload: { bookingId, meta } } as any,
      ]});

      return { statusCode: 200, body: JSON.stringify({ booking: updated }) };
    }

    // Overrun handling: if endTime provided and is greater than stored endTime, shift subsequent bookings
    const updates: any = {};
    if (typeof allowClaim !== 'undefined') updates.allowClaim = Boolean(allowClaim);
    if (startTime) updates.startTime = startTime;
    if (endTime) updates.endTime = endTime;

    let booking = existing;
    if (Object.keys(updates).length > 0) {
      booking = await prisma.booking.update({ where: { id: bookingId }, data: updates });
      // notify owner of update
      await prisma.notification.create({ data: { userId: null, role: 'owner', type: 'booking_updated', payload: { bookingId, updates }, createdAt: new Date() } as any });
    }

    if (endTime) {
      // compute overrun minutes compared to previous endTime
      const prevEnd = existing.endTime || existing.startTime;
      const toMin = (t: string) => { const [h,m] = t.split(':').map(x=>parseInt(x,10)); return h*60 + (m||0); };
      const overrun = Math.max(0, toMin(endTime) - toMin(prevEnd));
      if (overrun > 0) {
        // find subsequent bookings for same store and date, whose startTime >= prevEnd
        const subs = await prisma.booking.findMany({ where: { storeId: existing.storeId, date: existing.date, AND: [{ startTime: { gte: prevEnd } }, { id: { not: bookingId } }] }, orderBy: { startTime: 'asc' } });
        for (const s of subs) {
          // shift start and end by overrun
          if (!s.startTime || !s.endTime) continue;
          const sStart = toMin(s.startTime) + overrun;
          const sEnd = toMin(s.endTime) + overrun;
          const newStart = `${String(Math.floor(sStart/60)).padStart(2,'0')}:${String(sStart%60).padStart(2,'0')}`;
          const newEnd = `${String(Math.floor(sEnd/60)).padStart(2,'0')}:${String(sEnd%60).padStart(2,'0')}`;
          await prisma.booking.update({ where: { id: s.id }, data: { startTime: newStart, endTime: newEnd } });
          // notify affected customer
          await prisma.notification.create({ data: { userId: s.userId || null, role: 'user', type: 'booking_rescheduled', payload: { bookingId: s.id, oldStart: s.startTime, newStart }, createdAt: new Date() } as any });
          // notify freelancer and owner
          await prisma.notification.create({ data: { userId: s.freelancerId || null, role: 'freelancer', type: 'booking_rescheduled', payload: { bookingId: s.id, oldStart: s.startTime, newStart }, createdAt: new Date() } as any });
          await prisma.notification.create({ data: { userId: null, role: 'owner', type: 'booking_rescheduled', payload: { bookingId: s.id, oldStart: s.startTime, newStart }, createdAt: new Date() } as any });
        }
      }
    }

    return { statusCode: 200, body: JSON.stringify({ booking }) };
  } catch (e:any) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
