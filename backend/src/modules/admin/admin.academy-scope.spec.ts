import { afterAll, beforeAll, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { branchPredicate } from './admin.scope';

let pg: PGlite;
const branch = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(`CREATE TABLE course_batches(id uuid PRIMARY KEY, branch_id uuid);
    CREATE TABLE course_enrollments(id uuid PRIMARY KEY,batch_id uuid);
    CREATE TABLE enrollment_change_requests(id int,enrollment_id uuid);
    CREATE TABLE enrollment_status_history(id int,enrollment_id uuid);`);
  await pg.query('INSERT INTO course_batches VALUES($1,$1),($2,$2)', [branch,other]);
  await pg.query('INSERT INTO course_enrollments VALUES($1,$1),($2,$2)', [branch,other]);
  for (const table of ['enrollment_change_requests','enrollment_status_history']) {
    await pg.query(`INSERT INTO ${table} VALUES(1,$1),(2,$2),(3,NULL)`, [branch,other]);
  }
},60000);
afterAll(async () => pg?.close());
for (const table of ['enrollment_change_requests','enrollment_status_history']) {
  it(`${table} only exposes records attached to an authorized branch`, async () => {
    const predicate = branchPredicate(table,'r','$1',['id','enrollment_id']);
    const result = await pg.query(`SELECT id FROM ${table} r WHERE ${predicate}`, [[branch]]);
    expect(result.rows).toEqual([{id:1}]);
    const none = await pg.query(`SELECT id FROM ${table} r WHERE ${predicate}`, [[]]);
    expect(none.rows).toEqual([]);
  });
}
