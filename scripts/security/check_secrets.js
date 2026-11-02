/**
 * MLD Việt Nam - Automated Secret Leak Prevention Scanner
 * Scans tracked files for leaked passwords, database connection strings,
 * service-role keys, private keys, and API secrets.
 *
 * NOTE: Never logs or prints secret values. Outputs only file path and rule name.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SECRET_PATTERNS = [
  {
    name: 'PostgreSQL URL with Password',
    regex: /postgresql:\/\/[^:]+:[^@\s'"]+@[^/\s'"]+/i,
    ignoreSubstrings: ['[PASS]', 'YOUR_PASSWORD', 'PASSWORD', ':password@', '<PASS>'],
  },
  {
    name: 'Hardcoded Supabase Service Role Key JWT',
    regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    validator: (match) => {
      try {
        const parts = match.split('.');
        if (parts.length < 2) return false;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return payload.role === 'service_role';
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Hardcoded Private Key Header',
    regex: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  },
];

const IGNORE_PATHS = [
  'node_modules',
  '.git',
  'package-lock.json',
  'check_secrets.js',
];

function runSecretAudit() {
  console.log('🔍 [Security Audit] Scanning tracked files for exposed secrets...');
  let files = [];
  try {
    const output = execSync('git ls-files', { encoding: 'utf8' });
    files = output.split('\n').map((f) => f.trim()).filter(Boolean);
  } catch (err) {
    console.error('❌ Cannot list git files:', err.message);
    process.exit(1);
  }

  let violationsFound = 0;

  for (const relPath of files) {
    if (IGNORE_PATHS.some((p) => relPath.includes(p))) continue;
    const absPath = path.resolve(relPath);
    if (!fs.existsSync(absPath)) continue;

    let content = '';
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch {
      continue; // Skip binary files
    }

    for (const rule of SECRET_PATTERNS) {
      const match = content.match(rule.regex);
      if (match) {
        if (rule.ignoreSubstrings && rule.ignoreSubstrings.some((sub) => match[0].includes(sub))) {
          continue;
        }
        if (rule.validator && !rule.validator(match[0])) {
          continue;
        }

        console.error(`🚨 [SECRET LEAK DETECTED] Rule: "${rule.name}" triggered in file: ${relPath}`);
        violationsFound++;
      }
    }
  }

  if (violationsFound > 0) {
    console.error(`\n❌ Quét bảo mật thất bại! Phát hiện ${violationsFound} vị trí có nguy cơ lộ bí mật.`);
    console.error('Vui lòng thay thế bằng biến môi trường hoặc placeholder trước khi commit.\n');
    process.exit(1);
  } else {
    console.log('✅ [Security Audit] Không phát hiện bí mật hay thông tin đăng nhập lộ trong kho lưu trữ.');
    process.exit(0);
  }
}

runSecretAudit();
