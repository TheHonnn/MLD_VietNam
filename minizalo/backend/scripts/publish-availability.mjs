import {readFile} from 'node:fs/promises';
import {prisma} from '../dist/lib/prisma.js';
import {createStore,validateSharedSchema} from '../dist/store.js';
import {publishAvailability} from '../dist/publish-availability.js';

try{
  const index=process.argv.indexOf('--file'),file=index>=0?process.argv[index+1]:null;
  if(!file)throw new Error('Use --file path-to-private-plan.json; append --apply after reviewing the dry run.');
  const plan=JSON.parse(await readFile(file,'utf8')),apply=process.argv.includes('--apply');
  await validateSharedSchema(createStore(prisma));
  const result=await prisma.$transaction(async tx=>{
    if(!apply)await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    return publishAvailability(createStore(tx),plan,apply);
  },{timeout:120000,maxWait:10000});
  console.log(JSON.stringify(result,null,2));
}catch(error){
  console.error(error?.name==='ApiError'||String(error?.message).startsWith('Use --file')?error.message:'Availability publication failed. No partial changes were committed.');
  process.exitCode=1;
}finally{await prisma.$disconnect();}
