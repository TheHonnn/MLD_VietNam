import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/016_service_duration_default.mjs';
try{
  if(!process.argv.includes('--apply'))console.log('Dry run: set an absent services.duration_minutes default to 60 for future inserts only. Explicit and existing durations remain unchanged. A different existing default requires review.');
  else{
    await prisma.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});
    console.log('New-service duration default is 60 minutes. Existing service rows and explicit durations were not changed.');
  }
}catch{console.error('Duration default migration did not apply; transaction rolled back. Review any existing custom default.');process.exitCode=1;}
finally{await prisma.$disconnect();}
