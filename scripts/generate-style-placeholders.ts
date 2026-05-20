/**
 * Generate placeholder JPGs for the wedding-styles picker.
 *
 *   npx tsx scripts/generate-style-placeholders.ts
 *
 * Writes /public/images/wedding-styles/<slug>.jpg per the README at
 * that path. Each placeholder is a 1200×675 gradient using the
 * matching theme's accent + soft + page colours, with the style
 * name + descriptor centred. Replace any file with a real
 * reference screenshot whenever you have one.
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { getThemeTokens } from "../src/lib/wedding-themes";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "public", "images", "wedding-styles");

type Style = {
  slug:       string;   /* filename without extension */
  themeId:    string;   /* maps into getThemeTokens for colours */
  name:       string;
  descriptor: string;
  attribution: string;  /* shown as tiny watermark */
};

const STYLES: Style[] = [
  { slug: "editorial",     themeId: "editorial",    name: "Editorial",        descriptor: "Bold typography, collage photos",   attribution: "ref. KC Events"     },
  { slug: "minimal-blush", themeId: "minimal",      name: "Minimal Romantic", descriptor: "Clean, soft, timeless",             attribution: "ref. Tanya & Josh"  },
  { slug: "terracotta",    themeId: "terracotta",   name: "Warm Terracotta",  descriptor: "Earthy tones, rustic warmth",       attribution: "ref. Abigail & Rick"},
  { slug: "retro-charm",   themeId: "retro",        name: "Retro Charm",      descriptor: "Playful, vintage, personality",     attribution: "ref. Camille & Rowan"},
  { slug: "bold-garden",   themeId: "bold-garden",  name: "Bold & Colourful", descriptor: "Vibrant, editorial, modern",        attribution: "ref. Giardino"      },
  { slug: "frosted-glass", themeId: "frosted",      name: "Frosted Glass",    descriptor: "Elegant, moody, dramatic",          attribution: "ref. J.O. Sullivan" },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function generate(style: Style): Promise<void> {
  const tokens = getThemeTokens(style.themeId);
  const W = 1200;
  const H = 675;

  /* SVG with gradient + centred type. Sharp renders SVG to JPG via
   * the librsvg backend baked into the prebuilt binary. */
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${tokens.accent}" />
      <stop offset="55%"  stop-color="${tokens.accentSoft}" />
      <stop offset="100%" stop-color="${tokens.pageBg}" />
    </linearGradient>
    <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="rgba(0,0,0,0)" />
      <stop offset="100%" stop-color="rgba(0,0,0,0.18)" />
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <rect width="${W}" height="${H}" fill="url(#vignette)" />

  <!-- Hairline accent strip across the top -->
  <rect x="0" y="0" width="${W}" height="6" fill="${tokens.ink}" opacity="0.35" />

  <!-- Centred type -->
  <text x="${W / 2}" y="${H / 2 - 18}"
        text-anchor="middle"
        font-family="${escapeXml(tokens.fontDisplay)}"
        font-size="84"
        font-style="${tokens.displayItalic}"
        fill="${tokens.accentInk}"
        opacity="0.95">${escapeXml(style.name)}</text>

  <text x="${W / 2}" y="${H / 2 + 38}"
        text-anchor="middle"
        font-family="${escapeXml(tokens.fontBody)}"
        font-size="22"
        letter-spacing="6"
        fill="${tokens.accentInk}"
        opacity="0.78">${escapeXml(style.descriptor.toUpperCase())}</text>

  <!-- Attribution watermark, bottom-left -->
  <text x="32" y="${H - 28}"
        font-family="${escapeXml(tokens.fontBody)}"
        font-size="14"
        letter-spacing="3"
        fill="${tokens.accentInk}"
        opacity="0.5">${escapeXml(style.attribution.toUpperCase())}</text>

  <!-- "PLACEHOLDER" watermark, bottom-right -->
  <text x="${W - 32}" y="${H - 28}"
        text-anchor="end"
        font-family="${escapeXml(tokens.fontBody)}"
        font-size="14"
        letter-spacing="3"
        fill="${tokens.accentInk}"
        opacity="0.5">PLACEHOLDER</text>
</svg>`;

  const buffer = Buffer.from(svg, "utf8");
  const outPath = join(OUT_DIR, `${style.slug}.jpg`);

  await sharp(buffer, { density: 144 })
    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
    .toFile(outPath);

  console.log(`  ✓ ${style.slug}.jpg (${style.name})`);
}

async function main() {
  console.log("[gen] generating wedding-style placeholder JPGs…");
  await mkdir(OUT_DIR, { recursive: true });

  for (const s of STYLES) {
    await generate(s);
  }

  console.log(`[gen] done — ${STYLES.length} placeholders in /public/images/wedding-styles/`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[gen] failed:", err);
  process.exit(1);
});
