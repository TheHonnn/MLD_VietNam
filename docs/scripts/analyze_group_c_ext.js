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

function dumpNode(node, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return;
  const indent = '  '.repeat(depth);
  let extra = '';
  if (node.fills && node.fills.length > 0 && node.fills[0].color) {
    const c = node.fills[0].color;
    extra += ` fill=rgb(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)})`;
  }
  if (node.strokes && node.strokes.length > 0 && node.strokes[0].color) {
    const c = node.strokes[0].color;
    extra += ` stroke=rgb(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)})`;
  }
  if (node.characters) extra += ` text="${node.characters.replace(/\n/g, ' ')}"`;
  if (node.cornerRadius) extra += ` r=${node.cornerRadius}`;
  console.log(`${indent}[${node.type}] "${node.name}" (${node.id})${extra}`);
  if (node.children) node.children.forEach(c => dumpNode(c, depth + 1, maxDepth));
}

async function main() {
  const ids = [
    '8111:27925', // BranchSelectionCard
    '8111:28038', // SpecialistRadioCard
    '8111:28155', // DateStrip
    '8111:28358', // TimeSlotButton
    '8111:28660', // PrepaidPackageSelector
    '8111:28705', // PaymentMethodCard
    '8111:28765', // PaymentQRPlaceholder
    '8111:29082', // RescheduleBottomSheet
    '8111:29215', // CancelBookingDialog
  ];

  const nodes = await fetchNodes(ids.join(','));
  for (const id of ids) {
    if (nodes[id]) {
      console.log(`\n================== ${nodes[id].document.name} (${id}) ==================`);
      dumpNode(nodes[id].document, 0, 3);
    }
  }
}

main().catch(console.error);

