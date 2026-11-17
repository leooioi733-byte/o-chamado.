import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getProceduralTextures } from './proceduralTextures';
import { CharacterConfig } from '../types/game';

export type CharacterPose =
  | 'idle'
  | 'walk'
  | 'stoop'
  | 'carry'
  | 'kneel'
  | 'wash'
  | 'sit'
  | 'preach'
  | 'baptize'
  | 'awe'
  | 'welcome';

export interface LowPolyCharacterRig {
  group: THREE.Group;
  hipsGroup: THREE.Group;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  leftForearm: THREE.Group;
  rightArm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  leftShin: THREE.Group;
  rightLeg: THREE.Group;
  rightShin: THREE.Group;
}

function darkenColor(hex: string, factor: number): THREE.Color {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return c;
}

function lightenColor(hex: string, amount: number): THREE.Color {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color(0xf7efe4), amount);
  return c;
}

export function buildLowPolyDisciple(
  config: CharacterConfig
): LowPolyCharacterRig {
  const tex = getProceduralTextures();
  const group = new THREE.Group();
  const isMale = config.gender === 'masculino';

  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.skinTone),
    map: tex.skinColor,
    bumpMap: tex.skinBump,
    bumpScale: 0.008,
    roughness: 0.65,
    metalness: 0.0,
    flatShading: true,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.hairColor),
    bumpMap: tex.hairBump,
    bumpScale: 0.015,
    roughness: 0.78,
    metalness: 0.03,
    flatShading: true,
  });

  const tunicMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.tunicColor),
    map: tex.fabricColor,
    normalMap: tex.fabricNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    bumpMap: tex.fabricBump,
    bumpScale: 0.022,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true,
  });

  const cloakMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(config.cloakColor),
    map: tex.fabricColor,
    normalMap: tex.fabricNormal,
    normalScale: new THREE.Vector2(0.65, 0.65),
    bumpMap: tex.fabricBump,
    bumpScale: 0.028,
    roughness: 0.72,
    metalness: 0.03,
    flatShading: true,
  });

  const cloakShadeMat = new THREE.MeshStandardMaterial({
    color: darkenColor(config.cloakColor, 0.76),
    map: tex.fabricColor,
    normalMap: tex.fabricNormal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    bumpMap: tex.fabricBump,
    bumpScale: 0.026,
    roughness: 0.76,
    metalness: 0.02,
    flatShading: true,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#4a3222'),
    bumpMap: tex.clayBump,
    bumpScale: 0.012,
    roughness: 0.52,
    metalness: 0.08,
    flatShading: true,
  });

  const eyeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1d1714'),
    roughness: 0.25,
    metalness: 0.0,
    flatShading: true,
  });

  // Root hip pivot at y = 0.82 so walking & breathing articulate from ground up
  const hipsGroup = new THREE.Group();
  hipsGroup.position.set(0, 0.82, 0);
  group.add(hipsGroup);

  // 1. Articulated Legs (Thigh -> Knee/Shin -> Sandal Foot)
  const buildLeg = (
    side: -1 | 1
  ): { legPivot: THREE.Group; shinPivot: THREE.Group } => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.115, 0, 0);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.078, 0.068, 0.4, 6),
      tunicMat
    );
    thigh.position.set(0, -0.2, 0);
    thigh.castShadow = true;
    legPivot.add(thigh);

    const shinPivot = new THREE.Group();
    shinPivot.position.set(0, -0.4, 0);
    legPivot.add(shinPivot);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.046, 0.36, 6),
      skinMat
    );
    shin.position.set(0, -0.18, 0);
    shin.castShadow = true;
    shinPivot.add(shin);

    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(0.125, 0.055, 0.23),
      leatherMat
    );
    foot.position.set(0, -0.39, 0.04);
    foot.castShadow = true;
    foot.receiveShadow = true;
    shinPivot.add(foot);

    return { legPivot, shinPivot };
  };

  const { legPivot: leftLeg, shinPivot: leftShin } = buildLeg(-1);
  const { legPivot: rightLeg, shinPivot: rightShin } = buildLeg(1);
  hipsGroup.add(leftLeg);
  hipsGroup.add(rightLeg);

  // Flexible Tunic Skirt attached to hips (slightly shorter at ankles so strides read cleanly)
  const skirtGeo = new THREE.CylinderGeometry(
    isMale ? 0.215 : 0.205,
    isMale ? 0.285 : 0.305,
    0.58,
    8
  );
  const skirt = new THREE.Mesh(skirtGeo, tunicMat);
  skirt.position.set(0, -0.25, 0);
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  hipsGroup.add(skirt);

  // 2. Torso Group
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.06, 0);
  hipsGroup.add(torsoGroup);

  const chestGeo = new THREE.CylinderGeometry(
    isMale ? 0.265 : 0.228,
    isMale ? 0.215 : 0.195,
    0.52,
    8
  );
  const chest = new THREE.Mesh(chestGeo, tunicMat);
  chest.position.set(0, 0.25, 0);
  chest.scale.set(1.06, 1, 0.72);
  chest.castShadow = true;
  chest.receiveShadow = true;
  torsoGroup.add(chest);

  // Woven Belt Sash
  const sashGeo = new THREE.CylinderGeometry(
    isMale ? 0.226 : 0.206,
    isMale ? 0.226 : 0.206,
    0.09,
    8
  );
  const sash = new THREE.Mesh(sashGeo, leatherMat);
  sash.position.set(0, 0.03, 0);
  sash.scale.set(1.06, 1, 0.75);
  sash.castShadow = true;
  torsoGroup.add(sash);

  // Draped Mantle / Cloak across shoulders & back
  const shoulderMantleGeo = new THREE.CylinderGeometry(0.285, 0.275, 0.16, 8);
  const shoulderMantle = new THREE.Mesh(shoulderMantleGeo, cloakMat);
  shoulderMantle.position.set(-0.02, 0.44, 0);
  shoulderMantle.rotation.z = 0.15;
  shoulderMantle.scale.set(1.08, 1, 0.8);
  shoulderMantle.castShadow = true;
  torsoGroup.add(shoulderMantle);

  const drapeGeo = new THREE.BoxGeometry(0.15, 0.6, 0.35);
  const drape = new THREE.Mesh(drapeGeo, cloakShadeMat);
  drape.position.set(-0.05, 0.21, 0.01);
  drape.rotation.z = -0.35;
  drape.castShadow = true;
  torsoGroup.add(drape);

  const backCloakGeo = new THREE.CylinderGeometry(
    0.24,
    0.34,
    0.96,
    7,
    1,
    false,
    Math.PI * 0.65,
    Math.PI * 0.7
  );
  const backCloak = new THREE.Mesh(backCloakGeo, cloakMat);
  backCloak.position.set(0, -0.02, -0.03);
  backCloak.castShadow = true;
  torsoGroup.add(backCloak);

  // 3. Articulated Upper Arms + Elbows/Forearms + Hands
  const buildArm = (
    side: -1 | 1
  ): { armPivot: THREE.Group; forearmPivot: THREE.Group } => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * (isMale ? 0.305 : 0.265), 0.45, 0);

    const upperArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.068, 0.25, 6),
      side === -1 ? cloakMat : tunicMat
    );
    upperArm.position.set(0, -0.12, 0);
    upperArm.castShadow = true;
    armPivot.add(upperArm);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -0.24, 0);
    armPivot.add(forearmPivot);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.054, 0.046, 0.25, 6),
      skinMat
    );
    forearm.position.set(0, -0.125, 0);
    forearm.castShadow = true;
    forearmPivot.add(forearm);

    const hand = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.052, 0),
      skinMat
    );
    hand.position.set(0, -0.265, 0.015);
    hand.castShadow = true;
    forearmPivot.add(hand);

    armPivot.rotation.z = side * 0.1;
    forearmPivot.rotation.x = -0.16;
    return { armPivot, forearmPivot };
  };

  const { armPivot: leftArm, forearmPivot: leftForearm } = buildArm(-1);
  const { armPivot: rightArm, forearmPivot: rightForearm } = buildArm(1);
  torsoGroup.add(leftArm);
  torsoGroup.add(rightArm);

  // 4. Neck & Head Group
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.078, 0.092, 0.14, 6),
    skinMat
  );
  neck.position.set(0, 0.55, 0);
  torsoGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.72, 0);
  torsoGroup.add(headGroup);

  const headMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.18, 1),
    skinMat
  );
  headMesh.scale.set(isMale ? 0.94 : 0.89, 1.08, 0.96);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headGroup.add(headMesh);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.028, 0.08, 4),
    skinMat
  );
  nose.position.set(0, -0.01, 0.175);
  nose.rotation.x = Math.PI * 0.42;
  headGroup.add(nose);

  const eyeGeo = new THREE.BoxGeometry(0.032, 0.018, 0.02);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.062, 0.025, 0.16);
  headGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.062, 0.025, 0.16);
  headGroup.add(rightEye);

  const browGeo = new THREE.BoxGeometry(0.048, 0.014, 0.02);
  const leftBrow = new THREE.Mesh(browGeo, hairMat);
  leftBrow.position.set(-0.064, 0.056, 0.16);
  leftBrow.rotation.z = 0.08;
  headGroup.add(leftBrow);

  const rightBrow = new THREE.Mesh(browGeo, hairMat);
  rightBrow.position.set(0.064, 0.056, 0.16);
  rightBrow.rotation.z = -0.08;
  headGroup.add(rightBrow);

  // 5. Beard
  if (isMale && config.beardStyle !== 'sem_barba') {
    if (config.beardStyle === 'curta') {
      const jawBeard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.11, 0.11, 7),
        hairMat
      );
      jawBeard.position.set(0, -0.1, 0.03);
      jawBeard.scale.set(0.98, 1, 0.95);
      jawBeard.castShadow = true;
      headGroup.add(jawBeard);
    } else if (config.beardStyle === 'cheia') {
      const fullBeard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.155, 0.09, 0.18, 7),
        hairMat
      );
      fullBeard.position.set(0, -0.13, 0.045);
      fullBeard.castShadow = true;
      headGroup.add(fullBeard);

      const stache = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.026, 0.04),
        hairMat
      );
      stache.position.set(0, -0.055, 0.165);
      headGroup.add(stache);
    } else if (config.beardStyle === 'patriarca') {
      const longBeard = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.34, 6),
        hairMat
      );
      longBeard.position.set(0, -0.21, 0.06);
      longBeard.rotation.x = Math.PI;
      longBeard.castShadow = true;
      headGroup.add(longBeard);

      const stache = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.028, 0.045),
        hairMat
      );
      stache.position.set(0, -0.055, 0.165);
      headGroup.add(stache);
    }
  }

  // 6. Hair & Headwear
  const veilMat = new THREE.MeshStandardMaterial({
    color: lightenColor(config.cloakColor, 0.18),
    map: tex.fabricColor,
    bumpMap: tex.fabricBump,
    bumpScale: 0.018,
    roughness: 0.78,
    metalness: 0.0,
    flatShading: true,
  });

  if (config.hairStyle === 'curtissimo') {
    const cap = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.184, 1),
      hairMat
    );
    cap.position.set(0, 0.035, -0.015);
    cap.scale.set(0.95, 0.92, 0.96);
    headGroup.add(cap);
  } else if (config.hairStyle === 'curto_ondulado') {
    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.19, 1),
      hairMat
    );
    crown.position.set(0, 0.055, -0.02);
    crown.scale.set(1.0, 0.92, 1.02);
    crown.castShadow = true;
    headGroup.add(crown);

    const tuft = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.08, 0.16),
      hairMat
    );
    tuft.position.set(0, 0.145, 0.04);
    tuft.rotation.x = 0.25;
    headGroup.add(tuft);
  } else if (config.hairStyle === 'longo_ombros') {
    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.19, 1),
      hairMat
    );
    crown.position.set(0, 0.055, -0.02);
    crown.castShadow = true;
    headGroup.add(crown);

    const backLock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.21, 0.34, 7),
      hairMat
    );
    backLock.position.set(0, -0.1, -0.06);
    backLock.scale.set(1.02, 1, 0.75);
    backLock.castShadow = true;
    headGroup.add(backLock);
  } else if (config.hairStyle === 'preso_faixa') {
    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.188, 1),
      hairMat
    );
    crown.position.set(0, 0.05, -0.02);
    headGroup.add(crown);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.188, 0.188, 0.045, 10),
      cloakMat
    );
    band.position.set(0, 0.095, 0.005);
    band.rotation.x = -0.12;
    headGroup.add(band);

    const knot = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.08, 0),
      hairMat
    );
    knot.position.set(0, 0.01, -0.19);
    headGroup.add(knot);
  } else if (config.hairStyle === 'cachos_naturais') {
    const curlGeo = new THREE.IcosahedronGeometry(0.075, 0);
    const offsets: [number, number, number][] = [
      [0, 0.18, 0.02],
      [-0.1, 0.15, 0.04],
      [0.1, 0.15, 0.04],
      [-0.15, 0.08, -0.02],
      [0.15, 0.08, -0.02],
      [-0.16, -0.01, -0.04],
      [0.16, -0.01, -0.04],
      [-0.11, 0.11, -0.12],
      [0.11, 0.11, -0.12],
      [0, 0.09, -0.17],
      [0, -0.02, -0.18],
    ];
    offsets.forEach(([ox, oy, oz]) => {
      const c = new THREE.Mesh(curlGeo, hairMat);
      c.position.set(ox, oy, oz);
      c.castShadow = true;
      headGroup.add(c);
    });
  } else if (config.hairStyle === 'trancado_veu') {
    const crownHair = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.182, 1),
      hairMat
    );
    crownHair.position.set(0, 0.04, 0.01);
    headGroup.add(crownHair);

    const veilHood = new THREE.Mesh(
      new THREE.CylinderGeometry(
        0.19,
        0.26,
        0.38,
        7,
        1,
        false,
        Math.PI * 0.45,
        Math.PI * 1.1
      ),
      veilMat
    );
    veilHood.position.set(0, -0.01, -0.01);
    veilHood.castShadow = true;
    headGroup.add(veilHood);

    const veilTop = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.205, 1),
      veilMat
    );
    veilTop.position.set(0, 0.08, -0.025);
    veilTop.scale.set(1.02, 0.78, 1.02);
    headGroup.add(veilTop);
  }

  return {
    group,
    hipsGroup,
    torsoGroup,
    headGroup,
    leftArm,
    leftForearm,
    rightArm,
    rightForearm,
    leftLeg,
    leftShin,
    rightLeg,
    rightShin,
  };
}

export function animateCharacterPose(
  rig: LowPolyCharacterRig,
  elapsed: number,
  pose: CharacterPose,
  walkSpeed = 4.6
): void {
  if (pose === 'walk' || pose === 'stoop') {
    const phase = elapsed * walkSpeed;
    const stride = Math.sin(phase);
    const bounce = Math.abs(Math.cos(phase)) * 0.045;
    const isStoop = pose === 'stoop';

    rig.hipsGroup.position.y = (isStoop ? 0.72 : 0.82) + bounce;
    rig.torsoGroup.rotation.y = -stride * 0.09;
    rig.torsoGroup.rotation.x = isStoop ? 0.44 : 0.06;

    // Legs alternating stride + natural knee bend on backswing
    rig.leftLeg.rotation.x = stride * (isStoop ? 0.36 : 0.48);
    rig.rightLeg.rotation.x = -stride * (isStoop ? 0.36 : 0.48);
    rig.leftShin.rotation.x = Math.max(0, -stride) * 0.62 + (isStoop ? 0.16 : 0);
    rig.rightShin.rotation.x = Math.max(0, stride) * 0.62 + (isStoop ? 0.16 : 0);

    // Counter-swinging arms with relaxed elbow bend
    rig.leftArm.rotation.x = -stride * 0.34;
    rig.rightArm.rotation.x = stride * 0.34;
    rig.leftArm.rotation.z = -0.1;
    rig.rightArm.rotation.z = 0.1;
    rig.leftForearm.rotation.x = -0.28 - Math.max(0, stride) * 0.18;
    rig.rightForearm.rotation.x = -0.28 - Math.max(0, -stride) * 0.18;

    rig.headGroup.rotation.y = Math.sin(elapsed * 0.7) * 0.04;
    rig.headGroup.rotation.x = isStoop ? -0.18 : -0.04;
    return;
  }

  // Neutral reset for legs
  rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0, 0.12);
  rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, 0, 0.12);
  rig.leftShin.rotation.x = THREE.MathUtils.lerp(rig.leftShin.rotation.x, 0, 0.12);
  rig.rightShin.rotation.x = THREE.MathUtils.lerp(rig.rightShin.rotation.x, 0, 0.12);

  // Organic breathing & weight shift
  const breath = Math.sin(elapsed * 1.85);
  rig.hipsGroup.position.y = 0.82 + breath * 0.008;
  rig.torsoGroup.rotation.y = Math.sin(elapsed * 0.55) * 0.035;

  if (pose === 'preach') {
    const gesture = Math.sin(elapsed * 2.4);
    rig.torsoGroup.rotation.x = 0.05;
    rig.rightArm.rotation.x = -0.75 + gesture * 0.22;
    rig.rightArm.rotation.z = 0.24;
    rig.rightForearm.rotation.x = -0.55 + Math.cos(elapsed * 2.4) * 0.15;
    rig.leftArm.rotation.x = -0.2 + gesture * 0.08;
    rig.leftArm.rotation.z = -0.14;
    rig.leftForearm.rotation.x = -0.35;
    rig.headGroup.rotation.y = Math.sin(elapsed * 0.9) * 0.18;
    rig.headGroup.rotation.x = -0.03;
  } else if (pose === 'baptize') {
    rig.torsoGroup.rotation.x = 0.12;
    rig.rightArm.rotation.x = -0.65;
    rig.leftArm.rotation.x = -0.58;
    rig.rightForearm.rotation.x = -0.35;
    rig.leftForearm.rotation.x = -0.35;
    rig.headGroup.rotation.x = 0.08;
  } else if (pose === 'awe') {
    // Hand gently lifted near chest, head slightly raised in contemplation
    rig.torsoGroup.rotation.x = -0.02;
    rig.rightArm.rotation.x = -0.55;
    rig.rightArm.rotation.z = -0.18;
    rig.rightForearm.rotation.x = -1.05;
    rig.leftArm.rotation.x = -0.06;
    rig.leftArm.rotation.z = -0.1;
    rig.leftForearm.rotation.x = -0.18;
    rig.headGroup.rotation.x = -0.11 + Math.sin(elapsed * 0.8) * 0.03;
    rig.headGroup.rotation.y = Math.sin(elapsed * 0.5) * 0.05;
  } else if (pose === 'welcome') {
    // Jesus turning and opening a calm welcoming hand
    rig.torsoGroup.rotation.x = 0.02;
    rig.rightArm.rotation.x = -0.42 + breath * 0.04;
    rig.rightArm.rotation.z = 0.26;
    rig.rightForearm.rotation.x = -0.35;
    rig.leftArm.rotation.x = -0.14;
    rig.leftArm.rotation.z = -0.12;
    rig.leftForearm.rotation.x = -0.22;
    rig.headGroup.rotation.y = Math.sin(elapsed * 0.6) * 0.05;
    rig.headGroup.rotation.x = 0.02;
  } else if (pose === 'wash') {
    // Calmly bowing over clay basin, rinsing hands in water
    const washCycle = Math.sin(elapsed * 2.6);
    rig.torsoGroup.rotation.x = 0.24;
    rig.rightArm.rotation.x = -0.78 + washCycle * 0.06;
    rig.leftArm.rotation.x = -0.78 - washCycle * 0.06;
    rig.rightArm.rotation.z = -0.14;
    rig.leftArm.rotation.z = 0.14;
    rig.rightForearm.rotation.x = -0.46 + washCycle * 0.08;
    rig.leftForearm.rotation.x = -0.46 - washCycle * 0.08;
    rig.headGroup.rotation.x = 0.26;
    rig.headGroup.rotation.y = Math.sin(elapsed * 0.4) * 0.03;
  } else if (pose === 'sit') {
    // Seated calmly on wooden bench beside the table
    rig.hipsGroup.position.y = 0.46 + breath * 0.004;
    rig.torsoGroup.rotation.x = 0.04;
    rig.leftLeg.rotation.x = -1.42;
    rig.rightLeg.rotation.x = -1.42;
    rig.leftShin.rotation.x = 1.42;
    rig.rightShin.rotation.x = 1.42;
    rig.rightArm.rotation.x = -0.44;
    rig.leftArm.rotation.x = -0.4;
    rig.rightArm.rotation.z = 0.12;
    rig.leftArm.rotation.z = -0.12;
    rig.rightForearm.rotation.x = -0.58;
    rig.leftForearm.rotation.x = -0.56;
    rig.headGroup.rotation.y = Math.sin(elapsed * 0.35) * 0.03;
    rig.headGroup.rotation.x = 0.03;
  } else if (pose === 'carry') {
    const stride = walkSpeed > 0.1 ? Math.sin(elapsed * walkSpeed) : 0;
    const bounce =
      walkSpeed > 0.1 ? Math.abs(Math.cos(elapsed * walkSpeed)) * 0.035 : 0;
    rig.hipsGroup.position.y = 0.8 + bounce;
    rig.torsoGroup.rotation.x = 0.08;
    rig.leftLeg.rotation.x = stride * 0.38;
    rig.rightLeg.rotation.x = -stride * 0.38;
    rig.leftShin.rotation.x = Math.max(0, -stride) * 0.5;
    rig.rightShin.rotation.x = Math.max(0, stride) * 0.5;
    rig.leftArm.rotation.x = -0.78;
    rig.rightArm.rotation.x = -0.78;
    rig.leftArm.rotation.z = -0.18;
    rig.rightArm.rotation.z = 0.18;
    rig.leftForearm.rotation.x = -0.68;
    rig.rightForearm.rotation.x = -0.68;
    rig.headGroup.rotation.x = 0.06;
    rig.headGroup.rotation.y = Math.sin(elapsed * 0.65) * 0.04;
  } else if (pose === 'kneel') {
    const gentleMove = Math.sin(elapsed * 2.1);
    rig.hipsGroup.position.y = 0.44 + breath * 0.004;
    rig.torsoGroup.rotation.x = 0.28;
    rig.leftLeg.rotation.x = -1.25;
    rig.rightLeg.rotation.x = 0.18;
    rig.leftShin.rotation.x = 1.65;
    rig.rightShin.rotation.x = 1.45;
    rig.leftArm.rotation.x = -0.72 + gentleMove * 0.07;
    rig.rightArm.rotation.x = -0.72 - gentleMove * 0.07;
    rig.leftArm.rotation.z = -0.14;
    rig.rightArm.rotation.z = 0.14;
    rig.leftForearm.rotation.x = -0.52 + gentleMove * 0.06;
    rig.rightForearm.rotation.x = -0.52 - gentleMove * 0.06;
    rig.headGroup.rotation.x = 0.3;
    rig.headGroup.rotation.y = Math.sin(elapsed * 0.45) * 0.04;
  } else {
    // 'idle'
    rig.torsoGroup.rotation.x = 0;
    rig.leftArm.rotation.x = Math.sin(elapsed * 1.1) * 0.035;
    rig.rightArm.rotation.x = -Math.sin(elapsed * 1.1) * 0.035;
    rig.leftArm.rotation.z = -0.1;
    rig.rightArm.rotation.z = 0.1;
    rig.leftForearm.rotation.x = -0.18;
    rig.rightForearm.rotation.x = -0.18;
    rig.headGroup.rotation.y = Math.sin(elapsed * 0.75) * 0.08;
    rig.headGroup.rotation.x = Math.sin(elapsed * 1.2) * 0.025;
  }
}

export function buildCompanionNpc(
  tunicHex: string,
  cloakHex: string,
  skinHex: string,
  hairHex: string,
  hasBeard = true,
  gender: 'masculino' | 'feminino' = 'masculino',
  hairStyle: CharacterConfig['hairStyle'] = 'longo_ombros',
  beardStyle?: CharacterConfig['beardStyle']
): LowPolyCharacterRig {
  return buildLowPolyDisciple({
    name: 'Companheiro',
    gender,
    beardStyle:
      gender === 'feminino'
        ? 'sem_barba'
        : beardStyle ?? (hasBeard ? 'cheia' : 'sem_barba'),
    hairStyle,
    skinTone: skinHex,
    hairColor: hairHex,
    tunicColor: tunicHex,
    cloakColor: cloakHex,
  });
}

// Bakes a complete articulated companion rig into ONE vertex-colored BufferGeometry
// so dozens of crowd spectators share the exact same character silhouette with minimal draw calls.
export function buildBakedCrowdGeometry(
  tunicHex: string,
  cloakHex: string,
  skinHex: string,
  hairHex: string,
  gender: 'masculino' | 'feminino',
  hairStyle: CharacterConfig['hairStyle'],
  beardStyle: CharacterConfig['beardStyle']
): THREE.BufferGeometry {
  const rig = buildCompanionNpc(
    tunicHex,
    cloakHex,
    skinHex,
    hairHex,
    beardStyle !== 'sem_barba',
    gender,
    hairStyle,
    beardStyle
  );
  rig.group.updateMatrixWorld(true);

  const parts: THREE.BufferGeometry[] = [];
  const tempColor = new THREE.Color();

  rig.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const mat = Array.isArray(mesh.material)
      ? mesh.material[0]
      : mesh.material;
    const baseCol =
      mat && 'color' in mat && (mat as THREE.MeshStandardMaterial).color
        ? (mat as THREE.MeshStandardMaterial).color
        : tempColor.setHex(0xffffff);

    const cloned = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    cloned.applyMatrix4(mesh.matrixWorld);

    // Ensure uv & normal exist cleanly before merge
    if (!cloned.attributes.normal) {
      cloned.computeVertexNormals();
    }
    const count = cloned.attributes.position.count;
    if (!cloned.attributes.uv) {
      cloned.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(count * 2), 2)
      );
    }

    const colArr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colArr[i * 3] = baseCol.r;
      colArr[i * 3 + 1] = baseCol.g;
      colArr[i * 3 + 2] = baseCol.b;
    }
    cloned.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    parts.push(cloned);

    // Dispose temporary source rig resources cleanly
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose());
    } else if (mesh.material) {
      mesh.material.dispose();
    }
  });

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}
