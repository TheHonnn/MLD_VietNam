import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/006_customer_profile.mjs';
try {
  if (!process.argv.includes('--apply')) console.log('Dry run: add miniapp_customer_profiles only. No business records are changed.');
  else {
    await prisma.$transaction(async tx=>{for(const statement of statements)await tx.$executeRawUnsafe(statement);});
    console.log('Customer profile table ready. No existing records were changed.');
  }
} catch {console.error('Customer profile migration failed and was rolled back.');process.exitCode=1;}
finally {await prisma.$disconnect();}
