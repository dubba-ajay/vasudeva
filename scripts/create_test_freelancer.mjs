#!/usr/bin/env node
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main(){
  // find the sample store created earlier
  const store = await prisma.store.findFirst();
  if (!store) { console.error('No store found'); process.exit(1); }
  // create freelancer
  const freelancer = await prisma.freelancer.create({ data: { name: 'Krish Test', homeRadiusMeters: 5000, locationLat: store.lat || 12.9716, locationLng: store.lng || 77.5946, workMode: 'both' } });
  // link to store
  await prisma.freelancerStore.create({ data: { freelancerId: freelancer.id, storeId: store.id, approved: true } });
  // create availability covering the booking time: find existing booking
  const booking = await prisma.booking.findFirst({ where: { storeId: store.id } });
  if (!booking) { console.error('No booking found'); process.exit(1); }
  const startAt = booking.startAt;
  const endAt = booking.endAt;
  // create availability with startAt/endAt
  await prisma.availability.create({ data: { freelancerId: freelancer.id, startAt: startAt, endAt: endAt } });
  // create a skill and link (if Skill exists or create one matching service code)
  const svc = await prisma.service.findUnique({ where: { id: booking.serviceId } });
  if (svc) {
    let skill = await prisma.skill.findFirst({ where: { code: svc.code } }).catch(()=>null);
    if (!skill) skill = await prisma.skill.create({ data: { code: svc.code, name: svc.name } });
    await prisma.freelancerSkill.create({ data: { freelancerId: freelancer.id, skillId: skill.id } });
  }
  // enable autoAssign on store
  await prisma.store.update({ where: { id: store.id }, data: { autoAssignEnabled: true } });
  console.log('Created freelancer', freelancer.id);
  await prisma.$disconnect();
}

main().catch(e=>{ console.error(e); process.exit(1); });
