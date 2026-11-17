import * as THREE from 'three';
import {
  animateCharacterPose,
  buildBakedCrowdGeometry,
  buildCompanionNpc,
  buildLowPolyDisciple,
  LowPolyCharacterRig,
} from './lowPolyCharacter';
import { getProceduralTextures } from './proceduralTextures';
import {
  buildAtmosphericSkyDome,
  buildEndlessHorizonMist,
} from './skyDome';
import { CharacterConfig } from '../types/game';

export type CutsceneCameraMode = 'auto' | 'aerea' | 'discipulo' | 'margem';

export interface FollowGameplayResult {
  distanceToJesus: number;
  reachedJesus: boolean;
}

export interface JordanCutsceneHandle {
  root: THREE.Group;
  update: (
    beatIndex: number,
    beatProgress: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
    cameraMode?: CutsceneCameraMode
  ) => void;
  resetFollowGameplay: () => void;
  updateFollowGameplay: (
    moveForward: number,
    moveRight: number,
    dt: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera
  ) => FollowGameplayResult;
}

interface ObstacleCircle {
  x: number;
  z: number;
  r: number;
}

const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();

// Zigzag canyon path descending the northern cliffs to the river shore
const ZIGZAG_PATH_XZ: [number, number, number][] = [
  [-0.8, 6.2, -16.8],
  [-2.15, 5.05, -14.2],
  [1.75, 3.85, -11.9],
  [-1.65, 2.65, -9.6],
  [1.1, 1.45, -7.4],
  [-0.35, 0.22, -4.95],
];

// Walkable stone ramp descending from the SE rocky terrace (10.0, 5.4) onto meadow (6.2, 6.2)
const TERRACE_RAMP_START: [number, number, number] = [10.0, 1.65, 5.4];
const TERRACE_RAMP_END: [number, number, number] = [6.2, 0.24, 6.2];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function riverCenterZ(x: number): number {
  return -1.4 + Math.sin(x * 0.095) * 0.52;
}

function distToSegment2D(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): { dist: number; t: number } {
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz || 1e-6;
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * vx + (pz - az) * vz) / lenSq)
  );
  const cx = ax + vx * t;
  const cz = az + vz * t;
  return { dist: Math.hypot(px - cx, pz - cz), t };
}

function closestZigzagInfo(
  x: number,
  z: number
): { dist: number; height: number } {
  let bestDist = Infinity;
  let bestH = 6.2;
  for (let i = 0; i < ZIGZAG_PATH_XZ.length - 1; i++) {
    const a = ZIGZAG_PATH_XZ[i];
    const b = ZIGZAG_PATH_XZ[i + 1];
    const res = distToSegment2D(x, z, a[0], a[2], b[0], b[2]);
    if (res.dist < bestDist) {
      bestDist = res.dist;
      bestH = THREE.MathUtils.lerp(a[1], b[1], res.t);
    }
  }
  return { dist: bestDist, height: bestH };
}

// Continuous physical heightfield shared by terrain mesh, props, cutscene, and gameplay
export function terrainHeightAt(x: number, z: number): number {
  const rZ = riverCenterZ(x);
  const dzRiver = z - rZ;

  let h = 0.24 + Math.sin(x * 0.22) * Math.cos(z * 0.2) * 0.08;

  // Riverbed channel (water surface is y = 0.0)
  const riverMask = 1 - smoothstep(1.3, 3.2, Math.abs(dzRiver));
  h = THREE.MathUtils.lerp(h, -0.58, riverMask);

  // Flat sandy plaza for SW crowd & tents
  const distPlaza = Math.hypot((x + 10.2) / 1.25, z - 6.3);
  const plazaFlat = 1 - smoothstep(4.6, 6.8, distPlaza);
  h = THREE.MathUtils.lerp(h, 0.24, plazaFlat);

  // SE Raised Rocky Terrace
  const distTerrace = Math.hypot((x - 13.0) / 1.15, (z - 5.0) / 0.92);
  const terraceFactor = 1 - smoothstep(4.2, 6.0, distTerrace);
  let terraceH = 1.65;
  const distOutcrop = Math.hypot((x - 14.0) / 1.4, (z - 2.7) / 1.0);
  terraceH += (1 - smoothstep(1.2, 2.2, distOutcrop)) * 0.72;
  h = Math.max(h, THREE.MathUtils.lerp(0.24, terraceH, terraceFactor));

  // Carved walkable stone stair ramp from terrace to meadow
  const rampInfo = distToSegment2D(
    x,
    z,
    TERRACE_RAMP_START[0],
    TERRACE_RAMP_START[2],
    TERRACE_RAMP_END[0],
    TERRACE_RAMP_END[2]
  );
  if (rampInfo.dist < 2.2) {
    const rampTargetH = THREE.MathUtils.lerp(
      TERRACE_RAMP_START[1],
      TERRACE_RAMP_END[1],
      rampInfo.t
    );
    const blend = 1 - smoothstep(1.05, 2.2, rampInfo.dist);
    h = THREE.MathUtils.lerp(h, rampTargetH, blend);
  }

  // Northern Cliff Massifs + carved zigzag gorge path
  if (z < rZ - 2.4) {
    const cliffRise = smoothstep(rZ - 2.6, rZ - 9.8, z);
    const ridgeRoughness =
      Math.sin(x * 0.45) * 0.28 + Math.cos(x * 0.95 + z * 0.5) * 0.18;
    let northH = 0.24 + cliffRise * 6.0 + cliffRise * ridgeRoughness;

    const zig = closestZigzagInfo(x, z);
    if (zig.dist < 3.1) {
      const trailBlend = 1 - smoothstep(1.25, 3.1, zig.dist);
      northH = THREE.MathUtils.lerp(northH, zig.height, trailBlend);
    }
    h = Math.max(h, northH);
  }

  if (z > 14.0) {
    const southRise = smoothstep(14.0, 20.5, z);
    h += southRise * (1.2 + Math.sin(x * 0.35) * 0.45);
  }

  return h;
}

// Physical collision push-out + bounds clamp + heightfield grounding
function resolveGroundedPosition(
  targetX: number,
  targetZ: number,
  obstacles: ObstacleCircle[],
  actorRadius = 0.38,
  keepOnSouthShore = false
): { x: number; y: number; z: number } {
  let nx = THREE.MathUtils.clamp(targetX, -22, 19);
  let nz = THREE.MathUtils.clamp(targetZ, -18, 15.5);

  // Prevent walking into deep river water or steep terrace drop-off during South-shore gameplay
  if (keepOnSouthShore) {
    const minSouthZ = riverCenterZ(nx) + 2.75;
    if (nz < minSouthZ) nz = minSouthZ;
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      const dx = nx - ob.x;
      const dz = nz - ob.z;
      const minD = ob.r + actorRadius;
      const d = Math.hypot(dx, dz);
      if (d < minD) {
        const push = d > 1e-4 ? (minD - d) / d : minD;
        if (d > 1e-4) {
          nx += dx * push;
          nz += dz * push;
        } else {
          nx += minD;
        }
      }
    }
  }

  return { x: nx, y: terrainHeightAt(nx, nz), z: nz };
}

function placeGroundedActor(
  rig: LowPolyCharacterRig,
  targetX: number,
  targetZ: number,
  obstacles: ObstacleCircle[],
  actorRadius = 0.36
): void {
  const res = resolveGroundedPosition(targetX, targetZ, obstacles, actorRadius);
  rig.group.position.set(res.x, res.y, res.z);
}

function samplePolylineXZ(
  points: [number, number, number][],
  t: number
): { x: number; z: number; yaw: number } {
  const clamped = Math.max(0, Math.min(1, t));
  const segCount = points.length - 1;
  const scaled = clamped * segCount;
  const idx = Math.min(segCount - 1, Math.floor(scaled));
  const localT = scaled - idx;
  const p0 = points[idx];
  const p1 = points[idx + 1];
  return {
    x: THREE.MathUtils.lerp(p0[0], p1[0], localT),
    z: THREE.MathUtils.lerp(p0[2], p1[2], localT),
    yaw: Math.atan2(p1[0] - p0[0], p1[2] - p0[2]),
  };
}

function buildSculptedBoulder(
  radius: number,
  seed: number,
  mat: THREE.Material
): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(radius, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const n =
      1 +
      0.18 * Math.sin(vx * 3.1 + seed) +
      0.14 * Math.cos(vz * 2.7 - seed * 1.3);
    pos.setXYZ(i, vx * n, vy * 0.72 * n, vz * n);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildLowPolyDove(): THREE.Group {
  const tex = getProceduralTextures();
  const dove = new THREE.Group();

  const featherMat = new THREE.MeshStandardMaterial({
    color: 0xfcf9f2,
    map: tex.fabricColor,
    bumpMap: tex.fabricBump,
    bumpScale: 0.008,
    emissive: 0xffe5ae,
    emissiveIntensity: 0.42,
    roughness: 0.42,
    metalness: 0.02,
  });

  const wingTipMat = new THREE.MeshStandardMaterial({
    color: 0xf4efe4,
    bumpMap: tex.fabricBump,
    bumpScale: 0.01,
    emissive: 0xffe09c,
    emissiveIntensity: 0.3,
    roughness: 0.5,
  });

  const beakMat = new THREE.MeshStandardMaterial({
    color: 0xd9a76a,
    roughness: 0.45,
  });

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x1b1612,
    roughness: 0.2,
  });

  // 1. Sculpted Anatomical Torso & Breast (LatheGeometry rotated along +Z flight axis)
  const bodyPoints = [
    new THREE.Vector2(0.0, -0.22),
    new THREE.Vector2(0.045, -0.14),
    new THREE.Vector2(0.095, -0.02),
    new THREE.Vector2(0.112, 0.09),
    new THREE.Vector2(0.088, 0.17),
    new THREE.Vector2(0.048, 0.23),
    new THREE.Vector2(0.0, 0.25),
  ];
  const bodyGeo = new THREE.LatheGeometry(bodyPoints, 10);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, featherMat);
  body.scale.set(0.95, 0.88, 1.0);
  body.castShadow = true;
  dove.add(body);

  // 2. Arched Neck, Sculpted Head, Delicate Beak & Eyes
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.046, 0.068, 0.11, 8),
    featherMat
  );
  neck.position.set(0, 0.065, 0.19);
  neck.rotation.x = -0.45;
  dove.add(neck);

  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.064, 1),
    featherMat
  );
  head.position.set(0, 0.115, 0.245);
  head.scale.set(0.9, 0.96, 1.08);
  dove.add(head);

  const beak = new THREE.Mesh(
    new THREE.ConeGeometry(0.016, 0.055, 5),
    beakMat
  );
  beak.rotation.x = Math.PI / 2 + 0.1;
  beak.position.set(0, 0.105, 0.32);
  dove.add(beak);

  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), eyeMat);
    eye.position.set(side * 0.045, 0.125, 0.27);
    dove.add(eye);
  });

  // 3. Fanned Tail Feathers (5 layered splayed blades)
  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, 0.015, -0.2);
  const tailBladeGeo = new THREE.BoxGeometry(0.048, 0.01, 0.24);
  for (let i = -2; i <= 2; i++) {
    const blade = new THREE.Mesh(tailBladeGeo, wingTipMat);
    blade.position.set(i * 0.032, Math.abs(i) * 0.006, -0.1);
    blade.rotation.y = -i * 0.18;
    blade.rotation.x = 0.08;
    tailGroup.add(blade);
  }
  dove.add(tailGroup);

  // 4. Two-Joint Articulated Wings with Coverts & Splayed Primary Flight Feathers
  const buildWing = (
    side: -1 | 1
  ): { innerPivot: THREE.Group; outerPivot: THREE.Group } => {
    const innerPivot = new THREE.Group();
    innerPivot.position.set(side * 0.085, 0.055, 0.05);

    const innerCovert = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.022, 0.17),
      featherMat
    );
    innerCovert.position.set(side * 0.12, 0, -0.02);
    innerCovert.rotation.y = side * -0.14;
    innerPivot.add(innerCovert);

    // Secondary trailing feathers along inner wing
    for (let s = 0; s < 3; s++) {
      const secFeather = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 0.009, 0.16),
        wingTipMat
      );
      secFeather.position.set(side * (0.06 + s * 0.072), -0.004, -0.11);
      secFeather.rotation.y = side * -0.1;
      innerPivot.add(secFeather);
    }

    const outerPivot = new THREE.Group();
    outerPivot.position.set(side * 0.23, 0.005, 0.01);
    innerPivot.add(outerPivot);

    const outerArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.016, 0.11),
      featherMat
    );
    outerArm.position.set(side * 0.11, 0, -0.02);
    outerArm.rotation.y = side * 0.18;
    outerPivot.add(outerArm);

    // 5 fanned primary flight feathers at wingtip
    for (let p = 0; p < 5; p++) {
      const len = 0.19 - p * 0.016;
      const pri = new THREE.Mesh(
        new THREE.BoxGeometry(len, 0.008, 0.042),
        wingTipMat
      );
      pri.position.set(
        side * (0.14 + (4 - p) * 0.024),
        -0.002,
        -0.04 - p * 0.028
      );
      pri.rotation.y = side * (0.12 + p * 0.14);
      outerPivot.add(pri);
    }

    return { innerPivot, outerPivot };
  };

  const leftWing = buildWing(-1);
  const rightWing = buildWing(1);
  dove.add(leftWing.innerPivot);
  dove.add(rightWing.innerPivot);

  dove.userData.leftWingInner = leftWing.innerPivot;
  dove.userData.leftWingOuter = leftWing.outerPivot;
  dove.userData.rightWingInner = rightWing.innerPivot;
  dove.userData.rightWingOuter = rightWing.outerPivot;
  dove.userData.tailGroup = tailGroup;
  return dove;
}

// Realistic Mediterranean Olive Tree: curved trunk, 3 diverging main limbs & layered alpha-cutout leaf sprigs
function buildRealisticOliveTree(
  scale: number,
  seed: number,
  trunkMat: THREE.Material,
  foliageCardMat: THREE.Material,
  innerCanopyMat: THREE.Material
): THREE.Group {
  const tree = new THREE.Group();

  // Base root flare + curved main trunk
  const rootBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * scale, 0.38 * scale, 0.55 * scale, 7),
    trunkMat
  );
  rootBase.position.y = 0.25 * scale;
  rootBase.castShadow = true;
  rootBase.receiveShadow = true;
  tree.add(rootBase);

  const mainTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 * scale, 0.23 * scale, 1.15 * scale, 7),
    trunkMat
  );
  mainTrunk.position.set(0.04 * scale, 0.95 * scale, 0);
  mainTrunk.rotation.z = -0.09;
  mainTrunk.castShadow = true;
  mainTrunk.receiveShadow = true;
  tree.add(mainTrunk);

  // Three gnarled diverging limbs supporting the canopy
  const limbs: [number, number, number, number, number][] = [
    [-0.36, 1.55, 0.18, 0.48, 0.22],
    [0.38, 1.6, -0.2, -0.52, -0.2],
    [0.05, 1.72, 0.34, -0.1, -0.45],
  ];
  limbs.forEach(([lx, ly, lz, rz, rx]) => {
    const limb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065 * scale, 0.115 * scale, 0.95 * scale, 6),
      trunkMat
    );
    limb.position.set(lx * scale, ly * scale, lz * scale);
    limb.rotation.set(rx, 0, rz);
    limb.castShadow = true;
    tree.add(limb);
  });

  // Inner dark leaf core for natural depth
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.75 * scale, 1),
    innerCanopyMat
  );
  core.position.set(0, 2.05 * scale, 0);
  core.scale.set(1.25, 0.72, 1.15);
  core.castShadow = true;
  core.receiveShadow = true;
  tree.add(core);

  // 14 intersecting alpha-cutout olive leaf-sprig cards catching light from all angles
  const sprigGeo = new THREE.PlaneGeometry(1.38 * scale, 1.18 * scale);
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2 + seed * 0.7;
    const rad = (0.35 + (i % 3) * 0.3) * scale;
    const height = (1.72 + (i % 4) * 0.24) * scale;
    const sprig = new THREE.Mesh(sprigGeo, foliageCardMat);
    sprig.position.set(Math.cos(ang) * rad, height, Math.sin(ang) * rad);
    sprig.rotation.set(
      -0.45 + (i % 3) * 0.32,
      ang + (i % 2) * 0.8,
      (i % 2 === 0 ? 1 : -1) * 0.35
    );
    sprig.receiveShadow = true;
    tree.add(sprig);
  }

  return tree;
}

// Realistic Curved Date Palm with textured trunk rings and arched multi-segment fronds
function buildRealisticPalmTree(
  trunkMat: THREE.Material,
  frondMat: THREE.Material
): THREE.Group {
  const palm = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11 - i * 0.01, 0.145 - i * 0.01, 0.5, 7),
      trunkMat
    );
    seg.position.set(i * 0.08, 0.25 + i * 0.45, 0);
    seg.rotation.z = -0.11;
    seg.castShadow = true;
    palm.add(seg);
  }
  const crownCenter = new THREE.Vector3(0.45, 2.75, 0);
  for (let a = 0; a < 10; a++) {
    const angle = (a / 10) * Math.PI * 2;
    const frondGroup = new THREE.Group();
    frondGroup.position.copy(crownCenter);
    frondGroup.rotation.y = angle;

    const innerBlade = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 1.05),
      frondMat
    );
    innerBlade.position.set(0.48, 0.1, 0);
    innerBlade.rotation.set(-0.35, 0, -1.25);
    frondGroup.add(innerBlade);

    const outerTip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.92),
      frondMat
    );
    outerTip.position.set(1.18, -0.2, 0);
    outerTip.rotation.set(-0.25, 0, -1.85);
    frondGroup.add(outerTip);

    palm.add(frondGroup);
  }
  return palm;
}

function buildDetailedTent(
  canvasMat: THREE.Material,
  woodMat: THREE.Material,
  clayMat: THREE.Material
): THREE.Group {
  const tent = new THREE.Group();

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(1.85, 2.25, 4),
    canvasMat
  );
  roof.position.y = 1.28;
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.25, 0.85, 1.05);
  roof.castShadow = true;
  roof.receiveShadow = true;
  tent.add(roof);

  const ridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6),
    woodMat
  );
  ridge.rotation.z = Math.PI / 2;
  ridge.position.y = 2.08;
  tent.add(ridge);

  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.92, 1.48),
    new THREE.MeshStandardMaterial({ color: 0x1a130d, roughness: 0.96 })
  );
  inner.position.y = 0.46;
  tent.add(inner);

  const poleGeo = new THREE.CylinderGeometry(0.045, 0.055, 1.2, 6);
  const corners: [number, number][] = [
    [-1.08, -0.92],
    [1.08, -0.92],
    [-1.08, 0.92],
    [1.08, 0.92],
  ];
  corners.forEach(([cx, cz]) => {
    const pole = new THREE.Mesh(poleGeo, woodMat);
    pole.position.set(cx, 0.58, cz);
    pole.castShadow = true;
    tent.add(pole);
  });

  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.46, 0.54), woodMat);
  crate.position.set(1.62, 0.23, 0.45);
  crate.rotation.y = 0.25;
  crate.castShadow = true;
  crate.receiveShadow = true;
  tent.add(crate);

  const jar = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.09, 0),
        new THREE.Vector2(0.18, 0.16),
        new THREE.Vector2(0.14, 0.34),
        new THREE.Vector2(0.08, 0.46),
        new THREE.Vector2(0.11, 0.52),
      ],
      10
    ),
    clayMat
  );
  jar.position.set(1.38, 0, 1.02);
  jar.castShadow = true;
  tent.add(jar);

  return tent;
}

function buildWoodenFence(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  woodMat: THREE.Material
): THREE.Group {
  const fence = new THREE.Group();
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const posts = Math.max(2, Math.round(len / 1.4) + 1);

  for (let i = 0; i < posts; i++) {
    const t = i / (posts - 1);
    const px = x1 + dx * t;
    const pz = z1 + dz * t;
    const py = terrainHeightAt(px, pz);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.068, 0.72, 6),
      woodMat
    );
    post.position.set(px, py + 0.34, pz);
    post.castShadow = true;
    fence.add(post);
  }

  const y1 = terrainHeightAt(x1, z1);
  const y2 = terrainHeightAt(x2, z2);
  const fullLen = Math.hypot(dx, y2 - y1, dz);
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.065, fullLen),
    woodMat
  );
  rail.position.set((x1 + x2) / 2, (y1 + y2) / 2 + 0.5, (z1 + z2) / 2);
  rail.lookAt(x2, y2 + 0.5, z2);
  rail.castShadow = true;
  fence.add(rail);

  return fence;
}

export function buildJordanOpeningCutscene(
  character: CharacterConfig
): JordanCutsceneHandle {
  const tex = getProceduralTextures();
  const root = new THREE.Group();
  const obstacles: ObstacleCircle[] = [];

  // Rich, moody Caravaggio chiaroscuro materials
  const valleyTerrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: tex.sandColor,
    normalMap: tex.sandNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    bumpMap: tex.stoneBump,
    bumpScale: 0.04,
    roughness: 0.93,
    metalness: 0.02,
    flatShading: true,
  });

  const cliffRockMat = new THREE.MeshStandardMaterial({
    color: 0x735136,
    map: tex.stoneColor,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    bumpMap: tex.stoneBump,
    bumpScale: 0.05,
    roughness: 0.94,
    flatShading: true,
  });

  const stoneStepMat = new THREE.MeshStandardMaterial({
    color: 0x916c47,
    map: tex.stoneColor,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.9,
    flatShading: true,
  });

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x452d1a,
    map: tex.barkColor,
    normalMap: tex.barkNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughness: 0.92,
    flatShading: true,
  });

  const woodPropMat = new THREE.MeshStandardMaterial({
    color: 0x523620,
    map: tex.woodColor,
    bumpMap: tex.woodBump,
    bumpScale: 0.032,
    roughness: 0.88,
    flatShading: true,
  });

  const foliageCardMat = new THREE.MeshStandardMaterial({
    color: 0x8d975c,
    map: tex.leafColor,
    alphaMap: tex.leafAlpha,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.86,
  });

  const innerCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x333c15,
    bumpMap: tex.clayBump,
    bumpScale: 0.03,
    roughness: 0.94,
    flatShading: true,
  });

  const canvasTentMat = new THREE.MeshStandardMaterial({
    color: 0xb29a7b,
    map: tex.fabricColor,
    normalMap: tex.fabricNormal,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughness: 0.88,
    flatShading: true,
  });

  const clayMat = new THREE.MeshStandardMaterial({
    color: 0x945838,
    bumpMap: tex.clayBump,
    bumpScale: 0.025,
    roughness: 0.78,
    flatShading: true,
  });

  // 1. Sculpted Valley Terrain (100 x 80 = 16,000 crisp triangles — high detail + fast framerate)
  const terrainW = 64;
  const terrainD = 44;
  const segX = 100;
  const segZ = 80;
  const terrainGeo = new THREE.PlaneGeometry(terrainW, terrainD, segX, segZ);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(0, 0, -2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);

  const colBed = new THREE.Color(0x433526);
  const colSandPath = new THREE.Color(0x9e7444);
  const colMeadow = new THREE.Color(0x635828);
  const colCliff = new THREE.Color(0x5e432e);
  const _tmpCol = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = terrainHeightAt(x, z);
    posAttr.setY(i, y);

    const hx = terrainHeightAt(x + 0.4, z);
    const hz = terrainHeightAt(x, z + 0.4);
    const slope = Math.hypot(hx - y, hz - y) / 0.4;

    const zig = closestZigzagInfo(x, z);
    const ramp = distToSegment2D(
      x,
      z,
      TERRACE_RAMP_START[0],
      TERRACE_RAMP_START[2],
      TERRACE_RAMP_END[0],
      TERRACE_RAMP_END[2]
    );
    const distPlaza = Math.hypot((x + 10.2) / 1.25, z - 6.3);
    const onSeRoad = Math.abs(z - (12.2 - x * 0.25)) < 1.3 && x > 4.0;

    if (y < 0.04) {
      _tmpCol.copy(colBed);
    } else if (
      zig.dist < 1.35 ||
      ramp.dist < 1.2 ||
      distPlaza < 5.6 ||
      onSeRoad
    ) {
      _tmpCol.copy(colSandPath);
    } else if (slope > 0.42 || y > 1.35) {
      _tmpCol.copy(colCliff).lerp(colSandPath, Math.max(0, 0.22 - slope * 0.18));
    } else {
      _tmpCol.copy(colMeadow);
    }

    colors[i * 3] = _tmpCol.r;
    colors[i * 3 + 1] = _tmpCol.g;
    colors[i * 3 + 2] = _tmpCol.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMesh = new THREE.Mesh(terrainGeo, valleyTerrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // 2. Realistic Blue-Sky-Reflecting Custom Refraction + Dual-Normal Flowing River Shader
  const riverGeo = new THREE.PlaneGeometry(66, 7.8, 40, 10);
  riverGeo.rotateX(-Math.PI / 2);
  const skySunDir = new THREE.Vector3(-0.34, 0.22, -0.91).normalize();
  const waterUniforms = {
    uTime: { value: 0 },
    uWaterNormal: { value: tex.waterNormal },
    uWaterFoam: { value: tex.waterFoam },
    uSkyZenith: { value: new THREE.Color(0x1b56a8) },
    uSkyMid: { value: new THREE.Color(0x4c8fd8) },
    uSkyHorizon: { value: new THREE.Color(0x9bc4e8) },
    uSunDir: { value: skySunDir },
    uSunColor: { value: new THREE.Color(0xfff2cc) },
    uBaptismGlow: { value: 0.0 },
  };

  const riverMat = new THREE.MeshPhysicalMaterial({
    color: 0x1c5c7a,
    emissive: 0x092030,
    emissiveIntensity: 0.42,
    map: tex.waterColor,
    normalMap: tex.waterNormal,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughness: 0.05,
    metalness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    reflectivity: 1.0,
    envMapIntensity: 1.9,
    transparent: true,
    opacity: 0.9,
  });

  riverMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.uTime;
    shader.uniforms.uWaterNormal = waterUniforms.uWaterNormal;
    shader.uniforms.uWaterFoam = waterUniforms.uWaterFoam;
    shader.uniforms.uSkyZenith = waterUniforms.uSkyZenith;
    shader.uniforms.uSkyMid = waterUniforms.uSkyMid;
    shader.uniforms.uSkyHorizon = waterUniforms.uSkyHorizon;
    shader.uniforms.uSunDir = waterUniforms.uSunDir;
    shader.uniforms.uSunColor = waterUniforms.uSunColor;
    shader.uniforms.uBaptismGlow = waterUniforms.uBaptismGlow;

    shader.vertexShader =
      `uniform float uTime;
       varying vec2 vWaterUv;
       varying vec3 vWaterWorldPos;\n` +
      shader.vertexShader
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vWaterUv = uv;
           float w1 = sin(position.x * 0.52 - uTime * 1.85) * 0.032;
           float w2 = cos(position.z * 0.92 + uTime * 1.35) * 0.022;
           float w3 = sin((position.x + position.z) * 0.8 - uTime * 2.2) * 0.012;
           transformed.y += w1 + w2 + w3;`
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
           vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
        );

    shader.fragmentShader =
      `uniform float uTime;
       uniform sampler2D uWaterNormal;
       uniform sampler2D uWaterFoam;
       uniform vec3 uSkyZenith;
       uniform vec3 uSkyMid;
       uniform vec3 uSkyHorizon;
       uniform vec3 uSunDir;
       uniform vec3 uSunColor;
       uniform float uBaptismGlow;
       varying vec2 vWaterUv;
       varying vec3 vWaterWorldPos;\n` +
      shader.fragmentShader
        .replace(
          '#include <map_fragment>',
          `vec2 uvNormA = vWaterUv * vec2(12.0, 5.0) + vec2(-uTime * 0.052, uTime * 0.012);
           vec2 uvNormB = vWaterUv * vec2(18.0, 7.5) + vec2(-uTime * 0.084, -uTime * 0.018);
           vec3 nA = texture2D(uWaterNormal, uvNormA).xyz * 2.0 - 1.0;
           vec3 nB = texture2D(uWaterNormal, uvNormB).xyz * 2.0 - 1.0;
           vec2 refractOffset = (nA.xy * 0.62 + nB.xy * 0.38);

           // Snell-style UV refraction distortion bending submerged riverbed & caustics
           vec2 refractedColorUv = vWaterUv * vec2(5.0, 2.0) + vec2(-uTime * 0.03, 0.0) + refractOffset * 0.055;
           vec4 sampledWater = texture2D(map, refractedColorUv);

           // Flowing caustic & foam ribbons refracted through dual wave normals
           vec2 foamUv = vWaterUv * vec2(6.0, 2.0) + vec2(-uTime * 0.058, sin(uTime * 0.35) * 0.014) + refractOffset * 0.072;
           vec4 foamSample = texture2D(uWaterFoam, foamUv);

           // Physical world-space water normal & Fresnel reflection of the blue sky dome
           vec3 worldWaterN = normalize(vec3(refractOffset.x * 0.42, 1.0, refractOffset.y * 0.42));
           vec3 viewVec = normalize(cameraPosition - vWaterWorldPos);
           vec3 reflDir = reflect(-viewVec, worldWaterN);
           float skyElev = clamp(reflDir.y, 0.0, 1.0);
           vec3 skyReflect = mix(uSkyHorizon, uSkyMid, smoothstep(0.0, 0.28, skyElev));
           skyReflect = mix(skyReflect, uSkyZenith, smoothstep(0.22, 0.78, skyElev));

           float sunSheen = pow(max(dot(reflDir, uSunDir), 0.0), 14.0);
           skyReflect += uSunColor * sunSheen * (0.28 + uBaptismGlow * 0.35);

           float fresnel = clamp(0.08 + 0.92 * pow(1.0 - max(dot(viewVec, worldWaterN), 0.0), 3.1), 0.0, 1.0);
           vec3 deepWater = diffuseColor.rgb * sampledWater.rgb * vec3(0.55, 0.82, 0.98);
           float skyBlend = clamp(0.28 + fresnel * 0.64, 0.0, 0.92);
           diffuseColor.rgb = mix(deepWater, skyReflect, skyBlend);
           diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.94, 1.0), foamSample.a * 0.42);`
        )
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
           vec2 flowPerturb = (
             (texture2D(uWaterNormal, vWaterUv * vec2(12.0, 5.0) + vec2(-uTime * 0.052, uTime * 0.012)).xy * 2.0 - 1.0) * 0.6 +
             (texture2D(uWaterNormal, vWaterUv * vec2(18.0, 7.5) + vec2(-uTime * 0.084, -uTime * 0.018)).xy * 2.0 - 1.0) * 0.4
           );
           normal = normalize(normal + vec3(flowPerturb.x * 0.48, flowPerturb.y * 0.48, 0.0));`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           vec2 glintUv = vWaterUv * vec2(6.0, 2.0) + vec2(-uTime * 0.058, 0.0);
           float causticGlow = texture2D(uWaterFoam, glintUv).a;
           vec3 gNormA = texture2D(uWaterNormal, vWaterUv * vec2(12.0, 5.0) + vec2(-uTime * 0.052, uTime * 0.012)).xyz * 2.0 - 1.0;
           vec3 gNormB = texture2D(uWaterNormal, vWaterUv * vec2(18.0, 7.5) + vec2(-uTime * 0.084, -uTime * 0.018)).xyz * 2.0 - 1.0;
           vec3 gN = normalize(vec3((gNormA.x * 0.6 + gNormB.x * 0.4) * 0.42, 1.0, (gNormA.y * 0.6 + gNormB.y * 0.4) * 0.42));
           vec3 gV = normalize(cameraPosition - vWaterWorldPos);
           vec3 gR = reflect(-gV, gN);
           vec3 gSky = mix(uSkyHorizon, uSkyZenith, smoothstep(0.0, 0.65, clamp(gR.y, 0.0, 1.0)));
           float sunGlint = pow(max(dot(gR, uSunDir), 0.0), 180.0);
           totalEmissiveRadiance += gSky * 0.22 + vec3(0.12, 0.3, 0.44) * causticGlow + uSunColor * sunGlint * (0.95 + uBaptismGlow * 0.7);`
        );
  };

  const river = new THREE.Mesh(riverGeo, riverMat);
  river.position.set(0, 0.0, -1.4);
  river.receiveShadow = true;
  root.add(river);

  // Subtle animated foam wake rings around river boulders and standing immersion spots
  const wakeRingGeo = new THREE.RingGeometry(0.45, 0.88, 14);
  wakeRingGeo.rotateX(-Math.PI / 2);
  const wakeRingMat = new THREE.MeshBasicMaterial({
    color: 0xdcedfb,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
  });
  const wakeRings: { mesh: THREE.Mesh; baseScale: number; phase: number }[] = [];
  const wakeCoords: [number, number, number][] = [
    [-7.8, -1.6, 1.05],
    [-3.2, -2.6, 0.72],
    [1.8, -2.0, 0.84],
    [6.5, -1.1, 0.96],
    [-4.5, -1.2, 0.65],
    [-1.2, -1.4, 0.72],
  ];
  wakeCoords.forEach(([wx, wz, sc], idx) => {
    const ring = new THREE.Mesh(wakeRingGeo, wakeRingMat);
    ring.position.set(wx, 0.03, wz);
    ring.scale.setScalar(sc);
    root.add(ring);
    wakeRings.push({ mesh: ring, baseScale: sc, phase: idx * 1.15 });
  });

  // Realistic Clear Morning Blue Sky Dome & Endless Valley Mist covering the distant background
  const valleySky = buildAtmosphericSkyDome({
    zenithColor: 0x1b56a8,
    midColor: 0x4c8fd8,
    horizonColor: 0x9bc4e8,
    sunColor: 0xfff0c8,
    cloudColor: 0xf4f8fc,
    sunDirection: skySunDir,
    sunIntensity: 1.15,
    cloudDensity: 0.52,
  });
  root.add(valleySky.mesh);

  const farValleySkirt = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240, 1, 1),
    new THREE.MeshStandardMaterial({
      color: 0x6f5a44,
      roughness: 0.96,
    })
  );
  farValleySkirt.rotation.x = -Math.PI / 2;
  farValleySkirt.position.set(0, -0.45, 0);
  root.add(farValleySkirt);

  const farValleyMist = buildEndlessHorizonMist(
    tex.mistSoft,
    0xc2dcf2,
    1.15,
    38,
    0.42
  );
  root.add(farValleyMist.group);

  // 3. Multi-Layered Soft Volumetric Mist Blankets across River, Gorge & Banks
  const mistMat = new THREE.MeshBasicMaterial({
    map: tex.mistSoft,
    color: 0xdbe8f5,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const mistLayers: {
    mesh: THREE.Mesh;
    baseX: number;
    speed: number;
    phase: number;
  }[] = [];
  const mistPlacements: [number, number, number, number, number][] = [
    [-16, 0.25, -1.6, 15, 7],
    [-8, 0.32, -1.1, 14, 6.5],
    [0, 0.28, -1.4, 16, 7.5],
    [8, 0.34, -1.2, 14, 6.5],
    [16, 0.26, -1.5, 15, 7],
    [-1, 0.75, -6.2, 13, 6],
    [-11, 0.45, 3.8, 12, 6],
    [5, 0.42, 4.6, 11, 5.5],
    [-18, 0.5, 7.0, 11, 6],
    [13, 1.85, 4.5, 10, 5],
  ];
  mistPlacements.forEach(([mx, my, mz, mw, md], idx) => {
    const mist = new THREE.Mesh(new THREE.PlaneGeometry(mw, md), mistMat);
    mist.rotation.x = -Math.PI / 2;
    mist.position.set(mx, my, mz);
    root.add(mist);
    mistLayers.push({
      mesh: mist,
      baseX: mx,
      speed: 0.16 + (idx % 3) * 0.05,
      phase: idx * 1.1,
    });
  });

  // 4. Physical Carved Stone Steps along Zigzag Gorge & Terrace Stair Ramp
  for (let i = 0; i < ZIGZAG_PATH_XZ.length - 1; i++) {
    const p0 = ZIGZAG_PATH_XZ[i];
    const p1 = ZIGZAG_PATH_XZ[i + 1];
    const yaw = Math.atan2(p1[0] - p0[0], p1[2] - p0[2]);
    for (let s = 0; s < 4; s++) {
      const t = (s + 0.5) / 4;
      const sx = THREE.MathUtils.lerp(p0[0], p1[0], t);
      const sz = THREE.MathUtils.lerp(p0[2], p1[2], t);
      const sy = terrainHeightAt(sx, sz);
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(1.32, 0.14, 0.68),
        stoneStepMat
      );
      slab.position.set(sx, sy - 0.03, sz);
      slab.rotation.y = yaw + (s % 2 === 0 ? 0.08 : -0.08);
      slab.receiveShadow = true;
      root.add(slab);
    }
  }

  const rampYaw = Math.atan2(
    TERRACE_RAMP_END[0] - TERRACE_RAMP_START[0],
    TERRACE_RAMP_END[2] - TERRACE_RAMP_START[2]
  );
  for (let s = 0; s < 6; s++) {
    const t = (s + 0.5) / 6;
    const sx = THREE.MathUtils.lerp(
      TERRACE_RAMP_START[0],
      TERRACE_RAMP_END[0],
      t
    );
    const sz = THREE.MathUtils.lerp(
      TERRACE_RAMP_START[2],
      TERRACE_RAMP_END[2],
      t
    );
    const sy = terrainHeightAt(sx, sz);
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.16, 0.65),
      stoneStepMat
    );
    step.position.set(sx, sy - 0.04, sz);
    step.rotation.y = rampYaw;
    step.receiveShadow = true;
    root.add(step);
  }

  // 5. Terrace Bench & Campfires
  const benchGroup = new THREE.Group();
  const benchY = terrainHeightAt(11.3, 4.9);
  const benchSeat = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.1, 0.48),
    woodPropMat
  );
  benchSeat.position.y = 0.44;
  benchSeat.castShadow = true;
  benchGroup.add(benchSeat);
  [-0.65, 0.65].forEach((bx) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.44, 0.42),
      woodPropMat
    );
    leg.position.set(bx, 0.22, 0);
    leg.castShadow = true;
    benchGroup.add(leg);
  });
  benchGroup.position.set(11.3, benchY, 4.9);
  benchGroup.rotation.y = -0.35;
  root.add(benchGroup);
  obstacles.push({ x: 11.3, z: 4.9, r: 0.75 });

  const fireLights: THREE.PointLight[] = [];
  const fireFlames: THREE.Mesh[] = [];
  const fireCoords: [number, number, number][] = [
    [14.7, 5.3, 1.0],
    [13.6, 6.7, 0.68],
  ];
  fireCoords.forEach(([fx, fz, sc]) => {
    const fy = terrainHeightAt(fx, fz);
    for (let st = 0; st < 8; st++) {
      const a = (st / 8) * Math.PI * 2;
      const hearthStone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.13 * sc, 0),
        cliffRockMat
      );
      hearthStone.position.set(
        fx + Math.cos(a) * 0.44 * sc,
        fy + 0.06 * sc,
        fz + Math.sin(a) * 0.44 * sc
      );
      root.add(hearthStone);
    }

    const logs = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18 * sc, 0.24 * sc, 0.16 * sc, 6),
      trunkMat
    );
    logs.position.set(fx, fy + 0.08, fz);
    root.add(logs);

    const flame = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28 * sc, 0),
      new THREE.MeshBasicMaterial({ color: 0xff9a26 })
    );
    flame.position.set(fx, fy + 0.3 * sc, fz);
    flame.scale.set(1, 1.55, 1);
    root.add(flame);
    fireFlames.push(flame);

    const pLight = new THREE.PointLight(0xff8424, 6.8 * sc, 15, 1.45);
    pLight.position.set(fx, fy + 0.9, fz);
    root.add(pLight);
    fireLights.push(pLight);
    obstacles.push({ x: fx, z: fz, r: 0.72 * sc });
  });

  // Rising glowing campfire embers above the two terrace fires
  const sparkCount = 34;
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkBase: [number, number, number][] = [];
  for (let i = 0; i < sparkCount; i++) {
    const fc = fireCoords[i % fireCoords.length];
    const fy = terrainHeightAt(fc[0], fc[1]);
    const ox = fc[0] + Math.sin(i * 4.1) * 0.28;
    const oz = fc[1] + Math.cos(i * 3.7) * 0.28;
    sparkBase.push([ox, fy + 0.35, oz]);
    sparkPos[i * 3] = ox;
    sparkPos[i * 3 + 1] = fy + 0.35 + ((i * 19) % 10) * 0.16;
    sparkPos[i * 3 + 2] = oz;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const fireSparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({
      color: 0xffb347,
      size: 0.08,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  root.add(fireSparks);

  // 6. Tents, Camp Baskets, Clay Jars & Rustic Wooden Fences
  const tent1X = -19.2;
  const tent1Z = 7.4;
  const tent1 = buildDetailedTent(canvasTentMat, woodPropMat, clayMat);
  tent1.position.set(tent1X, terrainHeightAt(tent1X, tent1Z), tent1Z);
  tent1.rotation.y = 0.22;
  root.add(tent1);
  obstacles.push({ x: tent1X, z: tent1Z, r: 2.0 });

  const tent2X = -15.4;
  const tent2Z = 11.4;
  const tent2 = buildDetailedTent(canvasTentMat, woodPropMat, clayMat);
  tent2.position.set(tent2X, terrainHeightAt(tent2X, tent2Z), tent2Z);
  tent2.rotation.y = -0.15;
  root.add(tent2);
  obstacles.push({ x: tent2X, z: tent2Z, r: 2.0 });

  // Woven travel baskets & clay water jars beside the terrace bench and tents
  const campProps: [number, number, 'basket' | 'jar'][] = [
    [10.2, 5.2, 'jar'],
    [12.3, 4.7, 'basket'],
    [-16.9, 9.2, 'basket'],
    [-13.5, 10.6, 'jar'],
  ];
  const basketGeo = new THREE.CylinderGeometry(0.24, 0.17, 0.34, 8);
  const campJarGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.11, 0),
      new THREE.Vector2(0.2, 0.18),
      new THREE.Vector2(0.08, 0.38),
      new THREE.Vector2(0.11, 0.45),
    ],
    9
  );
  campProps.forEach(([px, pz, kind]) => {
    const py = terrainHeightAt(px, pz);
    const prop = new THREE.Mesh(
      kind === 'basket' ? basketGeo : campJarGeo,
      kind === 'basket' ? woodPropMat : clayMat
    );
    prop.position.set(px, py + (kind === 'basket' ? 0.17 : 0.0), pz);
    prop.castShadow = true;
    prop.receiveShadow = true;
    root.add(prop);
  });

  root.add(buildWoodenFence(-12.6, 11.5, -7.2, 11.4, woodPropMat));
  root.add(buildWoodenFence(10.8, 6.8, 13.0, 7.6, woodPropMat));
  root.add(buildWoodenFence(6.0, 10.6, 11.5, 12.0, woodPropMat));
  root.add(buildWoodenFence(13.2, 12.3, 18.2, 13.8, woodPropMat));

  // Drying linen tunics draped over two wooden fences
  const drapedLinenMat = new THREE.MeshStandardMaterial({
    color: 0xd6c7b0,
    map: tex.fabricColor,
    roughness: 0.9,
    flatShading: true,
  });
  [
    [-10.2, 11.45, 0.04],
    [11.8, 7.2, 0.35],
  ].forEach(([lx, lz, rot]) => {
    const ly = terrainHeightAt(lx, lz);
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.42, 0.14),
      drapedLinenMat
    );
    cloth.position.set(lx, ly + 0.62, lz);
    cloth.rotation.y = rot;
    cloth.castShadow = true;
    root.add(cloth);
  });

  // 7. Sculpted High-Detail Boulders
  const boulderCoords: [number, number, number][] = [
    [-7.8, -1.6, 0.88],
    [-3.2, -2.6, 0.56],
    [1.8, -2.0, 0.64],
    [6.5, -1.1, 0.82],
    [-11.2, -0.5, 0.92],
    [-8.8, 1.5, 0.95],
    [-5.4, 1.8, 0.72],
    [3.1, 1.55, 0.7],
    [7.4, 2.3, 1.05],
    [-11.2, 11.5, 1.3],
    [-6.2, 12.6, 1.15],
    [-2.5, -4.3, 0.68],
    [2.6, -4.4, 0.85],
    [-7.4, -4.6, 1.05],
  ];
  boulderCoords.forEach(([bx, bz, sc], idx) => {
    const by = terrainHeightAt(bx, bz);
    const rock = buildSculptedBoulder(sc * 0.78, idx * 3.1, cliffRockMat);
    rock.position.set(bx, by + sc * 0.34, bz);
    rock.rotation.y = idx * 0.85;
    root.add(rock);
    obstacles.push({ x: bx, z: bz, r: sc * 0.82 });
  });

  // 8. Realistic Multi-Branch Olive Trees & Date Palm + Reeds
  const olivePlacements: [number, number, number][] = [
    [-2.4, 10.6, 1.35],
    [-19.2, 3.8, 1.2],
    [-11.6, 13.8, 1.15],
    [-2.8, 14.5, 1.0],
    [16.8, 7.2, 1.25],
    [9.4, 3.8, 0.85],
    [-9.4, -8.5, 1.1],
    [-14.5, -14.5, 1.3],
    [4.8, -15.2, 1.25],
    [13.8, -13.6, 1.3],
    [-4.8, -6.2, 0.78],
  ];
  olivePlacements.forEach(([tx, tz, sc], idx) => {
    const ty = terrainHeightAt(tx, tz);
    const t = buildRealisticOliveTree(
      sc,
      idx,
      trunkMat,
      foliageCardMat,
      innerCanopyMat
    );
    t.position.set(tx, ty - 0.04, tz);
    root.add(t);
    obstacles.push({ x: tx, z: tz, r: 0.45 * sc });
  });

  const palm = buildRealisticPalmTree(trunkMat, foliageCardMat);
  palm.position.set(16.3, terrainHeightAt(16.3, 4.3), 4.3);
  root.add(palm);
  obstacles.push({ x: 16.3, z: 4.3, r: 0.48 });

  const reedGeo = new THREE.ConeGeometry(0.035, 0.95, 4);
  const reedMat = new THREE.MeshStandardMaterial({
    color: 0x3b441d,
    roughness: 0.88,
    flatShading: true,
  });
  const reedCount = 56;
  const reedInst = new THREE.InstancedMesh(reedGeo, reedMat, reedCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < reedCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const rx = -18 + (i / reedCount) * 36 + Math.sin(i * 5.2) * 0.5;
    const rz = riverCenterZ(rx) + side * (2.6 + (i % 3) * 0.25);
    const ry = terrainHeightAt(rx, rz);
    dummy.position.set(rx, ry + 0.42, rz);
    dummy.rotation.set(Math.sin(i) * 0.14, i * 0.9, Math.cos(i) * 0.14);
    dummy.scale.setScalar(0.85 + (i % 4) * 0.15);
    dummy.updateMatrix();
    reedInst.setMatrixAt(i, dummy.matrix);
  }
  reedInst.computeBoundingSphere();
  root.add(reedInst);

  // Wildflowers scattered across sunlit Jordan banks
  const blossomGeo = new THREE.DodecahedronGeometry(0.065, 0);
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xe3ba56,
    roughness: 0.82,
    flatShading: true,
  });
  const blossomCount = 44;
  const blossomInst = new THREE.InstancedMesh(blossomGeo, blossomMat, blossomCount);
  for (let i = 0; i < blossomCount; i++) {
    const bx = -15 + ((i * 7.3) % 31);
    const bz = i % 2 === 0 ? 3.2 + (i % 6) * 1.15 : -3.4 - (i % 5) * 0.7;
    const by = terrainHeightAt(bx, bz);
    dummy.position.set(bx, by + 0.05, bz);
    dummy.rotation.set(i * 0.4, i * 1.2, 0);
    dummy.scale.setScalar(0.8 + (i % 3) * 0.28);
    dummy.updateMatrix();
    blossomInst.setMatrixAt(i, dummy.matrix);
  }
  blossomInst.computeBoundingSphere();
  root.add(blossomInst);

  // 4 Stylized Morning Valley Birds soaring calmly over the gorge
  const valleyBirdMat = new THREE.MeshStandardMaterial({
    color: 0xe9dcc7,
    roughness: 0.78,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const valleyBirds: {
    group: THREE.Group;
    leftWing: THREE.Mesh;
    rightWing: THREE.Mesh;
    cx: number;
    cz: number;
    y: number;
    radius: number;
    speed: number;
    phase: number;
  }[] = [];
  const birdWingGeo = new THREE.PlaneGeometry(0.32, 0.09);
  const birdBodyGeo = new THREE.ConeGeometry(0.05, 0.26, 5);
  birdBodyGeo.rotateX(Math.PI / 2);
  [
    [-4, -2, 8.2, 9.5, 0.26, 0.1],
    [4, -4, 9.4, 11.0, 0.22, 1.9],
    [-9, 2, 7.6, 8.0, 0.29, 3.6],
    [7, 3, 8.8, 10.2, 0.24, 5.1],
  ].forEach(([cx, cz, y, radius, speed, phase]) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(birdBodyGeo, valleyBirdMat));
    const lw = new THREE.Mesh(birdWingGeo, valleyBirdMat);
    lw.position.set(-0.16, 0.01, 0.02);
    lw.rotation.x = -Math.PI / 2;
    g.add(lw);
    const rw = new THREE.Mesh(birdWingGeo, valleyBirdMat);
    rw.position.set(0.16, 0.01, 0.02);
    rw.rotation.x = -Math.PI / 2;
    g.add(rw);
    root.add(g);
    valleyBirds.push({ group: g, leftWing: lw, rightWing: rw, cx, cz, y, radius, speed, phase });
  });

  // 9. Baked Crowd in Exact Same Hero Character Style (24 people = only 24 draw calls total!)
  const crowdSwatches: {
    tunic: string;
    cloak: string;
    skin: string;
    hair: string;
    gender: 'masculino' | 'feminino';
    hairStyle: CharacterConfig['hairStyle'];
    beardStyle: CharacterConfig['beardStyle'];
  }[] = [
    { tunic: '#8d7253', cloak: '#4f3a2a', skin: '#ba7e56', hair: '#2c1e16', gender: 'masculino', hairStyle: 'curto_ondulado', beardStyle: 'cheia' },
    { tunic: '#b7a48a', cloak: '#6d5039', skin: '#c8916b', hair: '#38251a', gender: 'feminino', hairStyle: 'trancado_veu', beardStyle: 'sem_barba' },
    { tunic: '#685745', cloak: '#35484f', skin: '#a66b47', hair: '#221712', gender: 'masculino', hairStyle: 'longo_ombros', beardStyle: 'curta' },
    { tunic: '#9a805f', cloak: '#5a3b2a', skin: '#be855c', hair: '#4a3628', gender: 'feminino', hairStyle: 'preso_faixa', beardStyle: 'sem_barba' },
    { tunic: '#756654', cloak: '#44362b', skin: '#9d6442', hair: '#2a1d16', gender: 'masculino', hairStyle: 'curtissimo', beardStyle: 'patriarca' },
    { tunic: '#c4b299', cloak: '#5d6552', skin: '#c48d67', hair: '#312119', gender: 'feminino', hairStyle: 'trancado_veu', beardStyle: 'sem_barba' },
  ];

  const crowdArchetypeGeos = crowdSwatches.map((s) =>
    buildBakedCrowdGeometry(
      s.tunic,
      s.cloak,
      s.skin,
      s.hair,
      s.gender,
      s.hairStyle,
      s.beardStyle
    )
  );
  const crowdBakedMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: tex.fabricColor,
    normalMap: tex.fabricNormal,
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 0.84,
    flatShading: true,
  });

  const crowdMeshes: {
    mesh: THREE.Mesh;
    baseYaw: number;
    phase: number;
  }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const idx = row * 6 + col;
      const geo = crowdArchetypeGeos[idx % crowdArchetypeGeos.length];
      const npcMesh = new THREE.Mesh(geo, crowdBakedMat);
      const cx = -14.2 + col * 1.45 + Math.sin(row * 5 + col * 9) * 0.28;
      const cz = 3.8 + row * 1.4 + Math.cos(row * 7 + col * 3) * 0.25;
      const cy = terrainHeightAt(cx, cz);
      const baseYaw = Math.atan2(-4.5 - cx, -1.2 - cz);
      npcMesh.position.set(cx, cy, cz);
      npcMesh.rotation.y = baseYaw;
      npcMesh.castShadow = true;
      npcMesh.receiveShadow = true;
      root.add(npcMesh);
      crowdMeshes.push({ mesh: npcMesh, baseYaw, phase: idx * 0.6 });
      obstacles.push({ x: cx, z: cz, r: 0.42 });
    }
  }

  // 10. Hero Articulated Characters
  const playerRig: LowPolyCharacterRig = buildLowPolyDisciple(character);
  root.add(playerRig.group);

  const andrewRig = buildCompanionNpc(
    '#7c7264',
    '#2a434c',
    '#b8805a',
    '#33231a',
    true,
    'masculino',
    'curto_ondulado',
    'curta'
  );
  root.add(andrewRig.group);

  const johnRig = buildCompanionNpc(
    '#5e452e',
    '#3c291b',
    '#ae7249',
    '#241710',
    true,
    'masculino',
    'longo_ombros',
    'patriarca'
  );
  root.add(johnRig.group);

  const jesusRig = buildCompanionNpc(
    '#dfd5c5',
    '#b07832',
    '#c48a61',
    '#2b1c14',
    true,
    'masculino',
    'longo_ombros',
    'cheia'
  );
  root.add(jesusRig.group);

  // Subtle warm light guiding player toward Jesus during interactive follow gameplay
  const jesusGuideLight = new THREE.PointLight(0xffd088, 0, 10, 1.6);
  jesusGuideLight.position.set(0, 1.5, 0);
  jesusRig.group.add(jesusGuideLight);

  // 11. Baptism Golden Heaven Beam + Dove
  const beamGeo = new THREE.ConeGeometry(2.7, 16, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffe4a3,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const heavenBeam = new THREE.Mesh(beamGeo, beamMat);
  heavenBeam.position.set(-1.2, 8.0, -1.4);
  root.add(heavenBeam);

  const baptismLight = new THREE.PointLight(0xffdc8f, 0, 22, 1.35);
  baptismLight.position.set(-1.2, 4.8, -1.4);
  root.add(baptismLight);

  const dove = buildLowPolyDove();
  dove.visible = false;
  dove.position.set(-1.2, 5.4, -1.4);
  root.add(dove);

  // State tracking for Hard Cinema Cuts (no drone swooping) + Follow-Jesus Gameplay
  let lastShotKey = '';
  const gpState = {
    playerX: 9.7,
    playerZ: 5.2,
    playerYaw: -1.65,
    andrewX: 10.3,
    andrewZ: 5.9,
    andrewYaw: -1.65,
    jesusX: 5.4,
    jesusZ: 5.9,
    jesusYaw: -1.75,
    reachedJesus: false,
  };

  const resetFollowGameplay = () => {
    gpState.playerX = 9.7;
    gpState.playerZ = 5.2;
    gpState.playerYaw = -1.65;
    gpState.andrewX = 10.3;
    gpState.andrewZ = 5.9;
    gpState.andrewYaw = -1.65;
    gpState.jesusX = 5.4;
    gpState.jesusZ = 5.9;
    gpState.jesusYaw = -1.75;
    gpState.reachedJesus = false;
  };

  const animateEnvironment = (elapsed: number, isBaptism: boolean, beatProgress: number) => {
    valleySky.uniforms.uTime.value = elapsed;
    valleySky.uniforms.uSunIntensity.value = isBaptism ? 1.75 : 1.15;
    farValleyMist.update(elapsed);

    waterUniforms.uTime.value = elapsed;
    waterUniforms.uBaptismGlow.value = isBaptism
      ? Math.sin(beatProgress * Math.PI)
      : 0.0;
    tex.waterNormal.offset.set(-elapsed * 0.052, elapsed * 0.011);
    tex.waterColor.offset.set(-elapsed * 0.032, 0);
    tex.waterFoam.offset.set(-elapsed * 0.062, Math.sin(elapsed * 0.4) * 0.015);

    for (let i = 0; i < wakeRings.length; i++) {
      const wr = wakeRings[i];
      const pulse = 1 + Math.sin(elapsed * 2.1 + wr.phase) * 0.12;
      wr.mesh.scale.setScalar(wr.baseScale * pulse);
    }

    for (let i = 0; i < mistLayers.length; i++) {
      const ml = mistLayers[i];
      ml.mesh.position.x =
        ml.baseX + Math.sin(elapsed * ml.speed + ml.phase) * 1.6;
    }

    fireLights.forEach((fl, idx) => {
      fl.intensity =
        (idx === 0 ? 6.8 : 4.4) + Math.sin(elapsed * 8.5 + idx * 2) * 0.7;
    });
    fireFlames.forEach((flame, idx) => {
      flame.scale.set(
        0.95 + Math.sin(elapsed * 11 + idx) * 0.14,
        1.5 + Math.cos(elapsed * 9.5 + idx) * 0.22,
        0.95 + Math.sin(elapsed * 11 + idx) * 0.14
      );
    });

    const sAttr = sparkGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sparkCount; i++) {
      const [bx, by, bz] = sparkBase[i];
      const rise = ((elapsed * 0.95 + i * 0.37) % 1.9);
      sAttr.setXYZ(
        i,
        bx + Math.sin(elapsed * 2.4 + i) * 0.12,
        by + rise,
        bz + Math.cos(elapsed * 2.1 + i) * 0.12
      );
    }
    sAttr.needsUpdate = true;

    for (let i = 0; i < valleyBirds.length; i++) {
      const vb = valleyBirds[i];
      const ang = elapsed * vb.speed + vb.phase;
      vb.group.position.set(
        vb.cx + Math.cos(ang) * vb.radius,
        vb.y + Math.sin(elapsed * 1.3 + vb.phase) * 0.28,
        vb.cz + Math.sin(ang) * vb.radius
      );
      vb.group.rotation.y = -ang;
      const flap = Math.sin(elapsed * 4.8 + vb.phase) * 0.34;
      vb.leftWing.rotation.z = flap;
      vb.rightWing.rotation.z = -flap;
    }

    beamMat.opacity = isBaptism
      ? Math.min(0.28, Math.sin(beatProgress * Math.PI) * 0.32)
      : 0;
    baptismLight.intensity = isBaptism
      ? Math.sin(beatProgress * Math.PI) * 11.0
      : 0;
    dove.visible = isBaptism;

    for (let i = 0; i < crowdMeshes.length; i++) {
      const c = crowdMeshes[i];
      c.mesh.rotation.y =
        c.baseYaw + Math.sin(elapsed * 0.65 + c.phase) * 0.055;
      c.mesh.scale.y = 1 + Math.sin(elapsed * 1.9 + c.phase) * 0.012;
    }
  };

  return {
    root,
    resetFollowGameplay,
    update: (
      beatIndex: number,
      beatProgress: number,
      elapsed: number,
      camera: THREE.PerspectiveCamera,
      cameraMode: CutsceneCameraMode = 'auto'
    ) => {
      animateEnvironment(elapsed, beatIndex === 4, beatProgress);
      jesusGuideLight.intensity = 0;

      let subShot = 0;
      let isTrackingShot = false;

      if (beatIndex === 0) {
        playerRig.group.visible = false;
        andrewRig.group.visible = false;
        jesusRig.group.visible = false;
        johnRig.group.visible = true;
        johnRig.group.position.set(-4.5, -0.34, -1.2);
        johnRig.group.rotation.y = Math.PI * 0.82;
        animateCharacterPose(johnRig, elapsed, 'preach');

        if (beatProgress < 0.52) {
          subShot = 0;
          _desiredCamPos.set(-0.8, 7.8, -17.2);
          _desiredLookAt.set(-1.5 + beatProgress * 2.2, 0.7, 3.2);
        } else {
          subShot = 1;
          _desiredCamPos.set(6.4, 4.1, 9.2);
          _desiredLookAt.set(-2.5, 0.45, -1.5);
        }
      } else if (beatIndex === 1) {
        playerRig.group.visible = true;
        andrewRig.group.visible = false;
        jesusRig.group.visible = false;
        johnRig.group.visible = true;

        const sample = samplePolylineXZ(ZIGZAG_PATH_XZ, beatProgress);
        placeGroundedActor(playerRig, sample.x, sample.z, obstacles, 0.32);
        playerRig.group.rotation.y = sample.yaw;
        animateCharacterPose(playerRig, elapsed, 'walk', 5.2);

        johnRig.group.position.set(-4.5, -0.34, -1.2);
        animateCharacterPose(johnRig, elapsed, 'preach');

        const pPos = playerRig.group.position;
        isTrackingShot = true;
        if (beatProgress < 0.56) {
          subShot = 0;
          _desiredCamPos.set(
            pPos.x - Math.sin(sample.yaw) * 2.5,
            pPos.y + 1.85,
            pPos.z - Math.cos(sample.yaw) * 2.5
          );
          _desiredLookAt.set(pPos.x * 0.65, pPos.y - 0.3, pPos.z + 4.8);
        } else {
          subShot = 1;
          _desiredCamPos.set(-2.2, 1.35, -3.2);
          _desiredLookAt.set(pPos.x, pPos.y + 1.0, pPos.z);
        }
      } else if (beatIndex === 2) {
        playerRig.group.visible = true;
        placeGroundedActor(playerRig, -0.8, -4.6, obstacles);
        playerRig.group.rotation.y = -0.75;
        jesusRig.group.visible = false;
        johnRig.group.visible = true;
        johnRig.group.position.set(-4.5, -0.34, -1.2);
        johnRig.group.rotation.y = Math.PI * 0.82;

        animateCharacterPose(playerRig, elapsed, 'idle');
        animateCharacterPose(johnRig, elapsed, 'preach');

        if (beatProgress < 0.36) {
          subShot = 0;
          _desiredCamPos.set(-2.0, 1.25, 2.2);
          _desiredLookAt.set(-4.5, 1.0, -1.2);
        } else if (beatProgress < 0.7) {
          subShot = 1;
          _desiredCamPos.set(-2.75, 1.08, -2.55);
          _desiredLookAt.set(-4.6, 1.05, -1.1);
        } else {
          subShot = 2;
          _desiredCamPos.set(-12.6, 1.85, 8.6);
          _desiredLookAt.set(-4.5, 0.85, -1.2);
        }
      } else if (beatIndex === 3) {
        playerRig.group.visible = true;
        placeGroundedActor(playerRig, -0.8, -4.6, obstacles);
        jesusRig.group.visible = true;
        johnRig.group.visible = true;

        const jx = THREE.MathUtils.lerp(13.5, 4.8, beatProgress);
        const jz = THREE.MathUtils.lerp(10.8, 5.4, beatProgress);
        placeGroundedActor(jesusRig, jx, jz, obstacles);
        jesusRig.group.rotation.y = -2.25;

        johnRig.group.position.set(-4.5, -0.34, -1.2);
        johnRig.group.rotation.y = Math.atan2(
          jesusRig.group.position.x - -4.5,
          jesusRig.group.position.z - -1.2
        );

        animateCharacterPose(jesusRig, elapsed, 'walk', 4.1);
        animateCharacterPose(johnRig, elapsed, 'awe');
        animateCharacterPose(playerRig, elapsed, 'idle');

        if (beatProgress < 0.36) {
          subShot = 0;
          isTrackingShot = true;
          _desiredCamPos.set(1.2, 2.35, 2.2);
          _desiredLookAt.set(
            jesusRig.group.position.x,
            jesusRig.group.position.y + 1.05,
            jesusRig.group.position.z
          );
        } else if (beatProgress < 0.68) {
          subShot = 1;
          _desiredCamPos.set(-2.85, 1.28, -0.05);
          _desiredLookAt.set(-4.5, 1.18, -1.2);
        } else {
          subShot = 2;
          _desiredCamPos.set(-5.8, 1.55, -2.0);
          _desiredLookAt.set(
            jesusRig.group.position.x,
            jesusRig.group.position.y + 1.0,
            jesusRig.group.position.z
          );
        }
      } else if (beatIndex === 4) {
        playerRig.group.visible = true;
        placeGroundedActor(playerRig, 2.2, -4.6, obstacles);
        playerRig.group.rotation.y = -0.65;

        jesusRig.group.visible = true;
        jesusRig.group.position.set(-1.2, -0.34, -1.4);
        jesusRig.group.rotation.y = 0.2;

        johnRig.group.visible = true;
        johnRig.group.position.set(-2.15, -0.34, -1.1);
        johnRig.group.rotation.y = 1.25;

        animateCharacterPose(jesusRig, elapsed, 'awe');
        animateCharacterPose(johnRig, elapsed, 'baptize');
        animateCharacterPose(playerRig, elapsed, 'awe');

        dove.position.set(
          -1.2,
          THREE.MathUtils.lerp(5.8, 1.92, Math.min(1, beatProgress * 1.15)) +
            Math.sin(elapsed * 4.5) * 0.035,
          -1.4
        );
        dove.rotation.x = 0.28 * (1 - Math.min(1, beatProgress));
        dove.rotation.y = Math.sin(elapsed * 1.2) * 0.08;
        const innerFlap = Math.sin(elapsed * 9.5) * 0.42;
        const outerFlap = Math.sin(elapsed * 9.5 - 0.65) * 0.48;
        (dove.userData.leftWingInner as THREE.Group).rotation.z =
          0.22 + innerFlap;
        (dove.userData.rightWingInner as THREE.Group).rotation.z =
          -0.22 - innerFlap;
        (dove.userData.leftWingOuter as THREE.Group).rotation.z =
          0.12 + outerFlap;
        (dove.userData.rightWingOuter as THREE.Group).rotation.z =
          -0.12 - outerFlap;
        (dove.userData.tailGroup as THREE.Group).rotation.x =
          0.14 + Math.sin(elapsed * 4.5) * 0.08;

        if (beatProgress < 0.34) {
          subShot = 0;
          _desiredCamPos.set(2.4, 1.9, 2.5);
          _desiredLookAt.set(-1.35, 0.9, -1.3);
        } else if (beatProgress < 0.68) {
          subShot = 1;
          _desiredCamPos.set(0.45, 1.28, 0.65);
          _desiredLookAt.set(-1.45, 1.1, -1.25);
        } else {
          subShot = 2;
          isTrackingShot = true;
          _desiredCamPos.set(1.2, 0.95, 1.6);
          _desiredLookAt.set(-1.2, 1.5 + beatProgress * 1.35, -1.4);
        }
      } else if (beatIndex === 5) {
        playerRig.group.visible = true;
        jesusRig.group.visible = false;
        johnRig.group.visible = false;
        andrewRig.group.visible = false;

        placeGroundedActor(playerRig, 10.9, 4.1, obstacles);
        playerRig.group.rotation.y = -1.15;
        animateCharacterPose(playerRig, elapsed, 'awe');

        const py = playerRig.group.position.y;
        if (beatProgress < 0.52) {
          subShot = 0;
          _desiredCamPos.set(9.2, py + 1.48, 5.15);
          _desiredLookAt.set(10.9, py + 1.38, 4.1);
        } else {
          subShot = 1;
          _desiredCamPos.set(15.2, py + 2.35, 7.6);
          _desiredLookAt.set(9.2, py + 0.9, 3.2);
        }
      } else if (beatIndex === 6) {
        playerRig.group.visible = true;
        andrewRig.group.visible = true;
        jesusRig.group.visible = true;
        johnRig.group.visible = true;

        placeGroundedActor(johnRig, 10.6, 4.3, obstacles);
        johnRig.group.rotation.y = -1.65;

        const walkT = Math.max(0, (beatProgress - 0.25) / 0.75);
        const jx = THREE.MathUtils.lerp(7.5, 4.8, beatProgress);
        const jz = THREE.MathUtils.lerp(7.1, 5.8, beatProgress);
        placeGroundedActor(jesusRig, jx, jz, obstacles);
        jesusRig.group.rotation.y = -1.75;

        const followPath: [number, number, number][] = [
          [9.9, 1.65, 5.3],
          [8.6, 1.1, 5.6],
        ];
        const fSample = samplePolylineXZ(followPath, walkT);
        placeGroundedActor(playerRig, fSample.x, fSample.z, obstacles);
        playerRig.group.rotation.y = fSample.yaw;

        placeGroundedActor(
          andrewRig,
          fSample.x + 0.65,
          fSample.z + 0.68,
          obstacles
        );
        andrewRig.group.rotation.y = fSample.yaw;

        animateCharacterPose(johnRig, elapsed, 'preach');
        animateCharacterPose(jesusRig, elapsed, 'walk', 4.2);
        animateCharacterPose(
          playerRig,
          elapsed,
          walkT > 0.02 ? 'walk' : 'idle',
          4.4
        );
        animateCharacterPose(
          andrewRig,
          elapsed,
          walkT > 0.02 ? 'walk' : 'idle',
          4.2
        );

        if (beatProgress < 0.42) {
          subShot = 0;
          _desiredCamPos.set(12.8, 3.25, 2.2);
          _desiredLookAt.set(9.8, 2.1, 4.9);
        } else {
          subShot = 1;
          isTrackingShot = true;
          _desiredCamPos.set(10.6, 2.8, 8.6);
          _desiredLookAt.set(
            jesusRig.group.position.x,
            1.15,
            jesusRig.group.position.z
          );
        }
      } else {
        // Cena 8: Jesus turns in the meadow ("Que buscais?")
        playerRig.group.visible = true;
        andrewRig.group.visible = true;
        jesusRig.group.visible = true;
        johnRig.group.visible = false;

        placeGroundedActor(jesusRig, -2.0, 4.1, obstacles);
        jesusRig.group.rotation.y = 1.25;

        placeGroundedActor(playerRig, 0.85, 4.85, obstacles);
        playerRig.group.rotation.y = -1.32;
        placeGroundedActor(andrewRig, 1.35, 5.65, obstacles);
        andrewRig.group.rotation.y = -1.38;

        animateCharacterPose(jesusRig, elapsed, 'welcome');
        animateCharacterPose(playerRig, elapsed, 'idle');
        animateCharacterPose(andrewRig, elapsed, 'idle');

        if (beatProgress < 0.36) {
          subShot = 0;
          _desiredCamPos.set(3.2, 1.95, 6.9);
          _desiredLookAt.set(-1.6, 1.25, 4.2);
        } else {
          subShot = 1;
          _desiredCamPos.set(2.5, 1.48, 6.15);
          _desiredLookAt.set(-1.35, 1.2, 4.2);
        }
      }

      // Optional player-selected camera presets
      if (cameraMode === 'aerea') {
        subShot = 91;
        _desiredCamPos.set(0.5, 14.5, 16.5);
        _desiredLookAt.set(0, 0.8, -1.2);
      } else if (cameraMode === 'discipulo' && playerRig.group.visible) {
        subShot = 92;
        isTrackingShot = true;
        const pp = playerRig.group.position;
        _desiredCamPos.set(pp.x + 2.6, pp.y + 1.85, pp.z + 2.8);
        _desiredLookAt.set(pp.x, pp.y + 1.15, pp.z);
      } else if (cameraMode === 'margem') {
        subShot = 93;
        _desiredCamPos.set(-13.8, 3.2, 10.8);
        _desiredLookAt.set(-2.5, 0.9, -1.0);
      }

      // Real cinema cuts: snap camera immediately whenever shotKey changes; no drone flight!
      const shotKey = `${beatIndex}_${subShot}_${cameraMode}`;
      if (shotKey !== lastShotKey) {
        lastShotKey = shotKey;
        camera.position.copy(_desiredCamPos);
        _camTarget.copy(_desiredLookAt);
        camera.lookAt(_camTarget);
      } else if (isTrackingShot) {
        camera.position.lerp(_desiredCamPos, 0.14);
        _camTarget.lerp(_desiredLookAt, 0.18);
        camera.lookAt(_camTarget);
      } else {
        // Gentle subtle tripod breathing only
        camera.position.lerp(_desiredCamPos, 0.05);
        _camTarget.lerp(_desiredLookAt, 0.08);
        camera.lookAt(_camTarget);
      }
    },

    updateFollowGameplay: (
      moveForward: number,
      moveRight: number,
      dt: number,
      elapsed: number,
      camera: THREE.PerspectiveCamera
    ): FollowGameplayResult => {
      animateEnvironment(elapsed, false, 0);

      playerRig.group.visible = true;
      andrewRig.group.visible = true;
      jesusRig.group.visible = true;
      johnRig.group.visible = true;

      // John stays back on the terrace looking on quietly
      placeGroundedActor(johnRig, 10.8, 4.2, obstacles);
      johnRig.group.rotation.y = -1.6;
      animateCharacterPose(johnRig, elapsed, 'idle');

      // Calculate camera-relative ground movement vector
      camera.getWorldDirection(_camForward);
      _camForward.y = 0;
      if (_camForward.lengthSq() < 1e-4) _camForward.set(-1, 0, 0);
      _camForward.normalize();
      _camRight.set(-_camForward.z, 0, _camForward.x);

      let dirX = _camForward.x * moveForward + _camRight.x * moveRight;
      let dirZ = _camForward.z * moveForward + _camRight.z * moveRight;
      const inputMag = Math.hypot(dirX, dirZ);
      let isPlayerMoving = false;

      if (inputMag > 0.08 && !gpState.reachedJesus) {
        const clampedMag = Math.min(1, inputMag);
        dirX /= inputMag;
        dirZ /= inputMag;
        const speed = 3.25 * clampedMag;
        const resolved = resolveGroundedPosition(
          gpState.playerX + dirX * speed * dt,
          gpState.playerZ + dirZ * speed * dt,
          obstacles,
          0.38,
          true
        );
        gpState.playerX = resolved.x;
        gpState.playerZ = resolved.z;

        const targetYaw = Math.atan2(dirX, dirZ);
        let diff = targetYaw - gpState.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        gpState.playerYaw += diff * Math.min(1, dt * 10);
        isPlayerMoving = true;
      }

      const py = terrainHeightAt(gpState.playerX, gpState.playerZ);
      playerRig.group.position.set(gpState.playerX, py, gpState.playerZ);
      playerRig.group.rotation.y = gpState.playerYaw;
      animateCharacterPose(
        playerRig,
        elapsed,
        isPlayerMoving ? 'walk' : 'idle',
        5.0
      );

      // Andrew follows naturally beside/behind the player's right shoulder
      const desiredAx =
        gpState.playerX - Math.sin(gpState.playerYaw) * 0.95 + 0.55;
      const desiredAz =
        gpState.playerZ - Math.cos(gpState.playerYaw) * 0.95 + 0.55;
      const adx = desiredAx - gpState.andrewX;
      const adz = desiredAz - gpState.andrewZ;
      const aDist = Math.hypot(adx, adz);
      let isAndrewMoving = false;
      if (aDist > 0.35) {
        const aStep = Math.min(aDist, 3.1 * dt);
        const resA = resolveGroundedPosition(
          gpState.andrewX + (adx / aDist) * aStep,
          gpState.andrewZ + (adz / aDist) * aStep,
          obstacles,
          0.36,
          true
        );
        gpState.andrewX = resA.x;
        gpState.andrewZ = resA.z;
        gpState.andrewYaw = Math.atan2(adx, adz);
        isAndrewMoving = true;
      } else {
        gpState.andrewYaw = gpState.playerYaw;
      }
      const ay = terrainHeightAt(gpState.andrewX, gpState.andrewZ);
      andrewRig.group.position.set(gpState.andrewX, ay, gpState.andrewZ);
      andrewRig.group.rotation.y = gpState.andrewYaw;
      animateCharacterPose(
        andrewRig,
        elapsed + 0.4,
        isAndrewMoving ? 'walk' : 'idle',
        4.8
      );

      // Jesus walks calmly toward the clearing (-2.1, 4.1) and pauses when arriving or if player is far
      const goalX = -2.1;
      const goalZ = 4.1;
      const jToGoal = Math.hypot(
        goalX - gpState.jesusX,
        goalZ - gpState.jesusZ
      );
      const distPlayerToJesus = Math.hypot(
        gpState.jesusX - gpState.playerX,
        gpState.jesusZ - gpState.playerZ
      );
      let isJesusMoving = false;
      if (jToGoal > 0.18 && distPlayerToJesus < 6.8 && !gpState.reachedJesus) {
        const jSpeed = 1.65;
        const jStep = Math.min(jToGoal, jSpeed * dt);
        const vx = (goalX - gpState.jesusX) / jToGoal;
        const vz = (goalZ - gpState.jesusZ) / jToGoal;
        const resJ = resolveGroundedPosition(
          gpState.jesusX + vx * jStep,
          gpState.jesusZ + vz * jStep,
          obstacles,
          0.38,
          true
        );
        gpState.jesusX = resJ.x;
        gpState.jesusZ = resJ.z;
        gpState.jesusYaw = Math.atan2(vx, vz);
        isJesusMoving = true;
      } else if (distPlayerToJesus < 2.65) {
        gpState.reachedJesus = true;
        gpState.jesusYaw = Math.atan2(
          gpState.playerX - gpState.jesusX,
          gpState.playerZ - gpState.jesusZ
        );
      }

      const jy = terrainHeightAt(gpState.jesusX, gpState.jesusZ);
      jesusRig.group.position.set(gpState.jesusX, jy, gpState.jesusZ);
      jesusRig.group.rotation.y = gpState.jesusYaw;
      jesusGuideLight.intensity = 2.6;
      animateCharacterPose(
        jesusRig,
        elapsed,
        gpState.reachedJesus ? 'welcome' : isJesusMoving ? 'walk' : 'idle',
        3.8
      );

      // Smooth grounded 3rd-person follow camera looking past player toward Jesus
      const camAnchorX = gpState.playerX + 3.6;
      const camAnchorY = py + 2.35;
      const camAnchorZ = gpState.playerZ + 3.2;

      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        camAnchorX,
        4.5,
        dt
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        camAnchorY,
        4.5,
        dt
      );
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        camAnchorZ,
        4.5,
        dt
      );

      const lookX = THREE.MathUtils.lerp(gpState.playerX, gpState.jesusX, 0.35);
      const lookY = py + 1.15;
      const lookZ = THREE.MathUtils.lerp(gpState.playerZ, gpState.jesusZ, 0.35);
      _camTarget.x = THREE.MathUtils.damp(_camTarget.x, lookX, 5.5, dt);
      _camTarget.y = THREE.MathUtils.damp(_camTarget.y, lookY, 5.5, dt);
      _camTarget.z = THREE.MathUtils.damp(_camTarget.z, lookZ, 5.5, dt);
      camera.lookAt(_camTarget);

      return {
        distanceToJesus: distPlayerToJesus,
        reachedJesus: gpState.reachedJesus,
      };
    },
  };
}
