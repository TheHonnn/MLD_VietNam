import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('d:/VN_Champion/MLD_VietNam/figma_assets/group_b_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def find_node(node, target_id):
    if node.get('id') == target_id:
        return node
    for c in node.get('children', []):
        r = find_node(c, target_id)
        if r: return r
    if 'document' in node:
        r = find_node(node['document'], target_id)
        if r: return r
    if 'nodes' in node:
        for n in node['nodes'].values():
            r = find_node(n, target_id)
            if r: return r
    return None

b02 = find_node(data, '8109:14809')

def dump_texts(n, depth=0):
    ntype = n.get('type')
    name = n.get('name', '')
    if ntype == 'TEXT':
        print("  " * depth + f"[TEXT] '{n.get('characters', '')}' (font: {n.get('style', {}).get('fontSize')})")
    elif 'button' in name.lower() or 'card' in name.lower() or 'filter' in name.lower() or 'chip' in name.lower():
        print("  " * depth + f"[{ntype}] {name}")
    for c in n.get('children', []):
        dump_texts(c, depth + 1)

print("=== B02_ServiceListing TEXT & STRUCTURE ===")
dump_texts(b02)
