import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  buildJordanOpeningCutscene,
  CutsceneCameraMode,
  JordanCutsceneHandle,
} from '../three/cutsceneJordan';
import {
  buildSecondCutsceneScene,
  SecondCutsceneHandle,
  WellMissionResult,
  WellMissionState,
} from '../three/cutsceneSecondHouse';
import {
  buildThirdGalileeCutscene,
  RoadWalkResult,
  ThirdCutsceneHandle,
} from '../three/cutsceneThirdGalilee';
import {
  animateCharacterPose,
  buildCompanionNpc,
  buildLowPolyDisciple,
  LowPolyCharacterRig,
} from '../three/lowPolyCharacter';
import { buildLowPolyWorld, LowPolyWorldHandle } from '../three/lowPolyWorlds';
import { getProceduralTextures } from '../three/proceduralTextures';
import {
  createLowPolyRenderer,
  disposeObjectTree,
  scheduleSoftwareAfterDraw,
} from '../three/rendererUtils';
import { CharacterConfig, SceneBackdropKey, SpeakerRole } from '../types/game';

interface LowPolyViewportProps {
  mode:
    | 'title'
    | 'creator'
    | 'cutscene_jordan'
    | 'follow_jesus'
    | 'cutscene_second'
    | 'cutscene_third'
    | 'narrative';
  backdrop?: SceneBackdropKey;
  character?: CharacterConfig;
  speaker?: SpeakerRole;
  cutsceneBeatIndex?: number;
  cutsceneBeatDuration?: number;
  cutsceneBeatProgress?: number;
  cutsceneCameraMode?: CutsceneCameraMode;
  followInputRef?: React.MutableRefObject<{ forward: number; right: number }>;
  onFollowProgress?: (distance: number, reached: boolean) => void;
  wellMissionState?: WellMissionState;
  onWellMissionProgress?: (res: WellMissionResult) => void;
  thirdWalkMode?: boolean;
  onThirdWalkProgress?: (res: RoadWalkResult) => void;
  className?: string;
}

export const LowPolyViewport: React.FC<LowPolyViewportProps> = ({
  mode,
  backdrop = 'dawn_shore',
  character,
  speaker = 'narrator',
  cutsceneBeatIndex = 0,
  cutsceneBeatDuration = 6,
  cutsceneBeatProgress,
  cutsceneCameraMode = 'auto',
  followInputRef,
  onFollowProgress,
  wellMissionState,
  onWellMissionProgress,
  thirdWalkMode = false,
  onThirdWalkProgress,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const worldHandleRef = useRef<LowPolyWorldHandle | null>(null);
  const cutsceneHandleRef = useRef<JordanCutsceneHandle | null>(null);
  const secondCutsceneHandleRef = useRef<SecondCutsceneHandle | null>(null);
  const thirdCutsceneHandleRef = useRef<ThirdCutsceneHandle | null>(null);
  const actorGroupRef = useRef<THREE.Group | null>(null);
  const playerRigRef = useRef<LowPolyCharacterRig | null>(null);
  const companionRigRef = useRef<LowPolyCharacterRig | null>(null);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const speakerRef = useRef(speaker);
  speakerRef.current = speaker;
  const cameraModeRef = useRef<CutsceneCameraMode>(cutsceneCameraMode);
  cameraModeRef.current = cutsceneCameraMode;
  const onFollowProgressRef = useRef(onFollowProgress);
  onFollowProgressRef.current = onFollowProgress;
  const followInputRefPtr = useRef(followInputRef);
  followInputRefPtr.current = followInputRef;
  const wellMissionStateRef = useRef<WellMissionState | undefined>(
    wellMissionState
  );
  wellMissionStateRef.current = wellMissionState;
  const onWellMissionProgressRef = useRef(onWellMissionProgress);
  onWellMissionProgressRef.current = onWellMissionProgress;
  const thirdWalkModeRef = useRef<boolean>(thirdWalkMode);
  thirdWalkModeRef.current = thirdWalkMode;
  const onThirdWalkProgressRef = useRef(onThirdWalkProgress);
  onThirdWalkProgressRef.current = onThirdWalkProgress;

  const beatIndexRef = useRef(cutsceneBeatIndex);
  const beatStartTimeRef = useRef<number>(performance.now());
  const beatDurationRef = useRef(cutsceneBeatDuration);
  const externalBeatProgressRef = useRef<number | undefined>(
    cutsceneBeatProgress
  );
  externalBeatProgressRef.current = cutsceneBeatProgress;

  useEffect(() => {
    const prevBeat = beatIndexRef.current;
    beatIndexRef.current = cutsceneBeatIndex;
    beatDurationRef.current = cutsceneBeatDuration;
    beatStartTimeRef.current = performance.now();
    if (
      modeRef.current === 'cutscene_second' &&
      cutsceneBeatIndex === 3 &&
      prevBeat !== 3 &&
      secondCutsceneHandleRef.current
    ) {
      secondCutsceneHandleRef.current.resetWellMission();
    }
  }, [cutsceneBeatIndex, cutsceneBeatDuration]);

  useEffect(() => {
    if (
      modeRef.current === 'cutscene_third' &&
      thirdWalkMode &&
      thirdCutsceneHandleRef.current
    ) {
      thirdCutsceneHandleRef.current.resetRoadWalk();
    }
  }, [thirdWalkMode]);

  // Initialize WebGLRenderer & loop once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 720;

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 140);
    cameraRef.current = camera;

    const { renderer, pmremEnvTexture, isSoftwareGl } = createLowPolyRenderer(
      container,
      scene
    );
    rendererRef.current = renderer;
    getProceduralTextures(renderer.capabilities.getMaxAnisotropy());
    container.appendChild(renderer.domElement);

    // Balanced Caravaggio-inspired warm/cool 3-point lighting rig
    const hemiLight = new THREE.HemisphereLight(0xf6d3a6, 0x2c474c, 0.85);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const keyLight = new THREE.DirectionalLight(0xffd79e, 1.9);
    keyLight.position.set(7, 10, 6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 55;
    const d = 14;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const rimLight = new THREE.DirectionalLight(0x7cb2b8, 0.65);
    rimLight.position.set(-7, 5, -8);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = Math.PI * 0.28;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enabled = mode === 'creator';
    controlsRef.current = controls;

    const actorGroup = new THREE.Group();
    scene.add(actorGroup);
    actorGroupRef.current = actorGroup;

    const handleResize = () => {
      if (!container || !cameraRef.current) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);
    window.addEventListener('resize', handleResize);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const clock = new THREE.Clock();
    let rafId = 0;
    const timers: number[] = [];
    let disposed = false;

    const registerTimer = (id: number) => {
      timers.push(id);
    };

    let lastProgressReport = 0;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      if (modeRef.current === 'cutscene_jordan' && cutsceneHandleRef.current) {
        const beatElapsed = (performance.now() - beatStartTimeRef.current) / 1000;
        const progress = Math.min(
          1,
          beatElapsed / Math.max(0.5, beatDurationRef.current)
        );
        cutsceneHandleRef.current.update(
          beatIndexRef.current,
          progress,
          elapsed,
          camera,
          cameraModeRef.current
        );
      } else if (
        modeRef.current === 'cutscene_second' &&
        secondCutsceneHandleRef.current
      ) {
        if (scene.fog instanceof THREE.FogExp2) {
          const b = beatIndexRef.current;
          const fogHex = b >= 5 ? 0x463030 : b === 2 || b === 4 ? 0x221a14 : 0xb88255;
          scene.fog.color.setHex(fogHex);
        }
        if (beatIndexRef.current === 3) {
          const inp = followInputRefPtr.current?.current ?? {
            forward: 0,
            right: 0,
          };
          const res = secondCutsceneHandleRef.current.updateWellMission(
            inp.forward,
            inp.right,
            dt,
            elapsed,
            camera,
            wellMissionStateRef.current ?? {
              widowResolved: false,
              helpedWidow: null,
              wellResolved: false,
              wellPace: null,
            }
          );
          if (
            onWellMissionProgressRef.current &&
            elapsed - lastProgressReport > 0.12
          ) {
            lastProgressReport = elapsed;
            onWellMissionProgressRef.current(res);
          }
        } else {
          const beatElapsed =
            (performance.now() - beatStartTimeRef.current) / 1000;
          const progress = Math.min(
            1,
            beatElapsed / Math.max(0.5, beatDurationRef.current)
          );
          secondCutsceneHandleRef.current.update(
            beatIndexRef.current,
            progress,
            elapsed,
            camera,
            cameraModeRef.current,
            wellMissionStateRef.current
          );
        }
      } else if (
        modeRef.current === 'cutscene_third' &&
        thirdCutsceneHandleRef.current
      ) {
        if (thirdWalkModeRef.current) {
          if (scene.fog instanceof THREE.FogExp2) {
            scene.fog.color.setHex(0xd0b08d);
            scene.fog.density = 0.017;
          }
          const inp = followInputRefPtr.current?.current ?? {
            forward: 0,
            right: 0,
          };
          const res = thirdCutsceneHandleRef.current.updateRoadWalk(
            inp.forward,
            inp.right,
            dt,
            elapsed,
            camera
          );
          if (
            onThirdWalkProgressRef.current &&
            (res.reachedJesus || elapsed - lastProgressReport > 0.14)
          ) {
            lastProgressReport = elapsed;
            onThirdWalkProgressRef.current(res);
          }
        } else {
          const beatElapsed =
            (performance.now() - beatStartTimeRef.current) / 1000;
          const progress =
            externalBeatProgressRef.current ??
            Math.min(1, beatElapsed / Math.max(0.5, beatDurationRef.current));
          if (scene.fog instanceof THREE.FogExp2) {
            const isOpenHeaven = beatIndexRef.current === 4 && progress > 0.36;
            scene.fog.color.setHex(isOpenHeaven ? 0xffe4aa : 0xd0b08d);
            scene.fog.density = isOpenHeaven ? 0.013 : 0.019;
          }
          thirdCutsceneHandleRef.current.update(
            beatIndexRef.current,
            progress,
            elapsed,
            camera,
            cameraModeRef.current
          );
        }
      } else if (modeRef.current === 'follow_jesus' && cutsceneHandleRef.current) {
        const inp = followInputRefPtr.current?.current ?? {
          forward: 0,
          right: 0,
        };
        const res = cutsceneHandleRef.current.updateFollowGameplay(
          inp.forward,
          inp.right,
          dt,
          elapsed,
          camera
        );
        if (
          onFollowProgressRef.current &&
          (res.reachedJesus || elapsed - lastProgressReport > 0.14)
        ) {
          lastProgressReport = elapsed;
          onFollowProgressRef.current(res.distanceToJesus, res.reachedJesus);
        }
      } else {
        const world = worldHandleRef.current;
        if (world) {
          world.update(elapsed);
        }

        const playerRig = playerRigRef.current;
        if (playerRig) {
          animateCharacterPose(
            playerRig,
            elapsed,
            speakerRef.current === 'player' ? 'welcome' : 'idle'
          );
        }

        const compRig = companionRigRef.current;
        if (compRig) {
          animateCharacterPose(
            compRig,
            elapsed + 1.2,
            speakerRef.current === 'jesus'
              ? 'welcome'
              : speakerRef.current !== 'narrator' &&
                  speakerRef.current !== 'player'
                ? 'preach'
                : 'idle'
          );
        }

        if (modeRef.current === 'title' && world) {
          const driftX = Math.sin(elapsed * 0.16) * 0.45;
          const driftY = Math.cos(elapsed * 0.12) * 0.12;
          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            world.defaultCameraPos.x + driftX,
            2.2,
            dt
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            world.defaultCameraPos.y + driftY,
            2.2,
            dt
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            world.defaultCameraPos.z,
            2.2,
            dt
          );
          camera.lookAt(world.defaultTarget);
        } else if (modeRef.current === 'creator') {
          controls.update();
        } else if (modeRef.current === 'narrative' && world) {
          const speakOffset =
            speakerRef.current === 'player'
              ? -0.35
              : speakerRef.current === 'narrator'
                ? 0
                : 0.35;
          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            world.defaultCameraPos.x + speakOffset * 0.6,
            2.8,
            dt
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            world.defaultCameraPos.y,
            2.8,
            dt
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            world.defaultCameraPos.z,
            2.8,
            dt
          );
          camera.lookAt(world.defaultTarget);
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        scheduleSoftwareAfterDraw(renderer, tick, registerTimer);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      scheduleSoftwareAfterDraw(renderer, tick, registerTimer);
    } else {
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      timers.forEach((id) => clearTimeout(id));
      resizeObs.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        onContextLost
      );
      controls.dispose();
      if (worldHandleRef.current) {
        disposeObjectTree(worldHandleRef.current.worldGroup);
      }
      if (cutsceneHandleRef.current) {
        disposeObjectTree(cutsceneHandleRef.current.root);
      }
      if (secondCutsceneHandleRef.current) {
        disposeObjectTree(secondCutsceneHandleRef.current.root);
      }
      if (thirdCutsceneHandleRef.current) {
        disposeObjectTree(thirdCutsceneHandleRef.current.root);
      }
      if (actorGroupRef.current) {
        disposeObjectTree(actorGroupRef.current);
      }
      pmremEnvTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Rebuild 3D World or Cutscene when mode/backdrop changes
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls) return;

    if (worldHandleRef.current) {
      scene.remove(worldHandleRef.current.worldGroup);
      disposeObjectTree(worldHandleRef.current.worldGroup);
      worldHandleRef.current = null;
    }

    if (cutsceneHandleRef.current) {
      scene.remove(cutsceneHandleRef.current.root);
      disposeObjectTree(cutsceneHandleRef.current.root);
      cutsceneHandleRef.current = null;
    }

    if (secondCutsceneHandleRef.current) {
      scene.remove(secondCutsceneHandleRef.current.root);
      disposeObjectTree(secondCutsceneHandleRef.current.root);
      secondCutsceneHandleRef.current = null;
    }

    if (thirdCutsceneHandleRef.current) {
      scene.remove(thirdCutsceneHandleRef.current.root);
      disposeObjectTree(thirdCutsceneHandleRef.current.root);
      thirdCutsceneHandleRef.current = null;
    }

    controls.enabled = mode === 'creator';

    const keyLight = keyLightRef.current;
    const hemiLight = hemiLightRef.current;
    const rimLight = rimLightRef.current;
    const renderer = rendererRef.current;

    if (
      (mode === 'cutscene_jordan' || mode === 'follow_jesus') &&
      character
    ) {
      if (renderer) renderer.toneMappingExposure = 0.98;
      scene.environmentIntensity = 0.72;
      if (hemiLight) {
        hemiLight.color.setHex(0x8cc2f5);
        hemiLight.groundColor.setHex(0x443526);
        hemiLight.intensity = 0.68;
      }
      if (rimLight) {
        rimLight.color.setHex(0x7db7eb);
        rimLight.intensity = 0.48;
      }
      if (keyLight) {
        keyLight.position.set(-14, 15, -9);
        keyLight.color.setHex(0xffe3b0);
        keyLight.intensity = 1.82;
        const d = 24;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.camera.updateProjectionMatrix();
      }
      const cs = buildJordanOpeningCutscene(character);
      cutsceneHandleRef.current = cs;
      scene.add(cs.root);
      scene.background = new THREE.Color(0x9bc4e8);
      scene.fog = new THREE.FogExp2(0x9bc4e8, 0.0175);
      if (mode === 'follow_jesus') {
        cs.resetFollowGameplay();
        camera.position.set(13.3, 4.0, 8.4);
        camera.lookAt(7.5, 1.3, 5.5);
      } else {
        camera.position.set(-0.8, 7.8, -17.2);
        camera.lookAt(-1.5, 0.7, 3.2);
      }
      return;
    }

    if (mode === 'cutscene_second' && character) {
      if (renderer) renderer.toneMappingExposure = 0.92;
      scene.environmentIntensity = 0.28;
      if (keyLight) {
        const d = 16;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.camera.updateProjectionMatrix();
      }
      const cs2 = buildSecondCutsceneScene(character, {
        hemiLight,
        keyLight,
        rimLight,
      });
      secondCutsceneHandleRef.current = cs2;
      scene.add(cs2.root);
      scene.background = new THREE.Color(0x7c5942);
      scene.fog = new THREE.FogExp2(0x7c5942, 0.025);
      camera.position.set(1.15, 1.5, 23.6);
      camera.lookAt(0.0, 1.38, 19.0);
      return;
    }

    if (mode === 'cutscene_third' && character) {
      if (renderer) renderer.toneMappingExposure = 0.96;
      scene.environmentIntensity = 0.54;
      if (keyLight) {
        const d = 24;
        keyLight.shadow.camera.left = -d;
        keyLight.shadow.camera.right = d;
        keyLight.shadow.camera.top = d;
        keyLight.shadow.camera.bottom = -d;
        keyLight.shadow.camera.updateProjectionMatrix();
      }
      const cs3 = buildThirdGalileeCutscene(character, {
        hemiLight,
        keyLight,
        rimLight,
      });
      thirdCutsceneHandleRef.current = cs3;
      scene.add(cs3.root);
      scene.background = new THREE.Color(0xd0b08d);
      scene.fog = new THREE.FogExp2(0xd0b08d, 0.017);
      if (thirdWalkModeRef.current) {
        cs3.resetRoadWalk();
        camera.position.set(1.2, 2.2, 57.5);
        camera.lookAt(0.0, 1.35, 42.0);
      } else {
        camera.position.set(2.4, 2.25, 16.5);
        camera.lookAt(0.0, 1.35, 10.6);
      }
      return;
    }

    if (renderer) renderer.toneMappingExposure = 1.08;
    scene.environmentIntensity = 1.0;
    if (hemiLight) {
      hemiLight.color.setHex(0xf6d3a6);
      hemiLight.groundColor.setHex(0x2c474c);
      hemiLight.intensity = 0.85;
    }
    if (rimLight) {
      rimLight.color.setHex(0x7cb2b8);
      rimLight.intensity = 0.65;
    }
    if (keyLight) {
      keyLight.position.set(7, 10, 6);
      keyLight.color.setHex(0xffd79e);
      keyLight.intensity = 1.9;
      const d = 14;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.camera.updateProjectionMatrix();
    }

    const activeBackdrop: SceneBackdropKey =
      mode === 'title' || mode === 'creator' ? 'dawn_shore' : backdrop;
    const world = buildLowPolyWorld(activeBackdrop);
    worldHandleRef.current = world;
    scene.add(world.worldGroup);

    scene.background = new THREE.Color(world.backgroundColor);
    scene.fog = new THREE.FogExp2(world.fogColor, world.fogDensity);

    if (mode === 'creator') {
      camera.position.set(1.05, 1.38, 8.95);
      controls.target.set(0.35, 1.02, 6.2);
      controls.minDistance = 2.2;
      controls.maxDistance = 4.2;
      controls.update();
    } else {
      camera.position.copy(world.defaultCameraPos);
      camera.lookAt(world.defaultTarget);
    }
  }, [mode, backdrop, character]);

  // Rebuild 3D Low-Poly Player Character & Companions in creator / narrative modes
  useEffect(() => {
    const actorGroup = actorGroupRef.current;
    if (!actorGroup) return;

    while (actorGroup.children.length > 0) {
      const child = actorGroup.children[0];
      actorGroup.remove(child);
      disposeObjectTree(child);
    }
    playerRigRef.current = null;
    companionRigRef.current = null;

    if (
      mode === 'title' ||
      mode === 'cutscene_jordan' ||
      mode === 'follow_jesus' ||
      mode === 'cutscene_second' ||
      mode === 'cutscene_third' ||
      !character
    ) {
      return;
    }

    const playerRig = buildLowPolyDisciple(character);
    playerRigRef.current = playerRig;

    if (mode === 'creator') {
      const daisGeo = new THREE.CylinderGeometry(0.68, 0.82, 0.16, 8);
      const daisMat = new THREE.MeshStandardMaterial({
        color: 0xa69174,
        roughness: 0.9,
        flatShading: true,
      });
      const dais = new THREE.Mesh(daisGeo, daisMat);
      dais.position.set(0.35, 0.04, 6.2);
      dais.receiveShadow = true;
      actorGroup.add(dais);

      playerRig.group.position.set(0.35, 0.12, 6.2);
      playerRig.group.rotation.y = 0.25;
      actorGroup.add(playerRig.group);
    } else if (mode === 'narrative') {
      if (backdrop === 'first_day_dwelling') {
        playerRig.group.position.set(-0.55, 0, 0.7);
        playerRig.group.rotation.y = 0.75;
        actorGroup.add(playerRig.group);

        const companion = buildCompanionNpc(
          speaker === 'jesus' ? '#f0e7d8' : '#b89f7d',
          speaker === 'jesus' ? '#d99b43' : '#4a5c4a',
          '#c58b62',
          '#2e1f17',
          true
        );
        companion.group.position.set(0.65, 0, -0.35);
        companion.group.rotation.y = -0.7;
        actorGroup.add(companion.group);
        companionRigRef.current = companion;
      } else if (backdrop === 'jordan_river') {
        playerRig.group.position.set(0.9, 0.34, 1.9);
        playerRig.group.rotation.y = 0.4;
        actorGroup.add(playerRig.group);

        const companion = buildCompanionNpc(
          speaker === 'jesus' ? '#f0e7d8' : '#9c8364',
          speaker === 'jesus' ? '#d99b43' : '#5f402e',
          '#be8359',
          '#2a1c14',
          true
        );
        companion.group.position.set(2.15, 0.35, 0.85);
        companion.group.rotation.y = -0.85;
        actorGroup.add(companion.group);
        companionRigRef.current = companion;
      } else {
        playerRig.group.position.set(1.2, 0.16, 4.1);
        playerRig.group.rotation.y = 0.45;
        actorGroup.add(playerRig.group);

        const companion = buildCompanionNpc(
          speaker === 'jesus' ? '#f0e7d8' : '#7b8c91',
          speaker === 'jesus' ? '#d99b43' : '#2c4652',
          '#ba7e54',
          '#322118',
          true
        );
        companion.group.position.set(2.3, 0.18, 3.2);
        companion.group.rotation.y = -0.85;
        actorGroup.add(companion.group);
        companionRigRef.current = companion;
      }
    }
  }, [mode, backdrop, character, speaker]);

  return (
    <div
      ref={mountRef}
      className={`w-full h-full relative overflow-hidden ${className}`}
      aria-label="Cena 3D Low Poly"
    />
  );
};
