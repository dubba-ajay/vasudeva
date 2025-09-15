import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function run(){
  try{
    const out = {};
    // basic counts
    const tables = ['User','Store','Service','Freelancer','FreelancerSkill','FreelancerStore','Booking','BookingAssignment','Availability'];
    for(const t of tables){
      const exists = await prisma.$queryRawUnsafe("SELECT to_regclass('public."+t+"') IS NOT NULL AS exists");
      const existsFlag = exists[0] && (exists[0].exists === true || exists[0].exists === 't');
      if (!existsFlag) {
        out[t] = null; // table missing
        continue;
      }
      const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS cnt FROM "${t}"`);
      out[t] = r[0]?.cnt ?? 0;
    }

    // duplicates
    const dupChecks = {};
    const qIfExists = async (table, query) => {
      const exists = out[table] !== null;
      if (!exists) return [];
      return await prisma.$queryRawUnsafe(query);
    };

    dupChecks.user_email = await qIfExists('User', `SELECT email, array_agg(id) AS ids, count(*) as cnt FROM "User" WHERE email IS NOT NULL GROUP BY email HAVING count(*)>1 LIMIT 100`);
    dupChecks.user_phone = await qIfExists('User', `SELECT phone, array_agg(id) AS ids, count(*) as cnt FROM "User" WHERE phone IS NOT NULL GROUP BY phone HAVING count(*)>1 LIMIT 100`);
    dupChecks.service_code = await qIfExists('Service', `SELECT code, array_agg(id) AS ids, count(*) as cnt FROM "Service" WHERE code IS NOT NULL GROUP BY code HAVING count(*)>1 LIMIT 100`);
    dupChecks.freelancer_userId = await qIfExists('Freelancer', `SELECT "userId", array_agg(id) AS ids, count(*) as cnt FROM "Freelancer" WHERE "userId" IS NOT NULL GROUP BY "userId" HAVING count(*)>1 LIMIT 100`);
    dupChecks.freelancerSkill_pair = await qIfExists('FreelancerSkill', `SELECT "freelancerId","skillId", array_agg(id) AS ids, count(*) as cnt FROM "FreelancerSkill" GROUP BY "freelancerId","skillId" HAVING count(*)>1 LIMIT 100`);
    dupChecks.freelancerStore_pair = await qIfExists('FreelancerStore', `SELECT "freelancerId","storeId", array_agg(id) AS ids, count(*) as cnt FROM "FreelancerStore" GROUP BY "freelancerId","storeId" HAVING count(*)>1 LIMIT 100`);
    dupChecks.bookingAssignment_pair = await qIfExists('BookingAssignment', `SELECT "bookingId","freelancerId", array_agg(id) AS ids, count(*) as cnt FROM "BookingAssignment" GROUP BY "bookingId","freelancerId" HAVING count(*)>1 LIMIT 100`);

    // sample null checks for columns we might make NOT NULL later
    const nullChecks = {};
    nullChecks.freelancer_userId_nulls = out['Freelancer'] === null ? null : await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS cnt FROM "Freelancer" WHERE "userId" IS NULL`);
    nullChecks.service_code_nulls = out['Service'] === null ? null : await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS cnt FROM "Service" WHERE code IS NULL`);

    console.log(JSON.stringify({counts: out, duplicates: dupChecks, nulls: nullChecks}, null, 2));
  }catch(e){
    console.error('ERROR', e);
    process.exit(2);
  }finally{
    await prisma.$disconnect();
  }
}

run();
