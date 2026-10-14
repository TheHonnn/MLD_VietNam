const fs = require('fs');

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';
const FILE_KEY = 'ctH76PAiMBTQLJE0BxNjOI';

async function fetchNodes(nodeIds) {
  const res = await fetch('https://api.figma.com/v1/files/' + FILE_KEY + '/nodes?ids=' + encodeURIComponent(nodeIds), {
    headers: { 'X-Figma-Token': FIGMA_TOKEN }
  });
  const data = await res.json();
  return data.nodes;
}

function dumpNode(node, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return;
  const indent = '  '.repeat(depth);
  let extra = '';
  if (node.fills && node.fills.length > 0) {
    const f = node.fills[0];
    if (f.color) {
      const r = Math.round(f.color.r * 255);
      const g = Math.round(f.color.g * 255);
      const b = Math.round(f.color.b * 255);
      const a = f.color.a !== undefined ? f.color.a.toFixed(2) : '1';
      extra += ` fill=rgba(${r},${g},${b},${a})`;
    }
  }
  if (node.strokes && node.strokes.length > 0) {
    const s = node.strokes[0];
    if (s.color) {
      const r = Math.round(s.color.r * 255);
      const g = Math.round(s.color.g * 255);
      const b = Math.round(s.color.b * 255);
      extra += ` stroke=rgb(${r},${g},${b})`;
    }
  }
  if (node.characters) {
    extra += ` text="${node.characters.replace(/\n/g, ' ')}"`;
  }
  if (node.cornerRadius) extra += ` r=${node.cornerRadius}`;
  if (node.itemSpacing) extra += ` spacing=${node.itemSpacing}`;
  if (node.paddingLeft) extra += ` p=[${node.paddingTop},${node.paddingRight},${node.paddingBottom},${node.paddingLeft}]`;

  console.log(`${indent}[${node.type}] "${node.name}" (${node.id})${extra}`);
  if (node.children) {
    node.children.forEach(c => dumpNode(c, depth + 1, maxDepth));
  }
}

async function main() {
  const nodes = await fetchNodes('8111:26453,8111:27759,8111:27898');
  
  console.log('=== C01_ServiceSelection (8111:26453) ===');
  dumpNode(nodes['8111:26453'].document, 0, 5);
  
  console.log('\n=== MultiServiceSelector (8111:27759) ===');
  dumpNode(nodes['8111:27759'].document, 0, 4);

  console.log('\n=== SelectedServiceSummary (8111:27898) ===');
  dumpNode(nodes['8111:27898'].document, 0, 4);
}

main().catch(console.error);

