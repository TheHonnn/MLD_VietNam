import {readFile} from 'node:fs/promises';
import {prisma} from '../dist/lib/prisma.js';
import {createStore,validateSharedSchema} from '../dist/store.js';
import {configureWorkflows} from '../dist/configure-workflows.js';
try{
  const index=process.argv.indexOf('--file'),file=index>=0?process.argv[index+1]:null;
  if(!file)throw new Error('Use --file path-to-private-config.json; append --apply only after checking the dry run.');
  const input=JSON.parse(await readFile(file,'utf8'));
  await validateSharedSchema(createStore(prisma));
  const apply=process.argv.includes('--apply');
  const result=await prisma.$transaction(async tx=>{
    if(!apply)await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    return configureWorkflows(createStore(tx),input,apply);
  },{timeout:60000});
  console.log(JSON.stringify(result));
}catch(error){
  console.error(error?.name==='ApiError'||String(error?.message).startsWith('Use --file')?error.message:'Configuration failed; no partial changes were committed. Check input and database access.');process.exitCode=1;
}finally{await prisma.$disconnect();}
