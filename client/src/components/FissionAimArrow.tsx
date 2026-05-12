import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

type Props = { cursor: { x: number; y: number } | null };

// A small cream arrowhead that follows the cursor and always rotates
// to point toward the form's centre (0, 0). It's the user's hint that
// a click will fire a neutron from this direction. Tiny on purpose -
// ~5 px at zoom 220 - so it reads as a glyph the user discovers,
// not as a UI element. Hidden on touch devices and when the cursor
// is very near the form centre (direction undefined).
export default function FissionAimArrow({ cursor }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, material } = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0.012, 0);
    shape.lineTo(-0.008, 0.006);
    shape.lineTo(-0.008, -0.006);
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: '#ECE7DF',
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return { geometry, material };
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useEffect(() => {
    if (!cursor || !meshRef.current) return;
    const cursorDist = Math.hypot(cursor.x, cursor.y);
    if (cursorDist < 0.02) return;
    meshRef.current.position.set(cursor.x, cursor.y, 0);
    meshRef.current.rotation.z = Math.atan2(-cursor.y, -cursor.x);
  }, [cursor]);

  if (!cursor) return null;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches
  ) {
    return null;
  }
  const cursorDist = Math.hypot(cursor.x, cursor.y);
  if (cursorDist < 0.02) return null;

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
