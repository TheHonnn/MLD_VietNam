import {statements} from '../migrations/017_profile_preferences.mjs';
if(!process.argv.includes('--apply')){
  console.log('Dry run only: add occupation, theme, treatment_notify and course_notify to miniapp_customer_profiles. No database connection or writes.');
}else{
  const {prisma}=await import('../dist/lib/prisma.js');
  try{await prisma.$transaction(async tx=>{for(const sql of statements)await tx.$executeRawUnsafe(sql);});console.log('Profile preference columns added. Existing business records retained.');}
  catch{console.error('Migration failed; transaction rolled back.');process.exitCode=1;}
  finally{await prisma.$disconnect();}
}
