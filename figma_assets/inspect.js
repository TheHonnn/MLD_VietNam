const fs = require('fs');

const data = JSON.parse(fs.readFileSync('d:/VN_Champion/MLD_VietNam/figma_assets/group_a_raw.json', 'utf8'));
const sec = data.nodes['8107:5498'].document;

function printTree(node, indent = '') {
  const text = node.characters ? ' -> "' + node.characters.replace(/\n/g, ' ') + '"' : '';
  const isImg = node.fills && node.fills.some(f => f.type === 'IMAGE') ? ' [IMAGE FILL!]' : '';
  console.log(indent + node.name + ' [' + node.type + '] (' + node.id + ')' + text + isImg);
  for (const child of node.children || []) {
    printTree(child, indent + '  ');
  }
}

for (const frame of sec.children) {
  console.log('=====================================');
  printTree(frame);
}

