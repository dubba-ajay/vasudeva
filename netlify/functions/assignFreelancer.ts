import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";

function toMinutes(t: string) {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m || 0);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const payload = JSON.parse(event.body || "{}");
    const { bookingId, freelancerId, claim } = payload;
    if (!bookingId || !freelancerId) return { statusCode: 400, body: JSON.stringify({ error: "Missing bookingId or freelancerId" }) };

    // Use a transaction to avoid race conditions when assigning freelancers
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return { code: 404, body: { error: "Booking not found" } };

      // If this is a claim, ensure booking.allowClaim is true
      if (claim && !booking.allowClaim) return { code: 403, body: { error: "Booking not open for claims" } };

      // If already assigned to someone else, prevent stealing
      if (booking.freelancerId && booking.freelancerId !== freelancerId) return { code: 409, body: { error: "Booking already assigned to another freelancer" } };

      // compute time window
      const start = toMinutes(booking.startTime);
      const end = toMinutes(booking.endTime);

      // Check overlapping bookings for this freelancer within the transaction
      const conflicts = await tx.booking.findMany({
        where: {
          freelancerId,
          date: booking.date,
          status: { in: ["assigned", "accepted", "in_progress"] },
        },
      });

      const overlapping = conflicts.some((c) => {
        const cs = toMinutes(c.startTime);
        const ce = toMinutes(c.endTime);
        return start < ce && cs < end;
      });

      if (overlapping) return { code: 409, body: { error: "Freelancer not available for this time" } };

      // Update booking and assignment atomically
      const bookingUpdate: any = { freelancerId, status: claim ? "assigned" : "assigned" };
      if (claim) bookingUpdate.allowClaim = false;

      await tx.booking.update({ where: { id: bookingId }, data: bookingUpdate });

      await tx.assignment.upsert({
        where: { bookingId },
        update: { freelancerId, status: claim ? "accepted" : "pending" },
        create: { bookingId, freelancerId, status: claim ? "accepted" : "pending" },
      });

      await tx.notification.create({ data: { userId: null, role: "owner", type: claim ? "assignment_claimed" : "assignment_requested", payload: { bookingId, freelancerId }, createdAt: new Date() } as any });

      return { code: 200, body: { ok: true } };
    });

    if (!result) return { statusCode: 500, body: JSON.stringify({ error: 'Unknown error' }) };
    if (result.code !== 200) return { statusCode: result.code, body: JSON.stringify(result.body) };

    return { statusCode: 200, body: JSON.stringify(result.body) };
  } catch (e: any) {
    console.error('assignFreelancer error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
