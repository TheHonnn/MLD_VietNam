import os
from PIL import Image as PILImage
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register fonts
pdfmetrics.registerFont(TTFont('Arial', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Italic', r'C:\Windows\Fonts\ariali.ttf'))

# Convert webp to png for reportlab
for img_name in ['image1', 'image2', 'image3']:
    webp_path = f'extracted_media/{img_name}.webp'
    png_path = f'extracted_media/{img_name}.png'
    if os.path.exists(webp_path):
        im = PILImage.open(webp_path)
        im.convert('RGB').save(png_path)

pdf_filename = 'thoat_vi_dia_dem.pdf'
doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=A4,
    rightMargin=40,
    leftMargin=40,
    topMargin=40,
    bottomMargin=40
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'DocTitle',
    fontName='Arial-Bold',
    fontSize=18,
    leading=24,
    textColor=colors.HexColor('#985018'),
    spaceAfter=15,
)

h1_style = ParagraphStyle(
    'DocH1',
    fontName='Arial-Bold',
    fontSize=13,
    leading=18,
    textColor=colors.HexColor('#1E293B'),
    spaceBefore=14,
    spaceAfter=8,
)

body_style = ParagraphStyle(
    'DocBody',
    fontName='Arial',
    fontSize=10.5,
    leading=16,
    textColor=colors.HexColor('#334155'),
    spaceAfter=10,
)

caption_style = ParagraphStyle(
    'DocCaption',
    fontName='Arial-Italic',
    fontSize=9.5,
    leading=14,
    textColor=colors.HexColor('#64748B'),
    alignment=1, # Center
    spaceAfter=12,
)

with open('extracted_doc.txt', 'r', encoding='utf-8') as f:
    text = f.read()

paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

elements = []

# Title is paragraph 0
elements.append(Paragraph(paragraphs[0], title_style))
elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#985018'), spaceBefore=5, spaceAfter=15))

for p in paragraphs[1:]:
    if p.startswith(('1. ', '2. ', '3. ', '4. ', '5. ', 'KHI NÀO CẦN ĐI KHÁM?', 'KẾT LUẬN', 'TÀI LIỆU THAM KHẢO')):
        elements.append(Paragraph(p, h1_style))
    elif p.startswith('Ảnh 1.'):
        png_path = 'extracted_media/image1.png'
        if os.path.exists(png_path):
            img = RLImage(png_path, width=320, height=180)
            img.hAlign = 'CENTER'
            elements.append(img)
            elements.append(Spacer(1, 4))
        elements.append(Paragraph(p, caption_style))
    elif p.startswith('Ảnh 2.'):
        png_path = 'extracted_media/image2.png'
        if os.path.exists(png_path):
            img = RLImage(png_path, width=320, height=200)
            img.hAlign = 'CENTER'
            elements.append(img)
            elements.append(Spacer(1, 4))
        elements.append(Paragraph(p, caption_style))
    elif p.startswith('Ảnh 3.'):
        png_path = 'extracted_media/image3.png'
        if os.path.exists(png_path):
            img = RLImage(png_path, width=340, height=210)
            img.hAlign = 'CENTER'
            elements.append(img)
            elements.append(Spacer(1, 4))
        elements.append(Paragraph(p, caption_style))
    else:
        elements.append(Paragraph(p, body_style))

doc.build(elements)
print(f"Generated {pdf_filename}, size: {os.path.getsize(pdf_filename)} bytes")

