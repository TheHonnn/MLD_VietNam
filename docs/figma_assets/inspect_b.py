import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('d:/VN_Champion/MLD_VietNam/figma_assets/group_b_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

nodes = data.get('nodes', {})
print("Root node keys in group_b_raw.json:", list(nodes.keys()))

def walk(node, depth=0):
    name = node.get('name', '')
    nid = node.get('id', '')
    ntype = node.get('type', '')
    bbox = node.get('absoluteBoundingBox', {})
    w = bbox.get('width', 0) if bbox else 0
    h = bbox.get('height', 0) if bbox else 0
    if ntype == 'FRAME' and (w == 390 or 'B0' in name or 'B' in name or depth <= 2):
        print("  " * depth + f"{name} [{nid}] ({ntype}) {w}x{h}")
    for c in node.get('children', []):
        walk(c, depth + 1)

for k, v in nodes.items():
    print(f"\n--- Node key {k} ---")
    doc = v.get('document', {})
    walk(doc)
