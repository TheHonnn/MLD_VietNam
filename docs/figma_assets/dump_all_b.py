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

screens_to_dump = [
    ('B04_Search', '8109:14898'),
    ('B05_BranchListing', '8109:14994'),
]

def dump_texts(n, depth=0):
    ntype = n.get('type')
    name = n.get('name', '')
    if ntype == 'TEXT':
        txt = n.get('characters', '').replace('\n', ' ')
        print("  " * depth + f"[TEXT] '{txt}' ({n.get('style', {}).get('fontSize')}px)")
    elif any(k in name.lower() for k in ['button', 'card', 'filter', 'chip', 'dropdown', 'item', 'tab']):
        print("  " * depth + f"[{ntype}] {name}")
    for c in n.get('children', []):
        dump_texts(c, depth + 1)

for sname, sid in screens_to_dump:
    print(f"\n==================== {sname} ({sid}) ====================")
    sc = find_node(data, sid)
    if sc:
        dump_texts(sc)
