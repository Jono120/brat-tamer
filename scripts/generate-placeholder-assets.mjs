/**
 * Generates placeholder source images for `@capacitor/assets` into `assets/`.
 * Replace the outputs with final art (same filenames/sizes), then re-run
 * `npm run assets:generate` to refresh the native icons and splash screens.
 *
 * Uses `sharp`, which ships as a dependency of `@capacitor/assets`.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(outDir, { recursive: true });

const CORAL = "#ff865e";
const CREAM = "#fef9ef";
const DARK = "#1a1b26";
const INK = "#2b2d42";

/** Five-point star centred at (cx, cy) with outer radius r. */
function starPoints(cx, cy, r) {
  const inner = r * 0.475;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : inner;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function logoSvg(size, bg, accent) {
  const c = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  ${bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : ""}
  <circle cx="${c}" cy="${c}" r="${size * 0.33}" fill="${accent}"/>
  <polygon points="${starPoints(c, c * 1.02, size * 0.22)}" fill="${CREAM}" stroke="${INK}" stroke-width="${size * 0.012}" stroke-linejoin="round"/>
</svg>`;
}

async function render(svg, file) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, file));
  console.log(`wrote assets/${file}`);
}

// Icon sources (1024x1024): full-bleed icon, plus adaptive-icon layers for Android.
await render(logoSvg(1024, CORAL, CORAL), "icon-only.png");
await render(logoSvg(1024, null, CORAL), "icon-foreground.png");
await render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${CORAL}"/></svg>`,
  "icon-background.png",
);

// Splash sources (2732x2732), light and dark.
await render(logoSvg(2732, CREAM, CORAL), "splash.png");
await render(logoSvg(2732, DARK, CORAL), "splash-dark.png");
