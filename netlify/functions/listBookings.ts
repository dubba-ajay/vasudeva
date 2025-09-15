import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method not allowed" };
  try {
    const q = event.queryStringParameters || {};
    const where: any = {};
    if (q.storeId) where.storeId = q.storeId;
    if (q.freelancerId) where.freelancerId = q.freelancerId;
    if (q.userId) where.userId = q.userId;
    if (q.status) where.status = q.status;
    if (typeof q.allowClaim !== 'undefined') {
      // expect 'true' or 'false'
      where.allowClaim = q.allowClaim === 'true';
    }

    const bookings = await prisma.booking.findMany({ where, orderBy: { date: 'asc' } });
    return { statusCode: 200, body: JSON.stringify({ bookings }) };
  } catch (e: any) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
