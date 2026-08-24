from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent / 'fixtures'
ROOT.mkdir(parents=True, exist_ok=True)

pages = [
    'NexussPDF benchmark page one. Selectable text should be extracted exactly.',
    'NexussPDF benchmark page two. Page headings and ordering must be preserved.',
]

c = canvas.Canvas(str(ROOT / 'selectable.pdf'), pagesize=letter)
for text in pages:
    c.setFont('Helvetica', 14)
    c.drawString(72, 720, text)
    c.showPage()
c.save()

font = None
for candidate in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf']:
    try:
        font = ImageFont.truetype(candidate, 42)
        break
    except OSError:
        pass
font = font or ImageFont.load_default()
image_paths = []
for i, text in enumerate([
    'NexussPDF OCR page one. Scanned text.',
    'NexussPDF OCR page two. Quality test.',
]):
    img = Image.new('RGB', (1800, 500), 'white')
    draw = ImageDraw.Draw(img)
    draw.text((90, 180), text, fill='black', font=font)
    p = ROOT / f'scanned-page-{i+1}.png'
    img.save(p, dpi=(200, 200))
    image_paths.append(p)

# Use ImageMagick/Pillow-independent PDF assembly through PIL.
imgs = [Image.open(p).convert('RGB') for p in image_paths]
imgs[0].save(ROOT / 'scanned.pdf', save_all=True, append_images=imgs[1:], resolution=200)
for p in image_paths: p.unlink()

(ROOT / 'ground_truth.txt').write_text('\n'.join(pages + [
    'NexussPDF OCR page one. Scanned text.',
    'NexussPDF OCR page two. Quality test.',
]) + '\n')
