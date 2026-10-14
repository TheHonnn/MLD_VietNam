const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'figma_assets', 'group_f_raw.json'), 'utf8'));
const root = Object.values(data.nodes)[0].document;

function hexColor(c) {
  if (!c) return 'none';
  const r = Math.round((c.r ?? 0) * 255).toString(16).padStart(2, '0');
  const g = Math.round((c.g ?? 0) * 255).toString(16).padStart(2, '0');
  const b = Math.round((c.b ?? 0) * 255).toString(16).padStart(2, '0');
  return ('#' + r + g + b).toUpperCase();
}

function summarizeScreen(screen) {
  console.log('\n================================================================');
  console.log(`SCREEN: ${screen.name} [${screen.id}]`);
  const w = Math.round(screen.absoluteBoundingBox?.width || 0);
  const h = Math.round(screen.absoluteBoundingBox?.height || 0);
  console.log(`Size: ${w} x ${h}`);
  
  function recurse(n, depth = 0) {
    if (depth > 6) return;
    const indent = '  '.repeat(depth);
    const fill = n.fills?.[0]?.color ? hexColor(n.fills[0].color) : (n.fills?.[0]?.type || 'none');
    const stroke = n.strokes?.[0]?.color ? hexColor(n.strokes[0].color) : 'none';
    const r = n.cornerRadius || (n.rectangleCornerRadii ? n.rectangleCornerRadii.join(',') : '');
    const nw = Math.round(n.absoluteBoundingBox?.width || 0);
    const nh = Math.round(n.absoluteBoundingBox?.height || 0);
    
    if (n.type === 'TEXT') {
      const charSample = n.characters?.replace(/\r?\n/g, ' ') || '';
      console.log(`${indent}[TEXT] "${charSample.substring(0, 50)}" (sz:${n.style?.fontSize}, wt:${n.style?.fontWeight}, color:${fill})`);
    } else {
      let desc = `${indent}[${n.type}] "${n.name}" (${nw}x${nh}`;
      if (r) desc += `, r=${r}`;
      if (fill !== 'none') desc += `, fill=${fill}`;
      if (stroke !== 'none') desc += `, stroke=${stroke}`;
      desc += ')';
      console.log(desc);
      if (n.children) {
        for (const child of n.children) {
          recurse(child, depth + 1);
        }
      }
    }
  }
  
  recurse(screen, 0);
}

for (const s of root.children.slice().reverse()) {
  summarizeScreen(s);
}

