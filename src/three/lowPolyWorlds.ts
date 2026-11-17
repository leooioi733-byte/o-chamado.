import * as THREE from 'three';
import { getProceduralTextures } from './proceduralTextures';
import {
  buildAtmosphericSkyDome,
  buildEndlessHorizonMist,
} from './skyDome';
import { SceneBackdropKey } from '../types/game';

export interface LowPolyWorldHandle {
  worldGroup: THREE.Group;
  update: (elapsed: number) => void;
  fogColor: number;
  fogDensity: number;
  backgroundColor: number;
  defaultCameraPos: THREE.Vector3;
  defaultTarget: THREE.Vector3;
}

function buildLowPolyBoat(): THREE.Group {
  const tex = getProceduralTextures();
  const boat = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x7b5234,
    map: tex.woodColor,
    bumpMap: tex.woodBump,
    bumpScale: 0.035,
    roughness: 0.82,
    metalness: 0.04,
    flatShading: true,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x523420,
    map: tex.woodColor,
    bumpMap: tex.woodBump,
    bumpScale: 0.03,
    roughness: 0.76,
    metalness: 0.05,
    flatShading: true,
  });

  const netMat = new THREE.MeshStandardMaterial({
    color: 0xc2a77e,
    map: tex.fabricColor,
    bumpMap: tex.fabricBump,
    bumpScale: 0.04,
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true,
  });

  const hullGeo = new THREE.CylinderGeometry(0.95, 0.56, 3.3, 6, 1, false);
  hullGeo.rotateZ(Math.PI / 2);
  hullGeo.scale(1, 0.55, 0.72);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 0.28;
  hull.castShadow = true;
  hull.receiveShadow = true;
  boat.add(hull);

  const deckGeo = new THREE.CylinderGeometry(0.76, 0.45, 2.75, 6);
  deckGeo.rotateZ(Math.PI / 2);
  deckGeo.scale(1, 0.16, 0.62);
  const deck = new THREE.Mesh(deckGeo, trimMat);
  deck.position.y = 0.52;
  boat.add(deck);

  const postGeo = new THREE.BoxGeometry(0.16, 0.68, 0.16);
  const bowPost = new THREE.Mesh(postGeo, trimMat);
  bowPost.position.set(1.62, 0.56, 0);
  bowPost.rotation.z = -0.22;
  bowPost.castShadow = true;
  boat.add(bowPost);

  const sternPost = new THREE.Mesh(postGeo, trimMat);
  sternPost.position.set(-1.62, 0.52, 0);
  sternPost.rotation.z = 0.2;
  sternPost.castShadow = true;
  boat.add(sternPost);

  const benchGeo = new THREE.BoxGeometry(0.28, 0.08, 1.05);
  const bench1 = new THREE.Mesh(benchGeo, trimMat);
  bench1.position.set(0.45, 0.62, 0);
  bench1.castShadow = true;
  boat.add(bench1);

  const bench2 = new THREE.Mesh(benchGeo, trimMat);
  bench2.position.set(-0.55, 0.62, 0);
  bench2.castShadow = true;
  boat.add(bench2);

  const netBundle = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.36, 0),
    netMat
  );
  netBundle.position.set(-0.08, 0.68, 0.12);
  netBundle.scale.set(1.2, 0.65, 0.95);
  netBundle.castShadow = true;
  boat.add(netBundle);

  const oarShaftGeo = new THREE.CylinderGeometry(0.032, 0.032, 2.5, 5);
  oarShaftGeo.rotateZ(Math.PI / 2);
  const oarShaft = new THREE.Mesh(oarShaftGeo, trimMat);
  oarShaft.position.set(0.1, 0.72, -0.18);
  oarShaft.rotation.y = 0.14;
  boat.add(oarShaft);

  const oarBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.04, 0.18),
    hullMat
  );
  oarBlade.position.set(-1.12, 0.72, -0.02);
  oarBlade.rotation.y = 0.14;
  boat.add(oarBlade);

  return boat;
}

function buildLowPolyReedCluster(count: number, radius: number): THREE.Group {
  const tex = getProceduralTextures();
  const cluster = new THREE.Group();
  const reedMat = new THREE.MeshStandardMaterial({
    color: 0x6f7c49,
    bumpMap: tex.fabricBump,
    bumpScale: 0.015,
    roughness: 0.85,
    flatShading: true,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0x5c4228,
    roughness: 0.9,
    flatShading: true,
  });

  const stalkGeo = new THREE.CylinderGeometry(0.02, 0.035, 1.35, 4);
  const tipGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.24, 5);

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + i * 0.7;
    const dist = (0.2 + ((i * 37) % 100) / 100) * radius;
    const hScale = 0.75 + ((i * 53) % 50) / 100;

    const reed = new THREE.Group();
    const stalk = new THREE.Mesh(stalkGeo, reedMat);
    stalk.position.y = 0.65 * hScale;
    stalk.scale.y = hScale;
    stalk.castShadow = true;
    reed.add(stalk);

    if (i % 2 === 0) {
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.y = 1.24 * hScale;
      reed.add(tip);
    }

    reed.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
    reed.rotation.z = Math.sin(i * 1.9) * 0.12;
    reed.rotation.x = Math.cos(i * 1.3) * 0.1;
    cluster.add(reed);
  }

  return cluster;
}

function buildOliveTree(): THREE.Group {
  const tex = getProceduralTextures();
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x634b38,
    map: tex.woodColor,
    bumpMap: tex.woodBump,
    bumpScale: 0.04,
    roughness: 0.92,
    flatShading: true,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x647754,
    bumpMap: tex.fabricBump,
    bumpScale: 0.02,
    roughness: 0.82,
    flatShading: true,
  });

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.28, 1.8, 6),
    trunkMat
  );
  trunk.position.y = 0.9;
  trunk.rotation.z = 0.08;
  trunk.castShadow = true;
  tree.add(trunk);

  const canopyGeo = new THREE.IcosahedronGeometry(0.95, 0);
  const canopyOffsets: [number, number, number, number][] = [
    [0, 2.05, 0, 1.05],
    [-0.65, 1.8, 0.3, 0.75],
    [0.65, 1.85, -0.25, 0.8],
    [0.1, 2.35, -0.35, 0.7],
  ];
  canopyOffsets.forEach(([x, y, z, s]) => {
    const c = new THREE.Mesh(canopyGeo, leafMat);
    c.position.set(x, y, z);
    c.scale.set(s, s * 0.72, s);
    c.castShadow = true;
    tree.add(c);
  });

  return tree;
}

function buildTerracottaAmphora(
  mat: THREE.Material,
  scale = 1
): THREE.Mesh {
  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.09 * scale, 0),
    new THREE.Vector2(0.18 * scale, 0.16 * scale),
    new THREE.Vector2(0.16 * scale, 0.3 * scale),
    new THREE.Vector2(0.065 * scale, 0.4 * scale),
    new THREE.Vector2(0.095 * scale, 0.48 * scale),
    new THREE.Vector2(0.065 * scale, 0.48 * scale),
  ];
  const jar = new THREE.Mesh(new THREE.LatheGeometry(pts, 9), mat);
  jar.castShadow = true;
  jar.receiveShadow = true;
  return jar;
}

interface GlidingBird {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  centerX: number;
  centerZ: number;
  baseY: number;
  radius: number;
  speed: number;
  phase: number;
}

function buildGlidingBird(colorHex: number): {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
} {
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.78,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.24, 5), mat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const wingGeo = new THREE.PlaneGeometry(0.28, 0.08);
  const leftWing = new THREE.Mesh(wingGeo, mat);
  leftWing.position.set(-0.14, 0.01, 0.02);
  leftWing.rotation.x = -Math.PI / 2;
  group.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, mat);
  rightWing.position.set(0.14, 0.01, 0.02);
  rightWing.rotation.x = -Math.PI / 2;
  group.add(rightWing);

  return { group, leftWing, rightWing };
}

export function buildLowPolyWorld(
  kind: SceneBackdropKey
): LowPolyWorldHandle {
  const tex = getProceduralTextures();
  const worldGroup = new THREE.Group();

  if (kind === 'dawn_shore' || kind === 'galilee_waters') {
    const isDawn = kind === 'dawn_shore';
    const backgroundColor = isDawn ? 0xd89968 : 0xcb9164;
    const fogColor = isDawn ? 0xd49668 : 0xc68e62;

    // Realistic atmospheric gradient sky dome with glowing dawn sun & drifting high clouds
    const sky = buildAtmosphericSkyDome({
      zenithColor: isDawn ? 0x263f5e : 0x2e4e6e,
      midColor: isDawn ? 0x896b75 : 0x7a757e,
      horizonColor: fogColor,
      sunColor: 0xffe4a8,
      cloudColor: 0xf4c291,
      sunDirection: new THREE.Vector3(0.06, 0.13, -1.0),
      sunIntensity: isDawn ? 1.15 : 0.95,
      cloudDensity: 0.46,
    });
    worldGroup.add(sky.mesh);

    // Endless outer sea plane extending into the misty horizon (zero cut-off edge)
    const farSeaMat = new THREE.MeshStandardMaterial({
      color: isDawn ? 0x2a5c65 : 0x24555e,
      roughness: 0.28,
      metalness: 0.24,
    });
    const farSea = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240, 1, 1),
      farSeaMat
    );
    farSea.rotation.x = -Math.PI / 2;
    farSea.position.set(0, -0.06, -30);
    worldGroup.add(farSea);

    const waterGeo = new THREE.PlaneGeometry(86, 76, 44, 38);
    waterGeo.rotateX(-Math.PI / 2);
    const waterBaseY = new Float32Array(waterGeo.attributes.position.count);
    for (let i = 0; i < waterBaseY.length; i++) {
      waterBaseY[i] = waterGeo.attributes.position.getY(i);
    }

    const waterMat = new THREE.MeshStandardMaterial({
      color: isDawn ? 0x2a5c65 : 0x24555e,
      normalMap: tex.waterNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.2,
      metalness: 0.28,
      flatShading: true,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, 0, -8);
    water.receiveShadow = true;
    worldGroup.add(water);

    // Endless horizon mist banks covering the distant sea & shoreline
    const horizonMist = buildEndlessHorizonMist(
      tex.mistSoft,
      isDawn ? 0xe5bfa0 : 0xdcc0a3,
      0.9,
      36,
      0.42
    );
    worldGroup.add(horizonMist.group);

    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xcfa978,
      map: tex.sandColor,
      bumpMap: tex.sandBump,
      bumpScale: 0.03,
      roughness: 0.92,
      metalness: 0.0,
      flatShading: true,
    });
    const beach = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 18, 1.4, 14),
      beachMat
    );
    beach.position.set(8.5, -0.42, 7.2);
    beach.scale.set(1.25, 1, 0.82);
    beach.receiveShadow = true;
    worldGroup.add(beach);

    const foreSand = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 10, 1.2, 10),
      beachMat
    );
    foreSand.position.set(-2.5, -0.55, 10.5);
    foreSand.scale.set(1.4, 1, 0.7);
    foreSand.receiveShadow = true;
    worldGroup.add(foreSand);

    const hillMat = new THREE.MeshStandardMaterial({
      color: isDawn ? 0x735547 : 0x6d5c48,
      map: tex.stoneColor,
      bumpMap: tex.stoneBump,
      bumpScale: 0.04,
      roughness: 0.95,
      flatShading: true,
    });
    const hillPositions: [number, number, number, number, number][] = [
      [-26, 1.5, -36, 13, 5.2],
      [-9, 1.0, -40, 16, 4.2],
      [11, 1.8, -37, 15, 6.0],
      [30, 2.2, -34, 17, 6.8],
    ];
    hillPositions.forEach(([x, y, z, r, h]) => {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), hillMat);
      hill.position.set(x, y, z);
      hill.rotation.y = x * 0.2;
      worldGroup.add(hill);
    });

    const boat = buildLowPolyBoat();
    boat.position.set(3.2, -0.04, 1.4);
    boat.rotation.y = -0.58;
    worldGroup.add(boat);

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x5c3e28,
      map: tex.woodColor,
      bumpMap: tex.woodBump,
      bumpScale: 0.03,
      roughness: 0.88,
      flatShading: true,
    });
    const mooringPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 1.15, 6),
      postMat
    );
    mooringPost.position.set(5.4, 0.45, 3.1);
    mooringPost.rotation.z = -0.1;
    mooringPost.castShadow = true;
    worldGroup.add(mooringPost);

    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 2.55, 5),
      new THREE.MeshStandardMaterial({
        color: 0xb7996e,
        bumpMap: tex.fabricBump,
        bumpScale: 0.02,
        roughness: 0.9,
        flatShading: true,
      })
    );
    rope.position.set(4.5, 0.56, 2.35);
    rope.rotation.z = Math.PI / 2 - 0.14;
    rope.rotation.y = 0.65;
    worldGroup.add(rope);

    if (!isDawn) {
      const pierMat = new THREE.MeshStandardMaterial({
        color: 0x938674,
        map: tex.stoneColor,
        bumpMap: tex.stoneBump,
        bumpScale: 0.035,
        roughness: 0.9,
        flatShading: true,
      });
      const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 6.2), pierMat);
      pier.position.set(-4.2, 0.18, 2.2);
      pier.rotation.y = 0.25;
      pier.castShadow = true;
      pier.receiveShadow = true;
      worldGroup.add(pier);
    }

    const rockGeo = new THREE.DodecahedronGeometry(0.35, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x857461,
      map: tex.stoneColor,
      bumpMap: tex.stoneBump,
      bumpScale: 0.035,
      roughness: 0.9,
      flatShading: true,
    });
    const rockCoords: [number, number, number, number][] = [
      [4.9, 0.15, 4.3, 1.1],
      [5.7, 0.2, 3.8, 0.75],
      [2.2, 0.06, 4.7, 0.9],
      [6.4, 0.24, 2.2, 1.3],
      [-2.8, 0.04, 5.8, 0.85],
      [4.1, 0.14, 5.5, 0.65],
      [7.2, 0.28, 0.5, 1.4],
    ];
    const rockInst = new THREE.InstancedMesh(
      rockGeo,
      rockMat,
      rockCoords.length
    );
    const dummy = new THREE.Object3D();
    rockCoords.forEach(([x, y, z, s], idx) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(idx * 0.6, idx * 1.1, idx * 0.3);
      dummy.scale.set(s * 1.2, s * 0.7, s);
      dummy.updateMatrix();
      rockInst.setMatrixAt(idx, dummy.matrix);
    });
    rockInst.castShadow = true;
    rockInst.receiveShadow = true;
    rockInst.computeBoundingSphere();
    worldGroup.add(rockInst);

    const reedsRight = buildLowPolyReedCluster(9, 0.9);
    reedsRight.position.set(6.8, 0.15, 1.4);
    worldGroup.add(reedsRight);

    const olive = buildOliveTree();
    olive.position.set(8.6, 0.25, 3.6);
    olive.scale.setScalar(1.05);
    worldGroup.add(olive);

    // Personalized shore props: terracotta amphorae, fish crate, lantern on post & drift log
    const shoreClayMat = new THREE.MeshStandardMaterial({
      color: 0xb06647,
      bumpMap: tex.clayBump,
      bumpScale: 0.028,
      roughness: 0.74,
      flatShading: true,
    });
    const amphora1 = buildTerracottaAmphora(shoreClayMat, 1.15);
    amphora1.position.set(6.05, 0.28, 3.25);
    worldGroup.add(amphora1);

    const amphora2 = buildTerracottaAmphora(shoreClayMat, 0.88);
    amphora2.position.set(5.72, 0.26, 3.68);
    amphora2.rotation.z = 0.12;
    worldGroup.add(amphora2);

    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.48), postMat);
    crate.position.set(4.85, 0.35, 3.72);
    crate.rotation.y = 0.38;
    crate.castShadow = true;
    crate.receiveShadow = true;
    worldGroup.add(crate);

    // Three low-poly silver fish peeking from the woven basket/crate
    const fishMat = new THREE.MeshStandardMaterial({
      color: 0x9aa9b2,
      roughness: 0.38,
      metalness: 0.35,
      flatShading: true,
    });
    const fishGeo = new THREE.ConeGeometry(0.05, 0.26, 5);
    fishGeo.rotateZ(Math.PI / 2);
    [-0.14, 0.02, 0.16].forEach((fx, i) => {
      const fish = new THREE.Mesh(fishGeo, fishMat);
      fish.position.set(4.85 + fx * 0.7, 0.54, 3.72 + (i - 1) * 0.08);
      fish.rotation.y = 0.2 + i * 0.4;
      worldGroup.add(fish);
    });

    // Glowing lantern hanging beside the mooring post
    const lanternArm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.05), postMat);
    lanternArm.position.set(5.26, 0.94, 3.1);
    worldGroup.add(lanternArm);
    const lanternGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.065, 0.16, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd27a })
    );
    lanternGlow.position.set(5.12, 0.82, 3.1);
    worldGroup.add(lanternGlow);

    // Floating marsh lily pads beside the reeds
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x4b6a38,
      roughness: 0.82,
      flatShading: true,
    });
    const padGeo = new THREE.CircleGeometry(0.24, 7);
    [
      [6.1, 0.03, 0.95, 1.0],
      [6.5, 0.03, 0.55, 0.78],
      [5.8, 0.03, 0.32, 0.85],
    ].forEach(([px, py, pz, sc], idx) => {
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = idx * 0.9;
      pad.scale.setScalar(sc);
      pad.position.set(px, py, pz);
      worldGroup.add(pad);
    });

    // Stylized circling dawn sea birds
    const seaBirds: GlidingBird[] = [
      { ...buildGlidingBird(0xf2e4cf), centerX: 1.5, centerZ: -12, baseY: 4.8, radius: 7.5, speed: 0.32, phase: 0.2 },
      { ...buildGlidingBird(0xe8d5bc), centerX: -3.0, centerZ: -15, baseY: 5.5, radius: 8.8, speed: 0.27, phase: 2.1 },
      { ...buildGlidingBird(0xf2e4cf), centerX: 5.0, centerZ: -18, baseY: 6.1, radius: 9.2, speed: 0.24, phase: 4.4 },
    ];
    seaBirds.forEach((b) => worldGroup.add(b.group));

    const moteCount = 36;
    const motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = ((i * 73) % 18) - 8;
      motePos[i * 3 + 1] = 0.5 + ((i * 29) % 45) / 10;
      motePos[i * 3 + 2] = ((i * 47) % 14) - 6;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const motes = new THREE.Points(
      moteGeo,
      new THREE.PointsMaterial({
        color: 0xffdf9e,
        size: 0.09,
        transparent: true,
        opacity: 0.65,
      })
    );
    worldGroup.add(motes);

    const posAttr = waterGeo.attributes.position as THREE.BufferAttribute;

    return {
      worldGroup,
      fogColor,
      fogDensity: 0.026,
      backgroundColor,
      defaultCameraPos: new THREE.Vector3(-1.4, 2.35, 9.2),
      defaultTarget: new THREE.Vector3(1.8, 0.75, 0.8),
      update: (elapsed: number) => {
        sky.uniforms.uTime.value = elapsed;
        horizonMist.update(elapsed);
        tex.waterNormal.offset.set(elapsed * 0.015, elapsed * 0.01);

        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const z = posAttr.getZ(i);
          const wave =
            Math.sin(x * 0.42 + elapsed * 1.15) * 0.09 +
            Math.cos(z * 0.55 + elapsed * 0.9) * 0.07;
          posAttr.setY(i, waterBaseY[i] + wave);
        }
        posAttr.needsUpdate = true;
        waterGeo.computeVertexNormals();

        boat.position.y = -0.04 + Math.sin(elapsed * 1.25) * 0.055;
        boat.rotation.z = Math.sin(elapsed * 0.95) * 0.035;
        boat.rotation.x = Math.cos(elapsed * 1.1) * 0.025;
        reedsRight.rotation.z = Math.sin(elapsed * 1.4) * 0.04;
        motes.position.y = Math.sin(elapsed * 0.4) * 0.18;
        lanternGlow.scale.setScalar(0.95 + Math.sin(elapsed * 8.5) * 0.08);

        seaBirds.forEach((b) => {
          const ang = elapsed * b.speed + b.phase;
          b.group.position.set(
            b.centerX + Math.cos(ang) * b.radius,
            b.baseY + Math.sin(elapsed * 1.4 + b.phase) * 0.25,
            b.centerZ + Math.sin(ang) * b.radius
          );
          b.group.rotation.y = -ang;
          const flap = Math.sin(elapsed * 5.2 + b.phase) * 0.34;
          b.leftWing.rotation.z = flap;
          b.rightWing.rotation.z = -flap;
        });
      },
    };
  }

  if (kind === 'jordan_river') {
    const backgroundColor = 0xd6a36e;
    const fogColor = 0xd29e68;

    const sky = buildAtmosphericSkyDome({
      zenithColor: 0x344e6b,
      midColor: 0x99796c,
      horizonColor: fogColor,
      sunColor: 0xffe4aa,
      cloudColor: 0xf4ca9c,
      sunDirection: new THREE.Vector3(-0.18, 0.18, -1.0),
      sunIntensity: 1.0,
      cloudDensity: 0.42,
    });
    worldGroup.add(sky.mesh);

    const farGround = new THREE.Mesh(
      new THREE.PlaneGeometry(220, 220, 1, 1),
      new THREE.MeshStandardMaterial({
        color: 0x8f7454,
        roughness: 0.95,
      })
    );
    farGround.rotation.x = -Math.PI / 2;
    farGround.position.set(0, -0.35, -20);
    worldGroup.add(farGround);

    const horizonMist = buildEndlessHorizonMist(
      tex.mistSoft,
      0xdfbe9a,
      0.85,
      34,
      0.4
    );
    worldGroup.add(horizonMist.group);

    const riverGeo = new THREE.PlaneGeometry(38, 60, 24, 34);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x357479,
      normalMap: tex.waterNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.2,
      metalness: 0.22,
      flatShading: true,
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.set(-4.5, 0, -4);
    river.receiveShadow = true;
    worldGroup.add(river);

    const bankMat = new THREE.MeshStandardMaterial({
      color: 0xcfb082,
      map: tex.sandColor,
      bumpMap: tex.sandBump,
      bumpScale: 0.03,
      roughness: 0.92,
      flatShading: true,
    });
    const eastBank = new THREE.Mesh(
      new THREE.CylinderGeometry(13, 15, 1.5, 12),
      bankMat
    );
    eastBank.position.set(6.5, -0.4, 2);
    eastBank.scale.set(1.1, 1, 1.8);
    eastBank.receiveShadow = true;
    worldGroup.add(eastBank);

    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0xa2815d,
      map: tex.stoneColor,
      bumpMap: tex.stoneBump,
      bumpScale: 0.045,
      roughness: 0.95,
      flatShading: true,
    });
    const cliffCoords: [number, number, number, number, number][] = [
      [-16, 2.5, -28, 10, 7.5],
      [2, 2.8, -32, 13, 8.5],
      [19, 3.2, -26, 11, 9.0],
    ];
    cliffCoords.forEach(([x, y, z, r, h]) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), cliffMat);
      c.position.set(x, y, z);
      worldGroup.add(c);
    });

    const reeds1 = buildLowPolyReedCluster(11, 1.1);
    reeds1.position.set(0.4, 0.05, 1.5);
    worldGroup.add(reeds1);

    const reeds2 = buildLowPolyReedCluster(8, 0.85);
    reeds2.position.set(-0.8, 0.02, -3.4);
    worldGroup.add(reeds2);

    // Personalized Jordan shoreline props: stepping ford stones, woven mat, clay jar, desert wildflowers & valley birds
    const fordRockGeo = new THREE.DodecahedronGeometry(0.32, 0);
    [
      [-1.1, -0.02, 0.9, 1.1],
      [-2.1, -0.03, 0.2, 0.95],
      [-3.1, -0.04, -0.4, 1.2],
      [0.15, 0.1, 3.2, 0.8],
    ].forEach(([rx, ry, rz, sc], idx) => {
      const stone = new THREE.Mesh(fordRockGeo, cliffMat);
      stone.position.set(rx, ry, rz);
      stone.scale.set(sc * 1.25, sc * 0.52, sc);
      stone.rotation.y = idx * 0.8;
      stone.receiveShadow = true;
      worldGroup.add(stone);
    });

    const bankMatMat = new THREE.MeshStandardMaterial({
      color: 0xb99d72,
      map: tex.fabricColor,
      bumpMap: tex.fabricBump,
      bumpScale: 0.025,
      roughness: 0.92,
      flatShading: true,
    });
    const wovenMat = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.035, 0.72),
      bankMatMat
    );
    wovenMat.position.set(2.35, 0.36, 1.85);
    wovenMat.rotation.y = -0.35;
    wovenMat.receiveShadow = true;
    worldGroup.add(wovenMat);

    const bankClayMat = new THREE.MeshStandardMaterial({
      color: 0xa65d3f,
      bumpMap: tex.clayBump,
      bumpScale: 0.025,
      roughness: 0.75,
      flatShading: true,
    });
    const bankJar = buildTerracottaAmphora(bankClayMat, 0.95);
    bankJar.position.set(2.85, 0.37, 1.55);
    worldGroup.add(bankJar);

    // Wildflower tufts along the Jordan shore
    const flowerInst = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.06, 0),
      new THREE.MeshStandardMaterial({ color: 0xe6be5a, roughness: 0.8, flatShading: true }),
      14
    );
    const fDummy = new THREE.Object3D();
    for (let i = 0; i < 14; i++) {
      const fx = 1.2 + (i % 5) * 1.05 + Math.sin(i * 2.3) * 0.35;
      const fz = -3.0 + Math.floor(i / 5) * 2.2 + Math.cos(i * 1.9) * 0.4;
      fDummy.position.set(fx, 0.36, fz);
      fDummy.scale.setScalar(0.8 + (i % 3) * 0.25);
      fDummy.updateMatrix();
      flowerInst.setMatrixAt(i, fDummy.matrix);
    }
    flowerInst.computeBoundingSphere();
    worldGroup.add(flowerInst);

    const valleyBirds: GlidingBird[] = [
      { ...buildGlidingBird(0xdfd3be), centerX: -3.5, centerZ: -12, baseY: 4.5, radius: 6.5, speed: 0.34, phase: 0.5 },
      { ...buildGlidingBird(0xd4c5ad), centerX: 2.0, centerZ: -14, baseY: 5.3, radius: 7.8, speed: 0.28, phase: 3.1 },
    ];
    valleyBirds.forEach((b) => worldGroup.add(b.group));

    const posAttr = riverGeo.attributes.position as THREE.BufferAttribute;

    return {
      worldGroup,
      fogColor,
      fogDensity: 0.028,
      backgroundColor,
      defaultCameraPos: new THREE.Vector3(1.2, 2.25, 7.4),
      defaultTarget: new THREE.Vector3(1.5, 1.05, 0.5),
      update: (elapsed: number) => {
        sky.uniforms.uTime.value = elapsed;
        horizonMist.update(elapsed);
        tex.waterNormal.offset.set(0, -elapsed * 0.03);
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const z = posAttr.getZ(i);
          posAttr.setY(
            i,
            Math.sin(z * 0.6 + elapsed * 1.8) * 0.06 +
              Math.cos(x * 0.7 + elapsed * 1.2) * 0.04
          );
        }
        posAttr.needsUpdate = true;
        riverGeo.computeVertexNormals();
        reeds1.rotation.z = Math.sin(elapsed * 1.5) * 0.045;
        reeds2.rotation.z = Math.cos(elapsed * 1.3) * 0.045;

        valleyBirds.forEach((b) => {
          const ang = elapsed * b.speed + b.phase;
          b.group.position.set(
            b.centerX + Math.cos(ang) * b.radius,
            b.baseY + Math.sin(elapsed * 1.5 + b.phase) * 0.22,
            b.centerZ + Math.sin(ang) * b.radius
          );
          b.group.rotation.y = -ang;
          const flap = Math.sin(elapsed * 5.0 + b.phase) * 0.32;
          b.leftWing.rotation.z = flap;
          b.rightWing.rotation.z = -flap;
        });
      },
    };
  }

  // 'first_day_dwelling'
  const backgroundColor = 0x2a1f18;
  const fogColor = 0x261c16;

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xa28d74,
    map: tex.stoneColor,
    bumpMap: tex.stoneBump,
    bumpScale: 0.04,
    roughness: 0.94,
    flatShading: true,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xc0a787,
    map: tex.stoneColor,
    bumpMap: tex.stoneBump,
    bumpScale: 0.035,
    roughness: 0.92,
    flatShading: true,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x65432b,
    map: tex.woodColor,
    bumpMap: tex.woodBump,
    bumpScale: 0.03,
    roughness: 0.84,
    flatShading: true,
  });
  const clayMat = new THREE.MeshStandardMaterial({
    color: 0xb16546,
    bumpMap: tex.clayBump,
    bumpScale: 0.025,
    roughness: 0.7,
    flatShading: true,
  });

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(12, 12, 0.4, 12),
    stoneMat
  );
  floor.position.set(0, -0.2, 0);
  floor.receiveShadow = true;
  worldGroup.add(floor);

  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.6, 0.55), wallMat);
  wallLeft.position.set(-3.4, 1.8, -3.2);
  wallLeft.castShadow = true;
  wallLeft.receiveShadow = true;
  worldGroup.add(wallLeft);

  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.6, 0.55), wallMat);
  wallRight.position.set(3.4, 1.8, -3.2);
  wallRight.castShadow = true;
  wallRight.receiveShadow = true;
  worldGroup.add(wallRight);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 0.7), woodMat);
  lintel.position.set(0, 2.75, -3.2);
  lintel.castShadow = true;
  worldGroup.add(lintel);

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 1.0), woodMat);
  tableTop.position.set(1.4, 0.58, 0.3);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  worldGroup.add(tableTop);

  const legGeo = new THREE.BoxGeometry(0.1, 0.58, 0.1);
  [
    [0.68, 0.29, -0.1],
    [2.12, 0.29, -0.1],
    [0.68, 0.29, 0.7],
    [2.12, 0.29, 0.7],
  ].forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(lx, ly, lz);
    leg.castShadow = true;
    worldGroup.add(leg);
  });

  const pitcherPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.11, 0),
    new THREE.Vector2(0.16, 0.14),
    new THREE.Vector2(0.08, 0.28),
    new THREE.Vector2(0.11, 0.36),
    new THREE.Vector2(0.07, 0.36),
  ];
  const pitcher = new THREE.Mesh(
    new THREE.LatheGeometry(pitcherPts, 8),
    clayMat
  );
  pitcher.position.set(1.0, 0.63, 0.2);
  pitcher.castShadow = true;
  worldGroup.add(pitcher);

  const bread = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.17, 0),
    new THREE.MeshStandardMaterial({
      color: 0xd6aa6e,
      bumpMap: tex.clayBump,
      bumpScale: 0.03,
      roughness: 0.92,
      flatShading: true,
    })
  );
  bread.position.set(1.48, 0.7, 0.35);
  bread.scale.set(1.3, 0.55, 1.1);
  bread.castShadow = true;
  worldGroup.add(bread);

  const lampBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 0.08, 7),
    clayMat
  );
  lampBase.position.set(1.88, 0.67, 0.25);
  worldGroup.add(lampBase);

  const flame = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.045, 0),
    new THREE.MeshBasicMaterial({ color: 0xffd275 })
  );
  flame.position.set(1.88, 0.76, 0.25);
  worldGroup.add(flame);

  const lampLight = new THREE.PointLight(0xffaa4c, 3.6, 11, 1.6);
  lampLight.position.set(1.88, 0.95, 0.25);
  lampLight.castShadow = true;
  worldGroup.add(lampLight);

  // Personalized dwelling props: woven floor mat, wall scroll shelf, ceramic cups, fig bowl & glowing hearth brazier
  const rugMat = new THREE.MeshStandardMaterial({
    color: 0x6f4b36,
    map: tex.fabricColor,
    bumpMap: tex.fabricBump,
    bumpScale: 0.03,
    roughness: 0.92,
    flatShading: true,
  });
  const rug = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.025, 1.95), rugMat);
  rug.position.set(1.35, 0.012, 0.32);
  rug.receiveShadow = true;
  worldGroup.add(rug);

  // Clay cups & fig bowl on the wooden table
  const cupGeo = new THREE.CylinderGeometry(0.055, 0.042, 0.1, 8);
  [
    [1.22, 0.68, 0.58],
    [1.64, 0.68, 0.06],
  ].forEach(([cx, cy, cz]) => {
    const cup = new THREE.Mesh(cupGeo, clayMat);
    cup.position.set(cx, cy, cz);
    cup.castShadow = true;
    worldGroup.add(cup);
  });

  const figBowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.08, 0.07, 9),
    clayMat
  );
  figBowl.position.set(1.52, 0.665, 0.02);
  worldGroup.add(figBowl);
  const figsMat = new THREE.MeshStandardMaterial({
    color: 0x4b2f45,
    roughness: 0.8,
    flatShading: true,
  });
  [
    [1.48, 0.72, 0.02],
    [1.56, 0.72, 0.04],
    [1.51, 0.73, -0.02],
  ].forEach(([fx, fy, fz]) => {
    const f = new THREE.Mesh(new THREE.DodecahedronGeometry(0.038, 0), figsMat);
    f.position.set(fx, fy, fz);
    worldGroup.add(f);
  });

  // Wall shelf with parchment scrolls & terracotta jar
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.3), woodMat);
  shelf.position.set(-2.2, 1.65, -2.8);
  shelf.castShadow = true;
  worldGroup.add(shelf);

  const scrollMat = new THREE.MeshStandardMaterial({
    color: 0xdccaa8,
    map: tex.fabricColor,
    roughness: 0.85,
  });
  [-2.55, -2.35].forEach((sx, idx) => {
    const scroll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, 0.34, 7),
      scrollMat
    );
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = 0.2 * (idx + 1);
    scroll.position.set(sx, 1.72, -2.78);
    worldGroup.add(scroll);
  });
  const shelfJar = buildTerracottaAmphora(clayMat, 0.7);
  shelfJar.position.set(-1.85, 1.68, -2.8);
  worldGroup.add(shelfJar);

  // Corner earthen brazier with glowing coals
  const brazier = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.22, 0.26, 9),
    clayMat
  );
  brazier.position.set(-1.75, 0.13, -1.65);
  brazier.castShadow = true;
  worldGroup.add(brazier);

  const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6b24 });
  const embers = new THREE.Mesh(new THREE.CircleGeometry(0.24, 9), emberMat);
  embers.rotation.x = -Math.PI / 2;
  embers.position.set(-1.75, 0.265, -1.65);
  worldGroup.add(embers);

  // Subtle floating dust motes in the warm indoor lamp light
  const dustCount = 24;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = -0.5 + ((i * 53) % 32) / 10;
    dustPos[i * 3 + 1] = 0.4 + ((i * 37) % 18) / 10;
    dustPos[i * 3 + 2] = -1.2 + ((i * 41) % 26) / 10;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMotes = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xffdc96,
      size: 0.04,
      transparent: true,
      opacity: 0.42,
    })
  );
  worldGroup.add(dustMotes);

  return {
    worldGroup,
    fogColor,
    fogDensity: 0.03,
    backgroundColor,
    defaultCameraPos: new THREE.Vector3(0.4, 2.05, 6.1),
    defaultTarget: new THREE.Vector3(0.6, 1.05, 0.1),
    update: (elapsed: number) => {
      lampLight.intensity =
        3.4 +
        Math.sin(elapsed * 7.2) * 0.22 +
        Math.cos(elapsed * 11.3) * 0.14;
      flame.scale.setScalar(0.92 + Math.sin(elapsed * 9.0) * 0.12);
      emberMat.color.setRGB(
        0.95 + Math.sin(elapsed * 4.5) * 0.05,
        0.38 + Math.sin(elapsed * 6.2) * 0.12,
        0.1
      );
      dustMotes.position.y = Math.sin(elapsed * 0.6) * 0.08;
    },
  };
}
