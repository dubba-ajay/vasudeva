import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const q = event.queryStringParameters || {};
    const where: any = {};
    if (q.role) where.role = q.role;
    if (q.userId) where.userId = q.userId;
    if (q.read) where.read = q.read === 'true';

    const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 });
    return { statusCode: 200, body: JSON.stringify({ notifications }) };
  } catch (e:any) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
