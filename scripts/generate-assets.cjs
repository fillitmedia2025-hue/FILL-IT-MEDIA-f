const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.resolve(__dirname, '..', 'client', 'public', 'manus-storage');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// CRC32 table
const crcTable = [];
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, pixelShader) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 2; // RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const rowLen = 1 + width * 3;
  const raw = Buffer.alloc(height * rowLen);
  
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0; // Filter: None
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const [r, g, b] = pixelShader(u, v, x, y, width, height);
      const idx = y * rowLen + 1 + x * 3;
      raw[idx] = Math.max(0, Math.min(255, Math.round(r)));
      raw[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      raw[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
    }
  }
  
  const idatData = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
function blend(c1, c2, t) {
  return [
    lerp(c1[0], c2[0], t),
    lerp(c1[1], c2[1], t),
    lerp(c1[2], c2[2], t),
  ];
}

const BRAND_AMBER = [245, 168, 0];
const BRAND_YELLOW = [255, 204, 0];
const BRAND_DARK = [18, 18, 20];
const BRAND_PAPER = [248, 247, 244];
const BRAND_WARM_GRAY = [238, 235, 228];
const BRAND_ORANGE = [255, 107, 0];

// 1. Logo / Favicon (128x128)
const logoBuffer = encodePng(128, 128, (u, v, x, y, w, h) => {
  const cx = x - 64;
  const cy = y - 64;
  const border = Math.max(Math.abs(cx), Math.abs(cy));
  
  if (border > 56) return [0, 0, 0];
  
  let col = blend([24, 24, 28], [12, 12, 14], v);
  
  const d1 = (x * 0.7 - y + 10);
  if (Math.abs(d1) < 14 && y > 35 && y < 92 && x > 30 && x < 75) {
    col = [250, 250, 250];
  }
  
  const d2 = (x * 0.7 - y + 26);
  if (Math.abs(d2) < 14 && y > 35 && y < 92 && x > 55 && x < 100) {
    col = BRAND_AMBER;
  }
  
  const dotDist = Math.sqrt((x - 88) * (x - 88) + (y - 38) * (y - 38));
  if (dotDist < 6) {
    col = BRAND_ORANGE;
  }
  
  return col;
});
fs.writeFileSync(path.join(OUT_DIR, 'logo_265052a1.png'), logoBuffer);
fs.writeFileSync(path.resolve(__dirname, '..', 'client', 'public', 'favicon.ico'), logoBuffer);
fs.writeFileSync(path.resolve(__dirname, '..', 'client', 'public', 'favicon.png'), logoBuffer);

// 2. Hero Background (1200x675)
const heroBuffer = encodePng(1200, 675, (u, v, x, y, w, h) => {
  let col = blend(BRAND_PAPER, BRAND_WARM_GRAY, v * 0.8);
  
  const glowDist = Math.sqrt((u - 0.8) * (u - 0.8) + (v - 0.3) * (v - 0.3));
  if (glowDist < 0.9) {
    const intensity = Math.pow(1 - glowDist / 0.9, 1.8) * 0.45;
    col = blend(col, BRAND_AMBER, intensity);
  }
  
  const glow2 = Math.sqrt((u - 0.9) * (u - 0.9) + (v - 0.8) * (v - 0.8));
  if (glow2 < 0.7) {
    const intensity2 = Math.pow(1 - glow2 / 0.7, 2) * 0.25;
    col = blend(col, BRAND_ORANGE, intensity2);
  }
  
  if (x % 60 === 0 || y % 60 === 0) {
    col = blend(col, [210, 205, 195], 0.35);
  }
  
  if (x > 750 && x < 1120 && y > 150 && y < 550) {
    if (x === 751 || x === 1119 || y === 151 || y === 549) {
      col = blend(col, BRAND_AMBER, 0.6);
    } else if (x > 755 && x < 1115 && y > 155 && y < 545) {
      col = blend(col, [255, 255, 255], 0.7);
      if (y > 170 && y < 185 && x > 780 && x < 900) {
        col = BRAND_AMBER;
      }
    }
  }
  
  return col;
});
fs.writeFileSync(path.join(OUT_DIR, 'hero-light_6c87f210.png'), heroBuffer);
fs.writeFileSync(path.join(OUT_DIR, 'hero-light_a9147d12.png'), heroBuffer);

// 3. Brand Growth Graphic (1000x600)
const brandGrowthBuffer = encodePng(1000, 600, (u, v, x, y, w, h) => {
  let col = blend([252, 251, 248], [240, 237, 230], v);
  
  const cx = 0.5 * w;
  const cy = 0.5 * h;
  const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
  
  for (let r = 80; r <= 280; r += 60) {
    if (Math.abs(dist - r) < 2) {
      col = blend(col, BRAND_AMBER, 0.5);
    }
  }
  
  const curveY = cy + Math.sin(u * Math.PI) * -120 + (0.5 - u) * 80;
  if (Math.abs(y - curveY) < 4) {
    col = BRAND_AMBER;
  }
  
  const nodes = [0.2, 0.4, 0.6, 0.8];
  for (let i = 0; i < nodes.length; i++) {
    const nx = nodes[i] * w;
    const ny = cy + Math.sin(nodes[i] * Math.PI) * -120 + (0.5 - nodes[i]) * 80;
    const nd = Math.sqrt((x - nx) * (x - nx) + (y - ny) * (y - ny));
    if (nd < 18) {
      col = BRAND_DARK;
    }
    if (nd < 10) {
      col = BRAND_YELLOW;
    }
  }
  
  return col;
});
fs.writeFileSync(path.join(OUT_DIR, 'images.jpg'), brandGrowthBuffer);

// 4. Works Collage (1000x600)
const worksCollageBuffer = encodePng(1000, 600, (u, v, x, y, w, h) => {
  let col = blend([245, 244, 240], [230, 227, 220], (u + v) * 0.5);
  
  const colIdx = Math.floor(u * 3);
  const rowIdx = Math.floor(v * 2);
  const cardPadX = (u * 3) % 1;
  const cardPadY = (v * 2) % 1;
  
  if (cardPadX > 0.08 && cardPadX < 0.92 && cardPadY > 0.12 && cardPadY < 0.88) {
    const cardBase = (colIdx + rowIdx) % 2 === 0 ? [28, 28, 32] : [255, 255, 255];
    col = cardBase;
    
    if (cardPadY > 0.15 && cardPadY < 0.22 && cardPadX > 0.15 && cardPadX < 0.6) {
      col = BRAND_AMBER;
    }
    
    if (cardPadX > 0.7 && cardPadY > 0.65 && cardPadX < 0.85 && cardPadY < 0.8) {
      col = BRAND_ORANGE;
    }
  }
  
  return col;
});
fs.writeFileSync(path.join(OUT_DIR, 'works-collage-light.png'), worksCollageBuffer);

// 5. Final CTA Light (1200x600)
const ctaBuffer = encodePng(1200, 600, (u, v, x, y, w, h) => {
  let col = blend([16, 16, 20], [30, 28, 24], v);
  
  const dist = Math.sqrt((u - 0.5) * (u - 0.5) + (v - 0.5) * (v - 0.5));
  if (dist < 0.8) {
    const intensity = Math.pow(1 - dist / 0.8, 2) * 0.35;
    col = blend(col, BRAND_AMBER, intensity);
  }
  
  if (x < 6 || x > w - 6 || y < 6 || y > h - 6) {
    col = blend(col, BRAND_AMBER, 0.4);
  }
  
  return col;
});
fs.writeFileSync(path.join(OUT_DIR, 'final-cta-light_8bc858d3.png'), ctaBuffer);

// 6. Services Pillars (4 files, 800x500)
const pillarConfigs = [
  { name: 'creative-media_f22ccb36.webp', accent: BRAND_AMBER, base: [22, 22, 26] },
  { name: 'branding-marketing_ceadad08.webp', accent: BRAND_ORANGE, base: [24, 20, 26] },
  { name: 'media-management_a8620c66.webp', accent: [240, 180, 20], base: [18, 24, 28] },
  { name: 'images.jpg', accent: [255, 140, 0], base: [20, 22, 32] },
];

for (const cfg of pillarConfigs) {
  const buf = encodePng(800, 500, (u, v, x, y, w, h) => {
    let col = blend(cfg.base, [36, 36, 44], v);
    
    const trDist = Math.sqrt((u - 1) * (u - 1) + v * v);
    if (trDist < 0.7) {
      col = blend(col, cfg.accent, Math.pow(1 - trDist / 0.7, 2) * 0.5);
    }
    
    const cx = Math.abs(u - 0.5);
    const cy = Math.abs(v - 0.5);
    if (cx < 0.25 && cy < 0.25) {
      if (cx < 0.24 && cy < 0.24) {
        col = blend(col, cfg.base, 0.8);
      } else {
        col = cfg.accent;
      }
    }
    
    const slash = (x - y * 1.2);
    if (Math.abs(slash - 200) < 3 || Math.abs(slash - 230) < 3) {
      col = blend(col, cfg.accent, 0.4);
    }
    
    return col;
  });
  fs.writeFileSync(path.join(OUT_DIR, cfg.name), buf);
}

// 7. Portfolio Works (7 files, 800x500)
const portfolioConfigs = [
  { name: 'portfolio-lifestyle-gateway_0705bbb5.webp', accent: BRAND_AMBER, tone: [24, 24, 28] },
  { name: 'portfolio-motors_900a41c0.webp', accent: [255, 80, 0], tone: [30, 18, 18] },
  { name: 'portfolio-am-retail_a4376f7e.webp', accent: [250, 190, 30], tone: [22, 26, 24] },
  { name: 'portfolio-realestate_23653ff7.webp', accent: [220, 160, 40], tone: [20, 22, 28] },
  { name: 'portfolio-bridal_89d576e2.webp', accent: [255, 120, 80], tone: [32, 20, 26] },
  { name: 'portfolio-events_9f04d2af.webp', accent: [255, 170, 0], tone: [26, 18, 32] },
  { name: 'portfolio-footwear_5c2e928a.webp', accent: [240, 140, 20], tone: [24, 26, 20] },
];

for (const cfg of portfolioConfigs) {
  const buf = encodePng(800, 500, (u, v, x, y, w, h) => {
    let col = blend(cfg.tone, [40, 40, 46], v);
    
    const d = Math.sqrt((u - 0.7) * (u - 0.7) + (v - 0.4) * (v - 0.4));
    if (d < 0.8) {
      col = blend(col, cfg.accent, Math.pow(1 - d / 0.8, 2) * 0.45);
    }
    
    if (x < 3 || x > w - 4 || y < 3 || y > h - 4) {
      col = cfg.accent;
    }
    
    if (x > 40 && x < w - 40 && y > 40 && y < h - 40) {
      if (x === 41 || x === w - 41 || y === 41 || y === h - 41) {
        col = blend(col, cfg.accent, 0.3);
      }
    }
    
    return col;
  });
  fs.writeFileSync(path.join(OUT_DIR, cfg.name), buf);
}

console.log('Successfully generated all 17 brand assets in client/public/manus-storage!');
