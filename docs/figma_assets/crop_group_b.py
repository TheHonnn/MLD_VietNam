import json
import os
import sys
import io
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('d:/VN_Champion/MLD_VietNam/figma_assets/group_b_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find parent frames and screens
screens = {}

def find_screens(node):
    if isinstance(node, dict):
        nid = node.get('id', '')
        name = node.get('name', '')
        bbox = node.get('absoluteBoundingBox', {})
        if any(name.startswith(p) for p in ['B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08']):
            screens[name] = (bbox, nid)
        for c in node.get('children', []):
            find_screens(c)
        if 'document' in node:
            find_screens(node['document'])
        if 'nodes' in node:
            for n in node['nodes'].values():
                find_screens(n)

find_screens(data)

print("Found screens:", screens)

# Parents:
# Màn hình khám phá: B01, B02, B03, B04
# Cơ sở và đội ngũ: B05, B06, B07, B08

def crop_screens_from(image_path, screen_prefix_list, out_dir):
    im = Image.open(image_path)
    # The parent bounding box
    # Let's find min_x and min_y among the screen_prefix_list
    group_screens = {k: v[0] for k, v in screens.items() if any(k.startswith(p) for p in screen_prefix_list)}
    min_x = min(v['x'] for v in group_screens.values())
    min_y = min(v['y'] for v in group_screens.values())
    max_x = max(v['x'] + v['width'] for v in group_screens.values())
    max_y = max(v['y'] + v['height'] for v in group_screens.values())
    
    scale_x = im.size[0] / (max_x - min_x)
    scale_y = im.size[1] / (max_y - min_y)
    print(f"File {image_path}: scale_x={scale_x}, scale_y={scale_y}")
    
    for s_name, bbox in group_screens.items():
        left = int((bbox['x'] - min_x) * scale_x)
        top = int((bbox['y'] - min_y) * scale_y)
        right = int(left + bbox['width'] * scale_x)
        bottom = int(top + bbox['height'] * scale_y)
        
        cropped = im.crop((left, top, right, bottom))
        out_path = os.path.join(out_dir, f"{s_name}.png")
        cropped.save(out_path)
        print(f"Saved {out_path} ({cropped.size})")

out_dir = 'd:/VN_Champion/MLD_VietNam/figma_assets/individual_screens'
crop_screens_from('d:/VN_Champion/MLD_VietNam/figma_assets/individual_screens/Màn hình khám phá.png', ['B01', 'B02', 'B03', 'B04'], out_dir)
crop_screens_from('d:/VN_Champion/MLD_VietNam/figma_assets/individual_screens/Cơ sở và đội ngũ.png', ['B05', 'B06', 'B07', 'B08'], out_dir)
