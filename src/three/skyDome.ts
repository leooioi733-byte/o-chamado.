import * as THREE from 'three';

export interface SkyDomeOptions {
  zenithColor: number;
  midColor: number;
  horizonColor: number;
  sunColor?: number;
  cloudColor?: number;
  sunDirection?: THREE.Vector3;
  sunIntensity?: number;
  cloudDensity?: number;
}

export interface SkyDomeHandle {
  mesh: THREE.Mesh;
  uniforms: {
    uTime: { value: number };
    uZenithColor: { value: THREE.Color };
    uMidColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uSunColor: { value: THREE.Color };
    uCloudColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uSunIntensity: { value: number };
    uCloudDensity: { value: number };
  };
}

/**
 * Procedural atmospheric sky dome with realistic Rayleigh/Mie horizon glow,
 * glowing sun disc, drifting cirrus/stratus cloud layers, and seamless horizon fog blend.
 */
export function buildAtmosphericSkyDome(
  opts: SkyDomeOptions
): SkyDomeHandle {
  const uniforms = {
    uTime: { value: 0 },
    uZenithColor: { value: new THREE.Color(opts.zenithColor) },
    uMidColor: { value: new THREE.Color(opts.midColor) },
    uHorizonColor: { value: new THREE.Color(opts.horizonColor) },
    uSunColor: { value: new THREE.Color(opts.sunColor ?? 0xffe4a8) },
    uCloudColor: { value: new THREE.Color(opts.cloudColor ?? 0xf4c598) },
    uSunDir: {
      value: (opts.sunDirection ?? new THREE.Vector3(0.05, 0.14, -1.0))
        .clone()
        .normalize(),
    },
    uSunIntensity: { value: opts.sunIntensity ?? 1.0 },
    uCloudDensity: { value: opts.cloudDensity ?? 0.42 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldDir = position;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uZenithColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uCloudColor;
      uniform vec3 uSunDir;
      uniform float uSunIntensity;
      uniform float uCloudDensity;

      varying vec3 vWorldDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise2D(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          v += amp * noise2D(p);
          p = p * 2.07 + vec2(17.1, 31.7);
          amp *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, -0.25, 1.0);

        // 3-stop atmospheric sky gradient
        float midMix = smoothstep(-0.02, 0.24, h);
        float zenMix = smoothstep(0.18, 0.82, h);
        vec3 sky = mix(uHorizonColor, uMidColor, midMix);
        sky = mix(sky, uZenithColor, zenMix);

        // Mie scattering & sun halo
        vec3 sunDir = normalize(uSunDir);
        float sunCos = max(dot(dir, sunDir), 0.0);
        float broadGlow = pow(sunCos, 5.0) * 0.42 * uSunIntensity;
        float innerHalo = pow(sunCos, 42.0) * 0.65 * uSunIntensity;
        float sunDisc = smoothstep(0.9982, 0.9994, sunCos) * 1.15 * uSunIntensity;
        sky += uSunColor * (broadGlow + innerHalo + sunDisc);

        // High drifting cloud wisps fading naturally into horizon haze
        if (dir.y > 0.012 && uCloudDensity > 0.01) {
          vec2 cloudUv = dir.xz / (dir.y + 0.16);
          cloudUv *= vec2(1.05, 1.55);
          cloudUv += vec2(uTime * 0.0085, uTime * 0.003);
          float c1 = fbm(cloudUv * 1.05);
          float c2 = fbm(cloudUv * 2.35 - vec2(uTime * 0.005, 0.0));
          float cloudVal = c1 * 0.65 + c2 * 0.35;
          float cloudMask = smoothstep(0.45, 0.82, cloudVal);
          float horizonFade = smoothstep(0.012, 0.2, dir.y);
          float sunLit = 0.42 + 0.58 * pow(sunCos, 2.5);
          vec3 cloudShadow = mix(uMidColor * 0.85, uCloudColor * 0.84, 0.6);
          vec3 litCloud = mix(cloudShadow, mix(uCloudColor, uSunColor, 0.35), sunLit);
          sky = mix(sky, litCloud, cloudMask * horizonFade * uCloudDensity);
        }

        // Dense horizon atmospheric mist band matching scene fog seamlessly
        float horizonMist = pow(1.0 - clamp(abs(dir.y), 0.0, 1.0), 3.6);
        sky = mix(sky, uHorizonColor, horizonMist * 0.82);

        // Ground hemisphere matches horizon fog cleanly
        if (dir.y < 0.0) {
          sky = mix(sky, uHorizonColor * 0.9, smoothstep(0.0, -0.18, dir.y));
        }

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });

  const geo = new THREE.SphereGeometry(118, 36, 20);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;

  return { mesh, uniforms };
}

/**
 * Adds soft multi-layered mist blankets across the distant horizon so the world
 * dissolves organically into an endless misty background without hard plane edges.
 */
export function buildEndlessHorizonMist(
  mistTexture: THREE.Texture,
  tintHex: number,
  yBase = 0.75,
  radius = 38,
  opacity = 0.38
): {
  group: THREE.Group;
  update: (elapsed: number) => void;
} {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    map: mistTexture,
    color: tintHex,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const bands: {
    mesh: THREE.Mesh;
    baseX: number;
    baseZ: number;
    speed: number;
    phase: number;
  }[] = [];

  const planeGeo = new THREE.PlaneGeometry(34, 16);
  const total = 12;
  for (let i = 0; i < total; i++) {
    // Concentrate bands smoothly around the horizon arc (-PI .. PI)
    const ang = -Math.PI + (i / total) * Math.PI * 2;
    const dist = radius + (i % 3) * 7.5;
    const bx = Math.cos(ang) * dist;
    const bz = Math.sin(ang) * dist;

    // Horizontal cloud layer + gently tilted vertical veil facing origin
    const flatMist = new THREE.Mesh(planeGeo, mat);
    flatMist.rotation.x = -Math.PI / 2;
    flatMist.position.set(bx, yBase + (i % 3) * 0.45, bz);
    group.add(flatMist);
    bands.push({
      mesh: flatMist,
      baseX: bx,
      baseZ: bz,
      speed: 0.14 + (i % 4) * 0.04,
      phase: i * 0.85,
    });

    const veil = new THREE.Mesh(new THREE.PlaneGeometry(32, 9.5), mat);
    veil.position.set(bx * 0.96, yBase + 2.1 + (i % 2) * 0.6, bz * 0.96);
    veil.lookAt(0, veil.position.y, 0);
    group.add(veil);
  }

  return {
    group,
    update: (elapsed: number) => {
      for (let i = 0; i < bands.length; i++) {
        const b = bands[i];
        b.mesh.position.x =
          b.baseX + Math.sin(elapsed * b.speed + b.phase) * 2.2;
      }
    },
  };
}
