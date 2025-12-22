import { useRef, useState, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import type { JournalEntry } from "@/lib/types"
import * as THREE from "three"

interface EntrySphereProps {
  entry: JournalEntry
  position: [number, number, number]
  isSelected: boolean
  onClick: () => void
}

export function EntrySphere({ entry, position, isSelected, onClick }: EntrySphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      const scale = isSelected ? 1.3 : hovered ? 1.15 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })

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
