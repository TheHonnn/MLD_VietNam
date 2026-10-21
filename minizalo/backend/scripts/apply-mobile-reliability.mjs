import {prisma} from '../dist/lib/prisma.js';
import {version,statements} from '../migrations/004_mobile_reliability.mjs';
import {notificationStatements} from '../migrations/004_notification_events.mjs';
import {statements as customerStatements,version as customerVersion} from '../migrations/005_customer_workflows.mjs';
try {
  if (!process.argv.includes('--apply')) console.log(`Dry run: ${version} and ${customerVersion}; additive tables, indexes and triggers only. No records are removed.`);
  else {
    await prisma.$transaction(async tx => {
      for (const statement of [...statements,...notificationStatements]) await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO miniapp_schema_versions(version) VALUES(${version}) ON CONFLICT(version) DO NOTHING`;
      for(const statement of customerStatements)await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO miniapp_schema_versions(version) VALUES(${customerVersion}) ON CONFLICT(version) DO NOTHING`;
    },{timeout:60000});
    console.log(`Applied ${version} and ${customerVersion}. No existing business records were removed.`);
  }
} catch(error) {
  console.error('Additive migration failed and was rolled back.',error?.code || error?.name);
  process.exitCode=1;
} finally {await prisma.$disconnect();}
