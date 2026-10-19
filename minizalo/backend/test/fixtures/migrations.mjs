import {statements,version} from '../../migrations/004_mobile_reliability.mjs';
import {notificationStatements} from '../../migrations/004_notification_events.mjs';
import {statements as customerStatements,version as customerVersion} from '../../migrations/005_customer_workflows.mjs';
import {readFile} from 'node:fs/promises';
import {statements as profileStatements} from '../../migrations/006_customer_profile.mjs';
export async function migrateFixture(db) {
  const search=JSON.parse(await readFile(new URL('../../../docs/sql/003_search_history.json',import.meta.url),'utf8'));
  await db.exec(search.statements.join(';\n'));
  await db.exec([...statements,...notificationStatements].join(';\n'));
  await db.query('INSERT INTO miniapp_schema_versions(version) VALUES($1) ON CONFLICT(version) DO NOTHING',[version]);
  await db.exec(customerStatements.join(';\n'));
  await db.exec(profileStatements.join(';\n'));
  await db.query('INSERT INTO miniapp_schema_versions(version) VALUES($1) ON CONFLICT(version) DO NOTHING',[customerVersion]);
}
