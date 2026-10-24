import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/010_booking_resources.mjs';
try{
  if(!process.argv.includes('--apply'))console.log('Dry run: adds private bed/group links and deferred resource-validation triggers on shared bookings. Conflicting writes from Admin and other apps can be rejected after a branch has Mini App bed links. No existing business records are changed.');
  else{
    await prisma.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});
    console.log('Booking resource migration applied. Existing records preserved.');
  }
}catch{console.error('Booking resource migration failed; transaction rolled back.');process.exitCode=1;}
finally{await prisma.$disconnect();}
