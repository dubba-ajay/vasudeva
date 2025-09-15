#!/usr/bin/env node
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main(){
  const counts = {};
  counts.payments = await prisma.payment.count().catch(()=>null);
  counts.bookings = await prisma.booking.count().catch(()=>null);
  counts.bookingAssignments = await prisma.bookingAssignment.count().catch(()=>null);
  counts.notifications = await prisma.notification.count().catch(()=>null);
  console.log(JSON.stringify(counts, null, 2));
  await prisma.$disconnect();
}

main().catch(e=>{console.error(e); process.exit(1)});
