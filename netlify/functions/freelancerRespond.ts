import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const payload = JSON.parse(event.body || "{}");
    const { bookingId, freelancerId, action } = payload;
    if (!bookingId || !freelancerId || !action) return { statusCode: 400, body: JSON.stringify({ error: "Missing fields" }) };

    const assignment = await prisma.assignment.findUnique({ where: { bookingId } });
    if (!assignment) return { statusCode: 404, body: JSON.stringify({ error: "Assignment not found" }) };
    if (assignment.freelancerId && assignment.freelancerId !== freelancerId) return { statusCode: 403, body: JSON.stringify({ error: "Not your assignment" }) };

    if (action === "accept") {
      await prisma.assignment.update({ where: { bookingId }, data: { status: "accepted", respondedAt: new Date(), freelancerId } });
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "accepted", freelancerId } });
      await prisma.notification.create({ data: { role: "owner", type: "assignment_accepted", payload: { bookingId }, createdAt: new Date() } as any });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } else if (action === "reject") {
      await prisma.assignment.update({ where: { bookingId }, data: { status: "rejected", respondedAt: new Date() } });
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "rejected" } });
      await prisma.notification.create({ data: { role: "owner", type: "assignment_rejected", payload: { bookingId }, createdAt: new Date() } as any });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: "Unknown action" }) };
  } catch (e: any) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
