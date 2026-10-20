// Reuses the local shared DB connection in memory; does not copy secrets to files.
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const common = path.join(root, '.env');
const fallback = path.resolve(root, '../minizalo/backend/.env');
const local = fs.existsSync(common)
  ? parseEnv(fs.readFileSync(common, 'utf8'))
  : {};
const shared = fs.existsSync(fallback)
  ? parseEnv(fs.readFileSync(fallback, 'utf8'))
  : {};
const env = { ...process.env, ...local };
env.ADMIN_DATABASE_URL =
  env.ADMIN_DATABASE_URL || env.DATABASE_URL || shared.DATABASE_URL;
if (!env.ADMIN_DATABASE_URL) {
  console.error('Configure ADMIN_DATABASE_URL in backend/.env first.');
  process.exit(1);
}
env.PORT = env.PORT || '3000';
env.NODE_ENV = env.NODE_ENV || 'development';
env.ADMIN_LOCAL_NO_AUTH = 'true';
env.JWT_SECRET =
  env.JWT_SECRET &&
  env.JWT_SECRET.length >= 32 &&
  env.JWT_SECRET !== 'super-secret-jwt-key-medical-healthcare-2026'
    ? env.JWT_SECRET
    : randomBytes(48).toString('hex');
env.CORS_ORIGIN =
  env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173';
console.log(
  'Starting common backend with shared local DB configuration. No keys printed.',
);
const child = spawn(process.execPath, ['dist/main.js'], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: true,
});
child.on('exit', (code) => process.exit(code ?? 1));
process.on('SIGINT', () => child.kill('SIGINT'));
