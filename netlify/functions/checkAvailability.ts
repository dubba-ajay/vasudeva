import type { Handler } from "@netlify/functions";
import { getAvailableFreelancers } from "./matching";

export const handler: Handler = async (event) => {
  try {
    const payload = event.httpMethod === 'GET' ? event.queryStringParameters || {} : JSON.parse(event.body || '{}');
    const { date, time, durationMin, lat, lng, serviceId, storeId } = payload as any;
    if (!date || !time) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required params: date,time' }) };
    }
    let dur = durationMin ? Number(durationMin) : undefined;
    if ((!dur || isNaN(dur)) && serviceId) {
      try {
        const { prisma } = await import('./_prisma');
        const svc = await prisma.service.findUnique({ where: { id: serviceId } });
        dur = svc?.durationMin || 60;
      } catch (e) { dur = 60; }
    }
    if (!dur) dur = 60;
    const candidates = await getAvailableFreelancers({ date, time24: time, durationMin: Number(dur), lat: lat ? Number(lat) : undefined, lng: lng ? Number(lng) : undefined, serviceId, storeId });
    return { statusCode: 200, body: JSON.stringify({ candidates }) };
  } catch (e:any) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
}

export default handler;
