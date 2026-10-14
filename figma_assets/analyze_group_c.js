const fs = require('fs');
const path = require('path');

function colorToHex(c) {
  if (!c) return 'none';
  const r = Math.round((c.r || 0) * 255).toString(16).padStart(2, '0').toUpperCase();
  const g = Math.round((c.g || 0) * 255).toString(16).padStart(2, '0').toUpperCase();
  const b = Math.round((c.b || 0) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${r}${g}${b}`;
}

function summarizeNode(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const bbox = node.absoluteBoundingBox || {};
  const w = Math.round(bbox.width || 0);
  const h = Math.round(bbox.height || 0);
  
  let fillStr = '';
  if (node.fills && node.fills.length > 0) {
    const f = node.fills[0];
    if (f.type === 'SOLID' && f.color) {
      fillStr = `, fill=${colorToHex(f.color)}`;
    } else if (f.type.startsWith('IMAGE')) {
      fillStr = `, fill=IMAGE`;
    }
  }

  let strokeStr = '';
  if (node.strokes && node.strokes.length > 0) {
    const s = node.strokes[0];
    if (s.type === 'SOLID' && s.color) {
      strokeStr = `, stroke=${colorToHex(s.color)}`;
    }
  }

  let rStr = '';
  if (node.cornerRadius) {
    rStr = `, r=${node.cornerRadius}`;
  }

  let textStr = '';
  if (node.type === 'TEXT') {
    const sz = node.style ? node.style.fontSize : '';
    const wt = node.style ? node.style.fontWeight : '';
    textStr = ` "${node.characters || ''}" (sz:${sz}, wt:${wt}${fillStr})`;
    return `${indent}[TEXT]${textStr} [${w}x${h}] id:${node.id}\n`;
  }

  let res = `${indent}[${node.type}] "${node.name}" (${w}x${h}${rStr}${fillStr}${strokeStr}) id:${node.id}\n`;
  if (node.children) {
    for (const child of node.children) {
      res += summarizeNode(child, depth + 1);
    }
  }
  return res;
}

// 1. Analyze Main Group C
const mainData = JSON.parse(fs.readFileSync(path.join(__dirname, 'group_c_main_raw.json'), 'utf8'));
const mainNode = mainData.nodes['8111:26450'] ? mainData.nodes['8111:26450'].document : null;

let outMain = '=== GROUP C: ĐẶT LỊCH VÀ THANH TOÁN (8111:26450) ===\n';
if (mainNode && mainNode.children) {
  for (const screen of mainNode.children) {
    const bbox = screen.absoluteBoundingBox || {};
    outMain += `\nSCREEN: "${screen.name}" [${screen.id}] (${Math.round(bbox.width || 0)}x${Math.round(bbox.height || 0)})\n`;
    if (screen.children) {
      for (const child of screen.children) {
        outMain += summarizeNode(child, 1);
      }
    }
  }
}
fs.writeFileSync(path.join(__dirname, 'group_c_main_analysis.txt'), outMain);
console.log('Saved group_c_main_analysis.txt');

// 2. Analyze Expanded Group C
const expData = JSON.parse(fs.readFileSync(path.join(__dirname, 'group_c_expanded_raw.json'), 'utf8'));
const expNode = expData.nodes['8111:27684'] ? expData.nodes['8111:27684'].document : null;

let outExp = '=== GROUP C: TRẠNG THÁI & THÀNH PHẦN MỞ RỘNG (8111:27684) ===\n';
if (expNode && expNode.children) {
  for (const comp of expNode.children) {
    const bbox = comp.absoluteBoundingBox || {};
    outExp += `\nSECTION/COMP: "${comp.name}" [${comp.id}] (${Math.round(bbox.width || 0)}x${Math.round(bbox.height || 0)})\n`;
    if (comp.children) {
      for (const child of comp.children) {
        outExp += summarizeNode(child, 1);
      }
    }
  }
}
fs.writeFileSync(path.join(__dirname, 'group_c_expanded_analysis.txt'), outExp);
console.log('Saved group_c_expanded_analysis.txt');
