import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function detectSoftwareGl(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export interface RendererSetup {
  renderer: THREE.WebGLRenderer;
  pmremEnvTexture: THREE.Texture;
  isSoftwareGl: boolean;
}

export function createLowPolyRenderer(
  container: HTMLElement,
  scene: THREE.Scene
): RendererSetup {
  const isSoftwareGl = detectSoftwareGl();

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
    alpha: false,
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(
    isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)
  );
  renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const pmremEnvTexture = pmremGenerator.fromScene(
    new RoomEnvironment(),
    0.04
  ).texture;
  scene.environment = pmremEnvTexture;
  pmremGenerator.dispose();

  return { renderer, pmremEnvTexture, isSoftwareGl };
}

export function scheduleSoftwareAfterDraw(
  renderer: THREE.WebGLRenderer,
  cb: () => void,
  registerTimer: (id: number) => void
): void {
  try {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      const id = window.setTimeout(cb, 80);
      registerTimer(id);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        const id = window.setTimeout(poll, 5);
        registerTimer(id);
      } else {
        if (sync) gl.deleteSync(sync);
        const id = window.setTimeout(cb, 80);
        registerTimer(id);
      }
    };
    const id = window.setTimeout(poll, 5);
    registerTimer(id);
  } catch {
    const id = window.setTimeout(cb, 80);
    registerTimer(id);
  }
}

export function disposeObjectTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  });
}
