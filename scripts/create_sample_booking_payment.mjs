#!/usr/bin/env node
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main(){
  // create sample store
  const store = await prisma.store.create({ data: { name: 'Test Store', city: 'TestCity', lat: 12.9716, lng: 77.5946 } });
  const service = await prisma.service.create({ data: { code: 'haircut', name: 'Haircut', defaultDurationMin: 60, defaultPriceCents: 29900 } });
  // create booking
  const now = new Date();
  const start = new Date(now.getTime() + 1000*60*60); // 1 hour from now
  const end = new Date(start.getTime() + 1000*60*60); // +1 hour
  const booking = await prisma.booking.create({ data: { storeId: store.id, serviceId: service.id, startAt: start, endAt: end, durationMin: 60, priceCents: 29900, locationType: 'salon', allowClaim: false, status: 'pending' } });
  const payment = await prisma.payment.create({ data: { bookingId: booking.id, storeId: store.id, amount: 29900, tax: 0, total: 29900, currency: 'INR', gateway: 'razorpay', gatewayRef: 'test_order_local_003', status: 'created' } });
  console.log({ storeId: store.id, serviceId: service.id, bookingId: booking.id, paymentId: payment.id });
  await prisma.$disconnect();
}

main().catch(e=>{console.error(e); process.exit(1)});
