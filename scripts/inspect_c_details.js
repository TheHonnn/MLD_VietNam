const fs = require('fs');
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';
const FILE_KEY = 'ctH76PAiMBTQLJE0BxNjOI';

async function fetchNodes(nodeIds) {
  const res = await fetch('https://api.figma.com/v1/files/' + FILE_KEY + '/nodes?ids=' + encodeURIComponent(nodeIds), {
    headers: { 'X-Figma-Token': FIGMA_TOKEN }
  });
  return (await res.json()).nodes;
}

function dump(node, depth = 0) {
  if (depth > 4) return;
  const indent = '  '.repeat(depth);
  let info = '';
  if (node.fills && node.fills.length > 0 && node.fills[0].color) {
    const c = node.fills[0].color;
    info += ' fill=#' + [c.r, c.g, c.b].map(x => Math.round(x*255).toString(16).padStart(2, '0')).join('');
  }
  if (node.strokes && node.strokes.length > 0 && node.strokes[0].color) {
    const c = node.strokes[0].color;
    info += ' stroke=#' + [c.r, c.g, c.b].map(x => Math.round(x*255).toString(16).padStart(2, '0')).join('') + ' sw=' + node.strokeWeight;
  }
  if (node.cornerRadius) info += ' r=' + node.cornerRadius;
  if (node.characters) info += ' text="' + node.characters.replace(/\n/g, ' ') + '"';
  console.log(indent + node.name + ' (' + node.type + ')' + info);
  if (node.children) node.children.forEach(c => dump(c, depth + 1));
}

async function main() {
  const ids = [
    '8111:27925', // BranchSelectionCard
    '8111:28038', // SpecialistRadioCard
    '8111:28155', // DateStrip
    '8111:28358', // TimeSlotButton
  ];
  const nodes = await fetchNodes(ids.join(','));
  for (const id of ids) {
    if (nodes[id]) {
      console.log('\n=== ' + nodes[id].document.name + ' ===');
      dump(nodes[id].document, 0);
    }
  }
}
main().catch(console.error);
