#!/usr/bin/env node
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

(async ()=>{
  const rows = await prisma.booking.findMany({ include: { assignments: true } });
  console.log(JSON.stringify(rows, null, 2));
  await prisma.$disconnect();
})();
