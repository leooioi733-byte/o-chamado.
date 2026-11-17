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

export interface WellMissionState {
  widowResolved: boolean;
  helpedWidow: boolean | null;
  wellResolved: boolean;
  wellPace: 'careful' | 'hurried' | null;
}

export interface WellMissionResult {
  nearWidow: boolean;
  nearWell: boolean;
  nearDoorReturn: boolean;
  distToWidow: number;
  distToWell: number;
  distToDoor: number;
}

export interface SecondCutsceneHandle {
  root: THREE.Group;
  update: (
    beatIndex: number,
    beatProgress: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
    cameraMode?: CutsceneCameraMode,
    missionState?: WellMissionState
  ) => void;
  resetWellMission: () => void;
  updateWellMission: (
    moveForward: number,
    moveRight: number,
    dt: number,
    elapsed: number,
    camera: THREE.PerspectiveCamera,
    missionState: WellMissionState
  ) => WellMissionResult;
}

interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const _camTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();

function roadTerrainHeight(x: number, z: number): number {
  // Subtle elevation rising gently from the Jordan road toward the stone dwelling & village lane
  const gentleSlope = THREE.MathUtils.clamp((18 - z) * 0.025, 0, 0.72);
  const crown = Math.exp(-(x * x) / 14) * -0.04;
  const sideBanks =
    Math.max(0, Math.abs(x) - 4.2) * 0.14 +
    Math.sin(x * 0.35 + z * 0.22) * 0.05;

  // Flat courtyard + house interior + east village lane to the well (x = -5..26, z = -10..3)
  const flatHouse =
    1 - THREE.MathUtils.smoothstep(Math.hypot(x, z + 3.5), 5.2, 8.8);
  const onVillageLane =
    x > -1 && x < 28
      ? 1 - THREE.MathUtils.smoothstep(Math.abs(z + 1.0), 2.8, 6.2)
      : 0;
  const flatMask = Math.max(flatHouse, onVillageLane);
  const raw = gentleSlope + crown + sideBanks;
  return THREE.MathUtils.lerp(raw, 0.45, flatMask);
}

function buildFigTree(
  trunkMat: THREE.Material,
  canopyMat: THREE.Material,
  leafMat: THREE.Material
): THREE.Group {
  const tree = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.34, 1.35, 7),
    trunkMat
  );
  trunk.position.y = 0.65;
  trunk.rotation.z = 0.1;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  const boughs: [number, number, number, number, number, number][] = [
    [-0.45, 1.38, 0.12, 0.52, 0.14, 1.15],
    [0.52, 1.42, -0.15, -0.58, -0.18, 1.2],
    [0.05, 1.48, 0.42, -0.1, -0.52, 1.05],
  ];
  boughs.forEach(([bx, by, bz, rz, rx, len]) => {
    const limb = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, len, 6),
      trunkMat
    );
    limb.position.set(bx, by, bz);
    limb.rotation.set(rx, 0, rz);
    limb.castShadow = true;
    tree.add(limb);
  });

  const clusters: [number, number, number, number][] = [
    [0, 2.15, 0, 1.05],
    [-0.88, 1.88, 0.22, 0.84],
    [0.92, 1.92, -0.18, 0.88],
    [0.12, 2.02, 0.78, 0.76],
    [-0.3, 2.25, -0.62, 0.74],
  ];
  clusters.forEach(([cx, cy, cz, sc]) => {
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72 * sc, 1),
      canopyMat
    );
    core.position.set(cx, cy, cz);
    core.scale.set(1.28, 0.7, 1.16);
    core.castShadow = true;
    core.receiveShadow = true;
    tree.add(core);
  });

  const sprigGeo = new THREE.PlaneGeometry(1.45, 1.2);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rad = 0.65 + (i % 3) * 0.38;
    const sprig = new THREE.Mesh(sprigGeo, leafMat);
    sprig.position.set(
      Math.cos(a) * rad,
      1.85 + (i % 3) * 0.26,
      Math.sin(a) * rad
    );
    sprig.rotation.set(-0.35 + (i % 2) * 0.4, a, 0.25);
    sprig.castShadow = true;
    tree.add(sprig);
  }

  return tree;
}

function buildClayPitcherMesh(mat: THREE.Material): THREE.Mesh {
  const pitcher = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.0, 0),
        new THREE.Vector2(0.11, 0),
        new THREE.Vector2(0.16, 0.16),
        new THREE.Vector2(0.075, 0.31),
        new THREE.Vector2(0.11, 0.39),
      ],
      10
    ),
    mat
  );
  pitcher.castShadow = true;
  return pitcher;
}

export function buildSecondCutsceneScene(
  character: CharacterConfig,
  sceneLights: {
    hemiLight: THREE.HemisphereLight | null;
    keyLight: THREE.DirectionalLight | null;
    rimLight: THREE.DirectionalLight | null;
  }
): SecondCutsceneHandle {
  const tex = getProceduralTextures();
  const root = new THREE.Group();

  // Atmospheric Sky Dome + Endless Valley Skirt + Distant Horizon Mist
  const duskSky = buildAtmosphericSkyDome({
    zenithColor: 0x354a66,
    midColor: 0x8d6963,
    horizonColor: 0xd4965b,
    sunColor: 0xffd289,
    cloudColor: 0xe6a677,
    sunDirection: new THREE.Vector3(-0.75, 0.14, -0.65),
    sunIntensity: 1.05,
    cloudDensity: 0.44,
  });
  root.add(duskSky.mesh);

  const farSkirt = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240, 1, 1),
    new THREE.MeshStandardMaterial({
      color: 0x4b3828,
      roughness: 0.96,
    })
  );
  farSkirt.rotation.x = -Math.PI / 2;
  farSkirt.position.set(10, 0.12, 0);
  root.add(farSkirt);

  const horizonMist = buildEndlessHorizonMist(
    tex.mistSoft,
    0xc49f7d,
    1.15,
    40,
    0.4
  );
  root.add(horizonMist.group);

  // Materials
  const roadTerrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: tex.sandColor,
    normalMap: tex.sandNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    bumpMap: tex.stoneBump,
    bumpScale: 0.035,
    roughness: 0.94,
    flatShading: true,
  });

  const houseStoneMat = new THREE.MeshStandardMaterial({
    color: 0x7c654d,
    map: tex.stoneColor,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 0.94,
    flatShading: true,
  });

  const houseInteriorWallMat = new THREE.MeshStandardMaterial({
    color: 0x3b2d21,
    map: tex.stoneColor,
    normalMap: tex.stoneNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.96,
    flatShading: true,
  });

  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x4b301c,
    map: tex.woodColor,
    bumpMap: tex.woodBump,
    bumpScale: 0.032,
    roughness: 0.86,
    flatShading: true,
  });

  const clayMat = new THREE.MeshStandardMaterial({
    color: 0x9b5a3a,
    bumpMap: tex.clayBump,
    bumpScale: 0.025,
    roughness: 0.72,
    flatShading: true,
  });

  const figTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c5045,
    map: tex.barkColor,
    normalMap: tex.barkNormal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughness: 0.92,
    flatShading: true,
  });

  const figCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x2c3b1a,
    bumpMap: tex.clayBump,
    bumpScale: 0.025,
    roughness: 0.92,
    flatShading: true,
  });

  const figLeafMat = new THREE.MeshStandardMaterial({
    color: 0x576b2d,
    map: tex.leafColor,
    alphaMap: tex.leafAlpha,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.84,
  });

  // 1. Dirt Road, Courtyard & East Village Lane Terrain (x = -20..44, z = -22..32)
  const terrainGeo = new THREE.PlaneGeometry(66, 54, 88, 72);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(10, 0, 4);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colArr = new Float32Array(posAttr.count * 3);

  const cDustRoad = new THREE.Color(0xa67c4c);
  const cDryGrass = new THREE.Color(0x5b5126);
  const cRockEdge = new THREE.Color(0x543c29);
  const _tmp = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = roadTerrainHeight(x, z);
    posAttr.setY(i, y);

    const onNorthRoad = Math.abs(x) < 1.65 && z > -2;
    const inCourtyard = Math.hypot(x, z + 1.5) < 4.5;
    const onVillageRoad = x >= -1 && x <= 26 && Math.abs(z + 1.1) < 1.8;
    if (onNorthRoad || inCourtyard || onVillageRoad) {
      _tmp.copy(cDustRoad);
    } else if (Math.abs(x) > 5.5 && !onVillageRoad) {
      _tmp.copy(cRockEdge);
    } else {
      _tmp.copy(cDryGrass);
    }
    colArr[i * 3] = _tmp.r;
    colArr[i * 3 + 1] = _tmp.g;
    colArr[i * 3 + 2] = _tmp.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  terrainGeo.computeVertexNormals();

  const ground = new THREE.Mesh(terrainGeo, roadTerrainMat);
  ground.receiveShadow = true;
  root.add(ground);

  // Collidable obstacle boxes for well mission gameplay
  const obstacleBoxes: ObstacleBox[] = [
    // Jesus's house walls
    { minX: -3.2, maxX: 3.2, minZ: -9.0, maxZ: -3.15 },
    // Fig tree trunk
    { minX: 2.5, maxX: 3.8, minZ: -2.6, maxZ: -1.3 },
    // Courtyard low walls
    { minX: -6.0, maxX: -2.4, minZ: -2.3, maxZ: -0.9 },
    // Widow resting wall
    { minX: 10.6, maxX: 12.6, minZ: 0.7, maxZ: 2.1 },
    // Village well stone ring
    { minX: 22.3, maxX: 24.7, minZ: -2.7, maxZ: -0.3 },
  ];

  // Roadside rocks & courtyard low wall
  const stoneChunkGeo = new THREE.DodecahedronGeometry(0.45, 0);
  const stoneChunkCoords: [number, number, number][] = [
    [-2.4, 15.5, 0.9],
    [2.6, 12.2, 1.1],
    [-2.8, 8.6, 1.25],
    [2.5, 5.2, 0.85],
    [-4.1, 1.8, 1.35],
    [4.4, 0.9, 1.15],
    [7.2, -3.5, 1.1],
    [15.8, -3.8, 1.25],
    [19.2, 1.8, 0.95],
  ];
  stoneChunkCoords.forEach(([sx, sz, sc], idx) => {
    const stone = new THREE.Mesh(stoneChunkGeo, houseStoneMat);
    stone.position.set(sx, roadTerrainHeight(sx, sz) + 0.18 * sc, sz);
    stone.scale.set(sc * 1.25, sc * 0.65, sc);
    stone.rotation.y = idx * 0.9;
    stone.castShadow = true;
    stone.receiveShadow = true;
    root.add(stone);
  });

  const lowWallLeft = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.62, 0.48),
    houseStoneMat
  );
  lowWallLeft.position.set(-4.2, 0.72, -1.6);
  lowWallLeft.rotation.y = 0.25;
  lowWallLeft.castShadow = true;
  lowWallLeft.receiveShadow = true;
  root.add(lowWallLeft);

  const figTree = buildFigTree(figTrunkMat, figCanopyMat, figLeafMat);
  figTree.position.set(3.25, 0.44, -2.0);
  figTree.scale.setScalar(1.08);
  root.add(figTree);

  // Additional distant olive trees along the village lane to the well
  [
    [8.2, -4.4, 0.85],
    [16.8, 3.2, 0.92],
    [26.5, -4.2, 1.0],
  ].forEach(([tx, tz, sc]) => {
    const t = buildFigTree(figTrunkMat, figCanopyMat, figLeafMat);
    t.position.set(tx, roadTerrainHeight(tx, tz), tz);
    t.scale.setScalar(sc);
    root.add(t);
  });

  // Distant silhouettes of Judean hills
  const hillGeo = new THREE.ConeGeometry(10.5, 5.8, 7);
  [
    [-16, -24],
    [0, -28],
    [18, -24],
    [34, -18],
  ].forEach(([hx, hz]) => {
    const hill = new THREE.Mesh(hillGeo, houseStoneMat);
    hill.position.set(hx, 2.3, hz);
    root.add(hill);
  });

  // 2. Simple Stone & Mudbrick House (z = -3.4 to -8.6, floor y = 0.45)
  const houseGroup = new THREE.Group();
  houseGroup.position.set(0, 0.45, -6.0);
  root.add(houseGroup);

  const houseFloor = new THREE.Mesh(
    new THREE.BoxGeometry(5.8, 0.14, 5.4),
    houseInteriorWallMat
  );
  houseFloor.position.set(0, 0.04, 0);
  houseFloor.receiveShadow = true;
  houseGroup.add(houseFloor);

  // Front Wall with LOW Doorway (1.44m tall)
  const frontLeft = new THREE.Mesh(
    new THREE.BoxGeometry(2.25, 2.75, 0.38),
    houseStoneMat
  );
  frontLeft.position.set(-1.66, 1.38, 2.52);
  frontLeft.castShadow = true;
  frontLeft.receiveShadow = true;
  houseGroup.add(frontLeft);

  const frontRight = new THREE.Mesh(
    new THREE.BoxGeometry(2.25, 2.75, 0.38),
    houseStoneMat
  );
  frontRight.position.set(1.66, 1.38, 2.52);
  frontRight.castShadow = true;
  frontRight.receiveShadow = true;
  houseGroup.add(frontRight);

  const frontHeader = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.31, 0.38),
    houseStoneMat
  );
  frontHeader.position.set(0, 2.1, 2.52);
  frontHeader.castShadow = true;
  frontHeader.receiveShadow = true;
  houseGroup.add(frontHeader);

  const doorLintel = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.14, 0.46),
    darkWoodMat
  );
  doorLintel.position.set(0, 1.46, 2.52);
  doorLintel.castShadow = true;
  houseGroup.add(doorLintel);

  [-0.55, 0.55].forEach((jx) => {
    const jamb = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 1.44, 0.44),
      darkWoodMat
    );
    jamb.position.set(jx, 0.72, 2.52);
    jamb.castShadow = true;
    houseGroup.add(jamb);
  });

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(5.8, 2.75, 0.38),
    houseInteriorWallMat
  );
  backWall.position.set(0, 1.38, -2.52);
  backWall.receiveShadow = true;
  houseGroup.add(backWall);

  const eastWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 2.75, 5.2),
    houseInteriorWallMat
  );
  eastWall.position.set(2.72, 1.38, 0);
  eastWall.receiveShadow = true;
  houseGroup.add(eastWall);

  // West Wall split cleanly around the narrow vertical SLIT WINDOW ("fresta")
  const westSouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 2.75, 2.45),
    houseInteriorWallMat
  );
  westSouth.position.set(-2.72, 1.38, 1.42);
  westSouth.castShadow = true;
  westSouth.receiveShadow = true;
  houseGroup.add(westSouth);

  const westNorth = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 2.75, 2.45),
    houseInteriorWallMat
  );
  westNorth.position.set(-2.72, 1.38, -1.42);
  westNorth.castShadow = true;
  westNorth.receiveShadow = true;
  houseGroup.add(westNorth);

  const westBelowSlit = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 1.45, 0.42),
    houseInteriorWallMat
  );
  westBelowSlit.position.set(-2.72, 0.725, 0);
  westBelowSlit.castShadow = true;
  houseGroup.add(westBelowSlit);

  const westAboveSlit = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.48, 0.42),
    houseInteriorWallMat
  );
  westAboveSlit.position.set(-2.72, 2.51, 0);
  westAboveSlit.castShadow = true;
  houseGroup.add(westAboveSlit);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(6.1, 0.24, 5.7),
    houseStoneMat
  );
  roof.position.set(0, 2.84, 0);
  roof.castShadow = true;
  roof.receiveShadow = true;
  houseGroup.add(roof);

  for (let rz = -1.8; rz <= 1.8; rz += 1.2) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(5.3, 0.14, 0.16),
      darkWoodMat
    );
    beam.position.set(0, 2.66, rz);
    houseGroup.add(beam);
  }

  // Interior Wooden Table & Benches (for Cena 6 final contemplation)
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.09, 0.96),
    darkWoodMat
  );
  tableTop.position.set(0.05, 0.68, -0.25);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  houseGroup.add(tableTop);

  [
    [-0.64, -0.64],
    [0.74, -0.64],
    [-0.64, 0.14],
    [0.74, 0.14],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.64, 0.1),
      darkWoodMat
    );
    leg.position.set(lx, 0.36, lz);
    leg.castShadow = true;
    houseGroup.add(leg);
  });

  // North bench (Jesus) + West/South seating bench (Andrew & Disciple)
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.08, 0.38),
    darkWoodMat
  );
  bench.position.set(0.05, 0.44, -0.98);
  bench.castShadow = true;
  houseGroup.add(bench);

  const benchNear = new THREE.Mesh(
    new THREE.BoxGeometry(1.38, 0.08, 0.38),
    darkWoodMat
  );
  benchNear.position.set(0.05, 0.44, 0.52);
  benchNear.castShadow = true;
  houseGroup.add(benchNear);

  // Clay Water Basin ("bacia de barro") — EMPTY beside door in Cena 3, FULL on stone floor in Cena 5
  const basinGroup = new THREE.Group();
  const basinGeo = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.19, 0.0),
      new THREE.Vector2(0.32, 0.13),
      new THREE.Vector2(0.35, 0.17),
      new THREE.Vector2(0.3, 0.17),
      new THREE.Vector2(0.18, 0.03),
      new THREE.Vector2(0.0, 0.03),
    ],
    14
  );
  const basin = new THREE.Mesh(basinGeo, clayMat);
  basin.castShadow = true;
  basin.receiveShadow = true;
  basinGroup.add(basin);

  const basinWater = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 14),
    new THREE.MeshStandardMaterial({
      color: 0x3b7670,
      roughness: 0.08,
      metalness: 0.25,
    })
  );
  basinWater.rotation.x = -Math.PI / 2;
  basinWater.position.y = 0.11;
  basinGroup.add(basinWater);

  // Subtle dark wet stone splash decals around basin (visible if filled in a hurry!)
  const splashGroup = new THREE.Group();
  const splashMat = new THREE.MeshBasicMaterial({
    color: 0x1e1812,
    transparent: true,
    opacity: 0.65,
  });
  [
    [-0.42, 0.18, 0.09],
    [0.44, -0.14, 0.08],
    [0.24, 0.41, 0.07],
    [-0.3, -0.35, 0.06],
  ].forEach(([sx, sz, sr]) => {
    const drop = new THREE.Mesh(new THREE.CircleGeometry(sr, 8), splashMat);
    drop.rotation.x = -Math.PI / 2;
    drop.position.set(sx, 0.01, sz);
    splashGroup.add(drop);
  });
  splashGroup.visible = false;
  basinGroup.add(splashGroup);

  basinGroup.position.set(-0.78, 0.11, 1.92);
  houseGroup.add(basinGroup);

  // Volumetric Caravaggio Slit Light Shaft + SpotLight inside House
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffc87a,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const slitBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.96, 3.6, 8, 1, true),
    beamMat
  );
  slitBeam.position.set(-1.1, 1.38, -0.05);
  slitBeam.rotation.z = -1.08;
  houseGroup.add(slitBeam);

  const slitSpot = new THREE.SpotLight(
    0xffbe6b,
    16,
    9.5,
    Math.PI * 0.25,
    0.65,
    1.3
  );
  slitSpot.position.set(-2.35, 2.05, 0.0);
  slitSpot.target.position.set(0.1, 0.55, 0.0);
  houseGroup.add(slitSpot);
  houseGroup.add(slitSpot.target);

  const tableBounceLight = new THREE.PointLight(0xffb45c, 0, 5.5, 1.6);
  tableBounceLight.position.set(0.05, 1.18, -0.15);
  houseGroup.add(tableBounceLight);

  // Interior personalization: woven rug, table bread/oil-lamp/cups, wall scroll shelf & corner brazier
  const linenMat = new THREE.MeshStandardMaterial({
    color: 0xb99d73,
    map: tex.fabricColor,
    bumpMap: tex.fabricBump,
    bumpScale: 0.03,
    roughness: 0.92,
    flatShading: true,
  });
  const floorRug = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.025, 2.2),
    new THREE.MeshStandardMaterial({
      color: 0x674530,
      map: tex.fabricColor,
      bumpMap: tex.fabricBump,
      bumpScale: 0.03,
      roughness: 0.92,
      flatShading: true,
    })
  );
  floorRug.position.set(0.05, 0.12, -0.2);
  floorRug.receiveShadow = true;
  houseGroup.add(floorRug);

  // Bread, cups & flickering clay oil lamp on the table
  const tableBread = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.14, 0),
    new THREE.MeshStandardMaterial({
      color: 0xc99c62,
      bumpMap: tex.clayBump,
      bumpScale: 0.028,
      roughness: 0.9,
      flatShading: true,
    })
  );
  tableBread.position.set(-0.18, 0.77, -0.22);
  tableBread.scale.set(1.3, 0.55, 1.05);
  tableBread.castShadow = true;
  houseGroup.add(tableBread);

  const cupGeo = new THREE.CylinderGeometry(0.048, 0.036, 0.09, 8);
  [
    [0.24, 0.77, -0.4],
    [-0.45, 0.77, -0.08],
    [0.42, 0.77, -0.05],
  ].forEach(([cx, cy, cz]) => {
    const cup = new THREE.Mesh(cupGeo, clayMat);
    cup.position.set(cx, cy, cz);
    houseGroup.add(cup);
  });

  const tableLamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.08, 0.06, 7),
    clayMat
  );
  tableLamp.position.set(0.06, 0.75, -0.24);
  houseGroup.add(tableLamp);
  const tableFlame = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.036, 0),
    new THREE.MeshBasicMaterial({ color: 0xffd274 })
  );
  tableFlame.position.set(0.06, 0.82, -0.24);
  houseGroup.add(tableFlame);

  // Back wall shelf with parchment scrolls + clay pitcher
  const backShelf = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.06, 0.28),
    darkWoodMat
  );
  backShelf.position.set(-1.35, 1.58, -2.22);
  houseGroup.add(backShelf);
  [-1.68, -1.45].forEach((sx) => {
    const scroll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.34, 7),
      linenMat
    );
    scroll.rotation.z = Math.PI / 2;
    scroll.position.set(sx, 1.65, -2.22);
    houseGroup.add(scroll);
  });
  const shelfPitcher = buildClayPitcherMesh(clayMat);
  shelfPitcher.scale.setScalar(0.68);
  shelfPitcher.position.set(-0.98, 1.61, -2.22);
  houseGroup.add(shelfPitcher);

  // Corner warm earthen brazier
  const cornerBrazier = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.2, 0.24, 8),
    clayMat
  );
  cornerBrazier.position.set(1.95, 0.22, -1.85);
  houseGroup.add(cornerBrazier);
  const cornerEmberMat = new THREE.MeshBasicMaterial({ color: 0xff6e28 });
  const cornerEmbers = new THREE.Mesh(
    new THREE.CircleGeometry(0.21, 8),
    cornerEmberMat
  );
  cornerEmbers.rotation.x = -Math.PI / 2;
  cornerEmbers.position.set(1.95, 0.345, -1.85);
  houseGroup.add(cornerEmbers);

  // Exterior courtyard pergola awning + flanking terracotta jars beside front wall
  [-0.95, 0.95].forEach((ax) => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, 1.75, 6),
      darkWoodMat
    );
    pole.position.set(ax, 0.88, 3.65);
    pole.castShadow = true;
    houseGroup.add(pole);
  });
  const awningCanopy = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.045, 1.28),
    linenMat
  );
  awningCanopy.position.set(0, 1.78, 3.12);
  awningCanopy.rotation.x = 0.14;
  awningCanopy.castShadow = true;
  houseGroup.add(awningCanopy);

  const porchJar1 = buildClayPitcherMesh(clayMat);
  porchJar1.scale.setScalar(1.15);
  porchJar1.position.set(1.42, 0.11, 2.86);
  houseGroup.add(porchJar1);
  const porchJar2 = buildClayPitcherMesh(clayMat);
  porchJar2.scale.setScalar(0.86);
  porchJar2.position.set(1.78, 0.11, 2.78);
  houseGroup.add(porchJar2);

  // 3. Village Road Scenery: Widow's Wall, Neighbor Huts & Stone Village Well
  const villageGroup = new THREE.Group();
  root.add(villageGroup);

  // Simple background village mudbrick houses flanking the lane to the well
  const hutSpots: [number, number, number][] = [
    [13.5, -5.8, 0.12],
    [22.0, -6.5, -0.18],
  ];
  hutSpots.forEach(([hx, hz, ry]) => {
    const hut = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.35, 3.2), houseStoneMat);
    hut.position.set(hx, roadTerrainHeight(hx, hz) + 1.15, hz);
    hut.rotation.y = ry;
    hut.castShadow = true;
    hut.receiveShadow = true;
    villageGroup.add(hut);
  });

  // Low stone ledge beside the lane where the Widow rests her heavy jar (x = 11.6, z = 1.35)
  const widowWall = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.56, 0.55),
    houseStoneMat
  );
  widowWall.position.set(11.6, 0.72, 1.35);
  widowWall.castShadow = true;
  widowWall.receiveShadow = true;
  villageGroup.add(widowWall);

  const widowJar = buildClayPitcherMesh(clayMat);
  widowJar.scale.setScalar(1.22);
  widowJar.position.set(11.2, 0.45, 0.75);
  villageGroup.add(widowJar);

  // Stone Village Well ("Poço do Vilarejo") at (23.5, 0.45, -1.5)
  const wellGroup = new THREE.Group();
  wellGroup.position.set(23.5, 0.45, -1.5);
  villageGroup.add(wellGroup);

  const wellRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.05, 0.78, 12, 1, true),
    houseStoneMat
  );
  wellRim.position.y = 0.39;
  wellRim.castShadow = true;
  wellRim.receiveShadow = true;
  wellGroup.add(wellRim);

  const wellCap = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.14, 6, 12),
    houseStoneMat
  );
  wellCap.rotation.x = Math.PI / 2;
  wellCap.position.y = 0.78;
  wellCap.castShadow = true;
  wellGroup.add(wellCap);

  const wellWater = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 12),
    new THREE.MeshStandardMaterial({
      color: 0x204748,
      roughness: 0.1,
      metalness: 0.35,
    })
  );
  wellWater.rotation.x = -Math.PI / 2;
  wellWater.position.y = 0.32;
  wellGroup.add(wellWater);

  // Timber well frame + pulley beam
  [-0.95, 0.95].forEach((px) => {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.85, 0.14),
      darkWoodMat
    );
    post.position.set(px, 0.92, 0);
    post.castShadow = true;
    wellGroup.add(post);
  });
  const crossbar = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.14, 0.14),
    darkWoodMat
  );
  crossbar.position.set(0, 1.82, 0);
  crossbar.castShadow = true;
  wellGroup.add(crossbar);

  const ropeMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.15, 5),
    new THREE.MeshStandardMaterial({ color: 0xa68960, roughness: 0.9 })
  );
  ropeMesh.position.set(0, 1.24, 0);
  wellGroup.add(ropeMesh);

  // Hanging wooden bucket & nearby water jar at the village well
  const wellBucket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.12, 0.24, 8),
    darkWoodMat
  );
  wellBucket.position.set(0, 0.72, 0);
  wellBucket.castShadow = true;
  wellGroup.add(wellBucket);

  const wellSideJar = buildClayPitcherMesh(clayMat);
  wellSideJar.scale.setScalar(1.05);
  wellSideJar.position.set(-1.25, 0.0, 0.55);
  wellGroup.add(wellSideJar);

  // Wooden cartwheel & burlap grain sacks resting by the neighbor mudbrick house
  const wheelGroup = new THREE.Group();
  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.055, 6, 12),
    darkWoodMat
  );
  wheelRim.castShadow = true;
  wheelGroup.add(wheelRim);
  for (let sp = 0; sp < 4; sp++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.88, 0.045, 0.045),
      darkWoodMat
    );
    spoke.rotation.z = (sp / 4) * Math.PI;
    wheelGroup.add(spoke);
  }
  wheelGroup.position.set(14.1, roadTerrainHeight(14.1, -4.05) + 0.45, -4.05);
  wheelGroup.rotation.x = -0.18;
  wheelGroup.rotation.y = 0.22;
  villageGroup.add(wheelGroup);

  [
    [13.1, -4.05, 1.0],
    [12.6, -4.25, 0.82],
  ].forEach(([sx, sz, sc]) => {
    const sack = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.28 * sc, 0),
      linenMat
    );
    sack.position.set(sx, roadTerrainHeight(sx, sz) + 0.2 * sc, sz);
    sack.scale.set(1.1, 0.78, 0.9);
    sack.castShadow = true;
    villageGroup.add(sack);
  });

  // Roadside wildflowers along the village lane
  const laneFlowerInst = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.06, 0),
    new THREE.MeshStandardMaterial({ color: 0xe3b856, roughness: 0.82, flatShading: true }),
    26
  );
  const lfDummy = new THREE.Object3D();
  for (let i = 0; i < 26; i++) {
    const lx = i < 10 ? (i % 2 === 0 ? -2.2 : 2.3) : 3.2 + (i - 10) * 1.25;
    const lz = i < 10 ? 2.5 + i * 1.3 : (i % 2 === 0 ? 1.85 : -3.4);
    lfDummy.position.set(lx, roadTerrainHeight(lx, lz) + 0.05, lz);
    lfDummy.scale.setScalar(0.8 + (i % 3) * 0.25);
    lfDummy.updateMatrix();
    laneFlowerInst.setMatrixAt(i, lfDummy.matrix);
  }
  lfDummy.updateMatrix();
  laneFlowerInst.computeBoundingSphere();
  villageGroup.add(laneFlowerInst);

  // Drifting golden evening fireflies visible in the dusk courtyard (Cena 6)
  const fireflyCount = 26;
  const fireflyPos = new Float32Array(fireflyCount * 3);
  const fireflyBase: [number, number, number][] = [];
  for (let i = 0; i < fireflyCount; i++) {
    const fx = -3.8 + ((i * 31) % 76) / 10;
    const fy = 0.8 + ((i * 17) % 16) / 10;
    const fz = -2.8 + ((i * 23) % 45) / 10;
    fireflyBase.push([fx, fy, fz]);
    fireflyPos[i * 3] = fx;
    fireflyPos[i * 3 + 1] = fy;
    fireflyPos[i * 3 + 2] = fz;
  }
  const fireflyGeo = new THREE.BufferGeometry();
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
  const fireflyMat = new THREE.PointsMaterial({
    color: 0xffdf78,
    size: 0.075,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const duskFireflies = new THREE.Points(fireflyGeo, fireflyMat);
  root.add(duskFireflies);

  // Subtle spatial amber floor markers (zero clutter, integrated on the ground)
  const makeFloorRing = () => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.78, 24),
      new THREE.MeshBasicMaterial({
        color: 0xeab668,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    return ring;
  };
  const widowRing = makeFloorRing();
  widowRing.position.set(11.6, 0.48, 0.15);
  widowRing.visible = false;
  root.add(widowRing);

  const wellRing = makeFloorRing();
  wellRing.scale.setScalar(1.55);
  wellRing.position.set(23.5, 0.48, -1.5);
  wellRing.visible = false;
  root.add(wellRing);

  const doorRing = makeFloorRing();
  doorRing.position.set(0.0, 0.48, -2.55);
  doorRing.visible = false;
  root.add(doorRing);

  // 4. Articulated Actors (Player, Andrew, Jesus, Widow)
  const playerRig: LowPolyCharacterRig = buildLowPolyDisciple(character);
  root.add(playerRig.group);

  // Clay pitcher attached to player when fetching water in Cena 4
  const carriedPitcher = buildClayPitcherMesh(clayMat);
  carriedPitcher.scale.setScalar(0.85);
  carriedPitcher.position.set(0, 0.05, 0.36);
  carriedPitcher.visible = false;
  playerRig.torsoGroup.add(carriedPitcher);

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

  const widowRig = buildCompanionNpc(
    '#574c44',
    '#372d26',
    '#ab7754',
    '#524a44',
    false,
    'feminino',
    'trancado_veu',
    'sem_barba'
  );
  root.add(widowRig.group);

  let lastShotKey = '';

  const gp = {
    playerX: 0.25,
    playerZ: -2.0,
    playerYaw: Math.PI / 2,
  };

  const resetWellMission = () => {
    gp.playerX = 0.25;
    gp.playerZ = -2.0;
    gp.playerYaw = Math.PI / 2;
  };

  const resolveGameplayCollision = (nx: number, nz: number): { x: number; z: number } => {
    let x = THREE.MathUtils.clamp(nx, -4.5, 26.5);
    let z = THREE.MathUtils.clamp(nz, -9.0, 5.5);
    const pad = 0.42;
    for (const box of obstacleBoxes) {
      if (
        x > box.minX - pad &&
        x < box.maxX + pad &&
        z > box.minZ - pad &&
        z < box.maxZ + pad
      ) {
        const dLeft = Math.abs(x - (box.minX - pad));
        const dRight = Math.abs(box.maxX + pad - x);
        const dTop = Math.abs(z - (box.minZ - pad));
        const dBot = Math.abs(box.maxZ + pad - z);
        const m = Math.min(dLeft, dRight, dTop, dBot);
        if (m === dLeft) x = box.minX - pad;
        else if (m === dRight) x = box.maxX + pad;
        else if (m === dTop) z = box.minZ - pad;
        else z = box.maxZ + pad;
      }
    }
    return { x, z };
  };

  const updateSkyAndLighting = (
    beatIndex: number,
    elapsed: number,
    isInterior: boolean,
    isDusk: boolean
  ) => {
    duskSky.uniforms.uTime.value = elapsed;
    duskSky.uniforms.uZenithColor.value.setHex(isDusk ? 0x161b30 : 0x354a66);
    duskSky.uniforms.uMidColor.value.setHex(isDusk ? 0x3c3452 : 0x8d6963);
    duskSky.uniforms.uHorizonColor.value.setHex(isDusk ? 0x5c3e3a : 0xd4965b);
    duskSky.uniforms.uSunIntensity.value = isDusk ? 0.35 : 1.05;
    horizonMist.update(elapsed);

    if (sceneLights.hemiLight) {
      sceneLights.hemiLight.color.setHex(isDusk ? 0x3b354a : 0x856648);
      sceneLights.hemiLight.groundColor.setHex(0x120d09);
      sceneLights.hemiLight.intensity = isInterior ? 0.13 : 0.44;
    }
    if (sceneLights.keyLight) {
      sceneLights.keyLight.color.setHex(isDusk ? 0xd97d3b : 0xffaf52);
      sceneLights.keyLight.position.set(-22, isInterior ? 5.2 : 4.8, -4);
      sceneLights.keyLight.intensity = isInterior ? 0.45 : 2.15;
    }
    if (sceneLights.rimLight) {
      sceneLights.rimLight.color.setHex(isDusk ? 0x4b5875 : 0x5d7c82);
      sceneLights.rimLight.intensity = isInterior ? 0.15 : 0.38;
    }

    slitSpot.intensity = isInterior ? (beatIndex === 5 ? 12.5 : 18.0) : 4.0;
    beamMat.opacity = isInterior
      ? beatIndex === 5
        ? 0.09
        : 0.16
      : 0.04;
    tableBounceLight.intensity = isInterior
      ? beatIndex === 5
        ? 2.4
        : 3.2
      : 0;

    tableFlame.scale.setScalar(0.9 + Math.sin(elapsed * 9.2) * 0.14);
    cornerEmberMat.color.setRGB(
      0.95 + Math.sin(elapsed * 4.8) * 0.05,
      0.38 + Math.sin(elapsed * 6.5) * 0.12,
      0.1
    );
    fireflyMat.opacity = isDusk ? 0.72 : 0.0;
    if (isDusk) {
      const fAttr = fireflyGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < fireflyCount; i++) {
        const [bx, by, bz] = fireflyBase[i];
        fAttr.setXYZ(
          i,
          bx + Math.sin(elapsed * 1.3 + i) * 0.35,
          by + Math.cos(elapsed * 1.7 + i * 0.7) * 0.22,
          bz + Math.sin(elapsed * 1.1 + i * 1.4) * 0.35
        );
      }
      fAttr.needsUpdate = true;
    }
  };

  return {
    root,
    resetWellMission,

    update: (
      beatIndex: number,
      beatProgress: number,
      elapsed: number,
      camera: THREE.PerspectiveCamera,
      cameraMode: CutsceneCameraMode = 'auto',
      missionState?: WellMissionState
    ) => {
      const isInterior = beatIndex === 2 || beatIndex >= 4;
      const isDusk = beatIndex >= 5;

      updateSkyAndLighting(beatIndex, elapsed, isInterior, isDusk);
      carriedPitcher.visible = false;
      widowRing.visible = false;
      wellRing.visible = false;
      doorRing.visible = false;

      // Default Widow placement on the village lane
      widowRig.group.visible = beatIndex >= 3;
      widowRig.group.position.set(11.6, 0.45, 0.45);
      widowRig.group.rotation.y = -Math.PI / 2;

      let subShot = 0;
      let isTracking = false;

      if (beatIndex === 0) {
        // Cena 1: "Que buscais?" — Jesus turns slowly at the start of the dirt path
        const jz = 19.0;
        const turnT = Math.min(1, beatProgress * 1.45);
        jesusRig.group.position.set(0.0, roadTerrainHeight(0, jz), jz);
        jesusRig.group.rotation.y = THREE.MathUtils.lerp(Math.PI, 0.05, turnT);
        animateCharacterPose(
          jesusRig,
          elapsed,
          turnT > 0.6 ? 'welcome' : 'idle'
        );

        playerRig.group.position.set(
          -0.42,
          roadTerrainHeight(-0.42, 21.8),
          21.8
        );
        playerRig.group.rotation.y = Math.PI - 0.15;
        animateCharacterPose(playerRig, elapsed, 'idle');

        andrewRig.group.position.set(
          0.48,
          roadTerrainHeight(0.48, 22.1),
          22.1
        );
        andrewRig.group.rotation.y = Math.PI + 0.15;
        animateCharacterPose(andrewRig, elapsed + 0.4, 'idle');

        if (beatProgress < 0.42) {
          subShot = 0;
          _desiredCamPos.set(1.15, roadTerrainHeight(1.15, 23.6) + 1.5, 23.6);
          _desiredLookAt.set(0.0, 1.38, 19.0);
        } else {
          subShot = 1;
          _desiredCamPos.set(0.75, roadTerrainHeight(0.75, 20.9) + 1.48, 20.9);
          _desiredLookAt.set(-0.22, 1.42, 19.0);
        }
      } else if (beatIndex === 1) {
        // Cena 2: "Vinde e vede" — Long tracking sequence down the dirt road all the way to the low door
        const jz = THREE.MathUtils.lerp(18.5, -4.3, beatProgress);
        const pz = jz + 2.15;
        const az = jz + 2.45;
        const isStooping = jz < -2.45 && jz > -4.2;

        jesusRig.group.position.set(0.0, roadTerrainHeight(0, jz), jz);
        jesusRig.group.rotation.y = Math.PI;
        animateCharacterPose(
          jesusRig,
          elapsed,
          isStooping ? 'stoop' : 'walk',
          3.75
        );

        playerRig.group.position.set(-0.48, roadTerrainHeight(-0.48, pz), pz);
        playerRig.group.rotation.y = Math.PI;
        animateCharacterPose(playerRig, elapsed + 0.25, 'walk', 3.75);

        andrewRig.group.position.set(0.52, roadTerrainHeight(0.52, az), az);
        andrewRig.group.rotation.y = Math.PI;
        animateCharacterPose(andrewRig, elapsed + 0.65, 'walk', 3.75);

        isTracking = true;
        subShot = 0;
        _desiredCamPos.set(
          1.75,
          roadTerrainHeight(1.75, pz + 2.9) + 1.44,
          pz + 2.9
        );
        _desiredLookAt.set(0.25, 1.05, jz - 1.2);
      } else if (beatIndex === 2) {
        // Cena 3: Empty clay basin beside the door; Jesus asks the disciple to fetch water from the village well
        basinGroup.position.set(-0.78, 0.11, 1.92);
        basinWater.visible = false;
        splashGroup.visible = false;

        jesusRig.group.position.set(-0.1, 0.56, -4.85);
        jesusRig.group.rotation.y = 0.25;
        animateCharacterPose(jesusRig, elapsed, 'welcome');

        playerRig.group.position.set(0.35, 0.56, -3.75);
        playerRig.group.rotation.y = Math.PI - 0.35;
        animateCharacterPose(playerRig, elapsed, 'idle');

        andrewRig.group.position.set(-1.12, 0.56, -4.35);
        andrewRig.group.rotation.y = Math.PI + 0.45;
        animateCharacterPose(andrewRig, elapsed + 0.4, 'idle');

        if (beatProgress < 0.45) {
          subShot = 0;
          // Caravaggio chiaroscuro framing the empty clay basin beside the low door under the slit light
          _desiredCamPos.set(1.35, 1.48, -3.85);
          _desiredLookAt.set(-0.65, 0.72, -4.1);
        } else {
          subShot = 1;
          // Rising toward Jesus's calm expression as He gently asks for water
          _desiredCamPos.set(0.95, 1.56, -3.65);
          _desiredLookAt.set(-0.1, 1.38, -4.85);
        }
      } else if (beatIndex === 4) {
        // Cena 5: Jesus kneels beside the full clay basin & washes Andrew's and the disciple's feet
        const isHurried = missionState?.wellPace === 'hurried';
        const helpedWidow = missionState?.helpedWidow === true;

        basinGroup.position.set(0.05, 0.11, 0.2);
        basinWater.visible = true;
        basinWater.position.y =
          0.11 + Math.sin(elapsed * (isHurried ? 8.5 : 2.0)) * (isHurried ? 0.008 : 0.002);
        splashGroup.visible = isHurried;

        slitSpot.target.position.set(0.05, 0.56, -0.05);

        // If helped widow, she pauses briefly in peace in the distant twilight courtyard
        if (helpedWidow) {
          widowRig.group.visible = true;
          widowRig.group.position.set(1.9, 0.45, -1.8);
          widowRig.group.rotation.y = -2.4;
          animateCharacterPose(widowRig, elapsed, 'idle');
        } else {
          widowRig.group.visible = false;
        }

        if (beatProgress < 0.48) {
          // Jesus washing Andrew's feet
          jesusRig.group.position.set(-0.42, 0.56, -5.65);
          jesusRig.group.rotation.y = 0.95;
          animateCharacterPose(jesusRig, elapsed, 'kneel');

          andrewRig.group.position.set(0.25, 0.56, -5.45);
          andrewRig.group.rotation.y = -1.25;
          animateCharacterPose(andrewRig, elapsed, 'sit');

          playerRig.group.position.set(1.15, 0.56, -4.65);
          playerRig.group.rotation.y = -2.35;
          animateCharacterPose(playerRig, elapsed, 'awe');

          subShot = 0;
          _desiredCamPos.set(0.95, 1.24, -4.25);
          _desiredLookAt.set(-0.08, 0.72, -5.7);
        } else {
          // Jesus washing the disciple's feet while speaking quietly about serving
          jesusRig.group.position.set(-0.38, 0.56, -5.68);
          jesusRig.group.rotation.y = 0.88;
          animateCharacterPose(jesusRig, elapsed, 'kneel');

          playerRig.group.position.set(0.28, 0.56, -5.45);
          playerRig.group.rotation.y = -1.25;
          animateCharacterPose(playerRig, elapsed, 'sit');

          andrewRig.group.position.set(-1.1, 0.56, -6.25);
          andrewRig.group.rotation.y = 0.55;
          animateCharacterPose(andrewRig, elapsed, 'awe');

          if (beatProgress < 0.74) {
            subShot = 1;
            _desiredCamPos.set(0.82, 1.12, -4.45);
            _desiredLookAt.set(0.0, 0.68, -5.75);
          } else {
            subShot = 2;
            _desiredCamPos.set(0.55, 1.38, -4.52);
            _desiredLookAt.set(-0.34, 1.12, -5.68);
          }
        }
      } else {
        // Cena 6: Dusk falls outside; all three sit together in silence at the wooden table
        basinGroup.position.set(-0.78, 0.11, 1.92);
        basinWater.visible = true;
        splashGroup.visible = missionState?.wellPace === 'hurried';
        widowRig.group.visible = false;
        slitSpot.target.position.set(0.05, 0.72, -0.25);

        jesusRig.group.position.set(0.05, 0.56, -6.98);
        jesusRig.group.rotation.y = 0.06;
        animateCharacterPose(jesusRig, elapsed, 'sit');

        andrewRig.group.position.set(-0.62, 0.56, -5.48);
        andrewRig.group.rotation.y = Math.PI - 0.35;
        animateCharacterPose(andrewRig, elapsed + 0.3, 'sit');

        playerRig.group.position.set(0.52, 0.56, -5.48);
        playerRig.group.rotation.y = Math.PI + 0.32;
        animateCharacterPose(playerRig, elapsed, 'sit');

        if (beatProgress < 0.46) {
          subShot = 0;
          _desiredCamPos.set(-1.55, 1.72, -4.35);
          _desiredLookAt.set(0.05, 1.24, -6.45);
        } else {
          subShot = 1;
          // Intimate look across the wooden table into Jesus's calm gaze
          _desiredCamPos.set(0.28, 1.48, -5.32);
          _desiredLookAt.set(0.05, 1.35, -6.98);
        }
      }

      if (cameraMode === 'aerea') {
        subShot = 91;
        _desiredCamPos.set(6.5, 7.2, isInterior ? -1.5 : 10.5);
        _desiredLookAt.set(0, 1.0, isInterior ? -5.8 : 6.0);
      } else if (cameraMode === 'discipulo') {
        subShot = 92;
        isTracking = true;
        const pp = playerRig.group.position;
        _desiredCamPos.set(pp.x + 1.45, pp.y + 1.65, pp.z + 1.65);
        _desiredLookAt.set(pp.x, pp.y + 1.2, pp.z - 1.5);
      }

      const shotKey = `${beatIndex}_${subShot}_${cameraMode}`;
      if (shotKey !== lastShotKey) {
        lastShotKey = shotKey;
        camera.position.copy(_desiredCamPos);
        _camTarget.copy(_desiredLookAt);
        camera.lookAt(_camTarget);
      } else if (isTracking) {
        camera.position.lerp(_desiredCamPos, 0.14);
        _camTarget.lerp(_desiredLookAt, 0.18);
        camera.lookAt(_camTarget);
      } else {
        camera.position.lerp(_desiredCamPos, 0.045);
        _camTarget.lerp(_desiredLookAt, 0.06);
        camera.lookAt(_camTarget);
      }
    },

    updateWellMission: (
      moveForward: number,
      moveRight: number,
      dt: number,
      elapsed: number,
      camera: THREE.PerspectiveCamera,
      missionState: WellMissionState
    ): WellMissionResult => {
      updateSkyAndLighting(3, elapsed, false, false);

      // Keep Jesus & Andrew peacefully inside the courtyard/doorway waiting
      jesusRig.group.position.set(-0.2, 0.56, -4.6);
      jesusRig.group.rotation.y = 0.1;
      animateCharacterPose(jesusRig, elapsed, 'idle');

      andrewRig.group.position.set(-0.95, 0.56, -4.9);
      andrewRig.group.rotation.y = 0.4;
      animateCharacterPose(andrewRig, elapsed + 0.3, 'idle');

      widowRig.group.visible = true;
      widowRig.group.position.set(11.6, 0.45, 0.45);
      widowRig.group.rotation.y = -Math.PI / 2;
      animateCharacterPose(
        widowRig,
        elapsed,
        missionState.helpedWidow ? 'idle' : 'stoop',
        0
      );
      widowJar.visible = !missionState.helpedWidow;

      // Camera-relative ground movement
      camera.getWorldDirection(_camForward);
      _camForward.y = 0;
      if (_camForward.lengthSq() < 1e-4) _camForward.set(1, 0, 0);
      _camForward.normalize();
      _camRight.set(-_camForward.z, 0, _camForward.x);

      let dirX = _camForward.x * moveForward + _camRight.x * moveRight;
      let dirZ = _camForward.z * moveForward + _camRight.z * moveRight;
      const inputMag = Math.hypot(dirX, dirZ);
      let isMoving = false;

      if (inputMag > 0.08) {
        const clamped = Math.min(1, inputMag);
        dirX /= inputMag;
        dirZ /= inputMag;
        const speed = 3.45 * clamped;
        const next = resolveGameplayCollision(
          gp.playerX + dirX * speed * dt,
          gp.playerZ + dirZ * speed * dt
        );
        gp.playerX = next.x;
        gp.playerZ = next.z;

        const targetYaw = Math.atan2(dirX, dirZ);
        let diff = targetYaw - gp.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        gp.playerYaw += diff * Math.min(1, dt * 10);
        isMoving = true;
      }

      const py = roadTerrainHeight(gp.playerX, gp.playerZ);
      playerRig.group.position.set(gp.playerX, py, gp.playerZ);
      playerRig.group.rotation.y = gp.playerYaw;

      const hasWater = missionState.wellResolved;
      carriedPitcher.visible = true;
      animateCharacterPose(
        playerRig,
        elapsed,
        hasWater ? 'carry' : isMoving ? 'walk' : 'idle',
        isMoving ? 4.8 : 0
      );

      const distToWidow = Math.hypot(gp.playerX - 11.6, gp.playerZ - 0.15);
      const distToWell = Math.hypot(gp.playerX - 23.5, gp.playerZ + 1.5);
      const distToDoor = Math.hypot(gp.playerX - 0.0, gp.playerZ + 2.55);

      const nearWidow = !missionState.widowResolved && distToWidow < 2.65;
      const nearWell = !missionState.wellResolved && distToWell < 2.95;
      const nearDoorReturn = missionState.wellResolved && distToDoor < 2.45;

      // Discreet spatial floor indicators integrated onto the stone/dust
      widowRing.visible = !missionState.widowResolved;
      widowRing.scale.setScalar(1 + Math.sin(elapsed * 2.5) * 0.06);
      wellRing.visible = !missionState.wellResolved;
      wellRing.scale.setScalar(1.55 + Math.sin(elapsed * 2.5) * 0.08);
      doorRing.visible = missionState.wellResolved;
      doorRing.scale.setScalar(1 + Math.sin(elapsed * 2.5) * 0.06);

      // Smooth grounded 3rd-person camera framing player along the village road
      const lookTargetX = hasWater
        ? gp.playerX - 2.4
        : gp.playerX + 2.6;
      const camOffsetX = hasWater ? gp.playerX + 3.2 : gp.playerX - 3.6;

      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        camOffsetX,
        4.4,
        dt
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        py + 2.35,
        4.4,
        dt
      );
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        gp.playerZ + 3.85,
        4.4,
        dt
      );

      _camTarget.x = THREE.MathUtils.damp(_camTarget.x, lookTargetX, 5.2, dt);
      _camTarget.y = THREE.MathUtils.damp(_camTarget.y, py + 1.15, 5.2, dt);
      _camTarget.z = THREE.MathUtils.damp(_camTarget.z, gp.playerZ - 0.25, 5.2, dt);
      camera.lookAt(_camTarget);

      return {
        nearWidow,
        nearWell,
        nearDoorReturn,
        distToWidow,
        distToWell,
        distToDoor,
      };
    },
  };
}
