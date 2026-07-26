/**
 * Генерация иконок приложения из assets/icon.svg
 * Каждый размер растеризуется из вектора отдельно и кладётся на скруглённую подложку
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico').default;
const png2icons = require('png2icons');

const ASSETS_DIR = path.join(__dirname, '../../assets');
const SOURCE_PATH = path.join(ASSETS_DIR, 'icon.svg');
const COMPACT_SOURCE_PATH = path.join(ASSETS_DIR, 'icon-small.svg');
const ICONS_DIR = path.join(ASSETS_DIR, 'icons');

const BACKGROUND = '#252527';
const RADIUS_RATIO = 0.23;
const PADDING_RATIO = 0.14;
const COMPACT_PADDING_RATIO = 0.06;
const COMPACT_SIZE = 32;
const ICO_SIZES = [16, 20, 24, 32, 40, 48, 60, 64, 72, 96, 128, 256];
const PNG_SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];
const MASTER_SIZE = 1024;

/**
 * Читает SVG и определяет его размер по viewBox
 */
const readSource = (filePath) => {
  const svg = fs.readFileSync(filePath, 'utf8');
  const viewBox = svg.match(/viewBox\s*=\s*"([^"]+)"/);
  let size = 512;

  if (viewBox) {
    const [, , width, height] = viewBox[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (width > 0 && height > 0) size = Math.max(width, height);
  }

  return { svg, size };
};

/**
 * Рисует скруглённую подложку заданного размера
 */
const renderPlate = (size) => {
  const radius = Math.round(size * RADIUS_RATIO);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BACKGROUND}"/>` +
      `</svg>`,
  );
};

/**
 * Растеризует логотип из вектора точно под нужный размер
 */
const renderGlyph = (source, size) => {
  const padding = size <= COMPACT_SIZE ? COMPACT_PADDING_RATIO : PADDING_RATIO;
  const box = Math.max(1, Math.round(size * (1 - padding * 2)));
  const density = Math.min(
    2400,
    Math.max(1, Math.round((72 * box) / source.size)),
  );

  return sharp(Buffer.from(source.svg), { density })
    .resize(box, box, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
};

/**
 * Собирает иконку: подложка плюс отцентрованный логотип
 */
const composeIcon = async (source, size) => {
  const glyph = await renderGlyph(source, size);
  const { width = size, height = size } = await sharp(glyph).metadata();

  return sharp(renderPlate(size))
    .composite([
      {
        input: glyph,
        left: Math.round((size - width) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
};

/**
 * Генерирует icon.ico, icon.icns, icon.png и набор PNG для Linux
 */
const generate = async () => {
  const source = readSource(SOURCE_PATH);
  const compactSource = fs.existsSync(COMPACT_SOURCE_PATH)
    ? readSource(COMPACT_SOURCE_PATH)
    : source;

  fs.mkdirSync(ICONS_DIR, { recursive: true });

  const sizes = [...new Set([...ICO_SIZES, ...PNG_SIZES])];
  const rendered = new Map();

  await Promise.all(
    sizes.map(async (size) => {
      const active = size <= COMPACT_SIZE ? compactSource : source;
      rendered.set(size, await composeIcon(active, size));
    }),
  );

  PNG_SIZES.forEach((size) => {
    fs.writeFileSync(
      path.join(ICONS_DIR, `${size}x${size}.png`),
      rendered.get(size),
    );
  });

  fs.writeFileSync(
    path.join(ASSETS_DIR, 'icon.png'),
    rendered.get(MASTER_SIZE),
  );

  fs.writeFileSync(
    path.join(ASSETS_DIR, 'icon.ico'),
    await pngToIco(ICO_SIZES.map((size) => rendered.get(size))),
  );

  const icns = png2icons.createICNS(
    rendered.get(MASTER_SIZE),
    png2icons.BICUBIC,
    0,
  );
  if (icns) fs.writeFileSync(path.join(ASSETS_DIR, 'icon.icns'), icns);

  console.log(`icon.ico  -> ${ICO_SIZES.join(', ')}`);
  console.log(`icon.icns -> ${MASTER_SIZE}`);
  console.log(`icon.png  -> ${MASTER_SIZE}`);
  console.log(`icons/    -> ${PNG_SIZES.join(', ')}`);
};

generate().catch((error) => {
  console.error(error);
  process.exit(1);
});
