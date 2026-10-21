import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/008_schedule_deletion_notifications.mjs';
try{
  if(!process.argv.includes('--apply'))console.log('Dry run: add schedule deletion notifications. No existing business records are changed or deleted.');
  else{
    await prisma.$transaction(async tx=>{for(const statement of statements)await tx.$executeRawUnsafe(statement);},{timeout:60000});
    console.log('Schedule deletion notifications ready. No existing business records were changed or deleted.');
  }
}catch{console.error('Schedule notification migration failed and was rolled back.');process.exitCode=1;}
finally{await prisma.$disconnect();}
