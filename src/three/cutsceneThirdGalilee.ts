import * as THREE from 'three';
import {
  animateCharacterPose,
  buildCompanionNpc,
  buildLowPolyDisciple,
  LowPolyCharacterRig,
} from './lowPolyCharacter';
import { getProceduralTextures } from './proceduralTextures';
import {
  buildAtmosphericSkyDome,
  buildEndlessHorizonMist,
} from './skyDome';
import { CutsceneCameraMode } from './cutsceneJordan';
import { CharacterConfig } from '../types/game';

export interface RoadWalkResult {
  distanceToJesus: number;
  reachedJesus: boolean;
}

export interface ThirdCutsceneHandle {
  root: THREE.Group;
  update: (
    beatIndex: number,
    beatProgress: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
    cameraMode?: CutsceneCameraMode
  ) => void;
  resetRoadWalk: () => void;
  updateRoadWalk: (
    moveForward: number,
    moveRight: number,
    dt: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera
  ) => RoadWalkResult;
}

const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _colA = new THREE.Color();
const _colB = new THREE.Color();

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function trailCenterX(z: number): number {
  return Math.sin(z * 0.11) * 1.45 + Math.cos(z * 0.045) * 0.45;
}

function trailHeightAt(x: number, z: number): number {
  const center = trailCenterX(z);
  const distFromTrail = Math.abs(x - center);
  const trailFlatten = 1 - smoothstep(1.4, 4.2, distFromTrail);
  const gentleSlope = THREE.MathUtils.clamp((18 - z) * 0.022, -0.35, 0.78);
  const sideValleyRise = smoothstep(3.6, 13.0, distFromTrail) * 1.35;
  const rollingHills =
    (Math.sin(x * 0.21) * 0.26 + Math.cos(z * 0.16) * 0.2) *
    (1 - trailFlatten);
  return gentleSlope + sideValleyRise + rollingHills;
}

function buildGnarledFigTree(
  trunkMat: THREE.Material,
  canopyMat: THREE.Material,
  leafMat: THREE.Material
): THREE.Group {
  const tree = new THREE.Group();

  const rootBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.56, 0.72, 8),
    trunkMat
  );
  rootBase.position.y = 0.34;
  rootBase.castShadow = true;
  rootBase.receiveShadow = true;
  tree.add(rootBase);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.34, 1.55, 8),
    trunkMat
  );
  trunk.position.set(0.08, 1.32, 0);
  trunk.rotation.z = -0.14;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const boughs: [number, number, number, number, number, number][] = [
    [-0.78, 2.15, 0.26, 0.68, 0.22, 1.85],
    [0.92, 2.22, 0.18, -0.74, -0.16, 2.05],
    [-0.18, 2.38, -0.68, 0.24, 0.62, 1.75],
    [0.35, 2.32, 0.72, -0.35, -0.58, 1.7],
  ];
  boughs.forEach(([bx, by, bz, rz, rx, len]) => {
    const limb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.165, len, 6),
      trunkMat
    );
    limb.position.set(bx, by, bz);
    limb.rotation.set(rx, 0, rz);
    limb.castShadow = true;
    tree.add(limb);
  });

  const clusters: [number, number, number, number][] = [
    [0, 3.05, 0, 1.48],
    [-1.45, 2.65, 0.42, 1.18],
    [1.52, 2.7, 0.25, 1.25],
    [-0.3, 2.9, -1.18, 1.1],
    [0.52, 2.85, 1.18, 1.08],
    [0.05, 3.45, -0.12, 1.05],
  ];
  clusters.forEach(([cx, cy, cz, sc]) => {
    const dome = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.84 * sc, 1),
      canopyMat
    );
    dome.position.set(cx, cy, cz);
    dome.scale.set(1.36, 0.64, 1.22);
    dome.castShadow = true;
    dome.receiveShadow = true;
    tree.add(dome);
  });

  const sprigGeo = new THREE.PlaneGeometry(1.75, 1.38);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const rad = 0.85 + (i % 4) * 0.48;
    const sprig = new THREE.Mesh(sprigGeo, leafMat);
    sprig.position.set(
      Math.cos(a) * rad,
      2.55 + (i % 3) * 0.34,
      Math.sin(a) * rad
    );
    sprig.rotation.set(-0.38 + (i % 2) * 0.44, a, 0.22);
    sprig.castShadow = true;
    tree.add(sprig);
  }

  return tree;
}

interface AngelRig {
  group: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  baseX: number;
  baseZ: number;
  direction: 1 | -1;
  speed: number;
  phase: number;
}

function buildLowPolyAngel(
  robeMat: THREE.Material,
  wingMat: THREE.Material,
  haloMat: THREE.Material
): { group: THREE.Group; leftWing: THREE.Group; rightWing: THREE.Group } {
  const angel = new THREE.Group();

  const robe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.27, 1.05, 7),
    robeMat
  );
  robe.position.y = 0.52;
  angel.add(robe);

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.12, 0.34, 7),
    robeMat
  );
  torso.position.y = 1.12;
  angel.add(torso);

  const head = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.115, 1),
    robeMat
  );
  head.position.y = 1.41;
  angel.add(head);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.145, 0.015, 5, 14),
    haloMat
  );
  halo.rotation.x = Math.PI / 2 - 0.18;
  halo.position.set(0, 1.56, -0.02);
  angel.add(halo);

  const buildWing = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.12, 1.18, -0.08);

    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.24, 0.025),
      wingMat
    );
    inner.position.set(side * 0.24, 0.08, -0.04);
    inner.rotation.y = side * -0.32;
    inner.rotation.z = side * 0.28;
    pivot.add(inner);

    const outer = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.16, 0.02),
      wingMat
    );
    outer.position.set(side * 0.62, 0.18, -0.14);
    outer.rotation.y = side * -0.52;
    outer.rotation.z = side * 0.08;
    pivot.add(outer);

    return pivot;
  };

  const leftWing = buildWing(-1);
  const rightWing = buildWing(1);
  angel.add(leftWing);
  angel.add(rightWing);

  return { group: angel, leftWing, rightWing };
}

export function buildThirdGalileeCutscene(
  character: CharacterConfig,
  sceneLights: {
    hemiLight: THREE.HemisphereLight | null;
    keyLight: THREE.DirectionalLight | null;
    rimLight: THREE.DirectionalLight | null;
  }
): ThirdCutsceneHandle {
  const tex = getProceduralTextures();
  const root = new THREE.Group();

  // 1. Atmospheric Dawn Sky Dome transitioning into Golden Open Heaven in Cena 5
  const skySunDir = new THREE.Vector3(0.45, 0.16, -0.88).normalize();
  const dawnSky = buildAtmosphericSkyDome({
    zenithColor: 0x244c7d,
    midColor: 0x6d849c,
    horizonColor: 0xd9ad7d,
    sunColor: 0xffe6ad,
    cloudColor: 0xf4dec6,
    sunDirection: skySunDir,
    sunIntensity: 1.1,
    cloudDensity: 0.45,
  });
  root.add(dawnSky.mesh);

  const farSkirt = new THREE.Mesh(
    new THREE.PlaneGeometry(280, 280, 1, 1),
    new THREE.MeshStandardMaterial({
      color: 0x5c4c38,
      roughness: 0.96,
    })
  );
  farSkirt.rotation.x = -Math.PI / 2;
  farSkirt.position.set(0, -0.45, 22);
  root.add(farSkirt);

  const horizonMist = buildEndlessHorizonMist(
    tex.mistSoft,
    0xdcc2a3,
    1.05,
    56,
    0.4
  );
  horizonMist.group.position.z = 20;
  root.add(horizonMist.group);

  // Materials
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: tex.sandColor,
    normalMap: tex.sandNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    bumpMap: tex.stoneBump,
    bumpScale: 0.035,
    roughness: 0.94,
    flatShading: true,
  });

  const stoneWallMat = new THREE.MeshStandardMaterial({
    color: 0x897257,
    map: tex.stoneColor,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughness: 0.92,
    flatShading: true,
  });

  const mudHouseMat = new THREE.MeshStandardMaterial({
    color: 0x9c8264,
    map: tex.stoneColor,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.94,
    flatShading: true,
  });

  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x52361f,
    map: tex.woodColor,
    bumpMap: tex.woodBump,
    bumpScale: 0.032,
    roughness: 0.86,
    flatShading: true,
  });

  const figTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x4f4338,
    map: tex.barkColor,
    normalMap: tex.barkNormal,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughness: 0.92,
    flatShading: true,
  });

  const figCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x263515,
    bumpMap: tex.clayBump,
    bumpScale: 0.025,
    roughness: 0.92,
    flatShading: true,
  });

  const figLeafMat = new THREE.MeshStandardMaterial({
    color: 0x4f6428,
    map: tex.leafColor,
    alphaMap: tex.leafAlpha,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.84,
  });

  const clothSatchelMat = new THREE.MeshStandardMaterial({
    color: 0x7b5839,
    map: tex.fabricColor,
    roughness: 0.88,
    flatShading: true,
  });

  const terracottaMat = new THREE.MeshStandardMaterial({
    color: 0xa45d3f,
    bumpMap: tex.clayBump,
    bumpScale: 0.025,
    roughness: 0.76,
    flatShading: true,
  });

  // 2. Expanded Long Galilee Valley Corridor Terrain (76m x 114m)
  const terrainGeo = new THREE.PlaneGeometry(76, 114, 96, 124);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(0, 0, 22);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const vColors = new Float32Array(posAttr.count * 3);
  const colTrail = new THREE.Color(0xaf8959);
  const colRut = new THREE.Color(0x8e6b43);
  const colGrass = new THREE.Color(0x616433);
  const colWoodFloor = new THREE.Color(0x414822);
  const colShade = new THREE.Color(0x3a3b1f);

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = trailHeightAt(vx, vz);
    posAttr.setY(i, vy);

    const trailCenter = trailCenterX(vz);
    const distFromTrail = Math.abs(vx - trailCenter);
    const onTrail = 1 - smoothstep(1.15, 2.55, distFromTrail);
    const wheelRut =
      (1 - smoothstep(0.08, 0.34, Math.abs(distFromTrail - 0.58))) * onTrail;
    const woodland = smoothstep(3.1, 6.2, distFromTrail);
    const underFig = 1 - smoothstep(2.4, 4.4, Math.hypot(vx + 2.5, vz + 5.4));

    _colA.copy(colGrass).lerp(colWoodFloor, woodland * 0.78);
    _colA.lerp(colTrail, onTrail);
    _colA.lerp(colRut, wheelRut * 0.45);
    _colA.lerp(colShade, underFig * 0.55);

    vColors[i * 3] = _colA.r;
    vColors[i * 3 + 1] = _colA.g;
    vColors[i * 3 + 2] = _colA.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(vColors, 3));
  terrainGeo.computeVertexNormals();

  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  root.add(terrain);

  // 2B. Detailed Embedded Cobblestones & Stepping Pavers along the Entire Winding Road
  const cobbleCount = 175;
  const cobbleGeo = new THREE.DodecahedronGeometry(0.24, 0);
  const cobbleMat = new THREE.MeshStandardMaterial({
    color: 0xa08e73,
    map: tex.stoneColor,
    roughness: 0.9,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const cobbleInst = new THREE.InstancedMesh(cobbleGeo, cobbleMat, cobbleCount);
  cobbleInst.receiveShadow = true;
  const cDummy = new THREE.Object3D();
  for (let i = 0; i < cobbleCount; i++) {
    const cz = -7.5 + (i / cobbleCount) * 65.5;
    const laneOffset = Math.sin(i * 2.37) * 1.18;
    const cx = trailCenterX(cz) + laneOffset;
    const cy = trailHeightAt(cx, cz) + 0.025;
    cDummy.position.set(cx, cy, cz);
    cDummy.rotation.set(0, (i * 1.13) % Math.PI, 0);
    cDummy.scale.set(
      0.8 + ((i * 7) % 5) * 0.16,
      0.2,
      0.7 + ((i * 11) % 5) * 0.15
    );
    cDummy.updateMatrix();
    cobbleInst.setMatrixAt(i, cDummy.matrix);

    const tint = 0.82 + ((i * 13) % 7) * 0.05;
    _colA.setRGB(tint, tint * 0.95, tint * 0.88);
    cobbleInst.setColorAt(i, _colA);
  }
  cobbleInst.computeBoundingSphere();
  if (cobbleInst.instanceColor) cobbleInst.instanceColor.needsUpdate = true;
  root.add(cobbleInst);

  // 3. Departure Dwelling at the South End of the Long Road (z = 64)
  const houseGroup = new THREE.Group();
  const houseZ = 64.0;
  const houseX = trailCenterX(houseZ);
  const hy = trailHeightAt(houseX, houseZ);

  const houseBody = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 2.9, 4.4),
    mudHouseMat
  );
  houseBody.position.set(0, 1.45, 0);
  houseBody.castShadow = true;
  houseBody.receiveShadow = true;
  houseGroup.add(houseBody);

  const roofParapet = new THREE.Mesh(
    new THREE.BoxGeometry(6.5, 0.25, 4.7),
    stoneWallMat
  );
  roofParapet.position.set(0, 2.95, 0);
  houseGroup.add(roofParapet);

  const doorLintel = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 0.22, 0.4),
    darkWoodMat
  );
  doorLintel.position.set(0, 1.78, -2.22);
  houseGroup.add(doorLintel);

  const doorVoid = new THREE.Mesh(
    new THREE.BoxGeometry(1.12, 1.74, 0.22),
    new THREE.MeshBasicMaterial({ color: 0x0f0b08 })
  );
  doorVoid.position.set(0, 0.87, -2.2);
  houseGroup.add(doorVoid);

  houseGroup.position.set(houseX, hy, houseZ);
  root.add(houseGroup);

  // 4. Long Dry-Stone Walls & Wooden Shepherd Rail Fences along the Road
  const wallDefs: [number, number, number, number][] = [
    [trailCenterX(54.5) - 2.65, 54.5, 5.2, 0.14],
    [trailCenterX(47.2) + 2.75, 47.2, 5.4, -0.16],
    [trailCenterX(39.8) - 2.8, 39.8, 5.6, 0.12],
    [trailCenterX(31.5) + 2.8, 31.5, 5.4, -0.18],
    [trailCenterX(23.5) - 2.75, 23.5, 5.2, 0.15],
    [trailCenterX(17.5) + 2.85, 17.5, 4.8, -0.14],
    [-2.8, 11.4, 3.8, 0.14],
    [3.1, 8.2, 4.2, -0.2],
    [-3.2, 4.2, 4.0, 0.18],
    [2.9, 1.0, 4.4, -0.14],
    [2.4, -4.6, 3.6, 0.28],
  ];
  wallDefs.forEach(([wx, wz, len, rotY]) => {
    const wy = trailHeightAt(wx, wz);
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.74, len),
      stoneWallMat
    );
    wall.position.set(wx, wy + 0.34, wz);
    wall.rotation.y = rotY;
    wall.castShadow = true;
    wall.receiveShadow = true;
    root.add(wall);
  });

  // Wooden rail fence spans on opposite shoulders to alternate with stone walls
  const fenceGeo = new THREE.BoxGeometry(0.08, 0.08, 4.4);
  const postGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.82, 6);
  [
    [trailCenterX(51.0) + 2.75, 51.0, -0.1],
    [trailCenterX(43.2) - 2.75, 43.2, 0.12],
    [trailCenterX(35.6) + 2.8, 35.6, -0.14],
    [trailCenterX(27.4) - 2.8, 27.4, 0.1],
    [trailCenterX(20.0) + 2.8, 20.0, -0.12],
  ].forEach(([fx, fz, rotY]) => {
    const fy = trailHeightAt(fx, fz);
    const fence = new THREE.Group();
    const topRail = new THREE.Mesh(fenceGeo, darkWoodMat);
    topRail.position.y = 0.68;
    fence.add(topRail);
    const midRail = new THREE.Mesh(fenceGeo, darkWoodMat);
    midRail.position.y = 0.38;
    fence.add(midRail);
    [-1.9, 0, 1.9].forEach((pz) => {
      const post = new THREE.Mesh(postGeo, darkWoodMat);
      post.position.set(0, 0.4, pz);
      post.castShadow = true;
      fence.add(post);
    });
    fence.position.set(fx, fy, fz);
    fence.rotation.y = rotY;
    root.add(fence);
  });

  // Philip's dropped satchel & walking staff beside the morning stone wall (Cena 1)
  const satchelGroup = new THREE.Group();
  const sY = trailHeightAt(-1.6, 10.6);
  const satchel = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.24, 0),
    clothSatchelMat
  );
  satchel.scale.set(1.2, 0.65, 0.9);
  satchel.position.set(-1.6, sY + 0.14, 10.6);
  satchel.castShadow = true;
  satchelGroup.add(satchel);

  const basket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.34, 7),
    darkWoodMat
  );
  basket.position.set(-2.02, sY + 0.17, 10.82);
  basket.castShadow = true;
  satchelGroup.add(basket);

  const philipStaff = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 1.48, 6),
    darkWoodMat
  );
  philipStaff.position.set(-2.36, sY + 0.62, 11.12);
  philipStaff.rotation.z = -0.34;
  philipStaff.rotation.x = 0.18;
  philipStaff.castShadow = true;
  satchelGroup.add(philipStaff);

  const foldedCloak = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.12, 0.34),
    clothSatchelMat
  );
  foldedCloak.position.set(-1.82, sY + 0.06, 10.42);
  foldedCloak.rotation.y = 0.35;
  satchelGroup.add(foldedCloak);
  root.add(satchelGroup);

  // Carved Galilee stone trail milestones + roadside wooden rest bench + terracotta jars
  [
    [trailCenterX(46.0) + 2.15, 46.0],
    [trailCenterX(29.0) - 2.2, 29.0],
    [1.95, 7.2],
  ].forEach(([mx, mz]) => {
    const milestone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.27, 0.92, 7),
      stoneWallMat
    );
    milestone.position.set(mx, trailHeightAt(mx, mz) + 0.44, mz);
    milestone.castShadow = true;
    milestone.receiveShadow = true;
    root.add(milestone);
  });

  // Wayfarer wooden bench & resting jar along the expanded trail (z = 36.5)
  const restX = trailCenterX(36.5) + 2.25;
  const restY = trailHeightAt(restX, 36.5);
  const wayBench = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.1, 1.45),
    darkWoodMat
  );
  wayBench.position.set(restX, restY + 0.38, 36.5);
  wayBench.castShadow = true;
  root.add(wayBench);
  [-0.5, 0.5].forEach((oz) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.38, 0.14),
      darkWoodMat
    );
    leg.position.set(restX, restY + 0.19, 36.5 + oz);
    root.add(leg);
  });

  const oliveJarGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.1, 0),
      new THREE.Vector2(0.19, 0.18),
      new THREE.Vector2(0.08, 0.36),
      new THREE.Vector2(0.1, 0.44),
    ],
    9
  );
  [
    [houseX - 1.65, 61.2],
    [houseX + 1.65, 61.4],
    [trailCenterX(50.0) - 2.15, 50.0],
    [restX - 0.15, 35.4],
    [trailCenterX(24.0) + 2.1, 24.0],
    [-2.4, 14.5],
    [2.3, 1.5],
    [1.8, -4.1],
  ].forEach(([jx, jz]) => {
    const jar = new THREE.Mesh(oliveJarGeo, terracottaMat);
    jar.position.set(jx, trailHeightAt(jx, jz), jz);
    jar.castShadow = true;
    root.add(jar);
  });

  // 5. Hero Gnarled Fig Tree + Stone Seat + Fallen Figs & Mossy Stones (Cenas 3–5)
  const figX = -2.85;
  const figZ = -6.0;
  const figTree = buildGnarledFigTree(figTrunkMat, figCanopyMat, figLeafMat);
  figTree.position.set(figX, trailHeightAt(figX, figZ) - 0.06, figZ);
  root.add(figTree);

  const stoneBench = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.38, 0.62),
    stoneWallMat
  );
  stoneBench.position.set(-1.9, trailHeightAt(-1.9, -5.2) + 0.18, -5.2);
  stoneBench.rotation.y = 0.28;
  stoneBench.castShadow = true;
  stoneBench.receiveShadow = true;
  root.add(stoneBench);

  const fallenFigMat = new THREE.MeshStandardMaterial({
    color: 0x4b2c43,
    roughness: 0.85,
    flatShading: true,
  });
  const fallenFigGeo = new THREE.DodecahedronGeometry(0.048, 0);
  [
    [-2.45, -5.65],
    [-2.75, -5.15],
    [-2.15, -4.75],
    [-3.15, -5.45],
  ].forEach(([fx, fz]) => {
    const fig = new THREE.Mesh(fallenFigGeo, fallenFigMat);
    fig.position.set(fx, trailHeightAt(fx, fz) + 0.04, fz);
    root.add(fig);
  });

  const mossStoneMat = new THREE.MeshStandardMaterial({
    color: 0x5c6244,
    map: tex.stoneColor,
    roughness: 0.92,
    flatShading: true,
  });
  [
    [-3.55, -5.3, 0.85],
    [-1.4, -6.4, 0.72],
    [-3.4, -6.9, 1.05],
    [trailCenterX(41.5) + 2.35, 41.5, 0.9],
    [trailCenterX(28.5) - 2.4, 28.5, 0.95],
    [trailCenterX(19.0) + 2.45, 19.0, 0.8],
  ].forEach(([sx, sz, sc], idx) => {
    const ms = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.28, 0),
      mossStoneMat
    );
    ms.position.set(sx, trailHeightAt(sx, sz) + 0.12 * sc, sz);
    ms.scale.set(sc * 1.25, sc * 0.62, sc);
    ms.rotation.y = idx * 1.1;
    ms.receiveShadow = true;
    root.add(ms);
  });

  // 5B. CLOSED-IN WOODLAND FLANKS (Dense Instanced Olive Trees, Tall Cypresses & Roadside Shrubs)
  // Collect coordinates flanking both sides along z = -18..+68 while keeping the sky overhead clear for Cena 5
  const olivePositions: [number, number, number][] = [];
  const cypressPositions: [number, number, number][] = [];
  const shrubPositions: [number, number, number][] = [];

  for (let row = 0; row < 28; row++) {
    const zBase = -16.5 + row * 3.1;
    const center = trailCenterX(zBase);

    for (const side of [-1, 1] as const) {
      // Keep Fig Tree / Open Heaven focal corner unobstructed around (-2.85, -6.0)
      const nearFigClearance =
        side === -1 && zBase > -8.5 && zBase < -2.2 ? 3.2 : 0;

      // Inner roadside tree border (closes the left & right flanks tightly)
      const innerOffset =
        3.95 + ((row * 17 + (side > 0 ? 5 : 1)) % 7) * 0.22 + nearFigClearance;
      const ix = center + side * innerOffset;
      const iz = zBase + Math.sin(row * 1.9 + side) * 0.75;
      const isCypress = (row + (side > 0 ? 1 : 0)) % 3 === 0;
      const sc = 0.95 + ((row * 11 + (side > 0 ? 3 : 0)) % 5) * 0.12;
      if (isCypress) {
        cypressPositions.push([ix, iz, sc * 1.05]);
      } else {
        olivePositions.push([ix, iz, sc]);
      }

      // Second dense depth layer behind inner row
      const midOffset =
        7.1 + ((row * 13 + (side > 0 ? 4 : 2)) % 8) * 0.35 + nearFigClearance;
      const mx = center + side * midOffset;
      const mz = zBase + Math.cos(row * 1.4 - side) * 0.95;
      const msc = 1.08 + ((row * 7 + (side > 0 ? 2 : 1)) % 5) * 0.13;
      if ((row + (side > 0 ? 0 : 1)) % 3 === 1) {
        cypressPositions.push([mx, mz, msc * 1.1]);
      } else {
        olivePositions.push([mx, mz, msc]);
      }

      // Outer backdrop woodland ridge trees
      if (row % 2 === 0) {
        const farOffset = 11.4 + ((row * 9) % 6) * 0.65;
        const fx = center + side * farOffset;
        const fz = zBase + 1.1;
        olivePositions.push([fx, fz, 1.32 + (row % 3) * 0.15]);
      }

      // Dense low shrubs tucking gaps between tree trunks and stone walls
      const shOffset = 3.25 + ((row * 7 + (side > 0 ? 3 : 1)) % 5) * 0.35 + nearFigClearance * 0.6;
      shrubPositions.push([
        center + side * shOffset,
        zBase + (side > 0 ? 0.6 : -0.6),
        0.85 + (row % 4) * 0.16,
      ]);
      shrubPositions.push([
        center + side * (shOffset + 2.2),
        zBase + (side > 0 ? -0.9 : 0.8),
        1.0 + ((row + 1) % 3) * 0.22,
      ]);
    }
  }

  // Instanced Olive Trees (Trunks + Broad Multi-Shade Canopies)
  const oTrunkInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.15, 0.26, 1.65, 7),
    figTrunkMat,
    olivePositions.length
  );
  oTrunkInst.castShadow = true;
  oTrunkInst.receiveShadow = true;

  const oCrownInst = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1.12, 1),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      bumpMap: tex.clayBump,
      bumpScale: 0.03,
      roughness: 0.88,
      flatShading: true,
    }),
    olivePositions.length
  );
  oCrownInst.castShadow = true;
  oCrownInst.receiveShadow = true;

  const oCrownUpperInst = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.84, 1),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      bumpMap: tex.clayBump,
      bumpScale: 0.025,
      roughness: 0.86,
      flatShading: true,
    }),
    olivePositions.length
  );
  oCrownUpperInst.castShadow = true;

  const treeDummy = new THREE.Object3D();
  const olivePalette = [0x4c5f28, 0x5a6e32, 0x3e4f21, 0x647539];
  olivePositions.forEach(([ox, oz, sc], idx) => {
    const oy = trailHeightAt(ox, oz) - 0.05;
    treeDummy.position.set(ox, oy + 0.82 * sc, oz);
    treeDummy.rotation.set(
      Math.sin(idx * 1.7) * 0.06,
      idx * 1.1,
      Math.cos(idx * 1.3) * 0.07
    );
    treeDummy.scale.set(sc, sc, sc);
    treeDummy.updateMatrix();
    oTrunkInst.setMatrixAt(idx, treeDummy.matrix);

    treeDummy.position.set(ox, oy + 2.05 * sc, oz);
    treeDummy.scale.set(1.32 * sc, 0.78 * sc, 1.24 * sc);
    treeDummy.updateMatrix();
    oCrownInst.setMatrixAt(idx, treeDummy.matrix);
    _colA.setHex(olivePalette[idx % olivePalette.length]);
    oCrownInst.setColorAt(idx, _colA);

    treeDummy.position.set(
      ox + Math.sin(idx) * 0.25 * sc,
      oy + 2.58 * sc,
      oz + Math.cos(idx) * 0.22 * sc
    );
    treeDummy.scale.set(1.15 * sc, 0.72 * sc, 1.08 * sc);
    treeDummy.updateMatrix();
    oCrownUpperInst.setMatrixAt(idx, treeDummy.matrix);
    _colA.setHex(olivePalette[(idx + 1) % olivePalette.length]);
    oCrownUpperInst.setColorAt(idx, _colA);
  });
  oTrunkInst.computeBoundingSphere();
  oCrownInst.computeBoundingSphere();
  oCrownUpperInst.computeBoundingSphere();
  if (oCrownInst.instanceColor) oCrownInst.instanceColor.needsUpdate = true;
  if (oCrownUpperInst.instanceColor)
    oCrownUpperInst.instanceColor.needsUpdate = true;
  root.add(oTrunkInst, oCrownInst, oCrownUpperInst);

  // Instanced Tall Galilee Cypresses framing the Woodland Corridor
  const cTrunkInst = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.18, 1.5, 6),
    figTrunkMat,
    cypressPositions.length
  );
  cTrunkInst.castShadow = true;

  const cSpireInst = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.86, 4.2, 7),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      flatShading: true,
    }),
    cypressPositions.length
  );
  cSpireInst.castShadow = true;
  cSpireInst.receiveShadow = true;

  const cypressPalette = [0x2c4223, 0x324b27, 0x24381d];
  cypressPositions.forEach(([cx, cz, sc], idx) => {
    const cy = trailHeightAt(cx, cz) - 0.05;
    treeDummy.position.set(cx, cy + 0.72 * sc, cz);
    treeDummy.rotation.set(0, idx * 0.8, 0);
    treeDummy.scale.set(sc, sc, sc);
    treeDummy.updateMatrix();
    cTrunkInst.setMatrixAt(idx, treeDummy.matrix);

    treeDummy.position.set(cx, cy + 3.05 * sc, cz);
    treeDummy.scale.set(sc * 0.92, sc * 1.12, sc * 0.92);
    treeDummy.updateMatrix();
    cSpireInst.setMatrixAt(idx, treeDummy.matrix);
    _colA.setHex(cypressPalette[idx % cypressPalette.length]);
    cSpireInst.setColorAt(idx, _colA);
  });
  cTrunkInst.computeBoundingSphere();
  cSpireInst.computeBoundingSphere();
  if (cSpireInst.instanceColor) cSpireInst.instanceColor.needsUpdate = true;
  root.add(cTrunkInst, cSpireInst);

  // Instanced Roadside Shrubs filling ground-level edges
  const shrubInst = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      flatShading: true,
    }),
    shrubPositions.length
  );
  shrubInst.receiveShadow = true;
  shrubPositions.forEach(([sx, sz, sc], idx) => {
    const sy = trailHeightAt(sx, sz) + 0.16 * sc;
    treeDummy.position.set(sx, sy, sz);
    treeDummy.rotation.set(0, idx * 1.3, 0);
    treeDummy.scale.set(sc * 1.25, sc * 0.68, sc * 1.15);
    treeDummy.updateMatrix();
    shrubInst.setMatrixAt(idx, treeDummy.matrix);
    _colA.setHex(olivePalette[(idx + 2) % olivePalette.length]);
    shrubInst.setColorAt(idx, _colA);
  });
  shrubInst.computeBoundingSphere();
  if (shrubInst.instanceColor) shrubInst.instanceColor.needsUpdate = true;
  root.add(shrubInst);

  // Galilee Wildflowers (scarlet anemones & gold blossoms) bordering the entire road
  const blossomGeo = new THREE.DodecahedronGeometry(0.055, 0);
  const goldFlowerInst = new THREE.InstancedMesh(
    blossomGeo,
    new THREE.MeshStandardMaterial({
      color: 0xe8bd52,
      roughness: 0.8,
      flatShading: true,
    }),
    72
  );
  const redFlowerInst = new THREE.InstancedMesh(
    blossomGeo,
    new THREE.MeshStandardMaterial({
      color: 0xb94234,
      roughness: 0.8,
      flatShading: true,
    }),
    56
  );
  const gfDummy = new THREE.Object3D();
  for (let i = 0; i < 72; i++) {
    const fz = -6.0 + i * 0.94;
    const fx =
      trailCenterX(fz) + (i % 2 === 0 ? -2.1 : 2.15) + Math.sin(i * 2.1) * 0.5;
    gfDummy.position.set(fx, trailHeightAt(fx, fz) + 0.05, fz);
    gfDummy.scale.setScalar(0.85 + (i % 3) * 0.22);
    gfDummy.updateMatrix();
    goldFlowerInst.setMatrixAt(i, gfDummy.matrix);
  }
  goldFlowerInst.computeBoundingSphere();
  root.add(goldFlowerInst);

  for (let i = 0; i < 56; i++) {
    const rz = -4.5 + i * 1.18;
    const rx =
      trailCenterX(rz) + (i % 2 === 0 ? -2.35 : 2.0) + Math.cos(i * 1.7) * 0.45;
    gfDummy.position.set(rx, trailHeightAt(rx, rz) + 0.05, rz);
    gfDummy.scale.setScalar(0.8 + (i % 3) * 0.24);
    gfDummy.updateMatrix();
    redFlowerInst.setMatrixAt(i, gfDummy.matrix);
  }
  redFlowerInst.computeBoundingSphere();
  root.add(redFlowerInst);

  // Subtle floating morning pollen dust motes along the whole Galilee corridor
  const pollenCount = 72;
  const pollenPos = new Float32Array(pollenCount * 3);
  for (let i = 0; i < pollenCount; i++) {
    const pz = -6.5 + ((i * 41) % 66);
    pollenPos[i * 3] = trailCenterX(pz) + (((i * 37) % 9) - 4.5);
    pollenPos[i * 3 + 1] = 0.8 + ((i * 23) % 24) / 10;
    pollenPos[i * 3 + 2] = pz;
  }
  const pollenGeo = new THREE.BufferGeometry();
  pollenGeo.setAttribute('position', new THREE.BufferAttribute(pollenPos, 3));
  const morningPollen = new THREE.Points(
    pollenGeo,
    new THREE.PointsMaterial({
      color: 0xffe6b0,
      size: 0.06,
      transparent: true,
      opacity: 0.48,
    })
  );
  root.add(morningPollen);

  // 6. Low Ground Dawn Mist Blankets along the Winding Corridor
  const dawnMistMat = new THREE.MeshBasicMaterial({
    map: tex.mistSoft,
    color: 0xdce4ee,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const mistBanks: { mesh: THREE.Mesh; baseX: number; phase: number }[] = [];
  const mistCoords: [number, number, number, number][] = [
    [trailCenterX(46), 46.0, 12, 7],
    [trailCenterX(34), 34.0, 13, 7],
    [trailCenterX(22), 22.0, 12, 6.5],
    [-4.2, 11.5, 12, 6],
    [4.4, 10.5, 11, 6],
    [0.2, 7.5, 13, 6.5],
    [-4.8, 3.0, 12, 6],
    [4.2, -2.5, 12, 6],
  ];
  mistCoords.forEach(([mx, mz, mw, md], idx) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(mw, md), dawnMistMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(mx, trailHeightAt(mx, mz) + 0.34, mz);
    root.add(m);
    mistBanks.push({ mesh: m, baseX: mx, phase: idx * 1.3 });
  });

  // 7. Hero Articulated Characters
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

  const jesusGuideLight = new THREE.PointLight(0xffd78e, 0, 12, 1.5);
  root.add(jesusGuideLight);

  const philipRig = buildCompanionNpc(
    '#9a8468',
    '#3d4f38',
    '#c08760',
    '#2d1d14',
    true,
    'masculino',
    'curto_ondulado',
    'curta'
  );
  root.add(philipRig.group);

  const nathanaelRig = buildCompanionNpc(
    '#c5b293',
    '#5e402c',
    '#b98059',
    '#221610',
    true,
    'masculino',
    'longo_ombros',
    'cheia'
  );
  root.add(nathanaelRig.group);

  // 8. Open Heaven Golden Light Columns, Radiant Angels & Celestial Motes (Cena 5)
  const openHeavenGroup = new THREE.Group();
  openHeavenGroup.visible = false;
  root.add(openHeavenGroup);

  const outerBeamMat = new THREE.MeshBasicMaterial({
    color: 0xffdf94,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const outerBeam = new THREE.Mesh(
    new THREE.ConeGeometry(4.8, 22, 16, 1, true),
    outerBeamMat
  );
  outerBeam.position.set(-0.35, 11.4, -4.6);
  openHeavenGroup.add(outerBeam);

  const innerBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfff5d6,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const innerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 2.2, 22, 14, 1, true),
    innerBeamMat
  );
  innerBeam.position.set(-0.35, 11.4, -4.6);
  openHeavenGroup.add(innerBeam);

  const heavenLight = new THREE.PointLight(0xffdf96, 0, 28, 1.25);
  heavenLight.position.set(-0.35, 6.2, -4.6);
  openHeavenGroup.add(heavenLight);

  const angelRobeMat = new THREE.MeshStandardMaterial({
    color: 0xfff8ea,
    emissive: 0xffe4a0,
    emissiveIntensity: 0.95,
    roughness: 0.35,
    transparent: true,
    opacity: 0.92,
  });
  const angelWingMat = new THREE.MeshStandardMaterial({
    color: 0xfff2cf,
    emissive: 0xffd782,
    emissiveIntensity: 0.85,
    roughness: 0.4,
    transparent: true,
    opacity: 0.88,
  });
  const angelHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a6,
  });

  const angels: AngelRig[] = [];
  const angelConfigs: [number, number, 1 | -1, number][] = [
    [-1.65, -4.2, 1, 0.55],
    [1.15, -4.8, -1, 0.48],
    [-0.45, -5.8, 1, 0.62],
    [0.55, -3.5, -1, 0.52],
    [-2.4, -5.4, 1, 0.44],
    [2.0, -5.2, -1, 0.5],
  ];
  angelConfigs.forEach(([ax, az, dir, speed], idx) => {
    const built = buildLowPolyAngel(angelRobeMat, angelWingMat, angelHaloMat);
    built.group.scale.setScalar(0.88 + (idx % 2) * 0.14);
    openHeavenGroup.add(built.group);
    angels.push({
      group: built.group,
      leftWing: built.leftWing,
      rightWing: built.rightWing,
      baseX: ax,
      baseZ: az,
      direction: dir,
      speed,
      phase: idx * 1.15,
    });
  });

  const moteCount = 90;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    const ang = (i / moteCount) * Math.PI * 2 * 3.7;
    const rad = 0.6 + (((i * 37) % 100) / 100) * 3.6;
    motePositions[i * 3] = -0.35 + Math.cos(ang) * rad;
    motePositions[i * 3 + 1] = 2.0 + ((i * 71) % 160) / 10;
    motePositions[i * 3 + 2] = -4.6 + Math.sin(ang) * rad;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMat = new THREE.PointsMaterial({
    color: 0xffe9a8,
    size: 0.14,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const celestialMotes = new THREE.Points(moteGeo, moteMat);
  openHeavenGroup.add(celestialMotes);

  // Interactive Road Walk State (player catches up to Jesus & His disciples along the long road)
  const roadWalkState = {
    playerX: trailCenterX(54.0),
    playerZ: 54.0,
    playerYaw: Math.PI,
    jesusZ: 40.5,
    reached: false,
  };

  let lastShotKey = '';

  const animateAtmosphere = (elapsed: number, mistOpacity: number) => {
    dawnSky.uniforms.uTime.value = elapsed;
    horizonMist.update(elapsed);
    dawnMistMat.opacity = mistOpacity;

    for (let i = 0; i < mistBanks.length; i++) {
      const mb = mistBanks[i];
      mb.mesh.position.x =
        mb.baseX + Math.sin(elapsed * 0.18 + mb.phase) * 1.4;
    }
    morningPollen.position.y = Math.sin(elapsed * 0.45) * 0.12;
    morningPollen.position.x = Math.cos(elapsed * 0.3) * 0.18;
  };

  return {
    root,
    resetRoadWalk: () => {
      roadWalkState.playerX = trailCenterX(54.0);
      roadWalkState.playerZ = 54.0;
      roadWalkState.playerYaw = Math.PI;
      roadWalkState.jesusZ = 40.5;
      roadWalkState.reached = false;
      lastShotKey = '';
    },
    updateRoadWalk: (
      moveForward: number,
      moveRight: number,
      dt: number,
      elapsed: number,
      camera: THREE.PerspectiveCamera
    ): RoadWalkResult => {
      animateAtmosphere(elapsed, 0.3);

      // Dawn ambient lights
      dawnSky.uniforms.uZenithColor.value.setHex(0x244c7d);
      dawnSky.uniforms.uMidColor.value.setHex(0x6d849c);
      dawnSky.uniforms.uHorizonColor.value.setHex(0xd9ad7d);
      dawnSky.uniforms.uSunIntensity.value = 1.15;
      openHeavenGroup.visible = false;

      if (sceneLights.hemiLight) {
        sceneLights.hemiLight.color.setHex(0xa6c4df);
        sceneLights.hemiLight.groundColor.setHex(0x3a2c1e);
        sceneLights.hemiLight.intensity = 0.65;
      }
      if (sceneLights.keyLight) {
        sceneLights.keyLight.color.setHex(0xffcb84);
        sceneLights.keyLight.position.set(10, 10, -12);
        sceneLights.keyLight.intensity = 1.82;
      }
      if (sceneLights.rimLight) {
        sceneLights.rimLight.color.setHex(0x88b4da);
        sceneLights.rimLight.intensity = 0.46;
      }

      playerRig.group.visible = true;
      andrewRig.group.visible = true;
      jesusRig.group.visible = true;
      philipRig.group.visible = true;
      nathanaelRig.group.visible = false;

      // Grounded camera-relative movement bounded inside the tree-lined road corridor
      camera.getWorldDirection(_camForward);
      _camForward.y = 0;
      if (_camForward.lengthSq() < 1e-4) _camForward.set(0, 0, -1);
      _camForward.normalize();
      _camRight.set(-_camForward.z, 0, _camForward.x);

      let dirX = _camForward.x * moveForward + _camRight.x * moveRight;
      let dirZ = _camForward.z * moveForward + _camRight.z * moveRight;
      const inputMag = Math.hypot(dirX, dirZ);
      let isMoving = false;

      if (inputMag > 0.08 && !roadWalkState.reached) {
        const clamped = Math.min(1, inputMag);
        dirX /= inputMag;
        dirZ /= inputMag;
        const speed = 4.2 * clamped;
        const nextZ = THREE.MathUtils.clamp(
          roadWalkState.playerZ + dirZ * speed * dt,
          12.4,
          59.5
        );
        const centerAtNext = trailCenterX(nextZ);
        const nextX = THREE.MathUtils.clamp(
          roadWalkState.playerX + dirX * speed * dt,
          centerAtNext - 2.15,
          centerAtNext + 2.15
        );
        roadWalkState.playerX = nextX;
        roadWalkState.playerZ = nextZ;

        const targetYaw = Math.atan2(dirX, dirZ);
        let diff = targetYaw - roadWalkState.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        roadWalkState.playerYaw += diff * Math.min(1, dt * 10);
        isMoving = true;
      }

      const py = trailHeightAt(roadWalkState.playerX, roadWalkState.playerZ);
      playerRig.group.position.set(
        roadWalkState.playerX,
        py,
        roadWalkState.playerZ
      );
      playerRig.group.rotation.y = roadWalkState.playerYaw;
      animateCharacterPose(
        playerRig,
        elapsed,
        isMoving ? 'walk' : 'idle',
        4.8
      );

      // Jesus & Andrew walk smoothly ahead down the long road until reaching the roadside stone bend (z = 14.0),
      // staying clearly visible ahead of the player so you watch them walking between the trees and catch up!
      const jesusStopZ = 14.0;
      let jesusWalking = false;
      if (!roadWalkState.reached && roadWalkState.jesusZ > jesusStopZ) {
        // Keep Jesus within visible sight ahead (~11..15m) before pausing at the stone bend
        const leadDist = roadWalkState.playerZ - roadWalkState.jesusZ;
        if (leadDist < 14.2) {
          roadWalkState.jesusZ = Math.max(
            jesusStopZ,
            roadWalkState.jesusZ - 2.35 * dt
          );
          jesusWalking = true;
        }
      }

      const jz = roadWalkState.jesusZ;
      const jx = trailCenterX(jz);
      const jy = trailHeightAt(jx, jz);
      jesusRig.group.position.set(jx, jy, jz);

      // Andrew walks right alongside Jesus slightly to His right
      const az = jz + 0.85;
      const ax = trailCenterX(az) + 0.72;
      const ay = trailHeightAt(ax, az);
      andrewRig.group.position.set(ax, ay, az);

      // Philip waits ahead by his dropped satchel & staff beside the stone wall at z = 10.6
      const phx = -1.25;
      const phz = 10.6;
      philipRig.group.position.set(phx, trailHeightAt(phx, phz), phz);
      philipRig.group.rotation.y = 0.65;
      animateCharacterPose(philipRig, elapsed + 0.4, 'idle');

      const distToJesus = Math.hypot(
        jx - roadWalkState.playerX,
        jz - roadWalkState.playerZ
      );
      if (distToJesus <= 4.35 && jz <= 17.5) {
        roadWalkState.reached = true;
      }

      if (roadWalkState.reached) {
        const facePlayerYaw = Math.atan2(
          roadWalkState.playerX - jx,
          roadWalkState.playerZ - jz
        );
        jesusRig.group.rotation.y = facePlayerYaw;
        andrewRig.group.rotation.y = facePlayerYaw;
        animateCharacterPose(jesusRig, elapsed, 'welcome');
        animateCharacterPose(andrewRig, elapsed + 0.4, 'idle');
      } else {
        const aheadX = trailCenterX(jz - 1.5);
        const walkYaw = Math.atan2(aheadX - jx, -1.5);
        jesusRig.group.rotation.y = walkYaw;
        andrewRig.group.rotation.y = walkYaw - 0.15;
        animateCharacterPose(
          jesusRig,
          elapsed,
          jesusWalking ? 'walk' : 'idle',
          3.9
        );
        animateCharacterPose(
          andrewRig,
          elapsed + 0.35,
          jesusWalking ? 'walk' : 'idle',
          3.9
        );
      }

      jesusGuideLight.position.set(jx, jy + 1.85, jz + 0.6);
      jesusGuideLight.intensity = 2.4;

      // Grounded over-the-shoulder 3rd-person camera framing the player, the long tree-lined road, and Jesus ahead
      const behindX = roadWalkState.playerX - Math.sin(roadWalkState.playerYaw) * 3.45 + 0.65;
      const behindZ = roadWalkState.playerZ - Math.cos(roadWalkState.playerYaw) * 3.45;
      const camY = py + 2.05;

      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        behindX,
        5.0,
        dt
      );
      camera.position.y = THREE.MathUtils.damp(camera.position.y, camY, 5.0, dt);
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        behindZ,
        5.0,
        dt
      );

      const lookAheadZ = Math.max(
        jz - 1.2,
        roadWalkState.playerZ - 11.5
      );
      const lookX = THREE.MathUtils.lerp(
        roadWalkState.playerX,
        trailCenterX(lookAheadZ),
        0.65
      );
      const lookY = THREE.MathUtils.lerp(py, jy, 0.5) + 1.32;
      _camTarget.x = THREE.MathUtils.damp(_camTarget.x, lookX, 6.0, dt);
      _camTarget.y = THREE.MathUtils.damp(_camTarget.y, lookY, 6.0, dt);
      _camTarget.z = THREE.MathUtils.damp(_camTarget.z, lookAheadZ, 6.0, dt);
      camera.lookAt(_camTarget);

      return {
        distanceToJesus: distToJesus,
        reachedJesus: roadWalkState.reached,
      };
    },

    update: (
      beatIndex: number,
      beatProgress: number,
      elapsed: number,
      camera: THREE.PerspectiveCamera,
      cameraMode: CutsceneCameraMode = 'auto'
    ) => {
      jesusGuideLight.intensity = 0;

      // Open Heaven intensity curve in Cena 5 (beatIndex === 4)
      const isOpenSkyBeat = beatIndex === 4;
      const heavenT = isOpenSkyBeat ? smoothstep(0.35, 0.72, beatProgress) : 0;

      // Sky transitions cleanly from cool morning blue/amber dawn to radiant open heaven
      _colA.setHex(0x244c7d).lerp(_colB.setHex(0xefc164), heavenT * 0.85);
      dawnSky.uniforms.uZenithColor.value.copy(_colA);
      _colA.setHex(0x6d849c).lerp(_colB.setHex(0xffdfa1), heavenT * 0.88);
      dawnSky.uniforms.uMidColor.value.copy(_colA);
      _colA.setHex(0xd9ad7d).lerp(_colB.setHex(0xfff1cd), heavenT * 0.9);
      dawnSky.uniforms.uHorizonColor.value.copy(_colA);
      dawnSky.uniforms.uSunIntensity.value = 1.1 + heavenT * 2.1;

      animateAtmosphere(elapsed, Math.max(0.08, 0.34 - beatIndex * 0.055));

      if (sceneLights.hemiLight) {
        sceneLights.hemiLight.color.setHex(
          heavenT > 0.25 ? 0xffe4aa : 0xa6c4df
        );
        sceneLights.hemiLight.groundColor.setHex(0x3a2c1e);
        sceneLights.hemiLight.intensity = 0.62 + heavenT * 0.45;
      }
      if (sceneLights.keyLight) {
        sceneLights.keyLight.color.setHex(
          heavenT > 0.25 ? 0xffe7ad : 0xffcb84
        );
        sceneLights.keyLight.position.set(10, 8 + heavenT * 8, -12);
        sceneLights.keyLight.intensity = 1.78 + heavenT * 0.65;
      }
      if (sceneLights.rimLight) {
        sceneLights.rimLight.color.setHex(0x88b4da);
        sceneLights.rimLight.intensity = 0.44;
      }

      openHeavenGroup.visible = heavenT > 0.01;
      if (openHeavenGroup.visible) {
        outerBeamMat.opacity = heavenT * 0.24;
        innerBeamMat.opacity = heavenT * 0.34;
        heavenLight.intensity = heavenT * 16.0;
        moteMat.opacity = heavenT * 0.85;

        const mPos = moteGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < moteCount; i++) {
          const dir = i % 2 === 0 ? 1 : -1;
          const baseY = 2.0 + ((i * 71) % 160) / 10;
          const span = 16.0;
          const yOff = (((baseY + dir * elapsed * 1.15) % span) + span) % span;
          mPos.setY(i, 2.0 + yOff);
        }
        mPos.needsUpdate = true;

        for (let i = 0; i < angels.length; i++) {
          const ag = angels[i];
          const cycle = (((elapsed * ag.speed + ag.phase) % 10) + 10) % 10;
          const yNorm = ag.direction === 1 ? cycle / 10 : 1 - cycle / 10;
          ag.group.position.set(
            ag.baseX + Math.sin(elapsed * 0.9 + ag.phase) * 0.28,
            2.6 + yNorm * 13.5,
            ag.baseZ + Math.cos(elapsed * 0.8 + ag.phase) * 0.22
          );
          ag.group.rotation.y = Math.sin(elapsed * 0.6 + ag.phase) * 0.25;
          const flap = Math.sin(elapsed * 5.2 + ag.phase) * 0.36;
          ag.leftWing.rotation.z = 0.2 + flap;
          ag.rightWing.rotation.z = -0.2 - flap;
        }
      }

      let subShot = 0;
      let isTrackingShot = false;

      if (beatIndex === 0) {
        // Cena 1: Dawn arrival along the road; Jesus calls Philip ("Segue-me")
        nathanaelRig.group.visible = false;
        jesusRig.group.visible = true;
        playerRig.group.visible = true;
        andrewRig.group.visible = true;
        philipRig.group.visible = true;

        const walkT = smoothstep(0.0, 0.45, beatProgress);
        const followT = smoothstep(0.62, 1.0, beatProgress);

        const jz = THREE.MathUtils.lerp(13.8, 10.9, walkT) - followT * 2.2;
        const jx = trailCenterX(jz);
        jesusRig.group.position.set(jx, trailHeightAt(jx, jz), jz);
        jesusRig.group.rotation.y = followT > 0.05 ? Math.PI : -2.65;
        animateCharacterPose(
          jesusRig,
          elapsed,
          walkT < 0.98 || followT > 0.05 ? 'walk' : 'welcome',
          3.8
        );

        const pz = jz + 1.35;
        const px = jx - 0.55;
        playerRig.group.position.set(px, trailHeightAt(px, pz), pz);
        playerRig.group.rotation.y = Math.PI - 0.1;
        animateCharacterPose(
          playerRig,
          elapsed + 0.3,
          walkT < 0.98 || followT > 0.05 ? 'walk' : 'idle',
          3.8
        );

        const az = jz + 1.55;
        const ax = jx + 0.55;
        andrewRig.group.position.set(ax, trailHeightAt(ax, az), az);
        andrewRig.group.rotation.y = Math.PI + 0.1;
        animateCharacterPose(
          andrewRig,
          elapsed + 0.6,
          walkT < 0.98 || followT > 0.05 ? 'walk' : 'idle',
          3.8
        );

        const phz = THREE.MathUtils.lerp(10.6, 8.9, followT);
        const phx = THREE.MathUtils.lerp(-1.25, jx - 0.85, followT);
        philipRig.group.position.set(phx, trailHeightAt(phx, phz), phz);
        philipRig.group.rotation.y = followT > 0.05 ? Math.PI : 1.05;
        animateCharacterPose(
          philipRig,
          elapsed + 0.1,
          followT > 0.05 ? 'walk' : 'idle',
          4.0
        );

        if (beatProgress < 0.32) {
          subShot = 0;
          isTrackingShot = true;
          _desiredCamPos.set(2.4, 2.25, 16.5);
          _desiredLookAt.set(jx, 1.35, 10.6);
        } else if (beatProgress < 0.72) {
          subShot = 1;
          _desiredCamPos.set(-2.35, 1.85, 9.25);
          _desiredLookAt.set(jx, trailHeightAt(jx, jz) + 1.25, jz);
        } else {
          subShot = 2;
          isTrackingShot = true;
          _desiredCamPos.set(-2.8, 1.85, 11.4);
          _desiredLookAt.set(phx + 0.4, 1.25, phz - 1.5);
        }
      } else if (beatIndex === 1) {
        // Cena 2: Philip finds Nathanael beside the stone wall & olive grove
        jesusRig.group.visible = false;
        andrewRig.group.visible = true;
        playerRig.group.visible = true;
        philipRig.group.visible = true;
        nathanaelRig.group.visible = true;

        const phX = THREE.MathUtils.lerp(
          -0.4,
          0.95,
          smoothstep(0.0, 0.3, beatProgress)
        );
        const phZ = THREE.MathUtils.lerp(
          6.4,
          4.9,
          smoothstep(0.0, 0.3, beatProgress)
        );
        philipRig.group.position.set(phX, trailHeightAt(phX, phZ), phZ);
        philipRig.group.rotation.y = 2.85;
        animateCharacterPose(
          philipRig,
          elapsed,
          beatProgress < 0.28 ? 'walk' : 'preach',
          4.6
        );

        const nX = 1.45;
        const nZ = 3.55;
        nathanaelRig.group.position.set(nX, trailHeightAt(nX, nZ), nZ);
        nathanaelRig.group.rotation.y = -0.35;
        animateCharacterPose(nathanaelRig, elapsed + 0.5, 'idle');

        playerRig.group.position.set(-1.1, trailHeightAt(-1.1, 6.2), 6.2);
        playerRig.group.rotation.y = 2.65;
        animateCharacterPose(playerRig, elapsed, 'idle');

        andrewRig.group.position.set(-1.75, trailHeightAt(-1.75, 6.5), 6.5);
        andrewRig.group.rotation.y = 2.6;
        animateCharacterPose(andrewRig, elapsed + 0.8, 'idle');

        if (beatProgress < 0.52) {
          subShot = 0;
          _desiredCamPos.set(2.85, 1.9, 6.55);
          _desiredLookAt.set(0.95, 1.45, 4.4);
        } else {
          subShot = 1;
          _desiredCamPos.set(0.35, 1.75, 5.25);
          _desiredLookAt.set(nX, trailHeightAt(nX, nZ) + 1.38, nZ);
        }
      } else if (beatIndex === 2) {
        // Cena 3: Continuous plano-sequência walking toward Nathanael under the Fig Tree
        jesusRig.group.visible = true;
        playerRig.group.visible = true;
        andrewRig.group.visible = true;
        philipRig.group.visible = true;
        nathanaelRig.group.visible = true;

        const walkT = smoothstep(0.0, 0.56, beatProgress);
        const jz = THREE.MathUtils.lerp(3.2, -3.55, walkT);
        const jx = THREE.MathUtils.lerp(0.65, -0.45, walkT);
        jesusRig.group.position.set(jx, trailHeightAt(jx, jz), jz);
        jesusRig.group.rotation.y = walkT < 0.96 ? -2.9 : -2.42;
        animateCharacterPose(
          jesusRig,
          elapsed,
          walkT < 0.96 ? 'walk' : 'welcome',
          4.0
        );

        const pz = jz + 1.25;
        const px = jx - 0.85;
        playerRig.group.position.set(px, trailHeightAt(px, pz), pz);
        playerRig.group.rotation.y = -2.65;
        animateCharacterPose(
          playerRig,
          elapsed + 0.3,
          walkT < 0.96 ? 'walk' : 'idle',
          4.0
        );

        const az = jz + 1.35;
        const ax = jx + 0.72;
        andrewRig.group.position.set(ax, trailHeightAt(ax, az), az);
        andrewRig.group.rotation.y = -2.45;
        animateCharacterPose(
          andrewRig,
          elapsed + 0.6,
          walkT < 0.96 ? 'walk' : 'idle',
          3.9
        );

        const phz = jz + 0.55;
        const phx = jx - 1.2;
        philipRig.group.position.set(phx, trailHeightAt(phx, phz), phz);
        philipRig.group.rotation.y = -2.55;
        animateCharacterPose(
          philipRig,
          elapsed + 0.9,
          walkT < 0.96 ? 'walk' : 'idle',
          4.1
        );

        const nX = -1.9;
        const nZ = -5.2;
        nathanaelRig.group.position.set(nX, trailHeightAt(nX, nZ) + 0.14, nZ);
        nathanaelRig.group.rotation.y = 0.65;
        animateCharacterPose(
          nathanaelRig,
          elapsed,
          beatProgress > 0.72 ? 'awe' : 'sit'
        );

        if (beatProgress < 0.62) {
          subShot = 0;
          isTrackingShot = true;
          _desiredCamPos.set(
            jx + 1.85,
            trailHeightAt(jx, jz) + 1.75,
            jz + 3.4
          );
          _desiredLookAt.set(
            THREE.MathUtils.lerp(jx, nX, walkT * 0.55),
            1.45,
            THREE.MathUtils.lerp(jz - 2.0, nZ, walkT * 0.7)
          );
        } else {
          subShot = 1;
          _desiredCamPos.set(-0.35, 1.8, -3.55);
          _desiredLookAt.set(nX, trailHeightAt(nX, nZ) + 1.15, nZ);
        }
      } else if (beatIndex === 3) {
        // Cena 4: Caravaggio close-ups — "Antes de Filipe te chamar" -> "Tu és o Filho de Deus"
        jesusRig.group.visible = true;
        playerRig.group.visible = true;
        andrewRig.group.visible = true;
        philipRig.group.visible = true;
        nathanaelRig.group.visible = true;

        jesusRig.group.position.set(-0.45, trailHeightAt(-0.45, -3.55), -3.55);
        jesusRig.group.rotation.y = -2.42;
        animateCharacterPose(jesusRig, elapsed, 'welcome');

        playerRig.group.position.set(-1.3, trailHeightAt(-1.3, -2.3), -2.3);
        playerRig.group.rotation.y = -2.65;
        animateCharacterPose(playerRig, elapsed, 'idle');

        andrewRig.group.position.set(0.28, trailHeightAt(0.28, -2.2), -2.2);
        andrewRig.group.rotation.y = -2.45;
        animateCharacterPose(andrewRig, elapsed + 0.4, 'idle');

        philipRig.group.position.set(-1.65, trailHeightAt(-1.65, -3.0), -3.0);
        philipRig.group.rotation.y = -2.55;
        animateCharacterPose(philipRig, elapsed + 0.8, 'idle');

        const nX = -1.9;
        const nZ = -5.2;
        const standT = smoothstep(0.45, 0.72, beatProgress);
        nathanaelRig.group.position.set(
          nX,
          trailHeightAt(nX, nZ) + THREE.MathUtils.lerp(0.14, 0.0, standT),
          nZ
        );
        nathanaelRig.group.rotation.y = 0.65;
        animateCharacterPose(
          nathanaelRig,
          elapsed,
          standT > 0.5 ? 'awe' : 'sit'
        );

        if (beatProgress < 0.48) {
          subShot = 0;
          _desiredCamPos.set(-1.35, 2.02, -4.45);
          _desiredLookAt.set(-0.45, 1.98, -3.55);
        } else {
          subShot = 1;
          _desiredCamPos.set(-0.75, 1.95, -4.05);
          _desiredLookAt.set(nX, trailHeightAt(nX, nZ) + 1.38, nZ);
        }
      } else {
        // Cena 5: Jesus smiles & promises Open Heaven -> golden rift, angels, crane upward
        jesusRig.group.visible = true;
        playerRig.group.visible = true;
        andrewRig.group.visible = true;
        philipRig.group.visible = true;
        nathanaelRig.group.visible = true;

        jesusRig.group.position.set(-0.45, trailHeightAt(-0.45, -3.55), -3.55);
        jesusRig.group.rotation.y = -2.42;
        animateCharacterPose(jesusRig, elapsed, 'welcome');

        playerRig.group.position.set(-1.3, trailHeightAt(-1.3, -2.3), -2.3);
        playerRig.group.rotation.y = -2.65;
        animateCharacterPose(
          playerRig,
          elapsed,
          heavenT > 0.2 ? 'awe' : 'idle'
        );

        andrewRig.group.position.set(0.28, trailHeightAt(0.28, -2.2), -2.2);
        andrewRig.group.rotation.y = -2.45;
        animateCharacterPose(
          andrewRig,
          elapsed + 0.4,
          heavenT > 0.2 ? 'awe' : 'idle'
        );

        philipRig.group.position.set(-1.65, trailHeightAt(-1.65, -3.0), -3.0);
        philipRig.group.rotation.y = -2.55;
        animateCharacterPose(
          philipRig,
          elapsed + 0.7,
          heavenT > 0.2 ? 'awe' : 'idle'
        );

        nathanaelRig.group.position.set(-1.9, trailHeightAt(-1.9, -5.2), -5.2);
        nathanaelRig.group.rotation.y = 0.65;
        animateCharacterPose(nathanaelRig, elapsed, 'awe');

        if (beatProgress < 0.36) {
          subShot = 0;
          _desiredCamPos.set(-1.35, 2.02, -4.45);
          _desiredLookAt.set(-0.45, 2.0, -3.55);
        } else {
          subShot = 1;
          isTrackingShot = true;
          const craneT = smoothstep(0.36, 1.0, beatProgress);
          _desiredCamPos.set(
            THREE.MathUtils.lerp(0.6, 2.4, craneT),
            THREE.MathUtils.lerp(2.2, 11.8, craneT),
            THREE.MathUtils.lerp(1.2, 7.6, craneT)
          );
          _desiredLookAt.set(
            -0.55,
            THREE.MathUtils.lerp(1.9, 6.2, craneT),
            -4.6
          );
        }
      }

      if (cameraMode === 'aerea') {
        subShot = 91;
        _desiredCamPos.set(5.5, 11.5, 6.5);
        _desiredLookAt.set(-0.8, 1.5, -3.2);
      } else if (cameraMode === 'discipulo') {
        subShot = 92;
        isTrackingShot = true;
        const pp = playerRig.group.position;
        _desiredCamPos.set(pp.x + 2.2, pp.y + 1.85, pp.z + 2.6);
        _desiredLookAt.set(pp.x, pp.y + 1.18, pp.z - 1.5);
      }

      const shotKey = `${beatIndex}_${subShot}_${cameraMode}`;
      if (shotKey !== lastShotKey) {
        lastShotKey = shotKey;
        camera.position.copy(_desiredCamPos);
        _camTarget.copy(_desiredLookAt);
        camera.lookAt(_camTarget);
      } else if (isTrackingShot) {
        camera.position.lerp(_desiredCamPos, 0.08);
        _camTarget.lerp(_desiredLookAt, 0.1);
        camera.lookAt(_camTarget);
      } else {
        camera.position.lerp(_desiredCamPos, 0.045);
        _camTarget.lerp(_desiredLookAt, 0.065);
        camera.lookAt(_camTarget);
      }
    },
  };
}
