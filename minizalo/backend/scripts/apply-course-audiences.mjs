import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/012_course_audiences.mjs';
try{
  if(!process.argv.includes('--apply'))console.log('Dry run: adds optional course audience mappings only; no courses are classified automatically.');
  else{
    await prisma.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});
    console.log('Course audience table added; catalog records unchanged.');
  }
}catch{console.error('Course audience migration failed; transaction rolled back.');process.exitCode=1;}
finally{await prisma.$disconnect();}
