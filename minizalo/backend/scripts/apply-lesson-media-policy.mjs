import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/015_lesson_media_policy.mjs';
try{
  if(!process.argv.includes('--apply'))console.log('Dry run: adds a private lesson embedding-policy table only. No lesson or media decision is changed.');
  else{
    await prisma.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});
    console.log('Lesson media policy table added. Existing lessons and content retained; no public embedding decisions seeded.');
  }
}catch{console.error('Lesson media policy migration failed; transaction rolled back.');process.exitCode=1;}
finally{await prisma.$disconnect();}
