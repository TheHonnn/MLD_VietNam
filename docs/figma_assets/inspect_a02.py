import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
data = json.load(open('d:/VN_Champion/MLD_VietNam/figma_assets/group_a_raw.json', encoding='utf-8'))

def find_a02(node):
    if node.get('id') == '8107:5522': return node
    for c in node.get('children', []):
        r = find_a02(c)
        if r: return r
    if 'document' in node:
        r = find_a02(node['document'])
        if r: return r
    if 'nodes' in node:
        for n in node['nodes'].values():
            r = find_a02(n)
            if r: return r
    return None

a02 = find_a02(data)
if a02:
    print('A02 layoutMode:', a02.get('layoutMode'))
    print('A02 primaryAxisAlignItems:', a02.get('primaryAxisAlignItems'))
    print('A02 itemSpacing:', a02.get('itemSpacing'))
    print('A02 padding:', a02.get('paddingTop'), a02.get('paddingBottom'), a02.get('paddingLeft'), a02.get('paddingRight'))
    for c in a02.get('children', []):
        bbox = c.get('absoluteBoundingBox', {})
        print(f"  - {c.get('name')} | {bbox.get('width')}x{bbox.get('height')} @ y={bbox.get('y')}")
        for sub in c.get('children', []):
            sbox = sub.get('absoluteBoundingBox', {})
            print(f"      * {sub.get('name')} | {sbox.get('width')}x{sbox.get('height')} @ y={sbox.get('y')}")

