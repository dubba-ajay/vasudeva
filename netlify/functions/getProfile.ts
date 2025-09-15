import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const { userId, phone, email } = event.queryStringParameters || {};
    if (!userId && !phone && !email) return { statusCode: 400, body: JSON.stringify({ error: 'userId, phone or email required' }) };

    // Try freelancer by id, phone or email
    let freelancer = null;
    if (userId) freelancer = await prisma.freelancer.findUnique({ where: { id: userId } });
    if (!freelancer && phone) freelancer = await prisma.freelancer.findFirst({ where: { phone } });
    if (!freelancer && email) freelancer = await prisma.freelancer.findFirst({ where: { email } });

    if (freelancer) {
      return { statusCode: 200, body: JSON.stringify({ type: 'freelancer', freelancer }) };
    }

    // Try store owner: find store by id, phone or email
    if (userId) {
      const store = await prisma.store.findFirst({ where: { id: userId } });
      if (store) return { statusCode: 200, body: JSON.stringify({ type: 'store', store }) };
    }
    if (phone) {
      const store = await prisma.store.findFirst({ where: { phone } });
      if (store) return { statusCode: 200, body: JSON.stringify({ type: 'store', store }) };
    }
    if (email) {
      const store = await prisma.store.findFirst({ where: { email } });
      if (store) return { statusCode: 200, body: JSON.stringify({ type: 'store', store }) };
    }

    // Check Users table
    if (userId) {
      const urec = await prisma.user.findUnique({ where: { id: userId } }).catch(()=>null);
      if (urec) return { statusCode: 200, body: JSON.stringify({ type: 'user', user: urec }) };
    }
    if (phone) {
      const urec = await prisma.user.findFirst({ where: { mobile: phone } }).catch(()=>null);
      if (urec) return { statusCode: 200, body: JSON.stringify({ type: 'user', user: urec }) };
    }
    if (email) {
      const urec = await prisma.user.findFirst({ where: { email } }).catch(()=>null);
      if (urec) return { statusCode: 200, body: JSON.stringify({ type: 'user', user: urec }) };
    }

    return { statusCode: 200, body: JSON.stringify({ type: 'customer', profile: null }) };
  } catch (e:any) {
    console.error('getProfile error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
