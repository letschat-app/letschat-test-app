const fs = require('fs');
const content = fs.readFileSync('src/pages/ChatNames.jsx', 'utf8');
const lines = content.split(/\r?\n/);
lines.forEach((l, i) => {
  if (l.includes('overflowY') || l.includes('overflow-y')) {
    console.log(`${i + 1}: ${l}`);
  }
});
