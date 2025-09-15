import type { Handler } from "@netlify/functions";
import { prisma } from "./_prisma";

const RAZORPAY_TEST_MODE = (process.env.RAZORPAY_TEST_MODE || process.env.VITE_RAZORPAY_TEST_MODE || '').toString() === 'true';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!RAZORPAY_TEST_MODE) return { statusCode: 403, body: 'simulateWebhook is only available in test mode' };

  try {
    const body = JSON.parse(event.body || '{}');
    const paymentId = body.paymentId as string | undefined;
    const gatewayRef = body.gatewayRef as string | undefined; // orderId

    let payment: any = null;
    if (paymentId) {
      payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    } else if (gatewayRef) {
      payment = await prisma.payment.findFirst({ where: { gateway: 'razorpay', gatewayRef } });
    } else {
      // pick latest created razorpay test-mode payment
      payment = await prisma.payment.findFirst({ where: { gateway: 'razorpay', status: 'created' }, orderBy: { createdAt: 'desc' } });
    }

    if (!payment) return { statusCode: 404, body: JSON.stringify({ error: 'payment not found' }) };

    // mark payment captured
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'captured' } });

    // replicate webhook post-capture logic: confirm booking and attempt assignment
    if (payment.bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: payment.bookingId } });
      if (booking) {
        if (['pending','created','confirmed'].includes(booking.status || '')) {
          await prisma.booking.update({ where: { id: booking.id }, data: { status: 'confirmed' } });
        }

        // assignment/matching if no freelancer
        if (!booking.freelancerId) {
          try {
            const store = await prisma.store.findUnique({ where: { id: booking.storeId } });
            const svc = await prisma.service.findUnique({ where: { id: booking.serviceId } });
            const durationMin = svc?.defaultDurationMin || booking.durationMin || 60;
            const lat = booking.locationLat ?? store?.lat;
            const lng = booking.locationLng ?? store?.lng;
            const { getAvailableFreelancers } = await import('./matching');
            const candidates = await getAvailableFreelancers({ date: booking.startAt.toISOString().slice(0,10), time24: booking.startAt.toISOString().slice(11,16), durationMin, lat: lat ?? undefined, lng: lng ?? undefined, serviceId: booking.serviceId, storeId: booking.storeId, maxResults: 10 });

            if (store?.autoAssignEnabled && candidates && candidates.length > 0) {
              const chosen = candidates[0];
              await prisma.$transaction(async (tx) => {
                const b = await tx.booking.findUnique({ where: { id: booking.id } });
                if (!b) return;
                if (b.freelancerId) return;
                await tx.booking.update({ where: { id: booking.id }, data: { freelancerId: chosen.id, status: 'assigned' } });
                await tx.bookingAssignment.create({ data: { bookingId: booking.id, freelancerId: chosen.id, status: 'offered', offeredAt: new Date() } });
                await tx.notification.create({ data: { userId: null, role: 'freelancer', type: 'assignment_requested', payload: { bookingId: booking.id, freelancerId: chosen.id }, createdAt: new Date() } as any });
              });
            } else {
              if (candidates && candidates.length > 0) {
                const offers = candidates.slice(0, 10);
                for (const c of offers) {
                  await prisma.bookingAssignment.create({ data: { bookingId: booking.id, freelancerId: c.id, status: 'offered', offeredAt: new Date() } });
                  await prisma.notification.create({ data: { userId: null, role: 'freelancer', type: 'assignment_offered', payload: { bookingId: booking.id, freelancerId: c.id }, createdAt: new Date() } as any });
                }
                await prisma.booking.update({ where: { id: booking.id }, data: { allowClaim: true, status: 'open' } });
              } else {
                await prisma.notification.create({ data: { userId: null, role: 'owner', type: 'no_freelancers', payload: { bookingId: booking.id }, createdAt: new Date() } as any });
                await prisma.booking.update({ where: { id: booking.id }, data: { status: 'unassigned' } });
              }
            }

          } catch (e:any) {
            console.error('simulateWebhook matching/assignment failed', e?.message || e);
          }
        }
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, paymentId: payment.id }) };
  } catch (e:any) {
    console.error('simulateWebhook error', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message || String(e) }) };
  }
};

export default handler;
