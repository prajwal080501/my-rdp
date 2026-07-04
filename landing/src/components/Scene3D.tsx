"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Mesh } from "three";

function BeamCore() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += delta * 0.12;
    meshRef.current.rotation.y += delta * 0.18;
  });

  return (
    <Float speed={1.6} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.6, 6]} />
        <MeshDistortMaterial
          color="#818cf8"
          emissive="#4338ca"
          emissiveIntensity={0.55}
          roughness={0.08}
          metalness={0.9}
          clearcoat={1}
          clearcoatRoughness={0.1}
          distort={0.32}
          speed={1.6}
        />
      </mesh>
    </Float>
  );
}

function OrbitRing({ radius, tilt, color }: { radius: number; tilt: number; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.z += delta * 0.15;
  });
  return (
    <mesh ref={ref} rotation={[tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.006, 8, 128]} />
      <meshBasicMaterial color={color} transparent opacity={0.5} />
    </mesh>
  );
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={1.1} />
        <pointLight position={[5, 5, 5]} intensity={60} color="#22d3ee" />
        <pointLight position={[-5, -3, -2]} intensity={45} color="#a855f7" />
        <pointLight position={[0, 4, 3]} intensity={30} color="#ffffff" />
        <Environment preset="city" environmentIntensity={0.6} />

        <BeamCore />
        <OrbitRing radius={2.4} tilt={0.6} color="#22d3ee" />
        <OrbitRing radius={2.9} tilt={-0.4} color="#a855f7" />

        <Sparkles count={80} scale={7} size={2} speed={0.3} color="#ffffff" opacity={0.6} />
      </Suspense>
    </Canvas>
  );
}
