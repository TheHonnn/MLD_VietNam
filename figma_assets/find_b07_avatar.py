import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('d:/VN_Champion/MLD_VietNam/figma_assets/group_b_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def find_b07(node):
    if node.get('id') == '8109:15210':
        return node
    for c in node.get('children', []):
        r = find_b07(c)
        if r: return r
    if 'document' in node:
        r = find_b07(node['document'])
        if r: return r
    if 'nodes' in node:
        for n in node['nodes'].values():
            r = find_b07(n)
            if r: return r
    return None

b07 = find_b07(data)
def walk_b07(n):
    if 'Nguyễn' in n.get('name', '') or 'Avatar' in n.get('name', '') or 'Ảnh' in n.get('name', '') or 'Hình' in n.get('name', ''):
        print(n.get('name'), n.get('absoluteBoundingBox'))
    for c in n.get('children', []):
        walk_b07(c)

walk_b07(b07)

