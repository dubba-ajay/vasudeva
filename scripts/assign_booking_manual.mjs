#!/usr/bin/env node
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();
(async ()=>{
  const bookingId = process.argv[2] || '55c4a4cd-8bce-4928-95f6-ff17a29cf3b5';
  const freelancerId = process.argv[3] || '22834802-4720-48de-9244-86919e3731a0';
  await prisma.bookingAssignment.create({ data: { bookingId, freelancerId, status: 'accepted', offeredAt: new Date(), respondedAt: new Date() } });
  await prisma.booking.update({ where: { id: bookingId }, data: { status: 'assigned' } });
  console.log('manual assignment created');
  await prisma.$disconnect();
})();
