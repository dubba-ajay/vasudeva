#!/usr/bin/env node
import { getAvailableFreelancers } from '../netlify/functions/matching.js';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

(async ()=>{
  const booking = await prisma.booking.findFirst();
  if (!booking) { console.error('no booking'); process.exit(1); }
  const date = booking.startAt.toISOString().slice(0,10);
  const time24 = booking.startAt.toISOString().slice(11,16);
  const svc = await prisma.service.findUnique({ where: { id: booking.serviceId } });
  const store = await prisma.store.findUnique({ where: { id: booking.storeId } });
  console.log('calling matching with', { date, time24, durationMin: booking.durationMin, lat: store.lat, lng: store.lng, serviceId: booking.serviceId, storeId: booking.storeId });
  const res = await getAvailableFreelancers({ date, time24, durationMin: booking.durationMin, lat: store.lat, lng: store.lng, serviceId: booking.serviceId, storeId: booking.storeId });
  console.log('candidates:', res);
  await prisma.$disconnect();
})();
