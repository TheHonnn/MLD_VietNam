const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_assets/group_e_raw.json', 'utf8'));
const root = data.nodes['8116:26866'].document;
const screen = root.children.find(c => c.name === 'E01_AcademyHome');

function rgbToHex(c) {
  if (!c) return '';
  const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
  return '#' + (r + g + b).toUpperCase();
}

function printTree(node, depth = 0) {
  const fills = (node.fills || []).filter(f => f.visible !== false).map(f => f.type + (f.color ? rgbToHex(f.color) : '')).join(',');
  const strokes = (node.strokes || []).filter(s => s.visible !== false).map(s => s.type + (s.color ? rgbToHex(s.color) : '')).join(',');
  const text = node.characters ? ` "${node.characters.replace(/\n/g, ' ')}"` : '';
  const r = node.cornerRadius ? ` r=${node.cornerRadius}` : '';
  const bbox = node.absoluteBoundingBox ? `${Math.round(node.absoluteBoundingBox.width)}x${Math.round(node.absoluteBoundingBox.height)}` : '';
  console.log('  '.repeat(depth) + node.name + ` [${node.type}] ${bbox}` + text + (fills ? ` fill:${fills}` : '') + (strokes ? ` stroke:${strokes}` : '') + r);
  if (node.children) {
    for (const c of node.children) {
      printTree(c, depth + 1);
    }
  }
}

printTree(screen);

