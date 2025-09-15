import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const payload = JSON.parse(event.body || "{}");
    const { userId, phone, name, role, address } = payload;
    if (!userId && !phone) return { statusCode: 400, body: JSON.stringify({ error: 'userId or phone required' }) };

    if (role === 'freelancer') {
      // upsert into Freelancer
      const existing = await prisma.freelancer.findFirst({ where: { OR: [{ id: userId ?? undefined }, { phone: phone ?? undefined }] } });
      if (existing) {
        const updated = await prisma.freelancer.update({ where: { id: existing.id }, data: { name: name ?? existing.name, phone: phone ?? existing.phone, email: payload.email ?? existing.email } });
        return { statusCode: 200, body: JSON.stringify({ ok: true, freelancer: updated }) };
      }
      const created = await prisma.freelancer.create({ data: { id: userId || undefined, name: name ?? undefined, phone: phone ?? undefined, email: payload.email ?? undefined } as any });
      return { statusCode: 200, body: JSON.stringify({ ok: true, freelancer: created }) };
    }

    if (role === 'owner') {
      // create a store for owner if not exists
      // owner identified by userId or phone
      const ownerIdentifier = userId || phone;
      // try to find a store owned by this owner (ownerAccount field is Account.id not userId), so we'll create an entry in Store with a generated ownerAccount placeholder
      const created = await prisma.store.create({ data: { name: name ?? 'My Store', address: address ?? undefined, phone: phone ?? undefined } });
      return { statusCode: 200, body: JSON.stringify({ ok: true, store: created }) };
    }

    // customer: upsert into Users table
    const userIdVal = userId || phone;
    if (userIdVal) {
      const existingUser = await prisma.user.findUnique({ where: { id: userId } }).catch(()=>null);
      if (existingUser) {
        const updated = await prisma.user.update({ where: { id: existingUser.id }, data: { name: name ?? existingUser.name, mobile: phone ?? existingUser.mobile, role: role ?? existingUser.role, address: address ?? existingUser.address } });
        return { statusCode: 200, body: JSON.stringify({ ok: true, user: updated }) };
      } else {
        const created = await prisma.user.create({ data: { id: userIdVal, name: name ?? undefined, mobile: phone ?? undefined, role: role ?? 'customer', address: address ?? undefined } });
        return { statusCode: 200, body: JSON.stringify({ ok: true, user: created }) };
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    console.error('upsertProfile error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
