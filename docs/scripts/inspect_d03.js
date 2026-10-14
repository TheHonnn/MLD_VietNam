const fs = require('fs');
const data = JSON.parse(fs.readFileSync('figma_assets/group_d_raw.json', 'utf8'));

const d03 = data.nodes['8112:7818'].document.children.find(c => c.name === 'D03_CareJournal');

function dumpTexts(node, indent = '') {
  if (!node) return;
  if (node.type === 'TEXT') {
    console.log(`${indent}TEXT [${node.style?.fontSize}px, w${node.style?.fontWeight}]: "${node.characters}"`);
  } else {
    if (node.name) console.log(`${indent}FRAME: ${node.name} (${node.id})`);
    if (node.children) {
      node.children.forEach(c => dumpTexts(c, indent + '  '));
    }
  }
}

dumpTexts(d03);

