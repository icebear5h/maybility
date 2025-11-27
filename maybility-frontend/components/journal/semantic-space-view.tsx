"use client"

import { useRef, useState, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Text, Line } from "@react-three/drei"
import type { JournalEntry } from "@/lib/types"
import * as THREE from "three"

interface SemanticSpaceViewProps {
  entries: JournalEntry[]
  onSelectEntry: (entry: JournalEntry | null) => void
  selectedEntry: JournalEntry | null
}

// Entry sphere component
function EntrySphere({
  entry,
  position,
  isSelected,
  onClick,
}: {
  entry: JournalEntry
  position: [number, number, number]
  isSelected: boolean
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Animate on hover/select
  useFrame((state) => {
    if (meshRef.current) {
      const scale = isSelected ? 1.3 : hovered ? 1.15 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })

  // Color based on mood (green positive, red negative)
  const color = useMemo(() => {
    const mood = entry.mood ?? 0
    if (mood > 0) {
      return new THREE.Color().lerpColors(new THREE.Color("#6b7280"), new THREE.Color("#22c55e"), mood)
    } else {
      return new THREE.Color().lerpColors(new THREE.Color("#6b7280"), new THREE.Color("#ef4444"), Math.abs(mood))
    }
  }, [entry.mood])

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = "auto"
      }}
    >
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0.15}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  )
}

// Axis lines and labels
function AxisSystem() {
  const axisLength = 2.5

  return (
    <group>
      {/* X axis - Mood */}
      <Line
        points={[
          [-axisLength, 0, 0],
          [axisLength, 0, 0],
        ]}
        color="#ef4444"
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      <Text position={[-axisLength - 0.3, 0, 0]} fontSize={0.15} color="#ef4444" anchorX="right">
        Negative
      </Text>
      <Text position={[axisLength + 0.3, 0, 0]} fontSize={0.15} color="#22c55e" anchorX="left">
        Positive
      </Text>
      <Text position={[0, -0.3, 0]} fontSize={0.12} color="#888" anchorY="top">
        Mood
      </Text>

      {/* Y axis - Energy */}
      <Line
        points={[
          [0, -axisLength, 0],
          [0, axisLength, 0],
        ]}
        color="#eab308"
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      <Text position={[0, -axisLength - 0.2, 0]} fontSize={0.15} color="#6b7280" anchorY="top">
        Low
      </Text>
      <Text position={[0, axisLength + 0.2, 0]} fontSize={0.15} color="#eab308" anchorY="bottom">
        High
      </Text>
      <Text position={[0.3, 0, 0]} fontSize={0.12} color="#888" anchorX="left">
        Energy
      </Text>

      {/* Z axis - Clarity */}
      <Line
        points={[
          [0, 0, -axisLength],
          [0, 0, axisLength],
        ]}
        color="#3b82f6"
        lineWidth={1}
        opacity={0.4}
        transparent
      />
      <Text position={[0, 0, -axisLength - 0.2]} fontSize={0.15} color="#a855f7">
        Confused
      </Text>
      <Text position={[0, 0, axisLength + 0.2]} fontSize={0.15} color="#3b82f6">
        Focused
      </Text>

      {/* Grid on XZ plane */}
      <gridHelper args={[5, 10, "#333", "#222"]} rotation={[0, 0, 0]} />
    </group>
  )
}

// Camera controller with smooth animations
function CameraController({ target }: { target: [number, number, number] | null }) {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    if (target) {
      targetRef.current.set(...target)
    } else {
      targetRef.current.set(0, 0, 0)
    }
  }, [target])

  useFrame(() => {
    // Smooth camera look-at
    const current = new THREE.Vector3()
    camera.getWorldDirection(current)
  })

  return null
}

// Floating particles for atmosphere
function Particles() {
  const count = 200
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return pos
  }, [])

  const ref = useRef<THREE.Points>(null)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#4a4a6a" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

export function SemanticSpaceView({ entries, onSelectEntry, selectedEntry }: SemanticSpaceViewProps) {
  // Convert entries to 3D positions
  const entryPositions = useMemo(() => {
    return entries.map((entry) => ({
      entry,
      position: [
        (entry.mood ?? 0) * 2, // X: mood
        (entry.energy ?? 0) * 2, // Y: energy
        (entry.clarity ?? 0) * 2, // Z: clarity
      ] as [number, number, number],
    }))
  }, [entries])

  const selectedPosition = selectedEntry
    ? ([(selectedEntry.mood ?? 0) * 2, (selectedEntry.energy ?? 0) * 2, (selectedEntry.clarity ?? 0) * 2] as [
        number,
        number,
        number,
      ])
    : null

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [4, 3, 4], fov: 50 }}
        gl={{ antialias: true }}
        onPointerMissed={() => onSelectEntry(null)}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4a6cf7" />

        {/* Axis system */}
        <AxisSystem />

        {/* Entry spheres */}
        {entryPositions.map(({ entry, position }) => (
          <EntrySphere
            key={entry.id}
            entry={entry}
            position={position}
            isSelected={selectedEntry?.id === entry.id}
            onClick={() => onSelectEntry(entry)}
          />
        ))}

        {/* Atmospheric particles */}
        <Particles />

        {/* Camera controls */}
        <OrbitControls enableDamping dampingFactor={0.05} minDistance={2} maxDistance={12} />
        <CameraController target={selectedPosition} />

        {/* Background */}
        <color attach="background" args={["#0d0b14"]} />
        <fog attach="fog" args={["#0d0b14", 8, 20]} />
      </Canvas>

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 rounded-lg bg-card/80 p-3 text-xs backdrop-blur-sm">
        <div className="mb-2 font-medium text-foreground">Semantic Axes</div>
        <div className="space-y-1 text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span>X: Mood (Negative → Positive)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
            <span>Y: Energy (Low → High)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500/70" />
            <span>Z: Clarity (Confused → Focused)</span>
          </div>
        </div>
      </div>

      {/* Entry count */}
      <div className="absolute right-4 top-4 rounded-lg bg-card/80 px-3 py-2 text-sm backdrop-blur-sm">
        <span className="text-muted-foreground">{entries.length} entries</span>
      </div>
    </div>
  )
}
