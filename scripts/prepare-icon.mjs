/**
 * Crop icon from source art and remove white / light-blue background.
 * Output: electron/icon.png (1024), public/icon.png (256 for UI)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultSrc = path.join(rootDir, 'electron', 'icon-source.png');

const srcPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultSrc;
const pyScript = `
from PIL import Image
import sys

src = sys.argv[1]
out_main = sys.argv[2]
out_ui = sys.argv[3]

im = Image.open(src).convert('RGBA')
w, h = im.size
px = im.load()

minx, miny, maxx, maxy = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if r < 240 or g < 240 or b < 240:
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)

pad = 8
minx = max(0, minx - pad)
miny = max(0, miny - pad)
maxx = min(w - 1, maxx + pad)
maxy = min(h - 1, maxy + pad)
cropped = im.crop((minx, miny, maxx + 1, maxy + 1))
cw, ch = cropped.size
cp = cropped.load()

def lum(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b

def sat(r, g, b):
    mx = max(r, g, b)
    mn = min(r, g, b)
    return mx - mn

def is_foreground(r, g, b, a):
    if a < 16:
        return False
    s = sat(r, g, b)
    l = lum(r, g, b)
    if l < 60 and s < 18:
        return False
    if s > 32:
        return True
    if b > 90 and r < 120 and l < 170:
        return True
    if g > 110 and r < 110 and b > 80:
        return True
    if l < 120 and s > 12:
        return True
    return False

def is_background(r, g, b, a):
    if a < 16:
        return True
    if is_foreground(r, g, b, a):
        return False
    if r > 238 and g > 238 and b > 238:
        return True
    if lum(r, g, b) > 205:
        return True
    if lum(r, g, b) < 60 and sat(r, g, b) < 18:
        return True
    return False

for y in range(ch):
    for x in range(cw):
        r, g, b, a = cp[x, y]
        if is_background(r, g, b, a):
            cp[x, y] = (r, g, b, 0)

for y in range(ch):
    for x in range(cw):
        r, g, b, a = cp[x, y]
        if a > 0 and lum(r, g, b) > 188 and sat(r, g, b) < 20:
            cp[x, y] = (r, g, b, 0)

# trim transparent margins
minx2, miny2, maxx2, maxy2 = cw, ch, 0, 0
for y in range(ch):
    for x in range(cw):
        if cp[x, y][3] > 8:
            minx2 = min(minx2, x)
            miny2 = min(miny2, y)
            maxx2 = max(maxx2, x)
            maxy2 = max(maxy2, y)

icon = cropped.crop((minx2, miny2, maxx2 + 1, maxy2 + 1))
size = max(icon.size)
square = Image.new('RGBA', (size, size), (0, 0, 0, 0))
ox = (size - icon.size[0]) // 2
oy = (size - icon.size[1]) // 2
square.paste(icon, (ox, oy), icon)

main = square.resize((1024, 1024), Image.Resampling.LANCZOS)
ui = square.resize((256, 256), Image.Resampling.LANCZOS)
main.save(out_main, 'PNG')
ui.save(out_ui, 'PNG')
print(f'icon prepared: {out_main} ({main.size[0]}x{main.size[1]})')
`;

const electronIcon = path.join(rootDir, 'electron', 'icon.png');
const publicIcon = path.join(rootDir, 'public', 'icon.png');

if (!fs.existsSync(srcPath)) {
  console.error(`Source image not found: ${srcPath}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(electronIcon), { recursive: true });
fs.mkdirSync(path.dirname(publicIcon), { recursive: true });

const result = spawnSync('python', ['-c', pyScript, srcPath, electronIcon, publicIcon], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
