import json
import os
import sys
import io
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('d:/VN_Champion/MLD_VietNam/figma_assets/group_b_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Let's inspect B06 images and B08 images
def find_nodes(node, target_names):
    name = node.get('name', '')
    nid = node.get('id', '')
    bbox = node.get('absoluteBoundingBox', {})
    ntype = node.get('type', '')
    if any(tn in name for tn in target_names):
        print(f"Node: {name} [{nid}] ({ntype}) bbox: {bbox}")
    for c in node.get('children', []):
        find_nodes(c, target_names)

print("--- B06 nodes ---")
def find_by_id(node, target_id):
    if node.get('id') == target_id:
        return node
    for c in node.get('children', []):
        res = find_by_id(c, target_id)
        if res:
            return res
    if 'document' in node:
        res = find_by_id(node['document'], target_id)
        if res:
            return res
    if 'nodes' in node:
        for n in node['nodes'].values():
            res = find_by_id(n, target_id)
            if res:
                return res
    return None

b06 = find_by_id(data, '8109:15079')
if b06:
    print("Found B06! Listing children...")
    def list_leaves(n, depth=0):
        if n.get('type') in ['RECTANGLE', 'FRAME', 'INSTANCE'] and ('Ảnh' in n.get('name', '') or 'Hình' in n.get('name', '') or 'Image' in n.get('name', '') or 'ảnh' in n.get('name', '')):
            print("  " * depth + f"{n.get('name')} [{n.get('id')}] {n.get('absoluteBoundingBox')}")
        for c in n.get('children', []):
            list_leaves(c, depth + 1)
    list_leaves(b06)

b08 = find_by_id(data, '8109:15314')
if b08:
    print("\nFound B08! Listing children...")
    list_leaves(b08)
