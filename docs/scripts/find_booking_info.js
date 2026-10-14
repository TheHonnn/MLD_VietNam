const fs = require('fs');
const path = require('path');

function searchFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (f === 'node_modules' || f === '.git' || f === 'build' || f === '.dart_tool') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchFiles(full);
    } else if (f.endsWith('.dart') || f.endsWith('.json') || f.endsWith('.md')) {
      try {
        const text = fs.readFileSync(full, 'utf8').toLowerCase();
        if (text.includes('thông tin đặt lịch')) {
          console.log('Found in:', full);
        }
      } catch (e) {}
    }
  }
}

searchFiles('.');

