import json
import os
from PIL import Image

im = Image.open(r'D:\VN_Champion\MLD_VietNam\figma_assets\screens\05 — GROUP E _ VOCATIONAL TRAINING ACADEMY_8116_26866.png')
with open(r'D:\VN_Champion\MLD_VietNam\figma_assets\group_e_raw.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

root = data['nodes']['8116:26866']['document']
root_bbox = root['absoluteBoundingBox']
scale_x = im.size[0] / root_bbox['width']
scale_y = im.size[1] / root_bbox['height']
print(f'Scale: x={scale_x}, y={scale_y}')

out_dir = r'D:\VN_Champion\MLD_VietNam\figma_assets\individual_screens'
os.makedirs(out_dir, exist_ok=True)

for c in root['children']:
    name = c['name']
    if name.startswith('E'):
        bbox = c['absoluteBoundingBox']
        left = int((bbox['x'] - root_bbox['x']) * scale_x)
        top = int((bbox['y'] - root_bbox['y']) * scale_y)
        right = int(left + bbox['width'] * scale_x)
        bottom = int(top + bbox['height'] * scale_y)
        
        cropped = im.crop((left, top, right, bottom))
        out_path = os.path.join(out_dir, f'{name}.png')
        cropped.save(out_path)
        print(f'Cropped {name} -> {out_path} ({cropped.size})')

