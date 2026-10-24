import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/011_learning_access.mjs';
try{
  if(!process.argv.includes('--apply'))console.log('Dry run: adds per-enrollment access configuration only; does not assign any expiry dates.');
  else{
    await prisma.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});
    console.log('Learning access migration applied; existing data and access dates unchanged.');
  }
}catch{console.error('Learning access migration failed; transaction rolled back.');process.exitCode=1;}
finally{await prisma.$disconnect();}
