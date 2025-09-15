#!/usr/bin/env node
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

function toMinutes(t){ if (!t) return null; const [h,m]=t.split(':'); return Number(h)*60 + Number(m||0); }
function haversineKm(lat1,lon1,lat2,lon2){const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180; const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(a));}

(async ()=>{
  const booking = await prisma.booking.findFirst();
  if (!booking) { console.error('no booking'); process.exit(1); }
  const store = await prisma.store.findUnique({ where: { id: booking.storeId } });
  const date = booking.startAt.toISOString().slice(0,10);
  const time24 = booking.startAt.toISOString().slice(11,16);
  const ps = toMinutes(time24); const pe = ps + booking.durationMin;
  console.log('booking', booking.id, 'date', date, 'time', time24, 'ps/pe', ps, pe);

  const freelancers = await prisma.freelancer.findMany({ include: { availabilities: true, linkedStores: true, skills: true } });
  for (const f of freelancers) {
    console.log('checking freelancer', f.id, f.name);
    // compute fLat/fLng
    let fLat=null,fLng=null;
    if (f.locationLat && f.locationLng){ fLat=f.locationLat; fLng=f.locationLng; }
    else if (f.linkedStores && f.linkedStores.length>0){ const srec = await prisma.store.findUnique({ where: { id: f.linkedStores[0].storeId } }); if (srec && srec.lat && srec.lng){ fLat=srec.lat; fLng=srec.lng; }}
    console.log(' coords', fLat,fLng);
    const dist = (fLat!==null && fLng!==null && store.lat && store.lng) ? haversineKm(store.lat,store.lng,fLat,fLng) : 9999;
    console.log(' dist km', dist);
    // availabilities
    const avs = await prisma.availability.findMany({ where: { freelancerId: f.id } });
    console.log(' avail count', avs.length);
    let covers=false;
    for(const a of avs){
      if (a.startAt && a.endAt){ const adate=new Date(a.startAt).toISOString().slice(0,10); if (adate!==date) { console.log(' avail date mismatch', adate); continue;} const as = toMinutes(new Date(a.startAt).toISOString().slice(11,16)); const ae = toMinutes(new Date(a.endAt).toISOString().slice(11,16)); console.log(' avail range', as,ae); if (ps>=as && pe<=ae){ covers=true; break; }}
    }
    console.log(' covers?', covers);
    if (!covers) continue;
    // check conflicts
    const conflicts = await prisma.booking.findMany({ where: { freelancerId: f.id, status: { in: ['assigned','accepted','in_progress'] } } });
    console.log(' conflicts count', conflicts.length);
    let overlapping=false;
    for(const c of conflicts){ let cs=null,ce=null, cdate=null; if (c.startAt && c.endAt){ cs=toMinutes(new Date(c.startAt).toISOString().slice(11,16)); ce=toMinutes(new Date(c.endAt).toISOString().slice(11,16)); cdate=new Date(c.startAt).toISOString().slice(0,10);} if (cdate && cdate!==date) continue; if (cs!==null && ce!==null && (ps<ce && cs<pe)) { overlapping=true; break; }}
    console.log(' overlapping?', overlapping);
    if (overlapping) continue;
    console.log(' candidate PASSED:', f.id, f.name);
  }
  await prisma.$disconnect();
})();
