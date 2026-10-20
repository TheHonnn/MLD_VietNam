import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/007_audit_integrity.mjs';
try {
  if(!process.argv.includes('--apply'))console.log('Dry run: add request fingerprints, course delivery and membership card storage. No business data is populated.');
  else {
    await prisma.$transaction(async tx=>{for(const statement of statements)await tx.$executeRawUnsafe(statement);},{timeout:60000});
    console.log('Audit integrity schema ready. No existing business records were changed or deleted.');
  }
}catch{console.error('Audit integrity migration failed and was rolled back.');process.exitCode=1;}
finally{await prisma.$disconnect();}
