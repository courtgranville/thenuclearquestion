import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Particle-based spark system replacing FissionFlash. Every visible
// effect in the room is made of particles now - same vocabulary as
// the cloud, no geometric primitives (no circles, no rings). One
// <points> mesh with a pool of MAX_SPARKS, three spawn helpers for
// three flavours (click, fission, neutron trail). Module-level state
// continues the imperative fire-and-forget pattern.

type SparkKind = 'click' | 'fission' | 'neutronTrail';

type Spark = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  bornAt: number;
  lifeMs: number;
  kind: SparkKind;
  colorR: number;
  colorG: number;
  colorB: number;
  size: number;
};

let sparkId = 0;
const sparks: Spark[] = [];
const MAX_SPARKS = 800;

function pushSpark(s: Spark): void {
  if (sparks.length >= MAX_SPARKS) return;
  sparks.push(s);
}

export function spawnClickSparks(x: number, y: number): void {
  // Subtle cream burst at the cursor. 6 sparks ejected radially with
  // a quick fade so the user reads "I did this" without the spark
  // ring competing with the arriving neutron.
  const count = 6;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 0.3 + Math.random() * 0.2;
    pushSpark({
      id: ++sparkId,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      bornAt: performance.now(),
      lifeMs: 300,
      kind: 'click',
      colorR: 1.0,
      colorG: 0.93,
      colorB: 0.83,
      size: 4,
    });
  }
}

export function spawnFissionSparks(x: number, y: number): void {
  // 14-18 warm-coloured sparks erupting outward from a fission point.
  // Colour spans white-yellow (hot embers) through deep orange/red
  // (cooler), so a single fission reads as a recognisable spectrum
  // rather than a uniform flash.
  const count = 14 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const speed = 0.8 + Math.random() * 1.4;
    const t = Math.random();
    pushSpark({
      id: ++sparkId,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      bornAt: performance.now(),
      lifeMs: 700 + Math.random() * 500,
      kind: 'fission',
      colorR: 1.0,
      colorG: 0.55 + t * 0.4,
      colorB: 0.15 + t * 0.35,
      size: 5 + Math.random() * 4,
    });
  }
}

export function spawnNeutronTrailSpark(x: number, y: number): void {
  // Tiny stationary spark in the neutron's wake. Falls behind the
  // neutron by fading, not by moving.
  pushSpark({
    id: ++sparkId,
    x,
    y,
    vx: 0,
    vy: 0,
    bornAt: performance.now(),
    lifeMs: 280,
    kind: 'neutronTrail',
    colorR: 1.0,
    colorG: 0.85,
    colorB: 0.55,
    size: 3,
  });
}

const SPARK_VS = /* glsl */ `
attribute float aAge;
attribute float aSize;
attribute vec3 aColor;
varying float vAge;
varying vec3 vColor;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = aSize * (1.0 - aAge * 0.4);
  vAge = aAge;
  vColor = aColor;
}
`;

const SPARK_FS = /* glsl */ `
precision mediump float;
varying float vAge;
varying vec3 vColor;

void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, r);
  alpha *= (1.0 - vAge);
  alpha = pow(alpha, 1.5);
  gl_FragColor = vec4(vColor, alpha);
}
`;

// Velocity damping per frame so sparks decelerate as they travel.
// 0.96 per frame at 120 fps is ~38% velocity loss per second.
const VELOCITY_DAMPING = 0.96;

export default function FissionSparks() {
  const { geometry, material, positions, ages, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(MAX_SPARKS * 3);
    const ages = new Float32Array(MAX_SPARKS);
    const sizes = new Float32Array(MAX_SPARKS);
    const colors = new Float32Array(MAX_SPARKS * 3);

    // Park all sparks offscreen by default.
    for (let i = 0; i < MAX_SPARKS; i++) {
      positions[i * 3] = 99;
      positions[i * 3 + 1] = 99;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      vertexShader: SPARK_VS,
      fragmentShader: SPARK_FS,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return { geometry, material, positions, ages, sizes, colors };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_state, dt) => {
    const now = performance.now();

    // Cull expired sparks; the array is treated as a free-list.
    for (let i = sparks.length - 1; i >= 0; i--) {
      if (now - sparks[i].bornAt > sparks[i].lifeMs) {
        sparks.splice(i, 1);
      }
    }

    // Integrate live sparks and write into the buffer attributes.
    for (let i = 0; i < MAX_SPARKS; i++) {
      const s = sparks[i];
      if (s) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= VELOCITY_DAMPING;
        s.vy *= VELOCITY_DAMPING;
        const age = (now - s.bornAt) / s.lifeMs;
        positions[i * 3] = s.x;
        positions[i * 3 + 1] = s.y;
        positions[i * 3 + 2] = 0.02;
        ages[i] = Math.min(1, age);
        sizes[i] = s.size;
        colors[i * 3] = s.colorR;
        colors[i * 3 + 1] = s.colorG;
        colors[i * 3 + 2] = s.colorB;
      } else {
        // Park unused slots offscreen.
        positions[i * 3] = 99;
        positions[i * 3 + 1] = 99;
        ages[i] = 0;
        sizes[i] = 0;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAge.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} />;
}
