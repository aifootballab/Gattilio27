const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, '..', 'app', 'gestione-formazione', 'page.jsx');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);
// Remove lines 928-999 (0-based: 927-998): dead block
const before = lines.slice(0, 927);
const after = lines.slice(999);
const result = before.concat(after).join('\n');
fs.writeFileSync(filePath, result);
console.log('Removed lines 928-999. Before:', lines.length, 'After:', before.length + after.length);
