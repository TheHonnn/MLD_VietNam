const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'group_c_main_raw.json')));
const doc = data.nodes['8111:26450'].document;

let out = '';

function colorHex(c) {
  if (!c) return '';
  const r = Math.round((c.r || 0) * 255).toString(16).padStart(2, '0').toUpperCase();
  const g = Math.round((c.g || 0) * 255).toString(16).padStart(2, '0').toUpperCase();
  const b = Math.round((c.b || 0) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${r}${g}${b}`;
}

function traverse(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const bbox = node.absoluteBoundingBox || {};
  let info = `(${Math.round(bbox.width || 0)}x${Math.round(bbox.height || 0)})`;

  if (node.fills && node.fills.length > 0 && node.fills[0].color) {
    info += ` fill=${colorHex(node.fills[0].color)}`;
  }
  if (node.strokes && node.strokes.length > 0 && node.strokes[0].color) {
    info += ` stroke=${colorHex(node.strokes[0].color)}`;
  }
  if (node.cornerRadius) {
    info += ` r=${node.cornerRadius}`;
  }
  if (node.type === 'TEXT') {
    const chars = (node.characters || '').replace(/\r?\n/g, ' ');
    info += ` text="${chars}" [sz:${node.style?.fontSize}, wt:${node.style?.fontWeight}]`;
  }

  out += `${indent}[${node.type}] "${node.name}" ${info}\n`;

  if (node.children && depth < 5) {
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }
}

for (const row of doc.children) {
  if (row.children) {
    for (const sc of row.children) {
      out += `\n======================================================\n`;
      out += `SCREEN: ${sc.name} [${sc.id}]\n`;
      out += `======================================================\n`;
      traverse(sc, 0);
    }
  }
}

fs.writeFileSync(path.join(__dirname, 'screens_detail.txt'), out);
console.log('Saved screens_detail.txt');
