import {prisma} from '../dist/lib/prisma.js';
import {statements} from '../migrations/014_account_sessions.mjs';
try{
  if(!process.argv.includes('--apply'))console.log('Dry run: adds private login-session and revocation tables only; no existing account/session is deleted or revoked.');
  else{
    await prisma.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});
    console.log('Account session tables added. Existing accounts preserved; no sessions revoked.');
  }
}catch{console.error('Account session migration failed; transaction rolled back.');process.exitCode=1;}
finally{await prisma.$disconnect();}
