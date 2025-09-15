import type { Handler } from "@netlify/functions";
import fetch from "node-fetch";
import crypto from "node:crypto";
import { prisma } from "./_prisma";

const RZP_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.VITE_RAZORPAY_WEBHOOK_SECRET;
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || process.env.VITE_STRIPE_WEBHOOK_SECRET;

function verifyRazorpaySignature(rawBody: string, signature: string | undefined): boolean {
  if (!RZP_WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", RZP_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return expected === signature;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const gateway = event.headers["x-gateway"] || "detect";
  const raw = event.body || "";
  try {
    // Razorpay
    const rzpSig = event.headers["x-razorpay-signature"] || event.headers["X-Razorpay-Signature"] as any;
    if (rzpSig) {
      const valid = verifyRazorpaySignature(raw, rzpSig as string);
      const payload = JSON.parse(raw);
      await prisma.webhookLog.create({ data: { gateway: "razorpay", event: payload?.event || "", signature: String(rzpSig), valid, payload } });
      if (!valid) return { statusCode: 400, body: "invalid signature" };
      // Handle order.paid, payment.captured, refund.processed
      const et = payload?.event as string;
      if (et === "payment.captured" || et === 'payment.authorized') {
        const orderId = payload?.payload?.payment?.entity?.order_id as string | undefined;
        if (orderId) {
          await prisma.payment.updateMany({ where: { gateway: "razorpay", gatewayRef: orderId }, data: { status: "captured" } });
          // load payment and trigger booking confirmation/assignment
          const p = await prisma.payment.findFirst({ where: { gateway: 'razorpay', gatewayRef: orderId } });
          if (p && p.bookingId) {
            // idempotency: if booking already confirmed/assigned, skip
            const booking = await prisma.booking.findUnique({ where: { id: p.bookingId } });
            if (booking) {
              if (booking.status === 'pending' || booking.status === 'created' || booking.status === 'confirmed') {
                // mark confirmed
                await prisma.booking.update({ where: { id: booking.id }, data: { status: 'confirmed' } });
              }

              // Trigger matching/assignment only if not already assigned
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
                    // atomic assign
                    await prisma.$transaction(async (tx) => {
                      const b = await tx.booking.findUnique({ where: { id: booking.id } });
                      if (!b) return;
                      if (b.freelancerId) return; // someone already assigned
                      await tx.booking.update({ where: { id: booking.id }, data: { freelancerId: chosen.id, status: 'assigned' } });
                      await tx.bookingAssignment.create({ data: { bookingId: booking.id, freelancerId: chosen.id, status: 'offered', offeredAt: new Date() } });
                      await tx.notification.create({ data: { userId: null, role: 'freelancer', type: 'assignment_requested', payload: { bookingId: booking.id, freelancerId: chosen.id }, createdAt: new Date() } as any });
                    });
                  } else {
                    // create offers to top N candidates if allowClaim is true
                    if (candidates && candidates.length > 0) {
                      const offers = candidates.slice(0, 10);
                      for (const c of offers) {
                        await prisma.bookingAssignment.create({ data: { bookingId: booking.id, freelancerId: c.id, status: 'offered', offeredAt: new Date() } });
                        await prisma.notification.create({ data: { userId: null, role: 'freelancer', type: 'assignment_offered', payload: { bookingId: booking.id, freelancerId: c.id }, createdAt: new Date() } as any });
                      }
                      await prisma.booking.update({ where: { id: booking.id }, data: { allowClaim: true, status: 'open' } });
                    } else {
                      // no candidates found: notify owner
                      await prisma.notification.create({ data: { userId: null, role: 'owner', type: 'no_freelancers', payload: { bookingId: booking.id }, createdAt: new Date() } as any });
                      await prisma.booking.update({ where: { id: booking.id }, data: { status: 'unassigned' } });
                    }
                  }
                } catch (e:any) {
                  console.error('matching/assignment failed', e?.message || e);
                }
              }
            }
          }
        }
      } else if (et?.startsWith("refund.")) {
        const payId = payload?.payload?.refund?.entity?.payment_id as string | undefined;
        if (payId) {
          const p = await prisma.payment.findFirst({ where: { gateway: "razorpay", gatewayRef: payId } });
          if (p) await prisma.payment.update({ where: { id: p.id }, data: { status: "refunded" } });
        }
      }
      return { statusCode: 200, body: "ok" };
    }

    // Stripe (requires raw body; ensure Netlify passthrough configuration)
    const stripeSig = event.headers["stripe-signature"];
    if (stripeSig) {
      // For simplicity, log and trust (recommend using official SDK in production)
      const payload = JSON.parse(raw);
      await prisma.webhookLog.create({ data: { gateway: "stripe", event: payload?.type || "", signature: String(stripeSig), valid: Boolean(stripeSig && STRIPE_WEBHOOK_SECRET), payload } });
      const type = payload?.type as string;
      if (type === "payment_intent.succeeded" || type === 'charge.succeeded') {
        const pi = payload?.data?.object?.id as string | undefined;
        if (pi) {
          await prisma.payment.updateMany({ where: { gateway: "stripe", gatewayRef: pi }, data: { status: "captured" } });
          const p = await prisma.payment.findFirst({ where: { gateway: 'stripe', gatewayRef: pi } });
          if (p && p.bookingId) {
            const booking = await prisma.booking.findUnique({ where: { id: p.bookingId } });
            if (booking) {
              if (booking.status === 'pending' || booking.status === 'created' || booking.status === 'confirmed') {
                await prisma.booking.update({ where: { id: booking.id }, data: { status: 'confirmed' } });
              }
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
                  console.error('matching/assignment failed', e?.message || e);
                }
              }
            }
          }
        }
      } else if (type?.startsWith("charge.refund")) {
        const pi = payload?.data?.object?.payment_intent as string | undefined;
        if (pi) await prisma.payment.updateMany({ where: { gateway: "stripe", gatewayRef: pi }, data: { status: "refunded" } });
      }
      return { statusCode: 200, body: "ok" };
    }

    return { statusCode: 400, body: "unknown webhook" };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "error" };
  }
};

export { handler };
