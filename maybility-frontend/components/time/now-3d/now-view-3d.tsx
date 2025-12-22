"use client"

import React, { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Event, Goal } from "@/lib/types"

interface NowView3DProps {
  events: Event[]
  goals?: Goal[]
  onSelectEvent?: (event: Event) => void
  onUpdateEvent?: (event: Event) => void
}

export function NowView3D({ events, goals = [], onSelectEvent, onUpdateEvent }: NowView3DProps) {
  return (
    <div className="relative h-full w-full bg-black">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'default'
        }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}

function Scene() {
  return (
    <>
      {/* Basic lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {/* Background color */}
      <color attach="background" args={['#0a0a0a']} />

      {/* Axis lines */}
      <AxisLines />

      {/* Simple floating cube to confirm 3D works */}
      <FloatingCube />
    </>
  )
}

function DashedLine({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const ref = useRef<THREE.Line>(null)

  React.useEffect(() => {
    if (ref.current) {
      ref.current.computeLineDistances()
    }
  }, [])

  const points = React.useMemo(() => {
    return new Float32Array([...start, ...end])
  }, [start, end])

  return (
    <line ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={points}
          count={2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineDashedMaterial color="#444" dashSize={0.3} gapSize={0.15} />
    </line>
  )
}

function AxisLines() {
  const len = 10
  const spacing = 2 // lines every 2 units
  const count = Math.floor(len / spacing)

  const lines: React.ReactNode[] = []

  // Generate grid lines
  for (let i = -count; i <= count; i++) {
    const pos = i * spacing

    // Lines parallel to X axis (running along X, at different Z positions)
    lines.push(
      <DashedLine key={`x-z${i}`} start={[-len, 0, pos]} end={[len, 0, pos]} />
    )

    // Lines parallel to Z axis (running along Z, at different X positions)
    lines.push(
      <DashedLine key={`z-x${i}`} start={[pos, 0, -len]} end={[pos, 0, len]} />
    )
  }

  // Y axis (vertical center line)
  lines.push(
    <DashedLine key="y-axis" start={[0, -len, 0]} end={[0, len, 0]} />
  )

  return <group>{lines}</group>
}

function FloatingCube() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x = state.clock.elapsedTime * 0.5
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.3
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#6366f1" />
    </mesh>
  )
}
