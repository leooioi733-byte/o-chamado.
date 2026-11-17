import * as THREE from 'three';

export interface ProceduralTextureSet {
  fabricColor: THREE.CanvasTexture;
  fabricBump: THREE.CanvasTexture;
  fabricNormal: THREE.CanvasTexture;
  skinColor: THREE.CanvasTexture;
  skinBump: THREE.CanvasTexture;
  hairBump: THREE.CanvasTexture;
  woodColor: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  barkColor: THREE.CanvasTexture;
  barkNormal: THREE.CanvasTexture;
  stoneColor: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  stoneNormal: THREE.CanvasTexture;
  sandColor: THREE.CanvasTexture;
  sandBump: THREE.CanvasTexture;
  sandNormal: THREE.CanvasTexture;
  waterColor: THREE.CanvasTexture;
  waterNormal: THREE.CanvasTexture;
  waterFoam: THREE.CanvasTexture;
  leafColor: THREE.CanvasTexture;
  leafAlpha: THREE.CanvasTexture;
  mistSoft: THREE.CanvasTexture;
  clayBump: THREE.CanvasTexture;
}

let cachedTextures: ProceduralTextureSet | null = null;
let cachedAnisotropy = 4;

// Deterministic fast PRNG so procedural textures are crisp and repeatable
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function toTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = cachedAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

// Convert a grayscale heightfield canvas into a crisp tangent-space Normal Map
function heightCanvasToNormalCanvas(
  heightCanvas: HTMLCanvasElement,
  strength = 2.4
): HTMLCanvasElement {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext('2d')!;
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const [outCanvas, outCtx] = makeCanvas(w);
  const outImg = outCtx.createImageData(w, h);
  const dst = outImg.data;

  const sample = (x: number, y: number): number => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dZ = 1.0;

      const len = Math.hypot(dX, dY, dZ) || 1;
      const nx = -dX / len;
      const ny = -dY / len;
      const nz = dZ / len;

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  outCtx.putImageData(outImg, 0, 0);
  return outCanvas;
}

export function getProceduralTextures(
  maxAnisotropy = 4
): ProceduralTextureSet {
  cachedAnisotropy = Math.min(8, Math.max(1, maxAnisotropy));
  if (cachedTextures) return cachedTextures;

  // 1. Woven 1st-Century Linen & Wool Fabric (Color + Bump + Normal)
  const [fabC, fabCtx] = makeCanvas(512);
  const [fabBC, fabBCtx] = makeCanvas(512);
  const randFab = mulberry32(101);
  fabCtx.fillStyle = '#e5dfd3';
  fabCtx.fillRect(0, 0, 512, 512);
  fabBCtx.fillStyle = '#7a7a7a';
  fabBCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 3) {
    const shade = 216 + Math.floor((randFab() - 0.5) * 32);
    fabCtx.fillStyle = `rgb(${shade},${shade - 4},${shade - 10})`;
    fabCtx.fillRect(0, y, 512, 2);

    const bShade = 112 + Math.floor((randFab() - 0.5) * 60);
    fabBCtx.fillStyle = `rgb(${bShade},${bShade},${bShade})`;
    fabBCtx.fillRect(0, y, 512, 1.8);
  }
  for (let x = 0; x < 512; x += 3) {
    const alpha = 0.22 + randFab() * 0.22;
    fabCtx.fillStyle = `rgba(145,134,118,${alpha})`;
    fabCtx.fillRect(x, 0, 1.6, 512);

    const bAlpha = 0.35 + randFab() * 0.3;
    fabBCtx.fillStyle = `rgba(218,218,218,${bAlpha})`;
    fabBCtx.fillRect(x, 0, 1.6, 512);
  }
  for (let i = 0; i < 900; i++) {
    const sx = randFab() * 512;
    const sy = randFab() * 512;
    const len = 8 + randFab() * 28;
    fabCtx.fillStyle =
      randFab() > 0.5 ? 'rgba(255,248,238,0.18)' : 'rgba(90,78,62,0.16)';
    fabCtx.fillRect(sx, sy, len, 1.5);
  }
  const fabNormC = heightCanvasToNormalCanvas(fabBC, 1.9);

  // 2. Human Skin Micro-Grain
  const [skinC, skinCtx] = makeCanvas(256);
  const [skinBC, skinBCtx] = makeCanvas(256);
  const randSkin = mulberry32(202);
  skinCtx.fillStyle = '#f2e8e0';
  skinCtx.fillRect(0, 0, 256, 256);
  skinBCtx.fillStyle = '#808080';
  skinBCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) {
    const x = randSkin() * 256;
    const y = randSkin() * 256;
    const r = 0.6 + randSkin() * 1.5;
    skinCtx.fillStyle =
      randSkin() > 0.5 ? 'rgba(220,175,152,0.17)' : 'rgba(255,242,232,0.15)';
    skinCtx.beginPath();
    skinCtx.arc(x, y, r, 0, Math.PI * 2);
    skinCtx.fill();

    const bv = Math.floor(106 + randSkin() * 48);
    skinBCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    skinBCtx.fillRect(x, y, 1.5, 1.5);
  }

  // 3. Hair & Beard Strands Bump
  const [hairBC, hairBCtx] = makeCanvas(256);
  const randHair = mulberry32(303);
  hairBCtx.fillStyle = '#787878';
  hairBCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 2) {
    const v = 80 + Math.floor(randHair() * 105);
    hairBCtx.fillStyle = `rgb(${v},${v},${v})`;
    hairBCtx.fillRect(x, 0, 1.4, 256);
  }

  // 4. Weathered Ancient Wood (Plank grain + rings + dark seams)
  const [woodC, woodCtx] = makeCanvas(512);
  const [woodBC, woodBCtx] = makeCanvas(512);
  const randWood = mulberry32(404);
  woodCtx.fillStyle = '#d7cab8';
  woodCtx.fillRect(0, 0, 512, 512);
  woodBCtx.fillStyle = '#808080';
  woodBCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 3) {
    const wave = Math.sin(y * 0.045) * 16;
    const v = 185 + Math.floor((randWood() - 0.5) * 42);
    woodCtx.fillStyle = `rgb(${v},${v - 16},${v - 32})`;
    woodCtx.fillRect(0, y, 512, 2.5);

    const bv = 102 + Math.floor((randWood() - 0.5) * 60 + wave);
    woodBCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    woodBCtx.fillRect(0, y, 512, 2);
  }
  for (let py = 64; py < 512; py += 128) {
    woodCtx.fillStyle = 'rgba(42,26,14,0.55)';
    woodCtx.fillRect(0, py, 512, 3);
    woodBCtx.fillStyle = '#202020';
    woodBCtx.fillRect(0, py, 512, 4);
  }

  // 5. Gnarled Olive & Palm Tree Bark (Color + Normal)
  const [barkC, barkCtx] = makeCanvas(512);
  const [barkBC, barkBCtx] = makeCanvas(512);
  const randBark = mulberry32(455);
  barkCtx.fillStyle = '#a8947b';
  barkCtx.fillRect(0, 0, 512, 512);
  barkBCtx.fillStyle = '#7e7e7e';
  barkBCtx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 4) {
    const ridge = Math.sin(x * 0.14) * 26;
    const v = 138 + Math.floor((randBark() - 0.5) * 46 + ridge * 0.4);
    barkCtx.fillStyle = `rgb(${v},${v - 14},${v - 28})`;
    barkCtx.fillRect(x, 0, 3.2, 512);

    const bv = Math.max(20, Math.min(240, 128 + Math.floor(ridge + (randBark() - 0.5) * 55)));
    barkBCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    barkBCtx.fillRect(x, 0, 3.2, 512);
  }
  for (let i = 0; i < 400; i++) {
    const x = randBark() * 512;
    const y = randBark() * 512;
    barkCtx.fillStyle = 'rgba(46,32,20,0.32)';
    barkCtx.fillRect(x, y, 2.5, 14 + randBark() * 24);
    barkBCtx.fillStyle = '#262626';
    barkBCtx.fillRect(x, y, 2.5, 14 + randBark() * 24);
  }
  const barkNormC = heightCanvasToNormalCanvas(barkBC, 2.8);

  // 6. Sedimentary Limestone & Cliff Rock (Color + Bump + Normal)
  const [stoneC, stoneCtx] = makeCanvas(512);
  const [stoneBC, stoneBCtx] = makeCanvas(512);
  const randStone = mulberry32(505);
  stoneCtx.fillStyle = '#d4c8b4';
  stoneCtx.fillRect(0, 0, 512, 512);
  stoneBCtx.fillStyle = '#808080';
  stoneBCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 14) {
    const shade = 192 + Math.floor((randStone() - 0.5) * 38);
    stoneCtx.fillStyle = `rgba(${shade},${shade - 8},${shade - 18},0.5)`;
    stoneCtx.fillRect(0, y, 512, 8 + randStone() * 10);

    const bs = 110 + Math.floor((randStone() - 0.5) * 52);
    stoneBCtx.fillStyle = `rgb(${bs},${bs},${bs})`;
    stoneBCtx.fillRect(0, y, 512, 7 + randStone() * 8);
  }
  // Rock cracks & mineral pitting
  for (let i = 0; i < 120; i++) {
    const x = randStone() * 512;
    const y = randStone() * 512;
    const w = 18 + randStone() * 64;
    stoneCtx.fillStyle = 'rgba(65,50,36,0.28)';
    stoneCtx.fillRect(x, y, w, 2);
    stoneBCtx.fillStyle = '#2a2a2a';
    stoneBCtx.fillRect(x, y, w, 2);
  }
  for (let i = 0; i < 8500; i++) {
    const x = randStone() * 512;
    const y = randStone() * 512;
    const sz = 1 + randStone() * 3.5;
    const dark = randStone() > 0.45;
    stoneCtx.fillStyle = dark
      ? 'rgba(78,64,48,0.2)'
      : 'rgba(255,246,232,0.16)';
    stoneCtx.fillRect(x, y, sz, sz);

    const bv = dark ? 68 + randStone() * 40 : 148 + randStone() * 52;
    stoneBCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    stoneBCtx.fillRect(x, y, sz, sz);
  }
  const stoneNormC = heightCanvasToNormalCanvas(stoneBC, 2.7);

  // 7. Shore Sand, Pebbles & Valley Soil (Color + Bump + Normal)
  const [sandC, sandCtx] = makeCanvas(512);
  const [sandBC, sandBCtx] = makeCanvas(512);
  const randSand = mulberry32(606);
  sandCtx.fillStyle = '#dfd1ba';
  sandCtx.fillRect(0, 0, 512, 512);
  sandBCtx.fillStyle = '#808080';
  sandBCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 2) {
    const ripple = Math.sin(y * 0.14) * 16;
    const b = Math.floor(128 + ripple);
    sandBCtx.fillStyle = `rgb(${b},${b},${b})`;
    sandBCtx.fillRect(0, y, 512, 2);
  }
  for (let i = 0; i < 11000; i++) {
    const x = randSand() * 512;
    const y = randSand() * 512;
    const r = 0.8 + randSand() * 2.4;
    const dark = randSand() > 0.48;
    sandCtx.fillStyle = dark
      ? 'rgba(110,85,56,0.22)'
      : 'rgba(255,244,224,0.2)';
    sandCtx.fillRect(x, y, r, r);

    const bv = dark ? 86 + randSand() * 32 : 148 + randSand() * 42;
    sandBCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    sandBCtx.fillRect(x, y, r, r);
  }
  const sandNormC = heightCanvasToNormalCanvas(sandBC, 2.2);

  // 8. Procedural Water Stream Color + Caustics, Foam Overlay & Sharp Ripple Normal Map
  const [watC, watCtx] = makeCanvas(512);
  const randWat = mulberry32(656);
  const watGrad = watCtx.createLinearGradient(0, 0, 0, 512);
  watGrad.addColorStop(0, '#123638');
  watGrad.addColorStop(0.24, '#1f5b58');
  watGrad.addColorStop(0.5, '#2f7a73');
  watGrad.addColorStop(0.76, '#1f5956');
  watGrad.addColorStop(1, '#113436');
  watCtx.fillStyle = watGrad;
  watCtx.fillRect(0, 0, 512, 512);

  // Submerged flow channels & wavy current ribbons
  for (let i = 0; i < 65; i++) {
    const yBase = randWat() * 512;
    const amp = 4 + randWat() * 8;
    const freq = 0.012 + randWat() * 0.018;
    const phase = randWat() * Math.PI * 2;
    watCtx.strokeStyle =
      i % 3 === 0
        ? 'rgba(10, 32, 34, 0.34)'
        : i % 3 === 1
          ? 'rgba(130, 212, 200, 0.22)'
          : 'rgba(205, 240, 232, 0.16)';
    watCtx.lineWidth = 2 + randWat() * 5;
    watCtx.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const y = yBase + Math.sin(x * freq + phase) * amp;
      if (x === 0) watCtx.moveTo(x, y);
      else watCtx.lineTo(x, y);
    }
    watCtx.stroke();
  }

  // Flowing current streaks & sunlit caustic flecks
  for (let i = 0; i < 620; i++) {
    const x = randWat() * 512;
    const y = randWat() * 512;
    const w = 18 + randWat() * 76;
    const h = 1.4 + randWat() * 3.2;
    const tone = randWat();
    watCtx.fillStyle =
      tone > 0.72
        ? 'rgba(210, 245, 238, 0.26)'
        : tone > 0.42
          ? 'rgba(135, 206, 196, 0.2)'
          : 'rgba(10, 36, 38, 0.28)';
    watCtx.fillRect(x, y, w, h);
  }

  // Dedicated Translucent Caustic Web & Surface Foam Thread Overlay
  const [watFC, watFCtx] = makeCanvas(512);
  const randFoam = mulberry32(677);
  watFCtx.clearRect(0, 0, 512, 512);
  for (let i = 0; i < 88; i++) {
    const y0 = randFoam() * 512;
    const amp = 5 + randFoam() * 9;
    const freq = 0.015 + randFoam() * 0.025;
    const phase = randFoam() * Math.PI * 2;
    watFCtx.strokeStyle =
      i % 2 === 0
        ? 'rgba(232, 248, 244, 0.42)'
        : 'rgba(165, 226, 218, 0.3)';
    watFCtx.lineWidth = 1.2 + randFoam() * 2.4;
    watFCtx.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const y = y0 + Math.sin(x * freq + phase) * amp;
      if (x === 0) watFCtx.moveTo(x, y);
      else watFCtx.lineTo(x, y);
    }
    watFCtx.stroke();
  }
  for (let i = 0; i < 280; i++) {
    const x = randFoam() * 512;
    const y = randFoam() * 512;
    const w = 10 + randFoam() * 44;
    const h = 1 + randFoam() * 2;
    watFCtx.fillStyle = 'rgba(244, 252, 250, 0.34)';
    watFCtx.fillRect(x, y, w, h);
  }

  // Sharp multi-frequency ripple normal map for sparkling water highlights
  const [watNC, watNCtx] = makeCanvas(256);
  const imgData = watNCtx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const u = (x / 256) * Math.PI * 4;
      const v = (y / 256) * Math.PI * 4;
      const dx =
        Math.cos(u * 2 + v) * 0.62 +
        Math.cos(u * 3 - v * 2) * 0.44 +
        Math.sin(u * 6 + v * 4) * 0.24;
      const dy =
        Math.sin(v * 2 + u) * 0.62 +
        Math.sin(v * 3 + u * 2) * 0.44 +
        Math.cos(v * 6 - u * 4) * 0.24;
      const len = Math.hypot(dx, dy, 1.0) || 1;
      const idx = (y * 256 + x) * 4;
      imgData.data[idx] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      imgData.data[idx + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      imgData.data[idx + 2] = Math.round(((1.0 / len) * 0.5 + 0.5) * 255);
      imgData.data[idx + 3] = 255;
    }
  }
  watNCtx.putImageData(imgData, 0, 0);

  // 9. Realistic Olive Foliage Leaf Cluster (Color + Alpha Cutout)
  const [leafC, leafCtx] = makeCanvas(256);
  const [leafAC, leafACtx] = makeCanvas(256);
  const randLeaf = mulberry32(688);
  leafCtx.fillStyle = '#3f491a';
  leafCtx.fillRect(0, 0, 256, 256);
  leafACtx.fillStyle = '#000000';
  leafACtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 110; i++) {
    const cx = 36 + randLeaf() * 184;
    const cy = 36 + randLeaf() * 184;
    const angle = randLeaf() * Math.PI * 2;
    const rx = 14 + randLeaf() * 16;
    const ry = 4.5 + randLeaf() * 4.5;
    const distFromCenter = Math.hypot(cx - 128, cy - 128);
    if (distFromCenter > 98) continue;

    leafCtx.save();
    leafCtx.translate(cx, cy);
    leafCtx.rotate(angle);
    const tone = randLeaf();
    leafCtx.fillStyle =
      tone > 0.66 ? '#6b7532' : tone > 0.33 ? '#4d5822' : '#384116';
    leafCtx.beginPath();
    leafCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    leafCtx.fill();
    leafCtx.restore();

    leafACtx.save();
    leafACtx.translate(cx, cy);
    leafACtx.rotate(angle);
    leafACtx.fillStyle = '#ffffff';
    leafACtx.beginPath();
    leafACtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    leafACtx.fill();
    leafACtx.restore();
  }

  // 10. Soft Volumetric Mist Puff Texture
  const [mistC, mistCtx] = makeCanvas(256);
  mistCtx.clearRect(0, 0, 256, 256);
  const mistGrad = mistCtx.createRadialGradient(128, 128, 10, 128, 128, 122);
  mistGrad.addColorStop(0, 'rgba(218, 202, 184, 0.72)');
  mistGrad.addColorStop(0.45, 'rgba(186, 170, 152, 0.36)');
  mistGrad.addColorStop(1, 'rgba(160, 146, 130, 0.0)');
  mistCtx.fillStyle = mistGrad;
  mistCtx.fillRect(0, 0, 256, 256);

  // 11. Terracotta Clay, Foliage Micro-Detail & Bread Crust Bump
  const [clayBC, clayBCtx] = makeCanvas(256);
  const randClay = mulberry32(707);
  clayBCtx.fillStyle = '#808080';
  clayBCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const x = randClay() * 256;
    const y = randClay() * 256;
    const v = 80 + Math.floor(randClay() * 98);
    clayBCtx.fillStyle = `rgb(${v},${v},${v})`;
    clayBCtx.fillRect(x, y, 2, 2);
  }

  cachedTextures = {
    fabricColor: toTexture(fabC, true, 2, 2),
    fabricBump: toTexture(fabBC, false, 2, 2),
    fabricNormal: toTexture(fabNormC, false, 2, 2),
    skinColor: toTexture(skinC, true, 1, 1),
    skinBump: toTexture(skinBC, false, 1, 1),
    hairBump: toTexture(hairBC, false, 2, 2),
    woodColor: toTexture(woodC, true, 2, 2),
    woodBump: toTexture(woodBC, false, 2, 2),
    barkColor: toTexture(barkC, true, 2, 3),
    barkNormal: toTexture(barkNormC, false, 2, 3),
    stoneColor: toTexture(stoneC, true, 3, 3),
    stoneBump: toTexture(stoneBC, false, 3, 3),
    stoneNormal: toTexture(stoneNormC, false, 3, 3),
    sandColor: toTexture(sandC, true, 6, 6),
    sandBump: toTexture(sandBC, false, 6, 6),
    sandNormal: toTexture(sandNormC, false, 6, 6),
    waterColor: toTexture(watC, true, 5, 2),
    waterNormal: toTexture(watNC, false, 12, 5),
    waterFoam: toTexture(watFC, true, 6, 2),
    leafColor: toTexture(leafC, true, 1, 1),
    leafAlpha: toTexture(leafAC, false, 1, 1),
    mistSoft: toTexture(mistC, true, 1, 1),
    clayBump: toTexture(clayBC, false, 2, 2),
  };

  return cachedTextures;
}
