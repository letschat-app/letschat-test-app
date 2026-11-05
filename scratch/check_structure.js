import fs from 'fs';
const lines = fs.readFileSync('src/pages/ChatNames.jsx', 'utf8').split(/\r?\n/);
console.log(lines.slice(2480, 2510).map((l, i) => `${2481 + i}: ${l}`).join('\n'));
