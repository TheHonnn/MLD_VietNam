import 'dotenv/config';
import {prisma} from '../dist/lib/prisma.js';
import {createStore,validateSharedSchema} from '../dist/store.js';
import {runReminderBatch} from '../dist/reminders.js';

try {
  const store=createStore(prisma);
  await validateSharedSchema(store);
  let cursor=null,processed=0;
  do {
    const result=await runReminderBatch(store,cursor);
    cursor=result.nextCursor;processed+=result.processed;
  }while(cursor);
  console.log(JSON.stringify({remindersProcessed:processed}));
}catch{
  console.error('Reminder job failed; credentials and customer data are omitted.');
  process.exitCode=1;
}finally{await prisma.$disconnect();}
