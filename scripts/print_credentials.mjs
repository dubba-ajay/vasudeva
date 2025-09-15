#!/usr/bin/env node
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();
(async ()=>{
  const creds = await prisma.authCredential.findMany({ select: { id: true, username: true, role: true, userId: true, mustReset: true } });
  console.log(JSON.stringify(creds, null, 2));
  await prisma.$disconnect();
})();
