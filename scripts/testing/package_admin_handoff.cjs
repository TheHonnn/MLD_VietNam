const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const git = args => execFileSync('git', args, {cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const output = path.join(root,'.local-archive','handoff','antigravity-'+stamp);
fs.mkdirSync(output,{recursive:true});
const changed = git(['diff','--name-only','HEAD']).split('\n').filter(Boolean);
const untracked = git(['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean);
const baseline = [
  'database/migrations/027_admin_reliability.sql','database/testing/admin-schema.cjs',
  'backend/src/modules/admin/admin.scope.ts','backend/src/modules/admin/admin.schema.ts',
  'backend/src/modules/admin/admin.service.spec.ts','web-admin/src/admin/AdminReadiness.tsx',
  'web-admin/src/components/layout/Layout.tsx','web-admin/test/admin-cancellation.test.mjs',
  'backend/package.json','web-admin/package.json',
];
const manifest = {createdAt:new Date().toISOString(),baseCommit:git(['rev-parse','HEAD']),workspace:root,files:[]};
for (const relative of [...new Set([...changed,...untracked,...baseline])]) {
  if (!/^(backend|web-admin|database|docs|scripts|\.github)\//.test(relative) || /(^|\/)\.env|\.(pem|key)$/.test(relative)) continue;
  const source = path.resolve(root,relative);
  if (!source.startsWith(root+path.sep) || !fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
  const destination = path.join(output,'files',relative);
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.copyFileSync(source,destination);
  manifest.files.push({path:relative,kind:untracked.includes(relative)?'new':changed.includes(relative)?'modified':'baseline-dependency',sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')});
}
// These source files previously contained credentials. Ship their current clean snapshots,
// never their diff, because removed lines in a patch would disclose the old values.
fs.writeFileSync(path.join(output,'working-tree.patch'),execFileSync('git',[
  'diff','--binary','HEAD','--','.',
  ':(exclude)backend/src/modules/admin/admin.database.ts',
  ':(exclude)backend/src/modules/admin/admin.guard.ts',
],{cwd:root,stdio:['ignore','pipe','pipe']}));
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2));
fs.copyFileSync(path.join(root,'docs/HANDOFF_ANTIGRAVITY.md'),path.join(output,'START_HERE.md'));
for (const name of ['result.json','result-focused.json','validation-summary.json','final-admin-tests.log','final-frontend-tests.log','final-backend-build.log','final-frontend-build.log','final-browser-full.log','final-browser-reports.log','final-access-tests.log','pos-paid-desktop.png','tuition-ledger-desktop.png','financial-report-desktop.png','staff-name-desktop.png','admin-auth-audit.json']) {
  const source=path.join(root,'.local-archive/admin-review',name);
  if(fs.existsSync(source)){fs.mkdirSync(path.join(output,'evidence'),{recursive:true});fs.copyFileSync(source,path.join(output,'evidence',name));}
}
console.log(JSON.stringify({directory:output,files:manifest.files.length},null,2));
