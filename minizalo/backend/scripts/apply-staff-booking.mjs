import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/009_staff_booking.mjs';
try{
  if(!process.argv.includes('--apply'))console.log('Dry run: adds only miniapp_staff_bookings with RLS; existing tables/data are unchanged.');
  else{
    await prisma.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});
    console.log('Staff booking migration applied; existing data preserved.');
  }
}catch{console.error('Staff booking migration failed; transaction rolled back.');process.exitCode=1;}
finally{await prisma.$disconnect();}
