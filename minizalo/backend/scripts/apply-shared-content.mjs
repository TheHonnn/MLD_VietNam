import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/013_shared_content.mjs';
try{
  if(!process.argv.includes('--apply'))console.log('Dry run: adds one private content table and index only. No posts, documents or shared-table triggers are created.');
  else{
    await prisma.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});
    console.log('Shared content table added. Existing records preserved; no example content inserted.');
  }
}catch{console.error('Shared content migration failed; transaction rolled back.');process.exitCode=1;}
finally{await prisma.$disconnect();}
